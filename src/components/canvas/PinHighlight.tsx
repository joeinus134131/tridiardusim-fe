"use client";
import { useState, memo, useCallback } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { PinDefinition } from "@/lib/components/componentTypes";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { getPinWorldPosition } from "@/lib/components/wiringUtils";

// Shared geometries
const standardPinGeo = new THREE.SphereGeometry(0.2, 10, 8);
const snappedPinGeo = new THREE.SphereGeometry(0.3, 12, 10);
const invisibleHitGeo = new THREE.SphereGeometry(0.55, 8, 6);
const snapRingGeo = new THREE.RingGeometry(0.32, 0.45, 16);

export const PinHighlight = memo(function PinHighlight({
  componentId,
  pin,
}: {
  componentId: string;
  pin: PinDefinition;
}) {
  const [hover, setHover] = useState(false);

  // Specific primitive selectors avoid unneeded re-renders
  const isWiringActive = useSimulatorStore((s) => s.wiringState.active);
  const isSource = useSimulatorStore(
    (s) =>
      s.wiringState.sourceComponentId === componentId &&
      s.wiringState.sourcePinId === pin.id,
  );
  const isSnapped = useSimulatorStore(
    (s) =>
      s.wiringState.snappedPin?.componentId === componentId &&
      s.wiringState.snappedPin?.pinId === pin.id,
  );

  const handleClick = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      const s = useSimulatorStore.getState();
      if (s.wiringState.active) {
        s.finishWiring(componentId, pin.id);
      } else {
        s.startWiring(componentId, pin.id);
      }
    },
    [componentId, pin.id],
  );

  const handlePointerOver = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      setHover(true);
      const s = useSimulatorStore.getState();
      if (s.wiringState.active && !isSource) {
        const comp = s.components.find((c) => c.id === componentId);
        if (comp) {
          const worldPos = getPinWorldPosition(comp, pin.position);
          s.setSnappedPin({
            componentId,
            componentName: comp.name,
            pinId: pin.id,
            pinName: pin.name,
            position: worldPos,
          });
          s.updateWiringTarget(worldPos);
        }
      }
    },
    [componentId, pin, isSource],
  );

  const handlePointerOut = useCallback(() => {
    setHover(false);
  }, []);

  // Visual cues
  const activeColor = isSource
    ? "#fbbf24"
    : isSnapped
      ? "#10b981"
      : hover
        ? "#38bdf8"
        : "#94c8ff";

  const opacity = isSource || isSnapped
    ? 0.95
    : hover
      ? 0.9
      : isWiringActive
        ? 0.5
        : 0;

  const currentGeo = isSnapped || isSource ? snappedPinGeo : standardPinGeo;

  return (
    <group position={pin.position}>
      {/* 1. Large invisible hit area for effortless clicking and hover */}
      <mesh
        geometry={invisibleHitGeo}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={handleClick}
        visible={false}
      />

      {/* 2. Visual Pin Indicator */}
      <mesh
        geometry={currentGeo}
        onClick={handleClick}
      >
        <meshStandardMaterial
          color={activeColor}
          emissive={activeColor}
          emissiveIntensity={isSnapped ? 0.8 : isSource ? 0.6 : 0.25}
          transparent
          opacity={opacity}
          depthTest={!isSource && !isSnapped && !hover}
          roughness={0.3}
        />
      </mesh>

      {/* 3. Glowing Snap Target Ring */}
      {isSnapped && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={snapRingGeo}>
          <meshBasicMaterial
            color="#10b981"
            transparent
            opacity={0.85}
            side={THREE.DoubleSide}
            depthTest={false}
          />
        </mesh>
      )}

      {/* Compact terminal label */}
      {(hover || isSnapped || isSource) && (
        <Html
          center
          position={[0, 0.45, 0]}
          style={{
            pointerEvents: "none",
            whiteSpace: "nowrap",
            background: "#0d1829",
            color: "white",
            fontSize: 11,
            fontWeight: 500,
            padding: "3px 8px",
            borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            transform: "translateY(-10px)",
            transition: "all 0.15s ease",
          }}
        >
          <span>{pin.name}</span>
        </Html>
      )}
    </group>
  );
});
