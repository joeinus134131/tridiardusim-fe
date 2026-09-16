import type { PinDefinition } from "./componentTypes";
export const MM = 0.2;
export const PITCH = 2.54 * MM;
const pin = (
  id: string,
  x: number,
  z: number,
  type: PinDefinition["type"] = "digital",
  y = 2.02,
): PinDefinition => ({ id, name: id, type, position: [x, y, z] });
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

export const servoPins: PinDefinition[] = [
  pin("GND", -1 * PITCH, 2.0, "ground", 0.4),
  pin("VCC", 0, 2.0, "power", 0.4),
  pin("PWM", 1 * PITCH, 2.0, "pwm", 0.4),
];

const LCD_I2C_X = 4.3;
export const lcd1602Pins: PinDefinition[] = [
  pin("GND", LCD_I2C_X - 1.5 * PITCH, -3.2, "ground", 0.4),
  pin("VCC", LCD_I2C_X - 0.5 * PITCH, -3.2, "power", 0.4),
  pin("SDA", LCD_I2C_X + 0.5 * PITCH, -3.2, "digital", 0.4),
  pin("SCL", LCD_I2C_X + 1.5 * PITCH, -3.2, "digital", 0.4),
];

export const physicalInfo: Record<string, ComponentDatasheet> = {
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
    variant: "Kingbright 5mm Through-Hole LED (Customizable Color)",
    manufacturer: "Kingbright / Generic Opto",
    dimensions: "Lensa Ø5.0 mm; Flange Ø5.9 mm; Panjang Kaki Anoda 27 mm, Katoda 25.4 mm",
    operatingVoltage: "Tegangan maju (Vf) nominal 1.8V - 3.2V (tergantung warna: Merah ~2.0V, Hijau/Biru ~3.0V)",
    currentRating: "Arus kerja nominal 20 mA (Maks kontinyu 30 mA, peak 140 mA)",
    specs: [
      "Pilihan Warna: Merah, Hijau, Biru, Kuning, Oranye, Putih, Ungu, Cyan",
      "Lensa Epoksi Difus 5mm dengan flange dasar standar",
      "Intensitas Cahaya: 20 - 80 mcd pada If = 20 mA",
      "Sudut Pandang (Viewing Angle): 60 derajat difus",
      "Reverse Breakdown Voltage (Vr): 5V",
    ],
    pinoutSummary: "2 Terminal: Anoda (+ lead panjang), Katoda (- lead pendek dengan tepi bodi datar).",
    limits:
      "Model DC piecewise dengan tegangan ambang Vf dan resistansi internal 10 Ohm; warna emisi dapat dipilih dinamis.",
    source: "https://www.kingbrightusa.com/images/catalog/SPEC/WP7113ID.pdf",
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
    variant: "Alps Alpine RK09K1130A6S 10kΩ Rotary Potentiometer",
    manufacturer: "Alps Alpine",
    dimensions: "Lebar Bodi 9.8 mm; Panjang Shaft 15 mm; Pitch Terminal 2.54 mm",
    operatingVoltage: "Tegangan kerja maks 50V AC / 20V DC",
    currentRating: "Daya pengenal (Power rating) 0.05 W pada 50°C",
    specs: [
      "Resistansi Total: 10 kΩ ±20%",
      "Karakteristik Taper: 1B (Linear Taper)",
      "Sudut Rotasi Total: 280° ±5°",
      "Terminal: 3 pin melalui lubang PCB, pitch 2.54 mm",
    ],
    pinoutSummary: "3 Terminal: Pin 1 (Sisi CW), Pin 2 (Wiper Tengah W), Pin 3 (Sisi CCW).",
    limits: "Pembagi tegangan kontinu linear Vw = V1 + (V3 - V1) * pos.",
    source:
      "https://tech.alpsalpine.com/e/products/category/potentiometers/sub/02/series/rk09k/",
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
    dimensions: "Bodi 22.8 × 12.2 × 28.5 mm; Berat 9 gram; Pitch Kabel 2.54 mm",
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
};
