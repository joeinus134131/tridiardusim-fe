export const SSD1306_WIDTH = 128;
export const SSD1306_HEIGHT = 64;
export const SSD1306_PIXEL_COUNT = SSD1306_WIDTH * SSD1306_HEIGHT;

export type DisplayColor = 0 | 1 | 2;

/** Minimal SSD1306 command/data state for sketches that use Wire directly. */
export class SSD1306Controller {
  private column = 0;
  private page = 0;
  private columnStart = 0;
  private columnEnd = SSD1306_WIDTH - 1;
  private pageStart = 0;
  private pageEnd = SSD1306_HEIGHT / 8 - 1;
  private memoryMode: 0 | 1 | 2 = 0;
  private pendingCommand: number | null = null;
  private pendingArguments: number[] = [];
  displayOn = false;
  inverted = false;

  constructor(readonly framebuffer: SSD1306Framebuffer) {}

  /** Consume one Wire payload. Control byte 0 selects commands; 0x40 selects GDDRAM data. */
  write(controlByte: number, payload: ArrayLike<number>) {
    if (controlByte === 0x40) {
      for (let index = 0; index < payload.length; index++) this.writeData(Number(payload[index]) & 0xff);
      return true;
    }
    if (controlByte !== 0x00) return false;
    for (let index = 0; index < payload.length; index++) this.writeCommand(Number(payload[index]) & 0xff);
    return true;
  }

  private writeCommand(command: number) {
    if (this.pendingCommand !== null) {
      this.pendingArguments.push(command);
      const expected = this.pendingCommand === 0x21 || this.pendingCommand === 0x22 ? 2 : 1;
      if (this.pendingArguments.length === expected) this.applyCommand(this.pendingCommand, this.pendingArguments);
      if (this.pendingArguments.length >= expected) {
        this.pendingCommand = null;
        this.pendingArguments = [];
      }
      return;
    }
    if ([0x20, 0x21, 0x22, 0x81, 0x8d, 0xa8, 0xd3, 0xda, 0xd5, 0xd9, 0xdb].includes(command)) {
      this.pendingCommand = command;
      this.pendingArguments = [];
      return;
    }
    if (command >= 0xb0 && command <= 0xb7) this.setPage(command & 0x07);
    else if (command <= 0x0f) this.setColumn((this.column & 0xf0) | command);
    else if (command >= 0x10 && command <= 0x1f) this.setColumn((this.column & 0x0f) | ((command & 0x0f) << 4));
    else if (command === 0xa6) this.inverted = false;
    else if (command === 0xa7) this.inverted = true;
    else if (command === 0xae) this.displayOn = false;
    else if (command === 0xaf) this.displayOn = true;
    else if (command === 0xa4 || command === 0xa5) { /* Entire-display mode is outside the pixel-buffer view. */ }
  }

  private applyCommand(command: number, args: number[]) {
    if (command === 0x21) {
      this.columnStart = Math.min(127, args[0]);
      this.columnEnd = Math.min(127, Math.max(this.columnStart, args[1]));
      this.setColumn(this.columnStart);
    } else if (command === 0x22) {
      this.pageStart = Math.min(7, args[0]);
      this.pageEnd = Math.min(7, Math.max(this.pageStart, args[1]));
      this.setPage(this.pageStart);
    } else if (command === 0x20) {
      this.memoryMode = Math.min(2, args[0]) as 0 | 1 | 2;
    }
  }

  private setColumn(column: number) { this.column = Math.max(0, Math.min(127, column)); }
  private setPage(page: number) { this.page = Math.max(0, Math.min(7, page)); }

  private writeData(value: number) {
    for (let bit = 0; bit < 8; bit++) this.framebuffer.drawPixel(this.column, this.page * 8 + bit, value & (1 << bit) ? 1 : 0);
    if (this.memoryMode === 1) {
      this.page++;
      if (this.page > this.pageEnd) { this.page = this.pageStart; this.column = this.column >= this.columnEnd ? this.columnStart : this.column + 1; }
    } else {
      this.column++;
      if (this.column > this.columnEnd) {
        this.column = this.columnStart;
        if (this.memoryMode === 0) this.page = this.page >= this.pageEnd ? this.pageStart : this.page + 1;
      }
    }
  }
}

