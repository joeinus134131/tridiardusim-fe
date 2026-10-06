import type { PinDefinition } from "./componentTypes";
export const MM = 0.2;
export const PITCH = 2.54 * MM;
const pin = (
  id: string,
  x: number,
  z: number,
  type: PinDefinition["type"] = "digital",
  y = 2.02,
  direction?: [number, number, number],
): PinDefinition => ({
  id,
  name: id,
  type,
  position: [x, y, z],
  ...(direction ? { direction } : {}),
});
// Header positions follow the UNO R3 A000066 mechanical/pinout reference.
// Physically, with USB on left: Digital pins (D0-D13) are along the top (-Z),
// and Power/Analog pins (NC..VIN, A0-A5) are along the bottom (+Z).
export const unoPins: PinDefinition[] = [
  ...Array.from({ length: 14 }, (_, i) =>
    pin(
      `D${i}`,
      5.84 - i * PITCH - (i >= 8 ? 0.3048 : 0),
      -4.826,
      [3, 5, 6, 9, 10, 11].includes(i) ? "pwm" : "digital",
    ),
  ),
  pin("GND3", 5.84 - 14 * PITCH - 0.3048, -4.826, "ground"),
  pin("AREF", 5.84 - 15 * PITCH - 0.3048, -4.826, "analog"),
  pin("SDA", 5.84 - 16 * PITCH - 0.3048, -4.826, "analog"),
  pin("SCL", 5.84 - 17 * PITCH - 0.3048, -4.826, "analog"),
  ...["NC", "IOREF", "RESET", "3V3", "5V", "GND1", "GND2", "VIN"].map((id, i) =>
    pin(
      id,
      -1.272 + i * PITCH,
      4.826,
      id.startsWith("GND")
        ? "ground"
        : ["NC", "RESET"].includes(id)
          ? "digital"
          : "power",
    ),
  ),
  ...Array.from({ length: 6 }, (_, i) =>
    pin(`A${i}`, 3.3 + i * PITCH, 4.826, "analog"),
  ),
  ...[
    "ICSP_MISO",
    "ICSP_5V",
    "ICSP_SCK",
    "ICSP_MOSI",
    "ICSP_RESET",
    "ICSP_GND",
  ].map((id, i) =>
    pin(
      id,
      5.9 + (i % 2) * PITCH,
      (Math.floor(i / 2) - 1) * PITCH,
      id === "ICSP_GND" ? "ground" : id === "ICSP_5V" ? "power" : "digital",
      1.9,
    ),
  ),
  ...["MISO", "5V", "SCK", "MOSI", "RESET", "GND"].map((name, i) =>
    pin(
      "USB_ICSP_" + name,
      -4.504 + (i % 2) * PITCH,
      -3.75 + (Math.floor(i / 2) - 1) * PITCH,
      "digital",
      1.9,
    ),
  ),
];
export interface ComponentDatasheet {
  variant: string;
  manufacturer: string;
  dimensions: string;
  operatingVoltage: string;
  currentRating: string;
  specs: string[];
  pinoutSummary: string;
  limits: string;
  source: string;
}

export const oledPins: PinDefinition[] = [
  pin("GND", -1.5 * PITCH, -2.3, "ground", 0.4),
  pin("VCC", -0.5 * PITCH, -2.3, "power", 0.4),
  pin("SCL", 0.5 * PITCH, -2.3, "digital", 0.4),
  pin("SDA", 1.5 * PITCH, -2.3, "digital", 0.4),
];

export const mpu6050Pins: PinDefinition[] = [
  ...["VCC", "GND", "SCL", "SDA", "XDA", "XCL", "AD0", "INT"].map((id, i) =>
    pin(id, -1.778 + i * PITCH, -1.4, id === "VCC" ? "power" : id === "GND" ? "ground" : "digital", 0.4),
  ),
];

export const pca9685Pins: PinDefinition[] = [
  // Adafruit rev C board origin is the center of its 62.23 x 25.4 mm outline.
  ...(["V+", "VCC", "SDA", "SCL", "OE", "GND"] as const).map((id, i) =>
    pin(id, -5.842, -1.245 + i * PITCH, id === "GND" ? "ground" : id === "V+" || id === "VCC" ? "power" : "digital", -0.4, [0, -1, 0]),
  ),
  // External servo supply terminal pads from the Adafruit rev C layout.
  pin("SERVO_V+", -0.36, 1.778, "power", 0.82, [0, 1, 0]),
  pin("SERVO_GND", 0.34, 1.778, "ground", 0.82, [0, 1, 0]),
  ...Array.from({ length: 16 }, (_, channel) => {
    const group = Math.floor(channel / 4);
    const index = channel % 4;
    const groupCenterMm = [8.89, 21.59, 36.83, 49.53][group];
    const xMm = groupCenterMm + [3.81, 1.27, -1.27, -3.81][index];
    const x = (xMm - 29.21) * MM;
    return [
      pin(`PWM${channel}`, x, -1.245, "pwm", -0.4, [0, -1, 0]),
      pin(`V+_PWM${channel}`, x, -1.753, "power", -0.4, [0, -1, 0]),
      pin(`GND_PWM${channel}`, x, -2.261, "ground", -0.4, [0, -1, 0]),
    ];
  }),
].flat();

