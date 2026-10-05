/** CPU-readable RGB-D snapshot; rows use WebGL's lower-left origin. */
export interface RGBDFrame {
  width: number;
  height: number;
  rgba: Uint8Array;
  depthMeters: Float32Array;
  /** Monotonic capture sequence, including pose-triggered captures at one sim-time. */
  sampleCount: number;
  capturedAtSimMs: number;
  intrinsics: { fx: number; fy: number; cx: number; cy: number };
  near: number;
  far: number;
}

/** One complete planar scan; samples start at local -Z and advance toward +X. */
export interface PlanarLidarFrame {
  rangesMeters: Float32Array;
  hitMask: Uint8Array;
  sampleCount: number;
  maxRangeMeters: number;
  capturedAtSimMs: number;
}

export interface ImuFrame {
  accelerationMps2: [number, number, number];
  angularVelocityRadS: [number, number, number];
  sampleCount: number;
  capturedAtSimMs: number;
  sourceComponentId: string;
}
