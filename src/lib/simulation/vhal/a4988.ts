export interface A4988PulseState {
  stepHigh: boolean;
  riseMicros: number;
  positionPulses: number;
  angleDegrees: number;
}

export function a4988MicrostepResolution(ms1: boolean, ms2: boolean, ms3: boolean): 1 | 2 | 4 | 8 | 16 {
  if (ms1 && ms2 && ms3) return 16;
  if (ms1 && ms2) return 8;
  if (ms2) return 4;
  if (ms1) return 2;
  return 1;
}

export function a4988CurrentLimit(vref: number, senseResistance: number): number {
  if (!Number.isFinite(vref) || vref < 0 || !Number.isFinite(senseResistance) || senseResistance <= 0) {
    throw new Error("Vref dan sense resistor A4988 harus bernilai valid.");
  }
  return vref / (8 * senseResistance);
}

export interface A4988ProtectionState {
  isUvlo: boolean;
  isOvercurrentFault: boolean;
  sleepHigh: boolean;
  isEnabled: boolean;
}

export interface A4988ProtectionInput {
  vdd: number;
  motorVoltage: number;
  currentLimitA: number;
  enableLow: boolean;
  resetHigh: boolean;
  sleepHigh: boolean;
  isThermalShutdown: boolean;
}

/** Quasistatic A4988 UVLO/OCP latch; PWM current chopping itself is not simulated. */
export function advanceA4988Protection(previous: A4988ProtectionState, input: A4988ProtectionInput): A4988ProtectionState {
  const isUvlo = previous.isUvlo ? input.vdd < 2.8 : input.vdd < 2.71;
  const logicAvailable = input.vdd >= 3 && !isUvlo;
  const controlsEnabled = logicAvailable && input.sleepHigh && input.enableLow && input.resetHigh;
  let isOvercurrentFault = previous.isOvercurrentFault;
  if (!logicAvailable) isOvercurrentFault = false;
  else if (input.sleepHigh && !previous.sleepHigh && input.currentLimitA <= 2.1) isOvercurrentFault = false;
  if (!isOvercurrentFault && controlsEnabled && input.motorVoltage >= 8 && !input.isThermalShutdown && input.currentLimitA >= 2.1) {
    isOvercurrentFault = true;
  }
  return {
    isUvlo,
    isOvercurrentFault,
    sleepHigh: input.sleepHigh,
    isEnabled: controlsEnabled && !isOvercurrentFault && !input.isThermalShutdown,
  };
}

export interface StepPulseResult {
  state: A4988PulseState;
  completedStep: boolean;
}

/** Count STEP on its falling edge only when the high pulse lasted at least 1 us. */
export function advanceA4988Pulse(
  previous: A4988PulseState,
  stepHigh: boolean,
  nowMicros: number,
  direction: -1 | 1,
  enabled: boolean,
  microstepResolution: number,
): StepPulseResult {
  if (!Number.isFinite(nowMicros) || !Number.isFinite(microstepResolution) || microstepResolution < 1) {
    throw new Error("Waktu dan resolusi microstep A4988 tidak valid.");
  }
  if (!previous.stepHigh && stepHigh) {
    return { state: { ...previous, stepHigh: true, riseMicros: nowMicros }, completedStep: false };
  }
  if (previous.stepHigh && !stepHigh) {
    const completedStep = enabled && nowMicros - previous.riseMicros >= 1;
    return {
      state: {
        ...previous,
        stepHigh: false,
        ...(completedStep
          ? {
              positionPulses: previous.positionPulses + direction,
              angleDegrees: previous.angleDegrees + direction * (1.8 / microstepResolution),
            }
          : {}),
      },
      completedStep,
    };
  }
  return { state: previous, completedStep: false };
}
