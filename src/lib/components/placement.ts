import type { CircuitComponent } from './componentTypes';

export type Vec = [number, number, number];
export type Bounds = { min: Vec; max: Vec };

// Conservative physical envelopes, including terminals; no mesh scaling during placement.
export function localBounds(c: CircuitComponent): Bounds {
  const bounds: Record<string, [Vec, Vec]> = {
    arduino_uno: [[-7.8, 0, -5.34], [6.86, 2.8, 5.34]],
    esp32_wroom: [[-2.79, -0.6, -5.5], [2.79, 1.15, 5.7]],
    breadboard: [[-8.4, 0, -5.43], [8.4, 1.7, 5.43]],
    resistor_220: [[-1.05, -0.6, -0.25], [1.05, 0.49, 0.25]],
    led_red: [[-0.59, -0.6, -0.59], [0.59, 1.5, 0.59]],
    push_button: [[-0.8, -0.6, -0.9], [0.8, 0.86, 0.9]],
    potentiometer: [[-1, -0.6, -1], [1, 3.2, 1]],
    oled_ssd1306: [[-2.7, -0.6, -2.7], [2.7, 1.0, 2.7]],
  };
  const b = c.typeId.startsWith('jumper_')
    ? ([[-3.7, 0, -Number(c.state.depth || 8) - 0.2], [3.7, Number(c.state.bendHeight || 0.3) + 0.2, 0.1]] as [Vec, Vec])
    : bounds[c.typeId] || [[-0.5, 0, -0.5], [0.5, 1, 0.5]];
  return { min: b[0], max: b[1] };
}

export function rotate(v: Vec, r: Vec): Vec {
  const [a, b, c] = r, [x, y, z] = v;
  const xx = x * Math.cos(c) - y * Math.sin(c), yy = x * Math.sin(c) + y * Math.cos(c);
  const xxx = xx * Math.cos(b) + z * Math.sin(b), zz = -xx * Math.sin(b) + z * Math.cos(b);
  return [xxx, yy * Math.cos(a) - zz * Math.sin(a), yy * Math.sin(a) + zz * Math.cos(a)];
}

export function world(c: CircuitComponent, p: Vec): Vec {
  return rotate(p, c.rotation).map((v, i) => v + c.position[i]) as Vec;
}

export function worldBounds(c: CircuitComponent): Bounds {
  const b = localBounds(c), points: Vec[] = [];
  for (const x of [b.min[0], b.max[0]]) {
    for (const y of [b.min[1], b.max[1]]) {
      for (const z of [b.min[2], b.max[2]]) {
        points.push(world(c, [x, y, z]));
      }
    }
  }
  return {
    min: [0, 1, 2].map((i) => Math.min(...points.map((p) => p[i]))) as Vec,
    max: [0, 1, 2].map((i) => Math.max(...points.map((p) => p[i]))) as Vec,
  };
}

export const mountable = (c: CircuitComponent) =>
  ['resistor_220', 'led_red', 'potentiometer', 'push_button', 'esp32_wroom', 'oled_ssd1306'].includes(c.typeId);

export type Contact = { componentId: string; pinId: string; boardId: string; holeId: string };

export function contacts(c: CircuitComponent, all: CircuitComponent[]): Contact[] {
  if (!mountable(c)) return [];
  for (const b of all.filter((x) => x.typeId === 'breadboard')) {
    const holes = b.pins.map((p) => ({ id: p.id, p: world(b, p.position) }));
    const pairs: Contact[] = [];
    for (const pin of c.pins) {
      const p = world(c, pin.position);
      // Toleransi horizontal diperluas ke 0.15 unit (cukup untuk snapping lubang breadboard)
      // dan vertikal toleran di sekitar lubang (tinggi breadboard Y=1.71)
      const hole = holes.find(
        (h) => Math.hypot(p[0] - h.p[0], p[2] - h.p[2]) < 0.15 && Math.abs(p[1] - h.p[1]) < 0.55
      );
      if (hole) pairs.push({ componentId: c.id, pinId: pin.id, boardId: b.id, holeId: hole.id });
    }
    // Jika semua pin masuk lubang yang berbeda di breadboard
    if (pairs.length === c.pins.length && new Set(pairs.map((p) => p.holeId)).size === pairs.length) {
      return pairs;
    }
  }
  return [];
}

