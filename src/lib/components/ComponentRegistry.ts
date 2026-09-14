import { esp32Pins } from "./esp32";
import { unoPins } from "./physical";
import { ComponentType, PinDefinition } from "./componentTypes";

export interface ComponentRegistration {
  typeId: string;
  name: string;
  type: ComponentType;
  description: string;
  category:
    "Boards" | "Basic" | "Sensors" | "Actuators" | "Displays" | "Wiring";
  defaultState: Record<string, number | string | boolean>;
  pins: PinDefinition[];
}

class Registry {
  private components = new Map<string, ComponentRegistration>();

  register(config: ComponentRegistration) {
    this.components.set(config.typeId, config);
  }

  get(typeId: string): ComponentRegistration | undefined {
    return this.components.get(typeId);
  }

  getAll(): ComponentRegistration[] {
    return Array.from(this.components.values());
  }

  getByCategory(category: string): ComponentRegistration[] {
    return this.getAll().filter((c) => c.category === category);
  }
}

export const ComponentRegistry = new Registry();

// ═══════════════════════════════════════════════════
// BOARDS
// ═══════════════════════════════════════════════════

// Pin pitch = 0.508 units (2.54mm at 1 unit ≈ 5mm scale)
// PCB dimensions: W = 13.72, D = 10.68

ComponentRegistry.register({
  typeId: "arduino_uno",
  name: "Arduino Uno R3",
  type: "board",
  description: "Uno R3 DIP · header 2.54 mm · GPIO, PWM, ADC & Serial virtual.",
  category: "Boards",
  defaultState: {},
  pins: unoPins,
});

ComponentRegistry.register({
 typeId: "esp32_wroom", name: "ESP32-WROOM DevKitC", type: "board", category: "Boards",
 description: "DevKitC V4 · 38 pin · GPIO 3.3 V, ADC 12-bit, PWM & Serial virtual.", defaultState: {}, pins: esp32Pins,
});

ComponentRegistry.register({
  typeId: "breadboard",
  name: "Breadboard BB400",
  type: "board",
  description: "BusBoard BB400 · 400 titik · empat rail kontinu.",
  category: "Boards",
  defaultState: {},
  pins: (() => {
    const pins: PinDefinition[] = [];
    const cols = 30;
    const pitch = 0.508; // 2.54mm scaled
    const startX = (-cols * pitch) / 2 + pitch / 2;
    const D = 10.8;
    const H = 1.7;

    for (let col = 0; col < cols; col++) {
      const x = startX + col * pitch;
      // Top half (rows a-e, columns 1-30)
      for (let row = 0; row < 5; row++) {
        pins.push({
          id: `t${col}_${row}`,
          name: `${String.fromCharCode(69 - row)}${col + 1}`,
          type: "digital",
          position: [x, H + 0.01, -0.762 - row * pitch],
        });
      }
      // Bottom half (rows f-j, columns 1-30)
      for (let row = 0; row < 5; row++) {
        pins.push({
          id: `b${col}_${row}`,
          name: `${String.fromCharCode(70 + row)}${col + 1}`,
          type: "digital",
          position: [x, H + 0.01, 0.762 + row * pitch],
        });
      }
    }
    // Power rail holes (top and bottom)
    for (let col = 0; col < 25; col++) {
      const x = -14 * pitch + (col + Math.floor(col / 5)) * pitch;
      pins.push({
        id: `pt1_${col}`,
        name: `Power Top + ${col}`,
        type: "power",
        position: [x, H + 0.01, -D / 2 + 0.6],
      });
      pins.push({
        id: `pt2_${col}`,
        name: `Power Top - ${col}`,
        type: "ground",
        position: [x, H + 0.01, -D / 2 + 1.1],
      });
      pins.push({
        id: `pb1_${col}`,
        name: `Power Bottom + ${col}`,
        type: "power",
        position: [x, H + 0.01, D / 2 - 0.6],
      });
      pins.push({
        id: `pb2_${col}`,
        name: `Power Bottom - ${col}`,
        type: "ground",
        position: [x, H + 0.01, D / 2 - 1.1],
      });
    }
    return pins;
  })(),
});

// ═══════════════════════════════════════════════════
// BASIC COMPONENTS
// ═══════════════════════════════════════════════════

ComponentRegistry.register({
  typeId: "led_red",
  name: "Red LED",
  type: "actuator",
  description: "A standard 5mm red light emitting diode.",
  category: "Basic",
  defaultState: { isOn: false, brightness: 0, color: "#ef4444" },
  pins: [
    {
      id: "A",
      name: "Anode (+)",
      type: "digital",
      position: [-0.254, -5.4, 0],
    },
    {
      id: "C",
      name: "Cathode (-)",
      type: "ground",
      position: [0.254, -5.1, 0],
    },
  ],
});

