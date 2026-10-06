import { esp32Pins } from "./esp32";
import {
  dht11Pins,
  hcsr04Pins,
  a4988Pins,
  lcd1602Pins,
  nema17Pins,
  quadratureEncoderPins,
  oledPins,
  mpu6050Pins,
  pca9685Pins,
  omronCp1ePins,
  servoPins,
  dcSupplyPins,
  batteryPackPins,
  dcDcConverterPins,
  batteryChargerPins,
  dcMotorPins,
  l298nPins,
  unoPins,
} from "./physical";
import { ComponentType, PinDefinition } from "./componentTypes";

export interface ComponentRegistration {
  typeId: string;
  name: string;
  type: ComponentType;
  description: string;
  category:
    "Boards" | "Basic" | "Sensors" | "Actuators" | "Displays" | "Wiring" | "Robotics";
  defaultState: Record<string, number | string | boolean>;
  pins: PinDefinition[];
}

class Registry {
  private components = new Map<string, ComponentRegistration>();

  register(config: ComponentRegistration) {
    this.components.set(config.typeId, config);
  }

  get(typeId: string): ComponentRegistration | undefined {
    return this.components.get(typeId);
  }

  getAll(): ComponentRegistration[] {
    return Array.from(this.components.values());
  }

  getByCategory(category: string): ComponentRegistration[] {
    return this.getAll().filter((c) => c.category === category);
  }
}

export const ComponentRegistry = new Registry();

ComponentRegistry.register({
  typeId: "edu_arm_3dof",
  name: "EduArm-3DOF",
  type: "actuator",
  category: "Robotics",
  description: "Lengan robot RRR untuk eksperimen FK PoE, IK DLS, dan kontrol joint.",
  defaultState: { joint0: 0, joint1: 0, joint2: 0, gripperOpen: 0.7 },
  pins: [],
});

ComponentRegistry.register({
  typeId: "aero_arm_6dof",
  name: "AeroArm-6DOF",
  type: "actuator",
  category: "Robotics",
  description: "Lengan articulated enam sumbu dengan spherical wrist untuk pick-and-place.",
  defaultState: { joint0: 0, joint1: 0, joint2: 0, joint3: 0, joint4: 0, joint5: 0 },
  pins: [],
});

ComponentRegistry.register({
  typeId: "rover_bot_4wd",
  name: "RoverBot-4WD",
  type: "actuator",
  category: "Robotics",
  description: "Robot differential-drive empat roda dengan gimbal kamera 2-DOF.",
  defaultState: {
    x: 0,
    z: 0,
    heading: 0,
    leftSpeed: 0,
    rightSpeed: 0,
    leftWheelPhase: 0,
    rightWheelPhase: 0,
    gimbalPan: 0,
    gimbalTilt: 0,
  },
  pins: [],
});

ComponentRegistry.register({
  typeId: "rgbd_camera",
  name: "Kamera Virtual RGB-D",
  type: "sensor",
  category: "Sensors",
  description: "Kamera scene 3D bergaya RealSense D435 dengan keluaran RGB dan depth Float32 dalam meter.",
  defaultState: { width: 640, height: 480, fov: 58, near: 0.28, far: 10 },
  pins: [],
});

ComponentRegistry.register({
  typeId: "planar_lidar",
  name: "LiDAR Planar 2D",
  type: "sensor",
  category: "Sensors",
  description: "Pemindai jarak 360° pada scene 3D dengan 360 atau 720 sampel.",
  defaultState: { sampleCount: 360, maxRangeMeters: 12 },
  pins: [],
});

ComponentRegistry.register({
  typeId: "imu_6axis",
  name: "IMU Virtual 6-Axis",
  type: "sensor",
  category: "Sensors",
  description: "MPU-6050 6-axis sintetis dengan akselerometer dan giroskop melalui I2C 0x68.",
  defaultState: { sourceComponentId: "", sampleRateHz: 100, accelNoise: 0.02, gyroNoise: 0.001 },
  pins: mpu6050Pins,
});

