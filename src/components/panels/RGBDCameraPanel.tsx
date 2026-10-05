"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CircuitComponent } from "@/lib/components/componentTypes";
import { useSimulatorStore } from "@/store/useSimulatorStore";

export function RGBDCameraPanel({
  component,
  updateState,
}: {
  component: CircuitComponent;
  updateState: (id: string, update: Record<string, number | string | boolean>) => void;
}) {
  const frame = useSimulatorStore((state) => state.rgbdFrames[component.id]);
  const colorRef = useRef<HTMLCanvasElement | null>(null);
  const depthRef = useRef<HTMLCanvasElement | null>(null);
  const width = Number(component.state.width) || 320;
  const height = Number(component.state.height) || 240;
  const depthStats = useMemo(() => {
    if (!frame) return null;
    let min = frame.far;
    let valid = 0;
    for (const depth of frame.depthMeters) {
      if (depth > frame.near && depth < frame.far - 0.01) {
        valid++;
        min = Math.min(min, depth);
      }
    }
    return { min, valid };
  }, [frame]);

  useEffect(() => {
    if (!frame) return;
    const colorCanvas = colorRef.current;
    const depthCanvas = depthRef.current;
    const colorContext = colorCanvas?.getContext("2d");
    const depthContext = depthCanvas?.getContext("2d");
    if (!colorCanvas || !depthCanvas || !colorContext || !depthContext) return;
    colorCanvas.width = frame.width;
    colorCanvas.height = frame.height;
    depthCanvas.width = frame.width;
    depthCanvas.height = frame.height;
    const image = colorContext.createImageData(frame.width, frame.height);
    const depthImage = depthContext.createImageData(frame.width, frame.height);
    for (let y = 0; y < frame.height; y++) {
      const sourceY = frame.height - 1 - y;
      for (let x = 0; x < frame.width; x++) {
        const sourcePixel = sourceY * frame.width + x;
        const source = sourcePixel * 4;
        const target = (y * frame.width + x) * 4;
        image.data[target] = frame.rgba[source];
        image.data[target + 1] = frame.rgba[source + 1];
        image.data[target + 2] = frame.rgba[source + 2];
        image.data[target + 3] = 255;
        const distance = frame.depthMeters[sourcePixel];
        const t = Math.max(0, Math.min(1, 1 - distance / frame.far));
        depthImage.data[target] = Math.round(255 * Math.max(0, Math.min(1, 1.5 * t)));
        depthImage.data[target + 1] = Math.round(255 * Math.max(0, Math.min(1, 1.5 - Math.abs(2 * t - 1) * 1.5)));
        depthImage.data[target + 2] = Math.round(255 * Math.max(0, Math.min(1, 1.5 * (1 - t))));
        depthImage.data[target + 3] = 255;
      }
    }
    colorContext.putImageData(image, 0, 0);
    depthContext.putImageData(depthImage, 0, 0);
  }, [frame]);

  return (
    <section className="inspector-card" aria-label="Kamera virtual RGB-D">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-xs">Kamera virtual RGB-D</strong>
        <span className="text-[10px] opacity-60">{width}×{height}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[10px] flex flex-col gap-1">
          <span>Resolusi</span>
          <select
            aria-label="Resolusi kamera RGB-D"
            className="inspector-input"
            value={`${width}x${height}`}
            onChange={(event) => {
              const [nextWidth, nextHeight] = event.target.value.split("x").map(Number);
              updateState(component.id, { width: nextWidth, height: nextHeight });
            }}
          >
            <option value="320x240">320×240</option>
            <option value="640x480">640×480</option>
          </select>
        </label>
        <label className="text-[10px] flex flex-col gap-1">
          <span>FOV: {Number(component.state.fov || 70)}°</span>
          <input
            aria-label="Field of view kamera RGB-D"
            type="range"
            min="30"
            max="110"
            step="1"
            value={Number(component.state.fov || 70)}
            onChange={(event) => updateState(component.id, { fov: Number(event.target.value) })}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <div className="text-[10px] mb-1 opacity-70">RGB</div>
          <canvas ref={colorRef} className="w-full rounded bg-black aspect-[4/3]" />
        </div>
        <div>
          <div className="text-[10px] mb-1 opacity-70">Depth (meter)</div>
          <canvas ref={depthRef} className="w-full rounded bg-black aspect-[4/3]" />
        </div>
      </div>
      {frame && depthStats ? (
        <div className="mt-2 text-[10px] font-mono opacity-75">
          t={frame.capturedAtSimMs} ms · min={depthStats.valid ? depthStats.min.toFixed(2) : "—"} m · valid={depthStats.valid}/{frame.width * frame.height}
          <br />fx={frame.intrinsics.fx.toFixed(1)} fy={frame.intrinsics.fy.toFixed(1)} cx={frame.intrinsics.cx.toFixed(1)} cy={frame.intrinsics.cy.toFixed(1)}
        </div>
      ) : (
        <p className="mt-2 text-[10px] opacity-60">Render awal kamera akan tersedia setelah scene digambar.</p>
      )}
      <p className="mt-1 text-[10px] opacity-60">Depth Float32 dalam meter, origin buffer kiri-bawah GPU; frame diperbarui tiap 100 ms simulasi. Kamera mengambil seluruh scene 3D.</p>
    </section>
  );
}
