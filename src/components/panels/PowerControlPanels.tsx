"use client";

import { a4988CurrentLimit } from "@/lib/simulation/vhal/a4988";
import type { CircuitComponent } from "@/lib/components/componentTypes";

type UpdateState = (id: string, update: Record<string, number | string | boolean>) => void;

export function A4988ControlPanel({ component, updateState }: { component: CircuitComponent; updateState: UpdateState }) {
  const vref = Number(component.state.vref ?? 1);
  const senseResistance = Number(component.state.senseResistance ?? 0.1);
  const limit = a4988CurrentLimit(vref, senseResistance);
  const resolution = Number(component.state.microstepResolution ?? 1);
  const temperatureC = Number(component.state.temperatureC) || 25;
  const thermalShutdown = component.state.isThermalShutdown === true;
  const overcurrentFault = component.state.isOvercurrentFault === true;
  const uvlo = component.state.isUvlo === true;
  const status = overcurrentFault ? "Overcurrent fault" : thermalShutdown ? "Thermal shutdown" : uvlo ? "Logic UVLO" : component.state.isEnabled ? "Aktif" : "Standby / belum tersambung";
  return (
    <section className="inspector-card" aria-label="Kontrol driver A4988">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-xs">Driver A4988</strong>
        <span className={`text-[10px] ${overcurrentFault || thermalShutdown ? "text-red-600" : component.state.isEnabled ? "text-emerald-600" : "opacity-60"}`}>
          {status}
        </span>
      </div>
      <label className="text-[11px] flex flex-col gap-1">
        <span className="flex justify-between"><span>VREF</span><span className="font-mono">{vref.toFixed(2)} V</span></span>
        <input
          aria-label="Tegangan referensi A4988"
          type="range"
          min="0"
          max="2.5"
          step="0.01"
          value={vref}
          onChange={(event) => updateState(component.id, { vref: Number(event.target.value) })}
        />
      </label>
      <label className="text-[11px] flex items-center justify-between gap-3 mt-2">
        <span>Sense resistor</span>
        <select
          aria-label="Sense resistor A4988"
          className="inspector-input w-24"
          value={senseResistance}
          onChange={(event) => updateState(component.id, { senseResistance: Number(event.target.value) })}
        >
          <option value="0.05">0.05 Ω</option>
          <option value="0.1">0.1 Ω</option>
        </select>
      </label>
      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[10px] font-mono opacity-80 grid grid-cols-2 gap-1">
        <div>I trip set {limit.toFixed(2)} A</div><div>Mode 1/{resolution}</div>
        <div>Fase A {Number(component.state.phaseACurrentA || 0).toFixed(2)} A</div><div>Fase B {Number(component.state.phaseBCurrentA || 0).toFixed(2)} A</div>
        <div>Chip {temperatureC.toFixed(1)} °C</div><div>Loss {Number(component.state.powerLossW || 0).toFixed(2)} W</div>
        <div className="col-span-2">Pulse {String(component.state.positionPulses ?? 0)}</div>
      </div>
      <p className={`mt-1 text-[10px] ${limit > 2 ? "text-amber-600" : "opacity-60"}`}>
        {overcurrentFault ? "Proteksi OCP terkunci. Turunkan VREF, lalu sikluskan pin SLEEP." : thermalShutdown ? "Keluaran nonaktif sampai suhu chip turun di bawah 150 °C." : uvlo ? "VDD di bawah ambang UVLO; periksa catu logika." : limit > 2 ? "Setelan melampaui rating keluaran 2 A dan dapat memicu proteksi." : "Ilimit = VREF / (8 × Rs); estimasi termal memakai RθJA 32 °C/W dan RC edukasi."}
      </p>
    </section>
  );
}

