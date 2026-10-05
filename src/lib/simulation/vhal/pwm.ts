export interface PwmSignal {
  /** Quantized hardware duty value written by the sketch. */
  code: number;
  /** Duty cycle after quantization, in [0, 1]. */
  duty: number;
  /** Effective DC voltage used by the quasi-static circuit solver. */
  voltage: number;
}

export function clampPwmResolution(bits: number, hardwareMaxBits: number): number {
  if (!Number.isFinite(bits)) throw new Error("Resolusi PWM harus berupa bilangan hingga.");
  const requested = Math.trunc(bits);
  if (requested < 1 || requested > 16) throw new Error("Resolusi PWM harus berada pada rentang 1–16 bit.");
  return Math.min(requested, hardwareMaxBits);
}

/** Convert analogWrite's integer code to a duty cycle and its averaged pin voltage. */
export function pwmSignal(
  value: number,
  resolutionBits: number,
  supplyVoltage: number,
  pwmCapable: boolean,
): PwmSignal {
  if (!Number.isInteger(resolutionBits) || resolutionBits < 1 || resolutionBits > 16) {
    throw new Error("Resolusi PWM harus berupa bilangan bulat 1–16 bit.");
  }
  if (!Number.isFinite(supplyVoltage) || supplyVoltage < 0) {
    throw new Error("Tegangan catu PWM harus berupa bilangan hingga non-negatif.");
  }
  if (!Number.isFinite(value)) throw new Error("Nilai PWM harus berupa bilangan hingga.");
  const maxCode = 2 ** resolutionBits - 1;
  const code = Math.round(Math.max(0, Math.min(maxCode, value)));
  const duty = code / maxCode;
  return {
    code,
    duty,
    voltage: pwmCapable
      ? duty * supplyVoltage
      : code >= Math.ceil(maxCode / 2)
        ? supplyVoltage
        : 0,
  };
}