const FONT: Record<string, number[]> = {
  " ": [0, 0, 0, 0, 0], "!": [0, 0, 0x5f, 0, 0], "\"": [0, 7, 0, 7, 0], "#": [0x14, 0x7f, 0x14, 0x7f, 0x14],
  "%": [0x23, 0x13, 8, 0x64, 0x62], "&": [0x36, 0x49, 0x55, 0x22, 0x50], "'": [0, 5, 3, 0, 0], "(": [0, 0x1c, 0x22, 0x41, 0],
  ")": [0, 0x41, 0x22, 0x1c, 0], "*": [0x14, 8, 0x3e, 8, 0x14], "+": [8, 8, 0x3e, 8, 8], ",": [0, 0x50, 0x30, 0, 0],
  "-": [8, 8, 8, 8, 8], ".": [0, 0x60, 0x60, 0, 0], "/": [0x20, 0x10, 8, 4, 2], "0": [0x3e, 0x51, 0x49, 0x45, 0x3e],
  "1": [0, 0x42, 0x7f, 0x40, 0], "2": [0x42, 0x61, 0x51, 0x49, 0x46], "3": [0x21, 0x41, 0x45, 0x4b, 0x31], "4": [0x18, 0x14, 0x12, 0x7f, 0x10],
  "5": [0x27, 0x45, 0x45, 0x45, 0x39], "6": [0x3c, 0x4a, 0x49, 0x49, 0x30], "7": [1, 0x71, 9, 5, 3], "8": [0x36, 0x49, 0x49, 0x49, 0x36],
  "9": [6, 0x49, 0x49, 0x29, 0x1e], ":": [0, 0x36, 0x36, 0, 0], ";": [0, 0x56, 0x36, 0, 0], "<": [8, 0x14, 0x22, 0x41, 0],
  "=": [0x14, 0x14, 0x14, 0x14, 0x14], ">": [0, 0x41, 0x22, 0x14, 8], "?": [2, 1, 0x51, 9, 6], "@": [0x32, 0x49, 0x79, 0x41, 0x3e],
  A: [0x7e, 0x11, 0x11, 0x11, 0x7e], B: [0x7f, 0x49, 0x49, 0x49, 0x36], C: [0x3e, 0x41, 0x41, 0x41, 0x22], D: [0x7f, 0x41, 0x41, 0x22, 0x1c],
  E: [0x7f, 0x49, 0x49, 0x49, 0x41], F: [0x7f, 9, 9, 9, 1], G: [0x3e, 0x41, 0x49, 0x49, 0x7a], H: [0x7f, 8, 8, 8, 0x7f],
  I: [0, 0x41, 0x7f, 0x41, 0], J: [0x20, 0x40, 0x41, 0x3f, 1], K: [0x7f, 8, 0x14, 0x22, 0x41], L: [0x7f, 0x40, 0x40, 0x40, 0x40],
  M: [0x7f, 2, 0x0c, 2, 0x7f], N: [0x7f, 4, 8, 0x10, 0x7f], O: [0x3e, 0x41, 0x41, 0x41, 0x3e], P: [0x7f, 9, 9, 9, 6],
  Q: [0x3e, 0x41, 0x51, 0x21, 0x5e], R: [0x7f, 9, 0x19, 0x29, 0x46], S: [0x46, 0x49, 0x49, 0x49, 0x31], T: [1, 1, 0x7f, 1, 1],
  U: [0x3f, 0x40, 0x40, 0x40, 0x3f], V: [0x1f, 0x20, 0x40, 0x20, 0x1f], W: [0x3f, 0x40, 0x38, 0x40, 0x3f], X: [0x63, 0x14, 8, 0x14, 0x63],
  Y: [7, 8, 0x70, 8, 7], Z: [0x61, 0x51, 0x49, 0x45, 0x43], "[": [0, 0x7f, 0x41, 0x41, 0], "\\": [2, 4, 8, 0x10, 0x20], "]": [0, 0x41, 0x41, 0x7f, 0],
  "^": [4, 2, 1, 2, 4], "_": [0x40, 0x40, 0x40, 0x40, 0x40], "`": [0, 1, 2, 4, 0], "{": [0, 8, 0x36, 0x41, 0], "|": [0, 0, 0x7f, 0, 0],
  "}": [0, 0x41, 0x36, 8, 0], "~": [8, 4, 8, 0x10, 8], "°": [6, 9, 9, 6, 0],
};

/** Small monochrome framebuffer with Adafruit_GFX-compatible raster operations. */
export class SSD1306Framebuffer {
  readonly pixels = new Uint8Array(SSD1306_PIXEL_COUNT);

  clear(color: 0 | 1 = 0) { this.pixels.fill(color); }

