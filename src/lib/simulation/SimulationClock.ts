/** Fixed-step simulation time shared by the circuit and sketch runtime. */
export class SimulationClock {
  private timeMicros = 0;
  private paused = false;
  private waiters = new Set<{ target: number; resolve: () => void }>();

  constructor(readonly stepMicros = 5_000) {
    if (!Number.isSafeInteger(stepMicros) || stepMicros <= 0) {
      throw new Error("Timestep harus integer positif dalam mikrodetik.");
    }
  }

  reset() {
    this.timeMicros = 0;
    this.paused = false;
    for (const waiter of this.waiters) waiter.resolve();
    this.waiters.clear();
  }

  micros() {
    return this.timeMicros;
  }

  millis() {
    return Math.floor(this.timeMicros / 1_000);
  }

  advance() {
    if (this.paused) return this.timeMicros;
    this.timeMicros += this.stepMicros;
    for (const waiter of this.waiters) {
      if (this.timeMicros >= waiter.target) {
        this.waiters.delete(waiter);
        waiter.resolve();
      }
    }
    return this.timeMicros;
  }

  delayMicros(duration: number): Promise<void> {
    const requested = Number.isFinite(duration) ? Math.trunc(duration) : 0;
    const bounded = Math.max(0, Math.min(3_600_000_000, requested));
    if (bounded === 0) return Promise.resolve();
    const target = this.timeMicros + bounded;
    return new Promise((resolve) => this.waiters.add({ target, resolve }));
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }
}
