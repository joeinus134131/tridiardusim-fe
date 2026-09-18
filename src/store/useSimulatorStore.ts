import { contacts, placementError, rotate, snapToBreadboard, worldBounds, type Vec } from "@/lib/components/placement";
import { create } from "zustand";
import { validWire } from "@/lib/project/project";
import {
  CircuitComponent,
  Wire,
  SerialMessage,
} from "@/lib/components/componentTypes";
import { generateId } from "@/lib/utils";
import { arduinoEngine } from "@/lib/simulation/ArduinoInterpreter";

interface SimulatorState {
  placementNotice: string;
  cameraView: "perspective" | "top" | "front";
  cameraMode: "orbit" | "pan";
  setCameraMode: (mode: "orbit" | "pan") => void;
  // Workspace
  components: CircuitComponent[];
  wires: Wire[];
  selectedComponentId: string | null;
  selectedWireId: string | null;

  // Editor & Simulation
  code: string;
  files: Array<{ name: string; content: string }>;
  activeFileName: string;
  setActiveFile: (name: string) => void;
  addFile: (name: string, content?: string) => void;
  deleteFile: (name: string) => void;
  simulationState: "stopped" | "running" | "paused";
  serialOutput: SerialMessage[];
  baudRate: number;
  sketchBaudRate: number;
  diagnostics: string[];
  elapsedMs: number;
  voltages: Record<string, number>;

  // Actions - Workspace
  addComponent: (component: Omit<CircuitComponent, "id">) => string;
  updateComponentPosition: (
    id: string,
    position: [number, number, number],
  ) => void;
  updateComponentRotation: (
    id: string,
    rotation: [number, number, number],
  ) => void;
  updateComponentState: (
    id: string,
    stateUpdate: Record<string, number | string | boolean>,
  ) => void;
  removeComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;

  updateWire: (id: string, patch: Partial<Pick<Wire, "color" | "path">>) => void;
  // Actions - Wiring
  addWire: (wire: Omit<Wire, "id">) => string;
  removeWire: (id: string) => void;
  selectWire: (id: string | null) => void;

  wiringState: {
    active: boolean;
    sourceComponentId: string | null;
    sourcePinId: string | null;
    currentTargetPos: [number, number, number] | null;
  };
  startWiring: (componentId: string, pinId: string) => void;
  updateWiringTarget: (pos: [number, number, number]) => void;
  finishWiring: (targetComponentId: string, targetPinId: string) => void;
  cancelWiring: () => void;

