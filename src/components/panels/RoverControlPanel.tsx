"use client";

import type { CircuitComponent } from "@/lib/components/componentTypes";
import { useSimulatorStore } from "@/store/useSimulatorStore";

export function RoverControlPanel({
  component,
  updateState,
}: {
  component: CircuitComponent;
  updateState: (id: string, update: Record<string, number | string | boolean>) => void;
}) {
  const simulationState = useSimulatorStore((state) => state.simulationState);
  const leftSpeed = Number(component.state.leftSpeed ?? 0);
  const rightSpeed = Number(component.state.rightSpeed ?? 0);
  const pan = Number(component.state.gimbalPan ?? 0);
  const tilt = Number(component.state.gimbalTilt ?? 0);
  const pose = [Number(component.state.x ?? 0), Number(component.state.z ?? 0)];
  const heading = Number(component.state.heading ?? 0);

  return (
    <section className="inspector-card" aria-label="Kontrol RoverBot-4WD">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-xs">Kontrol RoverBot</strong>
        <button
          className="small-button text-[10px] px-2 py-1"
          onClick={() => updateState(component.id, { leftSpeed: 0, rightSpeed: 0 })}
        >
          Stop
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {(["leftSpeed", "rightSpeed"] as const).map((key) => {
          const speed = key === "leftSpeed" ? leftSpeed : rightSpeed;
          const label = key === "leftSpeed" ? "Roda kiri" : "Roda kanan";
          return (
            <label key={key} className="text-[11px] flex flex-col gap-1">
              <span className="flex justify-between">
                <span>{label}</span><span className="font-mono">{speed.toFixed(2)} m/s</span>
              </span>
              <input
                aria-label={`Kecepatan ${label.toLowerCase()}`}
                type="range"
                min="-0.5"
                max="0.5"
                step="0.01"
                value={speed}
                onChange={(event) => updateState(component.id, { [key]: Number(event.target.value) })}
              />
            </label>
          );
        })}
        {(["gimbalPan", "gimbalTilt"] as const).map((key) => {
          const radians = key === "gimbalPan" ? pan : tilt;
          const label = key === "gimbalPan" ? "Pan kamera" : "Tilt kamera";
          return (
            <label key={key} className="text-[11px] flex flex-col gap-1">
              <span className="flex justify-between">
                <span>{label}</span><span className="font-mono">{(radians * 180 / Math.PI).toFixed(0)}°</span>
              </span>
              <input
                aria-label={label}
                type="range"
                min={key === "gimbalPan" ? -180 : -45}
                max={key === "gimbalPan" ? 180 : 45}
                step="1"
                value={radians * 180 / Math.PI}
                onChange={(event) => updateState(component.id, { [key]: Number(event.target.value) * Math.PI / 180 })}
              />
            </label>
          );
        })}
      </div>
      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px] font-mono opacity-80">
        x {pose[0].toFixed(3)} m · z {pose[1].toFixed(3)} m · θ {(heading * 180 / Math.PI).toFixed(1)}°
      </div>
      <p className="mt-1 text-[10px] opacity-60">
        {simulationState === "running" || simulationState === "paused"
          ? "Gerak dihitung dari kecepatan roda dengan fixed timestep simulasi 5 ms."
          : "Jalankan sketch untuk mengintegrasikan kecepatan roda pada waktu simulasi."}
      </p>
    </section>
  );
}
