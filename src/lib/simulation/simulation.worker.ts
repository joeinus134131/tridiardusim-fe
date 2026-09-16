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
  delayMicroseconds: () => 0,
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
  sq: (x) => Number(x) * Number(x),
  sqrt: (x) => Math.sqrt(Number(x)),
  pow: (x, y) => Math.pow(Number(x), Number(y)),
  random: (a, b) => {
    if (b === undefined) return Math.floor(Math.random() * Number(a));
    return Math.floor(Number(a) + Math.random() * (Number(b) - Number(a)));
  },
  randomSeed: () => 0,
  analogReadResolution: () => 0,
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

  // ESP32 Virtual Wi-Fi Emulation
  "WiFi.begin": (ssid = "Nexflux-Virtual-WiFi") => {
    wifiState.ssid = String(ssid);
    wifiState.attempts = 0;
    wifiState.connected = false;
    wifiState.connectTime = performance.now() + 800;
    return 0;
  },
  "WiFi.status": () => {
    if (!wifiState.ssid) return 6; // WL_DISCONNECTED
    if (!wifiState.connected) {
      wifiState.attempts++;
      if (performance.now() >= wifiState.connectTime || wifiState.attempts >= 3) {
        wifiState.connected = true;
        wifiState.ip = "192.168.1." + (100 + Math.floor(Math.random() * 50));
      }
    }
    return wifiState.connected ? 3 : 0; // 3 = WL_CONNECTED, 0 = WL_IDLE_STATUS
  },
  "WiFi.localIP": () => (wifiState.connected ? wifiState.ip : "0.0.0.0"),
  "WiFi.SSID": () => wifiState.ssid,
  "WiFi.RSSI": () => (wifiState.connected ? -48 - Math.floor(Math.random() * 12) : 0),
  "WiFi.macAddress": () => "24:6F:28:8A:4C:9E",
  "WiFi.isConnected": () => (wifiState.connected ? 1 : 0),
  "WiFi.disconnect": () => {
    wifiState.connected = false;
    wifiState.ssid = "";
    wifiState.ip = "0.0.0.0";
    return 0;
  },

  // Real Internet Communication for ESP32
  httpGet: async (url) => {
    try {
      const res = await fetch(String(url), { signal: AbortSignal.timeout(6000) });
      const text = await res.text();
      return text.slice(0, 4096);
    } catch (e) {
      return "ERROR: " + (e instanceof Error ? e.message : String(e));
    }
  },
  "http.get": async (url) => {
    try {
      const res = await fetch(String(url), { signal: AbortSignal.timeout(6000) });
      lastHttpCode = res.status;
      lastHttpResponse = (await res.text()).slice(0, 4096);
      return res.status;
    } catch (e) {
      lastHttpCode = 500;
      lastHttpResponse = "ERROR: " + (e instanceof Error ? e.message : String(e));
      return 500;
    }
  },
  "http.getString": () => lastHttpResponse,
  "http.statusCode": () => lastHttpCode,

  // Adafruit_SSD1306 / GFX OLED Emulation
  "display.begin": () => {
    oledState.buffer = "";
    updateOledComponents();
    return 1;
  },
  "display.clearDisplay": () => {
    oledState.buffer = "";
    updateOledComponents();
    return 0;
  },
  "display.setTextSize": (s = 1) => {
    oledState.textSize = Number(s);
    return 0;
  },
  "display.setTextColor": (c = 1) => {
    oledState.textColor = Number(c);
    return 0;
  },
  "display.setCursor": (x = 0, y = 0) => {
    oledState.cursorX = Number(x);
    oledState.cursorY = Number(y);
    return 0;
  },
  "display.print": (v = "") => {
    oledState.buffer += String(v);
    return 0;
  },
  "display.println": (v = "") => {
    oledState.buffer += String(v) + "\n";
    return 0;
  },
  "display.display": () => {
    updateOledComponents();
    return 0;
  },
  "display.invertDisplay": (inv = 1) => {
    oledState.inverted = Boolean(inv);
    updateOledComponents();
    return 0;
  },
  "display.drawPixel": () => 0,
  "display.drawLine": () => 0,
  "display.drawRect": () => 0,
  "display.fillRect": () => 0,
  "display.drawCircle": () => 0,
  "display.fillCircle": () => 0,
  "display.drawBitmap": () => 0,

  // ─── Micro Servo Motor SG90 Emulation ───
  "*.attach": (pin = 9) => {
    servoState.attachedPin = Number(pin);
    return 1;
  },
  "*.write": (val = 90) => {
    const a = Math.max(0, Math.min(180, Number(val)));
    servoState.angle = a;
    updateServoComponents(a);
    return 0;
  },
  "*.writeMicroseconds": (us = 1500) => {
    const a = Math.max(0, Math.min(180, Math.round(((Number(us) - 1000) / 1000) * 180)));
    servoState.angle = a;
    updateServoComponents(a);
    return 0;
  },
  "*.read": () => servoState.angle,
  "*.attached": () => (servoState.attachedPin >= 0 ? 1 : 0),
  "*.detach": () => {
    servoState.attachedPin = -1;
    return 0;
  },

  // ─── LiquidCrystal_I2C (LCD 16x2) Emulation ───
  "*.init": () => {
    lcdState.line0 = "                ";
    lcdState.line1 = "                ";
    lcdState.cursorCol = 0;
    lcdState.cursorRow = 0;
    updateLcdComponents();
    return 0;
  },
  "*.begin": () => {
    lcdState.line0 = "                ";
    lcdState.line1 = "                ";
    lcdState.cursorCol = 0;
    lcdState.cursorRow = 0;
    updateLcdComponents();
    return 0;
  },
  "*.backlight": () => {
    lcdState.backlight = true;
    updateLcdComponents();
    return 0;
  },
  "*.noBacklight": () => {
    lcdState.backlight = false;
    updateLcdComponents();
    return 0;
  },
  "*.clear": () => {
    lcdState.line0 = "                ";
    lcdState.line1 = "                ";
    lcdState.cursorCol = 0;
    lcdState.cursorRow = 0;
    updateLcdComponents();
    return 0;
  },
  "*.home": () => {
    lcdState.cursorCol = 0;
    lcdState.cursorRow = 0;
    return 0;
  },
  "*.setCursor": (col = 0, row = 0) => {
    lcdState.cursorCol = Math.max(0, Math.min(15, Number(col)));
    lcdState.cursorRow = Math.max(0, Math.min(1, Number(row)));
    return 0;
  },
  "*.cursor": () => 0,
  "*.noCursor": () => 0,
  "*.blink": () => 0,
  "*.noBlink": () => 0,
  "*.print": (v = "") => {
    const s = String(v);
    const rowKey = lcdState.cursorRow === 0 ? "line0" : "line1";
    let cur = lcdState[rowKey].padEnd(16, " ");
    const col = lcdState.cursorCol;
    const nextStr = (cur.slice(0, col) + s + cur.slice(col + s.length)).slice(0, 16);
    lcdState[rowKey] = nextStr;
    lcdState.cursorCol = Math.min(16, col + s.length);
    updateLcdComponents();
    return s.length;
  },
  "*.println": (v = "") => {
    const s = String(v);
    const rowKey = lcdState.cursorRow === 0 ? "line0" : "line1";
    let cur = lcdState[rowKey].padEnd(16, " ");
    const col = lcdState.cursorCol;
    const nextStr = (cur.slice(0, col) + s + cur.slice(col + s.length)).slice(0, 16);
    lcdState[rowKey] = nextStr;
    lcdState.cursorCol = 0;
    lcdState.cursorRow = lcdState.cursorRow === 0 ? 1 : 0;
    updateLcdComponents();
    return s.length;
  },
  "lcd.print": (v = "") => api["*.print"](v),
  "lcd.println": (v = "") => api["*.println"](v),
};

