export type SolderAlloy = "lead" | "sac305";
export type SolderPadKind = "signal" | "ground";
export type SolderJointQuality = "untouched" | "cold" | "good" | "excess-heat" | "overheated" | "bridge";

export interface SolderPadState {
  temperatureC: number;
  contactSeconds: number;
  solderAmount: number;
  quality: SolderJointQuality;
}

export const SOLDER_MELTING_POINT_C: Record<SolderAlloy, number> = {
  lead: 183,
  sac305: 219,
};

const AMBIENT_C = 25;

/**
 * Educational lumped-pad heuristic, not a thermal diffusion solver.
 * Relative conductance follows Q = k·A·(Ttip - Tpad)/d; values are tuned to
 * make small signal pads warm faster than larger ground-plane pads.
 */
export function advanceSolderPad(
  state: SolderPadState,
  input: { tipTemperatureC: number; touching: boolean; padKind: SolderPadKind },
  dtSeconds: number,
): SolderPadState {
  const dt = Number.isFinite(dtSeconds) ? Math.max(0, Math.min(0.1, dtSeconds)) : 0;
  const tipTemperatureC = Number.isFinite(input.tipTemperatureC)
    ? Math.max(150, Math.min(480, input.tipTemperatureC))
    : 350;
  const thermalMassJPerC = input.padKind === "ground" ? 0.55 : 0.06;
  const conductanceWPerC = input.padKind === "ground" ? 0.12 : 0.04;
  const sourceTemperatureC = input.touching ? tipTemperatureC : AMBIENT_C;
  const conductanceScale = input.touching ? 1 : 0.35;
  const qWatts = conductanceWPerC * conductanceScale * (sourceTemperatureC - state.temperatureC);
  const temperatureC = Math.max(AMBIENT_C, Math.min(520, state.temperatureC + qWatts / thermalMassJPerC * dt));
  return {
    ...state,
    temperatureC,
    contactSeconds: input.touching ? state.contactSeconds + dt : state.contactSeconds,
  };
}

export function classifySolderJoint(
  state: SolderPadState,
  alloy: SolderAlloy,
  bridged = false,
): SolderJointQuality {
  if (bridged) return "bridge";
  if (state.contactSeconds <= 0 && state.solderAmount <= 0) return "untouched";
  if (state.contactSeconds < 1.5 || state.temperatureC < SOLDER_MELTING_POINT_C[alloy]) return "cold";
  if (state.contactSeconds <= 3.5) return "good";
  if (state.contactSeconds >= 6) return "overheated";
  return "excess-heat";
}

export function solderBridgeDetected(leftAmount: number, rightAmount: number): boolean {
  return leftAmount >= 0.7 && rightAmount >= 0.7;
}
