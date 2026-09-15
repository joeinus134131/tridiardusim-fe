"use client";
import React, { useState } from "react";
import { physicalInfo, ComponentDatasheet } from "@/lib/components/physical";

interface DatasheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialComponentKey?: string;
}

const componentLabels: Record<string, string> = {
  esp32_wroom: "ESP32-WROOM-32 (DevKitC V4)",
  arduino_uno: "Arduino Uno R3 DIP",
  breadboard: "Breadboard BB400",
  led_red: "Red LED 5mm (WP7113ID)",
  resistor_220: "Resistor 220Ω (CFR-25)",
  potentiometer: "Potensiometer 10kΩ (RK09K)",
  push_button: "Push Button 6x6mm (Omron B3F)",
  jumper: "Jumper Wire (ZW-MM-10)",
};

export function DatasheetModal({
  isOpen,
  onClose,
  initialComponentKey = "esp32_wroom",
}: DatasheetModalProps) {
  const [selectedKey, setSelectedKey] = useState<string>(
    initialComponentKey in physicalInfo ? initialComponentKey : "esp32_wroom"
  );

  // Sync with initialComponentKey if it changes
  React.useEffect(() => {
    if (initialComponentKey && initialComponentKey in physicalInfo) {
      setSelectedKey(initialComponentKey);
    }
  }, [initialComponentKey]);

  if (!isOpen) return null;

  const data: ComponentDatasheet = physicalInfo[selectedKey] || physicalInfo["esp32_wroom"];

  return (
    <div className="datasheet-modal-overlay" onClick={onClose}>
      <div
        className="datasheet-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="datasheet-title"
      >
        {/* Header */}
        <div className="datasheet-header">
          <div className="flex items-center gap-3">
            <div>
              <h2 id="datasheet-title" className="text-base font-bold text-white leading-snug">
                Dokumentasi & Datasheet Resmi Komponen
              </h2>
              <p className="text-xs text-slate-300">
                Data spesifikasi teknis dan rujukan manufaktur resmi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="datasheet-close-btn font-bold text-base"
            aria-label="Tutup datasheet"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="datasheet-body">
          {/* Component Selector Sidebar */}
          <aside className="datasheet-nav">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
              Katalog Komponen
            </span>
            {Object.keys(physicalInfo).map((key) => (
              <button
                key={key}
                className={`datasheet-nav-item ${selectedKey === key ? "active" : ""}`}
                onClick={() => setSelectedKey(key)}
              >
                {componentLabels[key] || key}
              </button>
            ))}
          </aside>

          {/* Component Details Panel */}
          <section className="datasheet-main">
            <div className="datasheet-card">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-700/80 pb-4">
                <div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-400/40 inline-block mb-1.5">
                    Pabrikan: {data.manufacturer}
                  </span>
                  <h3 className="text-xl font-bold text-white tracking-tight">{data.variant}</h3>
                </div>
                <a
                  href={data.source}
                  target="_blank"
                  rel="noreferrer"
                  className="datasheet-pdf-link flex items-center gap-1 font-semibold"
                >
                  <span>PDF / Rujukan Resmi</span>
                  <span>↗</span>
                </a>
              </div>

              {/* 4 Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
                <div className="datasheet-metric">
                  <span className="label">Dimensi Mekanik</span>
                  <span className="value">{data.dimensions}</span>
                </div>
                <div className="datasheet-metric">
                  <span className="label">Tegangan Operasional</span>
                  <span className="value">{data.operatingVoltage}</span>
                </div>
                <div className="datasheet-metric">
                  <span className="label">Batas / Rating Arus</span>
                  <span className="value">{data.currentRating}</span>
                </div>
                <div className="datasheet-metric">
                  <span className="label">Konfigurasi Terminal</span>
                  <span className="value">{data.pinoutSummary}</span>
                </div>
              </div>

              {/* Key Specifications List */}
              <div className="mt-5 p-3.5 bg-slate-800/60 rounded-lg border border-slate-700/80">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  Spesifikasi Teknis Pabrikan
                </h4>
                <ul className="datasheet-specs-list">
                  {data.specs.map((spec, i) => (
                    <li key={i} className="text-slate-200 leading-relaxed font-normal">
                      {spec}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Simulation Notes / Transparent Limits */}
              <div className="mt-4 p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-lg text-xs">
                <strong className="block font-bold text-amber-300 mb-1 flex items-center gap-1">
                  Batas Emulasi & Parameter Simulasi:
                </strong>
                <p className="text-amber-100/90 leading-relaxed">{data.limits}</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="datasheet-footer">
          <span className="text-xs text-slate-300 font-medium">
            100% parameter disinkronkan dengan spesifikasi pabrikan resmi tanpa rekayasa AI.
          </span>
          <button onClick={onClose} className="btn-primary font-medium px-4">
            Tutup Lembar Datasheet
          </button>
        </div>
      </div>
    </div>
  );
}
