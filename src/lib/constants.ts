export const GRID_SIZE = 0.5; // Smaller grid for finer component placement
export const CAMERA_START_POS: [number, number, number] = [0, 25, 25];
export const CAMERA_START_TARGET: [number, number, number] = [0, 0, 0];

// Simulation
export const SIMULATION_TICK_RATE = 16; // ms per tick (~60fps)

// Colors
export const COLORS = {
  wire: {
    power: "#ef4444",
    ground: "#1a1a2e",
    signal: "#3b82f6",
    analog: "#8b5cf6",
    pwm: "#f59e0b",
    white: "#e2e8f0",
    green: "#22c55e",
    yellow: "#eab308",
    orange: "#f97316",
  },
  pin: {
    hover: "#10b981",
    invalid: "#ef4444",
    normal: "#94a3b8",
  },
  board: {
    pcb: "#004d40",
    silkscreen: "#f8fafc",
    header: "#1a1a2e",
  },
};
