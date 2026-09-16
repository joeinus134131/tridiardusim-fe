import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { PinHighlight } from "@/components/canvas/PinHighlight";

interface LCDProps {
  id: string;
}

export function LCD1602Display({ id }: LCDProps) {
  const component = useSimulatorStore((state) =>
    state.components.find((c) => c.id === id),
  );

  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isPowered = component?.state?.isPowered !== false;
  const backlight = component?.state?.backlight !== false && isPowered;
  const theme = (component?.state?.theme as string) || "yellow_green";
  const contrast = typeof component?.state?.contrast === "number" ? component.state.contrast : 85;

  const line0 = String(component?.state?.line0 ?? "Nexflux Lab 3D  ").slice(0, 16).padEnd(16, " ");
  const line1 = String(component?.state?.line1 ?? "LCD 16x2 I2C OK ").slice(0, 16).padEnd(16, " ");

  // Create & manage 512x128 5x8 dot matrix canvas
  const canvasTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 144;
    canvasRef.current = canvas;

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearFilter;
    textureRef.current = tex;
    return tex;
  }, []);

  // Update canvas contents when lines or power changes
  useFrame(() => {
    const canvas = canvasRef.current;
    const tex = textureRef.current;
    if (!canvas || !tex) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isBlue = theme === "blue";

    // 1. Background Fill
    if (!isPowered) {
      ctx.fillStyle = isBlue ? "#091428" : "#253316";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (backlight) {
      ctx.fillStyle = isBlue ? "#1d4ed8" : "#84cc16";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = isBlue ? "#172554" : "#4d7c0f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Draw 16x2 Character Cells
    const charWidth = 28;
    const charHeight = 52;
    const padX = 32;
    const padY = 16;
    const gapY = 12;

    const cellBgColor = !isPowered
      ? (isBlue ? "#0c1b38" : "#2d3d1b")
      : backlight
      ? (isBlue ? "#1e40af" : "#a3e635")
      : (isBlue ? "#1e293b" : "#3f6212");

    const activeTextColor = !isPowered
      ? (isBlue ? "#172554" : "#1b2611")
      : isBlue
      ? "#f0f9ff"
      : "#14532d";

    const inactiveDotColor = !isPowered
      ? "transparent"
      : isBlue
      ? "rgba(30, 58, 138, 0.45)"
      : "rgba(101, 163, 13, 0.35)";

    const lines = [line0, line1];

    for (let row = 0; row < 2; row++) {
      const yStart = padY + row * (charHeight + gapY);
      const text = lines[row];

      for (let col = 0; col < 16; col++) {
        const xStart = padX + col * (charWidth + 2);
        const char = text[col] || " ";

        // Draw character cell background box
        ctx.fillStyle = cellBgColor;
        ctx.fillRect(xStart - 1, yStart - 1, charWidth, charHeight);

        // Render character text in bitmap style
        ctx.font = "bold 44px monospace";
        ctx.textBaseline = "top";
        ctx.fillStyle = isPowered ? activeTextColor : inactiveDotColor;
        ctx.fillText(char, xStart + 2, yStart - 2);

        // Subtle dot matrix overlay grid for authentic LCD texture
        ctx.fillStyle = inactiveDotColor;
        for (let dy = 0; dy < 8; dy++) {
          for (let dx = 0; dx < 5; dx++) {
            if (Math.random() < 0.05 && !isPowered) continue;
            ctx.fillRect(
              xStart + dx * (4 + 1) + 2,
              yStart + dy * (4 + 1) + 3,
              1.2,
              1.2
            );
          }
        }
      }
    }

    tex.needsUpdate = true;
  });

  const materials = useMemo(
    () => ({
      pcbGreen: new THREE.MeshStandardMaterial({
        color: "#065f46",
        roughness: 0.4,
        metalness: 0.1,
      }),
      bezelMetal: new THREE.MeshStandardMaterial({
        color: "#1e293b",
        roughness: 0.3,
        metalness: 0.8,
      }),
      mountingHole: new THREE.MeshStandardMaterial({
        color: "#d4af37",
        roughness: 0.2,
        metalness: 0.8,
      }),
      backpackPCB: new THREE.MeshStandardMaterial({
        color: "#0f172a",
        roughness: 0.5,
      }),
      potBlue: new THREE.MeshStandardMaterial({
        color: "#2563eb",
        roughness: 0.4,
      }),
      potScrewBrass: new THREE.MeshStandardMaterial({
        color: "#eab308",
        metalness: 0.8,
        roughness: 0.2,
      }),
      blackPlastic: new THREE.MeshStandardMaterial({
        color: "#111827",
        roughness: 0.5,
      }),
      goldPin: new THREE.MeshStandardMaterial({
        color: "#f59e0b",
        metalness: 0.9,
        roughness: 0.2,
      }),
    }),
    [],
  );

  return (
    <group position={[0, 0, 0]}>
      {/* ─── 1. MAIN LCD PCB (Dark Green 80 × 36 mm) ─── */}
      <mesh material={materials.pcbGreen} position={[0, 0, 0]}>
        <boxGeometry args={[16.0, 0.3, 7.2]} />
      </mesh>

      {/* 4 Corner Brass Mounting Holes */}
      {[
        [-7.4, 0, -3.0],
        [7.4, 0, -3.0],
        [-7.4, 0, 3.0],
        [7.4, 0, 3.0],
      ].map(([x, y, z], idx) => (
        <mesh key={idx} material={materials.mountingHole} position={[x, 0, z]}>
          <cylinderGeometry args={[0.3, 0.3, 0.32, 16]} />
        </mesh>
      ))}

      {/* 16-Pin Header along the TOP RIGHT of LCD */}
      <group position={[0.5, 0.2, -3.1]}>
        {Array.from({ length: 16 }).map((_, i) => (
          <mesh
            key={i}
            material={materials.goldPin}
            position={[i * 0.508, 0.05, 0]}
          >
            <cylinderGeometry args={[0.08, 0.08, 0.3, 8]} />
          </mesh>
        ))}
      </group>

      {/* ─── 2. METAL BEZEL FRAME ─── */}
      <mesh material={materials.bezelMetal} position={[0, 0.22, 0.1]}>
        <boxGeometry args={[14.4, 0.2, 5.0]} />
      </mesh>

      {/* ─── 3. LCD GLASS PANEL & DYNAMIC CANVAS TEXTURE ─── */}
      {canvasTexture && (
        <mesh position={[0, 0.33, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[13.2, 4.0]} />
          <meshStandardMaterial
            map={canvasTexture}
            roughness={0.15}
            metalness={0.05}
            emissive={
              isPowered && backlight
                ? theme === "blue"
                  ? "#1d4ed8"
                  : "#65a30d"
                : "#000000"
            }
            emissiveIntensity={isPowered && backlight ? 0.35 : 0}
          />
        </mesh>
      )}

      {/* Top Glass Polarizer Sheen */}
      <mesh position={[0, 0.34, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[13.2, 4.0]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={0.88}
          opacity={0.3}
          transparent
          roughness={0.1}
          reflectivity={0.6}
        />
      </mesh>

      {/* ─── 4. PCF8574 I2C BACKPACK MODULE (Attached directly under the 16 pins at TOP RIGHT) ─── */}
      <group position={[4.3, -0.35, -2.0]}>
        {/* Backpack PCB */}
        <mesh material={materials.backpackPCB}>
          <boxGeometry args={[8.4, 0.25, 3.2]} />
        </mesh>

        {/* PCF8574 SOIC-16 IC Chip */}
        <mesh material={materials.blackPlastic} position={[-1.2, -0.2, 0]}>
          <boxGeometry args={[2.0, 0.18, 1.0]} />
        </mesh>

        {/* Blue Contrast Trimmer Potentiometer */}
        <group position={[1.5, -0.3, 0]}>
          <mesh material={materials.potBlue}>
            <boxGeometry args={[1.0, 0.4, 1.0]} />
          </mesh>
          {/* Brass Adjustment Screw */}
          <mesh material={materials.potScrewBrass} position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.12, 12]} />
          </mesh>
        </group>

        {/* 2-Pin Backlight Jumper Cap */}
        <mesh material={materials.blackPlastic} position={[3.0, -0.25, 0.4]}>
          <boxGeometry args={[0.4, 0.4, 0.6]} />
        </mesh>
      </group>

      {/* ─── 5. 4-PIN I2C MALE HEADER (GND, VCC, SDA, SCL) at TOP RIGHT ─── */}
      <group position={[4.3, 0.2, -3.2]}>
        {/* Black Plastic Header Collar */}
        <mesh material={materials.blackPlastic} position={[0, 0, 0]}>
          <boxGeometry args={[2.2, 0.4, 0.6]} />
        </mesh>
        {/* 4 Gold Contact Pins at 2.54mm Pitch */}
        {[-0.762, -0.254, 0.254, 0.762].map((x, i) => (
          <mesh
            key={i}
            material={materials.goldPin}
            position={[x, 0.2, 0]}
          >
            <cylinderGeometry args={[0.07, 0.07, 0.5, 8]} />
          </mesh>
        ))}
      </group>

      {/* ─── 6. INTERACTIVE PIN HIGHLIGHTS (Available Pins for Wiring) ─── */}
      {component?.pins.map((p) => (
        <PinHighlight key={p.id} componentId={id} pin={p} />
      ))}
    </group>
  );
}