export function DcSupplyControlPanel({ component, updateState }: { component: CircuitComponent; updateState: UpdateState }) {
  const voltage = Number(component.state.voltage ?? 12);
  const isOn = component.state.isOn !== false;
  return (
    <section className="inspector-card" aria-label="Kontrol catu daya DC">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-xs">Catu daya DC</strong>
        <button
          className="small-button text-[10px] px-2 py-1"
          aria-pressed={isOn}
          onClick={() => updateState(component.id, { isOn: !isOn })}
        >
          {isOn ? "Matikan" : "Nyalakan"}
        </button>
      </div>
      <label className="text-[11px] flex flex-col gap-1">
        <span className="flex justify-between"><span>Tegangan keluaran</span><span className="font-mono">{isOn ? voltage.toFixed(1) : "0.0"} V</span></span>
        <input
          aria-label="Tegangan catu DC"
          type="range"
          min="0"
          max="24"
          step="0.1"
          value={voltage}
          disabled={!isOn}
          onChange={(event) => updateState(component.id, { voltage: Number(event.target.value) })}
        />
      </label>
      <p className="mt-2 text-[10px] opacity-60">Catu ideal 0–24 V untuk eksperimen rangkaian. Batas arus/transien baterai belum dimodelkan.</p>
    </section>
  );
}

