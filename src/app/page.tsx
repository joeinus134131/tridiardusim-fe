"use client";
import { PhysicalProperties } from "@/components/panels/PhysicalProperties";
import { WireProperties } from "@/components/panels/WireProperties";
import { DesktopMenuBar } from "@/components/panels/DesktopMenuBar";
import { DatasheetModal } from "@/components/panels/DatasheetModal";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { ComponentRegistry } from "@/lib/components/ComponentRegistry";
import { CodeEditorPanel } from "@/components/panels/CodeEditorPanel";
import { SerialMonitor } from "@/components/panels/SerialMonitor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { parseProject, download, Project } from "@/lib/project/project";
import { physicalInfo } from "@/lib/components/physical";
import { example, instance } from "@/lib/project/examples";
import type {
  CircuitComponent,
  PinDefinition,
} from "@/lib/components/componentTypes";

const SimulatorCanvas = dynamic(
  () =>
    import("@/components/canvas/SimulatorCanvas").then(
      (m) => m.SimulatorCanvas,
    ),
  {
    ssr: false,
    loading: () => <p className="p-5">Memuat ruang 3D…</p>,
  },
);
const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function RuntimeStatus() {
  const simulationState = useSimulatorStore((s) => s.simulationState);
  const elapsedMs = useSimulatorStore((s) => s.elapsedMs);
  return (
    <span className="runtime-status">
      {simulationState} · {(elapsedMs / 1000).toFixed(1)} s
    </span>
  );
}

function PinVoltages({ component }: { component: CircuitComponent }) {
  const voltages = useSimulatorStore((s) => s.voltages);
  const wiringActive = useSimulatorStore((s) => s.wiringState.active);
  const finishWiring = useSimulatorStore((s) => s.finishWiring);
  const startWiring = useSimulatorStore((s) => s.startWiring);
  return (
    <details className="inspector-details">
      <summary>
        Terminal & Tegangan Pin ({component.pins.length})
      </summary>
      <div className="mt-2 max-h-52 overflow-y-auto flex flex-col gap-1 pr-1">
        {component.pins.map((p: PinDefinition) => (
          <button
            className="inspector-pin-item"
            key={p.id}
            onClick={() =>
              wiringActive
                ? finishWiring(component.id, p.id)
                : startWiring(component.id, p.id)
            }
            title="Klik untuk menyambungkan kabel ke pin ini"
          >
            <span className="font-mono font-medium">{p.name || p.id}</span>
            <span className="inspector-pin-voltage">
              {voltages[component.id + ":" + p.id]?.toFixed(2) ?? "—"} V
            </span>
          </button>
        ))}
      </div>
    </details>
  );
}

