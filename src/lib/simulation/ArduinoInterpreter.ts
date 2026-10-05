import { useSimulatorStore } from "@/store/useSimulatorStore";
import { bundleSketchFiles } from "@/lib/sketch/bundler";
import { sensorFramesSignature } from "./sensors/vhal";

export class ArduinoInterpreter {
  private worker: Worker | null = null;
  private physicsWorker: Worker | null = null;
  private unsubscribe: (() => void) | null = null;
  private warningKey = "";
  start(options: { external?: boolean } = {}) {
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
      this.physicsWorker = new Worker(new URL("../robotics/physics.worker.ts", import.meta.url), { type: "module" });
      const physicsWorker = this.physicsWorker;
      physicsWorker.onmessage = ({ data: message }) => {
        if (this.physicsWorker !== physicsWorker) return;
        if (message.type === "physics_step") {
          physicsWorker.postMessage({ type: "step", count: message.count });
          return;
        }
        if (message.type === "physics_frame") {
          const ids = message.ids as string[];
          const values = message.values as Float32Array;
          useSimulatorStore.setState((state) => {
            let changed = false;
            const components = state.components.map((component) => {
              const index = ids.indexOf(component.id);
              if (index < 0) return component;
              const offset = index * 6;
              const position = [values[offset], values[offset + 1], values[offset + 2]] as [number, number, number];
              const rotation = [values[offset + 3], values[offset + 4], values[offset + 5]] as [number, number, number];
              if (position.every((value, axis) => Math.abs(value - component.position[axis]) < 1e-5) &&
                  rotation.every((value, axis) => Math.abs(value - component.rotation[axis]) < 1e-5)) return component;
              changed = true;
              return { ...component, position, rotation };
            });
            return changed ? { components } : state;
          });
          return;
        }
        if (message.type === "physics_error") {
          const text = `Physics: ${String(message.message)}`;
          useSimulatorStore.setState((state) => ({ diagnostics: state.diagnostics.includes(text) ? state.diagnostics : [...state.diagnostics, text] }));
          store.addSerialMessage({ type: "warning", message: `${text}\n` });
        }
      };
      physicsWorker.onerror = (event) => {
        const text = `Physics worker: ${event.message || "gagal dijalankan."}`;
        useSimulatorStore.setState((state) => ({ diagnostics: [...state.diagnostics.filter((item) => !item.startsWith("Physics worker:")), text] }));
      };
      physicsWorker.postMessage({ type: "start", components: store.components });
      this.worker = new Worker(
        new URL("./simulation.worker.ts", import.meta.url),
      );
      const worker = this.worker;
      worker.onmessage = ({ data: m }) => {
        if (this.worker !== worker) return;
        if (m.type === "physics_step") {
          this.physicsWorker?.postMessage({ type: "step", count: m.count });
          return;
        }
        if (m.type === "frame") {
          useSimulatorStore.setState((s) => ({
            components: s.components.map((c) => {
              const next = m.states[c.id];
              return next &&
                Object.entries(next).some(([k, v]) => c.state[k] !== v)
                ? { ...c, state: { ...c.state, ...next } }
                : c;
            }),
            diagnostics: [...m.warnings, ...s.diagnostics.filter((item) => item.startsWith("Physics"))],
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
      const codeToRun = options.external ? "void setup() {}\nvoid loop() {}" : bundleSketchFiles(
        store.files && store.files.length > 0
          ? store.files
          : [{ name: "sketch.ino", content: store.code }]
      );
      worker.postMessage({
        type: "start",
        code: codeToRun,
        external: options.external === true,
        components: store.components,
        wires: store.wires,
        sensorFrames: { rgbd: store.rgbdFrames, lidar: store.lidarFrames, imu: store.imuFrames },
      });
      // Derived output updates do not feed back into the worker.
      let previous = this.circuitSignature();
      let previousSensorFrames = this.sensorFrameSignature();
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
          this.physicsWorker?.postMessage({ type: "sync", components: s.components });
        }
        const nextSensorFrames = this.sensorFrameSignature();
          if (nextSensorFrames !== previousSensorFrames) {
          previousSensorFrames = nextSensorFrames;
          const s = useSimulatorStore.getState();
          worker.postMessage({ type: "sensor_frames", frames: { rgbd: s.rgbdFrames, lidar: s.lidarFrames, imu: s.imuFrames } });
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
        c.state.outputMask,
        c.typeId === "stepper_nema17" ? undefined : c.state.steps,
        c.typeId === "stepper_nema17" ||
        c.typeId === "dc_motor" ||
        (c.typeId === "incremental_encoder" && c.state.coupledMotorId) ||
        (c.typeId === "servo_sg90" && c.state.isCommanded)
          ? undefined
          : c.state.angle,
        c.state.leftSpeed,
        c.state.rightSpeed,
        c.state.gimbalPan,
        c.state.gimbalTilt,
        c.state.pulsesPerRevolution,
        c.state.coupledMotorId,
        c.state.coupledRobotId,
        c.state.coupledJointIndex,
        c.state.jointOffsetDeg,
        c.state.jointDirection,
        c.typeId === "edu_arm_3dof" || c.typeId === "aero_arm_6dof"
          ? [c.state.joint0, c.state.joint1, c.state.joint2, c.state.joint3, c.state.joint4, c.state.joint5]
          : undefined,
        c.state.vref,
        c.state.senseResistance,
        c.state.physicsMode,
        c.state.physicsMassKg,
        c.state.physicsFriction,
        c.state.physicsRestitution,
        c.state.physicsParentId,
        c.state.physicsJointType,
        c.state.voltage,
        c.state.isOn,
        c.typeId === "battery_pack"
          ? [c.state.profile, c.state.isOn, c.state.isProtectionTripped, c.state.maxDischargeCurrentA, c.state.internalResistanceOhms, c.state.capacityAh, c.state.socRevision]
          : undefined,
        c.typeId === "dc_dc_converter"
          ? [c.state.isOn, c.state.outputVoltage, c.state.maxOutputCurrentA, c.state.efficiency, c.state.outputResistanceOhms]
          : undefined,
        c.typeId === "battery_charger"
          ? [c.state.isOn, c.state.maxChargeCurrentA, c.state.efficiency]
          : undefined,
        c.typeId === "dc_motor"
          ? [c.state.resistanceOhms, c.state.inductanceH, c.state.torqueConstantNmPerA, c.state.backEmfConstantVsPerRad, c.state.rotorInertiaKgM2, c.state.viscousFrictionNmPerRadS, c.state.gearRatio, c.state.gearEfficiency, c.state.loadTorqueNm]
          : undefined,
      ]),
      s.wires.map(w=>[w.sourceComponentId,w.sourcePinId,w.targetComponentId,w.targetPinId]),
    ]);
  }
  private sensorFrameSignature() {
    const s = useSimulatorStore.getState();
    return sensorFramesSignature({ rgbd: s.rgbdFrames, lidar: s.lidarFrames, imu: s.imuFrames });
  }
  send(text: string) {
    this.worker?.postMessage({
      type: "serial",
      bytes: Array.from(new TextEncoder().encode(text)),
    });
  }
  setExternalGPIO(pin: number, mode: string, value: number) {
    this.worker?.postMessage({ type: "external_gpio", pin, mode, value });
  }
  pause() {
    this.worker?.postMessage({ type: "pause" });
  }
  stop() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.worker?.terminate();
    this.worker = null;
    this.physicsWorker?.postMessage({ type: "dispose" });
    this.physicsWorker?.terminate();
    this.physicsWorker = null;
    this.warningKey = "";
    useSimulatorStore.setState((s) => ({
      voltages: {},
      components: s.components.map((c) =>
        c.typeId === "rover_bot_4wd"
          ? { ...c, state: { ...c.state, leftSpeed: 0, rightSpeed: 0 } }
          : c.typeId === "led_red" || c.typeId === "arduino_uno" || c.typeId === "esp32_wroom"
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
