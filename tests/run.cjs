/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness compiles isolated CommonJS fixtures. */
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const out = mkdtempSync(path.join(tmpdir(), "ardusim-test-"));
execFileSync(
  process.execPath,
  [
    "node_modules/typescript/bin/tsc",
    "src/lib/simulation/CircuitSolver.ts",
    "src/lib/simulation/SketchRuntime.ts",
    "src/lib/sketch/bundler.ts",
    "src/lib/project/examples.ts",
    "src/lib/project/project.ts",
    "--outDir",
    out,
    "--target",
    "ES2020",
    "--module",
    "commonjs",
    "--moduleResolution",
    "node",
    "--skipLibCheck",
    "--esModuleInterop",
  ],
  { stdio: "inherit" },
);
const { solveCircuit, terminal } = require(
  path.join(out, "simulation/CircuitSolver.js"),
);
const { SketchParser, SketchRuntime } = require(
  path.join(out, "simulation/SketchRuntime.js"),
);
const { bundleSketchFiles } = require(
  path.join(out, "sketch/bundler.js"),
);
const { example, instance } = require(path.join(out, "project/examples.js"));
const { parseProject } = require(path.join(out, "project/project.js"));
const { contacts, snapToBreadboard, placementError, worldBounds } = require(path.join(out,'components/placement.js'));
const { gpioPin, validateOutput, esp32Pins } = require(path.join(out,'components/esp32.js'));
let checks = 0;
function test(name, fn) {
  fn();
  checks++;
  console.log("PASS", name);
}
(async () => {
  try {
    const blink = example("blink");
    const output = { D13: { mode: "OUTPUT", value: 5 } };
    test("LED closed loop uses Ohm law including GPIO and diode resistance", () => {
      const r = solveCircuit(blink.components, blink.wires, output);
      assert.equal(r.states.led.isOn, true);
      assert.ok(Math.abs(r.states.led.currentMa - 3200 / 255) < 0.01);
      assert.deepEqual(r.warnings, []);
    });
    test("Unwired LED stays off", () =>
      assert.equal(
        solveCircuit(blink.components, [], output).states.led.isOn,
        false,
      ));
    test("Missing ground and reversed LED stay off", () => {
      assert.deepEqual(solveCircuit(blink.components, blink.wires.slice(0,2), output).warnings, []);
      assert.equal(
        solveCircuit(blink.components, blink.wires.slice(0, 2), output).states
          .led.isOn,
        false,
      );
      const wires = blink.wires.map((w) => ({
        ...w,
        sourcePinId: w.sourceComponentId === "led" ? "A" : w.sourcePinId,
        targetPinId: w.targetComponentId === "led" ? "C" : w.targetPinId,
      }));
      assert.equal(
        solveCircuit(blink.components, wires, output).states.led.isOn,
        false,
      );
    });
    test("Second unrelated LED cannot follow pin 13", () => {
      assert.equal(
        solveCircuit(
          [...blink.components, instance("led_red", "unwired", [0, 0, 0])],
          blink.wires,
          output,
        ).states.unwired.isOn,
        false,
      );
    });
    test("Breadboard column/rail and jumper continuity", () => {
      const p = example("breadboard");
      assert.equal(
        solveCircuit(p.components, p.wires, output).states.led.isOn,
        true,
      );
      const w = p.wires.map((x) =>
        x.sourceComponentId === "bb" && x.sourcePinId === "t0_4"
          ? { ...x, sourcePinId: "b0_4" }
          : x,
      );
      assert.equal(
        solveCircuit(p.components, w, output).states.led.isOn,
        false,
      );
    });
    test("Pullup button open HIGH, pressed LOW", () => {
      const p = example("button");
      let r = solveCircuit(p.components, p.wires, {
        D2: { mode: "INPUT_PULLUP", value: 0 },
      });
      assert.ok(r.voltages[terminal("uno", "D2")] > 4.9);
      p.components[1].state.isPressed = true;
      r = solveCircuit(p.components, p.wires, {
        D2: { mode: "INPUT_PULLUP", value: 0 },
      });
      assert.equal(r.voltages[terminal("uno", "D2")], 0);
    });
    test("Powered potentiometer produces half supply; unpowered is zero", () => {
      const p = example("pwm");
      p.components.find((c) => c.id === "pot").state.value = 0.5;
      let r = solveCircuit(p.components, p.wires, {});
      assert.ok(Math.abs(r.voltages["uno:A0"] - 2.5) < 0.001);
      r = solveCircuit(
        p.components,
        p.wires.filter((w) => w.sourcePinId !== "5V"),
        {},
      );
      assert.ok(r.voltages["uno:A0"] < 0.001);
    });
    test("PWM average changes LED brightness", () => {
      const p = example("pwm");
      const a = solveCircuit(p.components, p.wires, {
          D9: { mode: "OUTPUT", value: 2.5 },
        }),
        b = solveCircuit(p.components, p.wires, {
          D9: { mode: "OUTPUT", value: 5 },
        });
      assert.ok(a.states.led.brightness < b.states.led.brightness);
    });
    test("Supply short and LED overcurrent diagnosed", () => {
      const p = example("blink");
      const w = {
        ...p.wires[0],
        sourcePinId: "5V",
        targetComponentId: "uno",
        targetPinId: "GND1",
      };
      assert.ok(
        solveCircuit(p.components, [w], {}).warnings.some((x) =>
          x.includes("Hubung singkat"),
        ),
      );
      const direct = p.wires
        .filter((w) => w.sourceComponentId !== "r")
        .map((w) =>
          w.targetComponentId === "r"
            ? { ...w, targetComponentId: "led", targetPinId: "A" }
            : w,
        );
      assert.ok(
        solveCircuit(p.components, direct, output).warnings.some((x) =>
          x.includes("20 mA"),
        ),
      );
    });
    test("Project roundtrip and malformed pins rejected", () => {
      assert.equal(
        parseProject(JSON.parse(JSON.stringify(blink))).wires.length,
        3,
      );
      assert.throws(() =>
        parseProject({
          ...blink,
          wires: [{ ...blink.wires[0], targetPinId: "MISSING" }],
        }),
      );
      assert.throws(() =>
        parseProject({ ...blink, wires: [blink.wires[0], blink.wires[0]] }),
      );
    });
    test("All catalog pins unique and Uno positions nonoverlapping", () => {
      const p = blink.components[0].pins;
      assert.equal(new Set(p.map((x) => x.position.join(","))).size, p.length);
      assert.ok(p.some((x) => x.id === "SDA"));
      assert.ok(p.some((x) => x.id === "VIN"));
    });
    test("Rigid resistor seats on pitch, occupies holes and conducts without extra wires",()=>{
      const p=example('esp32'), r=p.components.find(c=>c.id==='r');
      assert.deepEqual(contacts(r,p.components).map(c=>c.holeId),['t8_2','t12_2']);
      assert.equal(placementError(r,p.components),'');
      const a=solveCircuit(p.components,p.wires,{GPIO25:{mode:'OUTPUT',value:3.3}});
      assert.ok(Math.abs(a.states.led.currentMa-1500/255)<.01);
      const lifted={...r,position:[r.position[0],r.position[1]+2,r.position[2]]};
      assert.equal(contacts(lifted,p.components).length,0);
      assert.equal(solveCircuit(p.components.map(c=>c.id==='r'?lifted:c),p.wires,{GPIO25:{mode:'OUTPUT',value:3.3}}).states.led.isOn,false);
      assert.match(placementError({...r,id:'duplicate'},p.components),/sudah ditempati/);
      assert.match(placementError({...r,position:[-15,.6,0]},p.components),/bounding box/);
      const before=worldBounds(r), after=worldBounds({...r,rotation:[0,Math.PI/2,0]});
      assert.ok(Math.abs((before.max[0]-before.min[0])-(after.max[2]-after.min[2]))<1e-6);
      const bb=p.components.find(c=>c.id==='bb');
      const shifted={...bb,position:[5,0,7]};
      const moved={...r,position:[r.position[0]+4,r.position[1],r.position[2]+7]};
      assert.equal(contacts(moved,[shifted]).length,2);
      const snapped=snapToBreadboard({...r,position:[r.position[0]+.15,.6,r.position[2]+.1]},p.components);
      assert.equal(contacts(snapped,p.components).length,2);
    });
    test("ESP32 pinout and reserved/input-only restrictions",()=>{
      assert.equal(esp32Pins.length,38);
      assert.equal(new Set(esp32Pins.map(p=>p.id)).size,38);
      assert.equal(gpioPin('esp32_wroom',36,true),'GPIO36');
      assert.throws(()=>gpioPin('esp32_wroom',6),/flash/);
      assert.throws(()=>gpioPin('esp32_wroom',23,true),/ADC/);
      assert.throws(()=>validateOutput('esp32_wroom','GPIO34','OUTPUT'),/INPUT/);
      assert.throws(()=>validateOutput('esp32_wroom','GPIO39','INPUT_PULLUP'),/pull-up/);
      assert.equal(gpioPin('arduino_uno',14),'A0');
      const r=solveCircuit([instance('esp32_wroom','esp',[0,.6,0])],[],{GPIO25:{mode:'INPUT_PULLUP',value:0}});
      assert.ok(Math.abs(r.voltages['esp:GPIO25']-3.3)<.001);
      assert.equal(r.voltages['esp:GND3'],0);
    });
    test("Routing color/points and mounted contacts survive JSON roundtrip",()=>{
      const p=example('esp32'), copy=parseProject(JSON.parse(JSON.stringify(p)));
      assert.deepEqual(copy.wires[0],p.wires[0]);
      assert.equal(contacts(copy.components.find(c=>c.id==='r'),copy.components).length,2);
      assert.throws(()=>parseProject({...p,wires:[{...p.wires[0],path:[[1,2]]}]}));
      assert.throws(()=>parseProject({...p,wires:[{...p.wires[0],path:Array(13).fill([1,2,3])}]}));
    });
    let log = [];
    const rt = new SketchRuntime(
      new SketchParser(
        'int total = 0; int twice(int n) { return n*2; } void setup() { for(int i=0;i<4;i++) { total += twice(i); } } void loop() { if(total==12) { Serial.println("ok // literal"); } }',
      ),
      {
        "Serial.println": (v) => {
          log.push(v);
          return 0;
        },
      },
    );
    await rt.start();
    await rt.loop();
    test("Parser scope, arithmetic, helper functions, loop and string", () =>
      assert.deepEqual(log, ["ok // literal"]));
    const runaway = new SketchRuntime(
      new SketchParser("void setup() {} void loop() { while(true) {} }"),
      {},
    );
    await runaway.start();
    await assert.rejects(() => runaway.loop(), /50.000/);
    checks++;
    console.log("PASS runaway operation budget");
    test("Include and define directives supported, arbitrary browser members rejected", () => {
      assert.doesNotThrow(
        () =>
          new SketchParser(
            "#include <WiFi.h>\n#define LED 13\nvoid setup() { pinMode(LED, OUTPUT); } void loop() {}",
          ),
      );
      assert.throws(
        () =>
          new SketchParser(
            'void setup(){ window.location.href = "x"; } void loop(){}',
          ),
      );
    });
    const invalid = new SketchRuntime(
      new SketchParser(
        'void setup(){ fetch("https://example.com"); } void loop(){}',
      ),
      {},
    );
    await assert.rejects(() => invalid.start(), /belum didukung/);
    checks++;
    console.log("PASS no arbitrary JavaScript execution");

    test("OLED SSD1306 example circuit powers display and supports Adafruit_SSD1306", () => {
      const oledProj = example("oled");
      assert.ok(oledProj.components.some((c) => c.typeId === "oled_ssd1306"));
      const r = solveCircuit(oledProj.components, oledProj.wires, {});
      assert.equal(r.states.oled.isPowered, true);
      assert.ok(r.states.oled.vDiff >= 4.5);

      // Verify sketch parser parses Adafruit_SSD1306 without error
      assert.doesNotThrow(() => new SketchParser(oledProj.code));
    });

    test("LED supports custom user color and persists across project parse", () => {
      const proj = example("blink");
      proj.components.find((c) => c.typeId === "led_red").state.color = "#3b82f6";
      const json = JSON.stringify(proj);
      const parsed = parseProject(JSON.parse(json));
      const ledComp = parsed.components.find((c) => c.typeId === "led_red");
      assert.equal(ledComp.state.color, "#3b82f6");
    });

    test("Servo SG90 example circuit powers motor and supports Servo.h library", () => {
      const servoProj = example("servo");
      assert.ok(servoProj.components.some((c) => c.typeId === "servo_sg90"));
      const r = solveCircuit(servoProj.components, servoProj.wires, {});
      assert.equal(r.states.servo.isPowered, true);
      assert.ok(r.states.servo.vDiff >= 4.5);
      assert.doesNotThrow(() => new SketchParser(servoProj.code));
    });

    test("LCD 16x2 I2C example circuit powers display and supports LiquidCrystal_I2C.h", () => {
      const lcdProj = example("lcd1602");
      assert.ok(lcdProj.components.some((c) => c.typeId === "lcd1602_i2c"));
      const r = solveCircuit(lcdProj.components, lcdProj.wires, {});
      assert.equal(r.states.lcd.isPowered, true);
      assert.ok(r.states.lcd.vDiff >= 4.5);
      assert.doesNotThrow(() => new SketchParser(lcdProj.code));
    });

    test("DHT11 sensor example circuit powers sensor and supports DHT.h library", () => {
      const dhtProj = example("dht11");
      assert.ok(dhtProj.components.some((c) => c.typeId === "dht11"));
      const r = solveCircuit(dhtProj.components, dhtProj.wires, {});
      assert.equal(r.states.dht.isPowered, true);
      assert.ok(r.states.dht.vDiff >= 3.0);
      assert.doesNotThrow(() => new SketchParser(dhtProj.code));
    });

    test("HC-SR04 ultrasonic example circuit powers module and supports pulseIn sketch", () => {
      const sonarProj = example("hcsr04");
      assert.ok(sonarProj.components.some((c) => c.typeId === "hcsr04"));
      const r = solveCircuit(sonarProj.components, sonarProj.wires, {});
      assert.equal(r.states.sonar.isPowered, true);
      assert.ok(r.states.sonar.vDiff >= 4.5);
      assert.doesNotThrow(() => new SketchParser(sonarProj.code));
    });

    test("bundleSketchFiles inlines custom .h headers and appends .cpp implementations", () => {
      const files = [
        {
          name: "sketch.ino",
          content: `#include "my_sensor.h"\nvoid setup() { int val = getSensorVal(); }\nvoid loop() {}`,
        },
        {
          name: "my_sensor.h",
          content: `int getSensorVal();`,
        },
        {
          name: "my_sensor.cpp",
          content: `int getSensorVal() { return 42; }`,
        },
      ];
      const bundled = bundleSketchFiles(files);
      assert.ok(bundled.includes("int getSensorVal();"));
      assert.ok(bundled.includes("int getSensorVal() { return 42; }"));
      assert.doesNotThrow(() => new SketchParser(bundled));
    });

    test("Auto-grounding lifts tilted/horizontal component so lowest point rests on table Y>=0", () => {
      const dhtProj = example("dht11");
      const dht = dhtProj.components.find((c) => c.typeId === "dht11");
      assert.ok(dht);

      // Rotate DHT11 to horizontal (-90 deg pitch)
      const tilted = { ...dht, rotation: [-Math.PI / 2, 0, 0] };
      const grounded = snapToBreadboard(tilted, dhtProj.components);

      const b = worldBounds(grounded);
      assert.ok(b.min[1] >= -0.05, `Lowest point must be on or above table, got ${b.min[1]}`);
      const err = placementError(grounded, dhtProj.components);
      assert.equal(err, "", `Placement error should be empty, got: ${err}`);
    });

    test("DHT11 and HC-SR04 snap onto breadboard holes without sinking and conduct power via columns", () => {
      const bb = instance("breadboard", "bb", [0, 0, 0]);
      // DHT11 positioned roughly over breadboard top terminal area
      const dhtRaw = instance("dht11", "dht", [-2.0, 1.71, -1.0]);
      const dhtSnapped = snapToBreadboard(dhtRaw, [bb]);

      assert.equal(contacts(dhtSnapped, [bb]).length, 3, "DHT11 must seat all 3 pins into breadboard holes");
      assert.ok(dhtSnapped.position[1] >= 1.95, `DHT11 body must rest on/above breadboard surface (Y>=1.95), got ${dhtSnapped.position[1]}`);
      assert.equal(placementError(dhtSnapped, [bb]), "");

      // HC-SR04 positioned roughly over breadboard bottom terminal area
      const sonarRaw = instance("hcsr04", "sonar", [2.0, 1.71, 1.0]);
      const sonarSnapped = snapToBreadboard(sonarRaw, [bb]);

      assert.equal(contacts(sonarSnapped, [bb]).length, 4, "HC-SR04 must seat all 4 pins into breadboard holes");
      assert.ok(sonarSnapped.position[1] >= 1.95, `HC-SR04 body must rest on/above breadboard surface (Y>=1.95), got ${sonarSnapped.position[1]}`);
      assert.equal(placementError(sonarSnapped, [bb]), "");

      // Verify electrical flow synchronization through breadboard columns:
      // DHT11 pins are in 3 consecutive columns. Connecting 5V and GND to those breadboard columns powers DHT11.
      const dhtContacts = contacts(dhtSnapped, [bb]);
      const vccContact = dhtContacts.find(c => c.pinId === "VCC");
      const gndContact = dhtContacts.find(c => c.pinId === "GND");
      assert.ok(vccContact && gndContact);

      // Connect 5V to VCC column and 0V to GND column via Uno
      const uno = instance("arduino_uno", "uno", [-7, 0, 0]);
      const wires = [
        { id: "w1", sourceComponentId: "uno", sourcePinId: "5V", targetComponentId: "bb", targetPinId: vccContact.holeId },
        { id: "w2", sourceComponentId: "uno", sourcePinId: "GND1", targetComponentId: "bb", targetPinId: gndContact.holeId },
      ];

      const r = solveCircuit([uno, bb, dhtSnapped], wires, {});
      assert.equal(r.states.dht.isPowered, true, "DHT11 must be powered through breadboard column continuity");
      assert.ok(r.states.dht.vDiff >= 4.5);
    });

    test("SketchParser and Runtime support isnan, C-style cast (char)223, and DHT11+LCD user sketch", async () => {
      const userSketch = `
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  dht.begin();
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Inisialisasi...");
  delay(10);
  lcd.clear();
}

void loop() {
  delay(10);
  float kelembapan = dht.readHumidity();
  float suhu = dht.readTemperature();

  if (isnan(kelembapan) || isnan(suhu)) {
    lcd.setCursor(0, 0);
    lcd.print("Sensor Error!   ");
    return;
  }

  lcd.setCursor(0, 0);
  lcd.print("Suhu: ");
  lcd.print(suhu, 1);
  lcd.print((char)223);
  lcd.print("C   ");

  lcd.setCursor(0, 1);
  lcd.print("Lembap: ");
  lcd.print(kelembapan, 1);
  lcd.print("%   ");
}
`;
      assert.doesNotThrow(() => new SketchParser(userSketch));

      const lcdLines = { line0: "", line1: "", cursorCol: 0, cursorRow: 0 };
      const testApi = {
        isnan: (v) => Number(Number.isNaN(Number(v))),
        char: (v) => (Number(v) === 223 ? "°" : String.fromCharCode(Number(v) & 255)),
        delay: () => 0,
        "dht.begin": () => 0,
        "*.readHumidity": () => 50,
        "*.readTemperature": () => 24,
        "lcd.init": () => {
          lcdLines.line0 = "                ";
          lcdLines.line1 = "                ";
          return 0;
        },
        "lcd.backlight": () => 0,
        "lcd.clear": () => {
          lcdLines.line0 = "                ";
          lcdLines.line1 = "                ";
          return 0;
        },
        "lcd.setCursor": (col, row) => {
          lcdLines.cursorCol = Number(col);
          lcdLines.cursorRow = Number(row);
          return 0;
        },
        "*.print": (v, f) => {
          const s = typeof v === "number" && typeof f === "number" ? v.toFixed(f) : String(v);
          const k = lcdLines.cursorRow === 0 ? "line0" : "line1";
          lcdLines[k] = (lcdLines[k].slice(0, lcdLines.cursorCol) + s + lcdLines[k].slice(lcdLines.cursorCol + s.length)).slice(0, 16);
          lcdLines.cursorCol += s.length;
          return s.length;
        },
      };

      const rt = new SketchRuntime(new SketchParser(userSketch), testApi);
      await rt.start();
      await rt.loop();

      assert.ok(lcdLines.line0.includes("Suhu: 24.0°C"), `Line 0 must include Suhu: 24.0°C, got: "${lcdLines.line0}"`);
      assert.ok(lcdLines.line1.includes("Lembap: 50.0%"), `Line 1 must include Lembap: 50.0%, got: "${lcdLines.line1}"`);
    });

    test("DHT11 and HC-SR04 pin definitions declare downward direction [0, -1, 0] for under-body wire routing", () => {
      const dhtProj = example("dht11");
      const dht = dhtProj.components.find((c) => c.typeId === "dht11");
      assert.ok(dht);
      for (const p of dht.pins) {
        assert.ok(p.position[1] < 0, `Pin ${p.id} Y position must be below PCB (<0), got ${p.position[1]}`);
        assert.deepEqual(p.direction, [0, -1, 0], `Pin ${p.id} direction must be [0, -1, 0] for routing from below`);
      }

      const sonarProj = example("hcsr04");
      const sonar = sonarProj.components.find((c) => c.typeId === "hcsr04");
      assert.ok(sonar);
      for (const p of sonar.pins) {
        assert.ok(p.position[1] < 0, `Pin ${p.id} Y position must be below PCB (<0), got ${p.position[1]}`);
        assert.deepEqual(p.direction, [0, -1, 0], `Pin ${p.id} direction must be [0, -1, 0] for routing from below`);
      }
    });

    test("Universal capacitor computes RC charge, stored energy, and flags overvoltage/reverse polarity", () => {
      const cap = instance("capacitor_universal", "cap1", [0, 0, 0]);
      cap.state = {
        subType: "electrolytic",
        capacitance: 100e-6, // 100 µF
        ratedVoltage: 16,
        voltage: 0,
        esr: 0.1,
      };

      const uno = instance("arduino_uno", "uno", [-7, 0, 0]);
      // Connect 5V to Anode (A) and GND to Cathode (C)
      const wires = [
        { id: "w1", sourceComponentId: "uno", sourcePinId: "5V", targetComponentId: "cap1", targetPinId: "A", color: "#ef4444" },
        { id: "w2", sourceComponentId: "uno", sourcePinId: "GND1", targetComponentId: "cap1", targetPinId: "C", color: "#171717" },
      ];

      const res = solveCircuit([uno, cap], wires, {});
      const st = res.states["cap1"];
      assert.ok(st, "Capacitor state must be calculated");
      assert.ok(st.voltage > 0, "Capacitor should charge positively");
      assert.strictEqual(st.status, "normal", "Status should be normal under 5V on 16V rating");
      assert.ok(st.charge > 0, "Charge Q should be > 0");
      assert.ok(st.energy > 0, "Energy E should be > 0");

      // Test reverse polarity on electrolytic
      const revWires = [
        { id: "w1", sourceComponentId: "uno", sourcePinId: "GND1", targetComponentId: "cap1", targetPinId: "A", color: "#171717" },
        { id: "w2", sourceComponentId: "uno", sourcePinId: "5V", targetComponentId: "cap1", targetPinId: "C", color: "#ef4444" },
      ];
      const revRes = solveCircuit([uno, cap], revWires, {});
      assert.strictEqual(revRes.states["cap1"].status, "reversed", "Reversed polarity on elco must flag reversed status");
      assert.ok(revRes.warnings.some(w => w.includes("Polaritas Elco terbalik")), "Must emit reverse polarity warning");

      // Test overvoltage
      cap.state.ratedVoltage = 3.3; // rating below 5V supply
      const ovRes = solveCircuit([uno, cap], wires, {});
      assert.strictEqual(ovRes.states["cap1"].status, "overvoltage", "5V on 3.3V rating must flag overvoltage");
      assert.ok(ovRes.warnings.some(w => w.includes("melebihi rating")), "Must emit overvoltage warning");
    });

    const bench = example("breadboard");
    const t = performance.now();
    for (let i = 0; i < 200; i++)
      solveCircuit(bench.components, bench.wires, output);
    console.log(
      `BENCH breadboard ${bench.components.length} components / ${bench.wires.length} wires: ${((performance.now() - t) / 200).toFixed(3)} ms/solve (200 iterations)`,
    );
    console.log(`${checks} checks passed`);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
