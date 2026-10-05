export interface QuadratureState {
  count: number;
  phase: 0 | 1 | 2 | 3;
  channelA: 0 | 1;
  channelB: 0 | 1;
}

/** Decode shaft angle into x4 quadrature counts; PPR means A-channel cycles/rev. */
export function quadratureState(angleRadians: number, pulsesPerRevolution: number): QuadratureState {
  if (!Number.isFinite(angleRadians)) throw new Error("Sudut encoder harus berupa bilangan hingga.");
  if (!Number.isInteger(pulsesPerRevolution) || pulsesPerRevolution < 1 || pulsesPerRevolution > 100_000) {
    throw new Error("PPR encoder harus berupa integer 1–100000.");
  }
  const count = Math.trunc(angleRadians / (2 * Math.PI) * pulsesPerRevolution * 4);
  const phase = (((count % 4) + 4) % 4) as QuadratureState["phase"];
  const states: readonly (readonly [0 | 1, 0 | 1])[] = [[0, 0], [0, 1], [1, 1], [1, 0]];
  const [channelA, channelB] = states[phase];
  return { count, phase, channelA, channelB };
}
