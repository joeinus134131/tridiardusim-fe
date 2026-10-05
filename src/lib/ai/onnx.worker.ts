/// <reference lib="webworker" />
import { imageToFloatTensor, type ImageNormalization, type ImageTensorLayout } from "./onnxImage";

type Backend = "wasm" | "webgpu";
type Runtime = typeof import("onnxruntime-web/wasm");
type ModelSession = Awaited<ReturnType<Runtime["InferenceSession"]["create"]>>;
type Frame = { width: number; height: number; rgba: Uint8Array; sampleCount: number };
type WorkerMessage =
  | { type: "load_model"; model: ArrayBuffer; backend: Backend; width: number; height: number; normalization: ImageNormalization }
  | { type: "run_frame"; frame: Frame }
  | { type: "dispose" };

const workerScope = self as unknown as DedicatedWorkerGlobalScope;
let runtime: Runtime | null = null;
let session: ModelSession | null = null;
let busy = false;
let inputName = "";
let outputName = "";
let inputWidth = 224;
let inputHeight = 224;
let layout: ImageTensorLayout = "nchw";
let normalization: ImageNormalization = "unit";

function send(message: Record<string, unknown>) { workerScope.postMessage(message); }

async function loadRuntime(backend: Backend, model: ArrayBuffer) {
  const wasmBase = new URL("/onnxruntime/", workerScope.location.origin).href;
  if (backend === "webgpu" && "gpu" in navigator) {
    try {
      const ortModule = await import("onnxruntime-web/webgpu");
      ortModule.env.wasm.wasmPaths = wasmBase;
      ortModule.env.wasm.numThreads = 1;
      const loaded = await ortModule.InferenceSession.create(model, { executionProviders: ["webgpu"] });
      return { module: ortModule, session: loaded, provider: "webgpu" as const };
    } catch (error) {
      send({ type: "provider_fallback", message: error instanceof Error ? error.message : "WebGPU unavailable" });
    }
  }
  const ortModule = await import("onnxruntime-web/wasm");
  ortModule.env.wasm.wasmPaths = wasmBase;
  ortModule.env.wasm.numThreads = 1;
  const loaded = await ortModule.InferenceSession.create(model, { executionProviders: ["wasm"] });
  return { module: ortModule, session: loaded, provider: "wasm" as const };
}

async function startModel(message: Extract<WorkerMessage, { type: "load_model" }>) {
  try {
    if (message.model.byteLength === 0 || message.model.byteLength > 100 * 1024 * 1024) throw new Error("Ukuran model harus di antara 1 byte dan 100 MB.");
    const loaded = await loadRuntime(message.backend, message.model);
    runtime = loaded.module;
    session = loaded.session;

    const meta = session.inputMetadata[0];
    if (!meta || !meta.isTensor || meta.type !== "float32" || meta.shape.length !== 4) {
      throw new Error("Model harus memiliki satu input gambar tensor Float32 rank-4.");
    }
    const shape = meta.shape;
    if (shape[0] !== 1 && typeof shape[0] === "number") throw new Error("Model harus menerima batch size 1.");
    if (shape[1] === 3) {
      layout = "nchw";
      inputHeight = typeof shape[2] === "number" ? shape[2] : message.height;
      inputWidth = typeof shape[3] === "number" ? shape[3] : message.width;
    } else if (shape[3] === 3) {
      layout = "nhwc";
      inputHeight = typeof shape[1] === "number" ? shape[1] : message.height;
      inputWidth = typeof shape[2] === "number" ? shape[2] : message.width;
    } else {
      throw new Error("Model harus menggunakan 3 kanal RGB NCHW atau NHWC.");
    }
    if (inputWidth > 1024 || inputHeight > 1024 || inputWidth < 16 || inputHeight < 16) throw new Error("Resolusi model harus 16–1024 piksel.");
    inputName = session.inputNames[0];
    outputName = session.outputNames[0];
    if (!inputName || !outputName) throw new Error("Model harus memiliki input dan output tensor.");
    normalization = message.normalization;
    send({ type: "model_ready", provider: loaded.provider, inputName, outputName, layout, width: inputWidth, height: inputHeight, normalization });
  } catch (error) {
    await session?.release();
    session = null;
    send({ type: "error", phase: "load", message: error instanceof Error ? error.message : "Gagal memuat model ONNX." });
  }
}

async function runFrame(frame: Frame) {
  if (!session || !runtime || busy) return;
  busy = true;
  const startedAt = performance.now();
  try {
    const data = imageToFloatTensor(frame.rgba, frame.width, frame.height, inputWidth, inputHeight, layout, normalization);
    const shape = layout === "nchw" ? [1, 3, inputHeight, inputWidth] : [1, inputHeight, inputWidth, 3];
    const tensor = new runtime.Tensor("float32", data, shape);
    const outputs = await session.run({ [inputName]: tensor });
    const output = outputs[outputName];
    if (!output || !(output.data instanceof Float32Array)) throw new Error("Output model harus berupa skor kelas Float32.");
    const scores = Array.from(output.data);
    send({ type: "inference_result", sampleCount: frame.sampleCount, inferenceMs: performance.now() - startedAt, scores });
  } catch (error) {
    send({ type: "error", phase: "run", message: error instanceof Error ? error.message : "Inferensi ONNX gagal." });
  } finally {
    busy = false;
  }
}

workerScope.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (message.type === "load_model") void startModel(message);
  else if (message.type === "run_frame") void runFrame(message.frame);
  else if (message.type === "dispose") {
    void session?.release();
    session = null;
    runtime = null;
    workerScope.close();
  }
};
