"use client";
import { PhysicalProperties } from "@/components/panels/PhysicalProperties";
import { WireProperties } from "@/components/panels/WireProperties";
import { DesktopMenuBar } from "@/components/panels/DesktopMenuBar";
import { DatasheetModal } from "@/components/panels/DatasheetModal";
import {
  ServerProjectsModal,
  type ServerProjectSummary,
} from "@/components/panels/ServerProjectsModal";
import { useState, useEffect, useRef } from "react";
import {
  FileText,
  SlidersHorizontal,
  RotateCcw,
  Hand,
  Focus,
  X,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Square,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { useLanguage } from "@/i18n/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ComponentRegistry } from "@/lib/components/ComponentRegistry";
import { RobotControlPanel } from "@/components/panels/RobotControlPanel";
import { ActuatorJointPanel } from "@/components/panels/ActuatorJointPanel";
import { RoverControlPanel } from "@/components/panels/RoverControlPanel";
import { EncoderControlPanel } from "@/components/panels/EncoderControlPanel";
import { RGBDCameraPanel } from "@/components/panels/RGBDCameraPanel";
import { PlanarLidarPanel } from "@/components/panels/PlanarLidarPanel";
import { ImuControlPanel } from "@/components/panels/ImuControlPanel";
import { CloudAIGatewayPanel } from "@/components/panels/CloudAIGatewayPanel";
import { OnnxInferencePanel } from "@/components/panels/OnnxInferencePanel";
import { RigidBodyPanel } from "@/components/panels/RigidBodyPanel";
import { A4988ControlPanel, BatteryChargerControlPanel, BatteryPackControlPanel, DcDcConverterControlPanel, DcMotorControlPanel, DcSupplyControlPanel, L298NControlPanel } from "@/components/panels/PowerControlPanels";
import { CodeEditorPanel } from "@/components/panels/CodeEditorPanel";
import { SerialMonitor } from "@/components/panels/SerialMonitor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InteractiveTour } from "@/components/panels/InteractiveTour";
import { MobileWarningBanner } from "@/components/panels/MobileWarningBanner";
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
    loading: () => <p className="p-5">Loading 3D space…</p>,
  },
);
const SolderingWorkbench = dynamic(
  () => import("@/components/tools/SolderingWorkbench").then((m) => m.SolderingWorkbench),
  { ssr: false, loading: () => <p className="p-5">Loading workbench…</p> },
);
const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function RuntimeStatus() {
  const simulationState = useSimulatorStore((s) => s.simulationState);
  const elapsedMs = useSimulatorStore((s) => s.elapsedMs);
  const { t } = useLanguage();
  const label =
    simulationState === "running"
      ? t.common.stateRunning
      : simulationState === "paused"
        ? t.common.statePaused
        : t.common.stateStopped;
  return (
    <span className="runtime-status">
      {label} · {(elapsedMs / 1000).toFixed(1)} s
    </span>
  );
}