export default function WorkspacePage() {
  const components = useSimulatorStore((s) => s.components);
  const wires = useSimulatorStore((s) => s.wires);
  const code = useSimulatorStore((s) => s.code);
  const simulationState = useSimulatorStore((s) => s.simulationState);
  const placementNotice = useSimulatorStore((s) => s.placementNotice);
  const selectedComponentId = useSimulatorStore((s) => s.selectedComponentId);
  const selectedWireId = useSimulatorStore((s) => s.selectedWireId);
  const isWiringActive = useSimulatorStore((s) => s.wiringState.active);
  const wiringSourcePinId = useSimulatorStore((s) => s.wiringState.sourcePinId);
  const cancelWiring = useSimulatorStore((s) => s.cancelWiring);
  const startSimulation = useSimulatorStore((s) => s.startSimulation);
  const pauseSimulation = useSimulatorStore((s) => s.pauseSimulation);
  const stopSimulation = useSimulatorStore((s) => s.stopSimulation);
  const addComponent = useSimulatorStore((s) => s.addComponent);
  const selectComponent = useSimulatorStore((s) => s.selectComponent);
  const selectWire = useSimulatorStore((s) => s.selectWire);
  const removeWire = useSimulatorStore((s) => s.removeWire);
  const addWire = useSimulatorStore((s) => s.addWire);
  const removeComponent = useSimulatorStore((s) => s.removeComponent);
  const updateComponentPosition = useSimulatorStore(
    (s) => s.updateComponentPosition,
  );
  const updateComponentRotation = useSimulatorStore(
    (s) => s.updateComponentRotation,
  );
  const updateComponentState = useSimulatorStore((s) => s.updateComponentState);
  const diagnostics = useSimulatorStore((s) => s.diagnostics);

  const [query, setQuery] = useState("");
  const [name, setName] = useState("Rangkaian saya");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("komponen");
  const [, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [selectedExample, setSelectedExample] = useState("");
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [datasheetOpen, setDatasheetOpen] = useState(false);
  const [datasheetKey, setDatasheetKey] = useState("esp32_wroom");
  const file = useRef<HTMLInputElement>(null);

  // Automatically expand panel when a component is selected
  useEffect(() => {
    if (selectedComponentId && !rightPanelOpen) {
      setRightPanelOpen(true);
    }
  }, [selectedComponentId]);

  const snapshot = (): Project => ({
    version: 1,
    name,
    code,
    components,
    wires,
  });

  const load = (p: Project) => {
    stopSimulation();
    useSimulatorStore.setState({
      components: p.components,
      wires: p.wires,
      code: p.code,
      selectedComponentId: null,
      selectedWireId: null,
      diagnostics: [],
      elapsedMs: 0,
      serialOutput: [],
      sketchBaudRate: 0,
    });
    cancelWiring();
    setName(p.name);
    setFrom("");
    setTo("");
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") useSimulatorStore.getState().cancelWiring();

      const activeElem = document.activeElement;
      const isInputActive =
        activeElem &&
        (activeElem.tagName === "INPUT" ||
          activeElem.tagName === "TEXTAREA" ||
          activeElem.getAttribute("contenteditable") === "true");

      if (isInputActive) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedComponentId) {
          removeComponent(selectedComponentId);
        } else if (selectedWireId) {
          removeWire(selectedWireId);
        }
      }

      // Arrow keys for precise component placement onto breadboard holes
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) && selectedComponentId) {
        const comp = components.find((c) => c.id === selectedComponentId);
        if (comp) {
          e.preventDefault();
          const step = (e.shiftKey ? 2 : 1) * 0.508;
          let dx = 0;
          let dz = 0;
          if (e.key === "ArrowLeft") dx = -step;
          else if (e.key === "ArrowRight") dx = step;
          else if (e.key === "ArrowUp") dz = -step;
          else if (e.key === "ArrowDown") dz = step;

          updateComponentPosition(comp.id, [
            Math.round((comp.position[0] + dx) / 0.508) * 0.508,
            comp.position[1],
            Math.round((comp.position[2] + dz) / 0.508) * 0.508,
          ]);
        }
      }

      if (e.key === "r" || e.key === "R") {
        const comp = components.find((c) => c.id === selectedComponentId);
        if (comp) {
          updateComponentRotation(comp.id, [
            0,
            comp.rotation[1] + Math.PI / 2,
            0,
          ]);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedComponentId, selectedWireId, components, removeComponent, removeWire, updateComponentPosition, updateComponentRotation]);

  const guard = async (action: () => void | Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const backup = () => {
    localStorage.setItem("ardusim-recovery", JSON.stringify(snapshot()));
  };

  const replace = (p: Project) => {
    backup();
    load(p);
    setNotice("Rangkaian dibuka. Sebelumnya tersedia lewat Pulihkan.");
  };

  const selected = components.find((c) => c.id === selectedComponentId);
  const physical = selected
    ? physicalInfo[
        selected.typeId.startsWith("jumper_") ? "jumper" : selected.typeId
      ]
    : undefined;

  const options = components.flatMap((c) =>
    c.pins.map((p) => (
      <option key={c.id + ":" + p.id} value={c.id + ":" + p.id}>
        {c.name} [{c.id.slice(-4)}] · {p.id}
      </option>
    )),
  );

  const openDatasheetFor = (key: string) => {
    setDatasheetKey(key);
    setDatasheetOpen(true);
  };

  return (
    <div className="workspace">
      {/* 1. TOP WINDOW MENU BAR */}
      <DesktopMenuBar
        onNewProject={() => {
          guard(() => {
            stopSimulation();
            backup();
            useSimulatorStore.setState({
              components: [],
              wires: [],
              selectedComponentId: null,
              selectedWireId: null,
              serialOutput: [],
            });
            setName("Proyek Baru");
            setNotice("Ruang kerja baru siap.");
          });
        }}
        onSaveLocal={() => {
          guard(() => {
            localStorage.setItem("ardusim-project", JSON.stringify(snapshot()));
            setNotice("Tersimpan lokal di browser ini.");
          });
        }}
        onLoadLocal={() => {
          guard(() => {
            const data = localStorage.getItem("ardusim-project");
            if (!data) throw new Error("Tidak ada data proyek tersimpan lokal");
            replace(parseProject(JSON.parse(data)));
          });
        }}
        onRestore={() => {
          guard(() => {
            const data = localStorage.getItem("ardusim-recovery");
            if (!data) throw new Error("Tidak ada sesi cadangan pemulihan");
            replace(parseProject(JSON.parse(data)));
            setNotice("Rangkaian sesi sebelumnya dipulihkan.");
          });
        }}
        onExportJson={() => {
          download(name + ".json", JSON.stringify(snapshot(), null, 2));
        }}
        onImportJson={() => file.current?.click()}
        onSaveServer={() => {
          guard(async () => {
            const response = await fetch(api + "/api/projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(snapshot()),
              signal: AbortSignal.timeout(5000),
            });
            if (!response.ok) {
              throw new Error("Backend menolak proyek: " + (await response.text()));
            }
            const p = await response.json();
            setNotice("Tersimpan di backend: " + p.id);
          });
        }}
        onLoadServer={() => {
          guard(async () => {
            const r = await fetch(api + "/api/projects", {
              signal: AbortSignal.timeout(5000),
            });
            if (!r.ok) throw new Error("Backend tidak tersedia");
            const list = (await r.json()).projects;
            setProjects(list);
            setNotice(`Ditemukan ${list.length} proyek tersimpan di server.`);
          });
        }}
        onClearAll={() => {
          guard(() => {
            backup();
            useSimulatorStore.setState({
              components: [],
              wires: [],
              selectedComponentId: null,
            });
            setNotice("Ruang kerja dibersihkan.");
          });
        }}
        onOpenDatasheet={() => {
          const activeKey = selected
            ? selected.typeId.startsWith("jumper_")
              ? "jumper"
              : selected.typeId
            : "esp32_wroom";
          openDatasheetFor(activeKey);
        }}
        onOpenHelp={() => setHelp(true)}
        onLoadExample={(exId) => guard(() => replace(example(exId)))}
        isRightPanelOpen={rightPanelOpen}
        onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
        busy={busy}
      />

      {/* 2. SUB-TOOLBAR */}
      <header className="workspace-toolbar">
        <div className="brand">
          NEX<span>FLUX</span> <small>LAB 3D</small>
        </div>

        <input
          aria-label="Nama proyek"
          value={name}
          maxLength={128}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            className="btn-primary"
            onClick={startSimulation}
            disabled={simulationState === "running"}
          >
            {simulationState === "paused" ? "Lanjut" : "▶ Jalankan"}
          </button>
          <button
            className="small-button"
            onClick={pauseSimulation}
            disabled={simulationState !== "running"}
          >
            Jeda
          </button>
          <button
            className="small-button"
            onClick={stopSimulation}
            disabled={simulationState === "stopped"}
          >
            ■ Stop
          </button>
        </div>
        <RuntimeStatus />
        <button
          className="small-button flex items-center gap-1"
          onClick={() => {
            const activeKey = selected
              ? selected.typeId.startsWith("jumper_")
                ? "jumper"
                : selected.typeId
              : "esp32_wroom";
            openDatasheetFor(activeKey);
          }}
        >
          <span>📄</span> Datasheet
        </button>
        <button
          className="small-button flex items-center gap-1"
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          title="Buka/Tutup Panel Properti di sebelah kanan"
        >
          <span>⚙️</span> Properti {rightPanelOpen ? "▾" : "▸"}
        </button>
        <button className="small-button" onClick={() => setHelp(!help)}>
          Panduan
        </button>
        <ThemeToggle />
      </header>

      {/* Hidden file input for JSON import */}
      <input
        ref={file}
        hidden
        type="file"
        accept=".json"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f)
            guard(async () => {
              if (f.size > 2e6) throw new Error("File maksimum 2 MB");
              replace(parseProject(JSON.parse(await f.text())));
            });
          e.target.value = "";
        }}
      />

      {/* System notices */}
      {notice && (
        <div role="status" className="notice">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Tutup pesan">
            ×
          </button>
        </div>
      )}

      {/* 3. CENTERED HELP MODAL */}
      {help && (
        <div className="datasheet-modal-overlay" onClick={() => setHelp(false)}>
          <div
            className="datasheet-modal-content max-w-lg p-6 bg-slate-900 border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                Panduan Penggunaan Nexflux Lab 3D
              </h3>
              <button className="datasheet-close-btn" onClick={() => setHelp(false)}>
                ✕
              </button>
            </div>
            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <div className="p-3 bg-slate-800/80 rounded border border-slate-700">
                <strong className="text-blue-400 block mb-1">Navigasi Kamera 3D Standar:</strong>
                <p>• <strong>Drag Mouse Kiri</strong>: Orbit / Putar sudut pandang 360° ke segala arah.</p>
                <p>• <strong>Drag Mouse Kanan / Shift + Kiri / Roda Tengah</strong>: Pan / Menggeser kamera.</p>
                <p>• <strong>Scroll Wheel</strong>: Zoom in / Zoom out.</p>
              </div>
              <div className="p-3 bg-slate-800/80 rounded border border-slate-700">
                <strong className="text-emerald-400 block mb-1">Pemasangan Fisik & Breadboard:</strong>
                <p>• Seret komponen (resistor, led, potensiometer, tombol, ESP32) langsung ke atas breadboard.</p>
                <p>• Kaki komponen otomatis menempel dan tertancap pas ke lubang breadboard tanpa melayang.</p>
                <p>• Tekan tombol <kbd className="px-1 py-0.5 bg-slate-700 rounded">R</kbd> untuk memutar orientasi komponen 90°.</p>
              </div>
              <div className="p-3 bg-slate-800/80 rounded border border-slate-700">
                <strong className="text-amber-400 block mb-1">Pengkabelan & Wiring:</strong>
                <p>• Klik pin terminal awal, lalu klik pin terminal tujuan untuk membuat koneksi kabel.</p>
                <p>• Tekan <kbd className="px-1 py-0.5 bg-slate-700 rounded">Esc</kbd> untuk membatalkan penarikan kabel.</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-700 flex justify-end">
              <button className="btn-primary" onClick={() => setHelp(false)}>
                Mengerti & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. OFFICIAL COMPONENT DATASHEET MODAL */}
      <DatasheetModal
        isOpen={datasheetOpen}
        onClose={() => setDatasheetOpen(false)}
        initialComponentKey={datasheetKey}
      />

      {/* 5. MAIN WORKSPACE */}
      <main className="workspace-main">
        {/* Left Library Panel (Components & Connections) */}
        <aside className="library-panel">
          <div className="panel-heading">
            <button
              onClick={() => setTab("komponen")}
              className={tab === "komponen" ? "active" : ""}
            >
              Komponen
            </button>
            <button
              onClick={() => setTab("wiring")}
              className={tab === "wiring" ? "active" : ""}
            >
              Sambungan
            </button>
          </div>
          {tab === "komponen" ? (
            <>
              <input
                className="library-search"
                aria-label="Cari komponen"
                placeholder="Cari komponen…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="library-list">
                {ComponentRegistry.getAll()
                  .filter(
                    (c) =>
                      !c.typeId.startsWith("jumper_") &&
                      (c.name + " " + c.description)
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                  )
                  .map((c) => (
                    <button
                      key={c.typeId}
                      className="component-card"
                      onClick={() => {
                        if (components.length >= 100) {
                          setNotice("Batas maksimum 100 komponen");
                          return;
                        }
                        const n = components.length;
                        const item = instance(c.typeId, crypto.randomUUID(), [
                          (n % 4) * 6 - 8,
                          c.typeId === "led_red"
                            ? 0.8
                            : c.typeId === "push_button"
                              ? 0.6
                              : c.typeId === "potentiometer"
                                ? 0.6
                                : c.typeId === "resistor_220"
                                  ? 0.6
                                  : 0,
                          Math.floor(n / 4) * 6 - 4,
                        ]);
                        const id = addComponent(item);
                        selectComponent(id);
                      }}
                    >
                      <strong>{c.name}</strong>
                      <small>
                        {c.pins.length} pin · {c.category}
                      </small>
                      <p>{c.description}</p>
                    </button>
                  ))}
              </div>
              <div className="examples">
                <details>
                  <summary>Komponen di Canvas ({components.length})</summary>
                  {components.map((c) => (
                    <button
                      key={c.id}
                      className="pin-row"
                      aria-label={"Pilih " + c.name}
                      onClick={() => selectComponent(c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </details>
                <strong>Contoh siap pakai</strong>
                {[
                  ["servo", "Micro Servo SG90 9g"],
                  ["lcd1602", "LCD 16x2 Display I2C"],
                  ["oled", "OLED Display 0.96\" SSD1306"],
                  ["esp32_wifi", "ESP32 Wi-Fi + Internet Fetch"],
                  ["esp32", "ESP32 DevKit + Breadboard"],
                  ["blink", "Uno Blink + Resistor"],
                  ["button", "Tombol INPUT_PULLUP"],
                  ["pwm", "Potensiometer → PWM"],
                  ["breadboard", "Breadboard + Jumper"],
                  ["serial", "Serial Echo Monitor"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className="small-button"
                    onClick={() => guard(() => replace(example(id)))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="wiring-panel">
              <p>Pilih dua terminal, lalu sambungkan.</p>
              <label>
                Dari
                <select
                  aria-label="Terminal awal"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                >
                  <option value="">Pilih pin…</option>
                  {options}
                </select>
              </label>
              <label>
                Ke
                <select
                  aria-label="Terminal tujuan"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                >
                  <option value="">Pilih pin…</option>
                  {options}
                </select>
              </label>
              <label>
                Warna
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </label>
              <button
                className="btn-primary"
                disabled={!from || !to}
                onClick={() => {
                  const [a, p] = from.split(":");
                  const [b, q] = to.split(":");
                  const id = addWire({
                    sourceComponentId: a,
                    sourcePinId: p,
                    targetComponentId: b,
                    targetPinId: q,
                    color,
                  });
                  setNotice(
                    id
                      ? "Kabel terhubung."
                      : "Kabel duplikat atau terminal tidak valid.",
                  );
                }}
              >
                Sambungkan
              </button>
              <h3>{wires.length} kabel aktif</h3>
              {wires.map((w) => (
                <div key={w.id} className="wire-row">
                  <button onClick={() => selectWire(w.id)}>
                    {components.find((c) => c.id === w.sourceComponentId)?.name}{" "}
                    · {w.sourcePinId}
                    <br />↳{" "}
                    {
                      components.find((c) => c.id === w.targetComponentId)?.name
                    }{" "}
                    · {w.targetPinId}
                  </button>
                  <button
                    aria-label={"Hapus kabel " + w.id}
                    onClick={() => removeWire(w.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Center 3D Scene Panel */}
        <section className="scene-panel">
          <SimulatorCanvas />
          <div className="camera-tools">
            {(
              [
                ["perspective", "Perspektif 3D"],
                ["top", "Tampak Atas"],
                ["front", "Tampak Depan"],
              ] as const
            ).map(([view, label]) => (
              <button
                key={view}
                className="small-button"
                onClick={() => useSimulatorStore.setState({ cameraView: view })}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="scene-instruction">
            {isWiringActive ? (
              <>
                <strong>Tujuan untuk pin {wiringSourcePinId}</strong>
                <button onClick={cancelWiring}>Batalkan · Esc</button>
              </>
            ) : (
              <span>
                {components.length} komponen · {wires.length} kabel · Drag kiri untuk putar 3D · Klik pin untuk menyambung
              </span>
            )}
          </div>
          {placementNotice && (
            <div className="diagnostics" role="status">
              {placementNotice}
            </div>
          )}
          {diagnostics.length > 0 && (
            <div className="diagnostics" role="alert">
              {diagnostics.map((d, i) => (
                <p key={i}>{d}</p>
              ))}
            </div>
          )}
        </section>

        {/* Right Collapsible Inspector & Properties Panel */}
        <aside
          className={`right-inspector-panel ${rightPanelOpen ? "expanded" : "collapsed"}`}
        >
          <div className="inspector-toggle-strip">
            {rightPanelOpen ? (
              <>
                <div className="flex items-center gap-1.5 font-bold text-xs tracking-wider">
                  <span></span>
                  <span>PROPERTI & INSPEKTOR</span>
                </div>
                <button
                  className="small-button text-xs px-2 py-0.5"
                  onClick={() => setRightPanelOpen(false)}
                  title="Tutup Panel Properti"
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <button
                  className="small-button text-xs p-1"
                  onClick={() => setRightPanelOpen(true)}
                  title="Buka Panel Properti"
                >
                  ⇲
                </button>
                <span className="collapsed-title">PROPERTI</span>
              </>
            )}
          </div>

          {rightPanelOpen && (
            <div className="inspector-scroll-body">
              {selected ? (
                <div className="properties-content flex flex-col gap-2.5">
                  <div className="inspector-card flex justify-between items-start">
                    <div>
                      <h3 className="inspector-title">{selected.name}</h3>
                      <span className="inspector-subtitle">ID: {selected.id.slice(0, 8)}</span>
                    </div>
                    <button
                      aria-label="Tutup properti"
                      onClick={() => selectComponent(null)}
                      className="text-xs p-1 opacity-60 hover:opacity-100 font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <PhysicalProperties
                    key={selected.id}
                    component={selected}
                    onOpenDatasheet={(key) => openDatasheetFor(key)}
                  />

                  {/* Mechanical & Dimensions info */}
                  <div className="inspector-card text-xs flex flex-col gap-1">
                    <div className="font-semibold text-xs">{physical?.variant}</div>
                    <div className="text-[11px] opacity-75">{physical?.dimensions}</div>
                    {physical?.source && (
                      <button
                        type="button"
                        onClick={() => openDatasheetFor(selected.typeId.startsWith("jumper_") ? "jumper" : selected.typeId)}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold text-left mt-1"
                      >
                        Lihat Spesifikasi & Datasheet Asli ↗
                      </button>
                    )}
                  </div>

                  {/* Actions: Rotate & Delete */}
                  <div className="flex gap-2">
                    <button
                      className="small-button flex-1 text-xs py-1.5 font-medium"
                      onClick={() =>
                        updateComponentRotation(selected.id, [
                          0,
                          selected.rotation[1] + Math.PI / 2,
                          0,
                        ])
                      }
                    >
                      Putar 90° (R)
                    </button>
                    <button
                      className="small-button text-xs py-1.5 text-rose-600 dark:text-rose-400 font-medium"
                      onClick={() => {
                        backup();
                        removeComponent(selected.id);
                      }}
                    >
                      Hapus
                    </button>
                  </div>

                  {/* Transform Coordinate Controls */}
                  <div className="inspector-card">
                    <span className="text-[11px] font-semibold block mb-1.5 opacity-90">Koordinat Posisi 3D</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["x", "y", "z"] as const).map((axis, i) => (
                        <label key={axis} className="text-[10px] flex flex-col gap-0.5 opacity-80 uppercase font-mono">
                          {axis}
                          <input
                            aria-label={"Posisi " + axis}
                            type="number"
                            step="0.508"
                            className="inspector-input"
                            value={selected.position[i]}
                            onChange={(e) => {
                              const p = [...selected.position] as [
                                number,
                                number,
                                number,
                              ];
                              p[i] = Number(e.target.value);
                              updateComponentPosition(selected.id, p);
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Special Component Interactive Controls */}
                  {selected.typeId === "potentiometer" && (
                    <div className="inspector-card">
                      <label className="text-xs font-semibold flex justify-between mb-1.5">
                        <span>Putaran Resistansi:</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {Math.round(Number(selected.state.value) * 100)}%
                        </span>
                      </label>
                      <input
                        aria-label="Putaran potensiometer"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        className="w-full cursor-pointer"
                        value={Number(selected.state.value)}
                        onChange={(e) =>
                          updateComponentState(selected.id, {
                            value: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}

                  {selected.typeId === "push_button" && (
                    <div className="inspector-card">
                      <span className="text-xs font-semibold block mb-1.5">Sakelar Tombol Fisik:</span>
                      <button
                        className="btn-primary w-full text-xs py-2"
                        onPointerDown={() =>
                          updateComponentState(selected.id, { isPressed: true })
                        }
                        onPointerUp={() =>
                          updateComponentState(selected.id, { isPressed: false })
                        }
                        onPointerLeave={() =>
                          updateComponentState(selected.id, { isPressed: false })
                        }
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter")
                            updateComponentState(selected.id, { isPressed: true });
                        }}
                        onKeyUp={() =>
                          updateComponentState(selected.id, { isPressed: false })
                        }
                      >
                        Tekan / Tahan Tombol
                      </button>
                    </div>
                  )}

                  {selected.typeId === "led_red" && (
                    <div className="inspector-card text-xs flex justify-between items-center">
                      <span className="opacity-80">Arus Dioda LED:</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        {Number(selected.state.currentMa || 0).toFixed(2)} mA
                      </span>
                    </div>
                  )}

                  <PinVoltages component={selected} />
                </div>
              ) : (
                <div className="inspector-empty-card">
                  <p className="font-semibold mb-1">Pilih Komponen</p>
                  <p className="text-xs opacity-75">
                    Klik salah satu komponen pada simulasi 3D untuk melihat parameter fisik, menggeser koordinat, atau menguji pin.
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-500/20 text-left text-xs flex flex-col gap-1.5 opacity-80">
                    <span className="font-semibold">Panduan Kontrol 3D:</span>
                    <span>- <strong>Drag Kiri</strong>: Orbit kamera bebas</span>
                    <span>- <strong>Drag Kanan/Tengah</strong>: Geser (Pan)</span>
                    <span>- <strong>Scroll Wheel</strong>: Zoom in/out</span>
                    <span>- <strong>R</strong>: Putar komponen terpilih</span>
                  </div>
                </div>
              )}

              <WireProperties />
            </div>
          )}
        </aside>

        {/* Code and Serial Monitor Panels */}
        <aside className="program-panel">
          <CodeEditorPanel />
          <SerialMonitor />
        </aside>
      </main>

      {/* 6. FOOTER */}
      <footer className="workspace-footer">
        DC kuasistatik · subset Arduino · 1 unit ≈ 5 mm · Kontrol 3D Orbit: Drag Kiri · Pan: Drag Kanan · Zoom: Scroll
        <span>
          <button
            type="button"
            className="text-blue-400 hover:text-blue-300 underline ml-2"
            onClick={() => setDatasheetOpen(true)}
          >
            Buka Katalog Datasheet Resmi
          </button>
        </span>
      </footer>
    </div>
  );
}