ComponentRegistry.register({
  typeId: "pca9685_i2c",
  name: "PCA9685 16-Channel PWM (I2C)",
  type: "actuator",
  category: "Actuators",
  description: "Driver PWM 12-bit 16 kanal melalui I2C 0x40, dengan keluaran PWM0–PWM15.",
  defaultState: {
    address: "0x40",
    frequencyHz: 50,
    isPowered: false,
    ...Object.fromEntries(Array.from({ length: 16 }, (_, channel) => [`pwm${channel}`, 0])),
  },
  pins: pca9685Pins,
});

ComponentRegistry.register({
  typeId: "incremental_encoder",
  name: "Incremental Encoder A/B",
  type: "sensor",
  category: "Sensors",
  description: "Modul encoder mekanis kuadratur gaya KY-040: keluaran CLK/DT (A/B), tombol tekan SW aktif-rendah, dan hitungan x4.",
  defaultState: { angle: 0, pulsesPerRevolution: 20, coupledMotorId: "", count: 0, channelA: 0, channelB: 0, isPowered: false, isPressed: false },
  pins: quadratureEncoderPins,
});

ComponentRegistry.register({
  typeId: "a4988_stepper_driver",
  name: "Stepper Driver A4988",
  type: "actuator",
  category: "Actuators",
  description: "Driver STEP/DIR A4988 dengan microstep 1/1–1/16 dan pembatas arus Vref.",
  defaultState: {
    vref: 1.0,
    senseResistance: 0.1,
    microstepResolution: 1,
    stepHigh: false,
    riseMicros: 0,
    positionPulses: 0,
    angleDegrees: 0,
    currentLimitA: 1.25,
    isLogicPowered: false,
    isMotorPowered: false,
    isEnabled: false,
    temperatureC: 25,
    isThermalShutdown: false,
    isOvercurrentFault: false,
    isUvlo: true,
    sleepHigh: true,
    phaseACurrentA: 0,
    phaseBCurrentA: 0,
    powerLossW: 0,
    motorId: "",
  },
  pins: a4988Pins,
});

ComponentRegistry.register({
  typeId: "dc_supply",
  name: "Catu Daya DC Adjustable",
  type: "board",
  category: "Boards",
  description: "Referensi visual Siglent SPD3303X-E dengan tiga kanal; solver menyediakan satu keluaran virtual 0–24 V melalui terminal CH1 V+/GND.",
  defaultState: { voltage: 12, isOn: true },
  pins: dcSupplyPins,
});

ComponentRegistry.register({
  typeId: "battery_pack",
  name: "Paket Baterai",
  type: "board",
  category: "Boards",
  description: "Baterai dengan kurva OCV, resistansi internal, kapasitas dan state of charge.",
  defaultState: {
    profile: "liion_18650",
    isOn: true,
    socPercent: 100,
    socRevision: 0,
    internalResistanceOhms: 0.085,
    capacityAh: 2.5,
    maxDischargeCurrentA: 5,
    openCircuitVoltageV: 4.2,
    terminalVoltageV: 4.2,
    currentA: 0,
    powerW: 0,
  },
  pins: batteryPackPins,
});

ComponentRegistry.register({
  typeId: "dc_dc_converter",
  name: "Modul Regulator LM2596 Buck",
  type: "board",
  category: "Boards",
  description: "Carrier visual LM2596 buck 43 × 21 mm; solver memakai regulator ideal edukasional 2.5–24 V ke rail 3.3/5/9/12 V, bukan switching LM2596.",
  defaultState: {
    isOn: true,
    outputVoltage: 5,
    maxOutputCurrentA: 2,
    efficiency: 0.9,
    outputResistanceOhms: 0.05,
    inputCurrentA: 0,
    outputCurrentA: 0,
    outputVoltageV: 0,
    inputVoltageV: 0,
    powerLossW: 0,
    isRegulating: false,
    isCurrentLimited: false,
  },
  pins: dcDcConverterPins,
});