function PinVoltages({ component }: { component: CircuitComponent }) {
  const { t } = useLanguage();
  const voltages = useSimulatorStore((s) => s.voltages);
  const wiringActive = useSimulatorStore((s) => s.wiringState.active);
  const finishWiring = useSimulatorStore((s) => s.finishWiring);
  const startWiring = useSimulatorStore((s) => s.startWiring);
  return (
    <details className="inspector-details">
      <summary>
        {t.inspector.pinsTitle} ({component.pins.length})
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
            title={t.inspector.clickPinTitle}
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
  const { t, lang } = useLanguage();
  const components = useSimulatorStore((s) => s.components);
  const wires = useSimulatorStore((s) => s.wires);
  const code = useSimulatorStore((s) => s.code);
  const simulationState = useSimulatorStore((s) => s.simulationState);
  const placementNotice = useSimulatorStore((s) => s.placementNotice);
  const selectedComponentId = useSimulatorStore((s) => s.selectedComponentId);
  const selectedWireId = useSimulatorStore((s) => s.selectedWireId);
  const isWiringActive = useSimulatorStore((s) => s.wiringState.active);
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
  const cameraView = useSimulatorStore((s) => s.cameraView);
  const cameraMode = useSimulatorStore((s) => s.cameraMode);
  const setCameraMode = useSimulatorStore((s) => s.setCameraMode);

  const [query, setQuery] = useState("");
  const [name, setName] = useState(t.notices.defaultProjectName);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("komponen");
  const [projects, setProjects] = useState<ServerProjectSummary[]>([]);
  const [serverProjectsOpen, setServerProjectsOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [color, setColor] = useState("#2563eb");
  const [help, setHelp] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [datasheetOpen, setDatasheetOpen] = useState(false);
  const [datasheetKey, setDatasheetKey] = useState("esp32_wroom");
  const [solderingWorkbenchOpen, setSolderingWorkbenchOpen] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  // Subscribe to external selection changes and reveal the inspector once.
  useEffect(() => {
    return useSimulatorStore.subscribe((state, previousState) => {
      if (state.selectedComponentId && state.selectedComponentId !== previousState.selectedComponentId) {
        setRightPanelOpen(true);
      }
    });
  }, []);

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
      files: [{ name: "sketch.ino", content: p.code }],
      activeFileName: "sketch.ino",
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

      if (e.key === "h" || e.key === "H") {
        setCameraMode("pan");
      }
      if (e.key === "o" || e.key === "O") {
        setCameraMode("orbit");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedComponentId, selectedWireId, components, removeComponent, removeWire, updateComponentPosition, updateComponentRotation, setCameraMode]);

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
    setNotice(t.notices.openedRecovery);
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

  const fetchServerProjects = () =>
    guard(async () => {
      const response = await fetch(api + "/api/projects", {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(t.notices.backendUnavailable);
      const payload = (await response.json()) as { projects?: ServerProjectSummary[] };
      const list = Array.isArray(payload.projects) ? payload.projects : [];
      setProjects(list);
      setServerProjectsOpen(true);
      setNotice(t.notices.foundProjects.replace("{n}", String(list.length)));
    });

  const loadServerProject = (project: ServerProjectSummary) =>
    guard(async () => {
      const response = await fetch(api + "/api/projects/" + encodeURIComponent(project.id), {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(t.notices.backendUnavailable);
      replace(parseProject(await response.json()));
      setServerProjectsOpen(false);
    });

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
            setName(t.notices.newProjectDefault);
            setNotice(t.notices.newWorkspace);
          });
        }}
        onSaveLocal={() => {
          guard(() => {
            localStorage.setItem("ardusim-project", JSON.stringify(snapshot()));
            setNotice(t.notices.savedLocal);
          });
        }}
        onLoadLocal={() => {
          guard(() => {
            const data = localStorage.getItem("ardusim-project");
            if (!data) throw new Error(t.notices.noLocalData);
            replace(parseProject(JSON.parse(data)));
          });
        }}
        onRestore={() => {
          guard(() => {
            const data = localStorage.getItem("ardusim-recovery");
            if (!data) throw new Error(t.notices.noRecovery);
            replace(parseProject(JSON.parse(data)));
            setNotice(t.notices.restoredSession);
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
              throw new Error(t.notices.backendRejected + (await response.text()));
            }
            const p = await response.json();
            setNotice(t.notices.savedBackend + p.id);
          });
        }}
        onLoadServer={() => void fetchServerProjects()}
        onClearAll={() => {
          guard(() => {
            backup();
            useSimulatorStore.setState({
              components: [],
              wires: [],
              selectedComponentId: null,
            });
            setNotice(t.notices.workspaceCleared);
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
        onOpenSolderingWorkbench={() => {
          stopSimulation();
          setSolderingWorkbenchOpen(true);
        }}
        onStartTour={() => setTourOpen(true)}
        onLoadExample={(exId) => guard(() => replace(example(exId)))}
        isRightPanelOpen={rightPanelOpen}
        onToggleRightPanel={() => setRightPanelOpen(!rightPanelOpen)}
        busy={busy}
      />

      <ServerProjectsModal
        isOpen={serverProjectsOpen}
        projects={projects}
        busy={busy}
        labels={t.serverProjects}
        onClose={() => setServerProjectsOpen(false)}
        onRefresh={() => void fetchServerProjects()}
        onSelect={(project) => void loadServerProject(project)}
      />

      {/* 2. SUB-TOOLBAR */}
      <header className="workspace-toolbar">
        <div className="brand">
          IDN <span>MAKERSPACE</span> <small>LAB 3D</small>
        </div>

        <input
          aria-label={t.toolbar.projectNameAria}
          value={name}
          maxLength={128}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            className="btn-primary flex items-center gap-1.5"
            onClick={startSimulation}
            disabled={simulationState === "running"}
            data-tour="run-button"
          >
            {simulationState === "paused" ? (
              t.toolbar.resume
            ) : (
              <>
                <Play size={13} className="fill-current" />
                <span>{t.toolbar.run}</span>
              </>
            )}
          </button>
          <button
            className="small-button"
            onClick={pauseSimulation}
            disabled={simulationState !== "running"}
          >
            {t.toolbar.pause}
          </button>
          <button
            className="small-button flex items-center gap-1.5"
            onClick={stopSimulation}
            disabled={simulationState === "stopped"}
          >
            <Square size={11} className="fill-current" />
            <span>{t.toolbar.stop}</span>
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
          <FileText size={13} />
          <span>{t.toolbar.datasheet}</span>
        </button>
        <button
          className="small-button flex items-center gap-1.5"
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
          title={t.toolbar.togglePropsTitle}
        >
          <SlidersHorizontal size={13} />
          <span>{t.toolbar.properties}</span>
        </button>
        <button
          className="small-button flex items-center gap-1 text-sky-400 font-semibold border-sky-500/30 hover:bg-sky-500/10"
          onClick={() => setTourOpen(true)}
          title={t.tour.startTour}
          data-tour="guide-button"
        >
          <Sparkles size={12} className="text-sky-400" />
          <span>{t.toolbar.guide}</span>
        </button>
        <LanguageSwitcher />
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
              if (f.size > 2e6) throw new Error(t.notices.maxFileSize);
              replace(parseProject(JSON.parse(await f.text())));
            });
          e.target.value = "";
        }}
      />

      {/* System notices */}
      {notice && (
        <div role="status" className="notice">
          {notice}
          <button onClick={() => setNotice("")} aria-label={t.common.closeMessage}>
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
                {t.helpModal.title}
              </h3>
              <button className="datasheet-close-btn flex items-center justify-center" onClick={() => setHelp(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <div className="p-3 bg-slate-800/80 rounded border border-slate-700">
                <strong className="text-blue-400 block mb-1">{t.helpModal.navTitle}</strong>
                <p>- {t.helpModal.navOrbit}</p>
                <p>- {t.helpModal.navPan}</p>
                <p>- {t.helpModal.navZoom}</p>
              </div>
              <div className="p-3 bg-slate-800/80 rounded border border-slate-700">
                <strong className="text-emerald-400 block mb-1">{t.helpModal.physicalTitle}</strong>
                <p>- {t.helpModal.physicalDrag}</p>
                <p>- {t.helpModal.physicalSnap}</p>
                <p>- {t.helpModal.physicalRotatePrefix} <kbd className="px-1 py-0.5 bg-slate-700 rounded">R</kbd> {t.helpModal.physicalRotateSuffix}</p>
              </div>
              <div className="p-3 bg-slate-800/80 rounded border border-slate-700">
                <strong className="text-amber-400 block mb-1">{t.helpModal.wiringTitle}</strong>
                <p>- {t.helpModal.wiringClick}</p>
                <p>- {t.helpModal.wiringEscPrefix} <kbd className="px-1 py-0.5 bg-slate-700 rounded">Esc</kbd> {t.helpModal.wiringEscSuffix}</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between">
              <button
                className="btn-primary flex items-center gap-1.5 text-xs font-semibold"
                onClick={() => {
                  setHelp(false);
                  setTourOpen(true);
                }}
              >
                <Sparkles size={13} />
                <span>{t.helpModal.startTourBtn}</span>
              </button>
              <button className="small-button" onClick={() => setHelp(false)}>
                {t.helpModal.gotIt}
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
        <aside className="library-panel" data-tour="library-panel">
          <div className="panel-heading">
            <button
              onClick={() => setTab("komponen")}
              className={tab === "komponen" ? "active" : ""}
            >
              {t.library.components}
            </button>
            <button
              onClick={() => setTab("wiring")}
              className={tab === "wiring" ? "active" : ""}
            >
              {t.library.wiring}
            </button>
          </div>
          {tab === "komponen" ? (
            <>
              <input
                className="library-search"
                aria-label={t.library.searchAria}
                placeholder={t.library.searchPlaceholder}
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
                          setNotice(t.wiring.maxComponents);
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
                                  : c.typeId === "capacitor_universal"
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
                        {c.pins.length} {t.library.pinsUnit} · {c.category}
                      </small>
                      <p>{c.description}</p>
                    </button>
                  ))}
              </div>
              <div className="examples">
                <details>
                  <summary>{t.library.inCanvas} ({components.length})</summary>
                  {components.map((c) => (
                    <button
                      key={c.id}
                      className="pin-row"
                      aria-label={t.library.selectPrefix + c.name}
                      onClick={() => selectComponent(c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </details>
                <div className="flex items-center justify-between mt-1 mb-1">
                  <strong>{t.library.readyExamples}</strong>
                  <span className="text-[10px] opacity-60 font-mono">{t.library.presetsCount}</span>
                </div>
                <div className="examples-scroll-container">
                  {(
                    [
                      ["sensor_fusion", t.library.examples.sensor_fusion],
                      ["dht11", t.library.examples.dht11],
                      ["hcsr04", t.library.examples.hcsr04],
                      ["servo", t.library.examples.servo],
                      ["stepper_a4988", t.library.examples.stepper_a4988],
                      ["i2c_scan", t.library.examples.i2c_scan],
                      ["lcd1602", t.library.examples.lcd1602],
                      ["oled", t.library.examples.oled],
                      ["esp32_wifi", t.library.examples.esp32_wifi],
                      ["esp32", t.library.examples.esp32],
                      ["blink", t.library.examples.blink],
                      ["button", t.library.examples.button],
                      ["pwm", t.library.examples.pwm],
                      ["breadboard", t.library.examples.breadboard],
                      ["serial", t.library.examples.serial],
                    ] as [string, string][]
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      className="small-button text-left truncate"
                      style={{ flexShrink: 0, minHeight: 32 }}
                      onClick={() => guard(() => replace(example(id)))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="wiring-panel">
              <p>{t.wiring.hint}</p>
              <label>
                {t.wiring.from}
                <select
                  aria-label={t.wiring.fromAria}
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                >
                  <option value="">{t.wiring.selectPin}</option>
                  {options}
                </select>
              </label>
              <label>
                {t.wiring.to}
                <select
                  aria-label={t.wiring.toAria}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                >
                  <option value="">{t.wiring.selectPin}</option>
                  {options}
                </select>
              </label>
              <label>
                {t.wiring.color}
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
                      ? t.wiring.connected
                      : t.wiring.duplicateInvalid,
                  );
                }}
              >
                {t.wiring.connect}
              </button>
              <h3>{wires.length} {t.wiring.activeWires}</h3>
              {wires.map((w) => (
                <div key={w.id} className="wire-row flex items-center justify-between gap-1">
                  <button onClick={() => selectWire(w.id)} className="flex-1 text-left">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full border border-white/40 shrink-0"
                        style={{ backgroundColor: w.color }}
                      />
                      <span className="font-medium text-slate-200 truncate">
                        {components.find((c) => c.id === w.sourceComponentId)?.name || "Part"} · {w.sourcePinId}
                      </span>
                    </span>
                    <span className="opacity-60 text-[11px] block pl-4">
                      {t.wiring.toWord} {components.find((c) => c.id === w.targetComponentId)?.name || "Part"} · {w.targetPinId}
                    </span>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="color"
                      value={w.color}
                      onChange={(e) => {
                        useSimulatorStore.getState().updateWire(w.id, { color: e.target.value });
                        useSimulatorStore.getState().setActiveWireColor(e.target.value);
                      }}
                      title="Ubah warna kabel ini"
                      className="w-5 h-5 rounded-full cursor-pointer border border-white/30 bg-transparent p-0 overflow-hidden"
                    />
                    <button
                      aria-label={t.wiring.deleteWireAria + w.id}
                      onClick={() => removeWire(w.id)}
                      className="flex items-center justify-center p-1 hover:text-red-400 text-slate-400"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Center 3D Scene Panel */}
        <section className="scene-panel" data-tour="canvas-area">
          {solderingWorkbenchOpen ? (
            <SolderingWorkbench lang={lang} onClose={() => setSolderingWorkbenchOpen(false)} />
          ) : (
            <SimulatorCanvas />
          )}
          {!solderingWorkbenchOpen && <div className="camera-tools">
            <button
              className={`small-button flex items-center gap-1 ${cameraMode === "orbit" ? "active" : ""}`}
              onClick={() => setCameraMode("orbit")}
              title={t.cameraTools.orbitTitle}
            >
              <RotateCcw size={12} />
              <span>{t.cameraTools.orbit}</span>
            </button>
            <button
              className={`small-button flex items-center gap-1 ${cameraMode === "pan" ? "active" : ""}`}
              onClick={() => setCameraMode("pan")}
              title={t.cameraTools.panTitle}
            >
              <Hand size={12} />
              <span>{t.cameraTools.pan}</span>
            </button>
            <div className="divider" />
            {(
              [
                ["perspective", t.cameraTools.view3d],
                ["top", t.cameraTools.top],
                ["front", t.cameraTools.front],
              ] as const
            ).map(([view, label]) => (
              <button
                key={view}
                className={`small-button ${cameraView === view ? "active" : ""}`}
                onClick={() => useSimulatorStore.setState({ cameraView: view })}
              >
                {label}
              </button>
            ))}
            <div className="divider" />
            <button
              className="small-button flex items-center gap-1"
              onClick={() => {
                const current = useSimulatorStore.getState().cameraView;
                useSimulatorStore.setState({
                  cameraView: current === "perspective" ? "front" : "perspective",
                });
                setTimeout(
                  () => useSimulatorStore.setState({ cameraView: current }),
                  20,
                );
              }}
              title={t.cameraTools.fitTitle}
            >
              <Focus size={12} />
              <span>{t.cameraTools.fit}</span>
            </button>
          </div>}
          {!solderingWorkbenchOpen && !isWiringActive && !selectedWireId && (
            <div className="scene-instruction">
              <span>
                {cameraMode === "pan"
                  ? t.scene.panHint
                  : t.scene.orbitHint}
                {" · "}
                {t.scene.clickPinHint}
              </span>
            </div>
          )}
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
                  <SlidersHorizontal size={13} className="text-cyan-400" />
                  <span>{t.inspector.title}</span>
                </div>
                <button
                  className="small-button text-xs px-2 py-0.5"
                  onClick={() => setRightPanelOpen(false)}
                  title={t.inspector.closeTitle}
                  aria-label={t.inspector.closeTitle}
                >
                  <PanelRightClose size={14} />
                </button>
              </>
            ) : (
              <>
                <button
                  className="small-button text-xs p-1"
                  onClick={() => setRightPanelOpen(true)}
                  title={t.inspector.openTitle}
                  aria-label={t.inspector.openTitle}
                >
                  <PanelRightOpen size={14} />
                </button>
                <span className="collapsed-title">{t.inspector.collapsedTitle}</span>
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
                      <span className="inspector-subtitle font-mono break-all" title={selected.id}>ID: {selected.id}</span>
                    </div>
                    <button
                      aria-label={t.inspector.closeAria}
                      onClick={() => selectComponent(null)}
                      className="text-xs p-1 opacity-60 hover:opacity-100 font-bold"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <PhysicalProperties
                    key={selected.id}
                    component={selected}
                    onOpenDatasheet={(key) => openDatasheetFor(key)}
                  />
                  <RigidBodyPanel component={selected} components={components} updateState={updateComponentState} simulationState={simulationState} />

                  {(selected.typeId === "servo_sg90" || selected.typeId === "stepper_nema17" || selected.typeId === "dc_motor") && (
                    <ActuatorJointPanel
                      component={selected}
                      robots={components.filter((item) => item.typeId === "edu_arm_3dof" || item.typeId === "aero_arm_6dof")}
                      updateState={updateComponentState}
                    />
                  )}

                  {(selected.typeId === "edu_arm_3dof" || selected.typeId === "aero_arm_6dof") && (
                    <RobotControlPanel component={selected} updateState={updateComponentState} />
                  )}
                  {selected.typeId === "rover_bot_4wd" && (
                    <RoverControlPanel component={selected} updateState={updateComponentState} />
                  )}
                  {selected.typeId === "incremental_encoder" && (
                    <EncoderControlPanel
                      component={selected}
                      motors={components.filter((item) => item.typeId === "stepper_nema17" || item.typeId === "dc_motor")}
                      updateState={updateComponentState}
                    />
                  )}
                  {selected.typeId === "rgbd_camera" && (
                    <RGBDCameraPanel component={selected} updateState={updateComponentState} />
                  )}
                  {selected.typeId === "planar_lidar" && (
                    <PlanarLidarPanel component={selected} updateState={updateComponentState} />
                  )}
                  {selected.typeId === "imu_6axis" && (
                    <ImuControlPanel component={selected} updateState={updateComponentState} />
                  )}
                  {selected.typeId === "a4988_stepper_driver" && (
                    <A4988ControlPanel component={selected} updateState={updateComponentState} />
                  )}
                  {selected.typeId === "l298n_dual_hbridge" && (
                    <L298NControlPanel component={selected} />
                  )}
                  {selected.typeId === "dc_motor" && (
                    <DcMotorControlPanel component={selected} updateState={updateComponentState} />
                  )}
                  {selected.typeId === "dc_supply" && (
                    <DcSupplyControlPanel component={selected} updateState={updateComponentState} />
                  )}
                  {selected.typeId === "battery_pack" && (
                    <BatteryPackControlPanel component={selected} updateState={updateComponentState} />
                  )}
                  {selected.typeId === "dc_dc_converter" && (
                    <DcDcConverterControlPanel component={selected} updateState={updateComponentState} />
                  )}
                  {selected.typeId === "battery_charger" && (
                    <BatteryChargerControlPanel component={selected} updateState={updateComponentState} />
                  )}

                  {/* Mechanical & Dimensions info */}
                  <div className="inspector-card text-xs flex flex-col gap-1">
                    <div className="font-semibold text-xs">{physical?.variant}</div>
                    <div className="text-[11px] opacity-75">{physical?.dimensions}</div>
                    {physical?.source && (
                      <button
                        type="button"
                        onClick={() => openDatasheetFor(selected.typeId.startsWith("jumper_") ? "jumper" : selected.typeId)}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 mt-1 text-left"
                      >
                        <span>{t.inspector.viewSpecs}</span>
                        <ExternalLink size={12} />
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
                      {t.inspector.rotate90}
                    </button>
                    <button
                      className="small-button text-xs py-1.5 text-rose-600 dark:text-rose-400 font-medium"
                      onClick={() => {
                        backup();
                        removeComponent(selected.id);
                      }}
                    >
                      {t.inspector.deleteBtn}
                    </button>
                  </div>

                  {/* Transform Coordinate Controls */}
                  <div className="inspector-card">
                    <span className="text-[11px] font-semibold block mb-1.5 opacity-90">{t.inspector.position3d}</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["x", "y", "z"] as const).map((axis, i) => (
                        <label key={axis} className="text-[10px] flex flex-col gap-0.5 opacity-80 uppercase font-mono">
                          {axis}
                          <input
                            aria-label={t.inspector.positionAria + axis}
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
                        <span>{t.inspector.resistanceTurn}</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {Math.round(Number(selected.state.value) * 100)}%
                        </span>
                      </label>
                      <input
                        aria-label={t.inspector.potentiometerAria}
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
                      <span className="text-xs font-semibold block mb-1.5">{t.inspector.physicalSwitch}</span>
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
                        {t.inspector.pressHoldButton}
                      </button>
                    </div>
                  )}

                  {selected.typeId === "led_red" && (
                    <div className="inspector-card text-xs flex justify-between items-center">
                      <span className="opacity-80">{t.inspector.ledCurrent}</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        {Number(selected.state.currentMa || 0).toFixed(2)} mA
                      </span>
                    </div>
                  )}

                  <PinVoltages component={selected} />
                </div>
              ) : selectedWireId ? (
                <WireProperties />
              ) : (
                <div className="inspector-empty-card">
                  <p className="font-semibold mb-1">{t.inspector.selectComponent}</p>
                  <p className="text-xs opacity-75">
                    {t.inspector.selectComponentHint}
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-500/20 text-left text-xs flex flex-col gap-1.5 opacity-80">
                    <span className="font-semibold">{t.inspector.controlsTitle}</span>
                    <span>- {t.inspector.orbitFree}</span>
                    <span>- {t.inspector.panDrag}</span>
                    <span>- {t.inspector.zoomScroll}</span>
                    <span>- {t.inspector.rotateR}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Code and Serial Monitor Panels */}
        <aside className="program-panel" data-tour="code-editor">
          <CodeEditorPanel />
          <SerialMonitor />
        </aside>
      </main>

      {/* 6. FOOTER */}
      <footer className="workspace-footer">
        {t.footer.text}
        <span>
          <button
            type="button"
            className="text-blue-400 hover:text-blue-300 underline ml-2"
            onClick={() => setDatasheetOpen(true)}
          >
            {t.footer.openCatalog}
          </button>
        </span>
      </footer>

      {/* 7. INTERACTIVE TOUR ONBOARDING */}
      <CloudAIGatewayPanel />
      <OnnxInferencePanel />
      <InteractiveTour
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
      />

      {/* 8. MOBILE OPTIMAL EXPERIENCE WARNING */}
      <MobileWarningBanner />
    </div>
  );
}
