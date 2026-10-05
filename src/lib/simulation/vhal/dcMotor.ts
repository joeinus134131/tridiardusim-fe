export interface DcMotorState {
  armatureCurrentA: number;
  backEmfV: number;
  omegaRadS: number;
  angleRad: number;
}

export interface DcMotorParameters {
  resistanceOhms: number;
  inductanceH: number;
  torqueConstantNmPerA: number;
  backEmfConstantVsPerRad: number;
  rotorInertiaKgM2: number;
  viscousFrictionNmPerRadS: number;
  gearRatio: number;
  gearEfficiency: number;
  loadTorqueNm: number;
}

export interface DcMotorElectricalEquivalent {
  resistanceOhms: number;
  voltageOffsetV: number;
}

const bounded = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
};

export function dcMotorParameters(state: Record<string, unknown>): DcMotorParameters {
  return {
    resistanceOhms: bounded(state.resistanceOhms, 6, 0.1, 100),
    inductanceH: bounded(state.inductanceH, 0.002, 0.00001, 1),
    torqueConstantNmPerA: bounded(state.torqueConstantNmPerA, 0.006, 0.00001, 1),
    backEmfConstantVsPerRad: bounded(state.backEmfConstantVsPerRad, 0.006, 0.00001, 1),
    rotorInertiaKgM2: bounded(state.rotorInertiaKgM2, 0.00001, 0.0000001, 1),
    viscousFrictionNmPerRadS: bounded(state.viscousFrictionNmPerRadS, 0.000001, 0, 1),
    gearRatio: bounded(state.gearRatio, 48, 1, 1000),
    gearEfficiency: bounded(state.gearEfficiency, 0.72, 0.1, 1),
    loadTorqueNm: bounded(state.loadTorqueNm, 0, 0, 10),
  };
}

/** Norton-compatible winding branch for V = (R + L/dt)I + Ke*w - L/dt*Iprev. */
export function dcMotorElectricalEquivalent(
  state: DcMotorState,
  parameters: DcMotorParameters,
  dtSeconds: number,
): DcMotorElectricalEquivalent {
  const dt = bounded(dtSeconds, 0.005, 0.0001, 0.02);
  const inductiveResistance = parameters.inductanceH / dt;
  return {
    resistanceOhms: parameters.resistanceOhms + inductiveResistance,
    voltageOffsetV: state.backEmfV - inductiveResistance * state.armatureCurrentA,
  };
}

/** Semi-implicit mechanical update; electrical current is solved with the DC circuit each step. */
export function advanceDcMotor(
  state: DcMotorState,
  parameters: DcMotorParameters,
  solvedCurrentA: number,
  dtSeconds: number,
): DcMotorState {
  const dt = bounded(dtSeconds, 0.005, 0.0001, 0.02);
  const current = bounded(solvedCurrentA, 0, -100, 100);
  const reflectedLoadTorque = parameters.loadTorqueNm / (parameters.gearEfficiency * parameters.gearRatio);
  const acceleration = (
    parameters.torqueConstantNmPerA * current -
    parameters.viscousFrictionNmPerRadS * state.omegaRadS -
    reflectedLoadTorque * Math.sign(state.omegaRadS || current || 1)
  ) / parameters.rotorInertiaKgM2;
  const omegaRadS = bounded(state.omegaRadS + acceleration * dt, 0, -20_000, 20_000);
  const angleRad = state.angleRad + omegaRadS * dt / parameters.gearRatio;
  return {
    armatureCurrentA: current,
    backEmfV: parameters.backEmfConstantVsPerRad * omegaRadS,
    omegaRadS,
    angleRad,
  };
}
