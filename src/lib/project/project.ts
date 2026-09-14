import { ComponentRegistry } from "../components/ComponentRegistry";
import type { CircuitComponent, Wire } from "../components/componentTypes";
export interface Project {
  version: 1;
  name: string;
  code: string;
  components: CircuitComponent[];
  wires: Wire[];
}
export function validWire(
  components: CircuitComponent[],
  wires: Wire[],
  w: Omit<Wire, "id">,
): boolean {
  const has = (id: string, p: string) =>
    components.some((c) => c.id === id && c.pins.some((x) => x.id === p));
  return (
    has(w.sourceComponentId, w.sourcePinId) &&
    has(w.targetComponentId, w.targetPinId) &&
    !(
      w.sourceComponentId === w.targetComponentId &&
      w.sourcePinId === w.targetPinId
    ) &&
    !wires.some(
      (x) =>
        (x.sourceComponentId === w.sourceComponentId &&
          x.sourcePinId === w.sourcePinId &&
          x.targetComponentId === w.targetComponentId &&
          x.targetPinId === w.targetPinId) ||
        (x.targetComponentId === w.sourceComponentId &&
          x.targetPinId === w.sourcePinId &&
          x.sourceComponentId === w.targetComponentId &&
          x.sourcePinId === w.targetPinId),
    )
  );
}
const record = (x: unknown): Record<string, unknown> => {
  if (!x || typeof x !== "object" || Array.isArray(x))
    throw new Error("Objek proyek tidak valid");
  return x as Record<string, unknown>;
};
const str = (x: unknown, max = 128) => {
  if (typeof x !== "string" || !x.length || x.length > max)
    throw new Error("Teks proyek tidak valid");
  return x;
};
const vector = (x: unknown): [number, number, number] => {
  if (
    !Array.isArray(x) ||
    x.length !== 3 ||
    x.some(
      (v) =>
        typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > 10000,
    )
  )
    throw new Error("Posisi/rotasi tidak valid");
  return x as [number, number, number];
};
export function parseProject(input: unknown): Project {
  const p = record(input);
  if (p.version !== 1) throw new Error("Versi proyek tidak didukung");
  if (typeof p.code !== "string" || p.code.length > 64000)
    throw new Error("Sketch maksimum 64 KB");
  if (
    !Array.isArray(p.components) ||
    p.components.length > 100 ||
    !Array.isArray(p.wires) ||
    p.wires.length > 500
  )
    throw new Error("Batas proyek: 100 komponen, 500 kabel");
  const ids = new Set<string>();
  const components = p.components.map((raw) => {
    const c = record(raw);
    const id = str(c.id);
    if (!/^[\w-]+$/.test(id) || ids.has(id))
      throw new Error("ID komponen tidak valid/duplikat");
    ids.add(id);
    const config = ComponentRegistry.get(str(c.typeId));
    if (!config) throw new Error("Komponen tidak dikenal");
    const s = record(c.state);
    const state = { ...config.defaultState };
    for (const [k, v] of Object.entries(s))
      if (k in state && typeof v === typeof state[k])
        state[k] = v as number | string | boolean;
    if("depth" in state) state.depth=Math.max(3,Math.min(16,Number(state.depth)||8));
    if("bendHeight" in state) state.bendHeight=Math.max(.3,Math.min(8,Number(state.bendHeight)||.3));
    if ("value" in state)
      state.value = Math.max(0, Math.min(1, Number(state.value) || 0));
    if ("resistance" in state)
      state.resistance = Math.max(
        1,
        Math.min(1e7, Number(state.resistance) || 220),
      );
    return {
      id,
      name: str(c.name),
      typeId: config.typeId,
      type: config.type,
      pins: config.pins,
      position: vector(c.position),
      rotation: vector(c.rotation),
      state,
    };
  });
  const wires: Wire[] = [];
  const wireIds = new Set<string>();
  for (const raw of p.wires) {
    const x = record(raw);
    const w: Wire = {
      id: str(x.id),
      sourceComponentId: str(x.sourceComponentId),
      sourcePinId: str(x.sourcePinId),
      targetComponentId: str(x.targetComponentId),
      targetPinId: str(x.targetPinId),
      color: str(x.color),
    };
    if (
      !/^#[a-f\d]{6}$/i.test(w.color) ||
      wireIds.has(w.id) ||
      !validWire(components, wires, w)
    )
      throw new Error("Kabel tidak valid/duplikat atau pin hilang");
    if(x.path !== undefined) {
      if(!Array.isArray(x.path) || x.path.length>12) throw new Error("Maksimum 12 titik lekukan kabel");
      w.path=x.path.map(vector);
    }
    wireIds.add(w.id);
    wires.push(w);
  }
  return { version: 1, name: str(p.name), code: p.code, components, wires };
}
export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
