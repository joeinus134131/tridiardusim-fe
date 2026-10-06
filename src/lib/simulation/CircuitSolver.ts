import { isMicrocontroller } from "../components/esp32";
import { buildElectricalConnectivity } from "./electricalConnectivity";
import { quadratureState, type QuadratureState } from "./vhal/encoder";
import { a4988CurrentLimit } from "./vhal/a4988";
import { dcMotorElectricalEquivalent, dcMotorParameters } from "./vhal/dcMotor";
import { batteryParameters } from "./vhal/battery";
import type {
  CircuitComponent,
  Wire,
  PinMode,
} from "../components/componentTypes";

export interface IO {
  mode: PinMode;
  value: number;
}
export interface CircuitResult {
  voltages: Record<string, number>;
  states: Record<string, Record<string, number | boolean | string>>;
  warnings: string[];
}
export const terminal = (id: string, pin: string) => `${id}:${pin}`;

/** Quasi-static DC nodal solver. Ideal nets, finite output impedance, piecewise LED. */
export function solveCircuit(
  components: CircuitComponent[],
  wires: Wire[],
  io: Record<string, IO>,
): CircuitResult {
  const { root, terminals, connected } = buildElectricalConnectivity(components, wires);
  const warnings = new Set<string>();
  const fixed = new Map<string, number>();
  const sources: { node: string; voltage: number; resistance: number; componentId?: string }[] = [];
  const currentLoads: { node: string; amps: number }[] = [];
  const currentInjections: { node: string; amps: number }[] = [];
  const edges: { a: string; b: string; r: number; vf: number; led?: string; diode?: string }[] =
    [];
  const node = (c: CircuitComponent, p: string) => root(terminal(c.id, p));
  const fix = (n: string, v: number) => {
    if (fixed.has(n) && Math.abs(fixed.get(n)! - v) > 0.01)
      warnings.add("Hubung singkat antar catu/GND: hasil tidak valid.");
    fixed.set(n, v);
  };
  for (const c of components) {
    if (c.typeId === "battery_pack") {
      const params = batteryParameters(c.state);
      const enabled = c.state.isOn !== false && c.state.isProtectionTripped !== true && params.socPercent > 0;
      fix(node(c, "GND"), 0);
      sources.push({
        node: node(c, "V+"),
        voltage: enabled ? params.openCircuitVoltageV : 0,
        resistance: params.internalResistanceOhms,
      });
    }
    if (c.typeId === "dc_dc_converter") {
      edges.push(
        { a: node(c, "GND_IN"), b: node(c, "GND_OUT"), r: 0.001, vf: 0 },
        { a: node(c, "VOUT"), b: node(c, "GND_OUT"), r: 1_000_000, vf: 0 },
      );
      if (c.state.isOn !== false) {
        const inputCurrentA = Math.max(0, Number(c.state.inputCurrentA) || 0);
        if (inputCurrentA > 0) currentLoads.push({ node: node(c, "VIN"), amps: inputCurrentA });
      }
    }
    if (c.typeId === "dc_supply") {
      const voltage = c.state.isOn === false ? 0 : Math.max(0, Math.min(24, Number(c.state.voltage) || 0));
      fix(node(c, "GND"), 0);
      fix(node(c, "V+"), voltage);
    }
    if (isMicrocontroller(c.typeId)) {
      fix(node(c, "GND1"), 0);
      const battery5v = components.find((source) => source.typeId === "battery_pack" && connected(c.id, "5V", source.id, "V+"));
      const battery3v3 = components.find((source) => source.typeId === "battery_pack" && connected(c.id, "3V3", source.id, "V+"));
      const supplyOnRail = (pinId: string) => components.find((source) =>
        (source.typeId === "dc_supply" && connected(c.id, pinId, source.id, "V+")) ||
        (source.typeId === "dc_dc_converter" && connected(c.id, pinId, source.id, "VOUT")),
      );
      const supply5v = supplyOnRail("5V");
      const supply3v3 = supplyOnRail("3V3");
      const externallyPowered5V = Boolean(battery5v || supply5v);
      const externallyPowered3V3 = Boolean(battery3v3 || supply3v3);
      const railSupplyVoltage = (source: CircuitComponent | undefined) => {
        if (!source) return undefined;
        if (source.typeId === "dc_supply") return source.state.isOn === false ? 0 : Number(source.state.voltage) || 0;
        return Number(source.state.outputVoltage) || 0;
      };
      const pinSupplyVoltage = battery5v
        ? batteryParameters(battery5v.state).openCircuitVoltageV
        : supply5v
          ? railSupplyVoltage(supply5v)!
        : battery3v3
          ? batteryParameters(battery3v3.state).openCircuitVoltageV
          : supply3v3
            ? railSupplyVoltage(supply3v3)!
            : c.typeId === "esp32_wroom" ? 3.3 : 5;
      if (!externallyPowered5V) fix(node(c, "5V"), 5);
      if (!externallyPowered3V3) fix(node(c, "3V3"), 3.3);
      for (const p of c.pins) {
        const pin = io[p.id];
        if (pin?.mode === "OUTPUT")
          sources.push({
            node: node(c, p.id),
            voltage: Math.min(pin.value, pinSupplyVoltage),
            resistance: 25,
          });
        else if (pin?.mode === "INPUT_PULLUP")
          sources.push({ node: node(c, p.id), voltage: pinSupplyVoltage, resistance: 30000 });
      }
    }
    if (c.typeId === "plc_omron_cp1e") {
      // The compact simulation exposes the CP1E's 24 V control supply. Relay
      // outputs are dry contacts and therefore bridge COMQ only when active.
      fix(node(c, "0V"), 0);
      fix(node(c, "24V"), 24);
      const outputMask = Number(c.state.outputMask || 0);
      for (let i = 0; i < 8; i++) {
        if (outputMask & (1 << i)) {
          edges.push({ a: node(c, "COMQ"), b: node(c, `Y${i}`), r: 0.05, vf: 0 });
        }
      }
    }
    if (c.typeId === "resistor_220")
      edges.push({
        a: node(c, "L"),
        b: node(c, "R"),
        r: Math.max(1, Number(c.state.resistance) || 220),
        vf: 0,
      });
    if (c.typeId === "potentiometer") {
      const v = Math.max(0, Math.min(1, Number(c.state.value) || 0));
      edges.push(
        {
          a: node(c, "1"),
          b: node(c, "W"),
          r: Math.max(1, 10000 * (1 - v)),
          vf: 0,
        },
        { a: node(c, "W"), b: node(c, "2"), r: Math.max(1, 10000 * v), vf: 0 },
      );
    }
    if (c.typeId === "led_red")
      edges.push({
        a: node(c, "A"),
        b: node(c, "C"),
        r: 10,
        vf: 1.8,
        led: c.id,
      });
    if (c.typeId === "oled_ssd1306")
      edges.push({
        a: node(c, "VCC"),
        b: node(c, "GND"),
        r: 220,
        vf: 0,
      });
    if (c.typeId === "pca9685_i2c") {
      edges.push(
        { a: node(c, "VCC"), b: node(c, "GND"), r: 660, vf: 0 },
        { a: node(c, "VCC"), b: node(c, "OE"), r: 10_000, vf: 0 },
        // The external servo rail is separate from logic VCC, but J1 and both
        // six-pin pass-through headers share the same V+ and GND copper planes.
        { a: node(c, "SERVO_V+"), b: node(c, "V+"), r: 0.001, vf: 0 },
        { a: node(c, "SERVO_GND"), b: node(c, "GND"), r: 0.001, vf: 0 },
      );
      for (let channel = 0; channel < 16; channel++) {
        edges.push(
          { a: node(c, "SERVO_V+"), b: node(c, `V+_PWM${channel}`), r: 0.01, vf: 0 },
          { a: node(c, "SERVO_GND"), b: node(c, `GND_PWM${channel}`), r: 0.01, vf: 0 },
        );
      }
    }
    if (c.typeId === "servo_sg90")
      edges.push({
        a: node(c, "VCC"),
        b: node(c, "GND"),
        r: 100,
        vf: 0,
      });
    if (c.typeId === "servo_sg90" && c.state.isCommanded === true) {
      const hasSupply = components.some((source) => {
        if (source.typeId === "battery_pack" || source.typeId === "dc_supply")
          return connected(c.id, "VCC", source.id, "V+");
        if (isMicrocontroller(source.typeId))
          return connected(c.id, "VCC", source.id, source.typeId === "esp32_wroom" ? "3V3" : "5V");
        return false;
      });
      const currentA = Math.max(0, Number(c.state.currentDrawA) || 0);
      if (hasSupply && currentA > 0) currentLoads.push({ node: node(c, "VCC"), amps: currentA });
    }
    if (c.typeId === "incremental_encoder") {
      edges.push({ a: node(c, "VCC"), b: node(c, "GND"), r: 1000, vf: 0 });
      if (c.state.isPressed === true) {
        // KY-040 push switch is normally open and shorts SW to ground while held.
        edges.push({ a: node(c, "SW"), b: node(c, "GND"), r: 0.05, vf: 0 });
      }
    }
    if (c.typeId === "a4988_stepper_driver") {
      edges.push(
        { a: node(c, "VDD"), b: node(c, "GND_LOGIC"), r: 10000, vf: 0 },
        { a: node(c, "VMOT"), b: node(c, "GND_MOTOR"), r: 10000, vf: 0 },
      );
    }
    if (c.typeId === "stepper_nema17") {
      // SY42STH38-class bipolar winding: 1.65 ohm per phase.
      edges.push(
        { a: node(c, "A+"), b: node(c, "A-"), r: 1.65, vf: 0 },
        { a: node(c, "B+"), b: node(c, "B-"), r: 1.65, vf: 0 },
      );
    }
    if (c.typeId === "dc_motor") {
      const params = dcMotorParameters(c.state);
      const equivalent = dcMotorElectricalEquivalent({
        armatureCurrentA: Number(c.state.armatureCurrentA) || 0,
        backEmfV: Number(c.state.backEmfV) || 0,
        omegaRadS: Number(c.state.omegaRadS) || 0,
        angleRad: Number(c.state.angleRad) || 0,
      }, params, 0.005);
      edges.push({ a: node(c, "M+"), b: node(c, "M-"), r: equivalent.resistanceOhms, vf: equivalent.voltageOffsetV });
    }
    if (c.typeId === "lcd1602_i2c")
      edges.push({
        a: node(c, "VCC"),
        b: node(c, "GND"),
        r: 160,
        vf: 0,
      });
    if (c.typeId === "dht11")
      edges.push({
        a: node(c, "VCC"),
        b: node(c, "GND"),
        r: 2500,
        vf: 0,
      });
    if (c.typeId === "hcsr04")
      edges.push({
        a: node(c, "VCC"),
        b: node(c, "GND"),
        r: 330,
        vf: 0,
      });
    if (c.typeId === "capacitor_universal") {
      const cap = Math.max(1e-12, Number(c.state.capacitance) || 470e-6);
      const dt = 0.005; // 5ms quasi-static integration step
      const rCap = dt / cap;
      const esr = Math.max(0.01, Number(c.state.esr) || 0.1);
      const rTotal = esr + rCap;
      const vPrev = Number(c.state.voltage) || 0;
      const vf = vPrev * (rCap / rTotal);
      edges.push({
        a: node(c, "A"),
        b: node(c, "C"),
        r: Math.max(0.05, rTotal),
        vf,
      });
    }
  }
  const encoderSignals = new Map<string, { powered: boolean; signal: QuadratureState }>();
  for (const c of components.filter((item) => item.typeId === "incremental_encoder")) {
    const vcc = fixed.get(node(c, "VCC")) ?? 0;
    const gnd = fixed.get(node(c, "GND")) ?? 0;
    const powered = vcc - gnd >= 2.7;
    const requestedPpr = Math.trunc(Number(c.state.pulsesPerRevolution) || 100);
    const ppr = Math.max(1, Math.min(100_000, requestedPpr));
    const signal = quadratureState(Number(c.state.angle) || 0, ppr);
    encoderSignals.set(c.id, { powered, signal });
    if (powered) {
      const logicVoltage = vcc >= 4.5 ? 5 : Math.max(0, vcc);
      sources.push({ node: node(c, "A"), voltage: signal.channelA ? logicVoltage : 0, resistance: 50 });
      sources.push({ node: node(c, "B"), voltage: signal.channelB ? logicVoltage : 0, resistance: 50 });
      // The KY-040 SW output has an onboard pull-up and is shorted to GND while pressed.
      sources.push({ node: node(c, "SW"), voltage: logicVoltage, resistance: 10_000 });
    }
  }
  const driverMotors = new Map<string, CircuitComponent>();
  for (const driver of components.filter((item) => item.typeId === "a4988_stepper_driver")) {
    const motor = components.find((item) => item.typeId === "stepper_nema17" &&
      connected(driver.id, "1A", item.id, "A+") &&
      connected(driver.id, "1B", item.id, "A-") &&
      connected(driver.id, "2A", item.id, "B+") &&
      connected(driver.id, "2B", item.id, "B-"));
    if (motor) driverMotors.set(driver.id, motor);
    if (!motor || driver.state.isEnabled !== true || driver.state.isMotorPowered !== true ||
      driver.state.isThermalShutdown === true || driver.state.isOvercurrentFault === true) continue;
    const vmotBattery = components.find((source) => source.typeId === "battery_pack" && connected(driver.id, "VMOT", source.id, "V+"));
    const vmotBatteryParams = vmotBattery ? batteryParameters(vmotBattery.state) : undefined;
    const vmotNode = node(driver, "VMOT");
    const priorLoadA = currentLoads.filter((load) => load.node === vmotNode).reduce((sum, load) => sum + load.amps, 0);
    const vmot = fixed.get(vmotNode) ?? (vmotBatteryParams && vmotBattery?.state.isOn !== false
      ? Math.max(0, vmotBatteryParams.openCircuitVoltageV - vmotBatteryParams.internalResistanceOhms * priorLoadA)
      : 0);
    const ground = fixed.get(node(driver, "GND_MOTOR")) ?? 0;
    const limit = Math.min(2, a4988CurrentLimit(Number(driver.state.vref) || 0, Number(driver.state.senseResistance) || 0.1));
    const electricalAngle = Number(driver.state.angleDegrees || 0) * Math.PI / 180 * 50;
    const resolution = Number(driver.state.microstepResolution) || 1;
    const phase = Number(driver.state.positionPulses || 0) / resolution;
    const ia = resolution === 1
      ? [1, -1, -1, 1][((Math.round(phase) % 4) + 4) % 4] * limit
      : Math.sin(electricalAngle) * limit;
    const ib = resolution === 1
      ? [1, 1, -1, -1][((Math.round(phase) % 4) + 4) % 4] * limit
      : Math.cos(electricalAngle) * limit;
    const coilVoltageA = Math.max(-vmot, Math.min(vmot, ia * 1.65));
    const coilVoltageB = Math.max(-vmot, Math.min(vmot, ib * 1.65));
    if (vmotBatteryParams && vmot > 0) {
      const inputCurrentA = (Math.abs(coilVoltageA * ia) + Math.abs(coilVoltageB * ib)) / vmot;
      if (inputCurrentA > 0) currentLoads.push({ node: vmotNode, amps: inputCurrentA });
    }
    const common = ground + Math.max(0, vmot - ground) / 2;
    for (const [pinId, voltage] of [["1A", common + coilVoltageA / 2], ["1B", common - coilVoltageA / 2], ["2A", common + coilVoltageB / 2], ["2B", common - coilVoltageB / 2]] as const) {
      sources.push({ node: node(driver, pinId), voltage, resistance: 0.005 });
    }
  }
  const dcMotorDriverById = new Map<string, { driver: CircuitComponent; channel: "A" | "B" }>();
  const driverChannels = new Map<string, { motorA?: CircuitComponent; motorB?: CircuitComponent; logicPowered: boolean; motorPowered: boolean; thermalShutdown: boolean }>();
  const converterParameters = new Map<string, {
    inputVoltageV: number;
    targetVoltageV: number;
    efficiency: number;
    outputResistanceOhms: number;
    maxOutputCurrentA: number;
    isOn: boolean;
  }>();
  const chargerParameters = new Map<string, { inputVoltageV: number; chargeCurrentA: number; targetVoltageV: number; isCharging: boolean; isConstantVoltage: boolean; isChargeComplete: boolean; isSafetyTimerExpired: boolean; chargeElapsedSeconds: number; safetyTimerLimitSeconds: number; tailCurrentLimitA: number; isBalancing: boolean; balanceCurrentA: number; balanceCellIndex: 1 | 2; cellDeltaVoltageV: number; efficiency: number; powerLossW: number; isReverseConnected: boolean; isThermalShutdown: boolean }>();
  const sourceVoltageAt = (target: string) => {
    const n = root(target);
    if (fixed.has(n)) return fixed.get(n)!;
    return [...sources].reverse().find((source) => source.node === n)?.voltage ?? 0;
  };
  for (const charger of components.filter((item) => item.typeId === "battery_charger")) {
    const battery = components.find((item) => item.typeId === "battery_pack" && connected(charger.id, "BAT+", item.id, "V+") && connected(charger.id, "BAT-", item.id, "GND"));
    const reverseBattery = components.some((item) => item.typeId === "battery_pack" && connected(charger.id, "BAT+", item.id, "GND") && connected(charger.id, "BAT-", item.id, "V+"));
    const inputVoltageV = sourceVoltageAt(terminal(charger.id, "VIN")) - sourceVoltageAt(terminal(charger.id, "GND_IN"));
    const efficiency = Math.max(0.5, Math.min(1, Number(charger.state.efficiency) || 0.9));
    const maxChargeCurrentA = Math.max(0.05, Math.min(5, Number(charger.state.maxChargeCurrentA) || 0.5));
    const batteryParams = battery ? batteryParameters(battery.state) : undefined;
    const targetVoltageV = battery?.state.profile === "lipo_2s" ? 8.4 : 4.2;
    const isReverseConnected = reverseBattery || inputVoltageV < -0.1;
    const isThermalShutdown = charger.state.isThermalShutdown === true;
    const isSafetyTimerExpired = charger.state.isSafetyTimerExpired === true;
    const chargeElapsedSeconds = Math.max(0, Number(charger.state.chargeElapsedSeconds) || 0);
    const safetyTimerLimitSeconds = Math.max(60, Math.min(24 * 60 * 60, Number(charger.state.safetyTimerLimitSeconds) || 10 * 60 * 60));
    const chargeConditions = charger.state.isOn !== false && !isSafetyTimerExpired && !isReverseConnected && !isThermalShutdown && inputVoltageV >= targetVoltageV + 0.5 && inputVoltageV <= 24 && battery !== undefined && battery.state.profile !== "alkaline_9v" && battery.state.isOn !== false && battery.state.isProtectionTripped !== true;
    const packCvCurrentA = batteryParams ? Math.max(0, (targetVoltageV - batteryParams.openCircuitVoltageV) / batteryParams.internalResistanceOhms) : 0;
    const cellDeltaVoltageV = battery?.state.profile === "lipo_2s" && batteryParams
      ? batteryParams.cell1OpenCircuitVoltageV - batteryParams.cell2OpenCircuitVoltageV
      : 0;
    const isBalancing = Boolean(chargeConditions && battery?.state.profile === "lipo_2s" && Math.abs(cellDeltaVoltageV) >= 0.03);
    const balanceCurrentA = isBalancing ? 0.05 : 0;
    const balanceCellIndex: 1 | 2 = cellDeltaVoltageV >= 0 ? 1 : 2;
    const highCellVoltageV = Math.max(batteryParams?.cell1OpenCircuitVoltageV ?? 0, batteryParams?.cell2OpenCircuitVoltageV ?? 0);
    const cellHeadroomCurrentA = battery?.state.profile === "lipo_2s" && batteryParams
      ? Math.max(0, (4.2 - highCellVoltageV) / Math.max(0.0025, batteryParams.internalResistanceOhms / 2)) + balanceCurrentA
      : packCvCurrentA;
    const cvCurrentA = Math.min(packCvCurrentA, cellHeadroomCurrentA);
    const tailCurrentLimitA = batteryParams ? Math.max(0.02, batteryParams.capacityAh * 0.05) : 0;
    const belowRechargeThreshold = (batteryParams?.socPercent ?? 100) < 98;
    const wasChargeComplete = charger.state.isChargeComplete === true && !belowRechargeThreshold && charger.state.isOn !== false && !isBalancing;
    const isConstantVoltageCandidate = cvCurrentA < maxChargeCurrentA;
    const reachedTailCurrent = chargeConditions && !isBalancing && isConstantVoltageCandidate && cvCurrentA <= tailCurrentLimitA;
    const isChargeComplete = Boolean(chargeConditions && ((batteryParams?.socPercent ?? 0) >= 100 || wasChargeComplete || reachedTailCurrent));
    const allowed = chargeConditions && !isChargeComplete && (batteryParams?.socPercent ?? 100) < 100;
    const chargeCurrentA = allowed ? Math.min(maxChargeCurrentA, cvCurrentA) : 0;
    const isConstantVoltage = allowed && cvCurrentA < maxChargeCurrentA;
    const batteryNode = battery ? node(battery, "V+") : undefined;
    if (batteryNode && chargeCurrentA > 0) {
      currentInjections.push({ node: batteryNode, amps: chargeCurrentA });
      const inputCurrentA = targetVoltageV * chargeCurrentA / Math.max(0.1, inputVoltageV * efficiency) + 0.002;
      currentLoads.push({ node: node(charger, "VIN"), amps: inputCurrentA });
    }
    const powerLossW = chargeCurrentA > 0 ? targetVoltageV * chargeCurrentA * (1 / efficiency - 1) : 0;
    chargerParameters.set(charger.id, { inputVoltageV, chargeCurrentA, targetVoltageV, isCharging: chargeCurrentA > 0, isConstantVoltage, isChargeComplete, isSafetyTimerExpired, chargeElapsedSeconds, safetyTimerLimitSeconds, tailCurrentLimitA, isBalancing, balanceCurrentA, balanceCellIndex, cellDeltaVoltageV, efficiency, powerLossW, isReverseConnected, isThermalShutdown });
  }
  for (const driver of components.filter((item) => item.typeId === "l298n_dual_hbridge")) {
    const findMotor = (outHigh: string, outLow: string) => components.find((motor) =>
      motor.typeId === "dc_motor" && (
        (connected(driver.id, outHigh, motor.id, "M+") && connected(driver.id, outLow, motor.id, "M-")) ||
        (connected(driver.id, outHigh, motor.id, "M-") && connected(driver.id, outLow, motor.id, "M+"))
      ),
    );
    const motorA = findMotor("OUT1", "OUT2");
    const motorB = findMotor("OUT3", "OUT4");
    if (motorA && !dcMotorDriverById.has(motorA.id)) dcMotorDriverById.set(motorA.id, { driver, channel: "A" });
    if (motorB && !dcMotorDriverById.has(motorB.id)) dcMotorDriverById.set(motorB.id, { driver, channel: "B" });

    const ground = sourceVoltageAt(terminal(driver.id, "GND"));
    const logicVoltage = sourceVoltageAt(terminal(driver.id, "VSS")) - ground;
    const channelConfig = [
      { channel: "A" as const, enable: "ENA", in1: "IN1", in2: "IN2", out1: "OUT1", out2: "OUT2", motor: motorA },
      { channel: "B" as const, enable: "ENB", in1: "IN3", in2: "IN4", out1: "OUT3", out2: "OUT4", motor: motorB },
    ];
    const logicPowered = logicVoltage >= 4.5;
    const anticipatedDrawA = channelConfig.reduce((sum, channel) => {
      if (!channel.motor || !logicPowered) return sum;
      const duty = Math.max(0, Math.min(1, sourceVoltageAt(terminal(driver.id, channel.enable)) / logicVoltage));
      return sum + Math.abs(Number(channel.motor.state.armatureCurrentA) || 0) * duty;
    }, 0);
    const battery = components.find((source) => source.typeId === "battery_pack" && connected(driver.id, "VS", source.id, "V+"));
    const batteryParams = battery ? batteryParameters(battery.state) : undefined;
    const priorLoadA = currentLoads.filter((load) => load.node === node(driver, "VS")).reduce((sum, load) => sum + load.amps, 0);
    const nominalSupplyVoltage = sourceVoltageAt(terminal(driver.id, "VS")) - ground;
    const supplyVoltage = batteryParams && battery?.state.isOn !== false
      ? Math.max(0, batteryParams.openCircuitVoltageV - batteryParams.internalResistanceOhms * (priorLoadA + anticipatedDrawA))
      : nominalSupplyVoltage;
    const motorSupplyPowered = supplyVoltage >= 2.5;
    const thermalShutdown = driver.state.isThermalShutdown === true;
    const motorPowered = motorSupplyPowered && !thermalShutdown;
    for (const outputPin of ["OUT1", "OUT2", "OUT3", "OUT4"]) {
      edges.push(
        { a: node(driver, "GND"), b: node(driver, outputPin), r: 0.08, vf: 0.7, diode: `${driver.id}:${outputPin}:low-clamp` },
        { a: node(driver, outputPin), b: node(driver, "VS"), r: 0.08, vf: 0.7, diode: `${driver.id}:${outputPin}:high-clamp` },
      );
    }
    for (const channel of channelConfig) {
      const duty = logicPowered ? Math.max(0, Math.min(1, sourceVoltageAt(terminal(driver.id, channel.enable)) / logicVoltage)) : 0;
      const in1 = logicPowered && sourceVoltageAt(terminal(driver.id, channel.in1)) >= logicVoltage / 2;
      const in2 = logicPowered && sourceVoltageAt(terminal(driver.id, channel.in2)) >= logicVoltage / 2;
      if (motorPowered && logicPowered && duty > 0) {
        const high = ground + supplyVoltage - 1;
        const low = ground + 1;
        const level1 = in1 === in2 ? (in1 ? high : low) : in1 ? high : low;
        const level2 = in1 === in2 ? level1 : in2 ? high : low;
        sources.push(
          { node: node(driver, channel.out1), voltage: ground + (level1 - ground) * duty, resistance: 0.12 },
          { node: node(driver, channel.out2), voltage: ground + (level2 - ground) * duty, resistance: 0.12 },
        );
        if (channel.motor) {
          const windingCurrentA = Math.abs(Number(channel.motor.state.armatureCurrentA) || 0);
          if (windingCurrentA > 0) currentLoads.push({ node: node(driver, "VS"), amps: windingCurrentA * duty });
        }
      }
    }
    driverChannels.set(driver.id, { motorA, motorB, logicPowered, motorPowered: motorSupplyPowered, thermalShutdown });
  }
  for (const converter of components.filter((item) => item.typeId === "dc_dc_converter")) {
    const inputNode = node(converter, "VIN");
    const priorInputCurrentA = currentLoads.filter((load) => root(load.node) === inputNode).reduce((sum, load) => sum + load.amps, 0);
    const battery = components.find((source) => source.typeId === "battery_pack" && connected(converter.id, "VIN", source.id, "V+"));
    const batteryParams = battery ? batteryParameters(battery.state) : undefined;
    const inputVoltageV = batteryParams
      ? Math.max(0, batteryParams.openCircuitVoltageV - batteryParams.internalResistanceOhms * priorInputCurrentA)
      : sourceVoltageAt(terminal(converter.id, "VIN")) - sourceVoltageAt(terminal(converter.id, "GND_IN"));
    const targetVoltageV = Math.max(3, Math.min(15, Number(converter.state.outputVoltage) || 5));
    const efficiency = Math.max(0.5, Math.min(1, Number(converter.state.efficiency) || 0.9));
    const outputResistanceOhms = Math.max(0.005, Math.min(1, Number(converter.state.outputResistanceOhms) || 0.05));
    const maxOutputCurrentA = Math.max(0.1, Math.min(10, Number(converter.state.maxOutputCurrentA) || 2));
    const isOn = converter.state.isOn !== false;
    const inRange = inputVoltageV >= 4.5 && inputVoltageV <= 40 && inputVoltageV >= targetVoltageV + 1.5;
    converterParameters.set(converter.id, { inputVoltageV, targetVoltageV, efficiency, outputResistanceOhms, maxOutputCurrentA, isOn: isOn && inRange });
    if (isOn && inRange) {
      sources.push({
        node: node(converter, "VOUT"),
        voltage: targetVoltageV,
        resistance: outputResistanceOhms,
        componentId: converter.id,
      });
    }
  }
  // Only solve electrically active nets; unused breadboard holes cost no matrix rows.
  const active = new Set([
    ...fixed.keys(),
    ...sources.map((s) => s.node),
    ...currentLoads.map((load) => load.node),
    ...currentInjections.map((source) => source.node),
    ...edges.flatMap((e) => [e.a, e.b]),
  ]);
  const unknown = [...active].filter((n) => !fixed.has(n));
  if (unknown.length > 256)
    throw new Error("Batas solver: 256 net aktif. Kurangi rangkaian.");
  const index = new Map(unknown.map((n, i) => [n, i]));
  const voltage = new Map(fixed);
  for (const n of unknown) voltage.set(n, 0);
  let enabled = new Set<string>();
  let currentLimited = new Set<string>();
  let converged = false;
  for (let iteration = 0; iteration < 40; iteration++) {
    const n = unknown.length;
    const a = Array.from({ length: n }, () => new Float64Array(n + 1));
    for (let i = 0; i < n; i++) a[i][i] = 1e-10; // deterministic floating-net reference
    const stamp = (
      x: string,
      y: string | undefined,
      g: number,
      offset: number,
    ) => {
      const i = index.get(x);
      if (i === undefined) return;
      a[i][i] += g;
      a[i][n] += g * offset;
      if (y !== undefined) {
        const j = index.get(y);
        if (j !== undefined) a[i][j] -= g;
        else a[i][n] += g * (fixed.get(y) || 0);
      }
    };
    for (const s of sources) {
      if (s.componentId && currentLimited.has(s.componentId)) continue;
      stamp(s.node, undefined, 1 / s.resistance, s.voltage);
    }
    for (const load of currentLoads) {
      const row = index.get(load.node);
      if (row !== undefined) a[row][n] -= load.amps;
    }
    for (const source of currentInjections) {
      const row = index.get(source.node);
      if (row !== undefined) a[row][n] += source.amps;
    }
    for (const id of currentLimited) {
      const converter = components.find((item) => item.id === id && item.typeId === "dc_dc_converter");
      const row = converter ? index.get(node(converter, "VOUT")) : undefined;
      const parameters = converterParameters.get(id);
      if (row !== undefined && parameters?.isOn) a[row][n] += parameters.maxOutputCurrentA;
    }
    for (const e of edges) {
      const switchId = e.led || e.diode;
      if (switchId && !enabled.has(switchId)) continue;
      stamp(e.a, e.b, 1 / e.r, e.vf);
      stamp(e.b, e.a, 1 / e.r, -e.vf);
    }
    for (let k = 0; k < n; k++) {
      let pivot = k;
      for (let i = k + 1; i < n; i++)
        if (Math.abs(a[i][k]) > Math.abs(a[pivot][k])) pivot = i;
      [a[k], a[pivot]] = [a[pivot], a[k]];
      const d = a[k][k];
      if (Math.abs(d) < 1e-15) continue;
      for (let j = k; j <= n; j++) a[k][j] /= d;
      for (let i = k + 1; i < n; i++) {
        const f = a[i][k];
        if (!f) continue;
        for (let j = k; j <= n; j++) a[i][j] -= f * a[k][j];
      }
    }
    for (let i = n - 1; i >= 0; i--) {
      let v = a[i][n];
      for (let j = i + 1; j < n; j++)
        v -= a[i][j] * (voltage.get(unknown[j]) || 0);
      voltage.set(unknown[i], v);
    }
    const next = new Set<string>();
    for (const e of edges) {
      const switchId = e.led || e.diode;
      if (switchId && (voltage.get(e.a)! - voltage.get(e.b)! > e.vf + 1e-7 || (enabled.has(switchId) && voltage.get(e.a)! - voltage.get(e.b)! >= e.vf - 1e-7)))
        next.add(switchId);
    }
    const nextCurrentLimited = new Set(currentLimited);
    for (const converter of components.filter((item) => item.typeId === "dc_dc_converter")) {
      const parameters = converterParameters.get(converter.id);
      if (!parameters?.isOn) continue;
      const outputV = (voltage.get(node(converter, "VOUT")) || 0) - (voltage.get(node(converter, "GND_OUT")) || 0);
      const cvCurrentA = Math.max(0, (parameters.targetVoltageV - outputV) / parameters.outputResistanceOhms);
      if (!currentLimited.has(converter.id) && cvCurrentA > parameters.maxOutputCurrentA + 1e-5)
        nextCurrentLimited.add(converter.id);
      else if (currentLimited.has(converter.id) && cvCurrentA < parameters.maxOutputCurrentA - 0.02)
        nextCurrentLimited.delete(converter.id);
    }
    const diodeModesStable = [...next].every((x) => enabled.has(x)) && next.size === enabled.size;
    const converterModesStable = [...nextCurrentLimited].every((x) => currentLimited.has(x)) && nextCurrentLimited.size === currentLimited.size;
    if (diodeModesStable && converterModesStable) {
      converged = true;
      break;
    }
    enabled = next;
    currentLimited = nextCurrentLimited;
  }
  if (!converged)
    warnings.add("Solver diode/regulator nonlinier tidak konvergen; sederhanakan rangkaian.");
  for (const s of sources)
    if (
      s.resistance === 25 &&
      Math.abs((s.voltage - (voltage.get(s.node) || 0)) / 25) > 0.02
    )
      warnings.add(
        "Arus pin melebihi 20 mA; periksa resistor atau hubung singkat.",
      );
  const states: CircuitResult["states"] = {};
  const solvedMotorCurrent = (motor: CircuitComponent) => {
    const params = dcMotorParameters(motor.state);
    const equivalent = dcMotorElectricalEquivalent({
      armatureCurrentA: Number(motor.state.armatureCurrentA) || 0,
      backEmfV: Number(motor.state.backEmfV) || 0,
      omegaRadS: Number(motor.state.omegaRadS) || 0,
      angleRad: Number(motor.state.angleRad) || 0,
    }, params, 0.005);
    const terminalVoltage = (voltage.get(node(motor, "M+")) || 0) - (voltage.get(node(motor, "M-")) || 0);
    return (terminalVoltage - equivalent.voltageOffsetV) / equivalent.resistanceOhms;
  };
  for (const c of components) {
    if (c.typeId === "battery_pack") {
      const params = batteryParameters(c.state);
      const terminalVoltageV = (voltage.get(node(c, "V+")) || 0) - (voltage.get(node(c, "GND")) || 0);
      const balancingCharger = c.state.profile === "lipo_2s"
        ? components.find((item) => item.typeId === "battery_charger" && connected(item.id, "BAT+", c.id, "V+") && connected(item.id, "BAT-", c.id, "GND"))
        : undefined;
      const balancing = balancingCharger ? chargerParameters.get(balancingCharger.id) : undefined;
      const isProtectionTripped = c.state.isProtectionTripped === true;
      const isOn = c.state.isOn !== false && !isProtectionTripped && params.socPercent > 0;
      const currentA = isOn ? (params.openCircuitVoltageV - terminalVoltageV) / params.internalResistanceOhms : 0;
      states[c.id] = {
        ...c.state,
        isOn,
        socPercent: params.socPercent,
        cell1SocPercent: params.cell1SocPercent,
        cell2SocPercent: params.cell2SocPercent,
        cell1OpenCircuitVoltageV: Number(params.cell1OpenCircuitVoltageV.toFixed(3)),
        cell2OpenCircuitVoltageV: Number(params.cell2OpenCircuitVoltageV.toFixed(3)),
        cellDeltaVoltageV: Number((params.cell1OpenCircuitVoltageV - params.cell2OpenCircuitVoltageV).toFixed(3)),
        isBalancing: balancing?.isBalancing ?? false,
        balanceCurrentA: balancing?.balanceCurrentA ?? 0,
        balanceCellIndex: balancing?.balanceCellIndex ?? 1,
        openCircuitVoltageV: Number(params.openCircuitVoltageV.toFixed(3)),
        terminalVoltageV: Number(terminalVoltageV.toFixed(3)),
        internalResistanceOhms: Number(params.internalResistanceOhms.toFixed(3)),
        capacityAh: params.capacityAh,
        maxDischargeCurrentA: params.maxDischargeCurrentA,
        isProtectionTripped,
        protectionResetRequired: isProtectionTripped,
        currentA: Number(currentA.toFixed(4)),
        powerW: Number((terminalVoltageV * currentA).toFixed(3)),
      };
      if (isProtectionTripped) warnings.add(`${c.name}: proteksi arus pack aktif; reset pack diperlukan.`);
    }
    if (c.typeId === "dc_dc_converter") {
      const parameters = converterParameters.get(c.id)!;
      const inputVoltageV = (voltage.get(node(c, "VIN")) || 0) - (voltage.get(node(c, "GND_IN")) || 0);
      const outputVoltageV = (voltage.get(node(c, "VOUT")) || 0) - (voltage.get(node(c, "GND_OUT")) || 0);
      const isRegulating = parameters.isOn && inputVoltageV >= 4.5 && inputVoltageV <= 40 && inputVoltageV >= parameters.targetVoltageV + 1.5;
      const isCurrentLimited = isRegulating && currentLimited.has(c.id);
      const outputCurrentA = !isRegulating ? 0 : isCurrentLimited
        ? parameters.maxOutputCurrentA
        : Math.max(0, (parameters.targetVoltageV - outputVoltageV) / parameters.outputResistanceOhms);
      const inputCurrentA = isRegulating
        ? Math.max(0, outputVoltageV * outputCurrentA / Math.max(0.1, inputVoltageV * parameters.efficiency)) + 0.003
        : 0;
      const outputPowerW = Math.max(0, outputVoltageV * outputCurrentA);
      const inputPowerW = Math.max(0, inputVoltageV * inputCurrentA);
      states[c.id] = {
        ...c.state,
        inputVoltageV: Number(inputVoltageV.toFixed(3)),
        outputVoltageV: Number(outputVoltageV.toFixed(3)),
        inputCurrentA: Number(inputCurrentA.toFixed(4)),
        outputCurrentA: Number(outputCurrentA.toFixed(4)),
        powerLossW: Number(Math.max(0, inputPowerW - outputPowerW).toFixed(3)),
        isRegulating,
        isCurrentLimited,
      };
      if (isCurrentLimited)
        warnings.add(`${c.name}: batas arus keluaran ${parameters.maxOutputCurrentA.toFixed(2)} A aktif; tegangan rail turun untuk melindungi regulator.`);
      if (c.state.isOn !== false && !isRegulating)
        warnings.add(`${c.name}: LM2596 memerlukan VIN 4.5–40 V dan setidaknya 1.5 V di atas setelan keluaran pada model kuasistatik ini.`);
      if (outputVoltageV > parameters.targetVoltageV * 1.05)
        warnings.add(`${c.name}: tegangan keluaran melebihi setelan; periksa kemungkinan backfeed dari sumber lain.`);
    }
    if (c.typeId === "edu_arm_3dof" || c.typeId === "aero_arm_6dof") states[c.id] = { ...c.state };
    if (c.typeId === "rover_bot_4wd") states[c.id] = { ...c.state };
    if (c.typeId === "a4988_stepper_driver") {
      const logicVoltage = (voltage.get(node(c, "VDD")) || 0) - (voltage.get(node(c, "GND_LOGIC")) || 0);
      const motorVoltage = (voltage.get(node(c, "VMOT")) || 0) - (voltage.get(node(c, "GND_MOTOR")) || 0);
      const currentLimitA = Math.min(2, a4988CurrentLimit(Number(c.state.vref) || 0, Number(c.state.senseResistance) || 0.1));
      const motor = driverMotors.get(c.id);
      const outputsActive = c.state.isEnabled === true && c.state.isMotorPowered === true &&
        c.state.isThermalShutdown !== true && c.state.isOvercurrentFault !== true;
      const phaseACurrentA = motor && outputsActive
        ? ((voltage.get(node(c, "1A")) || 0) - (voltage.get(node(c, "1B")) || 0)) / 1.65 : 0;
      const phaseBCurrentA = motor && outputsActive
        ? ((voltage.get(node(c, "2A")) || 0) - (voltage.get(node(c, "2B")) || 0)) / 1.65 : 0;
      const powerLossW = outputsActive
        ? (phaseACurrentA ** 2 + phaseBCurrentA ** 2) * 0.86
        : 0;
      const configuredCurrentLimitA = a4988CurrentLimit(Number(c.state.vref) || 0, Number(c.state.senseResistance) || 0.1);
      states[c.id] = {
        ...c.state,
        isLogicPowered: logicVoltage >= 3 && c.state.isUvlo !== true,
        isMotorPowered: motorVoltage >= 8,
        isThermalShutdown: c.state.isThermalShutdown === true,
        isOvercurrentFault: c.state.isOvercurrentFault === true,
        currentLimitA: Number(Math.min(2, configuredCurrentLimitA).toFixed(3)),
        phaseACurrentA: Number(Math.max(-currentLimitA, Math.min(currentLimitA, phaseACurrentA)).toFixed(3)),
        phaseBCurrentA: Number(Math.max(-currentLimitA, Math.min(currentLimitA, phaseBCurrentA)).toFixed(3)),
        powerLossW: Number(powerLossW.toFixed(3)),
        motorId: motor?.id || "",
      };
      if (configuredCurrentLimitA > 2)
        warnings.add(`${c.name}: setelan arus ${configuredCurrentLimitA.toFixed(2)} A melebihi rating keluaran 2 A; turunkan VREF atau gunakan driver yang sesuai.`);
      if (configuredCurrentLimitA >= 2.1 && c.state.isOvercurrentFault === true)
        warnings.add(`${c.name}: proteksi overcurrent aktif; turunkan setelan arus lalu sikluskan SLEEP.`);
      if (c.state.isUvlo === true)
        warnings.add(`${c.name}: proteksi UVLO menahan keluaran; periksa VDD dan sambungan ground logika.`);
      if (Number(c.state.temperatureC) >= 100)
        warnings.add(`${c.name}: suhu junction virtual ${Number(c.state.temperatureC).toFixed(0)} °C tinggi.`);
      if (c.state.isThermalShutdown === true)
        warnings.add(`${c.name}: thermal shutdown aktif; keluaran pulih setelah suhu turun di bawah 150 °C.`);
    }
    if (c.typeId === "l298n_dual_hbridge") {
      const channel = driverChannels.get(c.id);
      const outputVoltageA = (voltage.get(node(c, "OUT1")) || 0) - (voltage.get(node(c, "OUT2")) || 0);
      const outputVoltageB = (voltage.get(node(c, "OUT3")) || 0) - (voltage.get(node(c, "OUT4")) || 0);
      const currentA = channel?.motorA ? solvedMotorCurrent(channel.motorA) : 0;
      const currentB = channel?.motorB ? solvedMotorCurrent(channel.motorB) : 0;
      const diodeEdges = edges.filter((edge) => edge.diode?.startsWith(`${c.id}:`) && enabled.has(edge.diode));
      const diodeCurrentA = diodeEdges.reduce((sum, edge) => sum + Math.max(0, ((voltage.get(edge.a) || 0) - (voltage.get(edge.b) || 0) - edge.vf) / edge.r), 0);
      const diodeLossW = diodeEdges.reduce((sum, edge) => sum + Math.max(0, ((voltage.get(edge.a) || 0) - (voltage.get(edge.b) || 0) - edge.vf) / edge.r) * edge.vf, 0);
      states[c.id] = {
        ...c.state,
        isLogicPowered: channel?.logicPowered ?? false,
        isMotorPowered: channel?.motorPowered ?? false,
        isThermalShutdown: channel?.thermalShutdown ?? c.state.isThermalShutdown === true,
        motorIdA: channel?.motorA?.id ?? "",
        motorIdB: channel?.motorB?.id ?? "",
        outputVoltageA: Number(outputVoltageA.toFixed(3)),
        outputVoltageB: Number(outputVoltageB.toFixed(3)),
        currentA: Number(currentA.toFixed(3)),
        currentB: Number(currentB.toFixed(3)),
        freewheelCurrentA: Number(diodeCurrentA.toFixed(3)),
        freewheelLossW: Number(diodeLossW.toFixed(3)),
        powerLossW: Number((2 * (Math.abs(currentA) + Math.abs(currentB)) + diodeLossW).toFixed(3)),
      };
      if (Math.abs(currentA) > 2 || Math.abs(currentB) > 2)
        warnings.add(`${c.name}: arus channel L298N melebihi rating 2 A; periksa rating motor dan driver.`);
      if (Number(c.state.temperatureC) >= 90)
        warnings.add(`${c.name}: suhu heatsink virtual ${Number(c.state.temperatureC).toFixed(0)} °C tinggi.`);
      if (channel?.thermalShutdown)
        warnings.add(`${c.name}: proteksi thermal mematikan keluaran; tunggu heatsink turun di bawah 135 °C.`);
    }
    if (c.typeId === "battery_pack" && c.state.profile === "alkaline_9v" && Number(states[c.id]?.currentA) > 0.5)
      warnings.add(`${c.name}: arus pelepasan tinggi untuk baterai alkaline 9V dengan ESR besar; gunakan baterai Li-ion/LiPo atau catu eksternal.`);
    if (c.typeId === "incremental_encoder") {
      const encoder = encoderSignals.get(c.id)!;
      states[c.id] = {
        ...c.state,
        isPowered: encoder.powered,
        count: encoder.signal.count,
        channelA: encoder.signal.channelA,
        channelB: encoder.signal.channelB,
      };
    }
    if (c.typeId === "battery_charger") {
      const parameters = chargerParameters.get(c.id)!;
      states[c.id] = {
        ...c.state,
        inputVoltageV: Number(parameters.inputVoltageV.toFixed(3)),
        inputCurrentA: Number((parameters.isCharging ? parameters.targetVoltageV * parameters.chargeCurrentA / Math.max(0.1, parameters.inputVoltageV * parameters.efficiency) + 0.002 : 0).toFixed(4)),
        chargeCurrentA: Number(parameters.chargeCurrentA.toFixed(4)),
        targetVoltageV: parameters.targetVoltageV,
        isCharging: parameters.isCharging,
        isConstantVoltage: parameters.isConstantVoltage,
        isChargeComplete: parameters.isChargeComplete,
        isSafetyTimerExpired: parameters.isSafetyTimerExpired,
        chargeElapsedSeconds: Number(parameters.chargeElapsedSeconds.toFixed(3)),
        safetyTimerLimitSeconds: parameters.safetyTimerLimitSeconds,
        isBalancing: parameters.isBalancing,
        balanceCurrentA: Number(parameters.balanceCurrentA.toFixed(3)),
        balanceCellIndex: parameters.balanceCellIndex,
        cellDeltaVoltageV: Number(parameters.cellDeltaVoltageV.toFixed(3)),
        tailCurrentLimitA: Number(parameters.tailCurrentLimitA.toFixed(3)),
        powerLossW: Number(parameters.powerLossW.toFixed(3)),
        temperatureC: Number(c.state.temperatureC) || 25,
        isThermalShutdown: parameters.isThermalShutdown,
        isReverseConnected: parameters.isReverseConnected,
      };
      if (parameters.isReverseConnected)
        warnings.add(`${c.name}: polaritas input atau sambungan BAT terbalik; proteksi memblokir arus charger.`);
      if (parameters.isThermalShutdown)
        warnings.add(`${c.name}: proteksi termal aktif pada ${Number(c.state.temperatureC || 25).toFixed(0)} °C; arus charge dihentikan sampai suhu turun di bawah 75 °C.`);
      if (parameters.isSafetyTimerExpired)
        warnings.add(`${c.name}: safety timer simulasi habis; pengisian dihentikan sampai timer di-reset manual.`);
      if (c.state.isOn !== false && parameters.inputVoltageV > 0 && !parameters.isCharging && !parameters.isChargeComplete && !parameters.isSafetyTimerExpired)
        warnings.add(`${c.name}: tidak mengisi; periksa input, sambungan, profil baterai, SOC, dan suhu charger.`);
    }
    if (isMicrocontroller(c.typeId))
      states[c.id] = {
        isOn: true,
        builtinLED: (voltage.get(node(c, "D13")) || 0) > 2.5,
      };
    if (c.typeId === "led_red") {
      const e = edges.find((e) => e.led === c.id)!;
      const current =
        converged && enabled.has(c.id)
          ? Math.max(
              0,
              ((voltage.get(e.a) || 0) - (voltage.get(e.b) || 0) - 1.8) / 10,
            )
          : 0;
      states[c.id] = {
        isOn: current > 0.0001,
        brightness: Math.min(255, Math.round((current / 0.02) * 255)),
        currentMa: current * 1000,
      };
      if (current > 0.02)
        warnings.add(
          `${c.name}: arus LED >20 mA. Tambahkan resistor pembatas.`,
        );
    }
    if (c.typeId === "oled_ssd1306") {
      const vcc = voltage.get(node(c, "VCC")) || 0;
      const gnd = voltage.get(node(c, "GND")) || 0;
      const vDiff = vcc - gnd;
      const isPowered = vDiff >= 2.7;
      states[c.id] = {
        ...c.state,
        isOn: isPowered,
        isPowered,
        vDiff,
      };
    }
    if (c.typeId === "pca9685_i2c") {
      const vcc = voltage.get(node(c, "VCC")) || 0;
      const gnd = voltage.get(node(c, "GND")) || 0;
      const vDiff = vcc - gnd;
      const isPowered = vDiff >= 2.3;
      const oeVoltage = (voltage.get(node(c, "OE")) || 0) - gnd;
      states[c.id] = {
        ...c.state,
        isPowered,
        outputsEnabled: isPowered && oeVoltage < 0.8,
        vDiff,
      };
    }
    if (c.typeId === "servo_sg90") {
      const vcc = voltage.get(node(c, "VCC")) || 0;
      const gnd = voltage.get(node(c, "GND")) || 0;
      const vDiff = vcc - gnd;
      const isPowered = vDiff >= 4.0;
      states[c.id] = {
        ...c.state,
        isPowered,
        vDiff,
      };
    }
    if (c.typeId === "lcd1602_i2c") {
      const vcc = voltage.get(node(c, "VCC")) || 0;
      const gnd = voltage.get(node(c, "GND")) || 0;
      const vDiff = vcc - gnd;
      const isPowered = vDiff >= 4.2;
      states[c.id] = {
        ...c.state,
        isPowered,
        vDiff,
      };
    }
    if (c.typeId === "dht11") {
      const vcc = voltage.get(node(c, "VCC")) || 0;
      const gnd = voltage.get(node(c, "GND")) || 0;
      const vDiff = vcc - gnd;
      const isPowered = vDiff >= 2.8;
      states[c.id] = {
        ...c.state,
        isPowered,
        vDiff,
      };
    }
    if (c.typeId === "hcsr04") {
      const vcc = voltage.get(node(c, "VCC")) || 0;
      const gnd = voltage.get(node(c, "GND")) || 0;
      const vDiff = vcc - gnd;
      const isPowered = vDiff >= 4.2;
      states[c.id] = {
        ...c.state,
        isPowered,
        vDiff,
      };
    }
    if (c.typeId === "plc_omron_cp1e") {
      const common = voltage.get(node(c, "COMI")) || 0;
      let inputMask = 0;
      for (let i = 0; i < 12; i++) {
        if ((voltage.get(node(c, `X${i}`)) || 0) - common >= 14) inputMask |= 1 << i;
      }
      states[c.id] = {
        ...c.state,
        isPowered: true,
        inputMask,
        scanCount: Number(c.state.scanCount || 0) + 1,
        vDiff: 24,
      };
    }
    if (c.typeId === "stepper_nema17") {
      const attachedDriver = [...driverMotors.entries()].find(([, motor]) => motor.id === c.id)?.[0];
      if (attachedDriver) {
        const driverState = components.find((item) => item.id === attachedDriver)!.state;
        const angle = Number(driverState.angleDegrees) || 0;
        const previousAngle = Number(c.state.angle) || 0;
        const delta = angle - previousAngle;
        const va = (voltage.get(node(c, "A+")) || 0) - (voltage.get(node(c, "A-")) || 0);
        const vb = (voltage.get(node(c, "B+")) || 0) - (voltage.get(node(c, "B-")) || 0);
        states[c.id] = {
          ...c.state,
          steps: Math.round(angle / 1.8), angle,
          direction: delta > 0 ? "CW" : delta < 0 ? "CCW" : "idle",
          phaseIndex: Number(driverState.positionPulses || 0),
          isPowered: driverState.isEnabled === true && driverState.isMotorPowered === true,
          currentMa: Number(((Math.abs(va) + Math.abs(vb)) / 1.65 * 1000).toFixed(1)),
        };
        continue;
      }
      const va = (voltage.get(node(c, "A+")) || 0) - (voltage.get(node(c, "A-")) || 0);
      const vb = (voltage.get(node(c, "B+")) || 0) - (voltage.get(node(c, "B-")) || 0);
      const a = Math.abs(va) >= 1 ? Math.sign(va) : 0;
      const b = Math.abs(vb) >= 1 ? Math.sign(vb) : 0;
      const phases = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
      const phaseIndex = phases.findIndex(([pa, pb]) => pa === a && pb === b);
      const previous = Number(c.state.phaseIndex ?? -1);
      let delta = 0;
      if (phaseIndex >= 0 && previous >= 0 && phaseIndex !== previous) {
        const forward = (phaseIndex - previous + 4) % 4;
        if (forward === 1) delta = 1;
        else if (forward === 3) delta = -1;
      }
      const steps = Number(c.state.steps || 0) + delta;
      const currentMa = (Math.abs(va) / 1.65 + Math.abs(vb) / 1.65) * 1000;
      states[c.id] = {
        ...c.state,
        phaseIndex,
        steps,
        angle: steps * 1.8,
        direction: delta > 0 ? "CW" : delta < 0 ? "CCW" : "idle",
        isPowered: phaseIndex >= 0,
        currentMa: Number(currentMa.toFixed(1)),
      };
      if (Math.abs(va) > 3.2 || Math.abs(vb) > 3.2)
        warnings.add(`${c.name}: tegangan kumparan tinggi; gunakan driver stepper dengan pembatas arus.`);
    }
    if (c.typeId === "capacitor_universal") {
      const vA = voltage.get(node(c, "A")) || 0;
      const vC = voltage.get(node(c, "C")) || 0;
      const vDiff = vA - vC;
      const cap = Math.max(1e-12, Number(c.state.capacitance) || 470e-6);
      const dt = 0.005;
      const esr = Math.max(0.01, Number(c.state.esr) || 0.1);
      const rCap = dt / cap;
      const rTotal = esr + rCap;
      const vPrev = Number(c.state.voltage) || 0;
      const iCurrent = (vDiff - vPrev) / rTotal;
      const vNew = vPrev + iCurrent * (dt / cap);
      const charge = cap * Math.abs(vNew);
      const energy = 0.5 * cap * vNew * vNew;
      const ratedV = Number(c.state.ratedVoltage) || 25;
      const subType = String(c.state.subType || "electrolytic");

      let status = "normal";
      if (Math.abs(vDiff) > ratedV * 1.05) {
        status = "overvoltage";
        warnings.add(
          `${c.name}: Tegangan ${vDiff.toFixed(1)}V melebihi rating ${ratedV}V! Risiko breakdown dielektrik.`,
        );
      } else if (subType === "electrolytic" && vDiff < -0.3) {
        status = "reversed";
        warnings.add(
          `${c.name}: Polaritas Elco terbalik! Katoda (-) terhubung ke potensial lebih positif daripada Anoda (+).`,
        );
      }

      states[c.id] = {
        ...c.state,
        voltage: Number(vNew.toFixed(3)),
        vDiff: Number(vDiff.toFixed(3)),
        currentMa: Number((iCurrent * 1000).toFixed(2)),
        charge: Number(charge.toFixed(8)),
        chargeU_C: Number((charge * 1e6).toFixed(2)),
        energy: Number(energy.toFixed(8)),
        energy_mJ: Number((energy * 1000).toFixed(3)),
        status,
      };
    }
    if (c.typeId === "dc_motor") {
      const params = dcMotorParameters(c.state);
      const motorVoltage = (voltage.get(node(c, "M+")) || 0) - (voltage.get(node(c, "M-")) || 0);
      const armatureCurrentA = solvedMotorCurrent(c);
      const driverInfo = dcMotorDriverById.get(c.id);
      states[c.id] = {
        ...c.state,
        armatureCurrentA: Number(armatureCurrentA.toFixed(4)),
        motorVoltageV: Number(motorVoltage.toFixed(3)),
        backEmfV: Number((Number(c.state.backEmfV) || 0).toFixed(3)),
        omegaRadS: Number(c.state.omegaRadS) || 0,
        angleRad: Number(c.state.angleRad) || 0,
        angleDegrees: Number(((Number(c.state.angleRad) || 0) * 180 / Math.PI).toFixed(2)),
        angle: Number(((Number(c.state.angleRad) || 0) * 180 / Math.PI).toFixed(2)),
        speedRpm: Number(((Number(c.state.omegaRadS) || 0) * 60 / (2 * Math.PI * params.gearRatio)).toFixed(1)),
        outputTorqueNm: Number((params.torqueConstantNmPerA * armatureCurrentA * params.gearRatio * params.gearEfficiency).toFixed(4)),
        isPowered: Math.abs(motorVoltage) >= 0.2 || Math.abs(armatureCurrentA) > 0.01,
        motorDriverId: driverInfo?.driver.id ?? "",
      };
    }
    if (c.typeId === "servo_sg90") {
      states[c.id] = {
        ...c.state,
        ...states[c.id],
        currentDrawA: Number(c.state.currentDrawA) || 0,
      };
    }
  }
  const voltages: Record<string, number> = {};
  for (const t of terminals)
    if (voltage.has(root(t))) voltages[t] = voltage.get(root(t))!;
  return { voltages, states, warnings: [...warnings] };
}
