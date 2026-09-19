"use client";

import { useState, useRef, useEffect } from "react";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { useHardwareStore } from "@/store/useHardwareStore";
import { arduinoEngine } from "@/lib/simulation/ArduinoInterpreter";
import { download } from "@/lib/project/project";
import { physicalSerial, isWebSerialSupported } from "@/lib/hardware/webSerial";
import { Usb, Play, Square, RotateCcw, Download, Trash2, Cpu, AlertTriangle } from "lucide-react";

export function SerialMonitor() {
  const [activeTab, setActiveTab] = useState<"virtual" | "hardware">("virtual");

  // Virtual Simulator Serial State
  const output = useSimulatorStore((s) => s.serialOutput);
  const status = useSimulatorStore((s) => s.simulationState);
  const baud = useSimulatorStore((s) => s.baudRate);
  const sketchBaud = useSimulatorStore((s) => s.sketchBaudRate);

  // Physical Hardware Serial State
  const hardwareLogs = useHardwareStore((s) => s.hardwareLogs);
  const isHardwareConnected = useHardwareStore((s) => s.isHardwareConnected);
  const hardwareBaudRate = useHardwareStore((s) => s.hardwareBaudRate);
  const setHardwareConnected = useHardwareStore((s) => s.setHardwareConnected);
  const setHardwareBaudRate = useHardwareStore((s) => s.setHardwareBaudRate);
  const appendHardwareLog = useHardwareStore((s) => s.appendHardwareLog);
  const clearHardwareLogs = useHardwareStore((s) => s.clearHardwareLogs);

  const [input, setInput] = useState("");
  const [ending, setEnding] = useState("\n");
  const [follow, setFollow] = useState(true);
  const virtualRef = useRef<HTMLDivElement>(null);
  const hardwareRef = useRef<HTMLDivElement>(null);

  // Auto scroll virtual monitor
  useEffect(() => {
    if (follow && virtualRef.current && activeTab === "virtual") {
      virtualRef.current.scrollTop = virtualRef.current.scrollHeight;
    }
  }, [output, follow, activeTab]);

  // Auto scroll hardware monitor
  useEffect(() => {
    if (follow && hardwareRef.current && activeTab === "hardware") {
      hardwareRef.current.scrollTop = hardwareRef.current.scrollHeight;
    }
  }, [hardwareLogs, follow, activeTab]);

  // Setup WebSerial listeners
  useEffect(() => {
    physicalSerial.setOnData((chunk) => {
      appendHardwareLog(chunk, "in");
    });
    physicalSerial.setOnStatusChange((connected, err) => {
      setHardwareConnected(connected);
      if (err) {
        appendHardwareLog(`[ERROR] ${err}\n`, "error");
      }
    });
  }, [appendHardwareLog, setHardwareConnected]);

  const handleToggleHardwareConnect = async () => {
    if (isHardwareConnected) {
      await physicalSerial.disconnect();
      setHardwareConnected(false);
      appendHardwareLog("[INFO] Terputus dari port serial.\n", "info");
    } else {
      appendHardwareLog(`[INFO] Menghubungkan ke port serial (${hardwareBaudRate} baud)...\n`, "info");
      const ok = await physicalSerial.requestAndConnect(hardwareBaudRate);
      if (ok) {
        appendHardwareLog(`[INFO] Berhasil tersambung ke perangkat keras fisik!\n`, "info");
      }
    }
  };

  const handleResetBoard = async () => {
    if (!isHardwareConnected) return;
    appendHardwareLog("[INFO] Mengirim sinyal reset DTR ke board...\n", "info");
    await physicalSerial.pulseDTR();
  };

  const mismatch = sketchBaud > 0 && baud !== sketchBaud;

  return (
    <section className="serial-panel flex flex-col h-full bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 select-none">
      {/* ─── TAB & ACTION HEADER (COMPACT SINGLE ROW) ─── */}
      <div className="panel-heading flex items-center justify-between px-2.5 py-1 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-xs shrink-0">
        {/* Segmented Tabs */}
        <div className="flex items-center rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-0.5 shadow-2xs">
          <button
            type="button"
            className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === "virtual"
                ? "bg-sky-600 text-white font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
            onClick={() => setActiveTab("virtual")}
            title="Serial Monitor Simulasi Virtual"
          >
            <Cpu size={12} className="shrink-0" />
            <span>Simulasi</span>
          </button>

          <button
            type="button"
            className={`px-2 py-0.5 text-[11px] font-semibold rounded transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === "hardware"
                ? "bg-emerald-600 text-white font-bold shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
            onClick={() => setActiveTab("hardware")}
            title="Serial Monitor Board Fisik Real USB"
          >
            <Usb size={12} className="shrink-0" />
            <span>Board Fisik</span>
            {isHardwareConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse shrink-0" />
            )}
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-1 text-xs">
          {/* Follow / Scroll toggle */}
          <button
            type="button"
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer shadow-2xs ${
              follow
                ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-600 font-bold"
                : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700"
            }`}
            onClick={() => setFollow(!follow)}
            title={follow ? "Auto-scroll Aktif (Klik untuk jeda)" : "Auto-scroll Jeda (Klik untuk ikuti)"}
          >
            {follow ? "SCROLL: ON" : "SCROLL: OFF"}
          </button>

          {/* Clear */}
          <button
            type="button"
            className="p-1 rounded bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
            onClick={() => {
              if (activeTab === "virtual") {
                useSimulatorStore.getState().clearSerial();
              } else {
                clearHardwareLogs();
              }
            }}
            title="Bersihkan log output"
          >
            <Trash2 size={12} />
          </button>

          {/* Download */}
          <button
            type="button"
            className="p-1 rounded bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
            onClick={() => {
              const text =
                activeTab === "virtual"
                  ? output.map((m) => m.message).join("")
                  : hardwareLogs.map((m) => m.text).join("");
              download(`serial_${activeTab}.txt`, text);
            }}
            title="Unduh log serial (.txt)"
          >
            <Download size={12} />
          </button>
        </div>
      </div>

      {/* ─── VIRTUAL SIMULATOR TAB ─── */}
      {activeTab === "virtual" && (
        <>
          {/* Sub-toolbar Controls */}
          <div className="flex items-center justify-between gap-1.5 px-2.5 py-1 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 text-xs shrink-0">
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Baud serial"
                className="text-[11px] font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer"
                value={baud}
                onChange={(e) =>
                  useSimulatorStore.getState().setBaudRate(Number(e.target.value))
                }
              >
                {[9600, 19200, 38400, 57600, 115200].map((v) => (
                  <option key={v} value={v}>{v} baud</option>
                ))}
              </select>
              <select
                aria-label="Akhiran serial"
                className="text-[11px] font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer"
                value={ending}
                onChange={(e) => setEnding(e.target.value)}
              >
                <option value="">Tanpa akhiran</option>
                <option value={"\n"}>Newline (\n)</option>
                <option value={"\r\n"}>CRLF (\r\n)</option>
              </select>
            </div>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              {status === "running" ? "Simulasi Aktif" : status === "paused" ? "Dijeda" : "Berhenti"}
            </span>
          </div>

          {mismatch && (
            <p className="panel-note text-amber-700 dark:text-amber-400 px-2.5 py-1 text-[11px] bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 flex items-center gap-1">
              <AlertTriangle size={11} className="shrink-0" />
              <span>Sketch memakai {sketchBaud} baud. Samakan baud untuk mengirim.</span>
            </p>
          )}

          {/* Virtual Terminal Output */}
          <div ref={virtualRef} className="serial-output flex-1 p-2.5 font-mono text-[11px] overflow-y-auto whitespace-pre-wrap select-text bg-white dark:bg-slate-950 leading-relaxed" aria-label="Keluaran serial">
            {output.length ? (
              output.map((m) => (
                <span
                  key={m.id}
                  className={
                    m.type === "error"
                      ? "text-rose-600 dark:text-rose-400"
                      : m.type === "warning"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-800 dark:text-slate-200"
                  }
                >
                  {m.message}
                </span>
              ))
            ) : (
              <span className="opacity-60 text-slate-400 dark:text-slate-500">
                Menunggu Serial.begin(9600) dari sketch simulasi virtual...
              </span>
            )}
          </div>

          {/* Virtual Input Form */}
          <form
            className="serial-form flex gap-1.5 p-1.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
            onSubmit={(e) => {
              e.preventDefault();
              if (status === "running" && !mismatch && sketchBaud) {
                arduinoEngine.send(input + ending);
                setInput("");
              }
            }}
          >
            <input
              aria-label="Input serial"
              className="flex-1 text-[11px] font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-slate-100 outline-none focus:border-sky-500 shadow-2xs"
              placeholder="Kirim ke Serial.read() simulasi..."
              value={input}
              maxLength={1024}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              className="px-2.5 py-1 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 transition shadow-2xs cursor-pointer shrink-0"
              disabled={status !== "running" || mismatch || !sketchBaud}
            >
              Kirim
            </button>
          </form>
        </>
      )}

      {/* ─── REAL PHYSICAL HARDWARE TAB ─── */}
      {activeTab === "hardware" && (
        <>
          {/* Hardware Connection Toolbar */}
          <div className="flex items-center justify-between gap-1.5 px-2.5 py-1 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 text-xs shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                  isHardwareConnected
                    ? "bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 hover:bg-rose-100 dark:hover:bg-rose-500/30"
                    : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs"
                }`}
                onClick={handleToggleHardwareConnect}
              >
                {isHardwareConnected ? (
                  <>
                    <Square size={11} />
                    <span>Putus</span>
                  </>
                ) : (
                  <>
                    <Play size={11} />
                    <span>Hubungkan USB</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={!isHardwareConnected}
                className="p-1 rounded bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 flex items-center transition cursor-pointer shadow-2xs"
                onClick={handleResetBoard}
                title="Kirim pulsa DTR untuk mereset Arduino/ESP32"
              >
                <RotateCcw size={11} />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <select
                className="text-[11px] font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer"
                value={hardwareBaudRate}
                disabled={isHardwareConnected}
                onChange={(e) => setHardwareBaudRate(Number(e.target.value))}
              >
                {[9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600].map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              <select
                className="text-[11px] font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-slate-800 dark:text-slate-200 shadow-2xs cursor-pointer"
                value={ending}
                onChange={(e) => setEnding(e.target.value)}
              >
                <option value="">None</option>
                <option value={"\n"}>\n</option>
                <option value={"\r\n"}>\r\n</option>
              </select>
            </div>
          </div>

          {!isWebSerialSupported() && (
            <div className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-[11px] flex items-center gap-1.5">
              <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Gunakan browser Google Chrome, Edge, atau Opera untuk koneksi Web Serial USB.</span>
            </div>
          )}

          {/* Real Serial Output Terminal */}
          <div
            ref={hardwareRef}
            className="serial-output flex-1 p-2.5 font-mono text-[11px] overflow-y-auto whitespace-pre-wrap bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 select-text leading-relaxed"
            aria-label="Keluaran hardware serial"
          >
            {hardwareLogs.length > 0 ? (
              hardwareLogs.map((log) => (
                <span
                  key={log.id}
                  className={
                    log.type === "error"
                      ? "text-rose-600 dark:text-rose-400 font-bold"
                      : log.type === "info"
                        ? "text-sky-600 dark:text-sky-400 italic"
                        : log.type === "out"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-800 dark:text-slate-200"
                  }
                >
                  {log.text}
                </span>
              ))
            ) : (
              <div className="text-slate-400 dark:text-slate-500 opacity-80 flex flex-col gap-0.5 text-[11px]">
                <span>Belum ada data dari perangkat keras fisik.</span>
                <span>Klik <strong>"Hubungkan USB"</strong> untuk mulai membaca serial port.</span>
              </div>
            )}
          </div>

          {/* Real Serial Input Form */}
          <form
            className="serial-form flex gap-1.5 p-1.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
            onSubmit={async (e) => {
              e.preventDefault();
              if (isHardwareConnected && input) {
                const toSend = input + ending;
                appendHardwareLog(`> ${input}\n`, "out");
                await physicalSerial.write(toSend);
                setInput("");
              }
            }}
          >
            <input
              aria-label="Input serial hardware"
              className="flex-1 text-[11px] font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 shadow-2xs"
              placeholder={
                isHardwareConnected
                  ? "Ketik perintah serial ke board nyata..."
                  : "Sambungkan board untuk mengirim data serial..."
              }
              value={input}
              disabled={!isHardwareConnected}
              maxLength={1024}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition shadow-2xs cursor-pointer shrink-0"
              disabled={!isHardwareConnected || !input.trim()}
            >
              Kirim
            </button>
          </form>
        </>
      )}
    </section>
  );
}
