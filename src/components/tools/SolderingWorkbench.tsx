"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useState } from "react";
import {
  advanceSolderPad,
  classifySolderJoint,
  solderBridgeDetected,
  type SolderAlloy,
  type SolderJointQuality,
  type SolderPadKind,
  type SolderPadState,
} from "@/lib/simulation/soldering";

const INITIAL_PADS: { id: string; label: string; kind: SolderPadKind }[] = [
  { id: "p1", label: "SIG 1", kind: "signal" },
  { id: "p2", label: "SIG 2", kind: "signal" },
  { id: "p3", label: "GND 1", kind: "ground" },
  { id: "p4", label: "GND 2", kind: "ground" },
];

const emptyPad = (): SolderPadState => ({
  temperatureC: 25,
  contactSeconds: 0,
  solderAmount: 0,
  quality: "untouched",
});

const QUALITY_COLOR: Record<SolderJointQuality, string> = {
  untouched: "#9ca3af",
  cold: "#cbd5e1",
  good: "#34d399",
  "excess-heat": "#fbbf24",
  overheated: "#ef4444",
  bridge: "#fb7185",
};

function JointBoard({
  pads,
  hoveredPad,
  touching,
  onHover,
}: {
  pads: SolderPadState[];
  hoveredPad: number;
  touching: boolean;
  onHover: (index: number) => void;
}) {
  const bridges = pads.slice(0, -1).map((pad, index) =>
    solderBridgeDetected(pad.solderAmount, pads[index + 1].solderAmount),
  );
  // Canvas scale is 1 unit ≈ 5 mm; 0.508 units preserves 2.54 mm pin pitch.
  const positions = pads.map((_, index) => (index - 1.5) * 0.508);
  return (
    <>
      <ambientLight intensity={1.7} />
      <directionalLight position={[1, 3, 2]} intensity={2.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[5, 4]} />
        <meshStandardMaterial color="#142b30" roughness={0.84} />
      </mesh>
      <mesh position={[0, 0.01, 0]} receiveShadow>
        <boxGeometry args={[1.85, 0.12, 0.72]} />
        <meshStandardMaterial color="#17443b" roughness={0.8} />
      </mesh>
      {pads.map((pad, index) => {
        const x = positions[index];
        const color = QUALITY_COLOR[pad.quality];
        const active = hoveredPad === index;
        return (
          <group key={INITIAL_PADS[index].id} position={[x, 0.09, 0]}>
            <mesh position={[0, 0.015, 0]} onPointerEnter={() => onHover(index)} onPointerDown={() => onHover(index)}>
              <boxGeometry args={[0.115, 0.025, 0.16]} />
              <meshStandardMaterial color={active ? "#fbbf24" : "#c58c3d"} metalness={0.62} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0.10, 0]}>
              <cylinderGeometry args={[0.018, 0.024, 0.16, 12]} />
              <meshStandardMaterial color="#b9c4c8" metalness={0.8} roughness={0.28} />
            </mesh>
            <mesh position={[0, 0.042 + Math.min(0.055, pad.solderAmount * 0.025), 0]} scale={[1 + pad.solderAmount * 0.12, 1 + pad.solderAmount * 0.14, 1 + pad.solderAmount * 0.12]}>
              <sphereGeometry args={[0.035, 20, 14]} />
                <meshStandardMaterial color={pad.quality === "good" ? "#aab8c2" : color} metalness={0.72} roughness={pad.quality === "good" ? 0.22 : 0.48} />
            </mesh>
            <mesh position={[0, -0.018, 0]}>
              <boxGeometry args={[0.08, 0.005, 0.12]} />
              <meshStandardMaterial color="#d6a247" metalness={0.5} roughness={0.4} />
            </mesh>
            <group position={[0, 0.145, 0]}>
              <mesh>
                <torusGeometry args={[0.05, 0.004, 8, 32]} />
                <meshStandardMaterial color={INITIAL_PADS[index].kind === "ground" ? "#38bdf8" : "#facc15"} />
              </mesh>
            </group>
          </group>
        );
      })}
      {bridges.map((bridged, index) => bridged && (
        <mesh key={`bridge-${index}`} position={[(positions[index] + positions[index + 1]) / 2, 0.13, 0]}>
          <cylinderGeometry args={[0.018, 0.018, Math.abs(positions[index + 1] - positions[index]) * 0.72, 12]} />
          <meshStandardMaterial color={QUALITY_COLOR.bridge} metalness={0.55} roughness={0.32} />
        </mesh>
      ))}
      <group position={[positions[hoveredPad] ?? 0, touching ? 0.33 : 0.47, 0.17]} rotation={[0, 0, Math.PI]}>
        <mesh>
          <cylinderGeometry args={[0.025, 0.012, 0.22, 12]} />
          <meshStandardMaterial color="#64748b" metalness={0.68} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.13, 0]}>
          <coneGeometry args={[0.035, 0.10, 12]} />
          <meshStandardMaterial color={touching ? "#fb923c" : "#a8b2bd"} emissive={touching ? "#9a3412" : "#000000"} emissiveIntensity={0.8} metalness={0.7} roughness={0.25} />
        </mesh>
      </group>
      <OrbitControls target={[0, 0.08, 0]} minDistance={1.6} maxDistance={4.5} />
    </>
  );
}

