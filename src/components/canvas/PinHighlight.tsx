"use client";
import { useState, memo, useCallback } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { PinDefinition } from "@/lib/components/componentTypes";
import { useSimulatorStore } from "@/store/useSimulatorStore";

// Shared geometry across all pin highlights to prevent geometry recreation
const pinGeometry = new THREE.SphereGeometry(0.19, 8, 6);

export const PinHighlight = memo(function PinHighlight({
  componentId,
  pin,
}: {
  componentId: string;
  pin: PinDefinition;
}) {
  const [hover, setHover] = useState(false);

  // Specific primitive selectors avoid re-rendering on mousemove (currentTargetPos updates)
  const isWiringActive = useSimulatorStore((s) => s.wiringState.active);
  const isSource = useSimulatorStore(
    (s) =>
      s.wiringState.sourceComponentId === componentId &&
      s.wiringState.sourcePinId === pin.id,
  );
  const isSelected = useSimulatorStore(
    (s) => s.selectedComponentId === componentId,
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

  const opacity =
    isSource || hover ? 0.9 : isSelected || isWiringActive ? 0.28 : 0;
  const color = isSource ? "#fbbf24" : hover ? "#5eead4" : "#94c8ff";

  return (
    <group position={pin.position}>
      <mesh
        geometry={pinGeometry}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={handleClick}
      >
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthTest={false}
        />
      </mesh>
      {hover && (
        <Html
          center
          position={[0, 0.4, 0]}
          style={{
            pointerEvents: "none",
            whiteSpace: "nowrap",
            background: "#0d1829",
            color: "white",
            fontSize: 11,
            padding: "3px 6px",
            borderRadius: 4,
          }}
        >
          {pin.name}
        </Html>
      )}
    </group>
  );
});
