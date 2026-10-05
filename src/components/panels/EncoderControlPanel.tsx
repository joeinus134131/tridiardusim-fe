"use client";

import { quadratureState } from "@/lib/simulation/vhal/encoder";
import type { CircuitComponent } from "@/lib/components/componentTypes";

export function EncoderControlPanel({
  component,
  motors,
  updateState,
}: {
  component: CircuitComponent;
  motors: CircuitComponent[];
  updateState: (id: string, update: Record<string, number | string | boolean>) => void;
}) {
  const angle = Number(component.state.angle ?? 0);
  const ppr = Number(component.state.pulsesPerRevolution ?? 100);
  const signal = quadratureState(angle, ppr);
  return (
    <section className="inspector-card" aria-label="Kontrol encoder kuadratur">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-xs">Encoder A/B kuadratur</strong>
        <span className={`text-[10px] ${component.state.isPowered ? "text-emerald-600" : "opacity-60"}`}>
          {component.state.isPowered ? "Berdaya" : "Belum berdaya"}
        </span>
      </div>
      <label className="text-[11px] flex flex-col gap-1">
        <span className="flex justify-between"><span>Sudut poros</span><span className="font-mono">{(angle * 180 / Math.PI).toFixed(1)}°</span></span>
        <input
          aria-label="Sudut poros encoder"
          type="range"
          min="-360"
          max="360"
          step="0.1"
          disabled={Boolean(component.state.coupledMotorId)}
          value={angle * 180 / Math.PI}
          onChange={(event) => updateState(component.id, { angle: Number(event.target.value) * Math.PI / 180 })}
        />
      </label>
      <label className="text-[11px] flex items-center justify-between gap-3 mt-2">
        <span>Pulses per revolution (A)</span>
        <input
          aria-label="Pulses per revolution encoder"
          className="inspector-input w-20"
          type="number"
          min="1"
          max="100000"
          step="1"
          value={ppr}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isInteger(value) && value >= 1 && value <= 100000) {
              updateState(component.id, { pulsesPerRevolution: value });
            }
          }}
        />
      </label>
      <label className="text-[11px] flex flex-col gap-1 mt-2">
        <span>Kopel mekanis ke motor</span>
        <select
          aria-label="Motor kopling encoder"
          className="inspector-input"
          value={String(component.state.coupledMotorId || "")}
          onChange={(event) => updateState(component.id, { coupledMotorId: event.target.value })}
        >
          <option value="">Kontrol sudut manual</option>
          {motors.map((motor) => <option key={motor.id} value={motor.id}>{motor.name}</option>)}
        </select>
      </label>
      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px] font-mono opacity-80">
        Count x4: {signal.count} · A: {signal.channelA} · B: {signal.channelB}
      </div>
      <p className="mt-1 text-[10px] opacity-60">PPR adalah siklus kanal A per putaran; count menghitung keempat edge A/B. Gunakan attachInterrupt untuk membaca edge pada GPIO Uno 2/3 atau GPIO ESP32 yang valid.</p>
    </section>
  );
}