export const servoPins: PinDefinition[] = [
  pin("GND", -1 * PITCH, 2.0, "ground", 0.4),
  pin("VCC", 0, 2.0, "power", 0.4),
  pin("PWM", 1 * PITCH, 2.0, "pwm", 0.4),
];

export const quadratureEncoderPins: PinDefinition[] = [
  // Five KY-040 breakout contacts in one 2.54 mm pitch row.
  ...([
    ["GND", "ground"],
    ["VCC", "power"],
    ["SW", "digital"],
    ["B", "digital"],
    ["A", "digital"],
  ] as const).map(([id, type], i) => ({
    ...pin(id, (i - 2) * PITCH, 1.2, type, -0.6, [0, -1, 0]),
    name: ({ GND: "GND", VCC: "VCC", SW: "SW", B: "DT / B", A: "CLK / A" } as const)[id],
  })),
];

const driverPin = (id: string, x: number, z: number, type: PinDefinition["type"] = "digital"): PinDefinition =>
  pin(id, x, z, type, -0.51, [0, -1, 0]);
export const a4988Pins: PinDefinition[] = [
  ...["VMOT", "GND_MOTOR", "2B", "2A", "1A", "1B", "VDD", "GND_LOGIC"].map((id, i) =>
    driverPin(id, -1.0, -1.778 + i * PITCH, id.includes("GND") ? "ground" : id.includes("V") ? "power" : "digital"),
  ),
  ...["ENABLE", "MS1", "MS2", "MS3", "RESET", "SLEEP", "STEP", "DIR"].map((id, i) =>
    driverPin(id, 1.0, 1.778 - i * PITCH, "digital"),
  ),
];

export const dcSupplyPins: PinDefinition[] = [
  { id: "V+", name: "V+", type: "power", position: [-1.2, 3.8, 28.93], direction: [0, 0, 1] },
  { id: "GND", name: "GND", type: "ground", position: [1.2, 3.8, 28.93], direction: [0, 0, 1] },
];

export const batteryPackPins: PinDefinition[] = [
  { id: "V+", name: "+", type: "power", position: [-1.2, 0.2, 17], direction: [0, 0, 1] },
  { id: "GND", name: "−", type: "ground", position: [1.2, 0.2, 17], direction: [0, 0, 1] },
];

export const dcDcConverterPins: PinDefinition[] = [
  { id: "VIN", name: "VIN", type: "power", position: [-1.2, 0.42, 1.95], direction: [0, 0, 1] },
  { id: "GND_IN", name: "GND IN", type: "ground", position: [-0.4, 0.42, 1.95], direction: [0, 0, 1] },
  { id: "GND_OUT", name: "GND OUT", type: "ground", position: [0.4, 0.42, 1.95], direction: [0, 0, 1] },
  { id: "VOUT", name: "VOUT", type: "power", position: [1.2, 0.42, 1.95], direction: [0, 0, 1] },
];

export const batteryChargerPins: PinDefinition[] = [
  { id: "VIN", name: "VIN", type: "power", position: [-1.2, 0.41, 1.75], direction: [0, 0, 1] },
  { id: "GND_IN", name: "GND IN", type: "ground", position: [-0.4, 0.41, 1.75], direction: [0, 0, 1] },
  { id: "BAT+", name: "BAT+", type: "power", position: [0.4, 0.41, 1.75], direction: [0, 0, 1] },
  { id: "BAT-", name: "BAT−", type: "ground", position: [1.2, 0.41, 1.75], direction: [0, 0, 1] },
];

const powerModulePin = (id: string, x: number, z: number, type: PinDefinition["type"] = "digital", screwTerminal = false): PinDefinition =>
  pin(id, x, z, type, screwTerminal ? 0.82 : -0.4, screwTerminal ? [0, 1, 0] : [0, -1, 0]);

export const l298nPins: PinDefinition[] = [
  ...["ENA", "IN1", "IN2", "IN3", "IN4", "ENB"].map((id, i) =>
    powerModulePin(id, -1.27 + i * 0.508, -1.778, ["ENA", "ENB"].includes(id) ? "pwm" : "digital"),
  ),
  powerModulePin("OUT1", -3.15, -1.208, "power", true),
  powerModulePin("OUT2", -3.15, -0.192, "power", true),
  powerModulePin("OUT3", 3.15, -1.208, "power", true),
  powerModulePin("OUT4", 3.15, -0.192, "power", true),
  powerModulePin("VS", -0.508, 3.0, "power", true),
  powerModulePin("VSS", 0.0, 3.0, "power", true),
  powerModulePin("GND", 0.508, 3.0, "ground", true),
];

export const dcMotorPins: PinDefinition[] = [
  { id: "M+", name: "M+", type: "digital", position: [-0.55, 1.8, 50.4], direction: [0, 0, 1] },
  { id: "M-", name: "M-", type: "digital", position: [0.55, 1.8, 50.4], direction: [0, 0, 1] },
];