ComponentRegistry.register({
  typeId: "push_button",
  name: "Push Button",
  type: "sensor",
  description: "A 6×6mm tactile push button switch.",
  category: "Basic",
  defaultState: { isPressed: false },
  pins: [
    {
      id: "1a",
      name: "Terminal 1a",
      type: "digital",
      position: [-0.65, -0.7, -0.45],
    },
    {
      id: "1b",
      name: "Terminal 1b",
      type: "digital",
      position: [0.65, -0.7, -0.45],
    },
    {
      id: "2a",
      name: "Terminal 2a",
      type: "digital",
      position: [-0.65, -0.7, 0.45],
    },
    {
      id: "2b",
      name: "Terminal 2b",
      type: "digital",
      position: [0.65, -0.7, 0.45],
    },
  ],
});

ComponentRegistry.register({
  typeId: "potentiometer",
  name: "Potentiometer",
  type: "sensor",
  description: "A 10kΩ rotary potentiometer for analog input.",
  category: "Basic",
  defaultState: { value: 0 },
  pins: [
    {
      id: "1",
      name: "Terminal 1",
      type: "power",
      position: [-0.5, -0.7, 0.65],
    },
    { id: "W", name: "Wiper", type: "analog", position: [0, -0.7, 0.65] },
    {
      id: "2",
      name: "Terminal 2",
      type: "ground",
      position: [0.5, -0.7, 0.65],
    },
  ],
});

ComponentRegistry.register({
  typeId: "resistor_220",
  name: "Resistor 220Ω",
  type: "passive",
  description: "A 220Ω carbon film resistor. Common current limiter for LEDs.",
  category: "Basic",
  defaultState: { resistance: 220 },
  pins: [
    { id: "L", name: "Lead 1", type: "digital", position: [-1.016, -0.6, 0] },
    { id: "R", name: "Lead 2", type: "digital", position: [1.016, -0.6, 0] },
  ],
});

// ═══════════════════════════════════════════════════
// WIRING
// ═══════════════════════════════════════════════════

ComponentRegistry.register({
  typeId: "jumper_red",
  name: "Jumper Wire (Red)",
  type: "passive",
  description: "A red male-to-male jumper wire for power connections.",
  category: "Wiring",
  defaultState: { color: "red", length: 4, depth: 8, bendHeight: 0.3 },
  pins: [
    { id: "L", name: "Left Tip", type: "digital", position: [-2, 0.23, 0] },
    { id: "R", name: "Right Tip", type: "digital", position: [2, 0.23, 0] },
  ],
});

ComponentRegistry.register({
  typeId: "jumper_black",
  name: "Jumper Wire (Black)",
  type: "passive",
  description: "A black male-to-male jumper wire for ground connections.",
  category: "Wiring",
  defaultState: { color: "black", length: 4, depth: 8, bendHeight: 0.3 },
  pins: [
    { id: "L", name: "Left Tip", type: "digital", position: [-2, 0.23, 0] },
    { id: "R", name: "Right Tip", type: "digital", position: [2, 0.23, 0] },
  ],
});

ComponentRegistry.register({
  typeId: "jumper_blue",
  name: "Jumper Wire (Blue)",
  type: "passive",
  description: "A blue male-to-male jumper wire for signal connections.",
  category: "Wiring",
  defaultState: { color: "blue", length: 4, depth: 8, bendHeight: 0.3 },
  pins: [
    { id: "L", name: "Left Tip", type: "digital", position: [-2, 0.23, 0] },
    { id: "R", name: "Right Tip", type: "digital", position: [2, 0.23, 0] },
  ],
});

ComponentRegistry.register({
  typeId: "jumper_green",
  name: "Jumper Wire (Green)",
  type: "passive",
  description: "A green male-to-male jumper wire for signal connections.",
  category: "Wiring",
  defaultState: { color: "green", length: 4, depth: 8, bendHeight: 0.3 },
  pins: [
    { id: "L", name: "Left Tip", type: "digital", position: [-2, 0.23, 0] },
    { id: "R", name: "Right Tip", type: "digital", position: [2, 0.23, 0] },
  ],
});

ComponentRegistry.register({
  typeId: "jumper_yellow",
  name: "Jumper Wire (Yellow)",
  type: "passive",
  description: "A yellow male-to-male jumper wire for signal connections.",
  category: "Wiring",
  defaultState: { color: "yellow", length: 4, depth: 8, bendHeight: 0.3 },
  pins: [
    { id: "L", name: "Left Tip", type: "digital", position: [-2, 0.23, 0] },
    { id: "R", name: "Right Tip", type: "digital", position: [2, 0.23, 0] },
  ],
});
