"use client";

/**
 * ESP32 Flasher via Web Serial API using esptool-js.
 *
 * This module wraps the official Espressif esptool-js library
 * to flash ESP32 firmware (.bin) directly from the browser.
 */

import { ESPLoader, Transport } from "esptool-js";
import type { LoaderOptions, FlashOptions, IEspLoaderTerminal } from "esptool-js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EspFlashProgress {
  stage: "connecting" | "detecting" | "flashing" | "done" | "error";
  percent: number;
  message: string;
}

export type EspProgressCallback = (progress: EspFlashProgress) => void;

export interface EspFlashFileEntry {
  /** Binary data of the firmware partition */
  data: Uint8Array;
  /** Flash address (e.g., 0x1000 for bootloader, 0x10000 for app) */
  address: number;
}

// ─── Default Flash Addresses for ESP32 ──────────────────────────────────────

/**
 * For a single-app flash (common arduino-cli output), the compiled .bin
 * for ESP32 is usually placed at address 0x10000.
 * The bootloader goes at 0x1000 and the partition table at 0x8000,
 * but arduino-cli handles those. When doing OTA-style flash of just
 * the app binary, 0x10000 is the standard address.
 */
export const ESP32_APP_ADDRESS = 0x10000;
export const ESP32_BOOTLOADER_ADDRESS = 0x1000;
export const ESP32_PARTITION_ADDRESS = 0x8000;

// ─── ESP32 Flasher ──────────────────────────────────────────────────────────

/**
 * Flash firmware to an ESP32 board via Web Serial.
 *
 * @param port - A Web Serial port object (from navigator.serial.requestPort())
 * @param firmwareEntries - Array of {data, address} entries to flash
 * @param onProgress - Optional callback for progress updates
 * @param baudRate - Communication baud rate (default 921600 for fast flashing)
 */
export async function flashESP32(
  port: SerialPort,
  firmwareEntries: EspFlashFileEntry[],
  onProgress?: EspProgressCallback,
  baudRate = 921600
): Promise<void> {
  const report = (stage: EspFlashProgress["stage"], percent: number, message: string) => {
    onProgress?.({ stage, percent, message });
  };

  let transport: Transport | null = null;
  let esploader: ESPLoader | null = null;

  try {
    report("connecting", 0, "Menginisialisasi koneksi serial ke ESP32...");

    // Create transport from the Web Serial port
    transport = new Transport(port, true);

    // Create a terminal interface that feeds progress back
    const terminal: IEspLoaderTerminal = {
      clean() {
        // no-op for our use case
      },
      writeLine(data: string) {
        // Parse progress messages from esptool-js
        if (data.includes("Writing at")) {
          const match = data.match(/(\d+)\s*%/);
          if (match) {
            const pct = parseInt(match[1], 10);
            const overallPct = 20 + Math.round(pct * 0.75);
            report("flashing", overallPct, data.trim());
          }
        }
      },
      write(data: string) {
        // Some esptool-js versions use write() for progress
        if (data.includes("%")) {
          const match = data.match(/(\d+)\s*%/);
          if (match) {
            const pct = parseInt(match[1], 10);
            const overallPct = 20 + Math.round(pct * 0.75);
            report("flashing", overallPct, data.trim());
          }
        }
      },
    };

    // Configure loader options
    const loaderOptions: LoaderOptions = {
      transport,
      baudrate: baudRate,
      terminal,
      debugLogging: false,
    };

    // Create ESPLoader instance
    esploader = new ESPLoader(loaderOptions);

    // Connect and detect the chip
    report("detecting", 5, "Mendeteksi chip ESP32...");
    const chipName = await esploader.main();
    report("detecting", 15, `Terdeteksi chip: ${chipName}`);

    // Prepare file array for flashing
    // esptool-js expects { data: Uint8Array, address: number }
    const fileArray = firmwareEntries.map((entry) => ({
      data: entry.data,
      address: entry.address,
    }));

    // Configure flash options
    const flashOptions: FlashOptions = {
      fileArray,
      flashSize: "keep",
      flashMode: "keep",
      flashFreq: "keep",
      eraseAll: false,
      compress: true,
      reportProgress: (fileIndex: number, written: number, total: number) => {
        const pct = Math.round((written / total) * 100);
        const overallPct = 20 + Math.round(pct * 0.75);
        report(
          "flashing",
          overallPct,
          `Menulis file ${fileIndex + 1}/${fileArray.length}: ${pct}% (${written}/${total} byte)`
        );
      },
      calculateMD5Hash: (_image: Uint8Array) => {
        // esptool-js handles MD5 internally; we return empty to skip custom calc
        return "";
      },
    };

    // Start flashing
    report("flashing", 20, "Memulai proses flash firmware...");
    await esploader.writeFlash(flashOptions);

    // Reset the device after flashing
    try {
      await transport.setDTR(false);
      await new Promise((r) => setTimeout(r, 100));
      await transport.setDTR(true);
    } catch {
      // Some transports don't support DTR control
    }

    report("done", 100, `Flash ESP32 selesai! Firmware berhasil ditulis ke chip ${chipName}.`);
  } catch (err: any) {
    const msg = err?.message || String(err);
    report("error", 0, `Gagal flash ESP32: ${msg}`);
    throw err;
  } finally {
    // Clean up transport
    if (transport) {
      try {
        await transport.disconnect();
      } catch {}
    }
  }
}

/**
 * Helper: Flash a single app binary to ESP32 at the default app address.
 * This is the most common use case when uploading from arduino-cli output.
 */
export async function flashESP32SingleBin(
  port: SerialPort,
  firmwareBin: Uint8Array,
  onProgress?: EspProgressCallback,
  address = ESP32_APP_ADDRESS,
  baudRate = 921600
): Promise<void> {
  return flashESP32(
    port,
    [{ data: firmwareBin, address }],
    onProgress,
    baudRate
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert base64 string to Uint8Array */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
