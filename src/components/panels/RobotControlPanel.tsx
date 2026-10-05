"use client";

import { useState } from "react";
import type { CircuitComponent } from "@/lib/components/componentTypes";
import { forwardKinematics, solvePositionIKDLS } from "@/lib/robotics/kinematics";
import { aeroArm6Dof, eduArm3Dof } from "@/lib/robotics/robots";

export function RobotControlPanel({
  component,
  updateState,
}: {
  component: CircuitComponent;
  updateState: (id: string, update: Record<string, number | string | boolean>) => void;
}) {
  const robot = component.typeId === "aero_arm_6dof" ? aeroArm6Dof : eduArm3Dof;
  const joints = robot.joints.map((_, i) => Number(component.state[`joint${i}`] ?? 0));
  const pose = forwardKinematics(robot.joints, joints, robot.home);
  const [target, setTarget] = useState<[number, number, number]>(() => [pose[3], pose[7], pose[11]]);
  const [ikMessage, setIkMessage] = useState("");
  const labels = component.typeId === "aero_arm_6dof"
    ? ["Basis", "Bahu", "Siku", "Pergelangan 1", "Pergelangan 2", "Pergelangan 3"]
    : ["Basis", "Bahu", "Siku"];

  return (
    <section className="inspector-card" aria-label={`Kontrol ${robot.name}`}>
      <div className="flex items-center justify-between mb-2">
        <strong className="text-xs">Kontrol robot</strong>
        <button
          className="small-button text-[10px] px-2 py-1"
            onClick={() => updateState(component.id, Object.fromEntries(robot.homeJoints.map((value, i) => [`joint${i}`, value])))}
        >
          Home
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {robot.joints.map((joint, i) => {
          const degrees = joints[i] * 180 / Math.PI;
          return (
            <label key={i} className="text-[11px] flex flex-col gap-1">
              <span className="flex justify-between"><span>{labels[i]}</span><span className="font-mono">{degrees.toFixed(0)}°</span></span>
              <input
                aria-label={`Sudut joint ${labels[i]}`}
                type="range"
                min={joint.min * 180 / Math.PI}
                max={joint.max * 180 / Math.PI}
                step="1"
                value={degrees}
                onChange={(e) => updateState(component.id, { [`joint${i}`]: Number(e.target.value) * Math.PI / 180 })}
              />
            </label>
          );
        })}
      </div>
      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px] font-mono opacity-80">
        End-effector (m): x {pose[3].toFixed(3)} · y {pose[7].toFixed(3)} · z {pose[11].toFixed(3)}
      </div>
      <div className="mt-2">
        <strong className="text-[11px]">Target posisi (m)</strong>
        <div className="grid grid-cols-3 gap-1.5 mt-1">
          {(["x", "y", "z"] as const).map((axis, i) => (
            <label key={axis} className="text-[10px] opacity-80 uppercase font-mono">
              {axis}
              <input
                aria-label={`Target posisi ${axis}`}
                type="number"
                step="0.01"
                className="inspector-input"
                value={target[i]}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (Number.isFinite(value)) setTarget((old) => old.map((x, n) => n === i ? value : x) as [number, number, number]);
                }}
              />
            </label>
          ))}
        </div>
        <button
          className="small-button w-full mt-2 text-[11px] py-1.5"
          onClick={() => {
            const result = solvePositionIKDLS(robot.joints, joints, robot.home, target);
            if (!result.success) {
              setIkMessage(`Target belum tercapai (error ${result.positionError.toFixed(4)} m).`);
              return;
            }
            updateState(component.id, Object.fromEntries(result.angles.map((value, i) => [`joint${i}`, value])));
            setIkMessage(`IK selesai dalam ${result.iterations} iterasi.`);
          }}
        >
          Selesaikan IK posisi (DLS)
        </button>
        {ikMessage && <p role="status" className="mt-1 text-[10px] opacity-75">{ikMessage}</p>}
      </div>
      <p className="mt-1 text-[10px] opacity-60">Sudut joint memakai batas URDF-lite {robot.name}; pose dihitung dengan FK PoE.</p>
    </section>
  );
}
