import type { CircuitComponent } from "../../components/componentTypes";

export interface I2CConnectivity {
  connected(aComponentId: string, aPinId: string, bComponentId: string, bPinId: string): boolean;
}

/** Return powered devices whose matching address and both bus nets are attached to an MCU. */
export function connectedI2CDevices(
  components: CircuitComponent[],
  mcuId: string,
  sdaPin: string,
  sclPin: string,
  address: number,
  connectivity: I2CConnectivity,
  deviceAddress: (component: CircuitComponent) => number,
  powered: (component: CircuitComponent) => boolean,
) {
  return components.filter((component) => deviceAddress(component) === address &&
    connectivity.connected(mcuId, sdaPin, component.id, "SDA") &&
    connectivity.connected(mcuId, sclPin, component.id, "SCL") &&
    powered(component));
}

/** Stateful Arduino Wire-compatible transaction buffer for the virtual I2C bus. */
export class I2CBus {
  private address: number | null = null;
  private tx: number[] = [];
  private rx: number[] = [];

  beginTransmission(address: number) {
    this.address = Number(address) & 0x7f;
    this.tx = [];
  }

  write(value: number | string | ArrayLike<number>) {
    if (this.address === null) return 0;
    const bytes = typeof value === "string"
      ? [...new TextEncoder().encode(value)]
      : typeof value === "number"
        ? [value]
        : Array.from(value);
    const count = Math.min(bytes.length, 32 - this.tx.length);
    this.tx.push(...bytes.slice(0, count).map((byte) => Number(byte) & 0xff));
    return count;
  }

  endTransmission(resolve: (address: number, bytes: readonly number[]) => boolean) {
    if (this.address === null) return 4;
    const address = this.address;
    const bytes = this.tx;
    this.address = null;
    this.tx = [];
    return resolve(address, bytes) ? 0 : 2;
  }

  /** Send a device control byte plus payload using Arduino's 32-byte Wire buffer. */
  writeFrame(address: number, controlByte: number, data: ArrayLike<number>, acknowledge: (address: number, bytes: readonly number[]) => boolean) {
    for (let offset = 0; offset < data.length || (offset === 0 && data.length === 0); offset += 31) {
      this.beginTransmission(address);
      this.write(controlByte);
      const end = Math.min(data.length, offset + 31);
      for (let index = offset; index < end; index++) this.write(Number(data[index]));
      if (this.endTransmission(acknowledge) !== 0) return false;
    }
    return true;
  }

  requestFrom(address: number, count: number, readDevice: (address: number, count: number) => readonly number[] | null) {
    const requested = Math.max(0, Math.min(32, Math.trunc(count)));
    const response = readDevice(Number(address) & 0x7f, requested);
    this.rx = response ? Array.from(response).slice(0, requested).map((byte) => Number(byte) & 0xff) : [];
    return this.rx.length;
  }

  available() { return this.rx.length; }

  read() { return this.rx.length ? this.rx.shift()! : -1; }

  reset() {
    this.address = null;
    this.tx = [];
    this.rx = [];
  }
}
