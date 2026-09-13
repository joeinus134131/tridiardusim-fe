"use client";
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
    <details>
      <summary>Pin dan tegangan</summary>
      {component.pins.map((p: PinDefinition) => (
        <button
          className="pin-row"
          key={p.id}
          onClick={() =>
            wiringActive
              ? finishWiring(component.id, p.id)
              : startWiring(component.id, p.id)
          }
        >
          {p.id}{" "}
          <span>
            {voltages[component.id + ":" + p.id]?.toFixed(2) ?? "—"} V
          </span>
        </button>
      ))}
    </details>
  );
}

export default function WorkspacePage() {
  const components = useSimulatorStore((s) => s.components);
  const wires = useSimulatorStore((s) => s.wires);
  const code = useSimulatorStore((s) => s.code);
  const simulationState = useSimulatorStore((s) => s.simulationState);
  const selectedComponentId = useSimulatorStore((s) => s.selectedComponentId);
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
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [saved, setSaved] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

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
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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

  return (
    <div className="workspace">
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
        <button className="small-button" onClick={() => setHelp(!help)}>
          Panduan
        </button>
        <ThemeToggle />
      </header>
      <div className="project-bar">
        <button
          className="small-button"
          onClick={() =>
            guard(() => {
              localStorage.setItem(
                "ardusim-project",
                JSON.stringify(snapshot()),
              );
              setNotice("Tersimpan lokal di browser ini.");
            })
          }
        >
          Simpan lokal
        </button>
        <button
          className="small-button"
          onClick={() =>
            guard(() =>
              replace(
                parseProject(
                  JSON.parse(localStorage.getItem("ardusim-project") || "null"),
                ),
              ),
            )
          }
        >
          Buka lokal
        </button>
        <button
          className="small-button"
          onClick={() =>
            guard(() => {
              const p = parseProject(
                JSON.parse(localStorage.getItem("ardusim-recovery") || "null"),
              );
              load(p);
              setNotice("Rangkaian sebelumnya dipulihkan.");
            })
          }
        >
          Pulihkan
        </button>
        <button
          className="small-button"
          onClick={() =>
            download(name + ".json", JSON.stringify(snapshot(), null, 2))
          }
        >
          Ekspor JSON
        </button>
        <button className="small-button" onClick={() => file.current?.click()}>
          Impor JSON
        </button>
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
        <button
          className="small-button"
          disabled={busy}
          onClick={() =>
            guard(async () => {
              const response = await fetch(api + "/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(snapshot()),
                signal: AbortSignal.timeout(5000),
              });
              if (!response.ok)
                throw new Error(
                  "Backend menolak proyek: " + (await response.text()),
                );
              const p = await response.json();
              setNotice("Tersimpan di backend: " + p.id);
            })
          }
        >
          Simpan server
        </button>
        <button
          className="small-button"
          disabled={busy}
          onClick={() =>
            guard(async () => {
              const r = await fetch(api + "/api/projects", {
                signal: AbortSignal.timeout(5000),
              });
              if (!r.ok) throw new Error("Backend tidak tersedia");
              setProjects((await r.json()).projects);
              setNotice("Daftar proyek server diperbarui.");
            })
          }
        >
          Daftar server
        </button>
        <select
          aria-label="Proyek server"
          value={saved}
          onChange={(e) => setSaved(e.target.value)}
        >
          <option value="">Proyek server…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          className="small-button"
          disabled={!saved || busy}
          onClick={() =>
            guard(async () => {
              const r = await fetch(api + "/api/projects/" + saved, {
                signal: AbortSignal.timeout(5000),
              });
              if (!r.ok) throw new Error("Gagal membaca proyek server");
              replace(parseProject(await r.json()));
            })
          }
        >
          Buka server
        </button>
      </div>
      {notice && (
        <div role="status" className="notice">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Tutup pesan">
            ×
          </button>
        </div>
      )}
      {help && (
        <div className="help-box">
          <strong>Bangun → hubungkan → program → jalankan</strong>
          <p>
            Tambah komponen, geser bodinya, klik pin awal lalu pin tujuan. Esc
            membatalkan. Untuk pin kecil gunakan tab Sambungan. Putar komponen
            melalui propertinya. Orbit: drag kanan; zoom: roda; pan: tombol
            tengah. Posisi bertumpuk tidak otomatis tersambung: setiap sambungan
            harus berupa kabel.
          </p>
          <p>
            Satu Uno virtual; catu ideal, resistor/pot DC, LED perkiraan 1.8 V,
            tombol/jumper/breadboard kontinuitas. PWM berupa tegangan rata-rata;
            floating input deterministik 0. Tidak ada emulasi AVR/C++ penuh,
            SPICE, library, I2C/SPI, USB, regulator Vin, toleransi atau
            kerusakan. RESET/AREF/NC hanya terminal fisik. Model geometris
            berbasis varian rujukan; detail mikro dan cetakan belum identik
            dengan benda fisik.
          </p>
          <p>
            Contoh mengganti workspace dengan cadangan Pulihkan. Simpan lokal
            atau ekspor JSON sebelum menutup halaman.
          </p>
        </div>
      )}
      <main className="workspace-main">
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
                  .filter((c) =>
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
                          setNotice("Batas 100 komponen");
                          return;
                        }
                        const n = components.length;
                        const item = instance(c.typeId, crypto.randomUUID(), [
                          (n % 4) * 6 - 8,
                          c.typeId === "led_red"
                            ? 5.5
                            : c.typeId === "push_button"
                              ? 0.7
                              : c.typeId === "potentiometer"
                                ? 0.8
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
                  <summary>Komponen terpasang ({components.length})</summary>
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
                <strong>Contoh rangkaian</strong>
                {[
                  ["blink", "Blink + resistor"],
                  ["button", "Tombol INPUT_PULLUP"],
                  ["pwm", "Potensiometer → PWM"],
                  ["breadboard", "Breadboard + jumper"],
                  ["serial", "Serial echo"],
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
              <h3>{wires.length} kabel</h3>
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
        <section className="scene-panel">
          <SimulatorCanvas />
          <div className="camera-tools">
            {(
              [
                ["perspective", "Perspektif"],
                ["top", "Atas"],
                ["front", "Depan"],
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
                <strong>Tujuan untuk {wiringSourcePinId}</strong>
                <button onClick={cancelWiring}>Batalkan · Esc</button>
              </>
            ) : (
              <span>
                {components.length} komponen · {wires.length} kabel · klik pin
                untuk menyambung
              </span>
            )}
          </div>
          {diagnostics.length > 0 && (
            <div className="diagnostics" role="alert">
              {diagnostics.map((d, i) => (
                <p key={i}>{d}</p>
              ))}
            </div>
          )}
        </section>
        {selected && (
          <div className="properties">
            <div className="panel-heading">
              <strong>{selected.name}</strong>
              <button
                aria-label="Tutup properti"
                onClick={() => selectComponent(null)}
              >
                ×
              </button>
            </div>
            <div className="property-body">
              <p>{physical?.variant}</p>
              <p>{physical?.dimensions}</p>
              <details>
                <summary>Akurasi model</summary>
                <p>{physical?.limits}</p>
                {physical?.source && (
                  <a
                    href={physical.source}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400"
                  >
                    Rujukan pabrikan ↗
                  </a>
                )}
              </details>
              <button
                className="small-button"
                onClick={() =>
                  updateComponentRotation(selected.id, [
                    0,
                    selected.rotation[1] + Math.PI / 2,
                    0,
                  ])
                }
              >
                Putar 90°
              </button>
              <button
                className="small-button"
                onClick={() => {
                  backup();
                  removeComponent(selected.id);
                }}
              >
                Hapus komponen
              </button>
              {(["x", "y", "z"] as const).map((axis, i) => (
                <label key={axis}>
                  {axis}
                  <input
                    aria-label={"Posisi " + axis}
                    type="number"
                    step="0.508"
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
              {selected.typeId === "potentiometer" && (
                <label>
                  Putaran {Math.round(Number(selected.state.value) * 100)}%
                  <input
                    aria-label="Putaran potensiometer"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={Number(selected.state.value)}
                    onChange={(e) =>
                      updateComponentState(selected.id, {
                        value: Number(e.target.value),
                      })
                    }
                  />
                </label>
              )}
              {selected.typeId === "push_button" && (
                <button
                  className="btn-primary"
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
                  Tahan tombol
                </button>
              )}
              {selected.typeId === "led_red" && (
                <p>
                  Arus: {Number(selected.state.currentMa || 0).toFixed(2)} mA
                </p>
              )}
              <PinVoltages component={selected} />
            </div>
          </div>
        )}
        <aside className="program-panel">
          <CodeEditorPanel />
          <SerialMonitor />
        </aside>
      </main>
      <footer className="workspace-footer">
        DC kuasistatik · subset Arduino · 1 unit ≈ 5 mm{" "}
        <span>Referensi bentuk dan batas dukungan: docs/INVENTARIS.md</span>
      </footer>
    </div>
  );
}