ComponentRegistry.register({
  typeId: "battery_charger",
  name: "Pengisi Baterai CC/CV",
  type: "board",
  category: "Boards",
  description: "Visual carrier TP4056 Micro-USB untuk sel 1S; solver charger edukasional mendukung state Li-ion 1S dan LiPo 2S, bukan ekuivalen IC TP4056.",
  defaultState: { isOn: true, maxChargeCurrentA: 0.5, efficiency: 0.9, inputCurrentA: 0, chargeCurrentA: 0, isCharging: false, isConstantVoltage: false, isChargeComplete: false, chargeElapsedSeconds: 0, safetyTimerLimitSeconds: 10 * 60 * 60, isSafetyTimerExpired: false, tailCurrentLimitA: 0.125, inputVoltageV: 0, targetVoltageV: 4.2, powerLossW: 0, temperatureC: 25, isThermalShutdown: false, isReverseConnected: false },
  pins: batteryChargerPins,
});

ComponentRegistry.register({
  typeId: "l298n_dual_hbridge",
  name: "Driver Motor L298N",
  type: "actuator",
  category: "Actuators",
  description: "Dual H-bridge dengan kendali arah/PWM dan drop tegangan bipolar.",
  defaultState: { isLogicPowered: false, isMotorPowered: false, isThermalShutdown: false, temperatureC: 25, motorIdA: "", motorIdB: "", outputVoltageA: 0, outputVoltageB: 0, currentA: 0, currentB: 0, freewheelCurrentA: 0, freewheelLossW: 0, powerLossW: 0 },
  pins: l298nPins,
});

ComponentRegistry.register({
  typeId: "dc_motor",
  name: "Motor DC Gearbox TT",
  type: "actuator",
  category: "Actuators",
  description: "Motor TT brushed 1:48 3–6V dengan casing 70 × 22 × 18 mm dan dua kabel 200 mm; back-EMF dan inersia dimodelkan.",
  defaultState: {
    resistanceOhms: 6,
    inductanceH: 0.002,
    torqueConstantNmPerA: 0.006,
    backEmfConstantVsPerRad: 0.006,
    rotorInertiaKgM2: 0.00001,
    viscousFrictionNmPerRadS: 0.000001,
    gearRatio: 48,
    gearEfficiency: 0.72,
    loadTorqueNm: 0,
    armatureCurrentA: 0,
    backEmfV: 0,
    omegaRadS: 0,
    angleRad: 0,
    isPowered: false,
    motorDriverId: "",
    coupledRobotId: "",
    coupledJointIndex: 0,
    jointOffsetDeg: 0,
    jointDirection: 1,
  },
  pins: dcMotorPins,
});

// ═══════════════════════════════════════════════════
// BOARDS
// ═══════════════════════════════════════════════════

// Pin pitch = 0.508 units (2.54mm at 1 unit ≈ 5mm scale)
// PCB dimensions: W = 13.72, D = 10.68

ComponentRegistry.register({
  typeId: "arduino_uno",
  name: "Arduino Uno R3",
  type: "board",
  description: "Uno R3 DIP · header 2.54 mm · GPIO, PWM, ADC & Serial virtual.",
  category: "Boards",
  defaultState: {},
  pins: unoPins,
});

ComponentRegistry.register({
 typeId: "esp32_wroom", name: "ESP32-WROOM DevKitC", type: "board", category: "Boards",
 description: "DevKitC V4 · 38 pin · GPIO 3.3 V, ADC 12-bit, PWM & Serial virtual.", defaultState: {}, pins: esp32Pins,
});

ComponentRegistry.register({
  typeId: "plc_omron_cp1e",
  name: "PLC Omron CP1E-N20",
  type: "board",
  category: "Boards",
  description: "PLC kompak 24 VDC · 12 input digital · 8 output relay · indikator I/O realtime.",
  defaultState: { isPowered: false, inputMask: 0, outputMask: 0, scanCount: 0, vDiff: 0 },
  pins: omronCp1ePins,
});

