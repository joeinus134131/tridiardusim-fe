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
const { example, instance } = require(path.join(out, "project/examples.js"));
const { parseProject } = require(path.join(out, "project/project.js"));
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
    test("Unsupported directives and member access rejected", () => {
      assert.throws(
        () =>
          new SketchParser("#include <WiFi.h>\nvoid setup() {} void loop() {}"),
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
