export interface L298NThermalState {
  temperatureC: number;
  isThermalShutdown: boolean;
}

export interface L298NThermalParameters {
  ambientC: number;
  thermalResistanceCPerW: number;
  thermalCapacityJPerC: number;
  shutdownC: number;
  recoveryC: number;
}

const clamp = (value: number, fallback: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

export function advanceL298NThermal(state: L298NThermalState, powerLossW: number, dtSeconds: number, parameters: Partial<L298NThermalParameters> = {}): L298NThermalState {
  const ambientC = clamp(parameters.ambientC ?? 25, 25, -20, 80);
  const resistance = clamp(parameters.thermalResistanceCPerW ?? 25, 25, 1, 200);
  const capacity = clamp(parameters.thermalCapacityJPerC ?? 8, 8, 0.1, 1000);
  const shutdownC = clamp(parameters.shutdownC ?? 150, 150, 60, 250);
  const recoveryC = clamp(parameters.recoveryC ?? 135, 135, 40, shutdownC - 1);
  const dt = clamp(dtSeconds, 0, 0, 1);
  const equilibriumC = ambientC + Math.max(0, powerLossW) * resistance;
  const retained = Math.exp(-dt / (resistance * capacity));
  const temperatureC = equilibriumC + (state.temperatureC - equilibriumC) * retained;
  const isThermalShutdown = state.isThermalShutdown
    ? temperatureC > recoveryC
    : temperatureC >= shutdownC;
  return { temperatureC, isThermalShutdown };
}
