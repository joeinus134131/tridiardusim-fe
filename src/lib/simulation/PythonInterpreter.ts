import { useSimulatorStore } from "@/store/useSimulatorStore";
import { arduinoEngine } from "./ArduinoInterpreter";
import type { RGBDFrame } from "./sensors/types";

function currentCameraFrame(frames: Record<string, RGBDFrame>) {
  return Object.values(frames).sort((a, b) => b.sampleCount - a.sampleCount)[0];
}

export class PythonInterpreter {
  private worker: Worker | null = null;
  private inputTimer: ReturnType<typeof setInterval> | null = null;
  private lastCameraSample = -1;
  private lastVoltages = "";

  start() {
    if (useSimulatorStore.getState().simulationState === "paused" && this.worker) {
      arduinoEngine.start({ external: true });
      this.worker.postMessage({ type: "resume" });
      useSimulatorStore.setState({ simulationState: "running" });
      return;
    }
    this.stop(false);
    const store = useSimulatorStore.getState();
    const sourceFile = store.files.find((file) => file.name === store.activeFileName);
    const code = sourceFile?.content ?? store.code;
    const board = store.components.find((component) =>
      component.typeId === "arduino_uno" || component.typeId === "esp32_wroom",
    );
    if (!board) {
      const message = "Tambahkan Arduino Uno atau ESP32 untuk menghubungkan GPIO V-SBC ke rangkaian.";
      useSimulatorStore.setState({ simulationState: "stopped", diagnostics: [message] });
      store.addSerialMessage({ type: "error", message: `${message}\n` });
      return;
    }
    try {
      arduinoEngine.start({ external: true });
      this.worker = new Worker(new URL("./python.worker.ts", import.meta.url), { type: "module" });
      const worker = this.worker;
      worker.onmessage = ({ data }) => {
        if (this.worker !== worker) return;
        if (data.type === "gpio") {
          arduinoEngine.setExternalGPIO(Number(data.pin), String(data.mode), Number(data.value));
        } else if (data.type === "stdout" || data.type === "stderr") {
          if (data.text) store.addSerialMessage({
            type: data.type === "stderr" ? "error" : "data",
            message: String(data.text),
          });
        } else if (data.type === "status" && data.status === "loading") {
          store.addSerialMessage({ type: "info", message: "Memuat runtime Python V-SBC…\n" });
        } else if (data.type === "error") {
          const message = String(data.message || "Python V-SBC mengalami kesalahan.");
          this.stop();
          useSimulatorStore.setState({ simulationState: "stopped", diagnostics: [message] });
          store.addSerialMessage({ type: "error", message: `${message}\n` });
        } else if (data.type === "status" && data.status === "finished") {
          store.addSerialMessage({ type: "info", message: "Script Python selesai. Runtime V-SBC tetap siap sampai simulasi dihentikan.\n" });
        }
      };
      worker.onerror = (event) => {
        const message = event.message || "Worker Python V-SBC gagal dijalankan.";
        this.stop();
        useSimulatorStore.setState({ simulationState: "stopped", diagnostics: [message] });
        store.addSerialMessage({ type: "error", message: `${message}\n` });
      };
      worker.postMessage({
        type: "start",
        code,
        boardType: board.typeId,
        boardId: board.id,
        voltages: store.voltages,
        camera: currentCameraFrame(store.rgbdFrames),
      });
      this.lastCameraSample = currentCameraFrame(store.rgbdFrames)?.sampleCount ?? -1;
      this.lastVoltages = JSON.stringify(store.voltages);
      this.inputTimer = setInterval(() => this.sendLatestInputs(worker), 50);
      useSimulatorStore.setState({ simulationState: "running", diagnostics: [], elapsedMs: 0 });
    } catch (error) {
      this.stop();
      const message = error instanceof Error ? error.message : String(error);
      useSimulatorStore.setState({ simulationState: "stopped", diagnostics: [message] });
      store.addSerialMessage({ type: "error", message: `${message}\n` });
    }
  }

  private sendLatestInputs(worker: Worker) {
    if (worker !== this.worker) return;
    const state = useSimulatorStore.getState();
    const voltageSignature = JSON.stringify(state.voltages);
    if (voltageSignature !== this.lastVoltages) {
      this.lastVoltages = voltageSignature;
      worker.postMessage({ type: "gpio_voltages", voltages: state.voltages });
    }
    const frame = currentCameraFrame(state.rgbdFrames);
    if (frame && frame.sampleCount !== this.lastCameraSample) {
      this.lastCameraSample = frame.sampleCount;
      worker.postMessage({ type: "camera_frame", frame });
    }
  }

  pause() {
    this.worker?.postMessage({ type: "pause" });
    arduinoEngine.pause();
  }

  stop(stopCircuit = true) {
    if (this.inputTimer) clearInterval(this.inputTimer);
    this.inputTimer = null;
    this.worker?.terminate();
    this.worker = null;
    this.lastCameraSample = -1;
    this.lastVoltages = "";
    if (stopCircuit) arduinoEngine.stop();
  }
}

export const pythonEngine = new PythonInterpreter();
