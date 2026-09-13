"use client";
import { memo } from "react";
import * as THREE from "three";

const textureCache = new Map<string, THREE.CanvasTexture>();

function getOrCreateTexture(text: string, color: string): THREE.CanvasTexture {
  const key = `${text}_${color}`;
  let texture = textureCache.get(key);
  if (!texture && typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 32;
    const c = canvas.getContext("2d");
    if (c) {
      c.font = "bold 22px Arial, sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = color;
      c.fillText(text, 128, 16);
    }
    texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    textureCache.set(key, texture);
  }
  return texture!;
}

export const Label = memo(function Label({
  text,
  position,
  size = 0.2,
  color = "#ffffff",
  rotation = 0,
}: {
  text: string;
  position: [number, number, number];
  size?: number;
  color?: string;
  rotation?: number;
}) {
  const texture = getOrCreateTexture(text, color);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, rotation]}>
      <planeGeometry args={[size * 8, size]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
});
