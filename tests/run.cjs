/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness compiles isolated CommonJS fixtures. */
const { execFileSync } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const out = mkdtempSync(path.join(tmpdir(), "ardusim-test-"));
process.env.NODE_PATH = [process.env.NODE_PATH, path.resolve("node_modules")].filter(Boolean).join(path.delimiter);
require("node:module").Module._initPaths();
execFileSync(
  process.execPath,
  [
    "node_modules/typescript/bin/tsc",
    "src/lib/simulation/CircuitSolver.ts",
    "src/lib/simulation/SimulationClock.ts",
    "src/lib/simulation/vhal/pwm.ts",
    "src/lib/simulation/vhal/encoder.ts",
    "src/lib/simulation/vhal/brownout.ts",
    "src/lib/simulation/vhal/l298n.ts",
    "src/lib/simulation/vhal/a4988Thermal.ts",
    "src/lib/simulation/vhal/chargerThermal.ts",
    "src/lib/simulation/vhal/chargerSafetyTimer.ts",
    "src/lib/simulation/vhal/i2c.ts",
    "src/lib/simulation/vhal/pca9685.ts",
    "src/lib/simulation/vhal/ssd1306.ts",
    "src/lib/simulation/pythonProgram.ts",
    "src/lib/simulation/soldering.ts",
    "src/lib/simulation/sensors/vhal.ts",
    "src/lib/robotics/kinematics.ts",
    "src/lib/robotics/robots.ts",
    "src/lib/robotics/differentialDrive.ts",
    "src/lib/robotics/rigidBody.ts",
    "src/lib/simulation/SketchRuntime.ts",
    "src/lib/ai/actionProtocol.ts",
    "src/lib/ai/onnxImage.ts",
    "src/lib/sketch/bundler.ts",
    "src/lib/project/examples.ts",
    "src/lib/project/project.ts",
    "src/lib/components/ComponentRegistry.ts",
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
const { buildElectricalConnectivity } = require(
  path.join(out, "simulation/electricalConnectivity.js"),
);
const { SimulationClock } = require(path.join(out, "simulation/SimulationClock.js"));
const { clampPwmResolution, pwmSignal } = require(path.join(out, "simulation/vhal/pwm.js"));
const { quadratureState } = require(path.join(out, "simulation/vhal/encoder.js"));
const { expSO3, expSE3, logSE3, inverseTransform, multiplyTransform, spaceJacobian, forwardKinematics, solveIKDLS, solvePositionIKDLS, fabrik, quinticPosition } = require(path.join(out, "robotics/kinematics.js"));
const { eduArm3Dof, aeroArm6Dof } = require(path.join(out, "robotics/robots.js"));
const { integrateDifferentialDrive } = require(path.join(out, "robotics/differentialDrive.js"));
const { RigidBodyWorld } = require(path.join(out, "robotics/rigidBody.js"));
const { advanceDcMotor, dcMotorElectricalEquivalent, dcMotorParameters } = require(path.join(out, "simulation/vhal/dcMotor.js"));
const { advanceBatteryProtection, advanceBatterySoc, advanceLipo2sSoc, batteryParameters } = require(path.join(out, "simulation/vhal/battery.js"));
const { advanceBrownout } = require(path.join(out, "simulation/vhal/brownout.js"));
const { advanceL298NThermal } = require(path.join(out, "simulation/vhal/l298n.js"));
const { advanceA4988Thermal } = require(path.join(out, "simulation/vhal/a4988Thermal.js"));
const { advanceBatteryChargerThermal } = require(path.join(out, "simulation/vhal/chargerThermal.js"));
const { advanceChargerSafetyTimer } = require(path.join(out, "simulation/vhal/chargerSafetyTimer.js"));
const { I2CBus, connectedI2CDevices } = require(path.join(out, "simulation/vhal/i2c.js"));
const { pca9685ChannelRegister, pca9685PulseMicroseconds, servoAngleFromPulse } = require(path.join(out, "simulation/vhal/pca9685.js"));
const { SSD1306Controller, SSD1306Framebuffer } = require(path.join(out, "simulation/vhal/ssd1306.js"));
const { PYTHON_PROGRAM_SETUP, pythonExecSource } = require(path.join(out, "simulation/pythonProgram.js"));
const { advanceSolderPad, classifySolderJoint, solderBridgeDetected } = require(path.join(out, "simulation/soldering.js"));
const { advanceA4988Protection } = require(path.join(out, "simulation/vhal/a4988.js"));
const { sensorFramesSignature, sensorReadApi } = require(path.join(out, "simulation/sensors/vhal.js"));
const { SketchParser, SketchRuntime } = require(
  path.join(out, "simulation/SketchRuntime.js"),
);
const { bundleSketchFiles } = require(
  path.join(out, "sketch/bundler.js"),
);
const { example, instance } = require(path.join(out, "project/examples.js"));
const { validateActionChunk, validateGatewayUrl } = require(path.join(out, "ai/actionProtocol.js"));
const { imageToFloatTensor, topClassScores } = require(path.join(out, "ai/onnxImage.js"));
const { ComponentRegistry } = require(path.join(out, "components/ComponentRegistry.js"));
const { parseProject } = require(path.join(out, "project/project.js"));
const { contacts, snapToBreadboard, placementError, worldBounds } = require(path.join(out,'components/placement.js'));
const { gpioPin, validateOutput, esp32Pins } = require(path.join(out,'components/esp32.js'));
let checks = 0;
function test(name, fn) {
  fn();
  checks++;
  console.log("PASS", name);
}
async function asyncTest(name, fn) {
  await fn();
  checks++;
  console.log("PASS", name);
}
(async () => {
  try {
    await asyncTest("Pyodide V-SBC wrapper cooperatively yields in Python loops and user functions", async () => {
      const { loadPyodide } = await import("pyodide");
      const pyodide = await loadPyodide({ indexURL: path.resolve("node_modules/pyodide") + path.sep });
      pyodide.globals.set("__is_paused", () => false);
      await pyodide.runPythonAsync(PYTHON_PROGRAM_SETUP + "\n__test_results = []");
      const source = `import time
results = []
def double(value):
    return value * 2
def append_result(value):
    results.append(double(value))
for index in range(3):
    append_result(index)
time.sleep(0.001)
__test_results.extend(results)`;
      await pyodide.runPythonAsync(pythonExecSource(source));
      const result = pyodide.runPython("list(__test_results)");
      assert.deepEqual(result.toJs(), [0, 2, 4]);
      result.destroy();
    });
    test("Wire I2C transaction buffers report ACK/NACK, clamp payloads, and return sequential bytes", () => {
      const bus = new I2CBus();
      bus.beginTransmission(0x68);
      assert.equal(bus.write(0x3b), 1);
      assert.equal(bus.endTransmission((address, bytes) => address === 0x68 && bytes[0] === 0x3b), 0);
      assert.equal(bus.endTransmission(() => true), 4);
      bus.beginTransmission(0x3c);
      assert.equal(bus.endTransmission(() => false), 2);
      assert.equal(bus.requestFrom(0x68, 4, (address, count) => address === 0x68 ? [0x12, 0x34, 0x56, 0x78].slice(0, count) : null), 4);
      assert.equal(bus.available(), 4);
      assert.deepEqual([bus.read(), bus.read(), bus.read(), bus.read(), bus.read()], [0x12, 0x34, 0x56, 0x78, -1]);
      assert.equal(bus.requestFrom(0x69, 2, () => null), 0);
      assert.equal(bus.available(), 0);
    });
    test("I2C display transfers split payloads at the 32-byte Wire limit and stop on NACK", () => {
      const bus = new I2CBus();
      const data = Array.from({ length: 70 }, (_, index) => index);
      const frames = [];
      assert.equal(bus.writeFrame(0x3c, 0x40, data, (address, bytes) => {
        frames.push({ address, bytes: [...bytes] });
        return true;
      }), true);
      assert.deepEqual(frames.map((frame) => frame.bytes.length), [32, 32, 9]);
      assert.deepEqual(frames.map((frame) => frame.bytes[0]), [0x40, 0x40, 0x40]);
      assert.ok(frames.every((frame) => frame.address === 0x3c));
      let attempts = 0;
      assert.equal(bus.writeFrame(0x3c, 0x40, data, () => ++attempts < 2), false);
      assert.equal(attempts, 2);
    });
    test("I2C device ACK requires matching address, both connected bus lines, and device power", () => {
      const project = example("oled");
      const connectivity = buildElectricalConnectivity(project.components, project.wires);
      const address = (component) => component.typeId === "oled_ssd1306" ? 0x3c : -1;
      const isPowered = (component) => solveCircuit(project.components, project.wires, {}).states[component.id]?.isPowered === true;
      const find = (components, wires) => connectedI2CDevices(
        components, "uno", "SDA", "SCL", 0x3c,
        buildElectricalConnectivity(components, wires), address, isPowered,
      );
      assert.deepEqual(find(project.components, project.wires).map((component) => component.id), ["oled"]);
      assert.equal(find(project.components, project.wires.filter((wire) => wire.color !== "#3b82f6")).length, 0);
      assert.equal(connectedI2CDevices(project.components, "uno", "SDA", "SCL", 0x27,
        connectivity, address, isPowered).length, 0);
      assert.equal(connectedI2CDevices(project.components, "uno", "SDA", "SCL", 0x3c,
        connectivity, address, () => false).length, 0);
    });
    test("PCA9685 exposes 16 channels and converts 12-bit PWM ticks to servo pulses", () => {
      assert.equal(pca9685ChannelRegister(0), 0x06);
      assert.equal(pca9685ChannelRegister(15), 0x42);
      assert.equal(pca9685ChannelRegister(16), null);
      assert.ok(Math.abs(pca9685PulseMicroseconds(0, 307, 50) - 1499.0234375) < 1e-9);
      assert.equal(pca9685PulseMicroseconds(4090, 10, 50), 78.125);
      assert.equal(servoAngleFromPulse(1000), 0);
      assert.equal(servoAngleFromPulse(1500), 90);
      assert.equal(servoAngleFromPulse(2000), 180);
      assert.equal(ComponentRegistry.get("pca9685_i2c").pins.filter((pin) => pin.type === "pwm").length, 16);
    });
    test("SSD1306 framebuffer clips raster operations and packs 128x64 pixels", () => {
      const display = new SSD1306Framebuffer();
      display.drawPixel(127, 63);
      display.drawPixel(-1, 0);
      display.drawLine(-100000, 32, 100000, 32);
      display.fillRect(-2, -2, 4, 4);
      display.drawBitmap(10, 10, String.fromCharCode(0xa0), 3, 1);
      assert.equal(display.pixels[63 * 128 + 127], 1);
      assert.equal([...display.pixels.slice(32 * 128, 33 * 128)].filter(Boolean).length, 128);
      assert.equal([...display.pixels.slice(0, 4)].filter(Boolean).length, 2);
      assert.equal(display.pixels[10 * 128 + 10], 1);
      assert.equal(display.pixels[10 * 128 + 11], 0);
      assert.equal(display.pixels[10 * 128 + 12], 1);
      const packed = display.toPackedString();
      assert.equal(packed.length, 1024);
      assert.equal(packed.charCodeAt(32 * 16), 0xff);
      assert.equal(packed.charCodeAt(0), 0xc0);
    });
    test("SSD1306 framebuffer conversion matches page-addressed controller byte layout", () => {
      const display = new SSD1306Framebuffer();
      display.drawPixel(5, 0);
      display.drawPixel(5, 7);
      display.drawPixel(5, 9);
      const data = display.toControllerBytes();
      assert.equal(data.length, 1024);
      assert.equal(data[5], 0x81);
      assert.equal(data[128 + 5], 0x02);
    });
    test("SSD1306 raw I2C commands select GDDRAM windows and accept page data", () => {
      const framebuffer = new SSD1306Framebuffer();
      const controller = new SSD1306Controller(framebuffer);
      assert.equal(controller.write(0x00, [0x21, 2, 2, 0x22, 1, 1, 0xaf]), true);
      assert.equal(controller.displayOn, true);
      assert.equal(controller.write(0x40, [0x81]), true);
      assert.equal(framebuffer.pixels[8 * 128 + 2], 1);
      assert.equal(framebuffer.pixels[15 * 128 + 2], 1);
      assert.equal(framebuffer.pixels[8 * 128 + 3], 0);
      assert.equal(controller.write(0x00, [0xa7]), true);
      assert.equal(controller.inverted, true);
      assert.equal(controller.write(0x00, [0xae]), true);
      assert.equal(controller.displayOn, false);
    });
    test("SSD1306 text uses deterministic 5x7 glyphs and supports inverse pixel operations", () => {
      const display = new SSD1306Framebuffer();
      const cursor = display.drawText("A", 0, 0);
      assert.deepEqual(cursor, { cursorX: 6, cursorY: 0, written: 1 });
      let lit = 0;
      for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) lit += display.pixels[y * 128 + x];
      assert.equal(lit, 18);
      display.clear();
      display.drawPixel(0, 0, 2);
      assert.equal(display.pixels[0], 1);
      display.drawPixel(0, 0, 2);
      assert.equal(display.pixels[0], 0);
    });
    test("SSD1306 filled triangle rasterization clips to the visible panel", () => {
      const display = new SSD1306Framebuffer();
      display.fillTriangle(1, 1, 5, 1, 1, 5);
      assert.equal([...display.pixels].filter(Boolean).length, 15);
      assert.equal(display.pixels[2 * 128 + 2], 1);
      assert.equal(display.pixels[5 * 128 + 5], 0);
      display.fillTriangle(-100, 30, 20, 30, 20, 80);
      assert.equal(display.pixels[63 * 128 + 19], 1);
    });
    test("PCA9685 solver power and OE pin control its output-enable state", () => {
      const base = example("oled");
      const uno = base.components.find((component) => component.typeId === "arduino_uno");
      const registration = ComponentRegistry.get("pca9685_i2c");
      const pca = { id: "pca", typeId: registration.typeId, name: "PCA9685", type: registration.type,
        position: [0, 0, 0], rotation: [0, 0, 0], state: { ...registration.defaultState }, pins: registration.pins };
      const components = [uno, pca];
      const connect = (sourcePinId, targetPinId) => ({ id: `${sourcePinId}-${targetPinId}`,
        sourceComponentId: "uno", sourcePinId, targetComponentId: "pca", targetPinId, color: "#22c55e" });
      const wires = [connect("5V", "VCC"), connect("GND1", "GND"), connect("SDA", "SDA"), connect("SCL", "SCL"), connect("GND1", "OE")];
      const enabled = solveCircuit(components, wires, {}).states.pca;
      assert.equal(enabled.isPowered, true);
      assert.equal(enabled.outputsEnabled, true);
      const disabled = solveCircuit(components, wires.filter((wire) => wire.targetPinId !== "OE"), {}).states.pca;
      assert.equal(disabled.isPowered, true);
      assert.equal(disabled.outputsEnabled, false);
    });
    test("PCA9685 servo preset powers the module and wires channel zero to the servo", () => {
      const project = example("pca9685");
      const solved = solveCircuit(project.components, project.wires, {});
      const connectivity = buildElectricalConnectivity(project.components, project.wires);
      assert.equal(solved.states.pca.isPowered, true);
      assert.equal(solved.states.pca.outputsEnabled, true);
      assert.equal(solved.states.servo.isPowered, true);
      assert.equal(connectivity.connected("pca", "PWM0", "servo", "PWM"), true);
      assert.equal(project.code.includes("pwm.setPWM(0, 0, 307)"), true);
    });

    test("SO(3) Rodrigues and SE(3) screw exponential match canonical fixtures", () => {
      const r = expSO3([0, 0, Math.PI / 2]);
      assert.ok(Math.abs(r[0]) < 1e-12 && Math.abs(r[1] + 1) < 1e-12);
      assert.ok(Math.abs(r[3] - 1) < 1e-12 && Math.abs(r[4]) < 1e-12);
      const t = expSE3([0, 0, 1, 1, 0, 0], Math.PI / 2);
      assert.ok(Math.abs(t[3] - 1) < 1e-12 && Math.abs(t[7] - 1) < 1e-12);
      assert.ok(Math.abs(t[0]) < 1e-12 && Math.abs(t[1] + 1) < 1e-12);
      for (const axis of [[1,0,0], [0,1,0], [0,0,1], [-0.2,0.4,-0.8]]) {
        const length = Math.hypot(...axis), unit = axis.map((x) => x / length);
        const nearPi = expSE3([...unit, 0.2, -0.1, 0.3], Math.PI - 1e-7);
        const roundTrip = expSE3(logSE3(nearPi), 1);
        assert.ok(Math.max(...nearPi.map((x, i) => Math.abs(x - roundTrip[i]))) < 1e-6);
      }
    });
    test("EduArm PoE home and target forward-kinematics fixtures", () => {
      const home = forwardKinematics(eduArm3Dof.joints, [0, 0, 0], eduArm3Dof.home);
      assert.deepEqual([home[3], home[7], home[11]], [0, 0.27, 0]);
      const shoulder = forwardKinematics(eduArm3Dof.joints, [0, Math.PI / 2, 0], eduArm3Dof.home);
      assert.ok(Math.abs(shoulder[3] + 0.22) < 1e-10);
      assert.ok(Math.abs(shoulder[7] - 0.05) < 1e-10);
    });
    test("AeroArm-6DOF exposes six bounded joints and computes its home pose", () => {
      assert.equal(aeroArm6Dof.joints.length, 6);
      assert.equal(aeroArm6Dof.homeJoints.length, 6);
      assert.ok(aeroArm6Dof.joints.every((joint) => Number.isFinite(joint.min) && Number.isFinite(joint.max) && joint.min < joint.max));
      const home = forwardKinematics(aeroArm6Dof.joints, aeroArm6Dof.homeJoints, aeroArm6Dof.home);
      assert.ok(Math.abs(home[3]) < 1e-12 && Math.abs(home[7] - 0.5) < 1e-12 && Math.abs(home[11]) < 1e-12);
      const moved = forwardKinematics(aeroArm6Dof.joints, [0, 0.4, 0, 0, 0, 0], aeroArm6Dof.home);
      assert.ok(Math.hypot(moved[3] - home[3], moved[7] - home[7], moved[11] - home[11]) > 0.02);
      const ik = solvePositionIKDLS(aeroArm6Dof.joints, aeroArm6Dof.homeJoints, aeroArm6Dof.home, [moved[3], moved[7], moved[11]], { maxIterations: 120, damping: 0.025 });
      assert.equal(ik.success, true);
      assert.ok(ik.angles.every((angle, i) => angle >= aeroArm6Dof.joints[i].min && angle <= aeroArm6Dof.joints[i].max));
    });
    test("RoverBot differential-drive integration handles straight, reverse, and in-place turns", () => {
      const zero = { x: 0, z: 0, heading: 0, leftWheelPhase: 0, rightWheelPhase: 0 };
      const straight = integrateDifferentialDrive(zero, { leftSpeed: 0.2, rightSpeed: 0.2 }, 1);
      assert.ok(Math.abs(straight.x) < 1e-12 && Math.abs(straight.z - 0.2) < 1e-12);
      assert.ok(Math.abs(straight.leftWheelPhase - (0.2 / 0.035)) < 1e-12);
      const reverse = integrateDifferentialDrive(zero, { leftSpeed: -0.1, rightSpeed: -0.1 }, 1);
      assert.ok(Math.abs(reverse.z + 0.1) < 1e-12);
      const spin = integrateDifferentialDrive(zero, { leftSpeed: -0.1, rightSpeed: 0.1 }, 1);
      assert.ok(Math.abs(spin.x) < 1e-12 && Math.abs(spin.z) < 1e-12);
      assert.ok(Math.abs(spin.heading - (0.2 / 0.16)) < 1e-12);
      assert.throws(() => integrateDifferentialDrive(zero, { leftSpeed: NaN, rightSpeed: 0 }, 0.005), /bilangan hingga/);
    });
    test("EduArm PoE matches the independent analytic chain golden set (10,000 poses)", () => {
      let seed = 0x12ab34cd;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      for (let n = 0; n < 10_000; n++) {
        const q = [random() * Math.PI * 2 - Math.PI, random() * Math.PI - Math.PI / 2, random() * 4.4 - 2.2];
        const [base, shoulder, elbow] = q;
        const wrist = shoulder + elbow, cb = Math.cos(base), sb = Math.sin(base), cw = Math.cos(wrist), sw = Math.sin(wrist);
        const localX = -0.12 * Math.sin(shoulder) - 0.10 * Math.sin(wrist);
        const localY = 0.05 + 0.12 * Math.cos(shoulder) + 0.10 * Math.cos(wrist);
        const expected = [cb*cw,-cb*sw,sb,cb*localX, sw,cw,0,localY, -sb*cw,sb*sw,cb,-sb*localX, 0,0,0,1];
        const actual = forwardKinematics(eduArm3Dof.joints, q, eduArm3Dof.home);
        for (let i = 0; i < 16; i++) assert.ok(Math.abs(actual[i] - expected[i]) < 1e-10, `pose ${n}, matrix index ${i}`);
      }
    });
    test("SE(3) exponential and logarithm round-trip 10,000 deterministic twists", () => {
      let seed = 0x61c88647;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      for (let n = 0; n < 10_000; n++) {
        let axis = [random() * 2 - 1, random() * 2 - 1, random() * 2 - 1];
        const length = Math.hypot(...axis);
        axis = axis.map((x) => x / length);
        const v = [random() - 0.5, random() - 0.5, random() - 0.5];
        const amount = random() * 5.6 - 2.8;
        const expected = [...axis.map((x) => x * amount), ...v.map((x) => x * amount)];
        const actual = logSE3(expSE3([...axis, ...v], amount));
        assert.ok(Math.hypot(...actual.map((x, i) => x - expected[i])) < 1e-8, `twist ${n}`);
      }
    });
    test("Space Jacobian agrees with finite differences over deterministic poses", () => {
      for (let n = 0; n < 100; n++) {
        const q = [Math.sin(n * 0.17), Math.sin(n * 0.31) * 0.8, Math.cos(n * 0.13) * 1.1];
        const current = forwardKinematics(eduArm3Dof.joints, q, eduArm3Dof.home);
        const J = spaceJacobian(eduArm3Dof.joints, q);
        for (let j = 0; j < 3; j++) {
          const nextQ = q.slice(); nextQ[j] += 1e-6;
          const next = forwardKinematics(eduArm3Dof.joints, nextQ, eduArm3Dof.home);
          const delta = logSE3(multiplyTransform(next, inverseTransform(current))).map((x) => x / 1e-6);
          assert.ok(Math.hypot(...delta.map((x, r) => x - J[r][j])) < 1e-5, `pose ${n}, joint ${j}`);
        }
      }
    });
    test("DLS converges to an attainable EduArm pose within joint limits", () => {
      const source = [0.35, 0.3, -0.5];
      const target = forwardKinematics(eduArm3Dof.joints, source, eduArm3Dof.home);
      const solved = solveIKDLS(eduArm3Dof.joints, [0, 0, 0], eduArm3Dof.home, target);
      assert.equal(solved.success, true, JSON.stringify(solved));
      solved.angles.forEach((x, i) => assert.ok(x >= eduArm3Dof.joints[i].min && x <= eduArm3Dof.joints[i].max));
      assert.ok(solved.positionError < 1e-4 && solved.orientationError < 1e-4);
    });
    test("Position-only DLS reaches a Cartesian target with redundant orientation freedom", () => {
      const targetPose = forwardKinematics(eduArm3Dof.joints, [0.5, 0.4, -0.7], eduArm3Dof.home);
      const solved = solvePositionIKDLS(eduArm3Dof.joints, [0, 0, 0], eduArm3Dof.home, [targetPose[3], targetPose[7], targetPose[11]]);
      assert.equal(solved.success, true, JSON.stringify(solved));
      assert.ok(solved.positionError < 1e-4);
    });
    test("Position-only DLS escapes the straight-arm singularity for a nearby reachable target", () => {
      const targetPose = forwardKinematics(eduArm3Dof.joints, [-0.2862754072, -0.0084452548, -0.0070379054], eduArm3Dof.home);
      const solved = solvePositionIKDLS(eduArm3Dof.joints, [0, 0, 0], eduArm3Dof.home, [targetPose[3], targetPose[7], targetPose[11]]);
      assert.equal(solved.success, true, JSON.stringify(solved));
      assert.ok(solved.positionError < 1e-4, JSON.stringify(solved));
    });
    test("FABRIK preserves segment lengths and quintic trajectory boundary conditions", () => {
      const solved = fabrik([[0,0,0],[1,0,0],[2,0,0]], [1,1,0]);
      assert.ok(Math.abs(Math.hypot(...solved[1].map((x,i)=>x-solved[0][i]))-1)<1e-8);
      assert.ok(Math.abs(Math.hypot(...solved[2].map((x,i)=>x-solved[1][i]))-1)<1e-8);
      assert.equal(quinticPosition(2, 8, 3, 0), 2);
      assert.equal(quinticPosition(2, 8, 3, 3), 8);
      assert.equal(quinticPosition(2, 8, 3, -1), 2);
    });
    test("FABRIK preserves chain geometry across reachable and unreachable targets", () => {
      let randomState = 0x75a4c39d;
      const random = () => {
        randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
        return randomState / 0x100000000;
      };
      for (let n = 0; n < 200; n++) {
        const points = [[0, 0, 0]];
        for (let link = 1; link < 5; link++) {
          const z = random() * 2 - 1;
          const azimuth = random() * Math.PI * 2;
          const radial = Math.sqrt(1 - z * z);
          const previous = points[link - 1];
          points.push([previous[0] + 0.3 * radial * Math.cos(azimuth), previous[1] + 0.3 * radial * Math.sin(azimuth), previous[2] + 0.3 * z]);
        }
        const radius = 0.55 + random() * 0.55;
        const z = random() * 2 - 1;
        const azimuth = random() * Math.PI * 2;
        const radial = Math.sqrt(1 - z * z);
        const target = [radius * radial * Math.cos(azimuth), radius * radial * Math.sin(azimuth), radius * z];
        const result = fabrik(points, target, { tolerance: 1e-5, maxIterations: 128 });
        assert.deepEqual(result[0], points[0]);
        for (let link = 1; link < result.length; link++) {
          const length = Math.hypot(...result[link].map((value, axis) => value - result[link - 1][axis]));
          assert.ok(Math.abs(length - 0.3) < 1e-8, `sample ${n}, link ${link} length ${length}`);
        }
        const endpointError = Math.hypot(...result.at(-1).map((value, axis) => value - target[axis]));
        assert.ok(endpointError < 1e-3, `reachable sample ${n} endpoint error ${endpointError}`);
      }
      const unreachable = fabrik([[0,0,0],[0.3,0,0],[0.6,0,0],[0.9,0,0],[1.2,0,0]], [0,2,0]);
      assert.ok(Math.abs(unreachable.at(-1)[1] - 1.2) < 1e-8);
      assert.ok(Math.abs(unreachable.at(-1)[0]) < 1e-8);
    });
    test("Simulation clock advances in fixed steps and freezes while paused", () => {
      const clock = new SimulationClock(5_000);
      assert.equal(clock.micros(), 0);
      clock.advance();
      clock.advance();
      assert.equal(clock.micros(), 10_000);
      assert.equal(clock.millis(), 10);
      clock.pause();
      clock.advance();
      assert.equal(clock.micros(), 10_000);
      clock.resume();
      clock.advance();
      assert.equal(clock.micros(), 15_000);
    });
    test("Simulation delay resolves only after enough simulation time", async () => {
      const clock = new SimulationClock(5_000);
      let resolved = false;
      const waiting = clock.delayMicros(11_000).then(() => { resolved = true; });
      clock.advance();
      clock.advance();
      await Promise.resolve();
      assert.equal(resolved, false);
      clock.advance();
      await waiting;
      assert.equal(resolved, true);
      assert.equal(clock.micros(), 15_000);
    });
    test("Simulation clock replay starts from the same initial time", () => {
      const clock = new SimulationClock();
      const replay = () => {
        clock.reset();
        return Array.from({ length: 4 }, () => clock.advance());
      };
      assert.deepEqual(replay(), replay());
    });
    test("V-HAL quantizes 8-bit and 16-bit PWM and preserves non-PWM digital fallback", () => {
      const eight = pwmSignal(128, 8, 5, true);
      assert.equal(eight.code, 128);
      assert.ok(Math.abs(eight.voltage - (128 / 255) * 5) < 1e-12);
      const sixteen = pwmSignal(32768, 16, 3.3, true);
      assert.equal(sixteen.code, 32768);
      assert.ok(Math.abs(sixteen.voltage - (32768 / 65535) * 3.3) < 1e-12);
      assert.equal(clampPwmResolution(16, 8), 8);
      assert.equal(clampPwmResolution(16, 16), 16);
      assert.equal(pwmSignal(1000, 8, 5, true).voltage, 5);
      assert.equal(pwmSignal(-1, 8, 5, true).voltage, 0);
      assert.equal(pwmSignal(128, 8, 5, false).voltage, 5);
      assert.throws(() => clampPwmResolution(0, 16), /1–16/);
      assert.throws(() => pwmSignal(1, 0, 5, true), /bilangan bulat 1–16/);
    });
    test("Quadrature encoder advances x4 Gray code in both directions", () => {
      assert.deepEqual([0, 0.9, 1.8, 2.7].map((degrees) => quadratureState(degrees * Math.PI / 180, 100).channelA.toString() + quadratureState(degrees * Math.PI / 180, 100).channelB), ["00", "01", "11", "10"]);
      assert.deepEqual(quadratureState(-0.9 * Math.PI / 180, 100), { count: -1, phase: 3, channelA: 1, channelB: 0 });
      assert.throws(() => quadratureState(0, 0), /PPR/);
    });
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
    const servoDevices = new Map();
    const servoSketch = new SketchRuntime(
      new SketchParser("Servo left; Servo right; void setup(){ left.attach(9); right.attach(10); left.write(30); right.write(150); } void loop(){ Serial.println(left.read()); Serial.println(right.read()); }"),
      {
        "*.attach": (pin, id) => { servoDevices.set(id, { pin, angle: 90 }); return 1; },
        "*.write": (angle, id) => { servoDevices.get(id).angle = angle; return 0; },
        "*.read": (id) => servoDevices.get(id).angle,
        "Serial.println": (v) => { log.push(v); return 0; },
      },
    );
    log = [];
    await servoSketch.start();
    await servoSketch.loop();
    test("Servo object handles retain separate attach pins and angles", () => {
      assert.deepEqual([...servoDevices.entries()], [["left", { pin: 9, angle: 30 }], ["right", { pin: 10, angle: 150 }]]);
      assert.deepEqual(log, [30, 150]);
    });
    const pcaCommands = [];
    const pcaSketch = new SketchRuntime(new SketchParser(example("pca9685").code), {
      Adafruit_PWMServoDriver: () => 0,
      "Serial.begin": () => 0,
      "Serial.println": () => 0,
      "*.begin": (instanceName) => { pcaCommands.push(["begin", instanceName]); return 1; },
      "*.setPWMFreq": (frequency, instanceName) => { pcaCommands.push(["frequency", frequency, instanceName]); return 1; },
      "*.setPWM": (channel, on, off, instanceName) => { pcaCommands.push(["channel", channel, on, off, instanceName]); return 1; },
      delay: () => 0,
    });
    await pcaSketch.start();
    await pcaSketch.loop();
    test("PCA9685 example parses and runtime preserves driver handle for frequency and channel calls", () => {
      assert.deepEqual(pcaCommands, [
        ["begin", "pwm"],
        ["frequency", 50, "pwm"],
        ["channel", 0, 0, 205, "pwm"],
        ["channel", 0, 0, 307, "pwm"],
        ["channel", 0, 0, 410, "pwm"],
      ]);
    });
    const i2cScanned = [];
    let scanningAddress = -1;
    const i2cScanner = new SketchRuntime(new SketchParser(example("i2c_scan").code), {
      "Serial.begin": () => 0,
      "Serial.print": () => 0,
      "Serial.println": (value, base) => {
        if (base === 16) i2cScanned.push(Number(value));
        return 0;
      },
      "Wire.begin": () => 0,
      "Wire.beginTransmission": (address) => { scanningAddress = Number(address); return 0; },
      "Wire.endTransmission": () => [0x27, 0x3c, 0x40, 0x68].includes(scanningAddress) ? 0 : 2,
      delay: () => 0,
    });
    await i2cScanner.start();
    await i2cScanner.loop();
    test("I2C scanner preset probes valid 7-bit addresses and reports ACK responders", () => {
      const scanner = example("i2c_scan");
      const deviceTypes = scanner.components.map((component) => component.typeId).sort();
      assert.deepEqual(deviceTypes, ["arduino_uno", "imu_6axis", "lcd1602_i2c", "oled_ssd1306", "pca9685_i2c"].sort());
      assert.deepEqual(i2cScanned, [0x27, 0x3c, 0x40, 0x68]);
      assert.ok(scanner.wires.length >= 16);
      const solved = solveCircuit(scanner.components, scanner.wires, {});
      const connectivity = buildElectricalConnectivity(scanner.components, scanner.wires);
      const addressByType = { lcd1602_i2c: 0x27, oled_ssd1306: 0x3c, pca9685_i2c: 0x40, imu_6axis: 0x68 };
      const poweredBusAddresses = Object.values(addressByType).filter((address) => connectedI2CDevices(
        scanner.components,
        "uno",
        "SDA",
        "SCL",
        address,
        connectivity,
        (component) => addressByType[component.typeId],
        (component) => solved.states[component.id]?.isPowered ??
          (solved.voltages[terminal(component.id, "VCC")] ?? 0) - (solved.voltages[terminal(component.id, "GND")] ?? 0) >= 2.7,
      ).length > 0).sort((a, b) => a - b);
      assert.deepEqual(poweredBusAddresses, [0x27, 0x3c, 0x40, 0x68]);
    });
    test("AI gateway action chunks reject malformed data and clamp joint targets and duration", () => {
      const arm = instance("edu_arm_3dof", "arm", [0, 0, 0]);
      const chunk = validateActionChunk(JSON.stringify({
        type: "action_chunk", sequence: 7, validForMs: 8000,
        joints: [
          { robotId: "arm", jointIndex: 0, targetRad: 99 },
          { robotId: "other", jointIndex: 1, targetRad: 0.2 },
          { robotId: "arm", jointIndex: 8, targetRad: 0.2 },
        ],
      }), [arm], "arm");
      assert.equal(chunk.sequence, 7);
      assert.equal(chunk.validForMs, 2000);
      assert.deepEqual(chunk.joints, [{ robotId: "arm", jointIndex: 0, targetRad: Math.PI }]);
      assert.throws(() => validateActionChunk("{", [arm], "arm"), /JSON/);
      assert.throws(() => validateActionChunk(" ".repeat(16_385), [arm], "arm"), /16 KB/);
    });
    test("AI gateway URLs require WSS remotely and reject embedded credentials", () => {
      assert.equal(validateGatewayUrl("wss://example.test/policy"), "wss://example.test/policy");
      assert.equal(validateGatewayUrl("ws://localhost:8765"), "ws://localhost:8765/");
      assert.throws(() => validateGatewayUrl("ws://example.test"), /wss/);
      assert.throws(() => validateGatewayUrl("wss://user:secret@example.test"), /kredensial/);
    });
    test("ONNX classifier preprocessing flips camera origin, packs RGB channels, and ranks logits safely", () => {
      const rgba = new Uint8Array([
        255, 0, 0, 255, 0, 255, 0, 255,
        0, 0, 255, 255, 255, 255, 255, 255,
      ]);
      const nchw = imageToFloatTensor(rgba, 2, 2, 2, 2, "nchw", "unit");
      assert.deepEqual([...nchw], [0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0]);
      const nhwc = imageToFloatTensor(rgba, 2, 2, 2, 2, "nhwc", "unit");
      assert.deepEqual([...nhwc], [0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0]);
      const ranked = topClassScores([0, 2, -1], ["idle", "target", "other"], 3);
      assert.equal(ranked[0].label, "target");
      assert.ok(Math.abs(ranked.reduce((sum, item) => sum + item.score, 0) - 1) < 1e-12);
      assert.throws(() => imageToFloatTensor(rgba, 3, 2, 2, 2, "nchw", "unit"), /buffer/i);
    });
    const roverCommands = [];
    const driveSketch = new SketchRuntime(
      new SketchParser("DifferentialDrive rover; void setup(){ rover.drive(0.2, 0.2); } void loop(){ rover.stop(); }"),
      {
        "*.drive": (left, right, id) => { roverCommands.push(["drive", left, right, id]); return 0; },
        "*.stop": (id) => { roverCommands.push(["stop", id]); return 0; },
      },
    );
    await driveSketch.start();
    await driveSketch.loop();
    test("DifferentialDrive sketch methods retain their handle name", () => {
      assert.deepEqual(roverCommands, [["drive", 0.2, 0.2, "rover"], ["stop", "rover"]]);
    });
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

    test("Servo V-HAL resolves signal through breadboard rails and terminal rows", () => {
      const uno = instance("arduino_uno", "uno", [-7, 0, 0]);
      const breadboard = instance("breadboard", "bb", [0, 0, 0]);
      const servo = instance("servo_sg90", "servo", [0, 0, 0]);
      const wires = [
        { id: "signal-in", sourceComponentId: "uno", sourcePinId: "D9", targetComponentId: "bb", targetPinId: "t10_0", color: "#f97316" },
        { id: "signal-out", sourceComponentId: "bb", sourcePinId: "t10_4", targetComponentId: "servo", targetPinId: "PWM", color: "#f97316" },
      ];
      const nets = buildElectricalConnectivity([uno, breadboard, servo], wires);
      assert.equal(nets.connected("uno", "D9", "servo", "PWM"), true);
      assert.equal(nets.connected("uno", "D10", "servo", "PWM"), false);
    });
    test("Powered quadrature encoder drives readable A/B logic levels through board pins", () => {
      const uno = instance("arduino_uno", "uno", [-7, 0, 0]);
      const encoder = instance("incremental_encoder", "encoder", [4, 0.6, 0]);
      encoder.state.pulsesPerRevolution = 100;
      encoder.state.angle = 0.9 * Math.PI / 180;
      const wires = [
        { id: "vcc", sourceComponentId: "uno", sourcePinId: "5V", targetComponentId: "encoder", targetPinId: "VCC", color: "#ef4444" },
        { id: "gnd", sourceComponentId: "uno", sourcePinId: "GND1", targetComponentId: "encoder", targetPinId: "GND", color: "#171717" },
        { id: "a", sourceComponentId: "uno", sourcePinId: "D2", targetComponentId: "encoder", targetPinId: "A", color: "#3b82f6" },
        { id: "b", sourceComponentId: "uno", sourcePinId: "D3", targetComponentId: "encoder", targetPinId: "B", color: "#22c55e" },
      ];
      const inputs = { D2: { mode: "INPUT", value: 0 }, D3: { mode: "INPUT", value: 0 } };
      let result = solveCircuit([uno, encoder], wires, inputs);
      assert.equal(result.states.encoder.isPowered, true);
      assert.equal(result.states.encoder.count, 1);
      assert.ok(result.voltages[terminal("uno", "D2")] < 0.1);
      assert.ok(result.voltages[terminal("uno", "D3")] > 4.9);
      encoder.state.angle = 1.8 * Math.PI / 180;
      result = solveCircuit([uno, encoder], wires, inputs);
      assert.ok(result.voltages[terminal("uno", "D2")] > 4.9);
      assert.ok(result.voltages[terminal("uno", "D3")] > 4.9);
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

    test("Omron CP1E exposes 24V inputs and dry-contact relay outputs", () => {
      const plc = instance("plc_omron_cp1e", "plc", [0, 0, 0]);
      plc.state.outputMask = 1;
      const wires = [
        { id: "p1", sourceComponentId: "plc", sourcePinId: "24V", targetComponentId: "plc", targetPinId: "X0", color: "#ef4444" },
        { id: "p2", sourceComponentId: "plc", sourcePinId: "0V", targetComponentId: "plc", targetPinId: "COMI", color: "#171717" },
        { id: "p3", sourceComponentId: "plc", sourcePinId: "24V", targetComponentId: "plc", targetPinId: "COMQ", color: "#ef4444" },
      ];
      const r = solveCircuit([plc], wires, {});
      assert.equal(r.states.plc.isPowered, true);
      assert.equal(r.states.plc.inputMask & 1, 1);
      assert.ok(r.voltages[terminal("plc", "Y0")] > 23.9);
    });

    test("NEMA17 resolves bipolar phase sequence into steps and angle", () => {
      const plc = instance("plc_omron_cp1e", "plc", [0, 0, 0]);
      const motor = instance("stepper_nema17", "motor", [0, 0, 0]);
      motor.state.phaseIndex = 0;
      const wires = [
        { id: "s1", sourceComponentId: "plc", sourcePinId: "0V", targetComponentId: "motor", targetPinId: "A+", color: "#171717" },
        { id: "s2", sourceComponentId: "plc", sourcePinId: "24V", targetComponentId: "motor", targetPinId: "A-", color: "#ef4444" },
        { id: "s3", sourceComponentId: "plc", sourcePinId: "24V", targetComponentId: "motor", targetPinId: "B+", color: "#ef4444" },
        { id: "s4", sourceComponentId: "plc", sourcePinId: "0V", targetComponentId: "motor", targetPinId: "B-", color: "#171717" },
      ];
      const r = solveCircuit([plc, motor], wires, {});
      assert.equal(r.states.motor.phaseIndex, 1);
      assert.equal(r.states.motor.steps, 1);
      assert.equal(r.states.motor.angle, 1.8);
      assert.ok(r.warnings.some((x) => x.includes("driver stepper")));
    });

    test("DC motor winding equivalent and electromechanical state integrate consistently", () => {
      const params = dcMotorParameters({});
      const eq = dcMotorElectricalEquivalent({ armatureCurrentA: 0.5, backEmfV: 1, omegaRadS: 0, angleRad: 0 }, params, 0.005);
      assert.ok(Math.abs(eq.resistanceOhms - 6.4) < 1e-12);
      assert.ok(Math.abs(eq.voltageOffsetV - 0.8) < 1e-12);
      let state = { armatureCurrentA: 0, backEmfV: 0, omegaRadS: 0, angleRad: 0 };
      for (let i = 0; i < 40; i++) state = advanceDcMotor(state, params, 0.25, 0.005);
      assert.ok(state.omegaRadS > 0);
      assert.ok(state.angleRad > 0);
      assert.ok(state.backEmfV > 0);
    });

    test("L298N drives a DC motor in both directions from PWM and direction pins", () => {
      const uno = instance("arduino_uno", "uno", [0, 0, 0]);
      const driver = instance("l298n_dual_hbridge", "driver", [0, 0, 0]);
      const motor = instance("dc_motor", "motor", [0, 0, 0]);
      const supply = instance("dc_supply", "supply", [0, 0, 0]);
      const wires = [
        ["uno", "5V", "driver", "VSS"], ["uno", "GND1", "driver", "GND"],
        ["supply", "V+", "driver", "VS"], ["supply", "GND", "driver", "GND"],
        ["uno", "GND1", "supply", "GND"], ["uno", "D5", "driver", "ENA"],
        ["uno", "D8", "driver", "IN1"], ["uno", "D9", "driver", "IN2"],
        ["driver", "OUT1", "motor", "M+"], ["driver", "OUT2", "motor", "M-"],
      ].map(([sourceComponentId, sourcePinId, targetComponentId, targetPinId], i) => ({
        id: `l298n-${i}`, sourceComponentId, sourcePinId, targetComponentId, targetPinId, color: "#ef4444",
      }));
      const forward = solveCircuit([uno, driver, motor, supply], wires, {
        D5: { mode: "OUTPUT", value: 2.5 }, D8: { mode: "OUTPUT", value: 5 }, D9: { mode: "OUTPUT", value: 0 },
      });
      assert.equal(forward.states.driver.isLogicPowered, true);
      assert.equal(forward.states.driver.isMotorPowered, true);
      assert.equal(forward.states.driver.motorIdA, "motor");
      assert.ok(forward.states.driver.currentA > 0);
      assert.ok(forward.states.motor.motorVoltageV > 0);
      const reverse = solveCircuit([uno, driver, motor, supply], wires, {
        D5: { mode: "OUTPUT", value: 5 }, D8: { mode: "OUTPUT", value: 0 }, D9: { mode: "OUTPUT", value: 5 },
      });
      assert.ok(reverse.states.driver.currentA < 0);
      assert.ok(reverse.states.motor.motorVoltageV < 0);
    });

    test("L298N thermal shutdown inhibits bridge drive until its thermal state clears", () => {
      const uno = instance("arduino_uno", "uno", [0, 0, 0]);
      const driver = instance("l298n_dual_hbridge", "driver", [0, 0, 0]);
      driver.state.isThermalShutdown = true;
      const motor = instance("dc_motor", "motor", [0, 0, 0]);
      const supply = instance("dc_supply", "supply", [0, 0, 0]);
      const connections = [
        ["uno", "5V", "driver", "VSS"], ["uno", "GND1", "driver", "GND"],
        ["supply", "V+", "driver", "VS"], ["supply", "GND", "driver", "GND"],
        ["uno", "GND1", "supply", "GND"], ["uno", "D5", "driver", "ENA"],
        ["uno", "D8", "driver", "IN1"], ["uno", "D9", "driver", "IN2"],
        ["driver", "OUT1", "motor", "M+"], ["driver", "OUT2", "motor", "M-"],
      ];
      const wires = connections.map(([sourceComponentId, sourcePinId, targetComponentId, targetPinId], i) => ({
        id: `thermal-stop-${i}`, sourceComponentId, sourcePinId, targetComponentId, targetPinId, color: "#ef4444",
      }));
      const result = solveCircuit([uno, driver, motor, supply], wires, {
        D5: { mode: "OUTPUT", value: 5 }, D8: { mode: "OUTPUT", value: 5 }, D9: { mode: "OUTPUT", value: 0 },
      });
      assert.equal(result.states.driver.isThermalShutdown, true);
      assert.equal(result.states.driver.currentA, 0);
      assert.ok(result.warnings.some((warning) => warning.includes("proteksi thermal")));
    });

    test("L298N flyback clamp diodes conduct and limit coast voltage spikes", () => {
      const uno = instance("arduino_uno", "uno", [0, 0, 0]);
      const driver = instance("l298n_dual_hbridge", "driver", [0, 0, 0]);
      const motor = instance("dc_motor", "motor", [0, 0, 0]);
      motor.state.backEmfV = 16;
      motor.state.omegaRadS = 2600;
      const supply = instance("dc_supply", "supply", [0, 0, 0]);
      const connections = [
        ["uno", "5V", "driver", "VSS"], ["uno", "GND1", "driver", "GND"],
        ["supply", "V+", "driver", "VS"], ["supply", "GND", "driver", "GND"],
        ["uno", "GND1", "supply", "GND"], ["uno", "D5", "driver", "ENA"],
        ["uno", "D8", "driver", "IN1"], ["uno", "D9", "driver", "IN2"],
        ["driver", "OUT1", "motor", "M+"], ["driver", "OUT2", "motor", "M-"],
      ];
      const wires = connections.map(([sourceComponentId, sourcePinId, targetComponentId, targetPinId], i) => ({
        id: `flyback-${i}`, sourceComponentId, sourcePinId, targetComponentId, targetPinId, color: "#ef4444",
      }));
      const result = solveCircuit([uno, driver, motor, supply], wires, {
        D5: { mode: "OUTPUT", value: 0 }, D8: { mode: "OUTPUT", value: 0 }, D9: { mode: "OUTPUT", value: 0 },
      });
      const out1 = result.voltages[terminal("driver", "OUT1")];
      const out2 = result.voltages[terminal("driver", "OUT2")];
      assert.ok(out1 <= 12.8 && out2 <= 12.8);
      assert.ok(out1 >= -0.8 && out2 >= -0.8);
      assert.ok(result.states.driver.freewheelCurrentA > 0.1);
      assert.ok(result.states.driver.freewheelLossW > 0);
      assert.ok(!result.warnings.some((warning) => warning.includes("diode nonlinier")));
      motor.state.backEmfV = -16;
      motor.state.omegaRadS = -2600;
      const reverse = solveCircuit([uno, driver, motor, supply], wires, {
        D5: { mode: "OUTPUT", value: 0 }, D8: { mode: "OUTPUT", value: 0 }, D9: { mode: "OUTPUT", value: 0 },
      });
      assert.ok(reverse.voltages[terminal("driver", "OUT1")] <= 12.8);
      assert.ok(reverse.voltages[terminal("driver", "OUT2")] >= -0.8);
      assert.ok(reverse.states.driver.freewheelCurrentA > 0.1);
    });

    test("Battery pack applies OCV/ESR sag and reports discharge current", () => {
      const battery = instance("battery_pack", "battery", [0, 0, 0]);
      battery.state.profile = "alkaline_9v";
      battery.state.internalResistanceOhms = 2;
      battery.state.capacityAh = 0.5;
      battery.state.socPercent = 60;
      const load = instance("resistor_220", "load", [0, 0, 0]);
      load.state.resistance = 8;
      const wires = [
        { id: "bplus", sourceComponentId: "battery", sourcePinId: "V+", targetComponentId: "load", targetPinId: "L", color: "#ef4444" },
        { id: "bgnd", sourceComponentId: "battery", sourcePinId: "GND", targetComponentId: "load", targetPinId: "R", color: "#111827" },
      ];
      const result = solveCircuit([battery, load], wires, {});
      const params = batteryParameters(battery.state);
      assert.ok(result.states.battery.terminalVoltageV < params.openCircuitVoltageV);
      assert.ok(result.states.battery.currentA > 0.5 && result.states.battery.currentA < 1.2);
      assert.ok(Math.abs(result.states.battery.socPercent - 60) < 1e-12);
    });

    test("Battery sag reaches the Uno supply rail and crosses the BOR threshold under load", () => {
      const battery = instance("battery_pack", "battery", [0, 0, 0]);
      const uno = instance("arduino_uno", "uno", [0, 0, 0]);
      const load = instance("resistor_220", "load", [0, 0, 0]);
      load.state.resistance = 3;
      const wires = [
        { id: "uno-bat-v", sourceComponentId: "battery", sourcePinId: "V+", targetComponentId: "uno", targetPinId: "5V", color: "#ef4444" },
        { id: "uno-bat-g", sourceComponentId: "battery", sourcePinId: "GND", targetComponentId: "uno", targetPinId: "GND1", color: "#111827" },
        { id: "uno-load-v", sourceComponentId: "uno", sourcePinId: "5V", targetComponentId: "load", targetPinId: "L", color: "#ef4444" },
        { id: "uno-load-g", sourceComponentId: "uno", sourcePinId: "GND1", targetComponentId: "load", targetPinId: "R", color: "#111827" },
      ];
      const result = solveCircuit([battery, uno, load], wires, {});
      const railVoltage = result.voltages[terminal("uno", "5V")];
      assert.ok(railVoltage < 4.1);
      let state = { active: false, lowDurationUs: 0 };
      state = advanceBrownout(state, railVoltage, 4.1, 5000);
      assert.equal(state.event, "reset");
    });

    test("Motor driver draw is reflected at the battery terminals", () => {
      const uno = instance("arduino_uno", "uno", [0, 0, 0]);
      const driver = instance("l298n_dual_hbridge", "driver", [0, 0, 0]);
      const motor = instance("dc_motor", "motor", [0, 0, 0]);
      motor.state.armatureCurrentA = 0.8;
      const battery = instance("battery_pack", "battery", [0, 0, 0]);
      battery.state.profile = "lipo_2s";
      battery.state.internalResistanceOhms = 0.04;
      const connections = [
        ["uno", "5V", "driver", "VSS"], ["uno", "GND1", "driver", "GND"],
        ["battery", "V+", "driver", "VS"], ["battery", "GND", "driver", "GND"],
        ["uno", "GND1", "battery", "GND"], ["uno", "D5", "driver", "ENA"],
        ["uno", "D8", "driver", "IN1"], ["uno", "D9", "driver", "IN2"],
        ["driver", "OUT1", "motor", "M+"], ["driver", "OUT2", "motor", "M-"],
      ];
      const wires = connections.map(([sourceComponentId, sourcePinId, targetComponentId, targetPinId], i) => ({
        id: `battery-drive-${i}`, sourceComponentId, sourcePinId, targetComponentId, targetPinId, color: "#ef4444",
      }));
      const result = solveCircuit([uno, driver, motor, battery], wires, {
        D5: { mode: "OUTPUT", value: 5 }, D8: { mode: "OUTPUT", value: 5 }, D9: { mode: "OUTPUT", value: 0 },
      });
      assert.ok(result.states.battery.currentA > 0.6);
      assert.ok(result.states.battery.terminalVoltageV < result.states.battery.openCircuitVoltageV);
    });

    test("High-ESR 9V alkaline warns on servo loads and reproduces voltage sag", () => {
      const battery = instance("battery_pack", "battery", [0, 0, 0]);
      battery.state.profile = "alkaline_9v";
      battery.state.internalResistanceOhms = 2;
      battery.state.capacityAh = 0.5;
      const servoA = instance("servo_sg90", "servoA", [0, 0, 0]);
      const servoB = instance("servo_sg90", "servoB", [0, 0, 0]);
      for (const servo of [servoA, servoB]) {
        servo.state.isCommanded = true;
        servo.state.currentDrawA = 0.5;
      }
      const wires = [
        ["battery", "V+", "servoA", "VCC"], ["battery", "V+", "servoB", "VCC"],
        ["battery", "GND", "servoA", "GND"], ["battery", "GND", "servoB", "GND"],
      ].map(([sourceComponentId, sourcePinId, targetComponentId, targetPinId], i) => ({
        id: `alkaline-servo-${i}`, sourceComponentId, sourcePinId, targetComponentId, targetPinId, color: "#ef4444",
      }));
      const result = solveCircuit([battery, servoA, servoB], wires, {});
      assert.ok(result.states.battery.terminalVoltageV < result.states.battery.openCircuitVoltageV - 2);
      assert.ok(result.warnings.some((warning) => warning.includes("ESR besar")));
    });

    test("A4988 winding power is reflected in battery pack current", () => {
      const uno = instance("arduino_uno", "uno", [0, 0, 0]);
      const driver = instance("a4988_stepper_driver", "driver", [0, 0, 0]);
      const motor = instance("stepper_nema17", "motor", [0, 0, 0]);
      const battery = instance("battery_pack", "battery", [0, 0, 0]);
      battery.state.profile = "lipo_2s";
      battery.state.internalResistanceOhms = 0.04;
      driver.state.isEnabled = true;
      driver.state.isMotorPowered = true;
      driver.state.vref = 1;
      driver.state.senseResistance = 0.1;
      const connections = [
        ["uno", "5V", "driver", "VDD"], ["uno", "GND1", "driver", "GND_LOGIC"],
        ["battery", "V+", "driver", "VMOT"], ["battery", "GND", "driver", "GND_MOTOR"],
        ["uno", "GND1", "battery", "GND"], ["driver", "1A", "motor", "A+"],
        ["driver", "1B", "motor", "A-"], ["driver", "2A", "motor", "B+"],
        ["driver", "2B", "motor", "B-"],
      ];
      const wires = connections.map(([sourceComponentId, sourcePinId, targetComponentId, targetPinId], i) => ({
        id: `a4988-battery-${i}`, sourceComponentId, sourcePinId, targetComponentId, targetPinId, color: "#ef4444",
      }));
      const result = solveCircuit([uno, driver, motor, battery], wires, {});
      assert.ok(result.states.battery.currentA > 0.2);
      assert.ok(result.states.battery.terminalVoltageV < result.states.battery.openCircuitVoltageV);
    });

    test("DC-DC regulator converts battery power and feeds input current back into pack sag", () => {
      const battery = instance("battery_pack", "battery", [0, 0, 0]);
      const converter = instance("dc_dc_converter", "converter", [0, 0, 0]);
      const load = instance("resistor_220", "load", [0, 0, 0]);
      battery.state.internalResistanceOhms = 0.085;
      converter.state.efficiency = 0.9;
      converter.state.maxOutputCurrentA = 2;
      load.state.resistance = 10;
      const wires = [
        ["battery", "V+", "converter", "VIN"], ["battery", "GND", "converter", "GND_IN"],
        ["converter", "GND_OUT", "battery", "GND"], ["converter", "VOUT", "load", "L"],
        ["load", "R", "battery", "GND"],
      ].map(([sourceComponentId, sourcePinId, targetComponentId, targetPinId], i) => ({
        id: `converter-load-${i}`, sourceComponentId, sourcePinId, targetComponentId, targetPinId, color: "#ef4444",
      }));
      const first = solveCircuit([battery, converter, load], wires, {});
      assert.equal(first.states.converter.isRegulating, true);
      assert.ok(first.states.converter.outputVoltageV > 4.9);
      assert.ok(first.states.converter.inputCurrentA > 0.5);
      converter.state.inputCurrentA = first.states.converter.inputCurrentA;
      const loaded = solveCircuit([battery, converter, load], wires, {});
      assert.ok(loaded.states.battery.currentA > 0.5);
      assert.ok(loaded.states.battery.terminalVoltageV < loaded.states.battery.openCircuitVoltageV);
      converter.state.inputCurrentA = loaded.states.converter.inputCurrentA;
      const settled = solveCircuit([battery, converter, load], wires, {});
      assert.ok(Math.abs(settled.states.battery.currentA - settled.states.converter.inputCurrentA) < 0.01);
    });

    test("DC-DC regulator enforces output current limit with constant-current rail droop", () => {
      const supply = instance("dc_supply", "supply", [0, 0, 0]);
      const converter = instance("dc_dc_converter", "converter", [0, 0, 0]);
      const load = instance("resistor_220", "load", [0, 0, 0]);
      supply.state.voltage = 12;
      converter.state.maxOutputCurrentA = 2;
      load.state.resistance = 1;
      const wires = [
        ["supply", "V+", "converter", "VIN"], ["supply", "GND", "converter", "GND_IN"],
        ["converter", "GND_OUT", "supply", "GND"], ["converter", "VOUT", "load", "L"],
        ["load", "R", "supply", "GND"],
      ].map(([sourceComponentId, sourcePinId, targetComponentId, targetPinId], i) => ({
        id: `converter-limit-${i}`, sourceComponentId, sourcePinId, targetComponentId, targetPinId, color: "#ef4444",
      }));
      const result = solveCircuit([supply, converter, load], wires, {});
      assert.equal(result.states.converter.isCurrentLimited, true);
      assert.ok(Math.abs(result.states.converter.outputCurrentA - 2) < 1e-6);
      assert.ok(result.states.converter.outputVoltageV < 2.1);
      assert.ok(result.warnings.some((warning) => warning.includes("batas arus keluaran")));
    });

    test("DC-DC regulator can power a Uno 5V rail from a single-cell battery", () => {
      const battery = instance("battery_pack", "battery", [0, 0, 0]);
      const converter = instance("dc_dc_converter", "converter", [0, 0, 0]);
      const uno = instance("arduino_uno", "uno", [0, 0, 0]);
      const wires = [
        ["battery", "V+", "converter", "VIN"], ["battery", "GND", "converter", "GND_IN"],
        ["converter", "GND_OUT", "uno", "GND1"], ["converter", "VOUT", "uno", "5V"],
      ].map(([sourceComponentId, sourcePinId, targetComponentId, targetPinId], i) => ({
        id: `converter-uno-${i}`, sourceComponentId, sourcePinId, targetComponentId, targetPinId, color: "#ef4444",
      }));
      const result = solveCircuit([battery, converter, uno], wires, {});
      assert.equal(result.states.converter.isRegulating, true);
      assert.ok(Math.abs(result.voltages[terminal("uno", "5V")] - 5) < 0.02);
    });

    test("Battery SOC integrates discharge and brownout detector trips and recovers", () => {
      assert.equal(advanceBatterySoc(100, 1, 1, 1800), 50);
      const full = batteryParameters({ profile: "liion_18650", socPercent: 100 });
      const empty = batteryParameters({ profile: "liion_18650", socPercent: 0 });
      assert.equal(full.openCircuitVoltageV, 4.2);
      assert.equal(empty.openCircuitVoltageV, 3.0);
      assert.equal(full.maxDischargeCurrentA, 5);
      const battery = instance("battery_pack", "protected-pack", [0, 0, 0]);
      const load = instance("resistor_220", "overload", [0, 0, 0]);
      battery.state.maxDischargeCurrentA = 2;
      load.state.resistance = 0.5;
      const wires = [
        { id: "pack-load", sourceComponentId: battery.id, sourcePinId: "V+", targetComponentId: load.id, targetPinId: "L", color: "red" },
        { id: "load-ground", sourceComponentId: load.id, sourcePinId: "R", targetComponentId: battery.id, targetPinId: "GND", color: "black" },
      ];
      const overloaded = solveCircuit([battery, load], wires, {});
      assert.ok(overloaded.states[battery.id].currentA > battery.state.maxDischargeCurrentA);
      const protection = advanceBatteryProtection({ isProtectionTripped: false, protectionTripCurrentA: 0 }, overloaded.states[battery.id].currentA, battery.state.maxDischargeCurrentA);
      assert.equal(protection.isProtectionTripped, true);
      assert.ok(protection.protectionTripCurrentA > 2);
      assert.equal(advanceBatteryProtection(protection, 0, 2).isProtectionTripped, true);
      battery.state.isProtectionTripped = true;
      const tripped = solveCircuit([battery, load], wires, {});
      assert.equal(tripped.states[battery.id].isOn, false);
      assert.equal(tripped.states[battery.id].currentA, 0);
      assert.ok(tripped.warnings.some((warning) => warning.includes("proteksi arus pack aktif")));
      let state = { active: false, lowDurationUs: 0 };
      state = advanceBrownout(state, 4.0, 4.1, 5);
      assert.equal(state.event, "none");
      state = advanceBrownout(state, 4.0, 4.1, 5);
      state = advanceBrownout(state, 4.0, 4.1, 5);
      assert.equal(state.event, "reset");
      state = advanceBrownout(state, 4.15, 4.1, 5);
      assert.equal(state.active, true);
      state = advanceBrownout(state, 4.2, 4.1, 5);
      assert.equal(state.event, "recovered");
      assert.equal(state.active, false);
    });

    test("CC/CV charger limits charge current, tapers to cutoff, and rejects alkaline cells", () => {
      const battery = instance("battery_pack", "charge-pack", [0, 0, 0]);
      battery.state.socPercent = 50;
      const supply = instance("dc_supply", "charger-supply", [0, 0, 0]);
      const charger = instance("battery_charger", "charger", [0, 0, 0]);
      supply.state.voltage = 12;
      charger.state.maxChargeCurrentA = 0.5;
      const wires = [
        [supply.id, "V+", charger.id, "VIN"], [supply.id, "GND", charger.id, "GND_IN"],
        [charger.id, "BAT+", battery.id, "V+"], [charger.id, "BAT-", battery.id, "GND"],
      ].map(([sourceComponentId, sourcePinId, targetComponentId, targetPinId], i) => ({ id: `charger-${i}`, sourceComponentId, sourcePinId, targetComponentId, targetPinId, color: "red" }));
      const cc = solveCircuit([battery, supply, charger], wires, {});
      assert.equal(cc.states[charger.id].isCharging, true);
      assert.equal(cc.states[charger.id].isConstantVoltage, false);
      assert.equal(cc.states[charger.id].chargeCurrentA, 0.5);
      assert.ok(cc.states[battery.id].currentA < 0);
      assert.ok(advanceBatterySoc(50, cc.states[battery.id].currentA, 2.5, 3600) > 50);
      battery.state.socPercent = 98.5;
      const cv = solveCircuit([battery, supply, charger], wires, {});
      assert.equal(cv.states[charger.id].isConstantVoltage, true);
      assert.ok(cv.states[charger.id].chargeCurrentA < 0.5);
      assert.equal(cv.states[charger.id].isChargeComplete, false);
      assert.equal(cv.states[charger.id].tailCurrentLimitA, 0.125);
      battery.state.socPercent = 99.99;
      const complete = solveCircuit([battery, supply, charger], wires, {});
      assert.equal(complete.states[charger.id].isChargeComplete, true);
      assert.equal(complete.states[charger.id].isCharging, false);
      assert.equal(complete.states[charger.id].chargeCurrentA, 0);
      charger.state.isChargeComplete = true;
      battery.state.socPercent = 97.9;
      const resumed = solveCircuit([battery, supply, charger], wires, {});
      assert.equal(resumed.states[charger.id].isChargeComplete, false);
      assert.equal(resumed.states[charger.id].isCharging, true);
      charger.state.isChargeComplete = false;
      charger.state.isSafetyTimerExpired = true;
      const timedOut = solveCircuit([battery, supply, charger], wires, {});
      assert.equal(timedOut.states[charger.id].isSafetyTimerExpired, true);
      assert.equal(timedOut.states[charger.id].isCharging, false);
      assert.equal(timedOut.states[charger.id].chargeCurrentA, 0);
      charger.state.isSafetyTimerExpired = false;
      battery.state.profile = "alkaline_9v";
      const notRechargeable = solveCircuit([battery, supply, charger], wires, {});
      assert.equal(notRechargeable.states[charger.id].isCharging, false);
      assert.equal(notRechargeable.states[battery.id].currentA, 0);
    });

    test("LiPo 2S charger passively balances the higher cell and reports per-cell state", () => {
      const battery = instance("battery_pack", "balance-pack", [0, 0, 0]);
      battery.state.profile = "lipo_2s";
      battery.state.socPercent = 95;
      battery.state.cell1SocPercent = 100;
      battery.state.cell2SocPercent = 90;
      const supply = instance("dc_supply", "balance-supply", [0, 0, 0]);
      const charger = instance("battery_charger", "balance-charger", [0, 0, 0]);
      supply.state.voltage = 12;
      charger.state.maxChargeCurrentA = 0.5;
      const wires = [
        [supply.id, "V+", charger.id, "VIN"], [supply.id, "GND", charger.id, "GND_IN"],
        [charger.id, "BAT+", battery.id, "V+"], [charger.id, "BAT-", battery.id, "GND"],
      ].map(([sourceComponentId, sourcePinId, targetComponentId, targetPinId], i) => ({ id: `balance-${i}`, sourceComponentId, sourcePinId, targetComponentId, targetPinId, color: "red" }));
      const solved = solveCircuit([battery, supply, charger], wires, {});
      const batteryState = solved.states[battery.id];
      const chargerState = solved.states[charger.id];
      assert.equal(batteryState.cell1SocPercent, 100);
      assert.equal(batteryState.cell2SocPercent, 90);
      assert.equal(batteryState.cell1OpenCircuitVoltageV, 4.2);
      assert.equal(batteryState.cell2OpenCircuitVoltageV, 4.1);
      assert.equal(batteryState.openCircuitVoltageV, 8.3);
      assert.equal(batteryState.cellDeltaVoltageV, 0.1);
      assert.equal(batteryState.isBalancing, true);
      assert.equal(batteryState.balanceCellIndex, 1);
      assert.equal(chargerState.isBalancing, true);
      assert.equal(chargerState.balanceCurrentA, 0.05);
      assert.equal(chargerState.isChargeComplete, false);
      assert.equal(chargerState.chargeCurrentA, 0.05);
      assert.ok(batteryState.currentA < 0);
      const balanced = advanceLipo2sSoc(100, 90, 0, 2, 0.05, 1, 3600);
      assert.ok(balanced.cell1SocPercent < 100);
      assert.equal(balanced.cell2SocPercent, 90);
      assert.ok(balanced.cell1SocPercent - balanced.cell2SocPercent < 10);
      assert.equal(balanced.socPercent, (balanced.cell1SocPercent + balanced.cell2SocPercent) / 2);
    });

    test("Charger reverse-polarity protection blocks reversed battery and input wiring", () => {
      const battery = instance("battery_pack", "reverse-pack", [0, 0, 0]);
      battery.state.socPercent = 50;
      const supply = instance("dc_supply", "reverse-supply", [0, 0, 0]);
      const charger = instance("battery_charger", "reverse-charger", [0, 0, 0]);
      supply.state.voltage = 12;
      const wiresFor = (batteryPositive, batteryNegative) => [
        [supply.id, "V+", charger.id, "VIN"], [supply.id, "GND", charger.id, "GND_IN"],
        [charger.id, "BAT+", battery.id, batteryPositive], [charger.id, "BAT-", battery.id, batteryNegative],
      ].map(([sourceComponentId, sourcePinId, targetComponentId, targetPinId], i) => ({ id: `reverse-${i}`, sourceComponentId, sourcePinId, targetComponentId, targetPinId, color: "red" }));

      const reversedPack = solveCircuit([battery, supply, charger], wiresFor("GND", "V+"), {});
      assert.equal(reversedPack.states[charger.id].isReverseConnected, true);
      assert.equal(reversedPack.states[charger.id].isCharging, false);
      assert.equal(reversedPack.states[charger.id].chargeCurrentA, 0);
      assert.equal(reversedPack.states[battery.id].currentA, 0);
      assert.ok(reversedPack.warnings.some((warning) => warning.includes("polaritas") && warning.includes("terbalik")));

      supply.state.voltage = 12;
      const reversedInputWires = [
        [supply.id, "GND", charger.id, "VIN"], [supply.id, "V+", charger.id, "GND_IN"],
        [charger.id, "BAT+", battery.id, "V+"], [charger.id, "BAT-", battery.id, "GND"],
      ].map(([sourceComponentId, sourcePinId, targetComponentId, targetPinId], i) => ({ id: `reverse-input-${i}`, sourceComponentId, sourcePinId, targetComponentId, targetPinId, color: "red" }));
      const reversedInput = solveCircuit([battery, supply, charger], reversedInputWires, {});
      assert.equal(reversedInput.states[charger.id].isReverseConnected, true);
      assert.equal(reversedInput.states[charger.id].isCharging, false);
      assert.equal(reversedInput.states[charger.id].chargeCurrentA, 0);
      assert.equal(reversedInput.states[battery.id].currentA, 0);
    });

    test("Battery charger thermal RC shuts down at 90°C and recovers below 75°C", () => {
      let state = { temperatureC: 25, isThermalShutdown: false };
      for (let i = 0; i < 200000; i++) state = advanceBatteryChargerThermal(state, 2, 0.005);
      assert.equal(state.isThermalShutdown, true);
      assert.ok(state.temperatureC >= 90);
      state = advanceBatteryChargerThermal(state, 0, 0.005);
      assert.equal(state.isThermalShutdown, true, "hysteresis holds shutdown above the recovery threshold");
      for (let i = 0; i < 50000; i++) state = advanceBatteryChargerThermal(state, 0, 0.005);
      assert.equal(state.isThermalShutdown, false);
      assert.ok(state.temperatureC < 75);
    });

    test("Charger safety timer counts active simulation time, pauses, and latches until reset", () => {
      let state = { chargeElapsedSeconds: 0, safetyTimerLimitSeconds: 60, isSafetyTimerExpired: false };
      state = advanceChargerSafetyTimer(state, true, 24);
      assert.equal(state.chargeElapsedSeconds, 24);
      assert.equal(state.isSafetyTimerExpired, false);
      state = advanceChargerSafetyTimer(state, false, 4);
      assert.equal(state.chargeElapsedSeconds, 24, "idle time does not consume the charge safety timer");
      state = advanceChargerSafetyTimer(state, true, 36);
      assert.equal(state.chargeElapsedSeconds, 60);
      assert.equal(state.isSafetyTimerExpired, true);
      state = advanceChargerSafetyTimer(state, true, 100);
      assert.equal(state.chargeElapsedSeconds, 60, "expired timer remains latched");
      assert.equal(state.isSafetyTimerExpired, true);
      state = advanceChargerSafetyTimer({ chargeElapsedSeconds: 0, safetyTimerLimitSeconds: 10, isSafetyTimerExpired: false }, true, 5);
      assert.equal(state.safetyTimerLimitSeconds, 60, "timer minimum is bounded to one minute");
      assert.equal(state.isSafetyTimerExpired, false);
    });

    test("Virtual soldering pad heuristic differentiates pad mass and classifies common faults", () => {
      const start = { temperatureC: 25, contactSeconds: 0, solderAmount: 0, quality: "untouched" };
      let signalPad = start;
      let groundPad = start;
      for (let i = 0; i < 70; i++) {
        signalPad = advanceSolderPad(signalPad, { tipTemperatureC: 350, touching: true, padKind: "signal" }, 0.05);
        groundPad = advanceSolderPad(groundPad, { tipTemperatureC: 350, touching: true, padKind: "ground" }, 0.05);
      }
      assert.ok(signalPad.temperatureC > groundPad.temperatureC, "ground plane has greater thermal mass");
      assert.equal(classifySolderJoint({ ...signalPad, contactSeconds: 0.5 }, "lead"), "cold");
      assert.equal(classifySolderJoint({ ...signalPad, contactSeconds: 2.5 }, "lead"), "good");
      assert.equal(classifySolderJoint({ ...signalPad, contactSeconds: 2.5, temperatureC: 210 }, "sac305"), "cold");
      assert.equal(classifySolderJoint({ ...signalPad, contactSeconds: 4.5 }, "lead"), "excess-heat");
      assert.equal(classifySolderJoint({ ...signalPad, contactSeconds: 6.1 }, "lead"), "overheated");
      assert.equal(solderBridgeDetected(0.7, 0.7), true);
      assert.equal(solderBridgeDetected(0.69, 1.2), false);
    });

    test("L298N thermal RC reaches shutdown and cools through recovery hysteresis", () => {
      let state = { temperatureC: 25, isThermalShutdown: false };
      for (let i = 0; i < 1000; i++) state = advanceL298NThermal(state, 8, 0.5);
      assert.equal(state.isThermalShutdown, true);
      assert.ok(state.temperatureC >= 150);
      for (let i = 0; i < 1000; i++) state = advanceL298NThermal(state, 0, 0.5);
      assert.equal(state.isThermalShutdown, false);
      assert.ok(state.temperatureC < 135);
    });

    test("A4988 thermal estimate trips at 165°C and recovers with 15°C hysteresis", () => {
      let state = { temperatureC: 25, isThermalShutdown: false };
      for (let i = 0; i < 12000; i++) state = advanceA4988Thermal(state, 7, 0.005);
      assert.equal(state.isThermalShutdown, true);
      assert.ok(state.temperatureC >= 165);
      for (let i = 0; i < 12000; i++) state = advanceA4988Thermal(state, 0, 0.005);
      assert.equal(state.isThermalShutdown, false);
      assert.ok(state.temperatureC < 150);
    });

    test("A4988 UVLO uses hysteresis and OCP fault requires a safe SLEEP cycle", () => {
      let state = { isUvlo: false, isOvercurrentFault: false, sleepHigh: true, isEnabled: false };
      const input = { vdd: 2.7, motorVoltage: 12, currentLimitA: 1.25, enableLow: true, resetHigh: true, sleepHigh: true, isThermalShutdown: false };
      state = advanceA4988Protection(state, input);
      assert.equal(state.isUvlo, true);
      state = advanceA4988Protection(state, { ...input, vdd: 2.75 });
      assert.equal(state.isUvlo, true);
      state = advanceA4988Protection(state, { ...input, vdd: 2.81 });
      assert.equal(state.isUvlo, false);
      state = advanceA4988Protection(state, { ...input, vdd: 3.3 });
      assert.equal(state.isEnabled, true);
      state = advanceA4988Protection(state, { ...input, vdd: 5, currentLimitA: 2.2 });
      assert.equal(state.isOvercurrentFault, true);
      assert.equal(state.isEnabled, false);
      state = advanceA4988Protection(state, { ...input, vdd: 5, currentLimitA: 1.5, sleepHigh: false });
      assert.equal(state.isOvercurrentFault, true);
      state = advanceA4988Protection(state, { ...input, vdd: 5, currentLimitA: 1.5, sleepHigh: true });
      assert.equal(state.isOvercurrentFault, false);
      assert.equal(state.isEnabled, true);
    });

    await asyncTest("Sketch sensor V-HAL reads RGB-D, LiDAR and IMU snapshots safely", async () => {
      let frames = {
        rgbd: { cam: { width: 2, height: 1, rgba: new Uint8Array([10, 20, 30, 255, 40, 50, 60, 255]), depthMeters: new Float32Array([1.25, 2.5]), sampleCount: 1, capturedAtSimMs: 100, intrinsics: { fx: 1, fy: 1, cx: 1, cy: 0.5 }, near: 0.1, far: 10 } },
        lidar: { scan: { rangesMeters: new Float32Array([3, 12]), hitMask: new Uint8Array([1, 0]), sampleCount: 2, maxRangeMeters: 12, capturedAtSimMs: 100 } },
        imu: { imu0: { accelerationMps2: [0.1, 0.2, 9.8], angularVelocityRadS: [0.01, 0.02, 0.03], sampleCount: 1, capturedAtSimMs: 100, sourceComponentId: "arm" } },
      };
      const api = sensorReadApi(() => frames);
      assert.equal(api.cameraDepth("cam", 1, 0), 2.5);
      assert.equal(api.cameraRgb("cam", 0, 0, "g"), 20);
      assert.equal(api.cameraWidth("cam"), 2);
      assert.equal(api.lidarRange("scan", 1), 12);
      assert.equal(api.lidarHit("scan", 0), 1);
      assert.equal(api.lidarRange("scan", 9), 0);
      assert.equal(api.imuRead("imu0", "gz"), 0.03);
      assert.equal(api.imuRead("missing", "ax"), 0);
      const log = [];
      const sketch = new SketchRuntime(
        new SketchParser('void setup() {} void loop() { Serial.println(cameraDepth("cam", 1, 0)); Serial.println(lidarRange("scan", 0)); Serial.println(imuRead("imu0", "az")); }'),
        { ...api, "Serial.println": (value) => { log.push(value); return 0; } },
      );
      await sketch.start();
      await sketch.loop();
      assert.deepEqual(log, [2.5, 3, 9.8]);
      const previousSignature = sensorFramesSignature(frames);
      frames = {
        ...frames,
        rgbd: { ...frames.rgbd, cam: { ...frames.rgbd.cam, rgba: new Uint8Array([10, 20, 30, 255, 40, 50, 60, 255]), depthMeters: new Float32Array([1.25, 4.75]), sampleCount: 2 } },
      };
      assert.notEqual(sensorFramesSignature(frames), previousSignature, "pose-triggered capture at the same sim-time must be transferred");
      await sketch.loop();
      assert.deepEqual(log.slice(3), [4.75, 3, 9.8]);

      const sensorProject = example("sensor_fusion");
      assert.deepEqual(sensorProject.components.map((component) => component.typeId), ["arduino_uno", "rgbd_camera", "planar_lidar", "imu_6axis"]);
      assert.equal(sensorProject.wires.length, 0);
      const demoLog = [];
      const demo = new SketchRuntime(new SketchParser(sensorProject.code), {
        ...api,
        "Serial.begin": () => 0,
        "Serial.print": (value) => { demoLog.push(value); return 0; },
        "Serial.println": (value) => { demoLog.push(value); return 0; },
        delay: async () => 0,
      });
      await demo.start();
      await demo.loop();
      assert.ok(demoLog.includes(2) && demoLog.includes(1) && demoLog.includes(3) && demoLog.includes(0.2));
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
    await asyncTest("Rapier rigid bodies follow the fixed sim timestep and settle on the physical floor", async () => {
      const world = await RigidBodyWorld.create();
      const object = {
        id: "falling-led", typeId: "led_red", name: "LED", type: "passive",
        position: [0, 40, 0], rotation: [0, 0, 0], state: { physicsMode: "dynamic", physicsMassKg: 0.02, physicsFriction: 0.7, physicsRestitution: 0 }, pins: [],
      };
      world.sync([object]);
      assert.ok(Math.abs(world.transforms()[object.id].position[1] - 40) < 0.001);
      world.step(200);
      const settled = world.transforms()[object.id];
      assert.ok(settled.position[1] < 1, `root should rest at its local lower-bound height; got ${settled.position[1]}`);
      assert.ok(settled.position[1] > 0.45, `collider should remain above the table; got ${settled.position[1]}`);
      assert.ok(Math.abs(world.transforms()[object.id].position[0]) < 0.5, "centered body should not drift laterally by a visible amount");
      world.dispose();
    });
    await asyncTest("Rapier fixed joints transfer gravity load from a dynamic body to its fixed parent", async () => {
      const world = await RigidBodyWorld.create();
      const anchor = {
        id: "anchor", typeId: "led_red", name: "Anchor", type: "passive",
        position: [0, 20, 0], rotation: [0, 0, 0], state: { physicsMode: "fixed" }, pins: [],
      };
      const link = {
        id: "link", typeId: "led_red", name: "Link", type: "passive",
        position: [0, 20, 0], rotation: [0, 0, 0], state: { physicsMode: "dynamic", physicsParentId: "anchor", physicsJointType: "fixed" }, pins: [],
      };
      world.sync([anchor, link]);
      world.step(100);
      const settled = world.transforms().link.position;
      assert.ok(Math.abs(settled[1] - 20) < 0.5, `fixed joint should preserve anchor pose; got ${settled[1]}`);
      world.dispose();
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