export function BatteryPackControlPanel({ component, updateState }: { component: CircuitComponent; updateState: UpdateState }) {
  const profile = String(component.state.profile || "liion_18650");
  const soc = Number(component.state.socPercent ?? 100);
  const cell1Soc = Number(component.state.cell1SocPercent ?? soc);
  const cell2Soc = Number(component.state.cell2SocPercent ?? soc);
  const isLipo2s = profile === "lipo_2s";
  const resistance = Number(component.state.internalResistanceOhms ?? 0.085);
  const capacity = Number(component.state.capacityAh ?? 2.5);
  const presets = {
    liion_18650: { resistance: 0.085, capacity: 2.5, maxDischarge: 5 },
    lipo_2s: { resistance: 0.03, capacity: 2, maxDischarge: 10 },
    alkaline_9v: { resistance: 2, capacity: 0.5, maxDischarge: 0.5 },
  };
  const voltage = Number(component.state.terminalVoltageV ?? component.state.openCircuitVoltageV ?? 0);
  const current = Number(component.state.currentA) || 0;
  const isOn = component.state.isOn !== false;
  const maxDischargeCurrentA = Number(component.state.maxDischargeCurrentA ?? (profile === "alkaline_9v" ? 0.5 : profile === "lipo_2s" ? 10 : 5));
  const protectionTripped = component.state.isProtectionTripped === true;
  const protectionLimit = profile === "alkaline_9v" ? 3 : profile === "lipo_2s" ? 30 : 20;
  const tripCurrent = Number(component.state.protectionTripCurrentA) || 0;
  return (
    <section className="inspector-card" aria-label="Kontrol paket baterai">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-xs">Paket baterai</strong>
        <button className="small-button text-[10px] px-2 py-1" aria-pressed={isOn && !protectionTripped} onClick={() => updateState(component.id, protectionTripped ? { isOn: true, isProtectionTripped: false, protectionTripCurrentA: 0 } : { isOn: !isOn })}>
          {protectionTripped ? "Reset proteksi" : isOn ? "Matikan" : "Nyalakan"}
        </button>
      </div>
      <label className="text-[11px] flex items-center justify-between gap-3">
        <span>Kimia / susunan</span>
        <select className="inspector-input" aria-label="Jenis baterai" value={profile} onChange={(event) => {
          const nextProfile = event.target.value as keyof typeof presets;
          updateState(component.id, { profile: nextProfile, internalResistanceOhms: presets[nextProfile].resistance, capacityAh: presets[nextProfile].capacity, maxDischargeCurrentA: presets[nextProfile].maxDischarge, ...(nextProfile === "lipo_2s" ? { cell1SocPercent: soc, cell2SocPercent: soc, socRevision: Number(component.state.socRevision || 0) + 1 } : {}) });
        }}>
          <option value="liion_18650">Li-ion 18650 · 1S</option>
          <option value="lipo_2s">LiPo · 2S</option>
          <option value="alkaline_9v">Alkaline · 9V</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[10px]">
        <div>Tegangan {isOn ? voltage.toFixed(2) : "0.00"} V</div>
        <div>Arus {current.toFixed(2)} A</div>
        <div>SOC {soc.toFixed(1)}%</div>
        <div>ESR {resistance.toFixed(3)} Ω</div>
      </div>
      <label className="mt-2 text-[10px] flex flex-col gap-1">
        <span>State of charge: {soc.toFixed(0)}%</span>
        <input aria-label="State of charge baterai" type="range" min="0" max="100" step="1" value={soc} onChange={(event) => {
          const nextSoc = Number(event.target.value);
          updateState(component.id, { socPercent: nextSoc, ...(isLipo2s ? { cell1SocPercent: nextSoc, cell2SocPercent: nextSoc } : {}), socRevision: Number(component.state.socRevision || 0) + 1 });
        }} />
      </label>
      {isLipo2s && <>
        <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[10px]" aria-label="Telemetry sel LiPo 2S">
          <div>Sel 1: {Number(component.state.cell1OpenCircuitVoltageV || 0).toFixed(3)} V · {cell1Soc.toFixed(1)}%</div>
          <div>Sel 2: {Number(component.state.cell2OpenCircuitVoltageV || 0).toFixed(3)} V · {cell2Soc.toFixed(1)}%</div>
          <div>ΔV: {Number(component.state.cellDeltaVoltageV || 0).toFixed(3)} V</div>
          <div>Balancing: {component.state.isBalancing ? `aktif · sel ${component.state.balanceCellIndex}` : "tidak aktif"}</div>
        </div>
        {[{ index: 1, value: cell1Soc }, { index: 2, value: cell2Soc }].map(({ index, value }) => (
          <label key={index} className="mt-2 text-[10px] flex flex-col gap-1">
            <span>SoC sel {index}: {value.toFixed(0)}%</span>
            <input aria-label={`State of charge sel ${index}`} type="range" min="0" max="100" step="1" value={value} onChange={(event) => {
              const next = Number(event.target.value);
              const other = index === 1 ? cell2Soc : cell1Soc;
              updateState(component.id, { [`cell${index}SocPercent`]: next, socPercent: (next + other) / 2, socRevision: Number(component.state.socRevision || 0) + 1 });
            }} />
          </label>
        ))}
      </>}
      <label className="mt-2 text-[10px] flex flex-col gap-1">
        <span>Kapasitas: {capacity.toFixed(2)} Ah</span>
        <input aria-label="Kapasitas baterai" type="range" min="0.1" max={profile === "alkaline_9v" ? "1" : "5"} step="0.05" value={capacity} onChange={(event) => updateState(component.id, { capacityAh: Number(event.target.value) })} />
      </label>
      <label className="mt-2 text-[10px] flex flex-col gap-1">
        <span>Resistansi internal: {resistance.toFixed(3)} Ω</span>
        <input aria-label="Resistansi internal baterai" type="range" min={profile === "alkaline_9v" ? "0.1" : "0.005"} max={profile === "alkaline_9v" ? "3" : profile === "lipo_2s" ? "0.15" : "0.3"} step={profile === "alkaline_9v" ? "0.05" : "0.005"} value={resistance} onChange={(event) => updateState(component.id, { internalResistanceOhms: Number(event.target.value) })} />
      </label>
      <label className="mt-2 text-[10px] flex flex-col gap-1">
        <span>Batas arus proteksi: {maxDischargeCurrentA.toFixed(1)} A</span>
        <input aria-label="Batas arus pelepasan baterai" type="range" min={profile === "alkaline_9v" ? "0.05" : "0.1"} max={protectionLimit} step="0.1" value={maxDischargeCurrentA} onChange={(event) => updateState(component.id, { maxDischargeCurrentA: Number(event.target.value) })} />
      </label>
      <p className={`mt-2 text-[10px] ${protectionTripped ? "text-red-600" : "opacity-60"}`}>
        {protectionTripped ? `Proteksi arus memutus output setelah ${tripCurrent.toFixed(2)} A. Matikan beban lalu reset pack.` : "Model Thévenin OCV + ESR; SOC berkurang saat pelepasan dan proteksi memutus output saat batas arus terlampaui."} Hubungkan V+ dan GND ke rel yang ingin diuji sag/BOR-nya.
      </p>
    </section>
  );
}

