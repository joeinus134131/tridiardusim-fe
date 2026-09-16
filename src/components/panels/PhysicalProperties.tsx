'use client';
import { WireColors } from './WireColors';
import { useState } from 'react';
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
  };
  const state = useSimulatorStore.getState;

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="inspector-badge">
          Rigid Body · Collision On
        </span>
        {onOpenDatasheet && (
          <button
            type="button"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            onClick={() => onOpenDatasheet(c.typeId.startsWith('jumper_') ? 'jumper' : c.typeId)}
          >
            Datasheet Asli ↗
          </button>
        )}
      </div>

      {['resistor_220', 'led_red', 'potentiometer', 'push_button', 'esp32_wroom', 'oled_ssd1306', 'lcd1602_i2c'].includes(c.typeId) && (
        <details open className="inspector-details">
          <summary>
            Koneksi Breadboard ({mounted.length ? `${mounted.length} Pin Tersambung` : '⚪ Belum Tertancap'})
          </summary>
          <p className="text-[11px] opacity-80 mt-1 mb-2 leading-tight">
            {mounted.length
              ? `${mounted.length} kaki komponen tertancap pas pada lubang breadboard.`
              : 'Drag langsung komponen ke atas breadboard atau pilih lubang target di bawah ini.'}
          </p>
          {board && (
            <div className="flex flex-col gap-1.5">
              <select
                aria-label="Breadboard pemasangan"
                value={board.id}
                onChange={(e) => setBoardId(e.target.value)}
                className="inspector-select"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} · [{b.id.slice(0, 4)}]
                  </option>
                ))}
              </select>
              <select
                aria-label="Lubang kaki pertama"
                value={holeId}
                onChange={(e) => setHoleId(e.target.value)}
                className="inspector-select"
              >
                {board.pins.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="small-button text-xs py-1 mt-0.5"
                onClick={() => {
                  const hole = board.pins.find((p) => p.id === holeId)!;
                  const target = world(board, hole.position);
                  const first = world(c, c.pins[0].position);
                  const position = c.position.map((v, i) => v + target[i] - first[i]) as Vec;
                  state().updateComponentPosition(c.id, position);
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
          {c.typeId === 'oled_ssd1306' && (
            <p className="text-[10px] opacity-70 mt-1">
              Header 4-pin (GND, VCC, SCL, SDA) presisi pitch 2.54 mm. Dapat langsung ditancapkan ke 4 kolom breadboard berdampingan.
            </p>
          )}
        </details>
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
                    ? 'border-blue-400 bg-blue-500/20 font-bold shadow-sm'
                    : 'border-slate-700/60 hover:border-slate-500 bg-slate-800/40'
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
              className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                c.state.isPowered !== false
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
              }`}
            >
              {c.state.isPowered !== false ? '● Daya 3.3V-5V OK' : '○ Belum Ada Daya'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] opacity-80">Preset Gambar & Grafik:</span>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'logo', label: '🛡️ Logo' },
                { id: 'circuit', label: '⚡ Circuit' },
                { id: 'gauge', label: '📊 Gauge' },
                { id: 'invader', label: '👾 Retro 8-Bit' },
                { id: 'custom', label: '✍️ Teks Bebas' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`px-2 py-1 text-[11px] rounded border transition-colors cursor-pointer ${
                    (c.state.image || 'logo') === p.id
                      ? 'border-sky-400 bg-sky-500/20 font-bold text-sky-200'
                      : 'border-slate-700 hover:border-slate-500 bg-slate-800/40'
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
              {c.state.inverted ? '☀️ Normal (Hitam)' : '🌙 Invert Warna'}
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
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                c.state.isPowered !== false
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {c.state.isPowered !== false ? '⚡ Daya Cukup (4.8-6V)' : '⚠️ Tanpa Daya (Min 4.0V)'}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span>Sudut Servo (Angle)</span>
              <span className="font-mono font-bold text-sky-400">
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
              className="w-full cursor-pointer accent-sky-500"
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
                  className={`text-[11px] py-1 rounded border transition-colors ${
                    (c.state.hornType || 'single') === h.id
                      ? 'border-sky-400 bg-sky-500/20 font-bold text-sky-200'
                      : 'border-slate-700 hover:border-slate-500 bg-slate-800/40'
                  }`}
                  onClick={() => state().updateComponentState(c.id, { hornType: h.id })}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] opacity-70 p-1.5 bg-slate-900/60 rounded border border-slate-700/40 leading-relaxed font-mono">
            Kabel: Cokelat=GND · Merah=5V · Oranye=PWM (Pin D9/GPIO)
          </div>
        </div>
      )}

      {c.typeId === 'lcd1602_i2c' && (
        <div className="inspector-card flex flex-col gap-2.5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold">LCD 16x2 I2C (PCF8574)</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                c.state.isPowered !== false
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {c.state.isPowered !== false ? '⚡ Daya OK (5V)' : '⚠️ Butuh 5V (Min 4.2V)'}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] opacity-80">Teks Baris 1 (Maks 16 karakter):</span>
            <input
              type="text"
              maxLength={16}
              className="inspector-input text-xs font-mono p-1.5"
              value={String(c.state.line0 ?? 'Nexflux Lab 3D  ')}
              onChange={(e) =>
                state().updateComponentState(c.id, { line0: e.target.value.padEnd(16, ' ').slice(0, 16) })
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] opacity-80">Teks Baris 2 (Maks 16 karakter):</span>
            <input
              type="text"
              maxLength={16}
              className="inspector-input text-xs font-mono p-1.5"
              value={String(c.state.line1 ?? 'LCD 16x2 I2C OK ')}
              onChange={(e) =>
                state().updateComponentState(c.id, { line1: e.target.value.padEnd(16, ' ').slice(0, 16) })
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
              {c.state.backlight !== false ? '💡 Backlight ON' : '🌑 Backlight OFF'}
            </button>

            <button
              type="button"
              className="small-button text-xs py-1"
              onClick={() =>
                state().updateComponentState(c.id, {
                  theme: c.state.theme === 'blue' ? 'yellow_green' : 'blue',
                })
              }
            >
              {c.state.theme === 'blue' ? '🎨 Tema Biru' : '🌿 Tema Hijau'}
            </button>
          </div>
          <div className="text-[10px] opacity-60 font-mono text-center">
            I2C Addr: {String(c.state.address || '0x27')} · SDA/SCL
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
