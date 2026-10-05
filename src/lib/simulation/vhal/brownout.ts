export interface BrownoutState {
  active: boolean;
  lowDurationUs: number;
}

export interface BrownoutTransition extends BrownoutState {
  event: "none" | "reset" | "recovered";
}

/** Time-accumulating threshold detector with 0.1 V recovery hysteresis. */
export function advanceBrownout(state: BrownoutState, railVoltageV: number, thresholdV: number, dtUs: number, triggerUs = 10): BrownoutTransition {
  if (railVoltageV < thresholdV) {
    const lowDurationUs = state.lowDurationUs + Math.max(0, dtUs);
    const reset = !state.active && lowDurationUs > triggerUs;
    return { active: state.active || reset, lowDurationUs, event: reset ? "reset" : "none" };
  }
  if (state.active && railVoltageV >= thresholdV + 0.1) {
    return { active: false, lowDurationUs: 0, event: "recovered" };
  }
  return { active: state.active, lowDurationUs: state.active ? state.lowDurationUs : 0, event: "none" };
}
