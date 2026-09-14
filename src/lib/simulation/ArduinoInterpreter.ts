import { useSimulatorStore } from "@/store/useSimulatorStore";
export class ArduinoInterpreter {
  private worker: Worker | null = null;
  private unsubscribe: (() => void) | null = null;
  private warningKey = "";
  start() {
    if (
      useSimulatorStore.getState().simulationState === "paused" &&
      this.worker
    ) {
      this.worker.postMessage({ type: "resume" });
      useSimulatorStore.setState({ simulationState: "running" });
      return;
    }
    this.stop();
    const store = useSimulatorStore.getState();
    try {
      this.worker = new Worker(
        new URL("./simulation.worker.ts", import.meta.url),
      );
      const worker = this.worker;
      worker.onmessage = ({ data: m }) => {
        if (this.worker !== worker) return;
        if (m.type === "frame") {
          useSimulatorStore.setState((s) => ({
            components: s.components.map((c) => {
              const next = m.states[c.id];
              return next &&
                Object.entries(next).some(([k, v]) => c.state[k] !== v)
                ? { ...c, state: { ...c.state, ...next } }
                : c;
            }),
            diagnostics: m.warnings,
            elapsedMs: m.elapsed,
            voltages: m.voltages,
          }));
          const key = m.warnings.join("|");
          if (key && key !== this.warningKey)
            store.addSerialMessage({ type: "warning", message: key + "\n" });
          this.warningKey = key;
        }
        if (m.type === "serial")
          store.addSerialMessage({ type: "data", message: m.text });
        if (m.type === "baud")
          useSimulatorStore.setState({ sketchBaudRate: m.baud });
        if (m.type === "warning")
          store.addSerialMessage({
            type: "warning",
            message: m.message + "\n",
          });
        if (m.type === "error") {
          this.stop();
          useSimulatorStore.setState({
            simulationState: "stopped",
            diagnostics: [m.message],
          });
          store.addSerialMessage({ type: "error", message: m.message + "\n" });
        }
      };
      worker.onerror = (e) => {
        this.stop();
        useSimulatorStore.setState({
          simulationState: "stopped",
          diagnostics: [e.message],
        });
        store.addSerialMessage({ type: "error", message: e.message + "\n" });
      };
      worker.postMessage({
        type: "start",
        code: store.code,
        components: store.components,
        wires: store.wires,
      });
      // Derived output updates do not feed back into the worker.
      let previous = this.circuitSignature();
      this.unsubscribe = useSimulatorStore.subscribe(() => {
        const next = this.circuitSignature();
        if (next !== previous) {
          previous = next;
          const s = useSimulatorStore.getState();
          worker.postMessage({
            type: "circuit",
            components: s.components,
            wires: s.wires,
          });
        }
      });
      useSimulatorStore.setState({
        simulationState: "running",
        diagnostics: [],
        elapsedMs: 0,
      });
    } catch (e) {
      this.stop();
      useSimulatorStore.setState({
        simulationState: "stopped",
        diagnostics: [String(e)],
      });
    }
  }
  private circuitSignature() {
    const s = useSimulatorStore.getState();
    return JSON.stringify([
      s.components.map((c) => [
        c.id,
        c.typeId,
        c.position,
        c.rotation,
        c.state.value,
        c.state.isPressed,
        c.state.resistance,
      ]),
      s.wires.map(w=>[w.sourceComponentId,w.sourcePinId,w.targetComponentId,w.targetPinId]),
    ]);
  }
  send(text: string) {
    this.worker?.postMessage({
      type: "serial",
      bytes: Array.from(new TextEncoder().encode(text)),
    });
  }
  pause() {
    this.worker?.postMessage({ type: "pause" });
  }
  stop() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.worker?.terminate();
    this.worker = null;
    this.warningKey = "";
    useSimulatorStore.setState((s) => ({
      voltages: {},
      components: s.components.map((c) =>
        c.typeId === "led_red" || c.typeId === "arduino_uno" || c.typeId === "esp32_wroom"
          ? {
              ...c,
              state: {
                ...c.state,
                isOn: false,
                builtinLED: false,
                brightness: 0,
                currentMa: 0,
              },
            }
          : c,
      ),
    }));
  }
}
export const arduinoEngine = new ArduinoInterpreter();