export function snapToBreadboard(c: CircuitComponent, all: CircuitComponent[]): CircuitComponent {
  if (!mountable(c) || c.rotation[0] !== 0 || c.rotation[2] !== 0) return c;
  const breadboards = all.filter(
    (x) => x.typeId === 'breadboard' && x.rotation[0] === 0 && x.rotation[2] === 0
  );
  if (!breadboards.length) return c;

  const minPinY = Math.min(...c.pins.map((p) => p.position[1]));

  for (const b of breadboards) {
    const bb = worldBounds(b);
    // Cek apakah posisi X-Z komponen berada di area breadboard (+ sedikit margin)
    if (
      c.position[0] < bb.min[0] - 0.4 ||
      c.position[0] > bb.max[0] + 0.4 ||
      c.position[2] < bb.min[2] - 0.4 ||
      c.position[2] > bb.max[2] + 0.4
    ) {
      continue;
    }

    const firstPin = world(c, c.pins[0].position);
    // Sort lubang breadboard terdekat dari pin pertama
    const holes = b.pins
      .map((p) => ({ id: p.id, pos: world(b, p.position) }))
      .sort(
        (p1, p2) =>
          Math.hypot(p1.pos[0] - firstPin[0], p1.pos[2] - firstPin[2]) -
          Math.hypot(p2.pos[0] - firstPin[0], p2.pos[2] - firstPin[2])
      );

    // Ketinggian permukaan breadboard = 1.71
    // Letakkan komponen sehingga ujung kaki masuk ke lubang (~0.35 unit di bawah permukaan Y=1.71)
    const targetY = 1.71 - minPinY - 0.35;

    for (const hole of holes.slice(0, 16)) {
      const dist = Math.hypot(hole.pos[0] - firstPin[0], hole.pos[2] - firstPin[2]);
      if (dist > 1.2) continue;

      const candidate: CircuitComponent = {
        ...c,
        position: [
          c.position[0] + (hole.pos[0] - firstPin[0]),
          targetY,
          c.position[2] + (hole.pos[2] - firstPin[2]),
        ],
      };

      if (contacts(candidate, [b]).length) {
        return candidate;
      }
    }

    // Jika pin belum persis align dengan lubang tapi komponen berada di atas breadboard,
    // dudukkan komponen tepat di permukaan breadboard (jangan tembus)
    const surfaceY = 1.71 - minPinY - 0.1;
    return { ...c, position: [c.position[0], surfaceY, c.position[2]] };
  }

  // Jika berada di luar breadboard dan sebelumnya melayang tinggi, dudukkan di atas meja (Y=0)
  const tableY = Math.max(0, -minPinY);
  if (c.position[1] > 1.2) {
    return { ...c, position: [c.position[0], tableY, c.position[2]] };
  }

  return c;
}

export function placementError(c: CircuitComponent, all: CircuitComponent[]): string {
  const a = worldBounds(c);
  const own = contacts(c, all);

  if (a.min[1] < -0.15 && !own.length) {
    return 'Kaki komponen tidak boleh menembus meja.';
  }

  const occupied = new Set(
    all
      .filter((x) => x.id !== c.id)
      .flatMap((x) => contacts(x, all))
      .map((x) => x.boardId + ':' + x.holeId)
  );

  if (own.some((x) => occupied.has(x.boardId + ':' + x.holeId))) {
    return 'Lubang breadboard sudah ditempati kaki komponen lain.';
  }

  for (const other of all) {
    if (other.id === c.id) continue;
    if (own.some((x) => x.boardId === other.id) || contacts(other, all).some((x) => x.boardId === c.id)) {
      continue;
    }
    // Jika komponen berada di atas breadboard, abaikan tabrakan bounding box dengan bodi breadboard
    if (other.typeId === 'breadboard' && a.min[1] >= 1.5) continue;
    if (c.typeId === 'breadboard' && worldBounds(other).min[1] >= 1.5) continue;

    const b = worldBounds(other);
    if (
      a.max[0] > b.min[0] + 0.05 &&
      a.min[0] < b.max[0] - 0.05 &&
      a.max[1] > b.min[1] + 0.05 &&
      a.min[1] < b.max[1] - 0.05 &&
      a.max[2] > b.min[2] + 0.05 &&
      a.min[2] < b.max[2] - 0.05
    ) {
      return `Terhalang ${other.name}: bounding box bertabrakan.`;
    }
  }
  return '';
}