export function DcDcConverterControlPanel({ component, updateState }: { component: CircuitComponent; updateState: UpdateState }) {
  const isOn = component.state.isOn !== false;
  const outputVoltage = Number(component.state.outputVoltage ?? 5);
  const maxOutputCurrentA = Number(component.state.maxOutputCurrentA ?? 2);
  const efficiency = Number(component.state.efficiency ?? 0.9);
  const regulating = component.state.isRegulating === true;
  const currentLimited = component.state.isCurrentLimited === true;
  return (
    <section className="inspector-card" aria-label="Kontrol regulator buck-boost">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-xs">Regulator DC-DC</strong>
        <button className="small-button text-[10px] px-2 py-1" aria-pressed={isOn} onClick={() => updateState(component.id, { isOn: !isOn })}>
          {isOn ? "Matikan" : "Nyalakan"}
        </button>
      </div>
      <label className="text-[11px] flex items-center justify-between gap-3">
        <span>Rail keluaran</span>
        <select className="inspector-input" aria-label="Tegangan keluaran regulator" value={outputVoltage} onChange={(event) => updateState(component.id, { outputVoltage: Number(event.target.value) })}>
          <option value="3.3">3.3 V</option><option value="5">5 V</option><option value="9">9 V</option><option value="12">12 V</option>
        </select>
      </label>
      <label className="mt-2 text-[10px] flex flex-col gap-1">
        <span>Batas arus: {maxOutputCurrentA.toFixed(1)} A</span>
        <input aria-label="Batas arus regulator" type="range" min="0.25" max="3" step="0.25" value={maxOutputCurrentA} onChange={(event) => updateState(component.id, { maxOutputCurrentA: Number(event.target.value) })} />
      </label>
      <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[10px]">
        <div>VIN {Number(component.state.inputVoltageV || 0).toFixed(2)} V</div>
        <div>VOUT {Number(component.state.outputVoltageV || 0).toFixed(2)} V</div>
        <div>Iin {Number(component.state.inputCurrentA || 0).toFixed(2)} A</div>
        <div>Iout {Number(component.state.outputCurrentA || 0).toFixed(2)} A</div>
        <div>Efisiensi {(efficiency * 100).toFixed(0)}%</div>
        <div>Rugi {Number(component.state.powerLossW || 0).toFixed(2)} W</div>
      </div>
      <p className={`mt-1 text-[10px] ${currentLimited ? "text-amber-600" : regulating ? "text-emerald-600" : "opacity-60"}`}>
        {currentLimited ? "Batas arus aktif; rail turun sampai beban kembali dalam batas." : regulating ? "Rail teratur." : "Input di luar rentang kerja 2.5–24 V atau regulator mati."}
      </p>
    </section>
  );
}

