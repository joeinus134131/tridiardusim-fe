export interface ChargerSafetyTimerState {
  chargeElapsedSeconds: number;
  safetyTimerLimitSeconds: number;
  isSafetyTimerExpired: boolean;
}

/** Educational backup timeout driven by active simulation charge time. */
export function advanceChargerSafetyTimer(
  state: ChargerSafetyTimerState,
  isCharging: boolean,
  dtSeconds: number,
): ChargerSafetyTimerState {
  const elapsed = Math.max(0, Number.isFinite(state.chargeElapsedSeconds) ? state.chargeElapsedSeconds : 0);
  const limit = Math.max(60, Math.min(24 * 60 * 60, Number.isFinite(state.safetyTimerLimitSeconds) ? state.safetyTimerLimitSeconds : 10 * 60 * 60));
  if (state.isSafetyTimerExpired || !isCharging) {
    return { chargeElapsedSeconds: elapsed, safetyTimerLimitSeconds: limit, isSafetyTimerExpired: state.isSafetyTimerExpired };
  }
  const nextElapsed = Math.min(limit, elapsed + Math.max(0, Number.isFinite(dtSeconds) ? dtSeconds : 0));
  return {
    chargeElapsedSeconds: nextElapsed,
    safetyTimerLimitSeconds: limit,
    isSafetyTimerExpired: nextElapsed >= limit,
  };
}
