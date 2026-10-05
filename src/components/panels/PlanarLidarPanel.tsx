"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CircuitComponent } from "@/lib/components/componentTypes";
import { useSimulatorStore } from "@/store/useSimulatorStore";

export function PlanarLidarPanel({
  component,
  updateState,
}: {
  component: CircuitComponent;
  updateState: (id: string, update: Record<string, number | string | boolean>) => void;
}) {
  const frame = useSimulatorStore((state) => state.lidarFrames[component.id]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const range = Number(component.state.maxRangeMeters) || 12;
  const stats = useMemo(() => {
    if (!frame) return null;
    let hits = 0;
    let min = frame.maxRangeMeters;
    for (let i = 0; i < frame.sampleCount; i++) {
      if (!frame.hitMask[i]) continue;
      hits++;
      min = Math.min(min, frame.rangesMeters[i]);
    }
    return { hits, min };
  }, [frame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const size = 240;
    const center = size / 2;
    const maxRange = frame?.maxRangeMeters ?? range;
    const scale = (center - 12) / maxRange;
    canvas.width = size;
    canvas.height = size;
    context.clearRect(0, 0, size, size);
    context.fillStyle = "#07111c";
    context.fillRect(0, 0, size, size);
    context.strokeStyle = "rgba(148, 163, 184, 0.22)";
    context.lineWidth = 1;
    for (const fraction of [0.25, 0.5, 0.75, 1]) {
      context.beginPath();
      context.arc(center, center, (center - 12) * fraction, 0, Math.PI * 2);
      context.stroke();
    }
    context.beginPath();
    context.moveTo(center, 8);
    context.lineTo(center, size - 8);
    context.moveTo(8, center);
    context.lineTo(size - 8, center);
    context.stroke();
    if (!frame) return;
    for (let i = 0; i < frame.sampleCount; i++) {
      if (!frame.hitMask[i]) continue;
      const angle = (i / frame.sampleCount) * Math.PI * 2;
      const distance = frame.rangesMeters[i];
      const x = center + Math.sin(angle) * distance * scale;
      const y = center - Math.cos(angle) * distance * scale;
      const hue = Math.round(120 * (1 - distance / maxRange));
      context.fillStyle = `hsl(${hue} 90% 58%)`;
      context.beginPath();
      context.arc(x, y, 2.1, 0, Math.PI * 2);
      context.fill();
    }
  }, [frame, range]);

  return (
    <section className="inspector-card" aria-label="LiDAR planar 2D">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-xs">LiDAR Planar 2D</strong>
        <span className="text-[10px] opacity-60">360°</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] flex flex-col gap-1">
          <span>Sampel per putaran</span>
          <select
            aria-label="Jumlah sampel LiDAR"
            className="inspector-input"
            value={Number(component.state.sampleCount) === 720 ? 720 : 360}
            onChange={(event) => updateState(component.id, { sampleCount: Number(event.target.value) })}
          >
            <option value={360}>360</option>
            <option value={720}>720</option>
          </select>
        </label>
        <label className="text-[10px] flex flex-col gap-1">
          <span>Jarak maksimum: {range} m</span>
          <input
            aria-label="Jarak maksimum LiDAR"
            type="range"
            min="4"
            max="30"
            step="1"
            value={range}
            onChange={(event) => updateState(component.id, { maxRangeMeters: Number(event.target.value) })}
          />
        </label>
      </div>
      <canvas ref={canvasRef} className="w-full max-w-[240px] mx-auto mt-2 rounded aspect-square" />
      {frame && stats ? (
        <div className="mt-2 text-[10px] font-mono opacity-75">
          t={frame.capturedAtSimMs} ms · min={stats.hits ? stats.min.toFixed(2) : "—"} m · hit={stats.hits}/{frame.sampleCount}
        </div>
      ) : (
        <p className="mt-2 text-[10px] opacity-60">Scan pertama tersedia setelah simulasi berjalan.</p>
      )}
      <p className="mt-1 text-[10px] opacity-60">Satu scan 360° tiap 100 ms simulasi; tanpa hit dibaca sebagai jarak maksimum.</p>
    </section>
  );
}