  drawPixel(x: number, y: number, color: DisplayColor = 1) {
    const px = Math.trunc(x), py = Math.trunc(y);
    if (px < 0 || px >= SSD1306_WIDTH || py < 0 || py >= SSD1306_HEIGHT) return;
    const offset = py * SSD1306_WIDTH + px;
    this.pixels[offset] = color === 2 ? (this.pixels[offset] ^ 1) : color;
  }

  drawLine(x0: number, y0: number, x1: number, y1: number, color: DisplayColor = 1) {
    let ax = Number.isFinite(x0) ? x0 : 0, ay = Number.isFinite(y0) ? y0 : 0;
    let bx = Number.isFinite(x1) ? x1 : 0, by = Number.isFinite(y1) ? y1 : 0;
    const outCode = (x: number, y: number) => (x < 0 ? 1 : x > SSD1306_WIDTH - 1 ? 2 : 0) |
      (y < 0 ? 4 : y > SSD1306_HEIGHT - 1 ? 8 : 0);
    for (let attempts = 0; attempts < 8; attempts++) {
      const a = outCode(ax, ay), b = outCode(bx, by);
      if (!(a | b)) break;
      if (a & b) return;
      const outside = a || b;
      let x = 0, y = 0;
      if (outside & 8) { x = ax + (bx - ax) * (SSD1306_HEIGHT - 1 - ay) / (by - ay); y = SSD1306_HEIGHT - 1; }
      else if (outside & 4) { x = ax + (bx - ax) * (0 - ay) / (by - ay); y = 0; }
      else if (outside & 2) { y = ay + (by - ay) * (SSD1306_WIDTH - 1 - ax) / (bx - ax); x = SSD1306_WIDTH - 1; }
      else { y = ay + (by - ay) * (0 - ax) / (bx - ax); x = 0; }
      if (outside === a) { ax = x; ay = y; } else { bx = x; by = y; }
    }
    let x = Math.trunc(ax), y = Math.trunc(ay);
    const endX = Math.trunc(bx), endY = Math.trunc(by);
    const dx = Math.abs(endX - x), sx = x < endX ? 1 : -1;
    const dy = -Math.abs(endY - y), sy = y < endY ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      this.drawPixel(x, y, color);
      if (x === endX && y === endY) break;
      const twice = 2 * error;
      if (twice >= dy) { error += dy; x += sx; }
      if (twice <= dx) { error += dx; y += sy; }
    }
  }

  drawRect(x: number, y: number, width: number, height: number, color: DisplayColor = 1) {
    const w = Math.trunc(width), h = Math.trunc(height);
    if (w <= 0 || h <= 0) return;
    this.drawLine(x, y, x + w - 1, y, color);
    this.drawLine(x, y + h - 1, x + w - 1, y + h - 1, color);
    this.drawLine(x, y, x, y + h - 1, color);
    this.drawLine(x + w - 1, y, x + w - 1, y + h - 1, color);
  }

  fillRect(x: number, y: number, width: number, height: number, color: DisplayColor = 1) {
    const left = Math.max(0, Math.trunc(x)), top = Math.max(0, Math.trunc(y));
    const right = Math.min(SSD1306_WIDTH, Math.trunc(x + width));
    const bottom = Math.min(SSD1306_HEIGHT, Math.trunc(y + height));
    for (let py = top; py < bottom; py++) for (let px = left; px < right; px++) this.drawPixel(px, py, color);
  }

  drawCircle(centerX: number, centerY: number, radius: number, color: DisplayColor = 1) {
    let x = Math.max(0, Math.min(256, Math.trunc(radius))), y = 0, decision = 1 - x;
    const cx = Math.trunc(centerX), cy = Math.trunc(centerY);
    while (y <= x) {
      this.drawPixel(cx + x, cy + y, color); this.drawPixel(cx + y, cy + x, color);
      this.drawPixel(cx - y, cy + x, color); this.drawPixel(cx - x, cy + y, color);
      this.drawPixel(cx - x, cy - y, color); this.drawPixel(cx - y, cy - x, color);
      this.drawPixel(cx + y, cy - x, color); this.drawPixel(cx + x, cy - y, color);
      y++;
      if (decision < 0) decision += 2 * y + 1;
      else { x--; decision += 2 * (y - x) + 1; }
    }
  }

  fillCircle(centerX: number, centerY: number, radius: number, color: DisplayColor = 1) {
    const r = Math.max(0, Math.min(256, Math.trunc(radius))), cx = Math.trunc(centerX), cy = Math.trunc(centerY);
    for (let y = -r; y <= r; y++) {
      const span = Math.floor(Math.sqrt(r * r - y * y));
      this.drawLine(cx - span, cy + y, cx + span, cy + y, color);
    }
  }

  drawTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, color: DisplayColor = 1) {
    this.drawLine(x0, y0, x1, y1, color);
    this.drawLine(x1, y1, x2, y2, color);
    this.drawLine(x2, y2, x0, y0, color);
  }

  fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, color: DisplayColor = 1) {
    const vertices = [[x0, y0], [x1, y1], [x2, y2]]
      .map(([x, y]) => [Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0])
      .sort((a, b) => a[1] - b[1]);
    const [a, b, c] = vertices;
    const firstY = Math.max(0, Math.ceil(a[1]));
    const lastY = Math.min(SSD1306_HEIGHT - 1, Math.floor(c[1]));
    const intersection = (p: number[], q: number[], y: number) => {
      if (p[1] === q[1]) return Math.min(p[0], q[0]);
      return p[0] + (q[0] - p[0]) * ((y - p[1]) / (q[1] - p[1]));
    };
    for (let y = firstY; y <= lastY; y++) {
      const hits: number[] = [];
      for (const [p, q] of [[a, b], [b, c], [c, a]]) {
        if (y >= Math.min(p[1], q[1]) && y <= Math.max(p[1], q[1])) hits.push(intersection(p, q, y));
      }
      if (hits.length >= 2) this.drawLine(Math.min(...hits), y, Math.max(...hits), y, color);
    }
  }

  drawBitmap(x: number, y: number, bitmap: ArrayLike<number> | string, width: number, height: number, color: DisplayColor = 1) {
    const w = Math.max(0, Math.trunc(width)), h = Math.max(0, Math.trunc(height));
    const bytesPerRow = Math.ceil(w / 8);
    const byteAt = (index: number) => typeof bitmap === "string" ? bitmap.charCodeAt(index) || 0 : Number(bitmap[index]) || 0;
    const firstRow = Math.max(0, -Math.trunc(y)), lastRow = Math.min(h, SSD1306_HEIGHT - Math.trunc(y));
    const firstCol = Math.max(0, -Math.trunc(x)), lastCol = Math.min(w, SSD1306_WIDTH - Math.trunc(x));
    for (let row = firstRow; row < lastRow; row++) for (let col = firstCol; col < lastCol; col++) {
      const byte = byteAt(row * bytesPerRow + Math.floor(col / 8));
      if (byte & (0x80 >> (col & 7))) this.drawPixel(x + col, y + row, color);
    }
  }

  drawText(text: string, cursorX: number, cursorY: number, size = 1, color: DisplayColor = 1) {
    const scale = Math.max(1, Math.min(8, Math.trunc(size)));
    let x = Math.trunc(cursorX), y = Math.trunc(cursorY), written = 0;
    for (const original of text.slice(0, 8192)) {
      if (original === "\r") continue;
      if (original === "\n") { x = 0; y += 8 * scale; continue; }
      if (x + 6 * scale > SSD1306_WIDTH) { x = 0; y += 8 * scale; }
      if (y + 7 * scale > SSD1306_HEIGHT) break;
      const glyph = FONT[original] ?? FONT[original.toUpperCase()] ?? [0, 0, 0, 0, 0];
      for (let col = 0; col < 5; col++) for (let row = 0; row < 7; row++) {
        if (glyph[col] & (1 << row)) this.fillRect(x + col * scale, y + row * scale, scale, scale, color);
      }
      x += 6 * scale;
      written++;
    }
    return { cursorX: x, cursorY: y, written };
  }

  toPackedString() {
    let bytes = "";
    for (let y = 0; y < SSD1306_HEIGHT; y++) {
      for (let byteX = 0; byteX < SSD1306_WIDTH / 8; byteX++) {
        let value = 0;
        for (let bit = 0; bit < 8; bit++) {
          if (this.pixels[y * SSD1306_WIDTH + byteX * 8 + bit]) value |= 0x80 >> bit;
        }
        bytes += String.fromCharCode(value);
      }
    }
    return bytes;
  }

  /** Convert the row-major drawing buffer to SSD1306 page/column GDDRAM order. */
  toControllerBytes() {
    const bytes = new Uint8Array(SSD1306_PIXEL_COUNT / 8);
    let offset = 0;
    for (let page = 0; page < SSD1306_HEIGHT / 8; page++) {
      for (let x = 0; x < SSD1306_WIDTH; x++) {
        let value = 0;
        for (let bit = 0; bit < 8; bit++) {
          if (this.pixels[(page * 8 + bit) * SSD1306_WIDTH + x]) value |= 1 << bit;
        }
        bytes[offset++] = value;
      }
    }
    return bytes;
  }
}
