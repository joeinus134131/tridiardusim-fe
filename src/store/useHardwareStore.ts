import { create } from "zustand";
import { isWebSerialSupported } from "@/lib/hardware/webSerial";
import { flashAVR } from "@/lib/hardware/avrFlasher";
import { flashESP32SingleBin, base64ToUint8Array } from "@/lib/hardware/espFlasher";
import type { AvrFlashProgress } from "@/lib/hardware/avrFlasher";
import type { EspFlashProgress } from "@/lib/hardware/espFlasher";

export interface SerialPortItem {
  address: string;
  label: string;
  protocol: string;
  boardName?: string;
  fqbn?: string;
}

export interface CompileResult {
  success: boolean;
  log: string;
  flashBytes?: number;
  flashPercent?: number;
  flashMax?: number;
  sramBytes?: number;
  sramPercent?: number;
}

export interface CompileBinaryResult extends CompileResult {
  firmware?: string; // base64-encoded firmware binary
  fileFormat?: "hex" | "bin";
  fileName?: string;
}

export interface UploadResult {
  success: boolean;
  log: string;
}

export interface HardwareLog {
  id: string;
  text: string;
  type: "in" | "out" | "info" | "error";
  timestamp: number;
}

export interface FlashProgress {
  stage: string;
  percent: number;
  message: string;
}

interface HardwareState {
  targetMode: "simulation" | "hardware";
  selectedBoard: "arduino_uno" | "esp32_wroom";
  selectedPort: string;
  detectedPorts: SerialPortItem[];
  isScanningPorts: boolean;

  isCompiling: boolean;
  compileResult: CompileResult | null;

  isUploading: boolean;
  uploadResult: UploadResult | null;
  flashProgress: FlashProgress | null;

  isHardwareConnected: boolean;
  hardwareBaudRate: number;
  hardwareLogs: HardwareLog[];

  // Web Serial port object for flashing (held in memory, not serializable)
  _webSerialPort: SerialPort | null;

  setTargetMode: (mode: "simulation" | "hardware") => void;
  setSelectedBoard: (board: "arduino_uno" | "esp32_wroom") => void;
  setSelectedPort: (port: string) => void;
  setHardwareConnected: (connected: boolean) => void;
  setHardwareBaudRate: (baud: number) => void;

  /** Use Web Serial API to let user pick a port from browser dialog */
  requestWebSerialPort: () => Promise<boolean>;
  /** Legacy: scan ports via backend (only works when backend runs locally) */
  scanPorts: () => Promise<void>;
  compileCode: (code: string) => Promise<CompileResult>;
  /** Compile on server + flash via Web Serial in browser */
  uploadCode: (code: string) => Promise<UploadResult>;