export function BatteryChargerControlPanel({ component, updateState }: { component: CircuitComponent; updateState: UpdateState }) {
  const isOn = component.state.isOn !== false;
  const isCharging = component.state.isCharging === true;
  const constantVoltage = component.state.isConstantVoltage === true;
  const thermalShutdown = component.state.isThermalShutdown === true;
  const reverseConnected = component.state.isReverseConnected === true;
  const chargeComplete = component.state.isChargeComplete === true;
  const safetyTimerExpired = component.state.isSafetyTimerExpired === true;
  const current = Number(component.state.chargeCurrentA) || 0;
  const isBalancing = component.state.isBalancing === true;
  const maxCurrent = Number(component.state.maxChargeCurrentA ?? 0.5);
  const temperatureC = Number(component.state.temperatureC) || 25;
  const safetyTimerLimitHours = Number(component.state.safetyTimerLimitSeconds ?? 10 * 60 * 60) / 3600;
  const chargeElapsedHours = Number(component.state.chargeElapsedSeconds || 0) / 3600;
  const statusMessage = reverseConnected
    ? "Proteksi polaritas aktif; periksa arah input dan terminal BAT."
    : thermalShutdown
      ? "Thermal shutdown aktif; pengisian pulih setelah suhu di bawah 75 °C."
      : safetyTimerExpired
        ? "Safety timer habis; charge dihentikan sampai timer di-reset manual."
      : chargeComplete
        ? "Pengisian selesai pada ambang tail-current; charger mulai lagi ketika SoC turun di bawah 98%."
        : "CC/CV edukasi untuk Li-ion 1S (4.2 V) dan LiPo 2S (8.4 V). Proteksi polaritas memblokir sambungan terbalik; shutdown termal pada 90 °C pulih di bawah 75 °C.";
  const statusClass = thermalShutdown || reverseConnected
    ? "text-red-600"
    : safetyTimerExpired
      ? "text-amber-600"
    : chargeComplete
      ? "text-emerald-600"
    : isOn && !isCharging
      ? "text-amber-600"
      : "opacity-60";
  return (
    <section className="inspector-card" aria-label="Kontrol charger CC CV baterai">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-xs">Charger CC/CV</strong>
        <button className="small-button text-[10px] px-2 py-1" aria-pressed={isOn} onClick={() => updateState(component.id, { isOn: !isOn })}>
          {isOn ? "Matikan" : "Nyalakan"}
        </button>
      </div>
      <label className="text-[10px] flex flex-col gap-1">
        <span>Batas arus charge: {maxCurrent.toFixed(2)} A</span>
        <input aria-label="Batas arus charger" type="range" min="0.05" max="2" step="0.05" value={maxCurrent} onChange={(event) => updateState(component.id, { maxChargeCurrentA: Number(event.target.value) })} />
      </label>
      <label className="mt-2 text-[10px] flex flex-col gap-1">
        <span>Timer maksimum: {safetyTimerLimitHours.toFixed(0)} jam simulasi</span>
        <input aria-label="Batas timer keselamatan charger" type="range" min="1" max="24" step="1" value={safetyTimerLimitHours} onChange={(event) => updateState(component.id, { safetyTimerLimitSeconds: Number(event.target.value) * 3600 })} />
      </label>
      <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[10px]">
        <div>VIN {Number(component.state.inputVoltageV || 0).toFixed(2)} V</div>
        <div>I input {Number(component.state.inputCurrentA || 0).toFixed(2)} A</div>
        <div>I charge {current.toFixed(2)} A</div>
        <div>Mode {chargeComplete ? "Complete" : isCharging ? constantVoltage ? "CV" : "CC" : "Standby"}</div>
        <div>Balancing {isBalancing ? `sel ${Number(component.state.balanceCellIndex) || 1}` : "—"}</div>
        <div>I bleed {Number(component.state.balanceCurrentA || 0).toFixed(2)} A</div>
        <div>ΔV sel {Number(component.state.cellDeltaVoltageV || 0).toFixed(3)} V</div>
        <div>Tail limit {Number(component.state.tailCurrentLimitA || 0).toFixed(2)} A</div>
        <div>Loss {Number(component.state.powerLossW || 0).toFixed(2)} W</div>
        <div>Suhu {temperatureC.toFixed(1)} °C</div>
        <div>Safety timer {chargeElapsedHours.toFixed(2)}/{safetyTimerLimitHours.toFixed(0)} h</div>
      </div>
      {safetyTimerExpired && <button className="small-button mt-2 text-[10px] px-2 py-1" onClick={() => updateState(component.id, { chargeElapsedSeconds: 0, isSafetyTimerExpired: false })}>Reset safety timer</button>}
      <p className={`mt-2 text-[10px] ${statusClass}`}>
        {statusMessage} Alkaline tidak dapat diisi. Arus charge menaikkan SOC berdasarkan kapasitas dan waktu simulasi.
      </p>
    </section>
  );
}

