import type { ImuFrame, PlanarLidarFrame, RGBDFrame } from "./types";
import type { Value } from "../SketchRuntime";

export interface SensorFrameSet {
  rgbd: Record<string, RGBDFrame>;
  lidar: Record<string, PlanarLidarFrame>;
  imu: Record<string, ImuFrame>;
}

/** Stable change token for renderer→worker snapshots, even when pose capture repeats at one sim-time. */
export function sensorFramesSignature(frames: SensorFrameSet) {
  return JSON.stringify([
    Object.entries(frames.rgbd).map(([id, frame]) => [id, frame.capturedAtSimMs, frame.sampleCount, frame.width, frame.height]),
    Object.entries(frames.lidar).map(([id, frame]) => [id, frame.capturedAtSimMs, frame.sampleCount]),
    Object.entries(frames.imu).map(([id, frame]) => [id, frame.capturedAtSimMs, frame.sampleCount]),
  ]);
}

const numberArg = (value: Value | undefined, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const frameById = <T>(frames: Record<string, T>, id: Value | undefined) => {
  const key = String(id ?? "");
  return key ? frames[key] : frames[Object.keys(frames)[0]];
};

/** Numeric sketch V-HAL for the newest renderer-produced synthetic sensor frames. */
export function sensorReadApi(getFrames: () => SensorFrameSet): Record<string, (...args: Value[]) => number> {
  return {
    imuRead: (sensorId = "", axis = "ax") => {
      const frame = frameById(getFrames().imu, sensorId);
      if (!frame) return 0;
      const axes: Record<string, number> = {
        ax: frame.accelerationMps2[0], ay: frame.accelerationMps2[1], az: frame.accelerationMps2[2],
        gx: frame.angularVelocityRadS[0], gy: frame.angularVelocityRadS[1], gz: frame.angularVelocityRadS[2],
      };
      return axes[String(axis).toLowerCase()] ?? 0;
    },
    lidarRange: (sensorId = "", sample = 0) => {
      const frame = frameById(getFrames().lidar, sensorId);
      if (!frame) return 0;
      const index = Math.trunc(numberArg(sample, -1));
      return index >= 0 && index < frame.sampleCount ? frame.rangesMeters[index] : 0;
    },
    lidarHit: (sensorId = "", sample = 0) => {
      const frame = frameById(getFrames().lidar, sensorId);
      if (!frame) return 0;
      const index = Math.trunc(numberArg(sample, -1));
      return index >= 0 && index < frame.sampleCount ? Number(frame.hitMask[index] !== 0) : 0;
    },
    cameraDepth: (sensorId = "", x = 0, y = 0) => {
      const frame = frameById(getFrames().rgbd, sensorId);
      if (!frame) return 0;
      const ix = Math.trunc(numberArg(x, -1));
      const iy = Math.trunc(numberArg(y, -1));
      if (ix < 0 || ix >= frame.width || iy < 0 || iy >= frame.height) return 0;
      return frame.depthMeters[iy * frame.width + ix] ?? 0;
    },
    cameraRgb: (sensorId = "", x = 0, y = 0, channel = 0) => {
      const frame = frameById(getFrames().rgbd, sensorId);
      if (!frame) return 0;
      const ix = Math.trunc(numberArg(x, -1));
      const iy = Math.trunc(numberArg(y, -1));
      const channelName = String(channel).toLowerCase();
      const component = ({ r: 0, g: 1, b: 2, a: 3 } as Record<string, number>)[channelName] ?? Math.trunc(numberArg(channel, 0));
      if (ix < 0 || ix >= frame.width || iy < 0 || iy >= frame.height || component < 0 || component > 3) return 0;
      return frame.rgba[(iy * frame.width + ix) * 4 + component] ?? 0;
    },
    cameraWidth: (sensorId = "") => frameById(getFrames().rgbd, sensorId)?.width ?? 0,
    cameraHeight: (sensorId = "") => frameById(getFrames().rgbd, sensorId)?.height ?? 0,
  };
}
