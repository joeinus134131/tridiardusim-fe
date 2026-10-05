"use client";

import { aeroArm6Dof, eduArm3Dof, type RobotModel } from "@/lib/robotics/robots";
import type { CircuitComponent } from "@/lib/components/componentTypes";

const modelFor = (component: CircuitComponent): RobotModel =>
  component.typeId === "aero_arm_6dof" ? aeroArm6Dof : eduArm3Dof;

export function ActuatorJointPanel({
  component,
  robots,
  updateState,
}: {
  component: CircuitComponent;
  robots: CircuitComponent[];
  updateState: (id: string, update: Record<string, number | string | boolean>) => void;
}) {
  const robotId = String(component.state.coupledRobotId || "");
  const robot = robots.find((item) => item.id === robotId);
  const model = robot ? modelFor(robot) : null;
  const jointIndex = Math.max(0, Math.min((model?.joints.length || 1) - 1, Math.trunc(Number(component.state.coupledJointIndex) || 0)));
  const offset = Number(component.state.jointOffsetDeg) || 0;
  const direction = Number(component.state.jointDirection) === -1 ? -1 : 1;
  const isServo = component.typeId === "servo_sg90";
  const isDcMotor = component.typeId === "dc_motor";

  return (
    <section className="inspector-card" aria-label="Kopling aktuator ke joint robot">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-xs">Kopling ke joint robot</strong>
        <span className="text-[10px] opacity-60">1:1</span>
      </div>
      <label className="text-[11px] flex flex-col gap-1">
        <span>Lengan robot</span>
        <select
          aria-label="Lengan robot aktuator"
          className="inspector-input"
          value={robotId}
          onChange={(event) => updateState(component.id, { coupledRobotId: event.target.value })}
        >
          <option value="">Tidak dikopel</option>
          {robots.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      {robot && model && (
        <>
          <label className="text-[11px] flex flex-col gap-1 mt-2">
            <span>Joint</span>
            <select
              aria-label="Joint target aktuator"
              className="inspector-input"
              value={jointIndex}
              onChange={(event) => updateState(component.id, { coupledJointIndex: Number(event.target.value) })}
            >
              {model.joints.map((_, index) => <option key={index} value={index}>Joint {index + 1}</option>)}
            </select>
          </label>
          <label className="text-[11px] flex items-center justify-between gap-3 mt-2">
            <span>Offset (derajat)</span>
            <input
              aria-label="Offset joint aktuator"
              className="inspector-input w-20"
              type="number"
              min="-360"
              max="360"
              step="1"
              value={offset}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value) && value >= -360 && value <= 360) {
                  updateState(component.id, { jointOffsetDeg: value });
                }
              }}
            />
          </label>
          <label className="text-[11px] flex items-center justify-between gap-3 mt-2">
            <span>Arah gerak</span>
            <select
              aria-label="Arah joint aktuator"
              className="inspector-input w-28"
              value={direction}
              onChange={(event) => updateState(component.id, { jointDirection: Number(event.target.value) })}
            >
              <option value={1}>Normal</option>
              <option value={-1}>Terbalik</option>
            </select>
          </label>
        </>
      )}
      <p className="mt-2 text-[10px] opacity-60">
        {isServo
          ? "Servo 90° menjadi nol joint; gerak dibatasi rentang joint dan catu servo harus aktif."
          : isDcMotor
            ? "Sudut poros keluaran gearbox menjadi posisi joint secara kinematik; belum ada torsi balik atau dinamika link."
            : "Sudut stepper menjadi target joint; gerak dibatasi rentang URDF-lite."}
      </p>
    </section>
  );
}
