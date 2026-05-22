import { ComponentType, PinDefinition } from './componentTypes';

export interface ComponentRegistration {
  typeId: string;
  name: string;
  type: ComponentType;
  description: string;
  category: 'Boards' | 'Basic' | 'Sensors' | 'Actuators' | 'Displays' | 'Wiring';
  defaultState: Record<string, any>;
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
    return this.getAll().filter(c => c.category === category);
  }
}

export const ComponentRegistry = new Registry();

// ═══════════════════════════════════════════════════
// BOARDS
// ═══════════════════════════════════════════════════

ComponentRegistry.register({
  typeId: 'arduino_uno',
  name: 'Arduino Uno R3',
  type: 'board',
  description: 'The standard Arduino microcontroller board based on the ATmega328P.',
  category: 'Boards',
  defaultState: {},
  pins: [
    // Digital Pins (along the top edge of the board)
    ...Array.from({ length: 14 }).map((_, i) => ({
      id: `D${i}`,
      name: `Digital ${i}`,
      type: [3, 5, 6, 9, 10, 11].includes(i) ? 'pwm' as const : 'digital' as const,
      position: [4 - (i * 0.5), 0.5, -5] as [number, number, number],
    })),
    // Analog Pins (along the bottom edge)
    ...Array.from({ length: 6 }).map((_, i) => ({
      id: `A${i}`,
      name: `Analog ${i}`,
      type: 'analog' as const,
      position: [2 - (i * 0.5), 0.5, 5] as [number, number, number],
    })),
    // Power Pins
    { id: '5V', name: '5 Volts', type: 'power', position: [4, 0.5, 5] },
    { id: '3V3', name: '3.3 Volts', type: 'power', position: [4.5, 0.5, 5] },
    { id: 'GND1', name: 'Ground 1', type: 'ground', position: [3.5, 0.5, 5] },
    { id: 'GND2', name: 'Ground 2', type: 'ground', position: [3, 0.5, 5] },
    { id: 'GND3', name: 'Ground 3', type: 'ground', position: [-1, 0.5, -5] },
  ]
});

ComponentRegistry.register({
  typeId: 'breadboard',
  name: 'Breadboard',
  type: 'board',
  description: 'A standard half-size solderless breadboard for prototyping.',
  category: 'Boards',
  defaultState: {},
  pins: (() => {
    const pins: PinDefinition[] = [];
    const cols = 30;
    const pitch = 0.5; // 2.54mm scaled
    const startX = -cols * pitch / 2 + pitch / 2;
    const D = 10;
    const H = 0.8;
    
    for (let col = 0; col < cols; col++) {
      const x = startX + col * pitch;
      // Top half (rows a-e, columns 1-30)
      for (let row = 0; row < 5; row++) {
        pins.push({
          id: `t${col}_${row}`,
          name: `Top Row ${col + 1} Pin ${row + 1}`,
          type: 'digital',
          position: [x, H / 2 + 0.01, -1.5 - row * pitch],
        });
      }
      // Bottom half (rows f-j, columns 1-30)
      for (let row = 0; row < 5; row++) {
        pins.push({
          id: `b${col}_${row}`,
          name: `Bottom Row ${col + 1} Pin ${row + 1}`,
          type: 'digital',
          position: [x, H / 2 + 0.01, 1.5 + row * pitch],
        });
      }
    }
    // Power rail holes (top and bottom)
    for (let col = 0; col < cols; col++) {
      const x = startX + col * pitch;
      pins.push({ id: `pt1_${col}`, name: `Power Top + ${col}`, type: 'power', position: [x, H / 2 + 0.01, -D / 2 + 0.6] });
      pins.push({ id: `pt2_${col}`, name: `Power Top - ${col}`, type: 'ground', position: [x, H / 2 + 0.01, -D / 2 + 1.1] });
      pins.push({ id: `pb1_${col}`, name: `Power Bottom + ${col}`, type: 'power', position: [x, H / 2 + 0.01, D / 2 - 0.6] });
      pins.push({ id: `pb2_${col}`, name: `Power Bottom - ${col}`, type: 'ground', position: [x, H / 2 + 0.01, D / 2 - 1.1] });
    }
    return pins;
  })()
});

// ═══════════════════════════════════════════════════
// BASIC COMPONENTS
// ═══════════════════════════════════════════════════

ComponentRegistry.register({
  typeId: 'led_red',
  name: 'Red LED',
  type: 'actuator',
  description: 'A standard 5mm red light emitting diode.',
  category: 'Basic',
  defaultState: { isOn: false, brightness: 0, color: '#ef4444' },
  pins: [
    { id: 'A', name: 'Anode (+)', type: 'digital', position: [-0.25, -1, 0] },
    { id: 'C', name: 'Cathode (-)', type: 'ground', position: [0.25, -1, 0] },
  ]
});

