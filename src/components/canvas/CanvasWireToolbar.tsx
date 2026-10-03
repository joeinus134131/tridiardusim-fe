"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { useLanguage } from "@/i18n/LanguageContext";
import { WIRE_COLORS } from "@/lib/components/wiringUtils";
import {
  Palette,
  X,
  Trash2,
  Zap,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export function CanvasWireToolbar() {
  const { t, lang } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const wiringState = useSimulatorStore((s) => s.wiringState);
  const activeWireColor = useSimulatorStore((s) => s.activeWireColor || "#3b82f6");
  const setActiveWireColor = useSimulatorStore((s) => s.setActiveWireColor);
  const cancelWiring = useSimulatorStore((s) => s.cancelWiring);

  const selectedWireId = useSimulatorStore((s) => s.selectedWireId);
  const wires = useSimulatorStore((s) => s.wires);
  const components = useSimulatorStore((s) => s.components);
  const removeWire = useSimulatorStore((s) => s.removeWire);
  const selectWire = useSimulatorStore((s) => s.selectWire);

  const selectedWire = selectedWireId
    ? wires.find((w) => w.id === selectedWireId)
    : null;

  // Close popover when clicking outside
  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [expanded]);

  // Keybindings (Escape to cancel wiring/deselect, 1-8 for quick colors)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "Escape") {
        if (wiringState.active) {
          cancelWiring();
        } else if (selectedWireId) {
          selectWire(null);
        } else if (expanded) {
          setExpanded(false);
        }
      }

      // Quick numbers 1-8 for wire colors
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 8) {
        const option = WIRE_COLORS[num - 1];
        if (option) {
          setActiveWireColor(option.value);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [wiringState.active, selectedWireId, expanded, cancelWiring, selectWire, setActiveWireColor]);

  // Color selection handler
  const handleColorSelect = (colorValue: string) => {
    setActiveWireColor(colorValue);
  };

  // 1. STATE: WIRING IS ACTIVE
  if (wiringState.active) {
    const srcComp = components.find((c) => c.id === wiringState.sourceComponentId);
    const srcPin = srcComp?.pins.find((p) => p.id === wiringState.sourcePinId);
    const isSnapped = !!wiringState.snappedPin;

    return (
      <div
        className="canvas-wire-toolbar active-wiring"
        data-tour="wire-toolbar"
      >
        {/* Status Pill */}
        <div className="flex items-center gap-2 pr-2 border-r border-slate-700/60">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <div className="text-[11px] leading-tight flex flex-col">
            <span className="font-semibold text-slate-100 flex items-center gap-1">
              <Zap size={11} className="text-amber-400 fill-amber-400" />
              <span>{srcComp?.name || "Part"}:{srcPin?.name || wiringState.sourcePinId}</span>
              <span className="text-slate-400">→</span>
              {isSnapped ? (
                <span className="text-emerald-400 font-bold">
                  ✨ {wiringState.snappedPin?.componentName}:{wiringState.snappedPin?.pinName}
                </span>
              ) : (
                <span className="text-sky-300 italic">{t.wireToolbar.toTarget}</span>
              )}
            </span>
            <span className="text-[10px] text-slate-400">
              {isSnapped ? t.wireToolbar.clickToConnect : "Tarik mouse ke pin tujuan"}
            </span>
          </div>
        </div>

        {/* Color Palette Buttons */}
        <div className="flex items-center gap-1.5 px-1">
          {WIRE_COLORS.map((c, idx) => {
            const isSelected = activeWireColor.toLowerCase() === c.value.toLowerCase();
            const colorLabel = lang === "id" ? c.name : c.enName;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleColorSelect(c.value)}
                title={`${colorLabel} (${c.hint}) [${idx + 1}]`}
                className={`wire-swatch-btn ${isSelected ? "selected" : ""}`}
                style={{ backgroundColor: c.value }}
              >
                {isSelected && (
                  <Check
                    size={11}
                    className={c.id === "white" || c.id === "yellow" ? "text-slate-900" : "text-white"}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Cancel Button */}
        <button
          onClick={cancelWiring}
          className="ml-1 px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 border border-rose-500/30 text-[11px] font-medium flex items-center gap-1 transition-colors"
          title="Batal menarik kabel (Esc)"
        >
          <X size={12} />
          <span>{t.wireToolbar.cancel}</span>
        </button>
      </div>
    );
  }

  // 2. STATE: A WIRE IS SELECTED
  if (selectedWire) {
    const srcComp = components.find((c) => c.id === selectedWire.sourceComponentId);
    const tgtComp = components.find((c) => c.id === selectedWire.targetComponentId);

    return (
      <div
        className="canvas-wire-toolbar selected-wire"
        data-tour="wire-toolbar"
      >
        {/* Wire Info */}
        <div className="flex items-center gap-2 pr-2 border-r border-slate-700/60">
          <div
            className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
            style={{ backgroundColor: selectedWire.color }}
          />
          <div className="text-[11px] leading-tight flex flex-col">
            <span className="font-semibold text-slate-100">
              {t.wireToolbar.selectedWire}
            </span>
            <span className="text-[10px] text-slate-400">
              {srcComp?.name}:{selectedWire.sourcePinId} ↔ {tgtComp?.name}:{selectedWire.targetPinId}
            </span>
          </div>
        </div>

        {/* Color Palette to change selected wire color */}
        <div className="flex items-center gap-1.5 px-1">
          {WIRE_COLORS.map((c, idx) => {
            const isSelected = selectedWire.color.toLowerCase() === c.value.toLowerCase();
            const colorLabel = lang === "id" ? c.name : c.enName;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleColorSelect(c.value)}
                title={`${colorLabel} (${c.hint}) [${idx + 1}]`}
                className={`wire-swatch-btn ${isSelected ? "selected" : ""}`}
                style={{ backgroundColor: c.value }}
              >
                {isSelected && (
                  <Check
                    size={11}
                    className={c.id === "white" || c.id === "yellow" ? "text-slate-900" : "text-white"}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Delete wire button */}
        <button
          onClick={() => removeWire(selectedWire.id)}
          className="p-1.5 rounded hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
          title={t.wireToolbar.deleteWire}
        >
          <Trash2 size={13} />
        </button>

        {/* Deselect button */}
        <button
          onClick={() => selectWire(null)}
          className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
          title={t.wireToolbar.close}
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  // 3. STATE: IDLE (Compact Floating Dock Pill at bottom-center)
  const activeColorObj = WIRE_COLORS.find(
    (c) => c.value.toLowerCase() === activeWireColor.toLowerCase(),
  );

  return (
    <div
      ref={popoverRef}
      className="canvas-wire-toolbar idle"
      data-tour="wire-toolbar"
    >
      {/* Floating Popover Palette (Opens cleanly above pill) */}
      {expanded && (
        <div className="canvas-wire-palette-popover">
          <div className="text-[10px] text-slate-400 font-medium pr-1">
            {lang === "id" ? "Warna Kabel:" : "Wire Color:"}
          </div>
          {WIRE_COLORS.map((c, idx) => {
            const isSelected =
              activeWireColor.toLowerCase() === c.value.toLowerCase();
            const colorLabel = lang === "id" ? c.name : c.enName;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  handleColorSelect(c.value);
                  setExpanded(false);
                }}
                title={`${colorLabel} (${c.hint}) [${idx + 1}]`}
                className={`wire-swatch-btn ${isSelected ? "selected" : ""}`}
                style={{ backgroundColor: c.value }}
              >
                {isSelected && (
                  <Check
                    size={11}
                    className={
                      c.id === "white" || c.id === "yellow"
                        ? "text-slate-900"
                        : "text-white"
                    }
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Compact Dock Pill Button */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 hover:opacity-90 transition-opacity text-slate-200 cursor-pointer"
        title={t.wireToolbar.quickColorHint}
      >
        <Palette size={13} className="text-sky-400" />
        <span className="text-[11px] font-medium">
          {t.wireToolbar.wireColor}:
        </span>
        <div
          className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
          style={{ backgroundColor: activeWireColor }}
        />
        <span className="text-[11px] text-slate-300 font-medium">
          {lang === "id" ? activeColorObj?.name : activeColorObj?.enName}
        </span>
        {expanded ? (
          <ChevronDown size={12} className="text-slate-400" />
        ) : (
          <ChevronUp size={12} className="text-slate-400" />
        )}
      </button>
    </div>
  );
}
