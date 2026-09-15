'use client';
import { WireColors } from './WireColors';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { world, type Vec } from '@/lib/components/placement';
export function WireProperties() {
  const wire = useSimulatorStore((s) => s.wires.find((w) => w.id === s.selectedWireId));
  const all = useSimulatorStore((s) => s.components);
  const update = useSimulatorStore((s) => s.updateWire);
  const removeWire = useSimulatorStore((s) => s.removeWire);
  if (!wire) return null;

  const addPoint = () => {
    const a = all.find((c) => c.id === wire.sourceComponentId)!,
      b = all.find((c) => c.id === wire.targetComponentId)!;
    const start = world(a, a.pins.find((p) => p.id === wire.sourcePinId)!.position),
      end = world(b, b.pins.find((p) => p.id === wire.targetPinId)!.position);
    const path = wire.path || [];
    const from = path.at(-1) || start;
    update(wire.id, {
      path: [...path, from.map((v, i) => (v + end[i]) / 2 + (i === 1 ? 2 : 0)) as Vec],
    });
  };

  return (
    <div className="properties">
      <div className="panel-heading">
        <strong>Jalur Kabel Jumper</strong>
        <button
          aria-label="Tutup properti kabel"
          onClick={() => useSimulatorStore.getState().selectWire(null)}
        >
          ×
        </button>
      </div>
      <div className="property-body">
        <label>
          Warna kabel
          <input
            type="color"
            aria-label="Warna kabel terpilih"
            value={wire.color}
            onChange={(e) => update(wire.id, { color: e.target.value })}
          />
        </label>
        <WireColors onChange={(color) => update(wire.id, { color })} />
        <p>
          Atur lekukan kabel di kanvas atau sesuaikan koordinat. Ujung kabel rigid dan mengunci kuat pada pin.
        </p>
        <div className="flex gap-2">
          <button
            className="small-button"
            disabled={(wire.path?.length || 0) >= 12}
            onClick={addPoint}
          >
            + Titik lekukan
          </button>
          <button className="small-button" onClick={() => update(wire.id, { path: undefined })}>
            Reset jalur lurus
          </button>
        </div>
        {(wire.path || []).map((p, index) => (
          <fieldset key={index}>
            <legend>Tekukan {index + 1}</legend>
            {["X", "Y", "Z"].map((axis, i) => (
              <label key={axis}>
                {axis}
                <input
                  aria-label={`Tekukan ${index + 1} ${axis}`}
                  type="number"
                  step="0.254"
                  value={Number(p[i].toFixed(3))}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n) || Math.abs(n) > 10000) return;
                    update(wire.id, {
                      path: wire.path!.map((v, j) =>
                        j === index ? (v.map((x, k) => (k === i ? n : x)) as Vec) : v
                      ),
                    });
                  }}
                />
              </label>
            ))}
            <button
              className="small-button"
              onClick={() => update(wire.id, { path: wire.path!.filter((_, i) => i !== index) })}
            >
              Hapus tekukan {index + 1}
            </button>
          </fieldset>
        ))}

        <div className="pt-3 border-t border-slate-700/50 mt-4 flex items-center justify-between">
          <button
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
            onClick={() => removeWire(wire.id)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
            Hapus Kabel
          </button>
          <span className="text-[11px] text-slate-400 font-mono">Del / Backspace</span>
        </div>
      </div>
    </div>
  );
}
