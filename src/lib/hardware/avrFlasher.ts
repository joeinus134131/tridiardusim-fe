"use client";

/**
 * STK500v1 Protocol Flasher for AVR (Arduino Uno) via Web Serial API.
 *
 * This module implements the STK500v1 bootloader protocol used by
 * Arduino Uno (ATmega328P with Optiboot) to flash firmware directly
 * from the browser using the Web Serial API.
 *
 * Protocol reference: Atmel AVR061 – STK500 Communication Protocol
 */

// ─── STK500v1 Protocol Constants ─────────────────────────────────────────────
const STK_OK = 0x10;
const STK_INSYNC = 0x14;
const CRC_EOP = 0x20; // "space" character marks end of command

const STK_GET_SYNC = 0x30;
const STK_GET_PARAMETER = 0x41;
const STK_ENTER_PROGMODE = 0x50;
const STK_LEAVE_PROGMODE = 0x51;
const STK_LOAD_ADDRESS = 0x55;
const STK_PROG_PAGE = 0x64;
const STK_READ_SIGN = 0x75;

// Arduino Uno (ATmega328P) board config
const AVR_PAGE_SIZE = 128; // bytes per page for ATmega328P
const AVR_SIGNATURE = new Uint8Array([0x1e, 0x95, 0x0f]); // ATmega328P

// ─── Intel HEX Parser ────────────────────────────────────────────────────────

/**
 * Parse Intel HEX format string into a single Uint8Array binary blob.
 * Handles record types 0x00 (data), 0x01 (EOF), and 0x02 (extended segment addr).
 */
export function parseIntelHex(hex: string): Uint8Array {
  const lines = hex.split(/\r?\n/).filter((l) => l.startsWith(":"));
  let baseAddress = 0;
  let minAddr = Infinity;
  let maxAddr = 0;

  // First pass: determine address range
  const records: { address: number; data: number[] }[] = [];
  for (const line of lines) {
    const byteCount = parseInt(line.substring(1, 3), 16);
    const address = parseInt(line.substring(3, 7), 16);
    const recordType = parseInt(line.substring(7, 9), 16);

    if (recordType === 0x02) {
      // Extended segment address
      baseAddress = parseInt(line.substring(9, 13), 16) << 4;
      continue;
    }
    if (recordType === 0x01) break; // EOF
    if (recordType !== 0x00) continue; // Skip other record types

    const fullAddr = baseAddress + address;
    const data: number[] = [];
    for (let i = 0; i < byteCount; i++) {
      data.push(parseInt(line.substring(9 + i * 2, 11 + i * 2), 16));
    }

    records.push({ address: fullAddr, data });
    minAddr = Math.min(minAddr, fullAddr);
    maxAddr = Math.max(maxAddr, fullAddr + data.length);
  }

  if (records.length === 0) {
    throw new Error("Intel HEX file kosong atau tidak valid.");
  }

  // Second pass: fill buffer
  const size = maxAddr - minAddr;
  const buffer = new Uint8Array(size).fill(0xff); // 0xFF = erased flash state
  for (const rec of records) {
    buffer.set(rec.data, rec.address - minAddr);
  }

  return buffer;
}

// ─── Web Serial Transport ────────────────────────────────────────────────────

export interface AvrFlashProgress {
  stage: "connecting" | "syncing" | "verifying" | "flashing" | "done" | "error";
  percent: number;
  message: string;
}

export type AvrProgressCallback = (progress: AvrFlashProgress) => void;

/**
 * Low-level serial read/write helpers for STK500v1 communication.
 */
class SerialTransport {
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private readBuffer: number[] = [];

  constructor(private port: SerialPort) {}

