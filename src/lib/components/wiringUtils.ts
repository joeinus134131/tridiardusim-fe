import * as THREE from "three";
import type { CircuitComponent } from "./componentTypes";

export interface SnappedPinInfo {
  componentId: string;
  componentName: string;
  pinId: string;
  pinName: string;
  position: [number, number, number];
}

export interface WireColorOption {
  id: string;
  name: string;
  enName: string;
  value: string;
  border?: string;
  hint: string;
}

export const WIRE_COLORS: WireColorOption[] = [
  { id: "red", name: "Merah", enName: "Red", value: "#ef4444", hint: "VCC / 5V / 3.3V" },
  { id: "black", name: "Hitam", enName: "Black", value: "#1e293b", hint: "GND / Ground" },
  { id: "blue", name: "Biru", enName: "Blue", value: "#3b82f6", hint: "Signal / General" },
  { id: "green", name: "Hijau", enName: "Green", value: "#22c55e", hint: "Signal / GPIO" },
  { id: "yellow", name: "Kuning", enName: "Yellow", value: "#eab308", hint: "SCL / Clock" },
  { id: "orange", name: "Oranye", enName: "Orange", value: "#f97316", hint: "SDA / Data" },
  { id: "purple", name: "Ungu", enName: "Purple", value: "#a855f7", hint: "RX / TX / SPI" },
  { id: "white", name: "Putih", enName: "White", value: "#f8fafc", hint: "Interconnect / Jumper" },
];

/**
 * Calculates the exact 3D world position of a pin on a component.
 */
export function getPinWorldPosition(
  comp: CircuitComponent,
  pinPos: [number, number, number],
): [number, number, number] {
  const v = new THREE.Vector3(...pinPos);
  v.applyEuler(new THREE.Euler(...comp.rotation));
  v.add(new THREE.Vector3(...comp.position));
  return [v.x, v.y, v.z];
}

/**
 * Finds the closest valid target pin to pointer coordinates within snap threshold.
 */
export function findClosestPin(
  components: CircuitComponent[],
  sourceComponentId: string | null,
  sourcePinId: string | null,
  pointerPoint: [number, number, number],
  snapThreshold: number = 1.35,
): SnappedPinInfo | null {
  let closest: SnappedPinInfo | null = null;
  let minDistance = snapThreshold;

  for (const comp of components) {
    for (const pin of comp.pins) {
      // Cannot connect pin to itself
      if (comp.id === sourceComponentId && pin.id === sourcePinId) continue;

      const pWorld = getPinWorldPosition(comp, pin.position);
      const dx = pointerPoint[0] - pWorld[0];
      const dy = pointerPoint[1] - pWorld[1];
      const dz = pointerPoint[2] - pWorld[2];

      // Slightly discount vertical offset since pointer moves mostly in XZ
      const dist = Math.sqrt(dx * dx + (dy * 0.6) * (dy * 0.6) + dz * dz);

      if (dist < minDistance) {
        minDistance = dist;
        closest = {
          componentId: comp.id,
          componentName: comp.name,
          pinId: pin.id,
          pinName: pin.name,
          position: pWorld,
        };
      }
    }
  }

  return closest;
}

/**
 * Intelligent electronics color suggestion based on pin function.
 */
export function detectSmartWireColor(
  pinName: string,
  fallbackColor: string = "#3b82f6",
): string {
  const lower = pinName.toLowerCase().trim();
  if (lower.includes("gnd") || lower.includes("ground") || lower === "cathode") {
    return "#1e293b"; // Black
  }
  if (
    lower.includes("vcc") ||
    lower.includes("5v") ||
    lower.includes("3v3") ||
    lower.includes("3.3v") ||
    lower.includes("vin") ||
    lower.includes("power") ||
    lower === "anode"
  ) {
    return "#ef4444"; // Red
  }
  if (lower.includes("scl") || lower.includes("clk") || lower.includes("clock")) {
    return "#eab308"; // Yellow
  }
  if (lower.includes("sda") || lower.includes("data") || lower.includes("pwm")) {
    return "#f97316"; // Orange
  }
  if (lower.includes("tx") || lower.includes("rx") || lower.includes("miso") || lower.includes("mosi")) {
    return "#a855f7"; // Purple
  }
  return fallbackColor;
}