ComponentRegistry.register({
  typeId: "breadboard",
  name: "Breadboard BB400",
  type: "board",
  description: "BusBoard BB400 · 400 titik · empat rail kontinu.",
  category: "Boards",
  defaultState: {},
  pins: (() => {
    const pins: PinDefinition[] = [];
    const cols = 30;
    const pitch = 0.508; // 2.54mm scaled
    const startX = (-cols * pitch) / 2 + pitch / 2;
    const D = 10.8;
    const H = 1.7;

    for (let col = 0; col < cols; col++) {
      const x = startX + col * pitch;
      // Top half (rows a-e, columns 1-30)
      for (let row = 0; row < 5; row++) {
        pins.push({
          id: `t${col}_${row}`,
          name: `${String.fromCharCode(69 - row)}${col + 1}`,
          type: "digital",
          position: [x, H + 0.01, -0.762 - row * pitch],
        });
      }
      // Bottom half (rows f-j, columns 1-30)
      for (let row = 0; row < 5; row++) {
        pins.push({
          id: `b${col}_${row}`,
          name: `${String.fromCharCode(70 + row)}${col + 1}`,
          type: "digital",
          position: [x, H + 0.01, 0.762 + row * pitch],
        });
      }
    }
    // Power rail holes (top and bottom)
    for (let col = 0; col < 25; col++) {
      const x = -14 * pitch + (col + Math.floor(col / 5)) * pitch;
      pins.push({
        id: `pt1_${col}`,
        name: `Power Top + ${col}`,
        type: "power",
        position: [x, H + 0.01, -D / 2 + 0.6],
      });
      pins.push({
        id: `pt2_${col}`,
        name: `Power Top - ${col}`,
        type: "ground",
        position: [x, H + 0.01, -D / 2 + 1.1],
      });
      pins.push({
        id: `pb1_${col}`,
        name: `Power Bottom + ${col}`,
        type: "power",
        position: [x, H + 0.01, D / 2 - 0.6],
      });
      pins.push({
        id: `pb2_${col}`,
        name: `Power Bottom - ${col}`,
        type: "ground",
        position: [x, H + 0.01, D / 2 - 1.1],
      });
    }
    return pins;
  })(),
});

// ═══════════════════════════════════════════════════
// BASIC COMPONENTS
// ═══════════════════════════════════════════════════

ComponentRegistry.register({
  typeId: "led_red",
  name: "LED 5mm Difus (Warna Visual)",
  type: "actuator",
  description: "Envelope fisik mengacu pada Kingbright WP7113ID merah difus; pilihan warna adalah opsi visual simulator, bukan LED RGB fisik.",
  category: "Basic",
  defaultState: { isOn: false, brightness: 0, color: "#ef4444" },
  pins: [
    {
      id: "A",
      name: "Anode (+)",
      type: "digital",
      position: [-0.254, -0.6, 0],
    },
    {
      id: "C",
      name: "Cathode (-)",
      type: "ground",
      position: [0.254, -0.6, 0],
    },
  ],
});

ComponentRegistry.register({
  typeId: "oled_ssd1306",
  name: "OLED Display 0.96\" (SSD1306)",
  type: "actuator",
  description: "Display OLED I2C 128×64 monokrom · 4 pin: GND, VCC, SCL, SDA.",
  category: "Displays",
  defaultState: {
    isOn: true,
    isPowered: false,
    text: "NEXFLUX LAB 3D\nOLED SSD1306 0.96\"\nI2C: 0x3C Ready\nHello World!",
    image: "logo",
    contrast: 255,
    inverted: false,
  },
  pins: oledPins,
});

ComponentRegistry.register({
  typeId: "lcd1602_i2c",
  name: "LCD 16x2 Display (I2C)",
  type: "actuator",
  description: "Display karakter LCD 16×2 dengan PCF8574 I2C backpack · 4 pin: GND, VCC, SDA, SCL.",
  category: "Displays",
  defaultState: {
    isPowered: false,
    backlight: true,
    contrast: 85,
    theme: "yellow_green",
    address: "0x27",
    cursorCol: 0,
    cursorRow: 0,
    line0: "Nexflux Lab 3D  ",
    line1: "LCD 16x2 I2C OK ",
  },
  pins: lcd1602Pins,
});