ComponentRegistry.register({
  typeId: 'push_button',
  name: 'Push Button',
  type: 'sensor',
  description: 'A 6×6mm tactile push button switch.',
  category: 'Basic',
  defaultState: { isPressed: false },
  pins: [
    { id: '1a', name: 'Terminal 1a', type: 'digital', position: [-0.5, -0.5, -0.5] },
    { id: '1b', name: 'Terminal 1b', type: 'digital', position: [0.5, -0.5, -0.5] },
    { id: '2a', name: 'Terminal 2a', type: 'digital', position: [-0.5, -0.5, 0.5] },
    { id: '2b', name: 'Terminal 2b', type: 'digital', position: [0.5, -0.5, 0.5] },
  ]
});

ComponentRegistry.register({
  typeId: 'potentiometer',
  name: 'Potentiometer',
  type: 'sensor',
  description: 'A 10kΩ rotary potentiometer for analog input.',
  category: 'Basic',
  defaultState: { value: 0 },
  pins: [
    { id: '1', name: 'Terminal 1', type: 'power', position: [-0.5, -0.5, 0] },
    { id: 'W', name: 'Wiper', type: 'analog', position: [0, -0.5, 0] },
    { id: '2', name: 'Terminal 2', type: 'ground', position: [0.5, -0.5, 0] },
  ]
});

ComponentRegistry.register({
  typeId: 'resistor_220',
  name: 'Resistor 220Ω',
  type: 'passive',
  description: 'A 220Ω carbon film resistor. Common current limiter for LEDs.',
  category: 'Basic',
  defaultState: { resistance: 220 },
  pins: [
    { id: 'L', name: 'Lead 1', type: 'digital', position: [-1.8, 0.2, 0] },
    { id: 'R', name: 'Lead 2', type: 'digital', position: [1.8, 0.2, 0] },
  ]
});

// ═══════════════════════════════════════════════════
// WIRING
// ═══════════════════════════════════════════════════

ComponentRegistry.register({
  typeId: 'jumper_red',
  name: 'Jumper Wire (Red)',
  type: 'passive',
  description: 'A red male-to-male jumper wire for power connections.',
  category: 'Wiring',
  defaultState: { color: 'red', length: 4 },
  pins: [
    { id: 'L', name: 'Left Tip', type: 'digital', position: [-2, 0.1, 0] },
    { id: 'R', name: 'Right Tip', type: 'digital', position: [2, 0.1, 0] },
  ]
});

ComponentRegistry.register({
  typeId: 'jumper_black',
  name: 'Jumper Wire (Black)',
  type: 'passive',
  description: 'A black male-to-male jumper wire for ground connections.',
  category: 'Wiring',
  defaultState: { color: 'black', length: 4 },
  pins: [
    { id: 'L', name: 'Left Tip', type: 'digital', position: [-2, 0.1, 0] },
    { id: 'R', name: 'Right Tip', type: 'digital', position: [2, 0.1, 0] },
  ]
});

ComponentRegistry.register({
  typeId: 'jumper_blue',
  name: 'Jumper Wire (Blue)',
  type: 'passive',
  description: 'A blue male-to-male jumper wire for signal connections.',
  category: 'Wiring',
  defaultState: { color: 'blue', length: 4 },
  pins: [
    { id: 'L', name: 'Left Tip', type: 'digital', position: [-2, 0.1, 0] },
    { id: 'R', name: 'Right Tip', type: 'digital', position: [2, 0.1, 0] },
  ]
});

ComponentRegistry.register({
  typeId: 'jumper_green',
  name: 'Jumper Wire (Green)',
  type: 'passive',
  description: 'A green male-to-male jumper wire for signal connections.',
  category: 'Wiring',
  defaultState: { color: 'green', length: 4 },
  pins: [
    { id: 'L', name: 'Left Tip', type: 'digital', position: [-2, 0.1, 0] },
    { id: 'R', name: 'Right Tip', type: 'digital', position: [2, 0.1, 0] },
  ]
});

ComponentRegistry.register({
  typeId: 'jumper_yellow',
  name: 'Jumper Wire (Yellow)',
  type: 'passive',
  description: 'A yellow male-to-male jumper wire for signal connections.',
  category: 'Wiring',
  defaultState: { color: 'yellow', length: 4 },
  pins: [
    { id: 'L', name: 'Left Tip', type: 'digital', position: [-2, 0.1, 0] },
    { id: 'R', name: 'Right Tip', type: 'digital', position: [2, 0.1, 0] },
  ]
});