let oledState = {
  cursorX: 0,
  cursorY: 0,
  textSize: 1,
  textColor: 1,
  buffer: "",
  inverted: false,
};

function updateOledComponents() {
  const oleds = components.filter((c) => c.typeId === "oled_ssd1306");
  for (const c of oleds) {
    c.state = {
      ...c.state,
      text: oledState.buffer || c.state.text,
      inverted: oledState.inverted,
      image: "custom_text",
    };
  }
  dirty = true;
}

let servoState = {
  angle: 90,
  attachedPin: -1,
};

function updateServoComponents(angle?: number) {
  const servos = components.filter((c) => c.typeId === "servo_sg90");
  for (const c of servos) {
    c.state = {
      ...c.state,
      angle: typeof angle === "number" ? angle : servoState.angle,
    };
  }
  dirty = true;
}

let lcdState = {
  line0: "Nexflux Lab 3D  ",
  line1: "LCD 16x2 I2C OK ",
  cursorCol: 0,
  cursorRow: 0,
  backlight: true,
};

function updateLcdComponents() {
  const lcds = components.filter((c) => c.typeId === "lcd1602_i2c");
  for (const c of lcds) {
    c.state = {
      ...c.state,
      line0: lcdState.line0,
      line1: lcdState.line1,
      backlight: lcdState.backlight,
      cursorCol: lcdState.cursorCol,
      cursorRow: lcdState.cursorRow,
    };
  }
  dirty = true;
}

let wifiState = {
  connected: false,
  ssid: "",
  ip: "0.0.0.0",
  connectTime: 0,
  attempts: 0,
};
let lastHttpResponse = "";
let lastHttpCode = 0;
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
    const lcd = components.find((c) => c.typeId === "lcd1602_i2c");
    if (lcd && lcd.state) {
      if (typeof lcd.state.line0 === "string") lcdState.line0 = lcd.state.line0;
      if (typeof lcd.state.line1 === "string") lcdState.line1 = lcd.state.line1;
      if (typeof lcd.state.backlight === "boolean")
        lcdState.backlight = lcd.state.backlight;
    }
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
  const lcd = components.find((c) => c.typeId === "lcd1602_i2c");
  if (lcd && lcd.state) {
    lcdState.line0 =
      typeof lcd.state.line0 === "string"
        ? lcd.state.line0
        : "Nexflux Lab 3D  ";
    lcdState.line1 =
      typeof lcd.state.line1 === "string"
        ? lcd.state.line1
        : "LCD 16x2 I2C OK ";
    lcdState.backlight = lcd.state.backlight !== false;
    lcdState.cursorCol = 0;
    lcdState.cursorRow = 0;
  }
  io = {};
  dirty = true;
  started = performance.now();
  wifiState = {
    connected: false,
    ssid: "",
    ip: "0.0.0.0",
    connectTime: 0,
    attempts: 0,
  };
  lastHttpResponse = "";
  lastHttpCode = 0;
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
