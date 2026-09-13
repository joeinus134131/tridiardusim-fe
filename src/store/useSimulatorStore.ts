import { create } from 'zustand';
import { validWire } from '@/lib/project/project';
import { CircuitComponent, Wire, SerialMessage } from '@/lib/components/componentTypes';
import { generateId } from '@/lib/utils';
import { arduinoEngine } from '@/lib/simulation/ArduinoInterpreter';

interface SimulatorState {
  cameraView: "perspective" | "top" | "front";
  // Workspace
  components: CircuitComponent[];
  wires: Wire[];
  selectedComponentId: string | null;
  selectedWireId: string | null;
  
  // Editor & Simulation
  code: string;
  simulationState: 'stopped' | 'running' | 'paused';
  serialOutput: SerialMessage[];
  baudRate: number;
  sketchBaudRate: number;
  diagnostics: string[];
  elapsedMs: number;
  voltages: Record<string, number>;
  
  // Actions - Workspace
  addComponent: (component: Omit<CircuitComponent, 'id'>) => string;
  updateComponentPosition: (id: string, position: [number, number, number]) => void;
  updateComponentRotation: (id: string, rotation: [number, number, number]) => void;
  updateComponentState: (id: string, stateUpdate: Record<string, number | string | boolean>) => void;
  removeComponent: (id: string) => void;
  selectComponent: (id: string | null) => void;
  
  // Actions - Wiring
  addWire: (wire: Omit<Wire, 'id'>) => string;
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
  addSerialMessage: (msg: Omit<SerialMessage, 'id' | 'timestamp'>) => void;
  clearSerial: () => void;
  setBaudRate: (rate: number) => void;
}

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  cameraView: "perspective",
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
  simulationState: 'stopped',
  serialOutput: [],
  baudRate: 9600,
  sketchBaudRate: 0, diagnostics: [], elapsedMs: 0, voltages: {},
  
  wiringState: {
    active: false,
    sourceComponentId: null,
    sourcePinId: null,
    currentTargetPos: null,
  },

  // Actions
  addComponent: (component) => {
    const id = generateId();
    set((state) => ({
      components: [...state.components, { ...component, id }],
    }));
    return id;
  },

  updateComponentPosition: (id, position) => {
    set((state) => ({
      components: state.components.map((c) => 
        c.id === id ? { ...c, position } : c
      ),
    }));
  },

  updateComponentRotation: (id, rotation) => {
    set((state) => ({
      components: state.components.map((c) => 
        c.id === id ? { ...c, rotation } : c
      ),
    }));
  },

  updateComponentState: (id, stateUpdate) => {
    set((state) => ({
      components: state.components.map((c) => 
        c.id === id ? { ...c, state: { ...c.state, ...stateUpdate } } : c
      ),
    }));
  },

  removeComponent: (id) => {
    set((state) => ({
      components: state.components.filter((c) => c.id !== id),
      // Also remove connected wires
      wires: state.wires.filter((w) => w.sourceComponentId !== id && w.targetComponentId !== id),
      selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
    }));
  },

  selectComponent: (id) => set({ selectedComponentId: id, selectedWireId: null }),

  addWire: (wire) => {
    if (!validWire(get().components, get().wires, wire)) return '';
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

  startWiring: (componentId, pinId) => set({
    wiringState: {
      active: true,
      sourceComponentId: componentId,
      sourcePinId: pinId,
      currentTargetPos: null,
    }
  }),
  
  updateWiringTarget: (pos) => set((state) => ({
    wiringState: {
      ...state.wiringState,
      currentTargetPos: pos,
    }
  })),
  
  finishWiring: (targetComponentId, targetPinId) => {
    set((state) => {
      const { sourceComponentId, sourcePinId } = state.wiringState;
      if (!sourceComponentId || !sourcePinId || 
          (sourceComponentId === targetComponentId && sourcePinId === targetPinId)) {
        return { 
          wiringState: { active: false, sourceComponentId: null, sourcePinId: null, currentTargetPos: null } 
        };
      }
      
      const newWire: Wire = {
        id: generateId(),
        sourceComponentId,
        sourcePinId,
        targetComponentId,
        targetPinId,
        color: '#3b82f6', // Default color, can be changed later
      };
      
      return {
        wires: validWire(state.components, state.wires, newWire) ? [...state.wires, newWire] : state.wires,
        wiringState: { active: false, sourceComponentId: null, sourcePinId: null, currentTargetPos: null }
      };
    });
  },
  
  cancelWiring: () => set({
    wiringState: { active: false, sourceComponentId: null, sourcePinId: null, currentTargetPos: null }
  }),

  setCode: (code) => set({ code }),
  
  startSimulation: () => {
    arduinoEngine.start();
  },
  stopSimulation: () => {
    set({ simulationState: 'stopped' });
    arduinoEngine.stop();
  },
  pauseSimulation: () => {
    set({ simulationState: 'paused' });
    arduinoEngine.pause();
  },

  addSerialMessage: (msg) => {
    const message: SerialMessage = {
      ...msg,
      id: generateId(),
      timestamp: Date.now(),
    };
    set((state) => ({
      serialOutput: [...state.serialOutput.slice(-499), { ...message, message: message.message.slice(-16000) }],
    }));
  },

  clearSerial: () => set({ serialOutput: [] }),
  setBaudRate: (baudRate) => set({ baudRate }),
}));
