"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { download } from "@/lib/project/project";
import { useTheme } from "next-themes";
import { FileCode2, Hash, Moon, Sun, Download, Upload, ZoomIn, ZoomOut } from "lucide-react";

// Dynamic import of Monaco Editor with SSR disabled
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-400 text-xs font-mono">
      Memuat Editor Monaco...
    </div>
  ),
});

export function CodeEditorPanel() {
  const code = useSimulatorStore((s) => s.code);
  const setCode = useSimulatorStore((s) => s.setCode);
  const { resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState<boolean>(false);
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true);
  const [editorTheme, setEditorTheme] = useState<string>("auto");
  const [fontSize, setFontSize] = useState<number>(13);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine actual Monaco theme safely for SSR
  const activeTheme =
    editorTheme === "auto"
      ? mounted && resolvedTheme === "light"
        ? "vs"
        : "vs-dark"
      : editorTheme;

  const lineCount = code.split("\n").length;
  const charCount = code.length;

  return (
    <section className="code-panel flex flex-col h-full bg-slate-900/50">
      {/* ─── MODERN ANTI-SLOP TOOLBAR ─── */}
      <div className="panel-heading flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-slate-700/50 bg-slate-900/80">
        {/* Left: File Badge & Info */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-mono font-medium">
            <FileCode2 size={13} />
            <span>sketch.ino</span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            C++ / Arduino IDE
          </span>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {/* Toggle Line Numbers */}
          <button
            type="button"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              showLineNumbers
                ? "bg-slate-800 text-sky-300 border-sky-500/40"
                : "bg-slate-800/40 text-slate-400 border-slate-700 hover:border-slate-600"
            }`}
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            title={showLineNumbers ? "Sembunyikan Nomor Baris" : "Tampilkan Nomor Baris"}
          >
            <Hash size={12} />
            <span>{showLineNumbers ? "Baris: ON" : "Baris: OFF"}</span>
          </button>

          {/* Theme Selector */}
          <div
            suppressHydrationWarning
            className="flex items-center rounded border border-slate-700 bg-slate-800/60 p-0.5"
          >
            <button
              type="button"
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                activeTheme === "vs-dark"
                  ? "bg-sky-600 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              onClick={() => setEditorTheme("vs-dark")}
              title="Tema Gelap (VS Code Dark)"
            >
              Dark
            </button>
            <button
              type="button"
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                activeTheme === "vs"
                  ? "bg-sky-600 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              onClick={() => setEditorTheme("vs")}
              title="Tema Terang (VS Code Light)"
            >
              Light
            </button>
            <button
              type="button"
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                activeTheme === "hc-black"
                  ? "bg-sky-600 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              onClick={() => setEditorTheme("hc-black")}
              title="Tema High Contrast"
            >
              HC
            </button>
          </div>

          {/* Font Size Zoom Controls */}
          <div className="flex items-center gap-0.5 bg-slate-800/60 rounded border border-slate-700 px-1 py-0.5">
            <button
              type="button"
              className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
              disabled={fontSize <= 11}
              onClick={() => setFontSize(Math.max(11, fontSize - 1))}
              title="Kecilkan Font"
            >
              <ZoomOut size={12} />
            </button>
            <span className="text-[10px] font-mono text-slate-300 px-0.5">
              {fontSize}px
            </span>
            <button
              type="button"
              className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
              disabled={fontSize >= 18}
              onClick={() => setFontSize(Math.min(18, fontSize + 1))}
              title="Besarkan Font"
            >
              <ZoomIn size={12} />
            </button>
          </div>

          {/* Open .ino File */}
          <label className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium cursor-pointer transition-colors">
            <Upload size={12} />
            <span>Buka</span>
            <input
              hidden
              type="file"
              accept=".ino,.cpp,.c,.txt"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f && f.size <= 64000) setCode(await f.text());
                e.target.value = "";
              }}
            />
          </label>

          {/* Download File */}
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium transition-colors"
            onClick={() => download("sketch.ino", code)}
            title="Download sketch.ino"
          >
            <Download size={12} />
            <span>Unduh</span>
          </button>
        </div>
      </div>

      {/* ─── MONACO EDITOR INSTANCE ─── */}
      <div className="flex-1 w-full min-h-[160px] relative overflow-hidden">
        <MonacoEditor
          height="100%"
          language="cpp"
          theme={activeTheme}
          value={code}
          onChange={(val) => setCode(val ?? "")}
          options={{
            lineNumbers: showLineNumbers ? "on" : "off",
            fontSize: fontSize,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 2,
            renderLineHighlight: "line",
            folding: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>

      {/* ─── STATUS FOOTER ─── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-700/50 bg-slate-900/60 text-[11px] text-slate-400">
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span>{lineCount} baris</span>
          <span>{charCount} karakter</span>
        </div>
        <div className="text-[10px] opacity-75">
          Mendukung: setup(), loop(), Servo.h, LiquidCrystal_I2C.h, Adafruit_SSD1306.h, WiFi.h
        </div>
      </div>
    </section>
  );
}
