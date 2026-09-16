"use client";

import React, { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { PinHighlight } from "@/components/canvas/PinHighlight";

interface LCDProps {
  id: string;
}

export function LCD1602Display({ id }: LCDProps) {
  const component = useSimulatorStore((state) =>
    state.components.find((c) => c.id === id),
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  const isPowered = component?.state?.isPowered !== false;
  const backlight = component?.state?.backlight !== false && isPowered;
  const theme = (component?.state?.theme as string) || "yellow_green";
  const contrast =
    typeof component?.state?.contrast === "number"
      ? component.state.contrast
      : 85;

  const line0 = String(component?.state?.line0 ?? "Nexflux Lab 3D  ").slice(0, 16);
  const line1 = String(component?.state?.line1 ?? "LCD 16x2 I2C OK ").slice(0, 16);

  // Create & manage 512x144 CanvasTexture
  const { canvas, texture } = useMemo(() => {
    if (typeof document === "undefined") return { canvas: null, texture: null };
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 144;
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearFilter;
    canvasRef.current = c;
    textureRef.current = tex;
    return { canvas: c, texture: tex };
  }, []);

  // Update canvas contents when lines, power, theme, or backlight change
  useEffect(() => {
    if (!canvas || !texture) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isBlue = theme === "blue";

    // 1. Background Fill
    if (!isPowered) {
      ctx.fillStyle = isBlue ? "#07111e" : "#172312";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (backlight) {
      ctx.fillStyle = isBlue ? "#1e40af" : "#84cc16";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = isBlue ? "#172554" : "#4d7c0f";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Draw 16x2 Character Cells
    const colWidth = 27;
    const rowHeight = 48;
    const padX = 26;
    const row0Y = 16;
    const row1Y = 78;

    const cellBg = !isPowered
      ? (isBlue ? "#0c1829" : "#1f2e18")
      : backlight
      ? (isBlue ? "#1d4ed8" : "#9ae61a")
      : (isBlue ? "#1e3a8a" : "#3f6212");

    const textColor = !isPowered
      ? (isBlue ? "#12233b" : "#142010")
      : isBlue
      ? "#ffffff"
      : "#051605"; // Deep crisp charcoal/black

    const inactiveDot = !isPowered
      ? "transparent"
      : isBlue
      ? "rgba(30, 58, 138, 0.4)"
      : "rgba(77, 124, 15, 0.25)";

    const lines = [line0.padEnd(16, " "), line1.padEnd(16, " ")];

    for (let r = 0; r < 2; r++) {
      const yStart = r === 0 ? row0Y : row1Y;
      const text = lines[r];

      for (let c = 0; c < 16; c++) {
        const xStart = padX + c * 29;
        const char = text[c] || " ";

        // Cell background box with border
        ctx.fillStyle = cellBg;
        ctx.fillRect(xStart, yStart, colWidth, rowHeight);

        // Dot matrix overlay
        ctx.fillStyle = inactiveDot;
        for (let dy = 0; dy < 8; dy++) {
          for (let dx = 0; dx < 5; dx++) {
            ctx.fillRect(xStart + 3 + dx * 4.5, yStart + 4 + dy * 5, 1, 1);
          }
        }

        // Draw character text
        if (char !== " ") {
          ctx.fillStyle = textColor;
          ctx.font = "900 36px 'Courier New', monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(char, xStart + colWidth / 2, yStart + rowHeight / 2 + 1);
        }
      }
    }

    texture.needsUpdate = true;
  }, [canvas, texture, line0, line1, isPowered, backlight, theme, contrast]);

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
        roughness: 0.3,
      }),
      potScrewBrass: new THREE.MeshStandardMaterial({
        color: "#d4af37",
        metalness: 0.8,
        roughness: 0.2,
      }),
      goldPin: new THREE.MeshStandardMaterial({
        color: "#f59e0b",
        metalness: 0.85,
        roughness: 0.15,
      }),
      blackPlastic: new THREE.MeshStandardMaterial({
        color: "#18181b",
        roughness: 0.5,
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

      {/* ─── 3. LCD GLASS PANEL & DYNAMIC CANVAS TEXTURE (Crisp & Clear) ─── */}
      {texture && (
        <mesh position={[0, 0.33, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[13.2, 4.0]} />
          <meshBasicMaterial map={texture} />
        </mesh>
      )}

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