const LCD_I2C_X = 4.3;
export const lcd1602Pins: PinDefinition[] = [
  pin("GND", LCD_I2C_X - 1.5 * PITCH, -3.2, "ground", 0.4),
  pin("VCC", LCD_I2C_X - 0.5 * PITCH, -3.2, "power", 0.4),
  pin("SDA", LCD_I2C_X + 0.5 * PITCH, -3.2, "digital", 0.4),
  pin("SCL", LCD_I2C_X + 1.5 * PITCH, -3.2, "digital", 0.4),
];

export const dht11Pins: PinDefinition[] = [
  pin("VCC", -1 * PITCH, 1.1, "power", -0.6, [0, -1, 0]),
  pin("DATA", 0, 1.1, "digital", -0.6, [0, -1, 0]),
  pin("GND", 1 * PITCH, 1.1, "ground", -0.6, [0, -1, 0]),
];

export const hcsr04Pins: PinDefinition[] = [
  pin("VCC", -1.5 * PITCH, 0, "power", -0.6, [0, -1, 0]),
  pin("TRIG", -0.5 * PITCH, 0, "digital", -0.6, [0, -1, 0]),
  pin("ECHO", 0.5 * PITCH, 0, "digital", -0.6, [0, -1, 0]),
  pin("GND", 1.5 * PITCH, 0, "ground", -0.6, [0, -1, 0]),
];

// Omron CP1E-N20: 12 DC inputs and 8 relay outputs. Terminals are placed on
// the upper face so field wiring exits naturally above the screw blocks.
const plcTerminal = (
  id: string,
  x: number,
  y: number,
  type: PinDefinition["type"] = "digital",
): PinDefinition => ({ id, name: id, type, position: [x * 2, y * 1.85, 3.98 * 2.5], direction: [0, 0, 1] });

export const omronCp1ePins: PinDefinition[] = [
  plcTerminal("24V", -3.75, 7.8, "power"),
  plcTerminal("0V", -3.2, 7.8, "ground"),
  plcTerminal("COMI", -2.65, 7.8, "ground"),
  ...Array.from({ length: 12 }, (_, i) =>
    plcTerminal(`X${i}`, -2.1 + i * 0.52, 7.8),
  ),
  plcTerminal("COMQ", -3.5, 1.28, "digital"),
  ...Array.from({ length: 8 }, (_, i) =>
    plcTerminal(`Y${i}`, -2.8 + i * 0.78, 1.28),
  ),
];

export const nema17Pins: PinDefinition[] = [
  pin("A+", -0.75, 64.2, "digital", 3.8, [0, 0, 1]),
  pin("A-", -0.25, 64.2, "digital", 3.8, [0, 0, 1]),
  pin("B+", 0.25, 64.2, "digital", 3.8, [0, 0, 1]),
  pin("B-", 0.75, 64.2, "digital", 3.8, [0, 0, 1]),
];

