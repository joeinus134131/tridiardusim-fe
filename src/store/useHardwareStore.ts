import { create } from "zustand";

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

  isHardwareConnected: boolean;
  hardwareBaudRate: number;
  hardwareLogs: HardwareLog[];

  setTargetMode: (mode: "simulation" | "hardware") => void;
  setSelectedBoard: (board: "arduino_uno" | "esp32_wroom") => void;
  setSelectedPort: (port: string) => void;
  setHardwareConnected: (connected: boolean) => void;
  setHardwareBaudRate: (baud: number) => void;

  scanPorts: () => Promise<void>;
  compileCode: (code: string) => Promise<CompileResult>;
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

  isHardwareConnected: false,
  hardwareBaudRate: 115200,
  hardwareLogs: [],

  setTargetMode: (targetMode) => set({ targetMode }),
  setSelectedBoard: (selectedBoard) => set({ selectedBoard }),
  setSelectedPort: (selectedPort) => set({ selectedPort }),
  setHardwareConnected: (isHardwareConnected) => set({ isHardwareConnected }),
  setHardwareBaudRate: (hardwareBaudRate) => set({ hardwareBaudRate }),

  scanPorts: async () => {
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
      console.warn("Gagal memindai port:", err);
    } finally {
      set({ isScanningPorts: false });
    }
  },

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
        log: `Koneksi ke backend kompilator gagal: ${err.message || "Network error"}. Pastikan backend server aktif di localhost:8080.`,
      };
      set({ compileResult: result });
      return result;
    } finally {
      set({ isCompiling: false });
    }
  },

  uploadCode: async (code: string) => {
    const { selectedBoard, selectedPort } = get();
    if (!selectedPort) {
      const errRes: UploadResult = {
        success: false,
        log: "Pilih port serial target terlebih dahulu sebelum mengunggah.",
      };
      set({ uploadResult: errRes });
      return errRes;
    }

    set({ isUploading: true, uploadResult: null });
    try {
      const res = await fetch(`${API_BASE}/api/hardware/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          board: selectedBoard,
          port: selectedPort,
        }),
        signal: AbortSignal.timeout(95000),
      });

      const data = await res.json();
      const result: UploadResult = {
        success: Boolean(data.success),
        log: data.log || (data.success ? "Upload Firmware Berhasil!" : "Gagal mengunggah firmware."),
      };
      set({ uploadResult: result });
      return result;
    } catch (err: any) {
      const result: UploadResult = {
        success: false,
        log: `Gagal mengunggah ke board: ${err.message || "Network error"}.`,
      };
      set({ uploadResult: result });
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
