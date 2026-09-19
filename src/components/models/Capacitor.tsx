"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { PinHighlight } from "@/components/canvas/PinHighlight";

interface CapacitorProps {
  id: string;
}

export function Capacitor({ id }: CapacitorProps) {
  const component = useSimulatorStore((s) => s.components.find((c) => c.id === id));
  const subType = String(component?.state.subType || "electrolytic");
  const capacitance = Number(component?.state.capacitance || 470e-6);
  const ratedVoltage = Number(component?.state.ratedVoltage || 25);
  const displayValue = component?.state.displayValue ?? 470;
  const unit = String(component?.state.unit || "µF");
  const status = String(component?.state.status || "normal");
  const isStressed = status === "overvoltage" || status === "reversed";

  // Calculate dynamic dimensions based on capacitance and rated voltage
  // Energy volume metric: C * V_rated (Farad * Volt)
  const sizeFactor = useMemo(() => {
    // Range from ~1e-6 (small ceramic/elco) to ~0.5 (large filter cap)
    const metric = Math.max(1, capacitance * 1e6 * (ratedVoltage / 25));
    // log10(1) = 0, log10(10000) = 4
    const norm = Math.min(1, Math.max(0, Math.log10(metric) / 4.2));
    return norm;
  }, [capacitance, ratedVoltage]);

  // Dimensions
  const elcoRadius = 0.38 + 0.42 * sizeFactor; // 0.38 to 0.80
  const elcoHeight = 0.95 + 1.25 * sizeFactor; // 0.95 to 2.20
  const pinSpacing = 0.508; // Breadboard pitch: 2.54mm

  // Dynamic sleeve texture with manufacturer rating & negative polarity stripe
  const sleeveTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Background sleeve (deep industrial navy/slate)
    ctx.fillStyle = isStressed ? "#450a0a" : "#0f2038";
    ctx.fillRect(0, 0, 512, 256);

    // Negative polarity stripe (silver/white band on the right 25% of UV space)
    const stripeX = 380;
    const stripeW = 90;
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(stripeX, 0, stripeW, 256);

    // Minus signs on stripe
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    for (let y = 35; y < 256; y += 50) {
      ctx.fillText("—", stripeX + stripeW / 2, y);
    }

    // Capacitor text markings
    ctx.fillStyle = isStressed ? "#fca5a5" : "#f8fafc";
    ctx.font = "bold 38px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`${displayValue}${unit}`, 35, 80);

    ctx.font = "bold 30px monospace";
    ctx.fillText(`${ratedVoltage}V`, 35, 130);

    ctx.font = "18px monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("VENTED · -40+105°C", 35, 175);
    ctx.fillText("HIGH RIPPLE / LOW ESR", 35, 205);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }, [displayValue, unit, ratedVoltage, isStressed]);

  // Ceramic 3-digit EIA code
  const ceramicCode = useMemo(() => {
    // e.g. 100nF = 100,000 pF = 104; 10nF = 103; 1nF = 102; 22pF = 22
    const pF = Math.round(capacitance * 1e12);
    if (pF < 100) return `${pF}`;
    const exp = Math.floor(Math.log10(pF)) - 1;
    const sig = Math.floor(pF / Math.pow(10, exp));
    return `${sig}${exp}`;
  }, [capacitance]);

  // Ceramic texture
  const ceramicTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#b45309"; // Amber ceramic color
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(ceramicCode, 128, 110);

    ctx.font = "bold 26px sans-serif";
    ctx.fillText(`${ratedVoltage}V`, 128, 160);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, [ceramicCode, ratedVoltage]);

  const metallicMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d1d5db",
        metalness: 0.9,
        roughness: 0.2,
      }),
    [],
  );

  const rubberMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#18181b",
        roughness: 0.9,
        metalness: 0.05,
      }),
    [],
  );

  const pins = component?.pins || [
    { id: "A", name: "Anode (+)", type: "digital", position: [-pinSpacing / 2, -0.6, 0] },
    { id: "C", name: "Cathode (-)", type: "ground", position: [pinSpacing / 2, -0.6, 0] },
  ];

  return (
    <group>
      {pins.map((p) => (
        <PinHighlight key={p.id} componentId={id} pin={p} />
      ))}

      {subType === "electrolytic" ? (
        /* ════════════════ ELECTROLYTIC CAN (ELCO) ════════════════ */
        <group position={[0, elcoHeight / 2, 0]}>
          {/* Main Cylindrical Can with shrink sleeve */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[elcoRadius, elcoRadius, elcoHeight, 32]} />
            <meshStandardMaterial
              map={sleeveTexture || undefined}
              color={sleeveTexture ? "#ffffff" : isStressed ? "#7f1d1d" : "#1e3a8a"}
              roughness={0.4}
              metalness={0.1}
            />
          </mesh>

          {/* Top Bare Aluminum Can Face (recessed inside sleeve) */}
          <mesh position={[0, elcoHeight / 2 + 0.005, 0]} material={metallicMaterial}>
            <cylinderGeometry args={[elcoRadius * 0.96, elcoRadius * 0.96, 0.02, 32]} />
          </mesh>

          {/* Embossed Top Safety Vent (Cross / X relief pattern) */}
          <group position={[0, elcoHeight / 2 + 0.016, 0]}>
            <mesh>
              <boxGeometry args={[elcoRadius * 1.3, 0.012, 0.05]} />
              <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.8} />
            </mesh>
            <mesh>
              <boxGeometry args={[0.05, 0.012, elcoRadius * 1.3]} />
              <meshStandardMaterial color="#9ca3af" roughness={0.5} metalness={0.8} />
            </mesh>
          </group>

          {/* Swollen/Bulging Vent if Overvoltage/Reversed */}
          {isStressed && (
            <mesh position={[0, elcoHeight / 2 + 0.05, 0]}>
              <sphereGeometry args={[elcoRadius * 0.7, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#ef4444" roughness={0.3} metalness={0.5} emissive="#dc2626" emissiveIntensity={0.6} />
            </mesh>
          )}

          {/* Bottom Rubber Sealing Plug */}
          <mesh position={[0, -elcoHeight / 2 + 0.02, 0]} material={rubberMaterial}>
            <cylinderGeometry args={[elcoRadius * 0.94, elcoRadius * 0.94, 0.05, 32]} />
          </mesh>

          {/* Anode Wire Lead (Longer, left / -X) */}
          <mesh position={[-pinSpacing / 2, -elcoHeight / 2 - 0.28, 0]} material={metallicMaterial}>
            <cylinderGeometry args={[0.028, 0.028, 0.6, 10]} />
          </mesh>

          {/* Cathode Wire Lead (Shorter, right / +X, aligned with stripe) */}
          <mesh position={[pinSpacing / 2, -elcoHeight / 2 - 0.26, 0]} material={metallicMaterial}>
            <cylinderGeometry args={[0.028, 0.028, 0.54, 10]} />
          </mesh>

          {/* Stress Warning Light */}
          {isStressed && (
            <pointLight position={[0, elcoHeight / 2 + 0.2, 0]} color="#ef4444" intensity={1.5} distance={3} />
          )}
        </group>
      ) : (
        /* ════════════════ CERAMIC DISC CAPACITOR ════════════════ */
        <group position={[0, 0.65, 0]}>
          {/* Ceramic Disc Body */}
          <mesh castShadow receiveShadow rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.16, 28]} />
            <meshStandardMaterial
              map={ceramicTexture || undefined}
              color={ceramicTexture ? "#ffffff" : "#d97706"}
              roughness={0.7}
              metalness={0.05}
            />
          </mesh>

          {/* Ceramic Rounded Rim Bevel */}
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.4, 0.07, 12, 28]} />
            <meshStandardMaterial color="#b45309" roughness={0.8} />
          </mesh>

          {/* Leads (Two parallel wires entering bottom) */}
          <mesh position={[-pinSpacing / 2, -0.65, 0]} material={metallicMaterial}>
            <cylinderGeometry args={[0.025, 0.025, 0.6, 10]} />
          </mesh>
          <mesh position={[pinSpacing / 2, -0.65, 0]} material={metallicMaterial}>
            <cylinderGeometry args={[0.025, 0.025, 0.6, 10]} />
          </mesh>
        </group>
      )}
    </group>
  );
}