export const physicalInfo: Record<string, ComponentDatasheet> = {
  dc_dc_converter: {
    variant: "LM2596 adjustable buck carrier (visual reference; module clones vary)",
    manufacturer: "LM2596 by Texas Instruments; carrier module vendor varies",
    dimensions: "Typical carrier PCB 43 × 21 mm; four input/output solder pads",
    operatingVoltage: "LM2596 regulator: 4.5–40 V input; adjustable output starts at 1.2 V",
    currentRating: "Regulator IC rated up to 3 A subject to thermal limits",
    specs: [
      "Non-isolated step-down (buck) conversion",
      "Typical carrier includes a drum inductor, trimmer, filter capacitors, and four edge pads",
      "The 3 A rating depends on cooling and conversion conditions",
    ],
    pinoutSummary: "VIN, GND IN, GND OUT, VOUT, along the module edge.",
    limits: "Carrier outline varies by vendor. Simulator uses a quasi-static CV/CC model: VIN 4.5–40 V, output target at least 1.5 V below VIN, no switching ripple or startup transient.",
    source: "https://akizukidenshi.com/goodsaffix/MBC2596-01.pdf",
  },
  battery_charger: {
    variant: "TP4056 Micro-USB single-cell charger carrier",
    manufacturer: "TP4056 by Nanjing Top Power ASIC; carrier vendor varies",
    dimensions: "Typical carrier PCB about 26.5 × 17.5 mm, plus Micro-USB shell; clone outlines vary",
    operatingVoltage: "5 V USB input; fixed 4.2 V single-cell charge termination",
    currentRating: "Up to 1 A IC capability; module charge current is set by its PROG resistor and thermal conditions",
    specs: [
      "Linear constant-current/constant-voltage charger for one Li-ion cell",
      "Micro-USB input with CHRG and STDBY status indicators",
      "Four edge contacts for input and battery connections",
    ],
    pinoutSummary: "VIN, GND IN, BAT+, BAT− on four edge pads.",
    limits: "The physical TP4056 reference is 1S only. The simulator's educational charger model also accepts 2S state and is not equivalent to this chip.",
    source: "https://cdn.sparkfun.com/datasheets/Prototyping/TP4056.pdf",
  },
  battery_pack: {
    variant: "Single 18650 holder / 2S LiPo / 9V alkaline profile references",
    manufacturer: "Panasonic cell dimensions; Typhon 2S pack; Duracell MN1604",
    dimensions: "18650 cell 18.24 × 65.10 mm; 2S pack 160 × 46 × 15 mm; MN1604 26.5 × 17.5 × 48.5 mm",
    operatingVoltage: "Profile-dependent: 4.2 V single cell, 7.4 V nominal 2S LiPo, or 9 V alkaline",
    currentRating: "Simulator defaults are educational battery profiles and do not represent a universal pack rating",
    specs: ["Single-cell 18650 shown in a holder", "Two-cell LiPo pouch pack with XT60/JST-XH connectors", "9V snap-terminal alkaline battery"],
    pinoutSummary: "Red V+ and black GND pigtails; displayed wire endpoints are the simulator contacts.",
    limits: "Geometry follows representative product references; chemistry, protection, and connectors vary across real packs.",
    source: "https://api.pim.na.industrial.panasonic.com/file_stream/main/fileversion/3446",
  },
  dc_motor: {
    variant: "Adafruit TT DC Gearbox Motor 200 RPM, 1:48, with 200 mm leads",
    manufacturer: "Adafruit Industries / TT motor OEM",
    dimensions: "Nominal body 70 × 22 × 18 mm (including output shaft); 200 mm red/black leads",
    operatingVoltage: "3–6 V DC",
    currentRating: "Varies with load; stall current is high and requires a motor driver",
    specs: ["1:48 plastic spur gearbox", "Approximately 200 RPM at nominal voltage", "Dual output shaft style varies by production batch", "Two 28 AWG power leads"],
    pinoutSummary: "M+ red and M− black; polarity reverses direction.",
    limits: "Representative TT housing, shaft, and lead dimensions; gearbox tooling and shaft details vary by supplier.",
    source: "https://www.adafruit.com/product/3777",
  },
  dc_supply: {
    variant: "Siglent SPD3303X-E programmable bench DC power supply (visual reference)",
    manufacturer: "Siglent Technologies",
    dimensions: "225 × 143 × 278 mm (W × H × D); approximately 8 kg",
    operatingVoltage: "CH1/CH2: 0–32 V; CH3: selectable 2.5/3.3/5 V",
    currentRating: "CH1/CH2: 0–3.2 A; CH3: up to 3.2 A",
    specs: [
      "Three isolated output channels and a 4.3-inch color TFT display",
      "Two adjustable channels plus a fixed/selectable logic-supply channel",
      "Front-panel voltage/current controls and individual output binding posts",
      "Rear cooling fan and mains input",
    ],
    pinoutSummary: "Visual model shows three output pairs; simulator wire contacts currently expose only the CH1 V+/GND pair.",
    limits: "The housing is dimensioned from SPD3303X-E. The solver still models a single adjustable 0–24 V output rather than three isolated channels.",
    source: "https://siglentna.com/wp-content/uploads/dlm_uploads/2017/10/SPD3303X_DataSheet_DS0503X-E02C.pdf",
  },
  incremental_encoder: {
    variant: "KY-040 style mechanical quadrature rotary encoder module",
    manufacturer: "Generic module; dimensions vary by supplier",
    dimensions: "PCB nominal 29 × 17 mm; overall height about 30 mm; 5-pin header pitch 2.54 mm",
    operatingVoltage: "3.3–5 V DC",
    currentRating: "Less than 10 mA typical including onboard pull-ups",
    specs: [
      "Mechanical incremental quadrature outputs CLK and DT (A/B)",
      "Momentary normally-open push switch on SW, active low to GND",
      "Typical encoder resolution around 20 pulses per revolution; variants differ",
      "Continuous rotation with detents; contact bounce requires debounce in physical firmware",
    ],
    pinoutSummary: "GND, VCC, SW, DT (B), CLK (A), in the common KY-040 header order.",
    limits: "The visual model uses a common KY-040 form factor. Vendor clones vary in PCB outline, shaft, detent count, and onboard pull-ups.",
    source: "https://mysii.gorriens.net/arduino/pdf/ky-040_rotary_encoder_module_eng.pdf",
  },
  imu_6axis: {
    variant: "GY-521 breakout using InvenSense MPU-6050",
    manufacturer: "InvenSense (TDK) sensor; breakout-board vendor varies",
    dimensions: "Representative PCB 20.3 × 15.25 mm; 8-pin 2.54 mm header; dimensions vary by clone",
    operatingVoltage: "GY-521 module 3.3–5 V input via onboard regulator; MPU-6050 silicon 2.375–3.46 V",
    currentRating: "MPU-6050 silicon up to 3.9 mA in full operation; breakout consumption depends on regulator and pull-ups",
    specs: ["3-axis accelerometer and 3-axis gyroscope", "16-bit ADC per motion axis", "I2C address 0x68 (AD0 low) or 0x69 (AD0 high)", "Auxiliary I2C pass-through and interrupt output", "Breakout includes a regulator and passive components"],
    pinoutSummary: "VCC, GND, SCL, SDA, XDA, XCL, AD0, INT.",
    limits: "Breakout geometry follows the common GY-521 outline; clone component placement varies. Motion simulation is kinematic and does not emulate chip noise/bandwidth unless configured.",
    source: "https://www.electronotics.com/static/datasheets/gy-521_mpu-6050_3-axis_gyroscope_and_acceleration_sensor_en_3.pdf",
  },
  esp32_wroom: {
    variant: "Espressif ESP32-DevKitC V4 / ESP32-WROOM-32",
    manufacturer: "Espressif Systems",
    dimensions: "PCB 54.4 × 27.9 × 1.6 mm · 2×19 Pin Header, Pitch 2.54 mm",
    operatingVoltage: "5V USB / VIN (Regulator internal ke 3.3V VDD, GPIO 3.3V TTL)",
    currentRating: "Maks 500 mA (USB), GPIO maks 40 mA per pin (rekomendasi 20 mA)",
    specs: [
      "Mikrokontroler Xtensa Dual-Core 32-bit LX6 hingga 240 MHz",
      "520 KB SRAM, 4 MB SPI Flash bawaan",
      "Wi-Fi 802.11 b/g/n (150 Mbps) & Bluetooth v4.2 BR/EDR + BLE",
      "ADC 12-bit SAR hingga 18 kanal, 2× 8-bit DAC, PWM, I2C, SPI, UART",
      "Antena PCB terintegrasi tipe Inverted-F meander trace dengan RF shield metal",
    ],
    pinoutSummary: "38 Pin: 3V3, EN, 5V, 3x GND, 25x GPIO fungsional, 18x ADC pin (GPIO 34-39 input-only).",
    limits:
      "Envelope mekanik DevKitC V4 presisi. Modus saat ini mendukung simulasi GPIO 3.3V, ADC 12-bit, dan PWM. Fitur radio RF Wi-Fi/BLE belum aktif di solver DC.",
    source:
      "https://docs.espressif.com/projects/esp-idf/en/v5.3/esp32/hw-reference/esp32/get-started-devkitc.html",
  },
  arduino_uno: {
    variant: "Arduino Uno R3 DIP (A000066)",
    manufacturer: "Arduino SA",
    dimensions: "PCB 68.6 × 53.4 × 1.6 mm; Pitch Header 2.54 mm",
    operatingVoltage: "5V (Jack DC 7-12V, Regulator 5V & 3.3V internal)",
    currentRating: "Maks 40 mA per I/O pin (rekomendasi 20 mA), 3.3V pin maks 50 mA",
    specs: [
      "Mikrokontroler Microchip ATmega328P DIP-28 pada clock 16 MHz",
      "32 KB Flash Memory (0.5 KB untuk bootloader), 2 KB SRAM, 1 KB EEPROM",
      "14 Digital I/O (6 pin support hardware PWM: 3, 5, 6, 9, 10, 11)",
      "6 Analog Inputs (A0-A5, 10-bit ADC 0-1023 resolusi 4.9 mV)",
      "USB-B Interface via ATmega16U2, ICSP header untuk ISP programming",
    ],
    pinoutSummary: "14 Digital (D0-D13), 6 Analog (A0-A5), Power (VIN, 5V, 3V3, GND1-3, IOREF, RESET).",
    limits:
      "Model 3D Uno R3 DIP akurat dengan posisi header standar A000066. Solver DC mengeksekusi subset sintaks .ino di web worker deterministik.",
    source: "https://docs.arduino.cc/hardware/uno-rev3/",
  },
  oled_ssd1306: {
    variant: "SSD1306 0.96\" I2C 128x64 OLED Display Module",
    manufacturer: "Solomon Systech / Generic",
    dimensions: "PCB 27.0 × 27.0 × 4.1 mm · Pitch Header 2.54 mm (0.1 in)",
    operatingVoltage: "3.3V - 5.0V DC (Regulator LDO on-board)",
    currentRating: "Tipikal 15 mA - 25 mA (tergantung jumlah piksel menyala)",
    specs: [
      "Driver IC: Solomon Systech SSD1306 OLED/PLED Controller",
      "Resolusi Tampilan: 128 × 64 piksel monokrom (Biru / Putih emissive)",
      "Protokol Komunikasi: I2C (Inter-Integrated Circuit) alamat 0x3C (opsi 0x3D)",
      "Sudut Pandang: > 160 derajat sudut pandang lebar tanpa backlight (self-luminous)",
      "Kecepatan Bus: Standard-mode (100 kHz) & Fast-mode (400 kHz)",
    ],
    pinoutSummary: "4 Pin Header: GND (Ground), VCC (Catu 3.3V-5V), SCL (I2C Clock), SDA (I2C Data).",
    limits: "Emulasi frame buffer grafis 128x64 dengan dukungan pustaka Adafruit_SSD1306 dan Adafruit_GFX.",
    source: "https://cdn-shop.adafruit.com/datasheets/SSD1306.pdf",
  },
  breadboard: {
    variant: "BusBoard BB400 Solderless Breadboard",
    manufacturer: "BusBoard Prototype Systems",
    dimensions: "84.0 × 54.3 × 8.5 mm · Pitch 2.54 mm (0.1 in)",
    operatingVoltage: "Maks 36V DC / 0-12V simulasi",
    currentRating: "Maks 2 Ampere per jalur kontak",
    specs: [
      "400 Titik Kontak: 300 titik terminal (baris A-J, kolom 1-30) + 100 titik rail daya",
      "4 Bus Rail Daya kontinu: 2 di atas (+/-) dan 2 di bawah (+/-)",
      "Pegas kontak internal Nickel-Silver phosphor bronze berkualitas tinggi",
      "Parit tengah (center trough) selebar 7.62 mm (0.3 in) untuk IC DIP standar",
      "Dudukan interlocking tabs untuk penyambungan antar breadboard",
    ],
    pinoutSummary: "Terminal Kolom 1-30 (A-E terhubung bersama, F-J terhubung bersama); 4 Jalur Daya terpisah.",
    limits:
      "Kontur dan lubang sesuai geometri BB400 resmi; resistansi kontak pegas diidealkan 0 Ohm pada solver DC.",
    source: "https://www.busboard.com/BB400",
  },
  led_red: {
    variant: "Kingbright WP7113ID red diffused LED (geometry reference)",
    manufacturer: "Kingbright",
    dimensions: "Lens Ø5.0 mm; flange Ø5.9 mm; cathode/anode PCB pitch 2.54 mm. The rendered leads are trimmed for insertion.",
    operatingVoltage: "Red LED Vf 1.9 V typical / 2.3 V maximum at 10 mA",
    currentRating: "30 mA continuous maximum; 160 mA peak under the datasheet pulse condition",
    specs: [
      "T-1 3/4 (5 mm) red diffused package with flat cathode indicator",
      "Package flange Ø5.9 mm and 2.54 mm recommended lead pitch",
      "Luminous intensity 25–50 mcd at 10 mA",
      "Viewing angle 30°",
      "Color selection in the simulator is a visual option, not an RGB physical LED package",
    ],
    pinoutSummary: "2 Terminal: Anoda (+ lead panjang), Katoda (- lead pendek dengan tepi bodi datar).",
    limits: "The circuit model uses a color-dependent forward-drop approximation; the reference package is the red WP7113ID.",
    source: "https://www.kingbrightusa.com/images/catalog/spec/wp7113id.pdf",
  },
  push_button: {
    variant: "Omron B3F-1000 Tactile Key Switch",
    manufacturer: "Omron Electronics",
    dimensions: "Body 6.0 × 6.0 mm; Tinggi 4.3 mm; Plunger Ø3.5 mm",
    operatingVoltage: "Maks 24V DC / 1-12V tipikal",
    currentRating: "1 mA hingga 50 mA beban resistif",
    specs: [
      "Tipe Kontak: Single Pole Single Throw - Normally Open (SPST-NO)",
      "Gaya Operasi (Operating Force): 0.98 N {100 gf} snap-action tactile",
      "Resistansi Kontak Awal: Maks 100 mΩ",
      "Resistansi Isolasi: Min 100 MΩ pada 250V DC",
      "Durabilitas Mekanik: Minimum 1.000.000 siklus penekanan",
    ],
    pinoutSummary: "4 Pin: Pin 1a dan 1b terhubung secara internal; Pin 2a dan 2b terhubung secara internal. Menekan tombol menghubungkan grup 1 ke grup 2.",
    limits:
      "Resistansi kontak 0 Ohm ideal saat ditekan; kontak langsung terputus saat dilepas.",
    source:
      "https://components.omron.com/sites/default/files/datasheet_pdf/A070-E1.pdf",
  },
  potentiometer: {
    variant: "Alps Alpine RK09L1120A5F 10kΩ metal-shaft rotary potentiometer",
    manufacturer: "Alps Alpine",
    dimensions: "Seri ukuran 9 mm; shaft datar 15 mm; bushing M9 × 0.75; tiga terminal PCB",
    operatingVoltage: "Tegangan kerja maks 50V AC / 20V DC",
    currentRating: "Daya pengenal (Power rating) 0.05 W pada 50°C",
    specs: [
      "Resistansi Total: 10 kΩ ±20%",
      "Karakteristik Taper: 1B (Linear Taper)",
      "Sudut Rotasi Total: 280° ±5°",
      "Terminal: 3 pin through-hole; model memakai pitch nominal 2.54 mm",
    ],
    pinoutSummary: "3 Terminal: Pin 1 (Sisi CW), Pin 2 (Wiper Tengah W), Pin 3 (Sisi CCW).",
    limits: "Pembagi tegangan kontinu linear Vw = V1 + (V3 - V1) * pos.",
    source: "https://tech.alpsalpine.com/e/products/category/potentiometers/sub/01/series/rk09l/",
  },
  resistor_220: {
    variant: "Yageo CFR-25 Carbon Film Fixed Resistor 220Ω",
    manufacturer: "Yageo Corporation",
    dimensions: "Badan 6.3 × Ø2.4 mm (Axial Lead); Pitch Bentuk Breadboard 10.16 mm",
    operatingVoltage: "Tegangan kerja maks 250V; Overload maks 500V",
    currentRating: "Rating Daya 0.25 W (1/4 Watt) pada 70°C; Arus maks ~33 mA pada 220Ω",
    specs: [
      "Nilai Resistansi Nominal: 220 Ω (Ohm)",
      "Toleransi Resistansi: ±5% (Kode warna pita: Merah - Merah - Cokelat - Emas)",
      "Koefisien Suhu (T.C.R): -350 ~ +350 ppm/°C",
      "Material Pelapis: Flame retardant epoxy resin (Warna krem / beige)",
      "Kawat Kaki: Tinned copper lead wire Ø0.6 mm",
    ],
    pinoutSummary: "2 Terminal Pasif (Non-polar): Lead 1 (L) dan Lead 2 (R).",
    limits:
      "Hukum Ohm ideal R = 220.0 Ω tanpa efek termal atau toleransi drift numerik.",
    source: "https://www.yageo.com/en/Chart/Download/pdf/CFR",
  },
  jumper: {
    variant: "BusBoard ZW-MM-10 Male-to-Male Jumper Wires",
    manufacturer: "BusBoard Prototype Systems",
    dimensions: "Kawat AWG 24 fleksibel, Pin Kontak Persegi 0.64 mm, Housing 2.54 mm",
    operatingVoltage: "Maks 30V DC",
    currentRating: "Maks 1.5 Ampere konduksi kontinyu",
    specs: [
      "Konektor: Male ke Male dengan pin kontak kuningan berlapis timah/nikel",
      "Isolasi Kawat: PVC fleksibel dengan variasi warna standar kode kelistrikan",
      "Resistansi Konduktor: Kurang dari 0.05 Ω per kabel",
      "Kompatibilitas: Sesuai untuk semua breadboard 2.54 mm dan header Arduino/ESP32",
    ],
    pinoutSummary: "2 Ujung Terminal: Pin Awal (Source) dan Pin Akhir (Target).",
    limits: "Konduktivitas ideal 0 Ω pada analisis jaringan DC solver.",
    source: "https://www.busboard.com/ZW-MM-10",
  },
  servo_sg90: {
    variant: "TowerPro SG90 9g Micro Servo Motor",
    manufacturer: "TowerPro / Standard RC",
    dimensions: "Envelope 23 × 12.2 × 29 mm (lebar × kedalaman × tinggi); lebar tab mounting 32.3 mm; berat 9 g",
    operatingVoltage: "4.8V hingga 6.0V DC (Rekomendasi 5.0V)",
    currentRating: "Arus Diam ~50 mA; Arus Kerja ~150-250 mA; Stall Current ~650 mA",
    specs: [
      "Rentang Sudut Rotasi: 0° hingga 180°",
      "Kecepatan Operasi: 0.1 detik / 60 derajat (pada 4.8V)",
      "Torsi Stall: 1.8 kgf·cm (pada 4.8V)",
      "Sinyal Kontrol: PWM Periode 20 ms (50 Hz), Pulsa 1 ms (0°) hingga 2 ms (180°)",
      "Bodi: Polycarbonate biru transparan dengan roda gigi nilon",
    ],
    pinoutSummary: "3 Pin: GND (Cokelat), VCC 5V (Merah), PWM Sinyal (Oranye).",
    limits:
      "Tegangan minimum 4.0V agar motor servo dapat menahan torsi dan berputar sesuai sudut.",
    source: "http://www.towerpro.com.tw/product/sg90-7/",
  },
  lcd1602_i2c: {
    variant: "HD44780 1602 Character LCD with PCF8574 I2C Backpack",
    manufacturer: "Hitachi / NXP PCF8574",
    dimensions: "Modul 80.0 × 36.0 × 12.0 mm; Area Tampilan 64.5 × 16.0 mm",
    operatingVoltage: "4.5V hingga 5.5V DC (Standar 5.0V)",
    currentRating: "Arus Backlight LED ~20 mA; Arus Logika ~2 mA; Total ~25 mA",
    specs: [
      "Kapasitas Tampilan: 16 Karakter × 2 Baris",
      "Format Karakter: 5 × 8 Dot Matrix dengan Kursor",
      "Komunikasi: I2C Dua Kawat (SDA, SCL), Alamat Default 0x27 (atau 0x3F)",
      "Kontras: Trimpot Potensiometer Putar Biru bawaan pada backpack",
      "Backlight: LED Kuning-Hijau atau Biru dengan kontrol switch/jumper",
    ],
    pinoutSummary: "4 Pin: GND, VCC 5V, SDA (I2C Data), SCL (I2C Clock).",
    limits:
      "Membutuhkan tegangan minimal 4.2V agar karakter dot matrix dan lampu latar backlight menyala optimal.",
    source: "https://www.nxp.com/docs/en/data-sheet/PCF8574_PCF8574A.pdf",
  },
  dht11: {
    variant: "Aosong DHT11 Humidity & Temperature Digital Sensor Module",
    manufacturer: "Aosong Electronics",
    dimensions: "Housing 15.5 × 12.0 × 5.5 mm; PCB breakout 32.0 × 14.0 × 1.0 mm; header pitch 2.54 mm",
    operatingVoltage: "3.3V hingga 5.5V DC (Kompatibel 3.3V ESP32 & 5V Arduino)",
    currentRating: "Arus Pengukuran 0.5 - 2.5 mA; Standby 100 - 150 µA",
    specs: [
      "Pengukuran Suhu: 0°C hingga 50°C (Akurasi ±2°C, Resolusi 1°C)",
      "Pengukuran Kelembaban: 20% hingga 90% RH (Akurasi ±5% RH, Resolusi 1% RH)",
      "Protokol Data: 1-Wire Single-bus bi-directional digital signal",
      "Waktu Sampling: 1 detik (Frekuensi maksimum pembacaan 1 Hz)",
      "Komponen Sensor: NTC Thermistor dan Resistive Humidity Component",
    ],
    pinoutSummary: "3 Pin: VCC (3.3V-5V), DATA (Sinyal Digital I/O dengan internal pull-up), GND (Ground).",
    limits:
      "Memerlukan jeda minimal 1 detik di antara pembacaan agar nilai sensor stabil dan tidak mengalami self-heating.",
    source: "https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf",
  },
  hcsr04: {
    variant: "HC-SR04 Ultrasonic Distance Sensor Ranging Module",
    manufacturer: "ElecFreaks / Cytron",
    dimensions: "Modul 45.0 × 20.0 × 15.0 mm; Diameter Transduser 16.0 mm; Pitch 2.54 mm",
    operatingVoltage: "4.5V hingga 5.5V DC (Standar 5.0V)",
    currentRating: "Arus Kerja ~15 mA; Arus Diam < 2 mA",
    specs: [
      "Rentang Jarak Ukur: 2 cm hingga 400 cm (Akurasi ±3 mm)",
      "Sudut Deteksi Efektif: 15 derajat",
      "Frekuensi Ultrasonik: 40 kHz gelombang akustik",
      "Sinyal Pemicu (TRIG): Pulsa logika HIGH minimal 10 µs",
      "Sinyal Balik (ECHO): Lebar pulsa HIGH sebanding dengan waktu tempuh gelombang bolak-balik",
      "Rumus Jarak: Jarak (cm) = Durasi Pulsa (µs) / 58.2 (atau Durasi × 0.034 / 2)",
    ],
    pinoutSummary: "4 Pin: VCC (5V), TRIG (Trigger Input), ECHO (Echo Output Pulse), GND (Ground).",
    limits:
      "Membutuhkan tegangan minimal 4.5V agar osilator transduser 40 kHz memancarkan daya akustik ultrasonik penuh.",
    source: "https://www.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf",
  },
  plc_omron_cp1e: {
    variant: "Omron SYSMAC CP1E-N20DR",
    manufacturer: "OMRON Industrial Automation",
    dimensions: "86 × 90 × 85 mm (W × H × D), terminal screw M3",
    operatingVoltage: "24 VDC control logic (CP1E DC model family)",
    currentRating: "12 digital inputs · 8 relay outputs · 20 built-in I/O",
    specs: [
      "Stored-program PLC with cyclic scan and immediate I/O refresh",
      "8K program steps and 8K words data memory on N-type CPU",
      "12 digital inputs and 8 relay outputs",
      "Built-in USB and serial communication on N-type CPU family",
      "Input and output LEDs aligned with their field terminals",
    ],
    pinoutSummary: "24V, 0V, COMI, X0-X11 inputs, COMQ, Y0-Y7 relay outputs.",
    limits: "Simulator implements 24 V input sensing, dry-contact relay outputs, live status LEDs, and manual output forcing for debugging.",
    source: "https://assets.omron.com/m/555e9a5e7b4c8f0d/original/CP1E-Hardware-Users-Manual.pdf",
  },
  stepper_nema17: {
    variant: "NEMA 17 Bipolar Stepper, 42 × 38 mm",
    manufacturer: "SOYO / NEMA 17 standard frame",
    dimensions: "42.3 mm square × 38 mm body · 5 mm D-shaft × 24 mm · 300 mm bare leads",
    operatingVoltage: "2.8 V nominal per phase with current-limiting driver",
    currentRating: "1.68 A/phase · 1.65 Ω · 3.2 mH",
    specs: [
      "1.8° full-step angle; 200 steps per revolution",
      "Bipolar two-phase winding with four leads",
      "Holding torque 3.7 kg·cm (51 oz·in)",
      "Four-hole NEMA 17 mounting pattern and 5 mm output shaft",
      "Realtime phase, direction, step count, angle, and winding-current diagnostics",
    ],
    pinoutSummary: "A+, A− (phase A) and B+, B− (phase B).",
    limits: "A physical motor requires a bipolar current-limiting driver. Direct GPIO wiring is diagnosed as overcurrent/overvoltage.",
    source: "https://www.pololu.com/product/2267/specs",
  },
  aero_arm_6dof: {
    variant: "AeroArm 6DOF, UR3e envelope reference",
    manufacturer: "AeroArm simulator model; dimensions referenced to Universal Robots UR3e",
    dimensions: "500 mm maximum reach; 128 mm base footprint; six rotary axes",
    operatingVoltage: "Virtual kinematic model; no physical drive supply is represented",
    currentRating: "3 kg payload is a UR3e reference value, not a simulator load rating",
    specs: ["Six revolute joints", "500 mm reference reach", "128 mm reference base flange"],
    pinoutSummary: "No electrical pins; robot joints are controlled through the kinematics panel.",
    limits: "Procedural visual shell only; not a dimensionally complete UR3e CAD model.",
    source: "https://www.universal-robots.com/media/1807464/ur3e_e-series_datasheets_web.pdf",
  },
};
