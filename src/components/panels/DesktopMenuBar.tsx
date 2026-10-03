"use client";
import React, { useState, useRef, useEffect } from "react";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { useLanguage } from "@/i18n/LanguageContext";
import { Play, Pause, Square, Check, Sparkles } from "lucide-react";

interface DesktopMenuBarProps {
  onNewProject: () => void;
  onSaveLocal: () => void;
  onLoadLocal: () => void;
  onRestore: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onSaveServer: () => void;
  onLoadServer: () => void;
  onClearAll: () => void;
  onOpenDatasheet: () => void;
  onOpenHelp: () => void;
  onStartTour?: () => void;
  onLoadExample: (id: string) => void;
  isRightPanelOpen: boolean;
  onToggleRightPanel: () => void;
  busy?: boolean;
}

export function DesktopMenuBar({
  onNewProject,
  onSaveLocal,
  onLoadLocal,
  onRestore,
  onExportJson,
  onImportJson,
  onSaveServer,
  onLoadServer,
  onClearAll,
  onOpenDatasheet,
  onOpenHelp,
  onStartTour,
  onLoadExample,
  isRightPanelOpen,
  onToggleRightPanel,
  busy = false,
}: DesktopMenuBarProps) {
  const { t } = useLanguage();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  const simulationState = useSimulatorStore((s) => s.simulationState);
  const startSimulation = useSimulatorStore((s) => s.startSimulation);
  const pauseSimulation = useSimulatorStore((s) => s.pauseSimulation);
  const stopSimulation = useSimulatorStore((s) => s.stopSimulation);
  const setCameraView = (view: "perspective" | "top" | "front") =>
    useSimulatorStore.setState({ cameraView: view });
  const selectedId = useSimulatorStore((s) => s.selectedComponentId);
  const components = useSimulatorStore((s) => s.components);
  const removeComponent = useSimulatorStore((s) => s.removeComponent);
  const updateComponentRotation = useSimulatorStore(
    (s) => s.updateComponentRotation,
  );
  const cancelWiring = useSimulatorStore((s) => s.cancelWiring);
  const cameraMode = useSimulatorStore((s) => s.cameraMode);
  const setCameraMode = useSimulatorStore((s) => s.setCameraMode);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuBarRef.current &&
        !menuBarRef.current.contains(e.target as Node)
      ) {
        setActiveMenu(null);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuClick = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleMenuHover = (menuName: string) => {
    if (activeMenu !== null) {
      setActiveMenu(menuName);
    }
  };

  const actionAndClose = (fn: () => void) => {
    fn();
    setActiveMenu(null);
  };

  const helpExamples: [string, string][] = [
    ["esp32_wifi", t.library.helpExamples.esp32_wifi],
    ["esp32", t.library.helpExamples.esp32],
    ["blink", t.library.helpExamples.blink],
    ["button", t.library.helpExamples.button],
    ["pwm", t.library.helpExamples.pwm],
    ["breadboard", t.library.helpExamples.breadboard],
    ["serial", t.library.helpExamples.serial],
  ];

  return (
    <div className="desktop-menubar-wrapper" ref={menuBarRef}>
      <div className="desktop-menubar">
        {/* FILE MENU */}
        <div className="menu-item-container">
          <button
            className={`menu-trigger-btn ${activeMenu === "file" ? "active" : ""}`}
            onClick={() => handleMenuClick("file")}
            onMouseEnter={() => handleMenuHover("file")}
          >
            {t.menu.file}
          </button>
          {activeMenu === "file" && (
            <div className="menu-dropdown">
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onNewProject)}
              >
                <span>{t.menu.newProject}</span>
                <span className="shortcut">Ctrl+N</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onSaveLocal)}
              >
                <span>{t.menu.saveLocal}</span>
                <span className="shortcut">Ctrl+S</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onLoadLocal)}
              >
                <span>{t.menu.openLocal}</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onRestore)}
              >
                <span>{t.menu.restoreSession}</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onExportJson)}
              >
                <span>{t.menu.exportJson}</span>
                <span className="shortcut">Ctrl+E</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onImportJson)}
              >
                <span>{t.menu.importJson}</span>
                <span className="shortcut">Ctrl+O</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                disabled={busy}
                onClick={() => actionAndClose(onSaveServer)}
              >
                <span>{t.menu.saveServer}</span>
              </button>
              <button
                className="dropdown-item"
                disabled={busy}
                onClick={() => actionAndClose(onLoadServer)}
              >
                <span>{t.menu.openServer}</span>
              </button>
            </div>
          )}
        </div>

        {/* EDIT MENU */}
        <div className="menu-item-container">
          <button
            className={`menu-trigger-btn ${activeMenu === "edit" ? "active" : ""}`}
            onClick={() => handleMenuClick("edit")}
            onMouseEnter={() => handleMenuHover("edit")}
          >
            {t.menu.edit}
          </button>
          {activeMenu === "edit" && (
            <div className="menu-dropdown">
              <button
                className="dropdown-item"
                disabled={!selectedId}
                onClick={() =>
                  actionAndClose(() => {
                    const comp = components.find((c) => c.id === selectedId);
                    if (comp) {
                      updateComponentRotation(comp.id, [
                        0,
                        comp.rotation[1] + Math.PI / 2,
                        0,
                      ]);
                    }
                  })
                }
              >
                <span>{t.menu.rotateComponent}</span>
                <span className="shortcut">R</span>
              </button>
              <button
                className="dropdown-item"
                disabled={!selectedId}
                onClick={() =>
                  actionAndClose(() => {
                    if (selectedId) removeComponent(selectedId);
                  })
                }
              >
                <span>{t.menu.deleteSelected}</span>
                <span className="shortcut">Del</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(cancelWiring)}
              >
                <span>{t.menu.cancelWire}</span>
                <span className="shortcut">Esc</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item text-rose-400"
                onClick={() => actionAndClose(onClearAll)}
              >
                <span>{t.menu.clearWorkspace}</span>
              </button>
            </div>
          )}
        </div>

        {/* VIEW MENU */}
        <div className="menu-item-container">
          <button
            className={`menu-trigger-btn ${activeMenu === "view" ? "active" : ""}`}
            onClick={() => handleMenuClick("view")}
            onMouseEnter={() => handleMenuHover("view")}
          >
            {t.menu.view}
          </button>
          {activeMenu === "view" && (
            <div className="menu-dropdown">
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(() => setCameraView("perspective"))}
              >
                <span>{t.menu.perspective3d}</span>
                <span className="shortcut">3D</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(() => setCameraView("top"))}
              >
                <span>{t.menu.topView}</span>
                <span className="shortcut">2D</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(() => setCameraView("front"))}
              >
                <span>{t.menu.frontView}</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(() => setCameraMode("orbit"))}
              >
                <span className="flex items-center gap-1.5">
                  {cameraMode === "orbit" && <Check size={12} />}
                  {t.menu.orbitMode}
                </span>
                <span className="shortcut">O</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(() => setCameraMode("pan"))}
              >
                <span className="flex items-center gap-1.5">
                  {cameraMode === "pan" && <Check size={12} />}
                  {t.menu.panMode}
                </span>
                <span className="shortcut">H</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onToggleRightPanel)}
              >
                <span>
                  {isRightPanelOpen ? t.menu.closeProps : t.menu.openProps}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* TOOLS MENU */}
        <div className="menu-item-container">
          <button
            className={`menu-trigger-btn ${activeMenu === "tools" ? "active" : ""}`}
            onClick={() => handleMenuClick("tools")}
            onMouseEnter={() => handleMenuHover("tools")}
          >
            {t.menu.tools}
          </button>
          {activeMenu === "tools" && (
            <div className="menu-dropdown">
              <button
                className="dropdown-item"
                disabled={simulationState === "running"}
                onClick={() => actionAndClose(startSimulation)}
              >
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <Play size={12} />
                  {t.menu.runSim}
                </span>
                <span className="shortcut">F5</span>
              </button>
              <button
                className="dropdown-item"
                disabled={simulationState !== "running"}
                onClick={() => actionAndClose(pauseSimulation)}
              >
                <span className="flex items-center gap-1.5">
                  <Pause size={12} />
                  {t.menu.pauseSim}
                </span>
              </button>
              <button
                className="dropdown-item"
                disabled={simulationState === "stopped"}
                onClick={() => actionAndClose(stopSimulation)}
              >
                <span className="text-rose-400 flex items-center gap-1.5">
                  <Square size={12} />
                  {t.menu.stopSim}
                </span>
                <span className="shortcut">Shift+F5</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onOpenDatasheet)}
              >
                <span>{t.menu.openDatasheet}</span>
                <span className="shortcut">D</span>
              </button>
            </div>
          )}
        </div>

        {/* HELP MENU */}
        <div className="menu-item-container">
          <button
            className={`menu-trigger-btn ${activeMenu === "help" ? "active" : ""}`}
            onClick={() => handleMenuClick("help")}
            onMouseEnter={() => handleMenuHover("help")}
          >
            {t.menu.help}
          </button>
          {activeMenu === "help" && (
            <div className="menu-dropdown">
              {onStartTour && (
                <button
                  className="dropdown-item text-sky-400 font-semibold"
                  onClick={() => actionAndClose(onStartTour)}
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={12} />
                    {t.menu.startTour}
                  </span>
                  <span className="shortcut">Tour</span>
                </button>
              )}
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onOpenHelp)}
              >
                <span>{t.menu.navGuide}</span>
                <span className="shortcut">F1</span>
              </button>
              <button
                className="dropdown-item font-semibold text-blue-400"
                onClick={() => actionAndClose(onOpenDatasheet)}
              >
                <span>{t.menu.docsDatasheet}</span>
              </button>
              <div className="dropdown-divider" />
              <div className="dropdown-header">{t.menu.examplesLabel}</div>
              {helpExamples.map(([id, label]) => (
                <button
                  key={id}
                  className="dropdown-item pl-5"
                  onClick={() => actionAndClose(() => onLoadExample(id))}
                >
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
