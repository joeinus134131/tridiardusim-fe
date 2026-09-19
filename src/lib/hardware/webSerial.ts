"use client";

export interface SerialPortFilter {
  usbVendorId?: number;
  usbProductId?: number;
}

// Common USB-to-UART bridge Vendor IDs
export const KNOWN_USB_FILTERS: SerialPortFilter[] = [
  { usbVendorId: 0x2341 }, // Arduino SA (Uno, Mega, etc.)
  { usbVendorId: 0x2a03 }, // Arduino.org
  { usbVendorId: 0x10c4 }, // Silicon Labs CP210x (ESP32, NodeMCU)
  { usbVendorId: 0x1a86 }, // QinHeng CH340 / CH341 (Arduino clones, ESP32)
  { usbVendorId: 0x0403 }, // FTDI
  { usbVendorId: 0x303a }, // Espressif Systems native USB (ESP32-S2/S3/C3)
];

export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export class WebSerialManager {
  private port: any = null;
  private reader: any = null;
  private writer: any = null;
  private readableStreamClosed: Promise<void> | null = null;
  private writableStreamClosed: Promise<void> | null = null;
  private keepReading = false;

  private onDataCallback: ((chunk: string) => void) | null = null;
  private onStatusChangeCallback: ((connected: boolean, error?: string) => void) | null = null;

  public isConnected(): boolean {
    return this.port !== null && this.port.readable !== null;
  }

  public setOnData(cb: (chunk: string) => void) {
    this.onDataCallback = cb;
  }

  public setOnStatusChange(cb: (connected: boolean, error?: string) => void) {
    this.onStatusChangeCallback = cb;
  }

  public async requestAndConnect(baudRate = 9600): Promise<boolean> {
    if (!isWebSerialSupported()) {
      throw new Error("Web Serial API tidak didukung pada browser ini. Gunakan Chrome, Edge, atau Chromium.");
    }

    try {
      // Prompt user to select port
      // We do not restrict with filters so generic USB serial ports can be chosen
      const navSerial = (navigator as any).serial;
      const port = await navSerial.requestPort();
      return await this.connect(port, baudRate);
    } catch (err: any) {
      if (err.name !== "NotFoundError") {
        this.onStatusChangeCallback?.(false, err.message || "Gagal menghubungkan serial port.");
      }
      return false;
    }
  }

  public async connect(port: any, baudRate = 9600): Promise<boolean> {
    try {
      await port.open({
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        bufferSize: 8192,
      });

      this.port = port;
      this.keepReading = true;

      // Setup writer
      const textEncoder = new TextEncoderStream();
      this.writableStreamClosed = textEncoder.readable.pipeTo(this.port.writable);
      this.writer = textEncoder.writable.getWriter();

      // Listen for disconnect event
      this.port.addEventListener("disconnect", () => {
        this.disconnect();
      });

      this.onStatusChangeCallback?.(true);

      // Start read loop asynchronously
      this.readLoop();
      return true;
    } catch (err: any) {
      this.onStatusChangeCallback?.(false, err.message || "Gagal membuka port serial.");
      return false;
    }
  }

  private async readLoop() {
    while (this.port && this.port.readable && this.keepReading) {
      const textDecoder = new TextDecoderStream();
      this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();

      try {
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) {
            break;
          }
          if (value && this.onDataCallback) {
            this.onDataCallback(value);
          }
        }
      } catch (error) {
        // Stream reading error (e.g. device disconnected)
        break;
      } finally {
        if (this.reader) {
          this.reader.releaseLock();
          this.reader = null;
        }
      }
    }
  }

  public async write(text: string): Promise<boolean> {
    if (!this.writer) return false;
    try {
      await this.writer.write(text);
      return true;
    } catch (err) {
      return false;
    }
  }

  public async pulseDTR(): Promise<void> {
    if (!this.port) return;
    try {
      // Toggle DTR to hardware reset Arduino Uno
      await this.port.setSignals({ dataTerminalReady: false, requestToSend: false });
      await new Promise((r) => setTimeout(r, 250));
      await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
    } catch (err) {
      // Ignore if signal control not supported
    }
  }

  public async disconnect(): Promise<void> {
    this.keepReading = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {}
      this.reader = null;
    }

    if (this.readableStreamClosed) {
      try {
        await this.readableStreamClosed;
      } catch {}
      this.readableStreamClosed = null;
    }

    if (this.writer) {
      try {
        await this.writer.close();
      } catch {}
      this.writer = null;
    }

    if (this.writableStreamClosed) {
      try {
        await this.writableStreamClosed;
      } catch {}
      this.writableStreamClosed = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch {}
      this.port = null;
    }

    this.onStatusChangeCallback?.(false);
  }
}

export const physicalSerial = new WebSerialManager();
