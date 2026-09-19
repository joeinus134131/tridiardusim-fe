'use client';
import { WireColors } from './WireColors';
import { useState } from 'react';
import { ExternalLink, RotateCcw, RotateCw, Compass, Zap, Disc, ShieldCheck, AlertTriangle, Activity } from 'lucide-react';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { contacts, world, type Vec } from '@/lib/components/placement';
import type { CircuitComponent } from '@/lib/components/componentTypes';

export function PhysicalProperties({
  component: c,
  onOpenDatasheet,
}: {
  component: CircuitComponent;
  onOpenDatasheet?: (key: string) => void;
}) {
  const all = useSimulatorStore((s) => s.components);
  const [boardId, setBoardId] = useState('');
  const [holeId, setHoleId] = useState(contacts(c, all)[0]?.holeId || 't10_2');
  const boards = all.filter((x) => x.typeId === 'breadboard');
  const board = boards.find((b) => b.id === boardId) || boards[0];
  const mounted = contacts(c, all);
  const colors: Record<string, string> = {
    red: '#ef4444',
    black: '#171717',
    blue: '#3b82f6',
    green: '#22c55e',
    yellow: '#eab308',
    white: '#f5f5f5',
    orange: '#f97316',
    purple: '#a855f7',
  };
  const state = useSimulatorStore.getState;

  const pitchDeg = Math.round((c.rotation[0] * 180) / Math.PI);
  const rawYaw = Math.round((c.rotation[1] * 180) / Math.PI);
  const yawDeg = ((rawYaw % 360) + 360) % 360;
  const rollDeg = Math.round((c.rotation[2] * 180) / Math.PI);

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="inspector-badge">
          Rigid Body · Collision On
        </span>
        {onOpenDatasheet && (
          <button
            type="button"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
            onClick={() => onOpenDatasheet(c.typeId.startsWith('jumper_') ? 'jumper' : c.typeId)}
          >
            <span>Datasheet Asli</span>
            <ExternalLink size={12} />
          </button>
        )}
      </div>

      {/* 3D Orientation & Tilt Panel */}
      <details open className="inspector-details">
        <summary className="flex items-center justify-between">
          <span className="font-semibold text-xs flex items-center gap-1.5">
            <Compass size={13} className="text-sky-600 dark:text-sky-400" />
            Orientasi & Kemiringan Fisik (3D Pose)
          </span>
          <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700/60 shadow-xs">
            {pitchDeg}° / {yawDeg}°
          </span>
        </summary>

        <p className="text-[11px] opacity-80 mt-1 mb-2 leading-tight">
          Sesuaikan sudut kemiringan dan arah hadap komponen agar pin mengarah horizontal, diagonal, atau tegak seperti kondisi pemasangan nyata di meja kerja.
        </p>

        {/* Quick Presets */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          <button
            type="button"
            className={`px-2 py-1.5 rounded-md text-[11px] font-medium border transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
              pitchDeg === 0
                ? 'border-sky-500 bg-sky-100/90 dark:bg-sky-500/20 text-sky-900 dark:text-sky-100 font-bold shadow-xs'
                : 'border-slate-300 dark:border-slate-700/80 bg-white hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300'
            }`}
            onClick={() => {
              state().updateComponentRotation(c.id, [0, c.rotation[1], 0]);
            }}
          >
            <span className={`font-semibold ${pitchDeg === 0 ? 'text-sky-800 dark:text-sky-300' : 'text-slate-800 dark:text-slate-200'}`}>Tegak (0°)</span>
            <span className={`text-[9px] ${pitchDeg === 0 ? 'text-sky-700 dark:text-sky-300/80 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>Vertikal</span>
          </button>
          <button
            type="button"
            className={`px-2 py-1.5 rounded-md text-[11px] font-medium border transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
              pitchDeg === -90
                ? 'border-amber-500 bg-amber-100/90 dark:bg-amber-500/20 text-amber-900 dark:text-amber-100 font-bold shadow-xs'
                : 'border-slate-300 dark:border-slate-700/80 bg-white hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300'
            }`}
            onClick={() => {
              state().updateComponentRotation(c.id, [-Math.PI / 2, c.rotation[1], 0]);
            }}
          >
            <span className={`font-semibold ${pitchDeg === -90 ? 'text-amber-800 dark:text-amber-300' : 'text-slate-800 dark:text-slate-200'}`}>Tidur (-90°)</span>
            <span className={`text-[9px] ${pitchDeg === -90 ? 'text-amber-700 dark:text-amber-300/80 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>Horizontal</span>
          </button>
          <button
            type="button"
            className={`px-2 py-1.5 rounded-md text-[11px] font-medium border transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
              pitchDeg === -45
                ? 'border-emerald-500 bg-emerald-100/90 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-100 font-bold shadow-xs'
                : 'border-slate-300 dark:border-slate-700/80 bg-white hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300'
            }`}
            onClick={() => {
              state().updateComponentRotation(c.id, [-Math.PI / 4, c.rotation[1], 0]);
            }}
          >
            <span className={`font-semibold ${pitchDeg === -45 ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}`}>Miring (45°)</span>
            <span className={`text-[9px] ${pitchDeg === -45 ? 'text-emerald-700 dark:text-emerald-300/80 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>Diagonal</span>
          </button>
        </div>

        {/* Quick Rotation Buttons */}
        <div className="grid grid-cols-2 gap-1.5 mb-2.5">
          <button
            type="button"
            className="px-2 py-1.5 rounded-md text-[11px] font-medium border border-slate-300 dark:border-slate-700/80 bg-white hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            onClick={() => {
              state().updateComponentRotation(c.id, [c.rotation[0], c.rotation[1] + Math.PI / 2, c.rotation[2]]);
            }}
          >
            <RotateCw size={11} className="text-indigo-600 dark:text-indigo-400" />
            <span>Putar +90°</span>
          </button>
          <button
            type="button"
            className="px-2 py-1.5 rounded-md text-[11px] font-medium border border-slate-300 dark:border-slate-700/80 bg-white hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            onClick={() => {
              state().updateComponentRotation(c.id, [c.rotation[0], c.rotation[1] + Math.PI, c.rotation[2]]);
            }}
          >
            <RotateCcw size={11} className="text-purple-600 dark:text-purple-400" />
            <span>Balik 180°</span>
          </button>
        </div>

        {/* Pitch Slider */}
        <label className="flex flex-col text-[11px] gap-1 mb-2">
          <div className="flex justify-between items-center">
            <span className="opacity-80">Kemiringan Pitch (Depan/Rebah):</span>
            <span className="font-mono text-xs font-bold text-sky-700 dark:text-sky-400">
              {pitchDeg}°
            </span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            step="5"
            value={pitchDeg}
            className="w-full cursor-pointer accent-blue-600 dark:accent-blue-500"
            onChange={(e) => {
              const deg = Number(e.target.value);
              state().updateComponentRotation(c.id, [(deg * Math.PI) / 180, c.rotation[1], c.rotation[2]]);
            }}
          />
        </label>

        {/* Yaw Slider */}
        <label className="flex flex-col text-[11px] gap-1 mb-1">
          <div className="flex justify-between items-center">
            <span className="opacity-80">Arah Hadap Yaw (Putaran 360°):</span>
            <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400">
              {yawDeg}°
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="5"
            value={yawDeg}
            className="w-full cursor-pointer accent-indigo-600 dark:accent-indigo-500"
            onChange={(e) => {
              const deg = Number(e.target.value);
              state().updateComponentRotation(c.id, [c.rotation[0], (deg * Math.PI) / 180, c.rotation[2]]);
            }}
          />
        </label>
      </details>

      {['resistor_220', 'led_red', 'potentiometer', 'push_button', 'esp32_wroom', 'oled_ssd1306', 'lcd1602_i2c', 'dht11', 'hcsr04', 'capacitor_universal'].includes(c.typeId) && (
        <details open className="inspector-details">
          <summary>
            Koneksi Breadboard ({mounted.length ? `${mounted.length} Pin Tersambung` : 'Belum Tertancap'})
          </summary>
          <p className="text-[11px] opacity-80 mt-1 mb-2 leading-tight">
            {mounted.length
              ? `${mounted.length} kaki komponen tertancap pas pada lubang breadboard.`
              : 'Drag langsung komponen ke atas breadboard atau pilih lubang target di bawah ini.'}
          </p>
          {board && (
            <div className="flex flex-col gap-1.5">
              <select
                aria-label="Target lubang breadboard"
                value={holeId}
                onChange={(e) => setHoleId(e.target.value)}
                className="w-full text-xs font-mono px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {board.pins.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="small-button text-xs py-1"
                onClick={() => {
                  const targetHole = board.pins.find((p) => p.id === holeId);
                  if (!targetHole) return;
                  const holePos = world(board, targetHole.position);
                  const firstPinPos = world(c, c.pins[0].position);
                  const minPinY = Math.min(...c.pins.map((p) => p.position[1]));
                  const targetY = 1.71 - minPinY - 0.35;
                  state().updateComponentPosition(c.id, [
                    c.position[0] + (holePos[0] - firstPinPos[0]),
                    targetY,
                    c.position[2] + (holePos[2] - firstPinPos[2]),
                  ]);
                }}
              >
                Tancapkan ke Lubang Ini
              </button>
            </div>
          )}
          {c.typeId === 'resistor_220' && (
            <p className="text-[10px] opacity-70 mt-1">
              Kaki resistor presisi pitch 10.16 mm (4 lubang). Geser ke luar breadboard untuk melepas.
            </p>
          )}
          {c.typeId === 'capacitor_universal' && (
            <p className="text-[10px] opacity-70 mt-1">
              Kaki kapasitor pitch 2.54 mm (1 baris lubang berdampingan). Anoda (+) di pin A, Katoda (-) di pin C.
            </p>
          )}
          {c.typeId === 'oled_ssd1306' && (
            <p className="text-[10px] opacity-70 mt-1">
              Header 4-pin (GND, VCC, SCL, SDA) presisi pitch 2.54 mm. Dapat langsung ditancapkan ke 4 kolom breadboard berdampingan.
            </p>
          )}
        </details>
      )}

      {c.typeId === 'capacitor_universal' && (
        <div className="inspector-card flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-1.5">
              <Zap size={15} className="text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Kapasitor Universal Adaptif
              </span>
            </div>
            {c.state.status === 'overvoltage' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1 animate-pulse">
                <AlertTriangle size={11} className="text-rose-600 dark:text-rose-400" />
                Overvoltage!
              </span>
            ) : c.state.status === 'reversed' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1 animate-pulse">
                <AlertTriangle size={11} className="text-amber-600 dark:text-amber-400" />
                Polaritas Terbalik
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-400" />
                Aman (Normal)
              </span>
            )}
          </div>

          {/* Subtype Selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mb-1 block">
              Tipe Dielektrik & Konstruksi Fisik
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                className={`px-2.5 py-2 rounded-md text-[11px] border text-left transition-all cursor-pointer ${
                  (c.state.subType || 'electrolytic') === 'electrolytic'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-900 dark:text-sky-100 font-bold shadow-xs'
                    : 'border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}
                onClick={() => {
                  state().updateComponentState(c.id, { subType: 'electrolytic' });
                }}
              >
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <Zap size={13} className="text-sky-600 dark:text-sky-400 shrink-0" />
                  <span>Elektrolit (Elco)</span>
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 leading-tight">
                  Berpolaritas (+/-), kaleng silinder berventilasi.
                </div>
              </button>

              <button
                type="button"
                className={`px-2.5 py-2 rounded-md text-[11px] border text-left transition-all cursor-pointer ${
                  c.state.subType === 'ceramic'
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-100 font-bold shadow-xs'
                    : 'border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                }`}
                onClick={() => {
                  state().updateComponentState(c.id, { subType: 'ceramic' });
                }}
              >
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <Disc size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Keramik (Disc)</span>
                </div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 leading-tight">
                  Non-polaritas, cakram pipih kode EIA 3-digit.
                </div>
              </button>
            </div>
          </div>

          {/* Capacitance Value & Unit */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                Kapasitansi Nominal
              </label>
              <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400">
                {Number(c.state.displayValue ?? 470)} {String(c.state.unit || 'µF')}
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="number"
                min={0.1}
                max={100000}
                className="w-full text-xs font-mono px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs"
                value={Number(c.state.displayValue ?? 470)}
                onChange={(e) => {
                  const val = Math.max(0.01, Number(e.target.value) || 1);
                  const unit = String(c.state.unit || 'µF');
                  const mult = unit === 'pF' ? 1e-12 : unit === 'nF' ? 1e-9 : unit === 'mF' ? 1e-3 : 1e-6;
                  state().updateComponentState(c.id, {
                    displayValue: val,
                    capacitance: val * mult,
                  });
                }}
              />
              <select
                className="text-xs font-semibold px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs"
                value={String(c.state.unit || 'µF')}
                onChange={(e) => {
                  const unit = e.target.value;
                  const val = Number(c.state.displayValue ?? 470);
                  const mult = unit === 'pF' ? 1e-12 : unit === 'nF' ? 1e-9 : unit === 'mF' ? 1e-3 : 1e-6;
                  state().updateComponentState(c.id, {
                    unit,
                    capacitance: val * mult,
                  });
                }}
              >
                <option value="pF">pF</option>
                <option value="nF">nF</option>
                <option value="µF">µF</option>
                <option value="mF">mF</option>
              </select>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {[
                { label: '100nF', val: 100, unit: 'nF', cap: 100e-9 },
                { label: '1µF', val: 1, unit: 'µF', cap: 1e-6 },
                { label: '10µF', val: 10, unit: 'µF', cap: 10e-6 },
                { label: '47µF', val: 47, unit: 'µF', cap: 47e-6 },
                { label: '100µF', val: 100, unit: 'µF', cap: 100e-6 },
                { label: '220µF', val: 220, unit: 'µF', cap: 220e-6 },
                { label: '470µF', val: 470, unit: 'µF', cap: 470e-6 },
                { label: '1000µF', val: 1000, unit: 'µF', cap: 1000e-6 },
                { label: '2200µF', val: 2200, unit: 'µF', cap: 2200e-6 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                    Number(c.state.displayValue) === p.val && c.state.unit === p.unit
                      ? 'bg-sky-600 text-white font-bold border-sky-600 shadow-xs'
                      : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                  }`}
                  onClick={() => {
                    state().updateComponentState(c.id, {
                      displayValue: p.val,
                      unit: p.unit,
                      capacitance: p.cap,
                    });
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rated Working Voltage */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                Tegangan Kerja Maksimum (WV)
              </label>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                {Number(c.state.ratedVoltage || 25)} Volt
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[6.3, 10, 16, 25, 35, 50, 63, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`text-[10px] py-1 rounded border font-mono font-semibold transition-all cursor-pointer ${
                    Number(c.state.ratedVoltage || 25) === v
                      ? 'bg-amber-600 text-white font-bold border-amber-600 shadow-xs'
                      : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                  }`}
                  onClick={() => {
                    state().updateComponentState(c.id, { ratedVoltage: v });
                  }}
                >
                  {v}V
                </button>
              ))}
            </div>
            <p className="text-[9.5px] text-slate-600 dark:text-slate-400 mt-1">
              Ukuran bodi kaleng 3D membesar proporsional mengikuti kapasitas dan tegangan kerja.
            </p>
          </div>

          {/* ESR (Equivalent Series Resistance) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                Resistansi Seri Ekivalen (ESR)
              </label>
              <span className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300">
                {Number(c.state.esr || 0.1).toFixed(2)} Ω
              </span>
            </div>
            <input
              type="range"
              min={0.01}
              max={1.5}
              step={0.01}
              value={Number(c.state.esr || 0.1)}
              className="w-full accent-sky-500 cursor-pointer"
              onChange={(e) => {
                state().updateComponentState(c.id, { esr: Number(e.target.value) });
              }}
            />
          </div>

          {/* Live Physical Telemetry */}
          <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-2.5 flex flex-col gap-1.5 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] font-bold border-b border-slate-200 dark:border-slate-800 pb-1.5">
              <span className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                <Activity size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Telemetri Fisika Rangkaian</span>
              </span>
              <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400">Q = C·V</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Tegangan Plat (V_C)</div>
                <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                  {Number(c.state.voltage || 0).toFixed(2)} V
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Arus Aliran (I_C)</div>
                <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                  {Number(c.state.currentMa || 0).toFixed(2)} mA
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Muatan Tersimpan (Q)</div>
                <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                  {Number(c.state.chargeU_C || 0).toFixed(1)} µC
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Energi Kapasitor (E)</div>
                <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                  {Number(c.state.energy_mJ || 0).toFixed(3)} mJ
                </div>
              </div>
            </div>

            {/* Meter Bar (% of rated voltage) */}
            <div className="mt-1">
              <div className="flex justify-between text-[9.5px] text-slate-600 dark:text-slate-400 mb-0.5 font-mono">
                <span>Beban Dielektrik</span>
                <span className="font-bold">
                  {(
                    (Math.abs(Number(c.state.voltage || 0)) /
                      Math.max(1, Number(c.state.ratedVoltage || 25))) *
                    100
                  ).toFixed(0)}
                  %
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    c.state.status === 'overvoltage'
                      ? 'bg-rose-500'
                      : c.state.status === 'reversed'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (Math.abs(Number(c.state.voltage || 0)) /
                        Math.max(1, Number(c.state.ratedVoltage || 25))) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {c.typeId === 'led_red' && (
        <div className="inspector-card flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold">Pilihan Warna LED (5mm)</span>
            <span className="text-[11px] font-mono uppercase opacity-75">
              {String(c.state.color || '#ef4444')}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { name: 'Merah', color: '#ef4444' },
              { name: 'Hijau', color: '#22c55e' },
              { name: 'Biru', color: '#3b82f6' },
              { name: 'Kuning', color: '#eab308' },
              { name: 'Oranye', color: '#f97316' },
              { name: 'Putih', color: '#f8fafc' },
              { name: 'Ungu', color: '#a855f7' },
              { name: 'Cyan', color: '#06b6d4' },
            ].map((swatch) => (
              <button
                key={swatch.color}
                type="button"
                className={`px-2 py-1.5 rounded text-[11px] font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                  String(c.state.color || '#ef4444').toLowerCase() === swatch.color.toLowerCase()
                    ? 'border-blue-500 bg-blue-100/90 dark:bg-blue-500/20 text-blue-900 dark:text-blue-100 font-bold shadow-xs'
                    : 'border-slate-300 dark:border-slate-700/60 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                }`}
                onClick={() => state().updateComponentState(c.id, { color: swatch.color })}
              >
                <span
                  className="w-3 h-3 rounded-full border border-black/30 shadow-inner shrink-0"
                  style={{ backgroundColor: swatch.color }}
                />
                <span className="truncate">{swatch.name}</span>
              </button>
            ))}
          </div>
          <label className="flex justify-between items-center text-xs mt-1 pt-1.5 border-t border-slate-700/40">
            <span>Warna Kustom Hex</span>
            <input
              type="color"
              className="w-8 h-6 rounded cursor-pointer border border-slate-600"
              value={String(c.state.color || '#ef4444')}
              onChange={(e) => state().updateComponentState(c.id, { color: e.target.value })}
            />
          </label>
        </div>
      )}

      {c.typeId === 'oled_ssd1306' && (
        <div className="inspector-card flex flex-col gap-2.5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold">Tampilan Layar OLED 0.96"</span>
            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border shadow-xs ${
                c.state.isPowered !== false
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                  : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40'
              }`}
            >
              {c.state.isPowered !== false ? 'Daya 3.3V-5V OK' : 'Belum Ada Daya'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] opacity-80">Preset Gambar & Grafik:</span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'logo', label: 'Logo' },
                { id: 'circuit', label: 'Sirkuit' },
                { id: 'gauge', label: 'Gauge' },
                { id: 'invader', label: 'Retro 8-Bit' },
                { id: 'custom', label: 'Teks Bebas' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`px-2 py-1 text-[11px] rounded border transition-colors cursor-pointer ${
                    (c.state.image || 'logo') === p.id
                      ? 'border-sky-500 bg-sky-100/90 dark:bg-sky-500/20 font-bold text-sky-900 dark:text-sky-200 shadow-xs'
                      : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                  }`}
                  onClick={() => state().updateComponentState(c.id, { image: p.id })}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] opacity-80">Teks / Karakter Tampilan:</span>
            <textarea
              rows={3}
              className="inspector-input text-xs font-mono resize-none leading-relaxed p-2"
              placeholder="Ketik pesan untuk OLED..."
              value={String(c.state.text || '')}
              onChange={(e) =>
                state().updateComponentState(c.id, {
                  text: e.target.value,
                  image: 'custom',
                })
              }
            />
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-slate-700/40">
            <button
              type="button"
              className="small-button text-xs py-1"
              onClick={() =>
                state().updateComponentState(c.id, { inverted: !c.state.inverted })
              }
            >
              {c.state.inverted ? 'Normal (Hitam)' : 'Invert Warna'}
            </button>
            <span className="text-[10px] opacity-60 font-mono">SSD1306 · 128×64</span>
          </div>
        </div>
      )}

      {c.typeId === 'servo_sg90' && (
        <div className="inspector-card flex flex-col gap-2.5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold">Micro Servo SG90 (9g)</span>
            <span
              className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border shadow-xs ${
                c.state.isPowered !== false
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                  : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40'
              }`}
            >
              {c.state.isPowered !== false ? 'Daya Cukup (4.8-6V)' : 'Tanpa Daya (Min 4.0V)'}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span>Sudut Servo (Angle)</span>
              <span className="font-mono font-bold text-sky-700 dark:text-sky-400">
                {Math.round(Number(c.state.angle ?? 90))}°
              </span>
            </div>
            <input
              aria-label="Sudut rotasi servo"
              type="range"
              min={0}
              max={180}
              step={1}
              value={Number(c.state.angle ?? 90)}
              onChange={(e) =>
                state().updateComponentState(c.id, { angle: Number(e.target.value) })
              }
              className="w-full cursor-pointer accent-sky-600 dark:accent-sky-500"
            />
            <div className="flex justify-between text-[10px] opacity-60">
              <span>0° (Kiri)</span>
              <span>90° (Tengah)</span>
              <span>180° (Kanan)</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] opacity-80">Bentuk Lengan Horn:</span>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'single', label: '1 Sisi (Single)' },
                { id: 'double', label: '2 Sisi (Double)' },
                { id: 'cross', label: 'Silang (Cross)' },
              ].map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className={`text-[11px] py-1 rounded border transition-colors cursor-pointer ${
                    (c.state.hornType || 'single') === h.id
                      ? 'border-sky-500 bg-sky-100/90 dark:bg-sky-500/20 font-bold text-sky-900 dark:text-sky-200 shadow-xs'
                      : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                  }`}
                  onClick={() => state().updateComponentState(c.id, { hornType: h.id })}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] p-2 bg-slate-100 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-700/40 text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
            Kabel: Cokelat=GND · Merah=5V · Oranye=PWM (Pin D9/GPIO)
          </div>
        </div>
      )}

      {c.typeId === 'lcd1602_i2c' && (
        <div className="inspector-card flex flex-col gap-2.5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold">LCD 16x2 I2C (PCF8574)</span>
            <span
              className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border shadow-xs ${
                c.state.isPowered !== false
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                  : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40'
              }`}
            >
              {c.state.isPowered !== false ? 'Daya OK (5V)' : 'Butuh 5V (Min 4.2V)'}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] opacity-80">Teks Baris 1 (Maks 16 karakter):</span>
            <input
              type="text"
              maxLength={16}
              className="inspector-input text-xs font-mono p-1.5"
              value={String(c.state.line0 ?? '')}
              placeholder="Baris 1..."
              onChange={(e) =>
                state().updateComponentState(c.id, { line0: e.target.value.slice(0, 16) })
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] opacity-80">Teks Baris 2 (Maks 16 karakter):</span>
            <input
              type="text"
              maxLength={16}
              className="inspector-input text-xs font-mono p-1.5"
              value={String(c.state.line1 ?? '')}
              placeholder="Baris 2..."
              onChange={(e) =>
                state().updateComponentState(c.id, { line1: e.target.value.slice(0, 16) })
              }
            />
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-slate-700/40">
            <button
              type="button"
              className="small-button text-xs py-1"
              onClick={() =>
                state().updateComponentState(c.id, { backlight: c.state.backlight === false })
              }
            >
              {c.state.backlight !== false ? 'Backlight ON' : 'Backlight OFF'}
            </button>

            <button
              type="button"
              className="text-xs px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              onClick={() =>
                state().updateComponentState(c.id, {
                  theme: c.state.theme === 'blue' ? 'yellow_green' : 'blue',
                })
              }
            >
              {c.state.theme === 'blue' ? 'Tema Biru' : 'Tema Hijau'}
            </button>
          </div>
          <div className="text-[10px] opacity-60 font-mono text-center">
            I2C Addr: {String(c.state.address || '0x27')} · SDA/SCL
          </div>
        </div>
      )}

      {c.typeId === 'dht11' && (
        <div className="inspector-card flex flex-col gap-2.5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold">Sensor DHT11 (Suhu & RH)</span>
            <span
              className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border shadow-xs ${
                c.state.isPowered !== false
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                  : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40'
              }`}
            >
              {c.state.isPowered !== false ? 'Daya OK (3.3V-5V)' : 'Butuh Daya (3.3V-5V)'}
            </span>
          </div>

          {/* Temperature Slider */}
          <label className="flex flex-col text-[11px] gap-1">
            <div className="flex justify-between items-center">
              <span className="opacity-80">Suhu Lingkungan (°C):</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-xs text-sky-700 dark:text-sky-400">
                  {Number(c.state.temperature ?? 24)}°C
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-medium">
                  {Number(c.state.temperature ?? 24) < 18
                    ? 'Sejuk'
                    : Number(c.state.temperature ?? 24) <= 28
                      ? 'Nyaman'
                      : Number(c.state.temperature ?? 24) <= 35
                        ? 'Hangat'
                        : 'Panas'}
                </span>
              </div>
            </div>
            <input
              aria-label="Suhu lingkungan DHT11"
              type="range"
              min="0"
              max="50"
              step="1"
              value={Number(c.state.temperature ?? 24)}
              className="w-full cursor-pointer accent-sky-600 dark:accent-sky-500"
              onChange={(e) =>
                state().updateComponentState(c.id, { temperature: Number(e.target.value) })
              }
            />
          </label>

          {/* Humidity Slider */}
          <label className="flex flex-col text-[11px] gap-1">
            <div className="flex justify-between items-center">
              <span className="opacity-80">Kelembaban Udara (% RH):</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-400">
                  {Number(c.state.humidity ?? 50)}%
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-medium">
                  {Number(c.state.humidity ?? 50) < 35
                    ? 'Kering'
                    : Number(c.state.humidity ?? 50) <= 65
                      ? 'Ideal'
                      : 'Lembab'}
                </span>
              </div>
            </div>
            <input
              aria-label="Kelembaban udara DHT11"
              type="range"
              min="20"
              max="90"
              step="1"
              value={Number(c.state.humidity ?? 50)}
              className="w-full cursor-pointer accent-emerald-600 dark:accent-emerald-500"
              onChange={(e) =>
                state().updateComponentState(c.id, { humidity: Number(e.target.value) })
              }
            />
          </label>

          <div className="text-[10px] p-2 bg-slate-100 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-700/40 text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
            Pinout: Pin 1 = VCC (3.3V/5V) · Pin 2 = DATA (Digital) · Pin 3 = GND
          </div>
        </div>
      )}

      {c.typeId === 'hcsr04' && (
        <div className="inspector-card flex flex-col gap-2.5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold">Ultrasonik HC-SR04</span>
            <span
              className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border shadow-xs ${
                c.state.isPowered !== false
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                  : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40'
              }`}
            >
              {c.state.isPowered !== false ? 'Daya OK (5V)' : 'Butuh 5V (Min 4.2V)'}
            </span>
          </div>

          {/* Distance Slider */}
          <label className="flex flex-col text-[11px] gap-1">
            <div className="flex justify-between items-center">
              <span className="opacity-80">Jarak Objek Pantul:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-xs text-cyan-700 dark:text-cyan-400">
                  {Number(c.state.distance ?? 25)} cm
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-medium">
                  {Number(c.state.distance ?? 25) < 10
                    ? 'Dekat!'
                    : Number(c.state.distance ?? 25) <= 50
                      ? 'Sedang'
                      : 'Jauh'}
                </span>
              </div>
            </div>
            <input
              aria-label="Jarak objek HC-SR04"
              type="range"
              min="2"
              max="400"
              step="1"
              value={Number(c.state.distance ?? 25)}
              className="w-full cursor-pointer accent-cyan-600 dark:accent-cyan-500"
              onChange={(e) =>
                state().updateComponentState(c.id, { distance: Number(e.target.value) })
              }
            />
          </label>

          {/* Pulse Duration Metric Badge */}
          <div className="flex justify-between items-center text-[10px] font-mono px-1">
            <span className="text-slate-600 dark:text-slate-400">Estimasi Durasi Pulsa:</span>
            <span className="text-amber-700 dark:text-amber-300 font-bold">
              {Math.round(Number(c.state.distance ?? 25) * 58.3)} µs
            </span>
          </div>

          <div className="text-[10px] p-2 bg-slate-100 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-700/40 text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
            Pinout: VCC (5V) · TRIG (Input Pulsa) · ECHO (Output Pulsa) · GND
          </div>
        </div>
      )}

      {c.typeId.startsWith('jumper_') && (
        <div className="inspector-card flex flex-col gap-2">
          <span className="text-xs font-semibold">Warna Kabel Jumper</span>
          <WireColors onChange={(color) => state().updateComponentState(c.id, { color })} />
          <label className="flex justify-between items-center text-xs">
            Warna kustom
            <input
              aria-label="Warna jumper"
              type="color"
              className="w-8 h-6 rounded cursor-pointer"
              value={colors[String(c.state.color)] || String(c.state.color)}
              onChange={(e) => state().updateComponentState(c.id, { color: e.target.value })}
            />
          </label>
          {(['depth', 'bendHeight'] as const).map((key) => (
            <label key={key} className="flex flex-col text-[11px] gap-1">
              <span className="flex justify-between">
                <span>{key === 'depth' ? 'Panjang lekukan' : 'Tinggi lengkungan'}</span>
                <span className="font-mono">{Number(c.state[key]).toFixed(1)}</span>
              </span>
              <input
                aria-label={key === 'depth' ? 'Panjang lekukan jumper' : 'Tinggi lekukan jumper'}
                type="range"
                min={key === 'depth' ? 3 : 0.3}
                max={key === 'depth' ? 16 : 8}
                step="0.1"
                value={Number(c.state[key])}
                onChange={(e) => state().updateComponentState(c.id, { [key]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
      )}
    </>
  );
}
