import { fabrik, forwardKinematics, solvePositionIKDLS, type Transform, type Vec3 } from "./kinematics";
import { aeroArm6Dof, eduArm3Dof } from "./robots";

interface SolveRequest {
  type: "solve-position";
  requestId: number;
  componentId: string;
  angles: number[];
  target: Vec3;
  currentEnd: Vec3;
  robotId?: string;
}

onmessage = ({ data }: MessageEvent<SolveRequest>) => {
  if (data.type !== "solve-position") return;
  const robot = data.robotId === aeroArm6Dof.id ? aeroArm6Dof : eduArm3Dof;
  let target = data.target;
  if (robot === eduArm3Dof) {
    const elbowHome: Transform = [1,0,0,0, 0,1,0,0.17, 0,0,1,0, 0,0,0,1];
    const elbowPose = forwardKinematics(eduArm3Dof.joints.slice(0, 2), data.angles.slice(0, 2), elbowHome);
    const chain = fabrik(
      [[0,0,0], [0,0.05,0], [elbowPose[3],elbowPose[7],elbowPose[11]], data.currentEnd],
      target,
    );
    target = chain[chain.length - 1];
  }
  const result = solvePositionIKDLS(
    robot.joints,
    data.angles,
    robot.home,
    target,
    robot === aeroArm6Dof ? { maxIterations: 120, damping: 0.025 } : undefined,
  );
  postMessage({ type: "solved", requestId: data.requestId, componentId: data.componentId, result });
};
