export type BatteryProfile = "liion_18650" | "lipo_2s" | "alkaline_9v";

export interface BatteryParameters {
  openCircuitVoltageV: number;
  internalResistanceOhms: number;
  capacityAh: number;
  socPercent: number;
  maxDischargeCurrentA: number;
  cell1OpenCircuitVoltageV: number;
  cell2OpenCircuitVoltageV: number;
  cell1SocPercent: number;
  cell2SocPercent: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));

const lithiumCellCurve: [number, number][] = [
  [0, 3.0], [5, 3.3], [10, 3.5], [20, 3.6], [50, 3.75], [80, 4.0], [100, 4.2],
];

function interpolateSoc(curve: [number, number][], socPercent: number) {
  const soc = clamp(socPercent, 0, 100);
  const upperIndex = curve.findIndex(([point]) => point >= soc);
  if (upperIndex <= 0) return curve[0][1];
  const [lowSoc, lowVoltage] = curve[upperIndex - 1];
  const [highSoc, highVoltage] = curve[upperIndex];
  const fraction = (soc - lowSoc) / (highSoc - lowSoc);
  return lowVoltage + fraction * (highVoltage - lowVoltage);
}

/** Typical educational OCV curves; they are not a cell-specific discharge model. */
export function batteryParameters(state: Record<string, unknown>): BatteryParameters {
  const profile = String(state.profile || "liion_18650") as BatteryProfile;
  const socPercent = clamp(Number(state.socPercent ?? 100), 0, 100);
  if (profile === "lipo_2s") {
    const cell1SocPercent = clamp(Number(state.cell1SocPercent ?? socPercent), 0, 100);
    const cell2SocPercent = clamp(Number(state.cell2SocPercent ?? socPercent), 0, 100);
    const cell1OpenCircuitVoltageV = interpolateSoc(lithiumCellCurve, cell1SocPercent);
    const cell2OpenCircuitVoltageV = interpolateSoc(lithiumCellCurve, cell2SocPercent);
    return {
      openCircuitVoltageV: cell1OpenCircuitVoltageV + cell2OpenCircuitVoltageV,
      internalResistanceOhms: clamp(Number(state.internalResistanceOhms ?? 0.03), 0.005, 2),
      capacityAh: clamp(Number(state.capacityAh ?? 2), 0.1, 20),
      socPercent: (cell1SocPercent + cell2SocPercent) / 2,
      maxDischargeCurrentA: clamp(Number(state.maxDischargeCurrentA ?? 10), 0.1, 30),
      cell1OpenCircuitVoltageV,
      cell2OpenCircuitVoltageV,
      cell1SocPercent,
      cell2SocPercent,
    };
  }
  if (profile === "alkaline_9v") {
    const curve: [number, number][] = [[0, 6], [10, 7], [30, 7.8], [60, 8.4], [100, 9.2]];
    return {
      openCircuitVoltageV: interpolateSoc(curve, socPercent),
      internalResistanceOhms: clamp(Number(state.internalResistanceOhms ?? 2), 0.1, 10),
      capacityAh: clamp(Number(state.capacityAh ?? 0.5), 0.05, 5),
      socPercent,
      maxDischargeCurrentA: clamp(Number(state.maxDischargeCurrentA ?? 0.5), 0.05, 3),
      cell1OpenCircuitVoltageV: interpolateSoc(curve, socPercent),
      cell2OpenCircuitVoltageV: 0,
      cell1SocPercent: socPercent,
      cell2SocPercent: 0,
    };
  }
  return {
    openCircuitVoltageV: interpolateSoc(lithiumCellCurve, socPercent),
    internalResistanceOhms: clamp(Number(state.internalResistanceOhms ?? 0.085), 0.005, 2),
    capacityAh: clamp(Number(state.capacityAh ?? 2.5), 0.1, 20),
    socPercent,
    maxDischargeCurrentA: clamp(Number(state.maxDischargeCurrentA ?? 5), 0.1, 20),
    cell1OpenCircuitVoltageV: interpolateSoc(lithiumCellCurve, socPercent),
    cell2OpenCircuitVoltageV: 0,
    cell1SocPercent: socPercent,
    cell2SocPercent: 0,
  };
}

export function advanceBatterySoc(socPercent: number, dischargeCurrentA: number, capacityAh: number, dtSeconds: number) {
  const usedPercent = dischargeCurrentA * Math.max(0, dtSeconds) / (Math.max(0.01, capacityAh) * 3600) * 100;
  return clamp(socPercent - usedPercent, 0, 100);
}

export function advanceLipo2sSoc(
  cell1SocPercent: number,
  cell2SocPercent: number,
  packCurrentA: number,
  capacityAh: number,
  balanceCurrentA: number,
  balanceCellIndex: 1 | 2,
  dtSeconds: number,
) {
  const dt = Math.max(0, Number.isFinite(dtSeconds) ? dtSeconds : 0);
  const capacity = Math.max(0.01, Number.isFinite(capacityAh) ? capacityAh : 0.01);
  const chargeDeltaPercent = -packCurrentA * dt / (capacity * 3600) * 100;
  const balanceDeltaPercent = Math.max(0, balanceCurrentA) * dt / (capacity * 3600) * 100;
  const nextCell1 = clamp(cell1SocPercent + chargeDeltaPercent - (balanceCellIndex === 1 ? balanceDeltaPercent : 0), 0, 100);
  const nextCell2 = clamp(cell2SocPercent + chargeDeltaPercent - (balanceCellIndex === 2 ? balanceDeltaPercent : 0), 0, 100);
  return {
    cell1SocPercent: nextCell1,
    cell2SocPercent: nextCell2,
    socPercent: (nextCell1 + nextCell2) / 2,
  };
}

export function advanceBatteryProtection(
  state: { isProtectionTripped: boolean; protectionTripCurrentA: number },
  dischargeCurrentA: number,
  maxDischargeCurrentA: number,
) {
  if (state.isProtectionTripped) return state;
  if (dischargeCurrentA > Math.max(0, maxDischargeCurrentA)) {
    return { isProtectionTripped: true, protectionTripCurrentA: dischargeCurrentA };
  }
  return { isProtectionTripped: false, protectionTripCurrentA: 0 };
}
