"use client";
import React, { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { oledPins, PITCH } from "@/lib/components/physical";
import { PinHighlight } from "@/components/canvas/PinHighlight";
import { Label } from "./Label";

interface OLEDState {
  isOn?: boolean;
  isPowered?: boolean;
  text?: string;
  lines?: string[];
  image?: string;
  contrast?: number;
  inverted?: boolean;
  pixels?: number[]; // Optional 128x64 bitmap buffer
}

export const OLEDDisplay = React.memo(function OLEDDisplay({ id }: { id: string }) {
  const component = useSimulatorStore((s) => s.components.find((c) => c.id === id));
  const state = (component?.state || {}) as OLEDState;
  const isPowered = state.isPowered ?? true;
  const text = state.text || "NEXFLUX LAB 3D\nOLED SSD1306\nI2C: 0x3C Ready";
  const imagePreset = state.image || "logo";
  const inverted = state.inverted || false;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  // Initialize canvas & texture once
  const { canvas, texture } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.NearestFilter;
    canvasRef.current = c;
    textureRef.current = tex;
    return { canvas: c, texture: tex };
  }, []);

  // Render OLED screen content onto CanvasTexture
  useEffect(() => {
    if (!canvas || !texture) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Background
    if (!isPowered) {
      // Off / Unpowered state: deep dark glossy glass
      ctx.fillStyle = "#050811";
      ctx.fillRect(0, 0, w, h);
      texture.needsUpdate = true;
      return;
    }

    const bg = inverted ? "#0ea5e9" : "#02040a";
    const fg = inverted ? "#02040a" : "#38bdf8";
    const accent = inverted ? "#0369a1" : "#7dd3fc";

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle OLED pixel grid pattern
    ctx.fillStyle = inverted ? "rgba(0,0,0,0.06)" : "rgba(56, 189, 248, 0.04)";
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1);
    }

    if (imagePreset === "logo") {
      // Draw Tech / Nexflux Emblem
      ctx.strokeStyle = fg;
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(42, 64, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(42, 64, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = fg;
      ctx.fillRect(38, 52, 8, 24);
      ctx.fillRect(30, 60, 24, 8);

      ctx.font = "bold 18px monospace";
      ctx.fillText("NEXFLUX 3D", 76, 48);
      ctx.font = "13px monospace";
      ctx.fillStyle = accent;
      ctx.fillText("SSD1306 0.96\"", 76, 70);
      ctx.font = "11px monospace";
      ctx.fillText("I2C ADDR: 0x3C", 76, 90);
    } else if (imagePreset === "circuit") {
      // Microchip / Circuit graphic
      ctx.strokeStyle = fg;
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, 70, 70);
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = fg;
      ctx.fillText("MCU", 42, 60);

      // Pins on chip
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(10, 28 + i * 12, 10, 3);
        ctx.fillRect(90, 28 + i * 12, 10, 3);
      }

      ctx.font = "bold 15px monospace";
      ctx.fillText("STATUS: ACTIVE", 110, 45);
      ctx.font = "12px monospace";
      ctx.fillStyle = accent;
      ctx.fillText("VOLTAGE: 3.30V", 110, 68);
      ctx.fillText("CLOCK: 400kHz", 110, 88);
    } else if (imagePreset === "gauge") {
      // Sensor Gauge Arc & Value
      ctx.strokeStyle = fg;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(64, 76, 42, Math.PI * 0.8, Math.PI * 2.2);
      ctx.stroke();

      ctx.fillStyle = fg;
      ctx.font = "bold 28px monospace";
      ctx.fillText("78%", 42, 78);
      ctx.font = "11px monospace";
      ctx.fillText("POWER LEVEL", 32, 104);

      ctx.font = "bold 14px monospace";
      ctx.fillText("SENSOR A0", 130, 45);
      ctx.font = "12px monospace";
      ctx.fillStyle = accent;
      ctx.fillText("T: 26.4 C", 130, 70);
      ctx.fillText("H: 58.2 %", 130, 92);
    } else if (imagePreset === "invader") {
      // Retro 8-bit space invader bitmap
      const invader = [
        "  x     x  ",
        "   x   x   ",
        "  xxxxxxx  ",
        " xx xxx xx ",
        "xxxxxxxxxxx",
        "x xxxxxxx x",
        "x x     x x",
        "   xx xx   ",
      ];
      ctx.fillStyle = fg;
      const pixelSize = 7;
      const ox = 24, oy = 36;
      for (let r = 0; r < invader.length; r++) {
        for (let c = 0; c < invader[r].length; c++) {
          if (invader[r][c] === "x") {
            ctx.fillRect(ox + c * pixelSize, oy + r * pixelSize, pixelSize - 1, pixelSize - 1);
          }
        }
      }
      ctx.font = "bold 16px monospace";
      ctx.fillText("RETRO 8-BIT", 120, 52);
      ctx.font = "13px monospace";
      ctx.fillStyle = accent;
      ctx.fillText("SCORE: 1980", 120, 76);
      ctx.fillText("READY!", 120, 98);
    } else {
      // Multi-line Text Mode
      const lines = text.split("\n");
      ctx.fillStyle = fg;
      ctx.font = "bold 15px monospace";
      lines.forEach((line, idx) => {
        ctx.fillText(line.slice(0, 24), 12, 28 + idx * 22);
      });
    }

    texture.needsUpdate = true;
  }, [canvas, texture, isPowered, text, imagePreset, inverted]);

  return (
    <group>
      {/* 1. Main Blue PCB Board */}
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.4, 0.32, 5.4]} />
        <meshStandardMaterial color="#0d52bf" roughness={0.4} metalness={0.1} />
      </mesh>

      {/* 2. Four Corner Mounting Holes with Metallic Eyelets */}
      {[
        [-2.3, -2.3],
        [2.3, -2.3],
        [-2.3, 2.3],
        [2.3, 2.3],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0.16, z]}>
          <mesh>
            <cylinderGeometry args={[0.32, 0.32, 0.34, 16]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.02, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.38, 16]} />
            <meshStandardMaterial color="#020617" />
          </mesh>
        </group>
      ))}

      {/* 3. Top Silkscreen Pin Labels */}
      <Label text="GND" position={[-1.5 * PITCH, 0.33, -1.6]} size={0.22} />
      <Label text="VCC" position={[-0.5 * PITCH, 0.33, -1.6]} size={0.22} />
      <Label text="SCL" position={[0.5 * PITCH, 0.33, -1.6]} size={0.22} />
      <Label text="SDA" position={[1.5 * PITCH, 0.33, -1.6]} size={0.22} />

      {/* 4. 4-Pin Male Header Block at Top Edge (-Z) */}
      <group position={[0, 0.45, -2.3]}>
        {/* Black plastic housing strip */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[4 * PITCH, 0.35, 0.5]} />
          <meshStandardMaterial color="#0f172a" roughness={0.7} />
        </mesh>
        {/* 4 Gold/Silver header pins */}
        {[-1.5, -0.5, 0.5, 1.5].map((mult, idx) => (
          <group key={idx} position={[mult * PITCH, 0, 0]}>
            {/* Upper pin */}
            <mesh position={[0, 0.35, 0]}>
              <boxGeometry args={[0.12, 0.7, 0.12]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
            </mesh>
            {/* Lower pin under board */}
            <mesh position={[0, -0.7, 0]}>
              <boxGeometry args={[0.12, 0.7, 0.12]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} />
            </mesh>
          </group>
        ))}
      </group>

      {/* 5. OLED Glass Frame / Bezel */}
      <mesh position={[0, 0.42, 0.4]} castShadow>
        <boxGeometry args={[4.8, 0.18, 3.4]} />
        <meshStandardMaterial color="#020408" roughness={0.15} metalness={0.3} />
      </mesh>

      {/* 6. Active OLED Emissive Display Surface */}
      <mesh position={[0, 0.52, 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.4, 2.4]} />
        <meshStandardMaterial
          map={texture}
          emissiveMap={texture}
          emissive={isPowered ? "#ffffff" : "#000000"}
          emissiveIntensity={isPowered ? 1.6 : 0}
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>

      {/* Glass Gloss Overlay */}
      <mesh position={[0, 0.53, 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.4, 2.4]} />
        <meshPhysicalMaterial
          transparent
          opacity={0.18}
          roughness={0.05}
          transmission={0.9}
          thickness={0.2}
        />
      </mesh>

      {/* 7. Bottom Flexible Ribbon Cable (Polyimide Amber) */}
      <group position={[0, 0.3, 2.2]}>
        {/* Amber polyimide flexible ribbon */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.2, 0.12, 0.45]} />
          <meshStandardMaterial color="#d97706" roughness={0.3} metalness={0.4} />
        </mesh>
        {/* Black insulation tape overlay strip */}
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[2.4, 0.05, 0.35]} />
          <meshStandardMaterial color="#111827" roughness={0.8} />
        </mesh>
      </group>

      {/* Pin Highlights */}
      {id &&
        oledPins.map((p) => (
          <PinHighlight key={p.id} componentId={id} pin={p} />
        ))}
    </group>
  );
});
