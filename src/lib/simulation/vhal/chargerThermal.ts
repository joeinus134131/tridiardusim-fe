export interface BatteryChargerThermalState {
  temperatureC: number;
  isThermalShutdown: boolean;
}

export interface BatteryChargerThermalParameters {
  ambientC: number;
  thermalResistanceCPerW: number;
  thermalCapacityJPerC: number;
  shutdownC: number;
  recoveryC: number;
}

const clamp = (value: number, fallback: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

/** First-order charger package estimate. Thermal constants are educational assumptions. */
export function advanceBatteryChargerThermal(
  state: BatteryChargerThermalState,
  powerLossW: number,
  dtSeconds: number,
  parameters: Partial<BatteryChargerThermalParameters> = {},
): BatteryChargerThermalState {
  const ambientC = clamp(parameters.ambientC ?? 25, 25, -20, 80);
  const resistance = clamp(parameters.thermalResistanceCPerW ?? 35, 35, 1, 200);
  const capacity = clamp(parameters.thermalCapacityJPerC ?? 8, 8, 0.1, 1000);
  const shutdownC = clamp(parameters.shutdownC ?? 90, 90, 60, 200);
  const recoveryC = clamp(parameters.recoveryC ?? 75, 75, 40, shutdownC - 1);
  const dt = clamp(dtSeconds, 0, 0, 1);
  const equilibriumC = ambientC + Math.max(0, powerLossW) * resistance;
  const retained = Math.exp(-dt / (resistance * capacity));
  const temperatureC = equilibriumC + (state.temperatureC - equilibriumC) * retained;
  const isThermalShutdown = state.isThermalShutdown
    ? temperatureC > recoveryC
    : temperatureC >= shutdownC;
  return { temperatureC, isThermalShutdown };
}
