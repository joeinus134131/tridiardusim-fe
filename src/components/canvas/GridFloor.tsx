"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import * as THREE from "three";
import { useMemo } from "react";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { useTheme } from "next-themes";

export function GridFloor() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const isWiringActive = useSimulatorStore((state) => state.wiringState.active);
  const updateWiringTarget = useSimulatorStore(
    (state) => state.updateWiringTarget,
  );
  const cancelWiring = useSimulatorStore((state) => state.cancelWiring);

  const surfaceMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isLight ? "#f1f5f9" : "#1a2035",
        roughness: 0.95,
        metalness: 0.05,
      }),
    [isLight],
  );

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (isWiringActive) {
      e.stopPropagation();
      updateWiringTarget([e.point.x, e.point.y, e.point.z]);
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (isWiringActive) {
      e.stopPropagation();
      cancelWiring();
    }
  };

  return (
    <group>
      {/* Invisible plane for dragging raycasts. We use a larger plane to catch all pointer movements */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerUp}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Work surface (dark desk) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        receiveShadow
        material={surfaceMaterial}
      >
        <planeGeometry args={[200, 200]} />
      </mesh>

      {/* Grid overlay */}
      <Grid
        position={[0, -0.01, 0]}
        args={[60, 60]}
        cellSize={0.5}
        cellThickness={isLight ? 0.8 : 0.6}
        cellColor={isLight ? "#cbd5e1" : "#253050"}
        sectionSize={5}
        sectionThickness={isLight ? 1.2 : 1}
        sectionColor={isLight ? "#94a3b8" : "#334170"}
        fadeDistance={isLight ? 60 : 50}
        fadeStrength={1.5}
        infiniteGrid
      />
    </group>
  );
}
