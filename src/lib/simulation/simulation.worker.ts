import { gpioPin, isMicrocontroller, validateOutput } from "../components/esp32";
import { SketchParser, SketchRuntime, Value } from "./SketchRuntime";
import { solveCircuit, IO, terminal, CircuitResult } from "./CircuitSolver";
import type { CircuitComponent, Wire } from "../components/componentTypes";
let components: CircuitComponent[] = [];
let wires: Wire[] = [];
let io: Record<string, IO> = {};
let result: CircuitResult = { voltages: {}, states: {}, warnings: [] };
let dirty = true;
let paused = false;
let pauseAt = 0;
let pausedMs = 0;
let started = 0;
let baud = 0;
const rx: number[] = [];
let runtime: SketchRuntime;
const send = (data: unknown) => postMessage(data);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
async function ready() {
  while (paused) await sleep(20);
}
function solve() {
  if (dirty) {
    result = solveCircuit(components, wires, io);
    dirty = false;
  }
  return result;
}
const board = () => {
 const boards=components.filter(c=>isMicrocontroller(c.typeId));
 if(boards.length!==1) throw new Error("Gunakan tepat satu mikrokontroler: Arduino Uno atau ESP32-WROOM.");
 return boards[0];
};
const supply = () => board().typeId==='esp32_wroom'?3.3:5;
const pin = (v:Value, analog=false) => gpioPin(board().typeId,Number(v),analog);
const voltage = (id: string) => {
  const v = solve().voltages[terminal(board().id, id)];
  return v ?? 0;
};
let serialBuffer = "";
function print(v: Value = "", format: Value = 10) {
  if (!baud) throw new Error("Panggil Serial.begin sebelum Serial.print/read.");
  const f = Number(format);
  const str =
    typeof v === "number" && [2, 8, 16].includes(f)
      ? Math.trunc(v).toString(f).toUpperCase()
      : String(v);
  serialBuffer = (serialBuffer + str).slice(-16000);
  return 0;
}
const api: Record<string, (...args: Value[]) => Value | Promise<Value>> = {
  pinMode: (p, m) => {
    const id = pin(p);
    if (![0, 1, 2].includes(Number(m))) throw new Error("Mode pin tidak valid");
    validateOutput(board().typeId,id,["INPUT","OUTPUT","INPUT_PULLUP"][Number(m)]);
    io[id] = {
      mode: ["INPUT", "OUTPUT", "INPUT_PULLUP"][Number(m)] as IO["mode"],
      value: io[id]?.value || 0,
    };
    dirty = true;
    return 0;
  },
  digitalWrite: (p, v) => {
    const id = pin(p);
    validateOutput(board().typeId,id,Number(v)?"INPUT_PULLUP":io[id]?.mode||"INPUT");
    const prev = io[id] || { mode: "INPUT", value: 0 };
    io[id] = {
      mode:
        prev.mode === "OUTPUT"
          ? "OUTPUT"
          : Number(v)
            ? "INPUT_PULLUP"
            : "INPUT",
      value: Number(v) ? supply() : 0,
    };
    dirty = true;
    return 0;
  },
  digitalRead: (p) => +(voltage(pin(p)) >= supply() / 2),
  analogRead: (p) => {
    const max=board().typeId==='esp32_wroom'?4095:1023;
    return Math.max(0,Math.min(max,Math.round(voltage(pin(p,true))/supply()*max)));
  },
  analogWrite: (p, v) => {
    const id = pin(p);
    validateOutput(board().typeId,id,"OUTPUT");
    const val = Math.max(0, Math.min(255, Number(v)));
    io[id] = {
      mode: "OUTPUT",
      value: board().typeId === "esp32_wroom" || [3, 5, 6, 9, 10, 11].includes(Number(p))
        ? (val / 255) * supply()
        : val < 128
          ? 0
          : supply(),
    };
    dirty = true;
    return 0;
  },
  delay: async (ms) => {
    let remaining = Math.max(0, Math.min(3600000, Number(ms)));
    do {
      await ready();
      const t = performance.now();
      await sleep(Math.min(remaining, 20));
      if (!paused) remaining -= performance.now() - t;
    } while (remaining > 0);
    return 0;
  },
  millis: () =>
    Math.floor((paused ? pauseAt : performance.now()) - started - pausedMs),
  micros: () =>
    Math.floor(
      ((paused ? pauseAt : performance.now()) - started - pausedMs) * 1000,
    ),
  map: (x, a, b, c, d) =>
    Math.trunc(
      ((Number(x) - Number(a)) * (Number(d) - Number(c))) /
        (Number(b) - Number(a)) +
        Number(c),
    ),
  constrain: (x, a, b) => Math.max(Number(a), Math.min(Number(b), Number(x))),
  abs: (x) => Math.abs(Number(x)),
  min: (a, b) => Math.min(Number(a), Number(b)),
  max: (a, b) => Math.max(Number(a), Number(b)),
  "Serial.begin": (b) => {
    baud = Number(b);
    send({ type: "baud", baud });
    return 0;
  },
  "Serial.available": () => rx.length,
  "Serial.read": () => rx.shift() ?? -1,
  "Serial.peek": () => rx[0] ?? -1,
  "Serial.print": print,
  "Serial.println": (v = "", f = 10) => {
    print(v, f);
    serialBuffer += "\n";
    return 0;
  },
  "Serial.write": (v) => print(String.fromCharCode(Number(v) & 255)),
};
setInterval(() => {
  try {
    if (runtime) {
      send({ type: "frame", ...solve(), elapsed: api.millis() });
      if (serialBuffer) {
        send({ type: "serial", text: serialBuffer });
        serialBuffer = "";
      }
    }
  } catch (e) {
    send({ type: "error", message: String(e) });
  }
}, 40);
onmessage = async (e: MessageEvent) => {
  const m = e.data;
  if (m.type === "circuit") {
    components = m.components;
    wires = m.wires;
    dirty = true;
    return;
  }
  if (m.type === "serial") {
    if (rx.length + m.bytes.length <= 4096) rx.push(...m.bytes);
    else send({ type: "warning", message: "Buffer RX penuh (4096 byte)." });
    return;
  }
  if (m.type === "pause") {
    paused = true;
    pauseAt = performance.now();
    return;
  }
  if (m.type === "resume") {
    pausedMs += performance.now() - pauseAt;
    paused = false;
    return;
  }
  if (m.type !== "start") return;
  components = m.components;
  wires = m.wires;
  io = {};
  dirty = true;
  started = performance.now();
  try {
    board();
    runtime = new SketchRuntime(new SketchParser(m.code), api);
    await runtime.start();
    for (;;) {
      await ready();
      await runtime.loop();
      await sleep(1);
    }
  } catch (e) {
    send({
      type: "error",
      message: e instanceof Error ? e.message : String(e),
    });
  }
};