  async open(baudRate: number): Promise<void> {
    await this.port.open({
      baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      bufferSize: 4096,
    });

    if (!this.port.readable || !this.port.writable) {
      throw new Error("Port tidak bisa dibaca/ditulis setelah dibuka.");
    }

    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.writer) throw new Error("Writer belum diinisialisasi.");
    await this.writer.write(data);
  }

  /**
   * Read exactly `count` bytes from the serial port, with timeout.
   */
  async read(count: number, timeoutMs = 2000): Promise<Uint8Array> {
    if (!this.reader) throw new Error("Reader belum diinisialisasi.");

    const deadline = Date.now() + timeoutMs;
    while (this.readBuffer.length < count) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new Error(
          `Timeout membaca data serial (butuh ${count} byte, baru dapat ${this.readBuffer.length}).`
        );
      }

      const result = await Promise.race([
        this.reader.read(),
        new Promise<{ value: undefined; done: true }>((resolve) =>
          setTimeout(() => resolve({ value: undefined, done: true }), remaining)
        ),
      ]);

      if (result.value) {
        this.readBuffer.push(...result.value);
      }
      if (result.done && !result.value) {
        // Timeout hit
        break;
      }
    }

    if (this.readBuffer.length < count) {
      throw new Error(
        `Timeout membaca dari serial port. Dibutuhkan ${count} byte, hanya menerima ${this.readBuffer.length}.`
      );
    }

    const data = new Uint8Array(this.readBuffer.splice(0, count));
    return data;
  }

  /** Drain any pending data in the read buffer */
  async drain(): Promise<void> {
    this.readBuffer = [];
    // Brief read to clear OS buffer
    try {
      if (this.reader) {
        const result = await Promise.race([
          this.reader.read(),
          new Promise<{ value: undefined; done: true }>((r) =>
            setTimeout(() => r({ value: undefined, done: true }), 100)
          ),
        ]);
        // Discard any data read
        void result;
      }
    } catch {
      // Ignore read errors during drain
    }
    this.readBuffer = [];
  }

  async close(): Promise<void> {
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {}
      try {
        this.reader.releaseLock();
      } catch {}
      this.reader = null;
    }
    if (this.writer) {
      try {
        this.writer.releaseLock();
      } catch {}
      this.writer = null;
    }
    try {
      await this.port.close();
    } catch {}
  }
}

// ─── STK500v1 Flasher ───────────────────────────────────────────────────────

/**
 * Send a STK500v1 command and expect INSYNC + OK response.
 */
async function sendCommand(
  transport: SerialTransport,
  command: Uint8Array,
  responseLength = 2,
  timeoutMs = 2000
): Promise<Uint8Array> {
  await transport.write(command);
  const response = await transport.read(responseLength, timeoutMs);
  return response;
}

function checkInSync(response: Uint8Array): void {
  if (response[0] !== STK_INSYNC) {
    throw new Error(
      `Bootloader tidak merespon dengan INSYNC. Didapat: 0x${response[0]?.toString(16) ?? "??"}`
    );
  }
  if (response[response.length - 1] !== STK_OK) {
    throw new Error(
      `Bootloader mengembalikan error. Byte terakhir: 0x${response[response.length - 1]?.toString(16) ?? "??"}`
    );
  }
}

/**
 * Trigger hardware reset on Arduino by toggling DTR signal.
 * This kicks the ATmega328P into bootloader mode (Optiboot).
 */
async function resetBoard(port: SerialPort): Promise<void> {
  await port.setSignals({ dataTerminalReady: false, requestToSend: false });
  await new Promise((r) => setTimeout(r, 250));
  await port.setSignals({ dataTerminalReady: true, requestToSend: true });
  // Optiboot has ~1 second window after reset to receive STK_GET_SYNC
  await new Promise((r) => setTimeout(r, 100));
}

/**
 * Attempt to synchronize with the bootloader by sending GET_SYNC commands.
 */
async function syncWithBootloader(transport: SerialTransport): Promise<void> {
  const maxRetries = 8;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await transport.drain();
      const resp = await sendCommand(
        transport,
        new Uint8Array([STK_GET_SYNC, CRC_EOP]),
        2,
        800
      );
      if (resp[0] === STK_INSYNC && resp[1] === STK_OK) {
        return; // Synced!
      }
    } catch {
      // Retry after short delay
      await new Promise((r) => setTimeout(r, 80));
    }
  }
  throw new Error(
    "Gagal sinkronisasi dengan bootloader Arduino. Pastikan board terhubung dan menggunakan Optiboot."
  );
}

/**
 * Read the device signature to verify it's an ATmega328P.
 */
async function readSignature(transport: SerialTransport): Promise<Uint8Array> {
  const resp = await sendCommand(
    transport,
    new Uint8Array([STK_READ_SIGN, CRC_EOP]),
    5, // INSYNC + 3 signature bytes + OK
    2000
  );
  checkInSync(resp);
  return resp.slice(1, 4);
}

