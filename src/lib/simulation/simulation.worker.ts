import { gpioPin, isMicrocontroller, validateOutput } from "../components/esp32";
import { SketchParser, SketchRuntime, Value } from "./SketchRuntime";
import { SimulationClock } from "./SimulationClock";
import { solveCircuit, IO, terminal, CircuitResult } from "./CircuitSolver";
import { buildElectricalConnectivity } from "./electricalConnectivity";
import { clampPwmResolution, pwmSignal } from "./vhal/pwm";
import { integrateDifferentialDrive } from "../robotics/differentialDrive";
import { aeroArm6Dof, eduArm3Dof } from "../robotics/robots";
import { a4988MicrostepResolution, advanceA4988Pulse } from "./vhal/a4988";
import { advanceDcMotor, dcMotorParameters } from "./vhal/dcMotor";
import { advanceBatteryProtection, advanceBatterySoc, advanceLipo2sSoc, batteryParameters } from "./vhal/battery";
import { advanceBrownout } from "./vhal/brownout";
import { advanceL298NThermal } from "./vhal/l298n";
import { a4988CurrentLimit, advanceA4988Protection } from "./vhal/a4988";
import { advanceA4988Thermal } from "./vhal/a4988Thermal";
import { advanceBatteryChargerThermal } from "./vhal/chargerThermal";
import { advanceChargerSafetyTimer } from "./vhal/chargerSafetyTimer";
import { connectedI2CDevices, I2CBus } from "./vhal/i2c";
import { pca9685ChannelRegister, pca9685PulseMicroseconds, servoAngleFromPulse } from "./vhal/pca9685";
import { SSD1306Controller, SSD1306Framebuffer } from "./vhal/ssd1306";
import { sensorReadApi, type SensorFrameSet } from "./sensors/vhal";
import type { CircuitComponent, Wire } from "../components/componentTypes";
let components: CircuitComponent[] = [];
let wires: Wire[] = [];
let electricalConnectivity = buildElectricalConnectivity([], []);
let io: Record<string, IO> = {};
let result: CircuitResult = { voltages: {}, states: {}, warnings: [] };
let sensorFrames: SensorFrameSet = { rgbd: {}, lidar: {}, imu: {} };
let dirty = true;
let paused = false;
let brownoutActive = false;
let brownoutResetPending = false;
let brownoutLowDurationUs = 0;
let runningCode = "";
const SIMULATION_STEP_US = 5_000;
const RENDER_INTERVAL_US = 1_000_000 / 60;
const simClock = new SimulationClock(SIMULATION_STEP_US);
const i2cBus = new I2CBus();
let i2cReady = false;
const mpu6050Registers = new Map<string, number>();
const oledFramebuffer = new SSD1306Framebuffer();
const oledController = new SSD1306Controller(oledFramebuffer);
let renderAccumulatorUs = 0;
let physicsStepAccumulator = 0;
let randomState = 0x6d2b79f5;
let baud = 0;
let pwmResolutionBits = 8;
const roverBindings = new Map<string, string>();
const interrupts = new Map<string, { callback: string; mode: number; lastValue: number }>();
let dispatchingInterrupts = false;
let interruptCheckPending = false;
let coupledEncoderSyncPromise: Promise<void> | null = null;
let coupledEncoderSyncPending = false;
const rx: number[] = [];
let runtime: SketchRuntime;
const send = (data: unknown) => postMessage(data);
async function ready() {
  while (paused || brownoutActive) await new Promise<void>((r) => setTimeout(r, 20));
}
function nextRandom() {
  randomState = (randomState + 0x6d2b79f5) | 0;
  let t = randomState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function solve() {
  if (dirty) {
    result = solveCircuit(components, wires, io);
    dirty = false;
  }
  return result;
}
function integrateDcMotors() {
  dirty = true;
  const solved = solve();
  const dt = SIMULATION_STEP_US / 1_000_000;
  let changed = false;
  for (const motor of components.filter((item) => item.typeId === "dc_motor")) {
    const currentA = Number(solved.states[motor.id]?.armatureCurrentA) || 0;
    const next = advanceDcMotor({
      armatureCurrentA: Number(motor.state.armatureCurrentA) || 0,
      backEmfV: Number(motor.state.backEmfV) || 0,
      omegaRadS: Number(motor.state.omegaRadS) || 0,
      angleRad: Number(motor.state.angleRad) || 0,
    }, dcMotorParameters(motor.state), currentA, dt);
    motor.state = { ...motor.state, ...next };
    changed = true;
  }
  if (changed) dirty = true;
}
function integrateBatteries() {
  dirty = true;
  const solved = solve();
  const dt = SIMULATION_STEP_US / 1_000_000;
  let changed = false;
  for (const battery of components.filter((item) => item.typeId === "battery_pack" && item.state.isOn !== false)) {
    const params = batteryParameters(battery.state);
    const currentA = Number(solved.states[battery.id]?.currentA) || 0;
    const protection = advanceBatteryProtection({
      isProtectionTripped: battery.state.isProtectionTripped === true,
      protectionTripCurrentA: Number(battery.state.protectionTripCurrentA) || 0,
    }, currentA, params.maxDischargeCurrentA);
    if (protection.isProtectionTripped) {
      if (battery.state.isProtectionTripped !== true) {
        battery.state = { ...battery.state, ...protection };
        changed = true;
      }
      continue;
    }
    const nextState = battery.state.profile === "lipo_2s"
      ? advanceLipo2sSoc(
          params.cell1SocPercent,
          params.cell2SocPercent,
          currentA,
          params.capacityAh,
          Number(solved.states[battery.id]?.balanceCurrentA) || 0,
          solved.states[battery.id]?.balanceCellIndex === 2 ? 2 : 1,
          dt,
        )
      : { socPercent: advanceBatterySoc(params.socPercent, currentA, params.capacityAh, dt) };
    if (nextState.socPercent !== params.socPercent ||
      ("cell1SocPercent" in nextState && nextState.cell1SocPercent !== params.cell1SocPercent) ||
      ("cell2SocPercent" in nextState && nextState.cell2SocPercent !== params.cell2SocPercent)) {
      battery.state = { ...battery.state, ...nextState };
      changed = true;
    }
  }
  if (changed) dirty = true;
}

function integrateDcDcConverters() {
  dirty = true;
  const solved = solve();
  let changed = false;
  for (const converter of components.filter((item) => item.typeId === "dc_dc_converter")) {
    const next = solved.states[converter.id];
    if (!next) continue;
    const keys = ["inputCurrentA", "outputCurrentA", "inputVoltageV", "outputVoltageV", "powerLossW", "isRegulating", "isCurrentLimited"];
    if (keys.some((key) => converter.state[key] !== next[key])) {
      converter.state = { ...converter.state, ...next };
      changed = true;
    }
  }
  if (changed) dirty = true;
}

function integrateBatteryChargers() {
  dirty = true;
  const solved = solve();
  let changed = false;
  for (const charger of components.filter((item) => item.typeId === "battery_charger")) {
    const next = solved.states[charger.id];
    if (!next) continue;
    const timer = advanceChargerSafetyTimer({
      chargeElapsedSeconds: Number(charger.state.chargeElapsedSeconds) || 0,
      safetyTimerLimitSeconds: Number(charger.state.safetyTimerLimitSeconds) || 10 * 60 * 60,
      isSafetyTimerExpired: charger.state.isSafetyTimerExpired === true,
    }, next.isCharging === true, SIMULATION_STEP_US / 1_000_000);
    const stateUpdate: Record<string, string | number | boolean> = { ...next, ...timer };
    const keys = ["inputVoltageV", "inputCurrentA", "chargeCurrentA", "targetVoltageV", "isCharging", "isConstantVoltage", "isChargeComplete", "isSafetyTimerExpired", "chargeElapsedSeconds", "safetyTimerLimitSeconds", "tailCurrentLimitA", "powerLossW", "isReverseConnected", "isBalancing", "balanceCurrentA", "balanceCellIndex", "cellDeltaVoltageV"];
    if (keys.some((key) => charger.state[key] !== stateUpdate[key])) {
      charger.state = { ...charger.state, ...stateUpdate };
      changed = true;
    }
  }
  if (changed) dirty = true;
}

function integrateBatteryChargerThermal() {
  dirty = true;
  const solved = solve();
  const dt = SIMULATION_STEP_US / 1_000_000;
  let changed = false;
  for (const charger of components.filter((item) => item.typeId === "battery_charger")) {
    const current = {
      temperatureC: Number(charger.state.temperatureC) || 25,
      isThermalShutdown: charger.state.isThermalShutdown === true,
    };
    const next = advanceBatteryChargerThermal(current, Number(solved.states[charger.id]?.powerLossW) || 0, dt);
    if (next.temperatureC !== current.temperatureC || next.isThermalShutdown !== current.isThermalShutdown) {
      charger.state = { ...charger.state, ...next };
      changed = true;
    }
  }
  if (changed) dirty = true;
}

function updateServoCurrentDraw() {
  const nowUs = simClock.micros();
  let changed = false;
  for (const servo of components.filter((item) => item.typeId === "servo_sg90" && item.state.isCommanded === true)) {
    const ageUs = Math.max(0, nowUs - (Number(servo.state.lastCommandMicros) || 0));
    const currentDrawA = ageUs < 300_000 ? 0.65 : 0.08;
    if (Number(servo.state.currentDrawA) === currentDrawA) continue;
    servo.state = { ...servo.state, currentDrawA };
    changed = true;
  }
  if (changed) dirty = true;
}

function integrateL298NThermal() {
  dirty = true;
  const solved = solve();
  const dt = SIMULATION_STEP_US / 1_000_000;
  let changed = false;
  for (const driver of components.filter((item) => item.typeId === "l298n_dual_hbridge")) {
    const current = {
      temperatureC: Number(driver.state.temperatureC) || 25,
      isThermalShutdown: driver.state.isThermalShutdown === true,
    };
    const next = advanceL298NThermal(current, Number(solved.states[driver.id]?.powerLossW) || 0, dt);
    if (next.temperatureC !== current.temperatureC || next.isThermalShutdown !== current.isThermalShutdown) {
      driver.state = { ...driver.state, ...next };
      changed = true;
    }
  }
  if (changed) dirty = true;
}

function integrateA4988Thermal() {
  dirty = true;
  const solved = solve();
  const dt = SIMULATION_STEP_US / 1_000_000;
  let changed = false;
  for (const driver of components.filter((item) => item.typeId === "a4988_stepper_driver")) {
    const current = {
      temperatureC: Number(driver.state.temperatureC) || 25,
      isThermalShutdown: driver.state.isThermalShutdown === true,
    };
    const next = advanceA4988Thermal(current, Number(solved.states[driver.id]?.powerLossW) || 0, dt);
    if (next.temperatureC !== current.temperatureC || next.isThermalShutdown !== current.isThermalShutdown) {
      driver.state = { ...driver.state, ...next };
      changed = true;
    }
  }
  if (changed) dirty = true;
}

function updateBrownoutState() {
  const controller = components.find((item) => isMicrocontroller(item.typeId));
  if (!controller) return;
  const railPin = controller.typeId === "esp32_wroom" ? "3V3" : "5V";
  const thresholdV = controller.typeId === "esp32_wroom" ? 3.0 : 4.1;
  const railVoltage = solve().voltages[terminal(controller.id, railPin)] ?? (controller.typeId === "esp32_wroom" ? 3.3 : 5);
  const transition = advanceBrownout(
    { active: brownoutActive, lowDurationUs: brownoutLowDurationUs },
    railVoltage,
    thresholdV,
    SIMULATION_STEP_US,
  );
  brownoutLowDurationUs = transition.lowDurationUs;
  if (transition.event === "reset") {
      brownoutActive = true;
      brownoutResetPending = true;
      io = {};
      interrupts.clear();
      for (const servo of components.filter((item) => item.typeId === "servo_sg90")) {
        servo.state = { ...servo.state, isCommanded: false, currentDrawA: 0 };
      }
      dirty = true;
      send({ type: "serial", text: `\n*** BROWNOUT RESET: ${railPin} ${railVoltage.toFixed(2)} V (< ${thresholdV.toFixed(1)} V) ***\n` });
  } else if (transition.event === "recovered") {
    brownoutActive = false;
    send({ type: "serial", text: `*** Tegangan ${railPin} pulih; sketch dimulai ulang. ***\n` });
  }
}
const board = () => {
 const boards=components.filter(c=>isMicrocontroller(c.typeId));
 if(boards.length!==1) throw new Error("Gunakan tepat satu mikrokontroler: Arduino Uno atau ESP32-WROOM.");
 return boards[0];
};
const supply = () => board().typeId==='esp32_wroom'?3.3:5;
const pin = (v:Value, analog=false) => gpioPin(board().typeId,Number(v),analog);
const voltage = (id: string) => {
  const v = solve().voltages[terminal(board().id, id)];
  return v ?? 0;
};
const parseI2cAddress = (value: unknown, fallback: number) => typeof value === "number"
  ? value
  : Number.parseInt(String(value ?? `0x${fallback.toString(16)}`), String(value).startsWith("0x") ? 16 : 10);
const i2cDeviceAddress = (device: CircuitComponent) => {
  if (device.typeId === "imu_6axis") return 0x68;
  if (device.typeId === "oled_ssd1306") return parseI2cAddress(device.state.address, 0x3c);
  if (device.typeId === "lcd1602_i2c") return parseI2cAddress(device.state.address, 0x27);
  if (device.typeId === "pca9685_i2c") return parseI2cAddress(device.state.address, 0x40);
  return -1;
};
function i2cDevicesAt(address: number) {
  const mcu = board();
  const solved = solve();
  const [sdaPin, sclPin] = mcu.typeId === "esp32_wroom" ? ["GPIO21", "GPIO22"] : ["SDA", "SCL"];
  return connectedI2CDevices(components, mcu.id, sdaPin, sclPin, address, electricalConnectivity, i2cDeviceAddress, (device) => {
    const powered = solved.states[device.id]?.isPowered;
    if (powered === true) return true;
    if (powered === false) return false;
    const vcc = solved.voltages[terminal(device.id, "VCC")] ?? 0;
    const gnd = solved.voltages[terminal(device.id, "GND")] ?? 0;
    return vcc - gnd >= 2.7;
  });
}
function transmitI2CBytes(address: number, controlByte: number, data: ArrayLike<number>) {
  if (!i2cReady || i2cDevicesAt(address).length === 0) return false;
  return i2cBus.writeFrame(address, controlByte, data, (targetAddress) => i2cDevicesAt(targetAddress).length > 0);
}
function mpu6050Read(device: CircuitComponent, count: number) {
  const frame = sensorFrames.imu[device.id];
  if (!frame) return Array.from({ length: count }, () => 0);
  const axes = [
    Math.round(frame.accelerationMps2[0] / 9.80665 * 16384),
    Math.round(frame.accelerationMps2[1] / 9.80665 * 16384),
    Math.round(frame.accelerationMps2[2] / 9.80665 * 16384),
    0,
    Math.round(frame.angularVelocityRadS[0] * 180 / Math.PI * 131),
    Math.round(frame.angularVelocityRadS[1] * 180 / Math.PI * 131),
    Math.round(frame.angularVelocityRadS[2] * 180 / Math.PI * 131),
  ];
  const registers = new Map<number, number>();
  axes.forEach((axis, index) => {
    const value = Math.max(-32768, Math.min(32767, axis)) & 0xffff;
    registers.set(0x3b + index * 2, value >> 8);
    registers.set(0x3c + index * 2, value & 0xff);
  });
  registers.set(0x75, 0x68);
  const pointer = mpu6050Registers.get(device.id) ?? 0x3b;
  const bytes = Array.from({ length: count }, (_, index) => registers.get(pointer + index) ?? 0);
  mpu6050Registers.set(device.id, (pointer + count) & 0xff);
  return bytes;
}
const lcdDevices = () => components.filter((device) =>
  device.typeId === "lcd1602_i2c" && i2cDevicesAt(i2cDeviceAddress(device)).includes(device),
);
function syncA4988Inputs(countPulseEdges: boolean) {
  const solved = solve();
  const read = (driver: CircuitComponent, pinId: string) => solved.voltages[terminal(driver.id, pinId)] || 0;
  for (const driver of components.filter((item) => item.typeId === "a4988_stepper_driver")) {
    const logicVoltage = read(driver, "VDD") - read(driver, "GND_LOGIC");
    const motorVoltage = read(driver, "VMOT") - read(driver, "GND_MOTOR");
    const threshold = logicVoltage / 2;
    const direction = read(driver, "DIR") >= threshold ? 1 : -1;
    const sleepHigh = logicVoltage >= 3 && read(driver, "SLEEP") >= threshold;
    const motorPowered = motorVoltage >= 8;
    const requestedCurrentLimitA = a4988CurrentLimit(Number(driver.state.vref) || 0, Number(driver.state.senseResistance) || 0.1);
    const protection = advanceA4988Protection({
      isUvlo: driver.state.isUvlo === true,
      isOvercurrentFault: driver.state.isOvercurrentFault === true,
      sleepHigh: driver.state.sleepHigh === true,
      isEnabled: driver.state.isEnabled === true,
    }, {
      vdd: logicVoltage,
      motorVoltage,
      currentLimitA: requestedCurrentLimitA,
      enableLow: read(driver, "ENABLE") < threshold,
      resetHigh: read(driver, "RESET") >= threshold,
      sleepHigh,
      isThermalShutdown: driver.state.isThermalShutdown === true,
    });
    const logicPowered = logicVoltage >= 3 && !protection.isUvlo;
    const isOvercurrentFault = protection.isOvercurrentFault;
    const isEnabled = protection.isEnabled;
    const microstepResolution = a4988MicrostepResolution(
      read(driver, "MS1") >= threshold,
      read(driver, "MS2") >= threshold,
      read(driver, "MS3") >= threshold,
    );
    const stepHigh = logicPowered && read(driver, "STEP") >= threshold;
    const prior = {
      stepHigh: Boolean(driver.state.stepHigh),
      riseMicros: Number(driver.state.riseMicros) || 0,
      positionPulses: Number(driver.state.positionPulses) || 0,
      angleDegrees: Number(driver.state.angleDegrees) || 0,
    };
    const pulseState = countPulseEdges
      ? advanceA4988Pulse(prior, stepHigh, simClock.micros(), direction, isEnabled && motorPowered, microstepResolution).state
      : { ...prior, stepHigh };
    driver.state = {
      ...driver.state,
      ...pulseState,
      direction: direction > 0 ? "CW" : "CCW",
      microstepResolution,
      isLogicPowered: logicPowered,
      isMotorPowered: motorPowered,
      isEnabled,
      isUvlo: protection.isUvlo,
      sleepHigh: protection.sleepHigh,
      isOvercurrentFault,
    };
  }
  dirty = true;
}
async function advanceEncoderAngle(encoder: CircuitComponent, targetAngle: number, pprValue: unknown, startAngle = Number(encoder.state.angle) || 0) {
  const ppr = Math.max(1, Math.min(100_000, Math.trunc(Number(pprValue) || 100)));
  const previousCount = Math.trunc(startAngle / (2 * Math.PI) * ppr * 4);
  const targetCount = Math.trunc(targetAngle / (2 * Math.PI) * ppr * 4);
  const countDelta = targetCount - previousCount;
  const eventCount = Math.min(Math.abs(countDelta), 256);
  const direction = Math.sign(countDelta);
  for (let i = 1; i <= eventCount; i++) {
    const count = previousCount + direction * i;
    encoder.state = { ...encoder.state, angle: count / (ppr * 4) * 2 * Math.PI };
    dirty = true;
    await dispatchInterruptEdges();
  }
  if (eventCount < Math.abs(countDelta)) {
    send({ type: "warning", message: `${encoder.name}: lebih dari 256 edge encoder dalam satu update; ISR hanya menerima 256 edge pertama.` });
  }
  if (Math.abs(targetAngle - (Number(encoder.state.angle) || 0)) >= 1e-12) {
    encoder.state = { ...encoder.state, angle: targetAngle };
    dirty = true;
  }
}
async function syncCoupledEncoders() {
  const solved = solve();
  for (const encoder of components.filter((item) => item.typeId === "incremental_encoder")) {
    const motorId = String(encoder.state.coupledMotorId || "");
    if (!motorId) continue;
    const motorState = solved.states[motorId];
    if (!motorState || typeof motorState.angle !== "number") continue;
    await advanceEncoderAngle(encoder, motorState.angle * Math.PI / 180, encoder.state.pulsesPerRevolution);
  }
}
function scheduleCoupledEncoderSync() {
  coupledEncoderSyncPending = true;
  if (!coupledEncoderSyncPromise) {
    coupledEncoderSyncPromise = (async () => {
      while (coupledEncoderSyncPending) {
        coupledEncoderSyncPending = false;
        await syncCoupledEncoders();
      }
    })().finally(() => { coupledEncoderSyncPromise = null; });
  }
  return coupledEncoderSyncPromise;
}
function syncActuatorJoints() {
  const solved = solve();
  let changed = false;
  for (const actuator of components.filter((item) => item.typeId === "servo_sg90" || item.typeId === "stepper_nema17" || item.typeId === "dc_motor")) {
    const robotId = String(actuator.state.coupledRobotId || "");
    const robot = components.find((item) => item.id === robotId);
    if (!robot || (robot.typeId !== "edu_arm_3dof" && robot.typeId !== "aero_arm_6dof")) continue;
    if (actuator.typeId === "servo_sg90" && (!actuator.state.isCommanded || solved.states[actuator.id]?.isPowered !== true)) continue;
    const angle = Number(solved.states[actuator.id]?.angle ?? actuator.state.angle);
    if (!Number.isFinite(angle)) continue;
    const model = robot.typeId === "aero_arm_6dof" ? aeroArm6Dof : eduArm3Dof;
    const jointIndex = Math.trunc(Number(actuator.state.coupledJointIndex) || 0);
    if (jointIndex < 0 || jointIndex >= model.joints.length) continue;
    const joint = model.joints[jointIndex];
    const direction = Number(actuator.state.jointDirection) === -1 ? -1 : 1;
    const offset = (Number(actuator.state.jointOffsetDeg) || 0) * Math.PI / 180;
    const actuatorAngle = (actuator.typeId === "servo_sg90" ? angle - 90 : angle) * Math.PI / 180;
    const target = Math.max(joint.min, Math.min(joint.max, offset + direction * actuatorAngle));
    const key = `joint${jointIndex}`;
    if (Math.abs((Number(robot.state[key]) || 0) - target) < 1e-12) continue;
    robot.state = { ...robot.state, [key]: target };
    changed = true;
  }
  if (changed) dirty = true;
}
async function syncManualEncoderTransitions(previousComponents: CircuitComponent[]) {
  for (const encoder of components.filter((item) => item.typeId === "incremental_encoder" && !item.state.coupledMotorId)) {
    const previous = previousComponents.find((item) => item.id === encoder.id && item.typeId === "incremental_encoder");
    if (!previous || previous.state.coupledMotorId) continue;
    await advanceEncoderAngle(
      encoder,
      Number(encoder.state.angle) || 0,
      encoder.state.pulsesPerRevolution,
      Number(previous.state.angle) || 0,
    );
  }
}
async function dispatchInterruptEdges() {
  if (!runtime || interrupts.size === 0) return;
  if (dispatchingInterrupts) {
    interruptCheckPending = true;
    return;
  }
  dispatchingInterrupts = true;
  try {
    let passes = 0;
    do {
      interruptCheckPending = false;
      const mcu = board();
      const solved = solve();
      const callbacks: string[] = [];
      for (const [pinId, handler] of interrupts) {
        const current = (solved.voltages[terminal(mcu.id, pinId)] || 0) >= supply() / 2 ? 1 : 0;
        const previous = handler.lastValue;
        handler.lastValue = current;
        const fire = handler.mode === 1
          ? current !== previous
          : handler.mode === 2 || handler.mode === 0
            ? previous === 1 && current === 0
            : previous === 0 && current === 1;
        if (fire) callbacks.push(handler.callback);
      }
      for (const callback of callbacks) await runtime.invoke(callback);
      if (++passes >= 256) throw new Error("Interrupt loop melebihi 256 dispatch dalam satu perubahan rangkaian.");
    } while (interruptCheckPending);
  } finally {
    dispatchingInterrupts = false;
  }
}
let serialBuffer = "";
function print(v: Value = "", format?: Value) {
  if (!baud) throw new Error("Panggil Serial.begin sebelum Serial.print/read.");
  const f = typeof format === "number" ? format : Number(format);
  let str: string;
  if (typeof v === "number" && !Number.isNaN(f) && format !== undefined) {
    if ([2, 8, 16].includes(f)) {
      str = Math.trunc(v).toString(f).toUpperCase();
    } else {
      str = v.toFixed(f);
    }
  } else {
    str = String(v);
  }
  serialBuffer = (serialBuffer + str).slice(-16000);
  return 0;
}
const api: Record<string, (...args: Value[]) => Value | Promise<Value>> = {
  ...sensorReadApi(() => sensorFrames),
  "Wire.begin": () => { i2cBus.reset(); i2cReady = true; return 0; },
  "Wire.beginTransmission": (address) => { if (i2cReady) i2cBus.beginTransmission(Number(address)); return 0; },
  "Wire.write": (value) => {
    return i2cReady ? i2cBus.write(value) : 0;
  },
  "Wire.endTransmission": () => !i2cReady ? 4 : i2cBus.endTransmission((address, bytes) => {
    const devices = i2cDevicesAt(address);
    if (devices.length === 0) return false;
    for (const device of devices) {
      if (device.typeId === "imu_6axis" && bytes.length) {
        mpu6050Registers.set(device.id, bytes[0]);
      }
      if (device.typeId === "oled_ssd1306" && bytes.length >= 1 && oledController.write(bytes[0], bytes.slice(1))) {
        oledState.address = address;
        oledState.initialized = true;
        oledState.inverted = oledController.inverted;
        updateOledComponents();
      }
    }
    return true;
  }),
  "Wire.requestFrom": (address, count) => !i2cReady ? 0 : i2cBus.requestFrom(Number(address), Number(count), (requestedAddress, requestedCount) => {
    const device = i2cDevicesAt(requestedAddress)[0];
    if (!device) return null;
    if (device.typeId === "imu_6axis") return mpu6050Read(device, requestedCount);
    return [];
  }),
  "Wire.available": () => i2cBus.available(),
  "Wire.read": () => i2cBus.read(),
  Adafruit_PWMServoDriver: () => 0,
  "*.begin": (instanceName = "") => {
    void instanceName;
    i2cBus.reset();
    i2cReady = true;
    return i2cDevicesAt(0x40).some((device) => device.typeId === "pca9685_i2c") ? 1 : 0;
  },
  "*.setPWMFreq": (frequency = 50, instanceName = "") => {
    void instanceName;
    const pca = i2cDevicesAt(0x40).find((device) => device.typeId === "pca9685_i2c");
    const requestedHz = Number(frequency);
    if (!i2cReady || !pca || !Number.isFinite(requestedHz) || requestedHz <= 0) return 0;
    const prescale = Math.max(3, Math.min(255, Math.round(25_000_000 / (4096 * requestedHz)) - 1));
    i2cBus.beginTransmission(0x40);
    i2cBus.write(0xfe);
    i2cBus.write(prescale);
    if (i2cBus.endTransmission((address) => i2cDevicesAt(address).some((device) => device.typeId === "pca9685_i2c")) !== 0) return 0;
    pca.state = { ...pca.state, frequencyHz: 25_000_000 / (4096 * (prescale + 1)) };
    dirty = true;
    return 1;
  },
  "*.setPWM": (channel = 0, onCount = 0, offCount = 0, instanceName = "") => {
    void instanceName;
    const pca = i2cDevicesAt(0x40).find((device) => device.typeId === "pca9685_i2c");
    const register = pca9685ChannelRegister(Number(channel));
    if (!i2cReady || !pca || register === null) return 0;
    const on = Math.trunc(Number(onCount)) & 0x1fff;
    const off = Math.trunc(Number(offCount)) & 0x1fff;
    i2cBus.beginTransmission(0x40);
    for (const byte of [register, on & 0xff, (on >> 8) & 0x1f, off & 0xff, (off >> 8) & 0x1f]) i2cBus.write(byte);
    if (i2cBus.endTransmission((address) => i2cDevicesAt(address).some((device) => device.typeId === "pca9685_i2c")) !== 0) return 0;
    const pulseUs = off & 0x1000 ? 0 : pca9685PulseMicroseconds(on, off, Number(pca.state.frequencyHz) || 50);
    pca.state = {
      ...pca.state,
      [`pwm${Number(channel)}`]: (off - on) & 0x0fff,
      [`pulseUs${Number(channel)}`]: pulseUs,
    };
    dirty = true;
    syncPcaServoOutputs();
    return 1;
  },
  pinMode: (p, m) => {
    const id = pin(p);
    if (![0, 1, 2].includes(Number(m))) throw new Error("Mode pin tidak valid");
    validateOutput(board().typeId,id,["INPUT","OUTPUT","INPUT_PULLUP"][Number(m)]);
    io[id] = {
      mode: ["INPUT", "OUTPUT", "INPUT_PULLUP"][Number(m)] as IO["mode"],
      value: io[id]?.value || 0,
    };
    dirty = true;
    return 0;
  },
  digitalWrite: async (p, v) => {
    const id = pin(p);
    validateOutput(board().typeId,id,Number(v)?"INPUT_PULLUP":io[id]?.mode||"INPUT");
    const prev = io[id] || { mode: "INPUT", value: 0 };
    io[id] = {
      mode:
        prev.mode === "OUTPUT"
          ? "OUTPUT"
          : Number(v)
            ? "INPUT_PULLUP"
            : "INPUT",
      value: Number(v) ? supply() : 0,
    };
    dirty = true;
    syncA4988Inputs(true);
    await scheduleCoupledEncoderSync();
    syncActuatorJoints();
    await dispatchInterruptEdges();
    return 0;
  },
  digitalRead: (p) => +(voltage(pin(p)) >= supply() / 2),
  digitalPinToInterrupt: (p) => {
    const value = Number(p);
    const pinId = pin(value);
    if (board().typeId === "arduino_uno" && !["D2", "D3"].includes(pinId)) return -1;
    return value;
  },
  attachInterrupt: (interruptNumber, callback, mode) => {
    const numericPin = Number(interruptNumber);
    if (!Number.isInteger(numericPin) || numericPin < 0) throw new Error("Pin tidak memiliki interrupt eksternal yang didukung.");
    const pinId = pin(numericPin);
    if (board().typeId === "arduino_uno" && !["D2", "D3"].includes(pinId)) {
      throw new Error("Pada Arduino Uno, attachInterrupt hanya tersedia pada pin 2 dan 3.");
    }
    if (typeof callback !== "string" || !runtime) throw new Error("Callback attachInterrupt harus berupa nama fungsi sketch.");
    const interruptMode = Number(mode);
    if (![0, 1, 2, 3].includes(interruptMode)) throw new Error("Mode interrupt harus LOW, CHANGE, FALLING, atau RISING.");
    const current = +(voltage(pinId) >= supply() / 2);
    interrupts.set(pinId, { callback, mode: interruptMode, lastValue: current });
    return 0;
  },
  detachInterrupt: (interruptNumber) => {
    interrupts.delete(pin(Number(interruptNumber)));
    return 0;
  },
  analogRead: (p) => {
    const max=board().typeId==='esp32_wroom'?4095:1023;
    return Math.max(0,Math.min(max,Math.round(voltage(pin(p,true))/supply()*max)));
  },
  analogWrite: (p, v) => {
    const id = pin(p);
    validateOutput(board().typeId,id,"OUTPUT");
    const pwmCapable = board().typeId === "esp32_wroom" || [3, 5, 6, 9, 10, 11].includes(Number(p));
    const signal = pwmSignal(Number(v), pwmResolutionBits, supply(), pwmCapable);
    io[id] = {
      mode: "OUTPUT",
      value: signal.voltage,
    };
    dirty = true;
    return 0;
  },
  analogWriteResolution: (bits) => {
    const maxBits = board().typeId === "esp32_wroom" ? 16 : 8;
    pwmResolutionBits = clampPwmResolution(Number(bits), maxBits);
    return pwmResolutionBits;
  },
  delay: async (ms) => {
    await simClock.delayMicros(Number(ms) * 1000);
    return 0;
  },
  delayMicroseconds: async (us) => {
    await simClock.delayMicros(Number(us));
    return 0;
  },
  pulseIn: (pin: number | string, val: number | string = 1, timeout = 1000000) => {
    const hcsr = components.find((c) => c.typeId === "hcsr04");
    if (!hcsr || hcsr.state?.isPowered === false || Number(val) !== 1) return 0;
    const d = typeof hcsr.state?.distance === "number" ? hcsr.state.distance : hcsr04State.distance;
    // Microseconds duration for speed of sound (343 m/s = 0.0343 cm/us round-trip)
    const duration = Math.round(d * 58.3);
    return duration <= Number(timeout) ? duration : 0;
  },
  millis: () => simClock.millis(),
  micros: () => simClock.micros(),
  map: (x, a, b, c, d) =>
    Math.trunc(
      ((Number(x) - Number(a)) * (Number(d) - Number(c))) /
        (Number(b) - Number(a)) +
        Number(c),
    ),
  constrain: (x, a, b) => Math.max(Number(a), Math.min(Number(b), Number(x))),
  abs: (x) => Math.abs(Number(x)),
  min: (a, b) => Math.min(Number(a), Number(b)),
  max: (a, b) => Math.max(Number(a), Number(b)),
  sq: (x) => Number(x) * Number(x),
  sqrt: (x) => Math.sqrt(Number(x)),
  pow: (x, y) => Math.pow(Number(x), Number(y)),
  random: (a, b) => {
    if (b === undefined) return Math.floor(nextRandom() * Number(a));
    return Math.floor(Number(a) + nextRandom() * (Number(b) - Number(a)));
  },
  randomSeed: (seed) => {
    randomState = Number(seed) | 0;
    return 0;
  },
  isnan: (v: Value) => Number(Number.isNaN(Number(v))),
  isinf: (v: Value) => Number(!Number.isFinite(Number(v)) && !Number.isNaN(Number(v))),
  isfinite: (v: Value) => Number(Number.isFinite(Number(v))),
  char: (v: Value) =>
    Number(v) === 223
      ? "°"
      : typeof v === "number"
        ? String.fromCharCode(Number(v) & 255)
        : String(v),
  byte: (v: Value) => Number(v) & 255,
  int: (v: Value) => Math.trunc(Number(v)),
  word: (v: Value) => Number(v) & 0xffff,
  long: (v: Value) => Math.trunc(Number(v)),
  float: (v: Value) => Number(v),
  double: (v: Value) => Number(v),
  boolean: (v: Value) => Number(Boolean(v)),
  bool: (v: Value) => Number(Boolean(v)),
  String: (v: Value, f?: Value) => {
    if (typeof v === "number" && typeof f === "number") {
      return [2, 8, 16].includes(f)
        ? Math.trunc(v).toString(f).toUpperCase()
        : v.toFixed(f);
    }
    return String(v);
  },
  analogReadResolution: () => 0,
  "Serial.begin": (b) => {
    baud = Number(b);
    send({ type: "baud", baud });
    return 0;
  },
  "Serial.available": () => rx.length,
  "Serial.read": () => rx.shift() ?? -1,
  "Serial.peek": () => rx[0] ?? -1,
  "Serial.print": print,
  "Serial.println": (v = "", f = 10) => {
    print(v, f);
    serialBuffer += "\n";
    return 0;
  },
  "Serial.write": (v) => print(String.fromCharCode(Number(v) & 255)),

  // ESP32 Virtual Wi-Fi Emulation
  "WiFi.begin": (ssid = "Nexflux-Virtual-WiFi") => {
    wifiState.ssid = String(ssid);
    wifiState.attempts = 0;
    wifiState.connected = false;
    wifiState.connectTime = simClock.millis() + 800;
    return 0;
  },
  "WiFi.status": () => {
    if (!wifiState.ssid) return 6; // WL_DISCONNECTED
    if (!wifiState.connected) {
      wifiState.attempts++;
      if (simClock.millis() >= wifiState.connectTime || wifiState.attempts >= 3) {
        wifiState.connected = true;
        wifiState.ip = "192.168.1." + (100 + Math.floor(nextRandom() * 50));
      }
    }
    return wifiState.connected ? 3 : 0; // 3 = WL_CONNECTED, 0 = WL_IDLE_STATUS
  },
  "WiFi.localIP": () => (wifiState.connected ? wifiState.ip : "0.0.0.0"),
  "WiFi.SSID": () => wifiState.ssid,
  "WiFi.RSSI": () => (wifiState.connected ? -48 - Math.floor(nextRandom() * 12) : 0),
  "WiFi.macAddress": () => "24:6F:28:8A:4C:9E",
  "WiFi.isConnected": () => (wifiState.connected ? 1 : 0),
  "WiFi.disconnect": () => {
    wifiState.connected = false;
    wifiState.ssid = "";
    wifiState.ip = "0.0.0.0";
    return 0;
  },

  // User sketches cannot issue real network requests from the worker.
  httpGet: () => "ERROR: Akses jaringan dinonaktifkan di simulator.",
  "http.get": () => {
    lastHttpCode = 0;
    lastHttpResponse = "Akses jaringan dinonaktifkan di simulator.";
    return 0;
  },
  "http.getString": () => lastHttpResponse,
  "http.statusCode": () => lastHttpCode,

  // Adafruit_SSD1306 / GFX OLED Emulation
  "display.begin": (powerMode = 2, address = 0x3c) => {
    void powerMode; // Kept for Adafruit_SSD1306 API compatibility; virtual power mode is fixed.
    oledState.address = Number(address);
    i2cBus.reset();
    i2cReady = true;
    const connected = i2cDevicesAt(oledState.address).some((device) => device.typeId === "oled_ssd1306");
    oledState.initialized = connected && transmitI2CBytes(oledState.address, 0x00, [
      0xae, 0xd5, 0x80, 0xa8, 0x3f, 0xd3, 0x00, 0x40, 0x8d, 0x14,
      0x20, 0x00, 0xa1, 0xc8, 0xda, 0x12, 0x81, 0xcf, 0xd9, 0xf1,
      0xdb, 0x40, 0xa4, 0xa6, 0xaf,
    ]);
    if (!oledState.initialized) return 0;
    oledFramebuffer.clear();
    oledState.buffer = "";
    oledState.cursorX = 0;
    oledState.cursorY = 0;
    updateOledComponents();
    return 1;
  },
  "display.clearDisplay": () => {
    if (!oledState.initialized) return 0;
    oledFramebuffer.clear();
    oledState.buffer = "";
    oledState.cursorX = 0;
    oledState.cursorY = 0;
    return 0;
  },
  "display.setTextSize": (s = 1) => {
    if (!oledState.initialized) return 0;
    oledState.textSize = Math.max(1, Math.min(8, Math.trunc(Number(s)) || 1));
    return 0;
  },
  "display.setTextColor": (c = 1) => {
    if (!oledState.initialized) return 0;
    oledState.textColor = Math.max(0, Math.min(2, Math.trunc(Number(c)))) || 0;
    return 0;
  },
  "display.setCursor": (x = 0, y = 0) => {
    if (!oledState.initialized) return 0;
    oledState.cursorX = Number(x);
    oledState.cursorY = Number(y);
    return 0;
  },
  "display.print": (v: Value = "", format?: Value) => {
    if (!oledState.initialized) return 0;
    const value = typeof v === "number" && typeof format === "number" && [2, 8, 16].includes(Number(format))
      ? Math.trunc(v).toString(Number(format)).toUpperCase()
      : String(v);
    const cursor = oledFramebuffer.drawText(value, oledState.cursorX, oledState.cursorY, oledState.textSize, oledState.textColor as 0 | 1 | 2);
    oledState.cursorX = cursor.cursorX;
    oledState.cursorY = cursor.cursorY;
    oledState.buffer += value;
    return value.length;
  },
  "display.println": (v: Value = "", format?: Value) => {
    if (!oledState.initialized) return 0;
    const value = typeof v === "number" && typeof format === "number" && [2, 8, 16].includes(Number(format))
      ? Math.trunc(v).toString(Number(format)).toUpperCase()
      : String(v);
    const cursor = oledFramebuffer.drawText(value + "\n", oledState.cursorX, oledState.cursorY, oledState.textSize, oledState.textColor as 0 | 1 | 2);
    oledState.cursorX = cursor.cursorX;
    oledState.cursorY = cursor.cursorY;
    oledState.buffer += value + "\n";
    return value.length + 1;
  },
  "display.display": () => {
    if (!oledState.initialized) return 0;
    if (!transmitI2CBytes(oledState.address, 0x00, [0x21, 0, 127, 0x22, 0, 7])) return 0;
    if (!transmitI2CBytes(oledState.address, 0x40, oledFramebuffer.toControllerBytes())) return 0;
    updateOledComponents();
    return 1;
  },
  "display.invertDisplay": (inv = 1) => {
    if (!oledState.initialized) return 0;
    const nextInverted = Boolean(inv);
    if (!transmitI2CBytes(oledState.address, 0x00, [nextInverted ? 0xa7 : 0xa6])) return 0;
    oledState.inverted = nextInverted;
    updateOledComponents();
    return 0;
  },
  "display.drawPixel": (x = 0, y = 0, color = 1) => {
    if (!oledState.initialized) return 0;
    oledFramebuffer.drawPixel(Number(x), Number(y), Math.max(0, Math.min(2, Number(color))) as 0 | 1 | 2);
    return 0;
  },
  "display.drawLine": (x0 = 0, y0 = 0, x1 = 0, y1 = 0, color = 1) => {
    if (!oledState.initialized) return 0;
    oledFramebuffer.drawLine(Number(x0), Number(y0), Number(x1), Number(y1), Math.max(0, Math.min(2, Number(color))) as 0 | 1 | 2);
    return 0;
  },
  "display.drawRect": (x = 0, y = 0, width = 0, height = 0, color = 1) => {
    if (!oledState.initialized) return 0;
    oledFramebuffer.drawRect(Number(x), Number(y), Number(width), Number(height), Math.max(0, Math.min(2, Number(color))) as 0 | 1 | 2);
    return 0;
  },
  "display.fillRect": (x = 0, y = 0, width = 0, height = 0, color = 1) => {
    if (!oledState.initialized) return 0;
    oledFramebuffer.fillRect(Number(x), Number(y), Number(width), Number(height), Math.max(0, Math.min(2, Number(color))) as 0 | 1 | 2);
    return 0;
  },
  "display.drawCircle": (x = 0, y = 0, radius = 0, color = 1) => {
    if (!oledState.initialized) return 0;
    oledFramebuffer.drawCircle(Number(x), Number(y), Number(radius), Math.max(0, Math.min(2, Number(color))) as 0 | 1 | 2);
    return 0;
  },
  "display.fillCircle": (x = 0, y = 0, radius = 0, color = 1) => {
    if (!oledState.initialized) return 0;
    oledFramebuffer.fillCircle(Number(x), Number(y), Number(radius), Math.max(0, Math.min(2, Number(color))) as 0 | 1 | 2);
    return 0;
  },
  "display.drawTriangle": (x0 = 0, y0 = 0, x1 = 0, y1 = 0, x2 = 0, y2 = 0, color = 1) => {
    if (!oledState.initialized) return 0;
    oledFramebuffer.drawTriangle(Number(x0), Number(y0), Number(x1), Number(y1), Number(x2), Number(y2), Math.max(0, Math.min(2, Number(color))) as 0 | 1 | 2);
    return 0;
  },
  "display.fillTriangle": (x0 = 0, y0 = 0, x1 = 0, y1 = 0, x2 = 0, y2 = 0, color = 1) => {
    if (!oledState.initialized) return 0;
    oledFramebuffer.fillTriangle(Number(x0), Number(y0), Number(x1), Number(y1), Number(x2), Number(y2), Math.max(0, Math.min(2, Number(color))) as 0 | 1 | 2);
    return 0;
  },
  "display.drawBitmap": (x = 0, y = 0, bitmap: Value = "", width = 0, height = 0, color = 1) => {
    if (!oledState.initialized) return 0;
    const bytes = typeof bitmap === "string" ? bitmap : String.fromCharCode(Number(bitmap) & 255);
    oledFramebuffer.drawBitmap(Number(x), Number(y), bytes, Number(width), Number(height), Math.max(0, Math.min(2, Number(color))) as 0 | 1 | 2);
    return 0;
  },
  "display.drawFastHLine": (x = 0, y = 0, width = 0, color = 1) => {
    if (!oledState.initialized) return 0;
    oledFramebuffer.drawLine(Number(x), Number(y), Number(x) + Number(width) - 1, Number(y), Math.max(0, Math.min(2, Number(color))) as 0 | 1 | 2);
    return 0;
  },
  "display.drawFastVLine": (x = 0, y = 0, height = 0, color = 1) => {
    if (!oledState.initialized) return 0;
    oledFramebuffer.drawLine(Number(x), Number(y), Number(x), Number(y) + Number(height) - 1, Math.max(0, Math.min(2, Number(color))) as 0 | 1 | 2);
    return 0;
  },
  "display.fillScreen": (color = 0) => {
    if (!oledState.initialized) return 0;
    oledFramebuffer.clear(Number(color) === 0 ? 0 : 1);
    return 0;
  },
  "display.write": (byte = 0) => api["display.print"](Number(byte) === 223 ? "°" : String.fromCharCode(Number(byte) & 255)),

  // ─── Micro Servo Motor SG90 Emulation ───
  "*.attach": (pin = 9, instanceName = "Servo") => {
    const state = servoState.get(String(instanceName)) || { angle: 90, attachedPin: -1 };
    state.attachedPin = Number(pin);
    servoState.set(String(instanceName), state);
    return 1;
  },
  "*.write": (val = 90, instanceName = "Servo") => {
    const a = Math.max(0, Math.min(180, Number(val)));
    const state = servoState.get(String(instanceName)) || { angle: 90, attachedPin: -1 };
    state.angle = a;
    servoState.set(String(instanceName), state);
    updateServoComponents(state, String(instanceName));
    return 0;
  },
  "*.writeMicroseconds": (us = 1500, instanceName = "Servo") => {
    const a = Math.max(0, Math.min(180, Math.round(((Number(us) - 1000) / 1000) * 180)));
    const state = servoState.get(String(instanceName)) || { angle: 90, attachedPin: -1 };
    state.angle = a;
    servoState.set(String(instanceName), state);
    updateServoComponents(state, String(instanceName));
    return 0;
  },
  "*.read": (instanceName = "Servo") => servoState.get(String(instanceName))?.angle ?? 90,
  "*.attached": (instanceName = "Servo") => ((servoState.get(String(instanceName))?.attachedPin ?? -1) >= 0 ? 1 : 0),
  "*.detach": (instanceName = "Servo") => {
    const state = servoState.get(String(instanceName));
    if (state) state.attachedPin = -1;
    for (const servo of components.filter((item) => item.typeId === "servo_sg90" && item.state.servoSketchInstance === String(instanceName))) {
      servo.state = { ...servo.state, isCommanded: false };
      dirty = true;
    }
    syncActuatorJoints();
    return 0;
  },

  "*.drive": (left = 0, right = 0, instanceName = "DifferentialDrive") => {
    setRoverDrive(String(instanceName), Number(left), Number(right));
    return 0;
  },
  "*.setVelocity": (left = 0, right = 0, instanceName = "DifferentialDrive") => {
    setRoverDrive(String(instanceName), Number(left), Number(right));
    return 0;
  },
  "*.stop": (instanceName = "DifferentialDrive") => {
    setRoverDrive(String(instanceName), 0, 0);
    return 0;
  },

  // Arduino Stepper-compatible motion API.
  "*.setSpeed": (rpm = 30) => {
    stepperState.rpm = Math.max(1, Math.min(600, Number(rpm)));
    updateStepperComponents(0);
    return 0;
  },
  "*.step": async (count = 0) => {
    updateStepperComponents(Number(count));
    syncActuatorJoints();
    await scheduleCoupledEncoderSync();
    await dispatchInterruptEdges();
    return 0;
  },

  // ─── LiquidCrystal_I2C (LCD 16x2) Emulation ───
  "lcd.init": () => {
    if (lcdDevices().length === 0) return 0;
    lcdState.line0 = "                ";
    lcdState.line1 = "                ";
    lcdState.cursorCol = 0;
    lcdState.cursorRow = 0;
    updateLcdComponents();
    return 0;
  },
  "lcd.begin": () => api["lcd.init"](),
  "*.init": () => api["lcd.init"](),
  "dht.begin": () => 0,
  "*.backlight": () => {
    if (lcdDevices().length === 0) return 0;
    lcdState.backlight = true;
    updateLcdComponents();
    return 0;
  },
  "*.noBacklight": () => {
    if (lcdDevices().length === 0) return 0;
    lcdState.backlight = false;
    updateLcdComponents();
    return 0;
  },
  "*.clear": () => {
    if (lcdDevices().length === 0) return 0;
    lcdState.line0 = "                ";
    lcdState.line1 = "                ";
    lcdState.cursorCol = 0;
    lcdState.cursorRow = 0;
    updateLcdComponents();
    return 0;
  },
  "*.home": () => {
    lcdState.cursorCol = 0;
    lcdState.cursorRow = 0;
    return 0;
  },
  "*.setCursor": (col = 0, row = 0) => {
    if (lcdDevices().length === 0) return 0;
    lcdState.cursorCol = Math.max(0, Math.min(15, Number(col)));
    lcdState.cursorRow = Math.max(0, Math.min(1, Number(row)));
    return 0;
  },
  "*.cursor": () => 0,
  "*.noCursor": () => 0,
  "*.blink": () => 0,
  "*.noBlink": () => 0,
  "*.print": (v: Value = "", format?: Value) => {
    if (lcdDevices().length === 0) return 0;
    let s: string;
    if (typeof v === "number" && typeof format === "number") {
      if ([2, 8, 16].includes(format)) {
        s = Math.trunc(v).toString(format).toUpperCase();
      } else {
        s = v.toFixed(format);
      }
    } else {
      s = String(v);
    }
    const rowKey = lcdState.cursorRow === 0 ? "line0" : "line1";
    const cur = lcdState[rowKey].padEnd(16, " ");
    const col = lcdState.cursorCol;
    const nextStr = (cur.slice(0, col) + s + cur.slice(col + s.length)).slice(0, 16);
    lcdState[rowKey] = nextStr;
    lcdState.cursorCol = Math.min(16, col + s.length);
    updateLcdComponents();
    return s.length;
  },
  "*.println": (v: Value = "", format?: Value) => {
    if (lcdDevices().length === 0) return 0;
    let s: string;
    if (typeof v === "number" && typeof format === "number") {
      if ([2, 8, 16].includes(format)) {
        s = Math.trunc(v).toString(format).toUpperCase();
      } else {
        s = v.toFixed(format);
      }
    } else {
      s = String(v);
    }
    const rowKey = lcdState.cursorRow === 0 ? "line0" : "line1";
    const cur = lcdState[rowKey].padEnd(16, " ");
    const col = lcdState.cursorCol;
    const nextStr = (cur.slice(0, col) + s + cur.slice(col + s.length)).slice(0, 16);
    lcdState[rowKey] = nextStr;
    lcdState.cursorCol = 0;
    lcdState.cursorRow = lcdState.cursorRow === 0 ? 1 : 0;
    updateLcdComponents();
    return s.length;
  },
  "lcd.write": (v: Value) =>
    api["*.print"](
      typeof v === "number"
        ? Number(v) === 223
          ? "°"
          : String.fromCharCode(Number(v) & 255)
        : String(v),
    ),
  "lcd.print": (v: Value = "", format?: Value) =>
    format !== undefined ? api["*.print"](v, format) : api["*.print"](v),
  "lcd.println": (v: Value = "", format?: Value) =>
    format !== undefined ? api["*.println"](v, format) : api["*.println"](v),

  // ─── HC-SR04 Ultrasonic Distance Sensor Emulation ───
  "*.ping_cm": () => {
    const hcsr = components.find((c) => c.typeId === "hcsr04");
    if (!hcsr || hcsr.state?.isPowered === false) return 0;
    return typeof hcsr.state?.distance === "number" ? hcsr.state.distance : hcsr04State.distance;
  },
  "*.ping_in": () => {
    const hcsr = components.find((c) => c.typeId === "hcsr04");
    if (!hcsr || hcsr.state?.isPowered === false) return 0;
    const d = typeof hcsr.state?.distance === "number" ? hcsr.state.distance : hcsr04State.distance;
    return Math.round(d / 2.54);
  },
  "*.dist": () => {
    const hcsr = components.find((c) => c.typeId === "hcsr04");
    if (!hcsr || hcsr.state?.isPowered === false) return 0;
    return typeof hcsr.state?.distance === "number" ? hcsr.state.distance : hcsr04State.distance;
  },

  // ─── DHT11 Temperature & Humidity Sensor Emulation ───
  "*.readTemperature": (isFahrenheit: Value = 0) => {
    const dht = components.find((c) => c.typeId === "dht11");
    if (!dht || dht.state?.isPowered === false) return NaN;
    const t = typeof dht.state?.temperature === "number" ? dht.state.temperature : dhtState.temperature;
    return Boolean(isFahrenheit) ? Math.round((t * 1.8 + 32) * 10) / 10 : t;
  },
  "*.readHumidity": () => {
    const dht = components.find((c) => c.typeId === "dht11");
    if (!dht || dht.state?.isPowered === false) return NaN;
    return typeof dht.state?.humidity === "number" ? dht.state.humidity : dhtState.humidity;
  },
  "*.computeHeatIndex": (temp: Value = 24, hum: Value = 50, isFahrenheit: Value = 0) => {
    const t = Number(temp);
    const h = Number(hum);
    const tf = Boolean(isFahrenheit) ? t : t * 1.8 + 32;
    const hiF =
      -42.379 +
      2.04901523 * tf +
      10.14333127 * h -
      0.22475541 * tf * h -
      0.00683783 * tf * tf -
      0.05481717 * h * h +
      0.00122874 * tf * tf * h +
      0.00085282 * tf * h * h -
      0.00000199 * tf * tf * h * h;
    return Boolean(isFahrenheit)
      ? Math.round(hiF * 10) / 10
      : Math.round(((hiF - 32) / 1.8) * 10) / 10;
  },
  "*.read11": () => 0,
};

const dhtState = {
  temperature: 24,
  humidity: 50,
};

const hcsr04State = {
  distance: 25,
};

const oledState = {
  cursorX: 0,
  cursorY: 0,
  textSize: 1,
  textColor: 1,
  buffer: "",
  inverted: false,
  address: 0x3c,
  initialized: false,
};

function updateOledComponents() {
  const oleds = i2cDevicesAt(oledState.address).filter((c) => c.typeId === "oled_ssd1306");
  for (const c of oleds) {
    c.state = {
      ...c.state,
      text: oledState.buffer,
      inverted: oledState.inverted,
      displayOn: oledController.displayOn,
      image: "custom_text",
      pixels: oledFramebuffer.toPackedString(),
    };
  }
  dirty = true;
}

const servoState = new Map<string, { angle: number; attachedPin: number }>();

const stepperState = {
  steps: 0,
  rpm: 30,
};

function updateStepperComponents(delta = 0) {
  const wholeSteps = Math.trunc(delta);
  stepperState.steps += wholeSteps;
  for (const c of components.filter((item) => item.typeId === "stepper_nema17")) {
    const steps = Number(c.state.steps || 0) + wholeSteps;
    c.state = {
      ...c.state,
      steps,
      angle: steps * 1.8,
      rpm: stepperState.rpm,
      direction: wholeSteps > 0 ? "CW" : wholeSteps < 0 ? "CCW" : "idle",
    };
  }
  dirty = true;
  syncActuatorJoints();
}

function updateServoComponents(state: { angle: number; attachedPin: number }, instanceName: string) {
  let pinId: string;
  try { pinId = pin(state.attachedPin); } catch { return; }
  const mcu = board();
  const servos = components.filter((c) =>
    c.typeId === "servo_sg90" && electricalConnectivity.connected(mcu.id, pinId, c.id, "PWM"),
  );
  for (const c of servos) {
    c.state = {
      ...c.state,
      angle: state.angle,
      isCommanded: true,
      currentDrawA: 0.65,
      lastCommandMicros: simClock.micros(),
      servoSketchInstance: instanceName,
    };
  }
  dirty = true;
  syncActuatorJoints();
}

function syncPcaServoOutputs() {
  const pcas = components.filter((device) => device.typeId === "pca9685_i2c");
  let changed = false;
  const pcaIds = new Set(pcas.map((device) => device.id));
  for (const servo of components.filter((device) => device.typeId === "servo_sg90" &&
    typeof device.state.pcaComponentId === "string" && !pcaIds.has(String(device.state.pcaComponentId)))) {
    servo.state = { ...servo.state, isCommanded: false, currentDrawA: 0 };
    changed = true;
  }
  if (!pcas.length) {
    if (changed) { dirty = true; syncActuatorJoints(); }
    return;
  }
  const solved = solve();
  for (const pca of pcas) {
    const enabled = i2cDevicesAt(i2cDeviceAddress(pca)).includes(pca) && solved.states[pca.id]?.outputsEnabled === true;
    for (let channel = 0; channel < 16; channel++) {
      const pulseUs = Number(pca.state[`pulseUs${channel}`]) || 0;
      const servos = components.filter((servo) => servo.typeId === "servo_sg90" && (
        electricalConnectivity.connected(pca.id, `PWM${channel}`, servo.id, "PWM") ||
        (servo.state.pcaComponentId === pca.id && Number(servo.state.pcaChannel) === channel)
      ));
      for (const servo of servos) {
        const powered = solved.states[servo.id]?.isPowered === true;
        const signalConnected = electricalConnectivity.connected(pca.id, `PWM${channel}`, servo.id, "PWM");
        if (enabled && powered && pulseUs > 0 && signalConnected) {
          servo.state = {
            ...servo.state,
            angle: servoAngleFromPulse(pulseUs),
            isCommanded: true,
            currentDrawA: 0.65,
            lastCommandMicros: simClock.micros(),
            servoSketchInstance: "PCA9685",
            pcaComponentId: pca.id,
            pcaChannel: channel,
          };
        } else if (servo.state.pcaComponentId === pca.id && Number(servo.state.pcaChannel) === channel) {
          servo.state = { ...servo.state, isCommanded: false, currentDrawA: 0 };
        } else {
          continue;
        }
        changed = true;
      }
    }
  }
  if (changed) {
    dirty = true;
    syncActuatorJoints();
  }
}

function setRoverDrive(instanceName: string, leftSpeed: number, rightSpeed: number) {
  if (!Number.isFinite(leftSpeed) || !Number.isFinite(rightSpeed)) {
    throw new Error("Kecepatan differential drive harus berupa bilangan hingga.");
  }
  let roverId = roverBindings.get(instanceName);
  if (!roverId) {
    const assigned = new Set(roverBindings.values());
    const rover = components.find((item) => item.typeId === "rover_bot_4wd" && !assigned.has(item.id));
    if (!rover) throw new Error("Tambahkan RoverBot-4WD ke scene sebelum memakai DifferentialDrive.");
    roverId = rover.id;
    roverBindings.set(instanceName, roverId);
  }
  const rover = components.find((item) => item.id === roverId);
  if (!rover) throw new Error(`RoverBot terikat ke '${instanceName}' tidak lagi tersedia.`);
  rover.state = {
    ...rover.state,
    leftSpeed: Math.max(-0.5, Math.min(0.5, leftSpeed)),
    rightSpeed: Math.max(-0.5, Math.min(0.5, rightSpeed)),
  };
  dirty = true;
}

function integrateRoverBots() {
  const dt = simClock.stepMicros / 1_000_000;
  for (const rover of components.filter((item) => item.typeId === "rover_bot_4wd")) {
    const leftSpeed = Number(rover.state.leftSpeed ?? 0);
    const rightSpeed = Number(rover.state.rightSpeed ?? 0);
    if (leftSpeed === 0 && rightSpeed === 0) continue;
    const next = integrateDifferentialDrive(
      {
        x: Number(rover.state.x ?? 0),
        z: Number(rover.state.z ?? 0),
        heading: Number(rover.state.heading ?? 0),
        leftWheelPhase: Number(rover.state.leftWheelPhase ?? 0),
        rightWheelPhase: Number(rover.state.rightWheelPhase ?? 0),
      },
      { leftSpeed, rightSpeed },
      dt,
    );
    rover.state = { ...rover.state, ...next };
    dirty = true;
  }
}

const lcdState = {
  line0: "Nexflux Lab 3D  ",
  line1: "LCD 16x2 I2C OK ",
  cursorCol: 0,
  cursorRow: 0,
  backlight: true,
};

function updateLcdComponents() {
  const lcds = lcdDevices();
  for (const c of lcds) {
    c.state = {
      ...c.state,
      line0: lcdState.line0,
      line1: lcdState.line1,
      backlight: lcdState.backlight,
      cursorCol: lcdState.cursorCol,
      cursorRow: lcdState.cursorRow,
    };
  }
  dirty = true;
}

let wifiState = {
  connected: false,
  ssid: "",
  ip: "0.0.0.0",
  connectTime: 0,
  attempts: 0,
};
let lastHttpResponse = "";
let lastHttpCode = 0;
setInterval(() => {
  try {
    simClock.advance();
    if (runtime) {
      if (!paused) {
        physicsStepAccumulator++;
        integrateRoverBots();
        updateServoCurrentDraw();
        integrateDcMotors();
        integrateBatteries();
        integrateBatteryChargers();
        integrateBatteryChargerThermal();
        integrateDcDcConverters();
        syncA4988Inputs(false);
        integrateL298NThermal();
        integrateA4988Thermal();
        syncActuatorJoints();
        void scheduleCoupledEncoderSync().catch((error) => send({ type: "error", message: String(error) }));
      }
      if (!paused) updateBrownoutState();
      renderAccumulatorUs += SIMULATION_STEP_US;
      if (renderAccumulatorUs >= RENDER_INTERVAL_US) {
        renderAccumulatorUs -= RENDER_INTERVAL_US;
        if (physicsStepAccumulator > 0) {
          send({ type: "physics_step", count: physicsStepAccumulator });
          physicsStepAccumulator = 0;
        }
        send({ type: "frame", ...solve(), elapsed: api.millis() });
      }
      if (serialBuffer) {
        send({ type: "serial", text: serialBuffer });
        serialBuffer = "";
      }
    }
  } catch (e) {
    send({ type: "error", message: String(e) });
  }
}, SIMULATION_STEP_US / 1000);
onmessage = async (e: MessageEvent) => {
  const m = e.data;
  if (m.type === "sensor_frames") {
    sensorFrames = m.frames as SensorFrameSet;
    return;
  }
  if (m.type === "circuit") {
    const previousComponents = components;
    components = m.components.map((next: CircuitComponent) => {
      const previous = components.find((item) => item.id === next.id);
      if (!previous) return next;
      if (next.typeId === "dc_motor") {
        return {
          ...next,
          state: {
            ...next.state,
            armatureCurrentA: previous.state.armatureCurrentA,
            backEmfV: previous.state.backEmfV,
            omegaRadS: previous.state.omegaRadS,
            angleRad: previous.state.angleRad,
          },
        };
      }
      if (next.typeId === "a4988_stepper_driver") {
        return {
          ...next,
          state: {
            ...next.state,
            stepHigh: previous.state.stepHigh,
            riseMicros: previous.state.riseMicros,
            positionPulses: previous.state.positionPulses,
            angleDegrees: previous.state.angleDegrees,
          },
        };
      }
      if (next.typeId === "stepper_nema17") {
        return {
          ...next,
          state: {
            ...next.state,
            steps: previous.state.steps,
            angle: previous.state.angle,
            phaseIndex: previous.state.phaseIndex,
          },
        };
      }
      if (next.typeId === "pca9685_i2c") {
        const channelState = Object.fromEntries(Object.entries(previous.state).filter(([key]) => /^(?:pwm|pulseUs)\d+$/.test(key)));
        return {
          ...next,
          state: { ...next.state, frequencyHz: previous.state.frequencyHz ?? next.state.frequencyHz, ...channelState },
        };
      }
      if (next.typeId === "servo_sg90" && previous.state.isCommanded) {
        return {
          ...next,
          state: {
            ...next.state,
            angle: previous.state.angle,
            isCommanded: previous.state.isCommanded,
            currentDrawA: previous.state.currentDrawA,
            lastCommandMicros: previous.state.lastCommandMicros,
            servoSketchInstance: previous.state.servoSketchInstance,
            pcaComponentId: previous.state.pcaComponentId,
            pcaChannel: previous.state.pcaChannel,
          },
        };
      }
      if (next.typeId === "incremental_encoder" && next.state.coupledMotorId && next.state.coupledMotorId === previous.state.coupledMotorId) {
        return { ...next, state: { ...next.state, angle: previous.state.angle } };
      }
      return next;
    });
    wires = m.wires;
    electricalConnectivity = buildElectricalConnectivity(components, wires);
    dirty = true;
    syncA4988Inputs(false);
    syncPcaServoOutputs();
    await scheduleCoupledEncoderSync();
    const lcd = components.find((c) => c.typeId === "lcd1602_i2c");
    if (lcd && lcd.state) {
      if (typeof lcd.state.line0 === "string") lcdState.line0 = lcd.state.line0;
      if (typeof lcd.state.line1 === "string") lcdState.line1 = lcd.state.line1;
      if (typeof lcd.state.backlight === "boolean")
        lcdState.backlight = lcd.state.backlight;
    }
    const dht = components.find((c) => c.typeId === "dht11");
    if (dht && dht.state) {
      if (typeof dht.state.temperature === "number")
        dhtState.temperature = dht.state.temperature;
      if (typeof dht.state.humidity === "number")
        dhtState.humidity = dht.state.humidity;
    }
    const hcsr = components.find((c) => c.typeId === "hcsr04");
    if (hcsr && hcsr.state) {
      if (typeof hcsr.state.distance === "number")
        hcsr04State.distance = hcsr.state.distance;
    }
    dirty = true;
    await syncManualEncoderTransitions(previousComponents);
    await scheduleCoupledEncoderSync();
    syncActuatorJoints();
    await dispatchInterruptEdges();
    return;
  }
  if (m.type === "serial") {
    if (rx.length + m.bytes.length <= 4096) rx.push(...m.bytes);
    else send({ type: "warning", message: "Buffer RX penuh (4096 byte)." });
    return;
  }
  if (m.type === "external_gpio") {
    try {
      const gpioNumber = Number(m.pin);
      const mode = String(m.mode);
      const id = pin(gpioNumber);
      if (!["INPUT", "INPUT_PULLUP", "OUTPUT", "PWM"].includes(mode)) throw new Error(`Mode GPIO V-SBC tidak dikenal: ${mode}`);
      validateOutput(board().typeId, id, mode === "PWM" ? "OUTPUT" : mode);
      if (mode === "PWM") {
        const duty = Math.max(0, Math.min(100, Number(m.value) || 0));
        const pwm = pwmSignal(Math.round(duty * 255 / 100), 8, supply(), board().typeId === "esp32_wroom" || [3, 5, 6, 9, 10, 11].includes(gpioNumber));
        io[id] = { mode: "OUTPUT", value: pwm.voltage };
      } else {
        io[id] = {
          mode: mode as IO["mode"],
          value: mode === "INPUT_PULLUP" ? supply() : mode === "OUTPUT" && Number(m.value) ? supply() : 0,
        };
      }
      dirty = true;
      syncA4988Inputs(true);
      syncPcaServoOutputs();
      syncActuatorJoints();
      await scheduleCoupledEncoderSync();
      await dispatchInterruptEdges();
    } catch (error) {
      send({ type: "error", message: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  if (m.type === "pause") {
    paused = true;
    simClock.pause();
    return;
  }
  if (m.type === "resume") {
    paused = false;
    simClock.resume();
    return;
  }
  if (m.type !== "start") return;
  components = m.components;
  wires = m.wires;
  sensorFrames = (m.sensorFrames as SensorFrameSet | undefined) ?? { rgbd: {}, lidar: {}, imu: {} };
  electricalConnectivity = buildElectricalConnectivity(components, wires);
  const lcd = components.find((c) => c.typeId === "lcd1602_i2c");
  if (lcd && lcd.state) {
    lcdState.line0 =
      typeof lcd.state.line0 === "string"
        ? lcd.state.line0
        : "Nexflux Lab 3D  ";
    lcdState.line1 =
      typeof lcd.state.line1 === "string"
        ? lcd.state.line1
        : "LCD 16x2 I2C OK ";
    lcdState.backlight = lcd.state.backlight !== false;
    lcdState.cursorCol = 0;
    lcdState.cursorRow = 0;
  }
  const dht = components.find((c) => c.typeId === "dht11");
  if (dht && dht.state) {
    if (typeof dht.state.temperature === "number")
      dhtState.temperature = dht.state.temperature;
    if (typeof dht.state.humidity === "number")
      dhtState.humidity = dht.state.humidity;
  }
  const hcsr = components.find((c) => c.typeId === "hcsr04");
  if (hcsr && hcsr.state) {
    if (typeof hcsr.state.distance === "number")
      hcsr04State.distance = hcsr.state.distance;
  }
  io = {};
  servoState.clear();
  roverBindings.clear();
  interrupts.clear();
  interruptCheckPending = false;
  dispatchingInterrupts = false;
  pwmResolutionBits = 8;
  dirty = true;
  simClock.reset();
  renderAccumulatorUs = 0;
  physicsStepAccumulator = 0;
  brownoutActive = false;
  brownoutResetPending = false;
  brownoutLowDurationUs = 0;
  randomState = 0x6d2b79f5;
  i2cBus.reset();
  i2cReady = false;
  mpu6050Registers.clear();
  wifiState = {
    connected: false,
    ssid: "",
    ip: "0.0.0.0",
    connectTime: 0,
    attempts: 0,
  };
  lastHttpResponse = "";
  lastHttpCode = 0;
  runningCode = String(m.code || "");
  syncA4988Inputs(false);
  try {
    board();
    runtime = new SketchRuntime(new SketchParser(m.code), api);
    await runtime.start();
    for (;;) {
      await ready();
      if (brownoutResetPending) {
        brownoutResetPending = false;
        runtime = new SketchRuntime(new SketchParser(runningCode), api);
        await runtime.start();
      }
      await runtime.loop();
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  } catch (e) {
    send({
      type: "error",
      message: e instanceof Error ? e.message : String(e),
    });
  }
};
