"use client";

import React from "react";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { useLanguage } from "@/i18n/LanguageContext";
import { world, type Vec } from "@/lib/components/placement";
import { WIRE_COLORS } from "@/lib/components/wiringUtils";
import { Trash2, X, Cable } from "lucide-react";

export function WireProperties() {
  const { t, lang } = useLanguage();
  const wire = useSimulatorStore((s) => s.wires.find((w) => w.id === s.selectedWireId));
  const all = useSimulatorStore((s) => s.components);
  const update = useSimulatorStore((s) => s.updateWire);
  const removeWire = useSimulatorStore((s) => s.removeWire);

  if (!wire) return null;

  const srcComp = all.find((c) => c.id === wire.sourceComponentId);
  const tgtComp = all.find((c) => c.id === wire.targetComponentId);

  const addPoint = () => {
    const a = srcComp, b = tgtComp;
    if (!a || !b) return;
    const startPin = a.pins.find((p) => p.id === wire.sourcePinId);
    const targetPin = b.pins.find((p) => p.id === wire.targetPinId);
    if (!startPin || !targetPin) return;

    const start = world(a, startPin.position);
    const end = world(b, targetPin.position);
    const path = wire.path || [];
    const from = path.at(-1) || start;
    update(wire.id, {
      path: [...path, from.map((v, i) => (v + end[i]) / 2 + (i === 1 ? 2 : 0)) as Vec],
    });
  };

  return (
    <div className="properties-content flex flex-col gap-3">
      {/* Header Card */}
      <div className="inspector-card flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div
            className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm shrink-0"
            style={{ backgroundColor: wire.color }}
          />
          <div>
            <h3 className="inspector-title flex items-center gap-1.5">
              <Cable size={14} className="text-sky-400" />
              <span>{t.wireProps.title}</span>
            </h3>
            <span className="inspector-subtitle">ID: {wire.id.slice(0, 8)}</span>
          </div>
        </div>
        <button
          aria-label={t.inspector.closeWireAria}
          onClick={() => useSimulatorStore.getState().selectWire(null)}
          className="text-xs p-1 opacity-60 hover:opacity-100 font-bold"
        >
          <X size={14} />
        </button>
      </div>

      {/* Terminal Connection Endpoints */}
      <div className="inspector-card text-xs flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">{lang === "id" ? "Dari Terminal:" : "From Terminal:"}</span>
          <span className="font-semibold text-slate-200">
            {srcComp?.name || "Part"} · {wire.sourcePinId}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">{lang === "id" ? "Ke Terminal:" : "To Terminal:"}</span>
          <span className="font-semibold text-slate-200">
            {tgtComp?.name || "Part"} · {wire.targetPinId}
          </span>
        </div>
      </div>

      {/* Wire Color Selection Card */}
      <div className="inspector-card flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-xs text-slate-200">{t.wireProps.colorLabel}</span>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              aria-label={t.wireProps.colorAria}
              value={wire.color}
              onChange={(e) => {
                update(wire.id, { color: e.target.value });
                useSimulatorStore.getState().setActiveWireColor(e.target.value);
              }}
              className="w-5 h-5 rounded-full cursor-pointer border border-white/30 bg-transparent p-0 overflow-hidden"
            />
            <span className="text-[11px] font-mono text-slate-400">{wire.color}</span>
          </div>
        </div>

        {/* 8 Standard Electronics Color Swatches */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {WIRE_COLORS.map((c) => {
            const isSelected = wire.color.toLowerCase() === c.value.toLowerCase();
            const colorLabel = lang === "id" ? c.name : c.enName;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  update(wire.id, { color: c.value });
                  useSimulatorStore.getState().setActiveWireColor(c.value);
                }}
                title={`${colorLabel} (${c.hint})`}
                className={`wire-swatch-btn ${isSelected ? "selected" : ""}`}
                style={{ backgroundColor: c.value }}
              />
            );
          })}
        </div>
      </div>

      {/* Routing & Bend Points Card */}
      <div className="inspector-card flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200">Routing Jalur</span>
          <span className="text-[11px] text-slate-400">
            {wire.path?.length ? `${wire.path.length} titik belok` : "Jalur Lengkung Otomatis"}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          {t.wireProps.hint}
        </p>
        <div className="flex gap-2 pt-1">
          <button
            className="small-button flex-1 text-xs py-1"
            disabled={(wire.path?.length || 0) >= 12}
            onClick={addPoint}
          >
            {t.wireProps.addBend}
          </button>
          <button
            className="small-button text-xs py-1"
            disabled={!wire.path?.length}
            onClick={() => update(wire.id, { path: undefined })}
          >
            {t.wireProps.resetStraight}
          </button>
        </div>
      </div>

      {/* Delete Wire Action Button */}
      <div className="pt-2">
        <button
          className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          onClick={() => removeWire(wire.id)}
        >
          <Trash2 size={13} />
          <span>{t.wireProps.deleteWire}</span>
        </button>
      </div>
    </div>
  );
}