/**
 * Flash a compiled hex binary to an Arduino Uno via Web Serial.
 *
 * @param port - A Web Serial port object (from navigator.serial.requestPort())
 * @param hexData - Raw Intel HEX string content from the server
 * @param onProgress - Optional callback for progress updates
 */
export async function flashAVR(
  port: SerialPort,
  hexData: string,
  onProgress?: AvrProgressCallback
): Promise<void> {
  const report = (stage: AvrFlashProgress["stage"], percent: number, message: string) => {
    onProgress?.({ stage, percent, message });
  };

  // Parse the Intel HEX into raw binary
  report("connecting", 0, "Parsing firmware Intel HEX...");
  const binary = parseIntelHex(hexData);

  const transport = new SerialTransport(port);

  try {
    // Open serial connection at Uno bootloader baud rate
    report("connecting", 5, "Membuka koneksi serial (115200 baud)...");
    await transport.open(115200);

    // Reset the board to enter bootloader mode
    report("connecting", 10, "Mereset board ke bootloader mode...");
    await resetBoard(port);

    // Sync with bootloader
    report("syncing", 15, "Sinkronisasi dengan bootloader Optiboot...");
    await syncWithBootloader(transport);

    // Read signature to verify board
    report("verifying", 20, "Membaca tanda tangan chip...");
    const signature = await readSignature(transport);
    const sigMatch =
      signature[0] === AVR_SIGNATURE[0] &&
      signature[1] === AVR_SIGNATURE[1] &&
      signature[2] === AVR_SIGNATURE[2];
    if (!sigMatch) {
      const sigStr = Array.from(signature)
        .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
        .join(" ");
      report(
        "verifying",
        20,
        `Signature: ${sigStr} (bukan ATmega328P, tetapi tetap mencoba flash...)`
      );
    } else {
      report("verifying", 25, "Chip terverifikasi: ATmega328P ✓");
    }

    // Enter programming mode
    const enterResp = await sendCommand(
      transport,
      new Uint8Array([STK_ENTER_PROGMODE, CRC_EOP]),
      2
    );
    checkInSync(enterResp);

    // Program pages
    const totalPages = Math.ceil(binary.length / AVR_PAGE_SIZE);
    report("flashing", 25, `Memulai flash ${binary.length} byte (${totalPages} halaman)...`);

    for (let page = 0; page < totalPages; page++) {
      const address = page * AVR_PAGE_SIZE;
      const wordAddress = address >> 1; // STK500 uses word addresses

      // Load address (little-endian word address)
      const addrCmd = new Uint8Array([
        STK_LOAD_ADDRESS,
        wordAddress & 0xff,
        (wordAddress >> 8) & 0xff,
        CRC_EOP,
      ]);
      const addrResp = await sendCommand(transport, addrCmd, 2);
      checkInSync(addrResp);

      // Prepare page data
      const pageData = binary.slice(address, address + AVR_PAGE_SIZE);
      const paddedPage = new Uint8Array(AVR_PAGE_SIZE).fill(0xff);
      paddedPage.set(pageData);

      // Program page command: STK_PROG_PAGE + length_high + length_low + memtype('F') + data + CRC_EOP
      const progCmd = new Uint8Array(4 + AVR_PAGE_SIZE + 1);
      progCmd[0] = STK_PROG_PAGE;
      progCmd[1] = (AVR_PAGE_SIZE >> 8) & 0xff; // length high byte
      progCmd[2] = AVR_PAGE_SIZE & 0xff; // length low byte
      progCmd[3] = 0x46; // 'F' = Flash memory
      progCmd.set(paddedPage, 4);
      progCmd[4 + AVR_PAGE_SIZE] = CRC_EOP;

      const progResp = await sendCommand(transport, progCmd, 2, 5000);
      checkInSync(progResp);

      // Progress update
      const percent = 25 + Math.round(((page + 1) / totalPages) * 70);
      report("flashing", percent, `Halaman ${page + 1}/${totalPages} ditulis...`);
    }

    // Leave programming mode
    const leaveResp = await sendCommand(
      transport,
      new Uint8Array([STK_LEAVE_PROGMODE, CRC_EOP]),
      2
    );
    checkInSync(leaveResp);

    report("done", 100, `Flash selesai! ${binary.length} byte berhasil ditulis ke board.`);
  } finally {
    await transport.close();
  }
}
