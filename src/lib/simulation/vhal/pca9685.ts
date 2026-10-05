export const PCA9685_CHANNEL_COUNT = 16;
export const PCA9685_PWM_STEPS = 4096;
export const PCA9685_LED0_ON_L = 0x06;

export function pca9685ChannelRegister(channel: number) {
  const value = Math.trunc(channel);
  if (!Number.isInteger(value) || value < 0 || value >= PCA9685_CHANNEL_COUNT) return null;
  return PCA9685_LED0_ON_L + value * 4;
}

export function pca9685PulseMicroseconds(onCount: number, offCount: number, frequencyHz: number) {
  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) return 0;
  const ticks = (Math.trunc(offCount) - Math.trunc(onCount)) & 0x0fff;
  return ticks * 1_000_000 / (PCA9685_PWM_STEPS * frequencyHz);
}

export function servoAngleFromPulse(pulseUs: number) {
  return Math.max(0, Math.min(180, Math.round((pulseUs - 1000) * 180 / 1000)));
}
