"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Cpu, Play, Square, X, Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { topClassScores, type ImageNormalization } from "@/lib/ai/onnxImage";

type Backend = "wasm" | "webgpu";
type Prediction = { index: number; label: string; score: number };

export function OnnxInferencePanel() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [cameraId, setCameraId] = useState("");
  const [backend, setBackend] = useState<Backend>("wasm");
  const [normalization, setNormalization] = useState<ImageNormalization>("unit");
  const [width, setWidth] = useState(224);
  const [height, setHeight] = useState(224);
  const [labels, setLabels] = useState("");
  const [modelName, setModelName] = useState("");
  const [modelState, setModelState] = useState<"empty" | "loading" | "ready">("empty");
  const [running, setRunning] = useState(false);
  const [actualBackend, setActualBackend] = useState<Backend | null>(null);
  const [modelInput, setModelInput] = useState("");
  const [modelShape, setModelShape] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);
  const components = useSimulatorStore((state) => state.components);
  const cameras = useMemo(() => components.filter((component) => component.typeId === "rgbd_camera"), [components]);
  const activeCameraId = cameras.some((camera) => camera.id === cameraId) ? cameraId : cameras[0]?.id || "";
  const frame = useSimulatorStore((state) => activeCameraId ? state.rgbdFrames[activeCameraId] : undefined);
  const workerRef = useRef<Worker | null>(null);
  const lastFrameRef = useRef("");
  const lastSentAtRef = useRef(0);
  const labelsRef = useRef(labels);
  useEffect(() => { labelsRef.current = labels; }, [labels]);

  const stopAndDispose = () => {
    workerRef.current?.postMessage({ type: "dispose" });
    workerRef.current?.terminate();
    workerRef.current = null;
    lastFrameRef.current = "";
    setRunning(false);
    setModelState("empty");
    setModelName("");
    setActualBackend(null);
    setModelInput("");
    setModelShape("");
    setPredictions([]);
  };

  useEffect(() => () => workerRef.current?.terminate(), []);

  useEffect(() => {
    if (!open || !running || modelState !== "ready" || !frame || !workerRef.current) return;
    const key = `${activeCameraId}:${frame.sampleCount}`;
    if (key === lastFrameRef.current || performance.now() - lastSentAtRef.current < 500) return;
    const rgba = frame.rgba.slice();
    workerRef.current.postMessage({
      type: "run_frame",
      frame: { width: frame.width, height: frame.height, rgba, sampleCount: frame.sampleCount },
    }, [rgba.buffer]);
    lastFrameRef.current = key;
    lastSentAtRef.current = performance.now();
  }, [activeCameraId, frame, modelState, open, running]);

  const loadModel = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setNotice("");
    if (!file.name.toLowerCase().endsWith(".onnx")) { setError("Pilih file .onnx."); return; }
    if (file.size === 0 || file.size > 100 * 1024 * 1024) { setError("Ukuran model harus di antara 1 byte dan 100 MB."); return; }
    stopAndDispose();
    setModelName(file.name);
    setModelState("loading");
    try {
      const worker = new Worker(new URL("../../lib/ai/onnx.worker.ts", import.meta.url), { type: "module" });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<Record<string, unknown>>) => {
        const message = event.data;
        if (message.type === "provider_fallback") setNotice("WebGPU tidak cocok untuk model/browser ini; mencoba WebAssembly.");
        else if (message.type === "model_ready") {
          setModelState("ready");
          setActualBackend(message.provider === "webgpu" ? "webgpu" : "wasm");
          setModelInput(String(message.inputName || ""));
          setModelShape(`${String(message.layout).toUpperCase()} ${String(message.width)}×${String(message.height)}`);
          setWidth(Number(message.width) || 224);
          setHeight(Number(message.height) || 224);
          setNotice(t.aiGateway.localReady);
        } else if (message.type === "inference_result") {
          try {
            const labelList = labelsRef.current.split(/\r?\n/).map((item) => item.trim());
            setPredictions(topClassScores(message.scores as number[], labelList));
            setInferenceMs(Number(message.inferenceMs) || null);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Output model tidak dapat ditampilkan.");
          }
        } else if (message.type === "error") {
          setError(String(message.message || "Kesalahan model ONNX."));
          if (message.phase === "load") setModelState("empty");
        }
      };
      worker.onerror = (event) => {
        setError(event.message || "ONNX worker gagal dijalankan.");
        setModelState("empty");
      };
      const model = await file.arrayBuffer();
      worker.postMessage({ type: "load_model", model, backend, width, height, normalization }, [model]);
    } catch (cause) {
      workerRef.current?.terminate();
      workerRef.current = null;
      setModelState("empty");
      setError(cause instanceof Error ? cause.message : "Gagal membaca file model.");
    }
  };

  if (!open) return (
    <button className="fixed bottom-16 left-4 z-[var(--z-panel)] flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs shadow-lg hover:border-[var(--accent)]" onClick={() => setOpen(true)} title={t.aiGateway.openLocal}>
      <Cpu size={15} className="text-[var(--accent)]" /> {t.aiGateway.openLocal}
    </button>
  );

  return (
    <section className="fixed bottom-16 left-4 z-[var(--z-panel)] flex max-h-[65vh] w-[min(22rem,calc(100vw-2rem))] flex-col gap-3 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-2xl">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Cpu size={17} className="text-[var(--accent)]" /><strong className="text-sm">{t.aiGateway.localTitle}</strong></div>
        <button className="btn-icon p-1.5" onClick={() => { stopAndDispose(); setOpen(false); }} aria-label={t.common.close}><X size={15} /></button>
      </header>
      <p className="text-xs leading-relaxed opacity-75">{t.aiGateway.localDescription}</p>
      <label className="flex flex-col gap-1 text-xs">
        {t.aiGateway.modelFile}
        <input type="file" accept=".onnx,application/onnx" className="text-[11px] file:mr-2 file:rounded file:border-0 file:bg-[var(--bg-hover)] file:px-2 file:py-1" disabled={modelState === "loading" || running} onChange={(event) => void loadModel(event.target.files?.[0])} />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        {t.aiGateway.camera}
        <select className="inspector-input" value={activeCameraId} onChange={(event) => setCameraId(event.target.value)}>
          {cameras.map((camera) => <option key={camera.id} value={camera.id}>{camera.name}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs">{t.aiGateway.backend}
          <select className="inspector-input" value={backend} onChange={(event) => setBackend(event.target.value as Backend)} disabled={modelState === "loading" || modelState === "ready"}>
            <option value="wasm">WebAssembly</option><option value="webgpu">WebGPU (fallback WASM)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">{t.aiGateway.normalization}
          <select className="inspector-input" value={normalization} onChange={(event) => setNormalization(event.target.value as ImageNormalization)} disabled={modelState === "loading" || modelState === "ready"}>
            <option value="unit">RGB 0–1</option><option value="imagenet">ImageNet mean/std</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs">{t.aiGateway.inputResolution} W
          <input className="inspector-input" type="number" min={16} max={1024} step={16} value={width} onChange={(event) => setWidth(Math.max(16, Math.min(1024, Number(event.target.value) || 224)))} disabled={modelState === "loading" || modelState === "ready"} />
        </label>
        <label className="flex flex-col gap-1 text-xs">H
          <input className="inspector-input" type="number" min={16} max={1024} step={16} value={height} onChange={(event) => setHeight(Math.max(16, Math.min(1024, Number(event.target.value) || 224)))} disabled={modelState === "loading" || modelState === "ready"} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs">{t.aiGateway.labels}
        <textarea className="inspector-input min-h-16 resize-y text-[11px]" value={labels} onChange={(event) => setLabels(event.target.value)} placeholder="person&#10;robot&#10;..." />
      </label>
      {modelName && <div className="rounded-md bg-[var(--bg-hover)] p-2 text-[11px]"><div className="truncate font-medium">{modelName}</div>{modelInput && <div className="mt-1 opacity-65">{modelInput} · {modelShape} · {actualBackend?.toUpperCase()}</div>}</div>}
      <div className="flex gap-2">
        {modelState === "ready" && <button className={running ? "small-button flex items-center gap-1.5" : "btn-primary flex items-center gap-1.5"} onClick={() => { setError(""); setRunning((value) => !value); }} disabled={!frame}>
          {running ? <><Square size={13} />{t.aiGateway.stopInference}</> : <><Play size={13} />{t.aiGateway.startInference}</>}
        </button>}
        {modelState === "ready" && <button className="small-button" onClick={stopAndDispose}>Unload</button>}
        {modelState === "loading" && <span className="flex items-center gap-1.5 text-xs opacity-70"><Loader2 size={13} className="animate-spin" />{t.aiGateway.loadingModel}</span>}
      </div>
      {modelState === "loading" && <p className="text-xs opacity-70"><Loader2 size={13} className="mr-1 inline animate-spin" />{t.aiGateway.loadingModel}</p>}
      {!!notice && <p className="text-[11px] text-emerald-500" role="status">{notice}</p>}
      {!!error && <p className="rounded-lg bg-red-500/10 p-2 text-xs text-red-500" role="alert">{error}</p>}
      <div className="border-t border-[var(--border)] pt-2">
        <div className="mb-1 text-[11px] font-semibold">{t.aiGateway.predictions}</div>
        {predictions.length ? predictions.map((item) => <div key={item.index} className="flex justify-between gap-3 py-0.5 text-xs"><span className="truncate">{item.label}</span><span className="shrink-0 tabular-nums">{(item.score * 100).toFixed(1)}%</span></div>) : <p className="text-[11px] opacity-60">{t.aiGateway.noPredictions}</p>}
      </div>
      <p className="text-[10px] leading-relaxed opacity-55">{actualBackend === "webgpu" ? "WebGPU" : actualBackend === "wasm" ? "WebAssembly" : ""}{inferenceMs !== null ? ` · ${inferenceMs.toFixed(1)} ms` : ""} · Float32 RGB classifier · model runs locally; output labels are supplied by you.</p>
    </section>
  );
}