ComponentRegistry.register({
  typeId: "servo_sg90",
  name: "Micro Servo SG90 (9g)",
  type: "actuator",
  description: "Motor servo mikro 9g · rotasi 0°-180° · 3 pin: GND, VCC, PWM.",
  category: "Actuators",
  defaultState: {
    angle: 90,
    targetAngle: 90,
    isPowered: false,
    isCommanded: false,
    currentDrawA: 0,
    lastCommandMicros: 0,
    servoSketchInstance: "",
    hornType: "single",
    coupledRobotId: "",
    coupledJointIndex: 0,
    jointOffsetDeg: 0,
    jointDirection: 1,
  },
  pins: servoPins,
});

ComponentRegistry.register({
  typeId: "stepper_nema17",
  name: "Motor Stepper NEMA 17 Bipolar",
  type: "actuator",
  description: "Stepper bipolar 42 mm · 1,8°/step · 200 langkah/putaran · empat kabel A+/A-/B+/B-.",
  category: "Actuators",
  defaultState: {
    angle: 0,
    steps: 0,
    rpm: 0,
    direction: "idle",
    isPowered: false,
    phaseIndex: -1,
    currentMa: 0,
    coupledRobotId: "",
    coupledJointIndex: 0,
    jointOffsetDeg: 0,
    jointDirection: 1,
  },
  pins: nema17Pins,
});

ComponentRegistry.register({
  typeId: "dht11",
  name: "Sensor DHT11 (Suhu & Kelembaban)",
  type: "sensor",
  description: "Sensor digital suhu (0-50°C) & kelembaban (20-90% RH) · 3 pin: VCC, DATA, GND.",
  category: "Sensors",
  defaultState: {
    temperature: 24,
    humidity: 50,
    isPowered: false,
  },
  pins: dht11Pins,
});

ComponentRegistry.register({
  typeId: "hcsr04",
  name: "Sensor Ultrasonik HC-SR04",
  type: "sensor",
  description: "Sensor jarak ultrasonik 2-400 cm akurasi 3 mm · 4 pin: VCC, TRIG, ECHO, GND.",
  category: "Sensors",
  defaultState: {
    distance: 25,
    isPowered: false,
    isTriggered: false,
  },
  pins: hcsr04Pins,
});

ComponentRegistry.register({
  typeId: "push_button",
  name: "Push Button",
  type: "sensor",
  description: "A 6×6mm tactile push button switch.",
  category: "Basic",
  defaultState: { isPressed: false },
  pins: [
    {
      id: "1a",
      name: "Terminal 1a",
      type: "digital",
      position: [-0.508, -0.6, -0.762],
    },
    {
      id: "1b",
      name: "Terminal 1b",
      type: "digital",
      position: [0.508, -0.6, -0.762],
    },
    {
      id: "2a",
      name: "Terminal 2a",
      type: "digital",
      position: [-0.508, -0.6, 0.762],
    },
    {
      id: "2b",
      name: "Terminal 2b",
      type: "digital",
      position: [0.508, -0.6, 0.762],
    },
  ],
});

ComponentRegistry.register({
  typeId: "potentiometer",
  name: "Alps RK09L 10kΩ Potentiometer",
  type: "sensor",
  description: "A 10kΩ rotary potentiometer for analog input.",
  category: "Basic",
  defaultState: { value: 0 },
  pins: [
    {
      id: "1",
      name: "Terminal 1",
      type: "power",
      position: [-0.508, -0.6, 0],
    },
    { id: "W", name: "Wiper", type: "analog", position: [0, -0.6, 0] },
    {
      id: "2",
      name: "Terminal 2",
      type: "ground",
      position: [0.508, -0.6, 0],
    },
  ],
});

