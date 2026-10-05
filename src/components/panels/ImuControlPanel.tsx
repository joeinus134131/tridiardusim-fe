"use client";

import { useSimulatorStore } from "@/store/useSimulatorStore";
import type { CircuitComponent } from "@/lib/components/componentTypes";

export function ImuControlPanel({
  component,
  updateState,
}: {
  component: CircuitComponent;
  updateState: (id: string, update: Record<string, number | string | boolean>) => void;
}) {
  const frame = useSimulatorStore((state) => state.imuFrames[component.id]);
  const components = useSimulatorStore((state) => state.components);
  const robots = components.filter((item) =>
    ["edu_arm_3dof", "aero_arm_6dof", "rover_bot_4wd"].includes(item.typeId),
  );
  const sourceId = String(component.state.sourceComponentId ?? "");

  return (
    <section className="inspector-card" aria-label="IMU virtual enam sumbu">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-xs">IMU Virtual 6-Axis</strong>
        <span className="text-[10px] opacity-60">accelerometer + gyroscope</span>
      </div>
      <label className="text-[10px] flex flex-col gap-1">
        <span>Sumber pose</span>
        <select
          aria-label="Sumber pose IMU"
          className="inspector-input"
          value={sourceId}
          onChange={(event) => updateState(component.id, { sourceComponentId: event.target.value })}
        >
          <option value="">Sensor berdiri sendiri</option>
          {robots.map((robot) => <option key={robot.id} value={robot.id}>{robot.name}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <label className="text-[10px] flex flex-col gap-1 col-span-1">
          <span>Laju sampel</span>
          <select
            aria-label="Laju sampel IMU"
            className="inspector-input"
            value={Number(component.state.sampleRateHz) || 100}
            onChange={(event) => updateState(component.id, { sampleRateHz: Number(event.target.value) })}
          >
            <option value={25}>25 Hz</option>
            <option value={50}>50 Hz</option>
            <option value={100}>100 Hz</option>
          </select>
        </label>
        <label className="text-[10px] flex flex-col gap-1">
          <span>Noise accel: {Number(component.state.accelNoise ?? 0.02).toFixed(2)}</span>
          <input
            aria-label="Noise akselerometer"
            type="range"
            min="0"
            max="0.2"
            step="0.01"
            value={Number(component.state.accelNoise ?? 0.02)}
            onChange={(event) => updateState(component.id, { accelNoise: Number(event.target.value) })}
          />
        </label>
        <label className="text-[10px] flex flex-col gap-1">
          <span>Noise gyro: {Number(component.state.gyroNoise ?? 0.001).toFixed(3)}</span>
          <input
            aria-label="Noise giroskop"
            type="range"
            min="0"
            max="0.02"
            step="0.001"
            value={Number(component.state.gyroNoise ?? 0.001)}
            onChange={(event) => updateState(component.id, { gyroNoise: Number(event.target.value) })}
          />
        </label>
      </div>
      {frame ? (
        <div className="mt-2 rounded bg-slate-900/5 dark:bg-white/5 p-2 font-mono text-[10px] leading-relaxed">
          <div className="opacity-60">t={frame.capturedAtSimMs} ms · sample #{frame.sampleCount}</div>
          <div>Accel (m/s²): [{frame.accelerationMps2.map((value) => value.toFixed(3)).join(", ")}]</div>
          <div>Gyro (rad/s): [{frame.angularVelocityRadS.map((value) => value.toFixed(4)).join(", ")}]</div>
        </div>
      ) : (
        <p className="mt-2 text-[10px] opacity-60">Sampel pertama tersedia setelah scene berjalan.</p>
      )}
      <p className="mt-1 text-[10px] opacity-60">Gravity tercakup pada akselerometer. Derivasi kinematik dari pose yang tersedia; tidak memakai rigid-body physics.</p>
    </section>
  );
}
