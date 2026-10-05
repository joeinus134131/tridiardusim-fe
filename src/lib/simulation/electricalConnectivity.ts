import { contacts } from "../components/placement";
import type { CircuitComponent, Wire } from "../components/componentTypes";

const terminal = (componentId: string, pinId: string) => `${componentId}:${pinId}`;

/** Build ideal electrical nets from wires, breadboard contacts and component internals. */
export function buildElectricalConnectivity(components: CircuitComponent[], wires: Wire[]) {
  const parent = new Map<string, string>();
  for (const component of components) {
    for (const pin of component.pins) {
      const id = terminal(component.id, pin.id);
      parent.set(id, id);
    }
  }

  const root = (id: string): string => {
    const p = parent.get(id);
    if (!p || p === id) return id;
    const result = root(p);
    parent.set(id, result);
    return result;
  };
  const join = (a: string, b: string) => {
    if (parent.has(a) && parent.has(b)) parent.set(root(a), root(b));
  };

  for (const component of components) {
    for (const contact of contacts(component, components)) {
      join(terminal(contact.componentId, contact.pinId), terminal(contact.boardId, contact.holeId));
    }
  }
  for (const wire of wires) {
    join(
      terminal(wire.sourceComponentId, wire.sourcePinId),
      terminal(wire.targetComponentId, wire.targetPinId),
    );
  }

  for (const component of components) {
    const connect = (a: string, b: string) => join(terminal(component.id, a), terminal(component.id, b));
    if (component.typeId.startsWith("jumper_")) connect("L", "R");
    if (component.typeId === "push_button") {
      connect("1a", "1b");
      connect("2a", "2b");
      if (component.state.isPressed) connect("1a", "2a");
    }
    if (component.typeId === "breadboard") {
      for (let column = 0; column < 30; column++) {
        for (const side of ["t", "b"]) {
          for (let row = 1; row < 5; row++) connect(`${side}${column}_0`, `${side}${column}_${row}`);
        }
      }
      for (const rail of ["pt1", "pt2", "pb1", "pb2"]) {
        for (let column = 1; column < 30; column++) connect(`${rail}_0`, `${rail}_${column}`);
      }
    }
    if (component.typeId === "esp32_wroom") {
      connect("GND1", "GND2");
      connect("GND1", "GND3");
    }
    if (component.typeId === "arduino_uno") {
      connect("GND1", "GND2");
      connect("GND1", "GND3");
      connect("SDA", "A4");
      connect("SCL", "A5");
      connect("IOREF", "5V");
      connect("ICSP_GND", "GND1");
      connect("ICSP_5V", "5V");
      connect("USB_ICSP_5V", "5V");
      connect("USB_ICSP_GND", "GND1");
      connect("ICSP_MOSI", "D11");
      connect("ICSP_MISO", "D12");
      connect("ICSP_SCK", "D13");
      connect("ICSP_RESET", "RESET");
    }
  }

  const net = (componentId: string, pinId: string) => root(terminal(componentId, pinId));
  return {
    net,
    root: (terminalId: string) => root(terminalId),
    terminals: [...parent.keys()],
    connected: (aComponentId: string, aPinId: string, bComponentId: string, bPinId: string) =>
      net(aComponentId, aPinId) === net(bComponentId, bPinId),
  };
}
