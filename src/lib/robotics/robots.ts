import type { JointSpec, Transform } from "./kinematics";

export interface RobotModel {
  id: string;
  name: string;
  description: string;
  joints: readonly JointSpec[];
  home: Transform;
  homeJoints: readonly number[];
  linkLengths: readonly number[];
}

/** URDF-lite starter model from docs/03: yaw base + shoulder + elbow. */
export const eduArm3Dof: RobotModel = {
  id: "edu-arm-3dof",
  name: "EduArm-3DOF",
  description: "Lengan edukasi RRR dengan sumbu basis, bahu, dan siku.",
  joints: [
    { type: "revolute", axis: [0, 1, 0], point: [0, 0, 0], min: -Math.PI, max: Math.PI },
    { type: "revolute", axis: [0, 0, 1], point: [0, 0.05, 0], min: -Math.PI / 2, max: Math.PI / 2 },
    { type: "revolute", axis: [0, 0, 1], point: [0, 0.17, 0], min: -2.2, max: 2.2 },
  ],
  home: [1,0,0,0, 0,1,0,0.27, 0,0,1,0, 0,0,0,1],
  homeJoints: [0, 0, 0],
  linkLengths: [0.05, 0.12, 0.1],
};

/** Six-axis articulated arm with a three-axis wrist, modelled as URDF-lite PoE data. */
export const aeroArm6Dof: RobotModel = {
  id: "aero-arm-6dof",
  name: "AeroArm-6DOF",
  description: "Lengan articulated enam sumbu dengan spherical wrist untuk pick-and-place.",
  joints: [
    { type: "revolute", axis: [0, 1, 0], point: [0, 0, 0], min: -Math.PI, max: Math.PI },
    { type: "revolute", axis: [0, 0, 1], point: [0, 0.08, 0], min: -2.35, max: 2.35 },
    { type: "revolute", axis: [0, 0, 1], point: [0, 0.20, 0], min: -2.7, max: 2.7 },
    { type: "revolute", axis: [0, 1, 0], point: [0, 0.30, 0], min: -Math.PI, max: Math.PI },
    { type: "revolute", axis: [0, 0, 1], point: [0, 0.335, 0], min: -2.1, max: 2.1 },
    { type: "revolute", axis: [0, 1, 0], point: [0, 0.37, 0], min: -Math.PI, max: Math.PI },
  ],
  home: [1,0,0,0, 0,1,0,0.5, 0,0,1,0, 0,0,0,1],
  homeJoints: [0, 0, 0, 0, 0, 0],
  linkLengths: [0.08, 0.12, 0.10, 0.035, 0.035, 0.13],
};