export function L298NControlPanel({ component }: { component: CircuitComponent }) {
  const currentA = Number(component.state.currentA) || 0;
  const currentB = Number(component.state.currentB) || 0;
  const loss = Number(component.state.powerLossW) || 0;
  const temperatureC = Number(component.state.temperatureC) || 25;
  const thermalShutdown = component.state.isThermalShutdown === true;
  const freewheelCurrentA = Number(component.state.freewheelCurrentA) || 0;
  return (
    <section className="inspector-card" aria-label="Monitor driver L298N">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-xs">Driver H-Bridge L298N</strong>
        <span className={`text-[10px] ${thermalShutdown ? "text-red-600" : component.state.isLogicPowered && component.state.isMotorPowered ? "text-emerald-600" : "opacity-60"}`}>
          {thermalShutdown ? "Thermal shutdown" : component.state.isLogicPowered && component.state.isMotorPowered ? "Logic & motor supply OK" : "Belum mendapat catu"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
        <div>OUT1–2: {Number(component.state.outputVoltageA || 0).toFixed(2)} V</div>
        <div>OUT3–4: {Number(component.state.outputVoltageB || 0).toFixed(2)} V</div>
        <div>Channel A: {currentA.toFixed(2)} A</div>
        <div>Channel B: {currentB.toFixed(2)} A</div>
        <div className={temperatureC >= 90 ? "text-amber-600" : ""}>Heatsink: {temperatureC.toFixed(1)} °C</div>
        <div>Shutdown: {thermalShutdown ? "aktif" : "tidak"}</div>
        <div>Dioda freewheel: {freewheelCurrentA.toFixed(2)} A</div>
        <div>Daya dioda: {Number(component.state.freewheelLossW || 0).toFixed(2)} W</div>
      </div>
      <p className={`mt-2 text-[10px] ${loss > 2 ? "text-amber-600" : "opacity-70"}`}>
        Estimasi rugi sakelar ≈ {loss.toFixed(2)} W · drop motor penuh sekitar 2 V.
      </p>
      <p className="mt-1 text-[10px] opacity-60">Hubungkan VS/VSS/GND, ENA/ENB, input arah, lalu OUT ke terminal motor DC.</p>
    </section>
  );
}

export function DcMotorControlPanel({ component, updateState }: { component: CircuitComponent; updateState: UpdateState }) {
  const load = Number(component.state.loadTorqueNm) || 0;
  return (
    <section className="inspector-card" aria-label="Kontrol motor DC gearbox">
      <div className="flex items-center justify-between mb-2">
        <strong className="text-xs">Motor DC gearbox 1:48</strong>
        <span className={`text-[10px] ${component.state.isPowered ? "text-emerald-600" : "opacity-60"}`}>
          {component.state.isPowered ? "Terhubung / aktif" : "Coast / belum disuplai"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
        <div>Kecepatan {Number(component.state.speedRpm || 0).toFixed(1)} rpm</div>
        <div>Sudut {Number(component.state.angleDegrees || 0).toFixed(1)}°</div>
        <div>Arus {Number(component.state.armatureCurrentA || 0).toFixed(3)} A</div>
        <div>Back-EMF {Number(component.state.backEmfV || 0).toFixed(2)} V</div>
        <div>Torsi poros {Number(component.state.outputTorqueNm || 0).toFixed(3)} N·m</div>
        <div>Tegangan {Number(component.state.motorVoltageV || 0).toFixed(2)} V</div>
      </div>
      <label className="text-[10px] flex flex-col gap-1 mt-2">
        <span>Beban mekanis: {load.toFixed(3)} N·m</span>
        <input
          aria-label="Torsi beban motor DC"
          type="range"
          min="0"
          max="0.18"
          step="0.001"
          value={load}
          onChange={(event) => updateState(component.id, { loadTorqueNm: Number(event.target.value) })}
        />
      </label>
      <p className="mt-1 text-[10px] opacity-60">Listrik memakai R–L dan back-EMF; mekanika diintegrasikan pada fixed-step 5 ms.</p>
    </section>
  );
}
