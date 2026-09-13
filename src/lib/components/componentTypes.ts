export type PinType = 'digital' | 'analog' | 'power' | 'ground' | 'pwm';
export type PinMode = 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP';
export type ComponentType = 'board' | 'sensor' | 'actuator' | 'passive' | 'display';

export interface PinDefinition {
  id: string;          // e.g., "D13", "A0", "5V", "GND"
  name: string;        // Display name
  type: PinType;
  position: [number, number, number]; // Local 3D coordinate relative to component center
}

export interface CircuitComponent {
  id: string;          // Unique ID for this placed instance
  typeId: string;      // Identifier from the registry (e.g., "arduino_uno", "led_red")
  name: string;        // User-customizable name
  type: ComponentType;
  position: [number, number, number]; // World position [x, y, z]
  rotation: [number, number, number]; // Euler rotation [x, y, z]
  state: Record<string, number | string | boolean>;         // Internal state (e.g., color, isOn, value)
  pins: PinDefinition[];
}

export interface Wire {
  id: string;
  sourceComponentId: string;
  sourcePinId: string;
  targetComponentId: string;
  targetPinId: string;
  color: string;
  path?: [number, number, number][]; // Optional custom routing points
}

export interface SerialMessage {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'error' | 'warning' | 'data';
}
