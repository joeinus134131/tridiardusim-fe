# ArduSim — Simulator Arduino Berbasis Browser

Simulator sirkuit Arduino untuk pendidikan. Jalankan sketch .ino, rangkai breadboard, dan lihat hasilnya langsung di browser — tanpa hardware fisik.

## What is This

ArduSim adalah simulator Arduino Uno berbasis Next.js 16 + Three.js/R3F. Fokusnya adalah kurikulum pendidikan Indonesia: blink LED, sensor dasar (DHT11, HC-SR04), servo SG90, dan wiring breadboard. Tidak memerlukan backend untuk operasi dasar — semua simulasi berjalan di browser. Backend Go opsional untuk save/load proyek ke server.

## Prerequisites

- **Node.js 20+** (diuji dengan Node 20 LTS)
- **Go 1.22+** (opsional — hanya untuk backend server di `:8080`)
- **Python 3.9+** dengan pip (opsional — hanya untuk `npm run test:kinematics-reference`)

## Quick Start

### Tanpa backend (mode lokal)

```bash
cd frontend
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Semua fitur simulator berjalan lokal; data proyek tersimpan di localStorage.

### Dengan backend Go (mode server)

```bash
# Terminal 1 — backend
cd backend
go run main.go
# Backend berjalan di :8080

# Terminal 2 — frontend
cd frontend
npm run dev
```

Backend menyediakan save/load proyek ke server. Frontend otomatis mendeteksi backend di `NEXT_PUBLIC_API_URL` (default: `http://localhost:8080`).

### Production build

```bash
cd frontend
npm run build -- --webpack
npm start
```

> Gunakan flag `--webpack` untuk menghindari kegagalan Turbopack di sandbox/CI.

## Running Tests

```bash
# Dari direktori frontend/

# Suite utama (wajib, harus lulus 95 checks)
npm test

# TypeScript type-check (harus exit 0)
npx tsc --noEmit

# Perbandingan kinematics terhadap ModernRoboticsPython (opsional)
# Membutuhkan: python3 -m pip install -r requirements-kinematics-reference.txt
npm run test:kinematics-reference
```

## Known Limitations

- **Mobile tidak didukung** — UI dirancang untuk desktop dengan keyboard. Tampilan sempit di mobile adalah by design.
- **Bukan AVR cycle-accurate** — interpreter TypeScript kustom, bukan emulator Xtensa/AVR fisik. Integer overflow dan timing ISR berbeda dari hardware nyata.
- **Bundle berat** — pyodide (~10 MB), onnxruntime-web (~6 MB), Three.js/R3F, dan Rapier dimuat untuk fitur Advanced. First-load JS bisa >1 MB.
- **Tidak ada ISR/SPI/UART timing** — `attachInterrupt` tersedia tetapi tidak cycle-accurate. SPI/I2C fisik tidak diemulasikan (hanya V-HAL).
- **Komponen eksperimental tersembunyi** — robot, sensor AI, dan komponen daya lanjutan tidak muncul secara default. Set `NEXT_PUBLIC_SHOW_EXPERIMENTAL=true` di `.env.local` untuk menampilkannya.
- **Backend Go opsional** — tanpa backend, proyek hanya tersimpan di localStorage browser.

## Architecture Overview

- **Komponen katalog dan fidelity**: [`docs/INVENTARIS.md`](../docs/INVENTARIS.md)
- **Audit kritis dan rencana perbaikan**: [`docs/08-AUDIT-KRITIS-PEDAS-DAN-RENCANA-PERBAIKAN.md`](../docs/08-AUDIT-KRITIS-PEDAS-DAN-RENCANA-PERBAIKAN.md)
- **Rencana sprint**: [`docs/RENCANA.md`](../docs/RENCANA.md)
- **Bundle baseline**: [`docs/BUNDLE-BASELINE.md`](../docs/BUNDLE-BASELINE.md)

Direktori utama:
- `src/app/page.tsx` — root UI (~1210 baris, dijadwalkan dipecah di Sprint 3)
- `src/lib/components/ComponentRegistry.ts` — katalog 34 tipe komponen dengan fidelity labels
- `src/lib/simulation/simulation.worker.ts` — Web Worker simulasi (~1627 baris)
- `src/store/useSimulatorStore.ts` — Zustand store state global
- `tests/run.cjs` — test harness kustom (95 checks, tanpa Vitest/Jest)
