export interface A4988ThermalState {
  temperatureC: number;
  isThermalShutdown: boolean;
}

export interface A4988ThermalParameters {
  ambientC: number;
  thermalResistanceCPerW: number;
  thermalCapacityJPerC: number;
  shutdownC: number;
  recoveryC: number;
}

const clamp = (value: number, fallback: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

/** First-order junction estimate. Cth is an educational transient assumption, not a datasheet value. */
export function advanceA4988Thermal(
  state: A4988ThermalState,
  powerLossW: number,
  dtSeconds: number,
  parameters: Partial<A4988ThermalParameters> = {},
): A4988ThermalState {
  const ambientC = clamp(parameters.ambientC ?? 25, 25, -20, 80);
  const resistance = clamp(parameters.thermalResistanceCPerW ?? 32, 32, 1, 200);
  const capacity = clamp(parameters.thermalCapacityJPerC ?? 0.5, 0.5, 0.01, 100);
  const shutdownC = clamp(parameters.shutdownC ?? 165, 165, 60, 250);
  const recoveryC = clamp(parameters.recoveryC ?? shutdownC - 15, shutdownC - 15, 40, shutdownC - 1);
  const dt = clamp(dtSeconds, 0, 0, 1);
  const equilibriumC = ambientC + Math.max(0, powerLossW) * resistance;
  const retained = Math.exp(-dt / (resistance * capacity));
  const temperatureC = equilibriumC + (state.temperatureC - equilibriumC) * retained;
  const isThermalShutdown = state.isThermalShutdown
    ? temperatureC > recoveryC
    : temperatureC >= shutdownC;
  return { temperatureC, isThermalShutdown };
}