  // Actions - Editor & Sim
  setCode: (code: string) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  pauseSimulation: () => void;
  addSerialMessage: (msg: Omit<SerialMessage, "id" | "timestamp">) => void;
  clearSerial: () => void;
  setBaudRate: (rate: number) => void;
}

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  placementNotice: "",
  cameraView: "perspective",
  cameraMode: "orbit",
  setCameraMode: (mode) => set({ cameraMode: mode }),
  // Initial State
  components: [],
  wires: [],
  selectedComponentId: null,
  selectedWireId: null,

  code: `void setup() {
  // Put your setup code here, to run once:
  pinMode(13, OUTPUT);
}

void loop() {
  // Put your main code here, to run repeatedly:
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}`,
  files: [
    {
      name: "sketch.ino",
      content: `void setup() {
  // Put your setup code here, to run once:
  pinMode(13, OUTPUT);
}

void loop() {
  // Put your main code here, to run repeatedly:
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}`,
    },
  ],
  activeFileName: "sketch.ino",
  simulationState: "stopped",
  serialOutput: [],
  baudRate: 9600,
  sketchBaudRate: 0,
  diagnostics: [],
  elapsedMs: 0,
  voltages: {},

  wiringState: {
    active: false,
    sourceComponentId: null,
    sourcePinId: null,
    currentTargetPos: null,
  },

  // Actions
  addComponent: (component) => {
    if (get().components.length >= 100) return "";
    const id = generateId();
    let candidate = {...component, id};
    const floor = worldBounds(candidate).min[1];
    if(floor<0) candidate={...candidate,position:[candidate.position[0],candidate.position[1]-floor,candidate.position[2]]};
    for(let n=0; placementError(candidate,get().components) && n<200; n++) candidate={...candidate,position:[candidate.position[0]+2,candidate.position[1],candidate.position[2]]};
    set((state)=>({components:[...state.components,candidate],placementNotice:""}));
    return id;
  },

  updateComponentPosition: (id, position) => {
    const all=get().components, old=all.find(c=>c.id===id);
    if(!old || position.some(v=>!Number.isFinite(v))) return;
    let candidate={...old,position};
    if(position[0]!==old.position[0] || position[2]!==old.position[2]) candidate=snapToBreadboard(candidate,all);
    const children=all.filter(c=>contacts(c,all).some(p=>p.boardId===id));
    const moved=all.map(c=>c.id===id?candidate:children.includes(c)?{...c,position:c.position.map((v,i)=>v+candidate.position[i]-old.position[i]) as Vec}:c);
    const error=[candidate,...moved.filter(c=>children.some(x=>x.id===c.id))].map(c=>placementError(c,moved)).find(Boolean)||"";
    set(error?{placementNotice:error}:{components:moved,placementNotice:contacts(candidate,moved).length?"Kaki terpasang; kontak breadboard tersambung otomatis.":""});
  },
  updateComponentRotation: (id, rotation) => {
    const all = get().components,
      old = all.find((c) => c.id === id);
    if (!old) return;
    let candidate = snapToBreadboard({ ...old, rotation }, all);
    if (!contacts(candidate, all).length) {
      const b = worldBounds(candidate);
      if (b.min[1] < 0) {
        candidate = {
          ...candidate,
          position: [
            candidate.position[0],
            candidate.position[1] - b.min[1],
            candidate.position[2],
          ],
        };
      }
    }
    const delta = rotation.map((v, i) => v - old.rotation[i]) as Vec;
    const moved = all.map((c) =>
      c.id === id
        ? candidate
        : contacts(c, all).some((p) => p.boardId === id)
          ? {
              ...c,
              position: rotate(
                c.position.map((v, i) => v - old.position[i]) as Vec,
                delta
              ).map((v, i) => v + old.position[i]) as Vec,
              rotation: c.rotation.map((v, i) => v + delta[i]) as Vec,
            }
          : c
    );
    const error =
      moved
        .filter((c) => c !== all.find((x) => x.id === c.id))
        .map((c) => placementError(c, moved))
        .find(Boolean) || "";
    set(
      error
        ? { placementNotice: error }
        : { components: moved, placementNotice: "" }
    );
  },
  updateWire: (id, patch) => set(s=>({wires:s.wires.map(w=>w.id===id?{...w,...patch}:w)})),

  updateComponentState: (id, stateUpdate) => {
    const all=get().components;
    const old=all.find(c=>c.id===id); if(!old) return;
    const candidate={...old,state:{...old.state,...stateUpdate}};
    if(old.typeId.startsWith("jumper_") && ("depth" in stateUpdate || "bendHeight" in stateUpdate)) {
      const error=placementError(candidate,all);
      if(error) { set({placementNotice:error}); return; }
    }
    set({components:all.map(c=>c.id===id?candidate:c),placementNotice:""});
  },

  removeComponent: (id) => {
    set((state) => ({
      components: state.components.filter((c) => c.id !== id),
      // Also remove connected wires
      wires: state.wires.filter(
        (w) => w.sourceComponentId !== id && w.targetComponentId !== id,
      ),
      selectedComponentId:
        state.selectedComponentId === id ? null : state.selectedComponentId,
    }));
  },

  selectComponent: (id) =>
    set({ selectedComponentId: id, selectedWireId: null }),

  addWire: (wire) => {
    if (get().wires.length >= 500 || !validWire(get().components, get().wires, wire)) return "";
    const id = generateId();
    set((state) => ({
      wires: [...state.wires, { ...wire, id }],
    }));
    return id;
  },

  removeWire: (id) => {
    set((state) => ({
      wires: state.wires.filter((w) => w.id !== id),
      selectedWireId: state.selectedWireId === id ? null : state.selectedWireId,
    }));
  },

  selectWire: (id) => set({ selectedWireId: id, selectedComponentId: null }),

  startWiring: (componentId, pinId) =>
    set({
      wiringState: {
        active: true,
        sourceComponentId: componentId,
        sourcePinId: pinId,
        currentTargetPos: null,
      },
    }),

  updateWiringTarget: (pos) =>
    set((state) => ({
      wiringState: {
        ...state.wiringState,
        currentTargetPos: pos,
      },
    })),

  finishWiring: (targetComponentId, targetPinId) => {
    set((state) => {
      const { sourceComponentId, sourcePinId } = state.wiringState;
      if (
        !sourceComponentId ||
        !sourcePinId ||
        (sourceComponentId === targetComponentId && sourcePinId === targetPinId)
      ) {
        return {
          wiringState: {
            active: false,
            sourceComponentId: null,
            sourcePinId: null,
            currentTargetPos: null,
          },
        };
      }

      const newWire: Wire = {
        id: generateId(),
        sourceComponentId,
        sourcePinId,
        targetComponentId,
        targetPinId,
        color: "#3b82f6", // Default color, can be changed later
      };

      return {
        wires: state.wires.length < 500 && validWire(state.components, state.wires, newWire)
          ? [...state.wires, newWire]
          : state.wires,
        wiringState: {
          active: false,
          sourceComponentId: null,
          sourcePinId: null,
          currentTargetPos: null,
        },
      };
    });
  },

  cancelWiring: () =>
    set({
      wiringState: {
        active: false,
        sourceComponentId: null,
        sourcePinId: null,
        currentTargetPos: null,
      },
    }),

  setCode: (code) =>
    set((s) => ({
      code,
      files: s.files.map((f) =>
        f.name === s.activeFileName ? { ...f, content: code } : f
      ),
    })),

  setActiveFile: (name) =>
    set((s) => {
      const file = s.files.find((f) => f.name === name);
      if (!file) return {};
      return { activeFileName: name, code: file.content };
    }),

  addFile: (name, content = "") =>
    set((s) => {
      const trimmed = name.trim();
      if (!trimmed || s.files.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
        return {};
      }
      return {
        files: [...s.files, { name: trimmed, content }],
        activeFileName: trimmed,
        code: content,
      };
    }),

  deleteFile: (name) =>
    set((s) => {
      if (name === "sketch.ino") return {};
      const nextFiles = s.files.filter((f) => f.name !== name);
      const nextActive = s.activeFileName === name ? "sketch.ino" : s.activeFileName;
      const activeFile = nextFiles.find((f) => f.name === nextActive) || nextFiles[0];
      return {
        files: nextFiles,
        activeFileName: activeFile.name,
        code: activeFile.content,
      };
    }),

  startSimulation: () => {
    arduinoEngine.start();
  },
  stopSimulation: () => {
    set({ simulationState: "stopped" });
    arduinoEngine.stop();
  },
  pauseSimulation: () => {
    set({ simulationState: "paused" });
    arduinoEngine.pause();
  },

  addSerialMessage: (msg) => {
    const message: SerialMessage = {
      ...msg,
      id: generateId(),
      timestamp: Date.now(),
    };
    set((state) => ({
      serialOutput: [
        ...state.serialOutput.slice(-499),
        { ...message, message: message.message.slice(-16000) },
      ],
    }));
  },

  clearSerial: () => set({ serialOutput: [] }),
  setBaudRate: (baudRate) => set({ baudRate }),
}));
