export interface DifferentialDrivePose {
  x: number;
  z: number;
  heading: number;
  leftWheelPhase: number;
  rightWheelPhase: number;
}

export interface DifferentialDriveCommand {
  leftSpeed: number;
  rightSpeed: number;
}

export const ROVER_WHEEL_RADIUS_M = 0.035;
export const ROVER_TRACK_WIDTH_M = 0.16;

/** Integrate a differential-drive platform exactly over one constant-speed step. */
export function integrateDifferentialDrive(
  pose: DifferentialDrivePose,
  command: DifferentialDriveCommand,
  dtSeconds: number,
  wheelRadius = ROVER_WHEEL_RADIUS_M,
  trackWidth = ROVER_TRACK_WIDTH_M,
): DifferentialDrivePose {
  if (![pose.x, pose.z, pose.heading, pose.leftWheelPhase, pose.rightWheelPhase,
    command.leftSpeed, command.rightSpeed, dtSeconds, wheelRadius, trackWidth].every(Number.isFinite)) {
    throw new Error("State differential drive harus berisi bilangan hingga.");
  }
  if (dtSeconds < 0 || wheelRadius <= 0 || trackWidth <= 0) {
    throw new Error("Timestep dan dimensi roda differential drive tidak valid.");
  }
  const velocity = (command.leftSpeed + command.rightSpeed) / 2;
  const angularVelocity = (command.rightSpeed - command.leftSpeed) / trackWidth;
  let x = pose.x;
  let z = pose.z;
  let heading = pose.heading;
  if (Math.abs(angularVelocity) < 1e-10) {
    x += velocity * Math.sin(heading) * dtSeconds;
    z += velocity * Math.cos(heading) * dtSeconds;
  } else {
    const nextHeading = heading + angularVelocity * dtSeconds;
    const radius = velocity / angularVelocity;
    x += radius * (Math.cos(heading) - Math.cos(nextHeading));
    z += radius * (Math.sin(nextHeading) - Math.sin(heading));
    heading = nextHeading;
  }
  return {
    x,
    z,
    heading,
    leftWheelPhase: pose.leftWheelPhase + command.leftSpeed * dtSeconds / wheelRadius,
    rightWheelPhase: pose.rightWheelPhase + command.rightSpeed * dtSeconds / wheelRadius,
  };
}
