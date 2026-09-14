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
export const unoPins: PinDefinition[] = [
  ...Array.from({ length: 14 }, (_, i) =>
    pin(
      `D${i}`,
      5.84 - i * PITCH - (i >= 8 ? 0.3048 : 0),
      4.826,
      [3, 5, 6, 9, 10, 11].includes(i) ? "pwm" : "digital",
    ),
  ),
  pin("GND3", 5.84 - 14 * PITCH - 0.3048, 4.826, "ground"),
  pin("AREF", 5.84 - 15 * PITCH - 0.3048, 4.826, "analog"),
  pin("SDA", 5.84 - 16 * PITCH - 0.3048, 4.826, "analog"),
  pin("SCL", 5.84 - 17 * PITCH - 0.3048, 4.826, "analog"),
  ...["NC", "IOREF", "RESET", "3V3", "5V", "GND1", "GND2", "VIN"].map((id, i) =>
    pin(
      id,
      -1.272 + i * PITCH,
      -4.826,
      id.startsWith("GND")
        ? "ground"
        : ["NC", "RESET"].includes(id)
          ? "digital"
          : "power",
    ),
  ),
  ...Array.from({ length: 6 }, (_, i) =>
    pin(`A${i}`, 3.3 + i * PITCH, -4.826, "analog"),
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
      3.75 + (Math.floor(i / 2) - 1) * PITCH,
      "digital",
      1.9,
    ),
  ),
];
export const physicalInfo: Record<
  string,
  { variant: string; dimensions: string; source: string; limits: string }
> = {
  esp32_wroom: {
    variant: "Espressif ESP32-DevKitC V4 / ESP32-WROOM-32",
    dimensions: "PCB ≈ 54.4 × 27.9 mm · 2 × 19 header, pitch 2.54 mm",
    limits: "Envelope mekanik dan pinout DevKitC. GPIO 3.3 V, ADC linear ideal 12-bit; Wi-Fi, Bluetooth, RF, bootloader dan pustaka ESP-IDF belum diemulasi.",
    source: "https://docs.espressif.com/projects/esp-idf/en/v5.3/esp32/hw-reference/esp32/get-started-devkitc.html",
  },
  arduino_uno: {
    variant: "Arduino A000066 Uno R3 DIP",
    dimensions: "PCB 68.6 × 53.4 × 1.6 mm; pitch 2.54 mm",
    source: "https://docs.arduino.cc/hardware/uno-rev3/",
    limits:
      "Kontur, header dan komponen utama; cetakan mikro, jalur PCB dan konektor internal disederhanakan.",
  },
  breadboard: {
    variant: "BusBoard BB400 putih",
    dimensions: "84 × 54.3 × 8.5 mm; pitch 2.54 mm",
    source: "https://www.busboard.com/BB400",
    limits:
      "Katalog awal dikoreksi dari 420 menjadi 400 titik sesuai BB400; ukiran/logo dan kontak internal disederhanakan.",
  },
  led_red: {
    variant: "Kingbright WP7113ID",
    dimensions: "Lensa Ø5 mm; flange Ø5.9 mm; pitch 2.54 mm",
    source: "https://www.kingbrightusa.com/images/catalog/SPEC/WP7113ID.pdf",
    limits:
      "Epoksi merah difus dan sisi katoda datar; kawat bond internal disederhanakan; kaki panjang nominal.",
  },
  push_button: {
    variant: "Omron B3F-1000",
    dimensions: "6 × 6 mm; tinggi 4.3 mm; pitch kaki 6.5 × 4.5 mm",
    source:
      "https://components.omron.com/sites/default/files/datasheet_pdf/A070-E1.pdf",
    limits:
      "Bentuk tekukan kaki disederhanakan; label simulator 1a/1b/2a/2b adalah kelompok kontak, bukan nomor pabrikan.",
  },
  potentiometer: {
    variant: "Alps Alpine RK09K1130A6S (10kΩ)",
    dimensions: "Lebar badan 9.8 mm; shaft 15 mm; linier",
    source:
      "https://tech.alpsalpine.com/e/products/category/potentiometers/sub/02/series/rk09k/",
    limits:
      "Badan snap-in dan shaft datar; latching tabs dan emboss kecil disederhanakan.",
  },
  resistor_220: {
    variant: "Yageo CFR-25 220Ω ±5%",
    dimensions: "Badan nominal 6.3 × Ø2.4 mm; axial",
    source: "https://www.yageo.com/en/Chart/Download/pdf/CFR",
    limits:
      "Kaki dipotong untuk rangkaian; bentuk lacquer ujung disederhanakan.",
  },
  jumper: {
    variant: "BusBoard ZW-MM-10 male–male",
    dimensions: "Kontak persegi 0.64 mm; housing pitch 2.54 mm",
    source: "https://www.busboard.com/ZW-MM-10",
    limits:
      "Rute kabel fleksibel, housing dan kontak disederhanakan; 5 warna katalog dipertahankan.",
  },
};
