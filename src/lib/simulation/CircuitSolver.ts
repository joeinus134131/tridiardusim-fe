import { isMicrocontroller } from "../components/esp32";
import { contacts } from "../components/placement";
import type {
  CircuitComponent,
  Wire,
  PinMode,
} from "../components/componentTypes";

export interface IO {
  mode: PinMode;
  value: number;
}
export interface CircuitResult {
  voltages: Record<string, number>;
  states: Record<string, Record<string, number | boolean | string>>;
  warnings: string[];
}
export const terminal = (id: string, pin: string) => `${id}:${pin}`;

/** Quasi-static DC nodal solver. Ideal nets, finite output impedance, piecewise LED. */
export function solveCircuit(
  components: CircuitComponent[],
  wires: Wire[],
  io: Record<string, IO>,
): CircuitResult {
  const parent = new Map<string, string>();
  for (const c of components)
    for (const p of c.pins)
      parent.set(terminal(c.id, p.id), terminal(c.id, p.id));
  const root = (x: string): string => {
    const p = parent.get(x);
    if (!p || p === x) return x;
    const r = root(p);
    parent.set(x, r);
    return r;
  };
  const join = (a: string, b: string) => {
    if (parent.has(a) && parent.has(b)) parent.set(root(a), root(b));
  };
  for(const c of components) for(const p of contacts(c,components)) join(terminal(p.componentId,p.pinId),terminal(p.boardId,p.holeId));
  for (const w of wires)
    join(
      terminal(w.sourceComponentId, w.sourcePinId),
      terminal(w.targetComponentId, w.targetPinId),
    );
  for (const c of components) {
    const j = (a: string, b: string) =>
      join(terminal(c.id, a), terminal(c.id, b));
    if (c.typeId.startsWith("jumper_")) j("L", "R");
    if (c.typeId === "push_button") {
      j("1a", "1b");
      j("2a", "2b");
      if (c.state.isPressed) j("1a", "2a");
    }
    if (c.typeId === "breadboard") {
      for (let col = 0; col < 30; col++)
        for (const side of ["t", "b"])
          for (let row = 1; row < 5; row++)
            j(`${side}${col}_0`, `${side}${col}_${row}`);
      for (const rail of ["pt1", "pt2", "pb1", "pb2"])
        for (let col = 1; col < 30; col++) j(`${rail}_0`, `${rail}_${col}`);
    }
    if(c.typeId === "esp32_wroom") {j("GND1","GND2"); j("GND1","GND3");}
    if (c.typeId === "arduino_uno") {
      j("GND1", "GND2");
      j("GND1", "GND3");
      j("SDA", "A4");
      j("SCL", "A5");
      j("IOREF", "5V");
      j("ICSP_GND", "GND1");
      j("ICSP_5V", "5V");
      j("USB_ICSP_5V", "5V");
      j("USB_ICSP_GND", "GND1");
      j("ICSP_MOSI", "D11");
      j("ICSP_MISO", "D12");
      j("ICSP_SCK", "D13");
      j("ICSP_RESET", "RESET");
    }
  }
  const warnings = new Set<string>();
  const fixed = new Map<string, number>();
  const sources: { node: string; voltage: number; resistance: number }[] = [];
  const edges: { a: string; b: string; r: number; vf: number; led?: string }[] =
    [];
  const node = (c: CircuitComponent, p: string) => root(terminal(c.id, p));
  const fix = (n: string, v: number) => {
    if (fixed.has(n) && Math.abs(fixed.get(n)! - v) > 0.01)
      warnings.add("Hubung singkat antar catu/GND: hasil tidak valid.");
    fixed.set(n, v);
  };
  for (const c of components) {
    if (isMicrocontroller(c.typeId)) {
      fix(node(c, "GND1"), 0);
      fix(node(c, "5V"), 5);
      fix(node(c, "3V3"), 3.3);
      for (const p of c.pins) {
        const pin = io[p.id];
        if (pin?.mode === "OUTPUT")
          sources.push({
            node: node(c, p.id),
            voltage: pin.value,
            resistance: 25,
          });
        else if (pin?.mode === "INPUT_PULLUP")
          sources.push({ node: node(c, p.id), voltage: c.typeId === "esp32_wroom" ? 3.3 : 5, resistance: 30000 });
      }
    }
    if (c.typeId === "plc_omron_cp1e") {
      // The compact simulation exposes the CP1E's 24 V control supply. Relay
      // outputs are dry contacts and therefore bridge COMQ only when active.
      fix(node(c, "0V"), 0);
      fix(node(c, "24V"), 24);
      const outputMask = Number(c.state.outputMask || 0);
      for (let i = 0; i < 8; i++) {
        if (outputMask & (1 << i)) {
          edges.push({ a: node(c, "COMQ"), b: node(c, `Y${i}`), r: 0.05, vf: 0 });
        }
      }
    }
    if (c.typeId === "resistor_220")
      edges.push({
        a: node(c, "L"),
        b: node(c, "R"),
        r: Math.max(1, Number(c.state.resistance) || 220),
        vf: 0,
      });
    if (c.typeId === "potentiometer") {
      const v = Math.max(0, Math.min(1, Number(c.state.value) || 0));
      edges.push(
        {
          a: node(c, "1"),
          b: node(c, "W"),
          r: Math.max(1, 10000 * (1 - v)),
          vf: 0,
        },
        { a: node(c, "W"), b: node(c, "2"), r: Math.max(1, 10000 * v), vf: 0 },
      );
    }
    if (c.typeId === "led_red")
      edges.push({
        a: node(c, "A"),
        b: node(c, "C"),
        r: 10,
        vf: 1.8,
        led: c.id,
      });
    if (c.typeId === "oled_ssd1306")
      edges.push({
        a: node(c, "VCC"),
        b: node(c, "GND"),
        r: 220,
        vf: 0,
      });
    if (c.typeId === "servo_sg90")
      edges.push({
        a: node(c, "VCC"),
        b: node(c, "GND"),
        r: 100,
        vf: 0,
      });
    if (c.typeId === "stepper_nema17") {
      // SY42STH38-class bipolar winding: 1.65 ohm per phase.
      edges.push(
        { a: node(c, "A+"), b: node(c, "A-"), r: 1.65, vf: 0 },
        { a: node(c, "B+"), b: node(c, "B-"), r: 1.65, vf: 0 },
      );
    }
    if (c.typeId === "lcd1602_i2c")
      edges.push({
        a: node(c, "VCC"),
        b: node(c, "GND"),
        r: 160,
        vf: 0,
      });
    if (c.typeId === "dht11")
      edges.push({
        a: node(c, "VCC"),
        b: node(c, "GND"),
        r: 2500,
        vf: 0,
      });
    if (c.typeId === "hcsr04")
      edges.push({
        a: node(c, "VCC"),
        b: node(c, "GND"),
        r: 330,
        vf: 0,
      });
    if (c.typeId === "capacitor_universal") {
      const cap = Math.max(1e-12, Number(c.state.capacitance) || 470e-6);
      const dt = 0.005; // 5ms quasi-static integration step
      const rCap = dt / cap;
      const esr = Math.max(0.01, Number(c.state.esr) || 0.1);
      const rTotal = esr + rCap;
      const vPrev = Number(c.state.voltage) || 0;
      const vf = vPrev * (rCap / rTotal);
      edges.push({
        a: node(c, "A"),
        b: node(c, "C"),
        r: Math.max(0.05, rTotal),
        vf,
      });
    }
  }
  // Only solve electrically active nets; unused breadboard holes cost no matrix rows.
  const active = new Set([
    ...fixed.keys(),
    ...sources.map((s) => s.node),
    ...edges.flatMap((e) => [e.a, e.b]),
  ]);
  const unknown = [...active].filter((n) => !fixed.has(n));
  if (unknown.length > 256)
    throw new Error("Batas solver: 256 net aktif. Kurangi rangkaian.");
  const index = new Map(unknown.map((n, i) => [n, i]));
  const voltage = new Map(fixed);
  for (const n of unknown) voltage.set(n, 0);
  let enabled = new Set<string>();
  let converged = false;
  for (let iteration = 0; iteration < 40; iteration++) {
    const n = unknown.length;
    const a = Array.from({ length: n }, () => new Float64Array(n + 1));
    for (let i = 0; i < n; i++) a[i][i] = 1e-10; // deterministic floating-net reference
    const stamp = (
      x: string,
      y: string | undefined,
      g: number,
      offset: number,
    ) => {
      const i = index.get(x);
      if (i === undefined) return;
      a[i][i] += g;
      a[i][n] += g * offset;
      if (y !== undefined) {
        const j = index.get(y);
        if (j !== undefined) a[i][j] -= g;
        else a[i][n] += g * (fixed.get(y) || 0);
      }
    };
    for (const s of sources)
      stamp(s.node, undefined, 1 / s.resistance, s.voltage);
    for (const e of edges) {
      if (e.led && !enabled.has(e.led)) continue;
      stamp(e.a, e.b, 1 / e.r, e.vf);
      stamp(e.b, e.a, 1 / e.r, -e.vf);
    }
    for (let k = 0; k < n; k++) {
      let pivot = k;
      for (let i = k + 1; i < n; i++)
        if (Math.abs(a[i][k]) > Math.abs(a[pivot][k])) pivot = i;
      [a[k], a[pivot]] = [a[pivot], a[k]];
      const d = a[k][k];
      if (Math.abs(d) < 1e-15) continue;
      for (let j = k; j <= n; j++) a[k][j] /= d;
      for (let i = k + 1; i < n; i++) {
        const f = a[i][k];
        if (!f) continue;
        for (let j = k; j <= n; j++) a[i][j] -= f * a[k][j];
      }
    }
    for (let i = n - 1; i >= 0; i--) {
      let v = a[i][n];
      for (let j = i + 1; j < n; j++)
        v -= a[i][j] * (voltage.get(unknown[j]) || 0);
      voltage.set(unknown[i], v);
    }
    const next = new Set<string>();
    for (const e of edges)
      if (e.led && (voltage.get(e.a)! - voltage.get(e.b)! > e.vf + 1e-7 || (enabled.has(e.led) && voltage.get(e.a)! - voltage.get(e.b)! >= e.vf - 1e-7)))
        next.add(e.led);
    if ([...next].every((x) => enabled.has(x)) && next.size === enabled.size) {
      converged = true;
      break;
    }
    enabled = next;
  }
  if (!converged)
    warnings.add("Solver LED tidak konvergen; sederhanakan rangkaian.");
  for (const s of sources)
    if (
      s.resistance === 25 &&
      Math.abs((s.voltage - (voltage.get(s.node) || 0)) / 25) > 0.02
    )
      warnings.add(
        "Arus pin melebihi 20 mA; periksa resistor atau hubung singkat.",
      );
  const states: CircuitResult["states"] = {};
  for (const c of components) {
    if (isMicrocontroller(c.typeId))
      states[c.id] = {
        isOn: true,
        builtinLED: (voltage.get(node(c, "D13")) || 0) > 2.5,
      };
    if (c.typeId === "led_red") {
      const e = edges.find((e) => e.led === c.id)!;
      const current =
        converged && enabled.has(c.id)
          ? Math.max(
              0,
              ((voltage.get(e.a) || 0) - (voltage.get(e.b) || 0) - 1.8) / 10,
            )
          : 0;
      states[c.id] = {
        isOn: current > 0.0001,
        brightness: Math.min(255, Math.round((current / 0.02) * 255)),
        currentMa: current * 1000,
      };
      if (current > 0.02)
        warnings.add(
          `${c.name}: arus LED >20 mA. Tambahkan resistor pembatas.`,
        );
    }
    if (c.typeId === "oled_ssd1306") {
      const vcc = voltage.get(node(c, "VCC")) || 0;
      const gnd = voltage.get(node(c, "GND")) || 0;
      const vDiff = vcc - gnd;
      const isPowered = vDiff >= 2.7;
      states[c.id] = {
        ...c.state,
        isOn: isPowered,
        isPowered,
        vDiff,
      };
    }
    if (c.typeId === "servo_sg90") {
      const vcc = voltage.get(node(c, "VCC")) || 0;
      const gnd = voltage.get(node(c, "GND")) || 0;
      const vDiff = vcc - gnd;
      const isPowered = vDiff >= 4.0;
      states[c.id] = {
        ...c.state,
        isPowered,
        vDiff,
      };
    }
    if (c.typeId === "lcd1602_i2c") {
      const vcc = voltage.get(node(c, "VCC")) || 0;
      const gnd = voltage.get(node(c, "GND")) || 0;
      const vDiff = vcc - gnd;
      const isPowered = vDiff >= 4.2;
      states[c.id] = {
        ...c.state,
        isPowered,
        vDiff,
      };
    }
    if (c.typeId === "dht11") {
      const vcc = voltage.get(node(c, "VCC")) || 0;
      const gnd = voltage.get(node(c, "GND")) || 0;
      const vDiff = vcc - gnd;
      const isPowered = vDiff >= 2.8;
      states[c.id] = {
        ...c.state,
        isPowered,
        vDiff,
      };
    }
    if (c.typeId === "hcsr04") {
      const vcc = voltage.get(node(c, "VCC")) || 0;
      const gnd = voltage.get(node(c, "GND")) || 0;
      const vDiff = vcc - gnd;
      const isPowered = vDiff >= 4.2;
      states[c.id] = {
        ...c.state,
        isPowered,
        vDiff,
      };
    }
    if (c.typeId === "plc_omron_cp1e") {
      const common = voltage.get(node(c, "COMI")) || 0;
      let inputMask = 0;
      for (let i = 0; i < 12; i++) {
        if ((voltage.get(node(c, `X${i}`)) || 0) - common >= 14) inputMask |= 1 << i;
      }
      states[c.id] = {
        ...c.state,
        isPowered: true,
        inputMask,
        scanCount: Number(c.state.scanCount || 0) + 1,
        vDiff: 24,
      };
    }
    if (c.typeId === "stepper_nema17") {
      const va = (voltage.get(node(c, "A+")) || 0) - (voltage.get(node(c, "A-")) || 0);
      const vb = (voltage.get(node(c, "B+")) || 0) - (voltage.get(node(c, "B-")) || 0);
      const a = Math.abs(va) >= 1 ? Math.sign(va) : 0;
      const b = Math.abs(vb) >= 1 ? Math.sign(vb) : 0;
      const phases = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
      const phaseIndex = phases.findIndex(([pa, pb]) => pa === a && pb === b);
      const previous = Number(c.state.phaseIndex ?? -1);
      let delta = 0;
      if (phaseIndex >= 0 && previous >= 0 && phaseIndex !== previous) {
        const forward = (phaseIndex - previous + 4) % 4;
        if (forward === 1) delta = 1;
        else if (forward === 3) delta = -1;
      }
      const steps = Number(c.state.steps || 0) + delta;
      const currentMa = (Math.abs(va) / 1.65 + Math.abs(vb) / 1.65) * 1000;
      states[c.id] = {
        ...c.state,
        phaseIndex,
        steps,
        angle: steps * 1.8,
        direction: delta > 0 ? "CW" : delta < 0 ? "CCW" : "idle",
        isPowered: phaseIndex >= 0,
        currentMa: Number(currentMa.toFixed(1)),
      };
      if (Math.abs(va) > 3.2 || Math.abs(vb) > 3.2)
        warnings.add(`${c.name}: tegangan kumparan tinggi; gunakan driver stepper dengan pembatas arus.`);
    }
    if (c.typeId === "capacitor_universal") {
      const vA = voltage.get(node(c, "A")) || 0;
      const vC = voltage.get(node(c, "C")) || 0;
      const vDiff = vA - vC;
      const cap = Math.max(1e-12, Number(c.state.capacitance) || 470e-6);
      const dt = 0.005;
      const esr = Math.max(0.01, Number(c.state.esr) || 0.1);
      const rCap = dt / cap;
      const rTotal = esr + rCap;
      const vPrev = Number(c.state.voltage) || 0;
      const iCurrent = (vDiff - vPrev) / rTotal;
      const vNew = vPrev + iCurrent * (dt / cap);
      const charge = cap * Math.abs(vNew);
      const energy = 0.5 * cap * vNew * vNew;
      const ratedV = Number(c.state.ratedVoltage) || 25;
      const subType = String(c.state.subType || "electrolytic");

      let status = "normal";
      if (Math.abs(vDiff) > ratedV * 1.05) {
        status = "overvoltage";
        warnings.add(
          `${c.name}: Tegangan ${vDiff.toFixed(1)}V melebihi rating ${ratedV}V! Risiko breakdown dielektrik.`,
        );
      } else if (subType === "electrolytic" && vDiff < -0.3) {
        status = "reversed";
        warnings.add(
          `${c.name}: Polaritas Elco terbalik! Katoda (-) terhubung ke potensial lebih positif daripada Anoda (+).`,
        );
      }

      states[c.id] = {
        ...c.state,
        voltage: Number(vNew.toFixed(3)),
        vDiff: Number(vDiff.toFixed(3)),
        currentMa: Number((iCurrent * 1000).toFixed(2)),
        charge: Number(charge.toFixed(8)),
        chargeU_C: Number((charge * 1e6).toFixed(2)),
        energy: Number(energy.toFixed(8)),
        energy_mJ: Number((energy * 1000).toFixed(3)),
        status,
      };
    }
  }
  const voltages: Record<string, number> = {};
  for (const t of parent.keys())
    if (voltage.has(root(t))) voltages[t] = voltage.get(root(t))!;
  return { voltages, states, warnings: [...warnings] };
}