  appendHardwareLog: (text: string, type?: "in" | "out" | "info" | "error") => void;
  clearHardwareLogs: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const useHardwareStore = create<HardwareState>((set, get) => ({
  targetMode: "simulation",
  selectedBoard: "arduino_uno",
  selectedPort: "",
  detectedPorts: [],
  isScanningPorts: false,

  isCompiling: false,
  compileResult: null,

  isUploading: false,
  uploadResult: null,
  flashProgress: null,

  isHardwareConnected: false,
  hardwareBaudRate: 115200,
  hardwareLogs: [],

  _webSerialPort: null,

  setTargetMode: (targetMode) => set({ targetMode }),
  setSelectedBoard: (selectedBoard) => set({ selectedBoard }),
  setSelectedPort: (selectedPort) => set({ selectedPort }),
  setHardwareConnected: (isHardwareConnected) => set({ isHardwareConnected }),
  setHardwareBaudRate: (hardwareBaudRate) => set({ hardwareBaudRate }),

  // ─── Web Serial Port Selection (Browser-native) ─────────────────────────
  requestWebSerialPort: async () => {
    if (!isWebSerialSupported()) {
      console.warn("Web Serial API tidak didukung di browser ini.");
      return false;
    }

    try {
      const navSerial = (navigator as any).serial;
      const port: SerialPort = await navSerial.requestPort();

      // Try to extract port info
      const info = (port as any).getInfo?.() || {};
      const label =
        info.usbVendorId
          ? `USB Device (VID:${info.usbVendorId?.toString(16)} PID:${info.usbProductId?.toString(16)})`
          : "Serial Port (Web Serial)";

      set({
        _webSerialPort: port,
        selectedPort: label,
        detectedPorts: [
          {
            address: label,
            label,
            protocol: "serial",
          },
        ],
      });
      return true;
    } catch (err: any) {
      if (err.name !== "NotFoundError") {
        console.warn("Gagal memilih port serial:", err);
      }
      return false;
    }
  },

  // ─── Legacy Backend Port Scanning ────────────────────────────────────────
  scanPorts: async () => {
    // If Web Serial is available, we don't need the backend for port scanning.
    // But we keep this for fallback / local development.
    set({ isScanningPorts: true });
    try {
      const res = await fetch(`${API_BASE}/api/hardware/ports`, {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const data = await res.json();
        const ports: SerialPortItem[] = data.ports || [];
        set({ detectedPorts: ports });
        // Auto select first port if none selected
        if (!get().selectedPort && ports.length > 0) {
          set({ selectedPort: ports[0].address });
        }
      }
    } catch (err) {
      console.warn("Gagal memindai port (backend):", err);
    } finally {
      set({ isScanningPorts: false });
    }
  },

  // ─── Compile Only (Verify) ──────────────────────────────────────────────
  compileCode: async (code: string) => {
    const { selectedBoard } = get();
    set({ isCompiling: true, compileResult: null });
    try {
      const res = await fetch(`${API_BASE}/api/hardware/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          board: selectedBoard,
        }),
        signal: AbortSignal.timeout(65000),
      });

      const data = await res.json();
      const result: CompileResult = {
        success: Boolean(data.success),
        log: data.log || (data.success ? "Kompilasi Berhasil." : "Kompilasi Gagal."),
        flashBytes: data.flashBytes,
        flashPercent: data.flashPercent,
        flashMax: data.flashMax,
        sramBytes: data.sramBytes,
        sramPercent: data.sramPercent,
      };
      set({ compileResult: result });
      return result;
    } catch (err: any) {
      const result: CompileResult = {
        success: false,
        log: `Koneksi ke backend kompilator gagal: ${err.message || "Network error"}. Pastikan backend server aktif.`,
      };
      set({ compileResult: result });
      return result;
    } finally {
      set({ isCompiling: false });
    }
  },

  // ─── Compile + Flash via Web Serial ─────────────────────────────────────
  uploadCode: async (code: string) => {
    const { selectedBoard, _webSerialPort } = get();

    // Check if we have a Web Serial port selected
    if (!_webSerialPort) {
      const errRes: UploadResult = {
        success: false,
        log: "Pilih port serial terlebih dahulu. Klik tombol 'Pilih Port' untuk membuka dialog Web Serial.",
      };
      set({ uploadResult: errRes });
      return errRes;
    }

    // Check Web Serial support
    if (!isWebSerialSupported()) {
      const errRes: UploadResult = {
        success: false,
        log: "Web Serial API tidak didukung di browser ini. Gunakan Chrome, Edge, atau Chromium.",
      };
      set({ uploadResult: errRes });
      return errRes;
    }

    set({ isUploading: true, uploadResult: null, flashProgress: null });

    try {
      // ── Step 1: Compile on server and get binary ──
      set({
        flashProgress: {
          stage: "compiling",
          percent: 0,
          message: "Mengkompilasi sketch di server...",
        },
      });

      const compileRes = await fetch(`${API_BASE}/api/hardware/compile-binary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          board: selectedBoard,
        }),
        signal: AbortSignal.timeout(95000),
      });

      const compileData: CompileBinaryResult = await compileRes.json();

      if (!compileData.success || !compileData.firmware) {
        const result: UploadResult = {
          success: false,
          log: compileData.log || "Kompilasi gagal. Tidak ada firmware yang dihasilkan.",
        };
        set({ uploadResult: result, flashProgress: null });
        return result;
      }

      // Update compile result for display
      set({
        compileResult: {
          success: true,
          log: compileData.log,
          flashBytes: compileData.flashBytes,
          flashPercent: compileData.flashPercent,
          flashMax: compileData.flashMax,
          sramBytes: compileData.sramBytes,
          sramPercent: compileData.sramPercent,
        },
      });

      // ── Step 2: Flash via Web Serial ──
      const isAVR = selectedBoard === "arduino_uno" || compileData.fileFormat === "hex";
      const port = _webSerialPort;

      if (isAVR) {
        // AVR: firmware is Intel HEX (text), decode base64 to get the hex string
        const hexBytes = base64ToUint8Array(compileData.firmware);
        const hexString = new TextDecoder().decode(hexBytes);

        await flashAVR(port, hexString, (progress: AvrFlashProgress) => {
          set({
            flashProgress: {
              stage: progress.stage,
              percent: progress.percent,
              message: progress.message,
            },
          });
        });
      } else {
        // ESP32: firmware is raw binary, decode base64 to get Uint8Array
        const firmwareBin = base64ToUint8Array(compileData.firmware);

        await flashESP32SingleBin(port, firmwareBin, (progress: EspFlashProgress) => {
          set({
            flashProgress: {
              stage: progress.stage,
              percent: progress.percent,
              message: progress.message,
            },
          });
        });
      }

      const result: UploadResult = {
        success: true,
        log: `Upload firmware berhasil via Web Serial!\n\n${compileData.log}`,
      };
      set({
        uploadResult: result,
        flashProgress: { stage: "done", percent: 100, message: "Flash selesai!" },
      });
      return result;
    } catch (err: any) {
      const msg = err?.message || String(err);
      const result: UploadResult = {
        success: false,
        log: `Gagal mengunggah firmware: ${msg}`,
      };
      set({
        uploadResult: result,
        flashProgress: { stage: "error", percent: 0, message: msg },
      });
      return result;
    } finally {
      set({ isUploading: false });
    }
  },

  appendHardwareLog: (text: string, type = "in") => {
    const newLog: HardwareLog = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      type,
      timestamp: Date.now(),
    };
    set((state) => ({
      hardwareLogs: [...state.hardwareLogs.slice(-2000), newLog],
    }));
  },

  clearHardwareLogs: () => set({ hardwareLogs: [] }),
}));
