"use client";
import React, { useState, useRef, useEffect } from "react";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { Play, Pause, Square, Check } from "lucide-react";

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
  onLoadExample,
  isRightPanelOpen,
  onToggleRightPanel,
  busy = false,
}: DesktopMenuBarProps) {
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
            File
          </button>
          {activeMenu === "file" && (
            <div className="menu-dropdown">
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onNewProject)}
              >
                <span>Proyek Baru</span>
                <span className="shortcut">Ctrl+N</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onSaveLocal)}
              >
                <span>Simpan Lokal (Browser)</span>
                <span className="shortcut">Ctrl+S</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onLoadLocal)}
              >
                <span>Buka dari Lokal</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onRestore)}
              >
                <span>Pulihkan Sesi Sebelumnya</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onExportJson)}
              >
                <span>Ekspor File JSON...</span>
                <span className="shortcut">Ctrl+E</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onImportJson)}
              >
                <span>Impor File JSON...</span>
                <span className="shortcut">Ctrl+O</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                disabled={busy}
                onClick={() => actionAndClose(onSaveServer)}
              >
                <span>Simpan ke Server (Backend)</span>
              </button>
              <button
                className="dropdown-item"
                disabled={busy}
                onClick={() => actionAndClose(onLoadServer)}
              >
                <span>Buka Proyek Server...</span>
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
            Edit
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
                <span>Putar Komponen (90°)</span>
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
                <span>Hapus Komponen Terpilih</span>
                <span className="shortcut">Del</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(cancelWiring)}
              >
                <span>Batalkan Jalur Kabel</span>
                <span className="shortcut">Esc</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item text-rose-400"
                onClick={() => actionAndClose(onClearAll)}
              >
                <span>Kosongkan Semua Ruang Kerja</span>
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
            View
          </button>
          {activeMenu === "view" && (
            <div className="menu-dropdown">
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(() => setCameraView("perspective"))}
              >
                <span>Perspektif 3D Orbit</span>
                <span className="shortcut">3D</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(() => setCameraView("top"))}
              >
                <span>Tampak Atas (Top View)</span>
                <span className="shortcut">2D</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(() => setCameraView("front"))}
              >
                <span>Tampak Depan (Front View)</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(() => setCameraMode("orbit"))}
              >
                <span className="flex items-center gap-1.5">
                  {cameraMode === "orbit" && <Check size={12} />}
                  Mode Putar (Orbit 3D)
                </span>
                <span className="shortcut">O</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(() => setCameraMode("pan"))}
              >
                <span className="flex items-center gap-1.5">
                  {cameraMode === "pan" && <Check size={12} />}
                  Mode Geser Bebas (Pan)
                </span>
                <span className="shortcut">H</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onToggleRightPanel)}
              >
                <span>
                  {isRightPanelOpen ? "Tutup Panel Properti" : "Buka Panel Properti"}
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
            Tools
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
                  Jalankan Simulasi
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
                  Jeda Simulasi
                </span>
              </button>
              <button
                className="dropdown-item"
                disabled={simulationState === "stopped"}
                onClick={() => actionAndClose(stopSimulation)}
              >
                <span className="text-rose-400 flex items-center gap-1.5">
                  <Square size={12} />
                  Hentikan Simulasi
                </span>
                <span className="shortcut">Shift+F5</span>
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onOpenDatasheet)}
              >
                <span>Buka Lembar Datasheet Komponen</span>
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
            Help
          </button>
          {activeMenu === "help" && (
            <div className="menu-dropdown">
              <button
                className="dropdown-item"
                onClick={() => actionAndClose(onOpenHelp)}
              >
                <span>Panduan Navigasi & Simulasi</span>
                <span className="shortcut">F1</span>
              </button>
              <button
                className="dropdown-item font-semibold text-blue-400"
                onClick={() => actionAndClose(onOpenDatasheet)}
              >
                <span>Dokumentasi & Datasheet Asli</span>
              </button>
              <div className="dropdown-divider" />
              <div className="dropdown-header">Contoh Rangkaian:</div>
              {[
                ["esp32_wifi", "ESP32 Wi-Fi + Real Internet Fetch"],
                ["esp32", "ESP32 DevKit + Resistor Breadboard"],
                ["blink", "Arduino Uno Blink + LED"],
                ["button", "Tombol PushButton Pull-up"],
                ["pwm", "Potensiometer Kontrol PWM"],
                ["breadboard", "Breadboard BB400 + Jumper"],
                ["serial", "Komunikasi Serial Echo"],
              ].map(([id, label]) => (
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