export function SolderingWorkbench({ onClose, lang }: { onClose: () => void; lang: "en" | "id" }) {
  const en = lang === "en";
  const [alloy, setAlloy] = useState<SolderAlloy>("lead");
  const [tipTemperatureC, setTipTemperatureC] = useState(350);
  const [hoveredPad, setHoveredPad] = useState(0);
  const [touching, setTouching] = useState(false);
  const [pads, setPads] = useState<SolderPadState[]>(() => INITIAL_PADS.map(emptyPad));
  const bridges = pads.slice(0, -1).map((pad, index) => solderBridgeDetected(pad.solderAmount, pads[index + 1].solderAmount));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPads((current) => current.map((pad, index) => {
        const isTouchingPad = touching && hoveredPad === index;
        const next = advanceSolderPad(pad, { tipTemperatureC, touching: isTouchingPad, padKind: INITIAL_PADS[index].kind }, 0.05);
        const bridged = solderBridgeDetected(next.solderAmount, current[index + 1]?.solderAmount ?? 0)
          || solderBridgeDetected(current[index - 1]?.solderAmount ?? 0, next.solderAmount);
        next.quality = bridged ? "bridge" : isTouchingPad ? classifySolderJoint(next, alloy) : pad.quality;
        return next;
      }));
    }, 50);
    return () => window.clearInterval(timer);
  }, [alloy, hoveredPad, tipTemperatureC, touching]);

  const active = pads[hoveredPad];
  const activeBridged = bridges[hoveredPad] === true || bridges[hoveredPad - 1] === true;
  const qualityLabel: Record<SolderJointQuality, string> = en
    ? { untouched: "Ready", cold: "Cold joint / not wetted", good: "Good concave fillet", "excess-heat": "Too much heat", overheated: "Pad overheated", bridge: "Solder bridge · short" }
    : { untouched: "Siap", cold: "Cold joint / belum wetting", good: "Fillet cekung baik", "excess-heat": "Panas berlebih", overheated: "Pad terlalu panas", bridge: "Solder bridge · korslet" };
  const quality = classifySolderJoint(active, alloy, activeBridged);

  const feedSolder = () => {
    setPads((current) => {
      const fed = current.map((pad, index) => index === hoveredPad
        ? { ...pad, solderAmount: Math.min(1.5, pad.solderAmount + 0.25) }
        : pad);
      return fed.map((pad, index) => {
        const bridged = solderBridgeDetected(pad.solderAmount, fed[index + 1]?.solderAmount ?? 0)
          || solderBridgeDetected(fed[index - 1]?.solderAmount ?? 0, pad.solderAmount);
        return { ...pad, quality: bridged ? "bridge" : pad.quality };
      });
    });
  };

  const reset = () => {
    setTouching(false);
    setPads(INITIAL_PADS.map(emptyPad));
  };

  return (
    <div className="soldering-workbench">
      <Canvas camera={{ position: [1.05, 1.05, 1.45], fov: 42 }} shadows>
        <JointBoard pads={pads} hoveredPad={hoveredPad} touching={touching} onHover={setHoveredPad} />
      </Canvas>
      <header className="soldering-header">
        <div>
          <strong>{en ? "Virtual Soldering Workbench" : "Meja Latihan Solder Virtual"}</strong>
          <p>{en ? "Hover a pad, hold to heat, then feed a little solder." : "Arahkan ke pad, tahan untuk memanaskan, lalu tambahkan sedikit timah."}</p>
        </div>
        <button className="small-button" onClick={onClose}>{en ? "Back to circuit" : "Kembali ke rangkaian"}</button>
      </header>
      <section className="soldering-controls">
        <label>
          <span>{en ? "Alloy" : "Jenis timah"}</span>
          <select value={alloy} onChange={(event) => setAlloy(event.target.value as SolderAlloy)}>
            <option value="lead">Sn63/Pb37 · 183 °C</option>
            <option value="sac305">SAC305 · 219 °C</option>
          </select>
        </label>
        <label>
          <span>{en ? "Iron tip" : "Suhu mata solder"}: {tipTemperatureC} °C</span>
          <input type="range" min="250" max="450" step="5" value={tipTemperatureC} onChange={(event) => setTipTemperatureC(Number(event.target.value))} />
        </label>
        <div className="soldering-actions">
          <button className={`small-button ${touching ? "active" : ""}`} onPointerDown={() => setTouching(true)} onPointerUp={() => setTouching(false)} onPointerLeave={() => setTouching(false)} onBlur={() => setTouching(false)}>
            {touching ? (en ? "Heating… release" : "Memanaskan… lepas") : (en ? "Hold to heat pad" : "Tahan untuk panaskan")}
          </button>
          <button className="small-button" onClick={feedSolder} disabled={active.contactSeconds <= 0}>
            {en ? "Feed solder" : "Tambah timah"} · {active.solderAmount.toFixed(2)}
          </button>
          <button className="small-button" onClick={reset}>{en ? "Reset" : "Ulangi"}</button>
        </div>
        <div className="soldering-readout" role="status" aria-live="polite">
          <strong style={{ color: QUALITY_COLOR[quality] }}>{INITIAL_PADS[hoveredPad].label}: {qualityLabel[quality]}</strong>
          <span>{en ? "Pad" : "Pad"} {active.temperatureC.toFixed(0)} °C · {active.contactSeconds.toFixed(1)} s · {INITIAL_PADS[hoveredPad].kind === "ground" ? (en ? "ground plane" : "ground plane") : (en ? "signal pad" : "pad sinyal")}</span>
          <small>{en ? "Training heuristic only; not a physical heat-transfer prediction." : "Heuristik latihan; bukan prediksi perpindahan panas fisik."}</small>
        </div>
      </section>
      {bridges.some(Boolean) && <div className="soldering-warning" role="alert">{en ? "Adjacent pads have bridged: this joint would short." : "Pad bersebelahan tersambung timah: terjadi korsleting."}</div>}
    </div>
  );
}