ComponentRegistry.register({
  typeId: "resistor_220",
  name: "Resistor 220Ω",
  type: "passive",
  description: "A 220Ω carbon film resistor. Common current limiter for LEDs.",
  category: "Basic",
  defaultState: { resistance: 220 },
  pins: [
    { id: "L", name: "Lead 1", type: "digital", position: [-1.016, -0.6, 0] },
    { id: "R", name: "Lead 2", type: "digital", position: [1.016, -0.6, 0] },
  ],
});

ComponentRegistry.register({
  typeId: "capacitor_universal",
  name: "Kapasitor Universal (Elco & Keramik)",
  type: "passive",
  description: "Kapasitor adaptif elektrolit (elco) & keramik. Bentuk visual dan ukuran menyesuaikan nilai kapasitansi dan tegangan kerja.",
  category: "Basic",
  defaultState: {
    subType: "electrolytic",
    capacitance: 470e-6,
    displayValue: 470,
    unit: "µF",
    ratedVoltage: 25,
    esr: 0.1,
    color: "#1e3a8a",
    voltage: 0,
    charge: 0,
    energy: 0,
    currentMa: 0,
    status: "normal",
  },
  pins: [
    { id: "A", name: "Anode (+)", type: "digital", position: [-0.254, -0.6, 0] },
    { id: "C", name: "Cathode (-)", type: "ground", position: [0.254, -0.6, 0] },
  ],
});

// ═══════════════════════════════════════════════════
// WIRING
// ═══════════════════════════════════════════════════

ComponentRegistry.register({
  typeId: "jumper_red",
  name: "Jumper Wire (Red)",
  type: "passive",
  description: "A red male-to-male jumper wire for power connections.",
  category: "Wiring",
  defaultState: { color: "red", length: 4, depth: 8, bendHeight: 0.3 },
  pins: [
    { id: "L", name: "Left Tip", type: "digital", position: [-2, 0.23, 0] },
    { id: "R", name: "Right Tip", type: "digital", position: [2, 0.23, 0] },
  ],
});

ComponentRegistry.register({
  typeId: "jumper_black",
  name: "Jumper Wire (Black)",
  type: "passive",
  description: "A black male-to-male jumper wire for ground connections.",
  category: "Wiring",
  defaultState: { color: "black", length: 4, depth: 8, bendHeight: 0.3 },
  pins: [
    { id: "L", name: "Left Tip", type: "digital", position: [-2, 0.23, 0] },
    { id: "R", name: "Right Tip", type: "digital", position: [2, 0.23, 0] },
  ],
});

ComponentRegistry.register({
  typeId: "jumper_blue",
  name: "Jumper Wire (Blue)",
  type: "passive",
  description: "A blue male-to-male jumper wire for signal connections.",
  category: "Wiring",
  defaultState: { color: "blue", length: 4, depth: 8, bendHeight: 0.3 },
  pins: [
    { id: "L", name: "Left Tip", type: "digital", position: [-2, 0.23, 0] },
    { id: "R", name: "Right Tip", type: "digital", position: [2, 0.23, 0] },
  ],
});

ComponentRegistry.register({
  typeId: "jumper_green",
  name: "Jumper Wire (Green)",
  type: "passive",
  description: "A green male-to-male jumper wire for signal connections.",
  category: "Wiring",
  defaultState: { color: "green", length: 4, depth: 8, bendHeight: 0.3 },
  pins: [
    { id: "L", name: "Left Tip", type: "digital", position: [-2, 0.23, 0] },
    { id: "R", name: "Right Tip", type: "digital", position: [2, 0.23, 0] },
  ],
});

ComponentRegistry.register({
  typeId: "jumper_yellow",
  name: "Jumper Wire (Yellow)",
  type: "passive",
  description: "A yellow male-to-male jumper wire for signal connections.",
  category: "Wiring",
  defaultState: { color: "yellow", length: 4, depth: 8, bendHeight: 0.3 },
  pins: [
    { id: "L", name: "Left Tip", type: "digital", position: [-2, 0.23, 0] },
    { id: "R", name: "Right Tip", type: "digital", position: [2, 0.23, 0] },
  ],
});
