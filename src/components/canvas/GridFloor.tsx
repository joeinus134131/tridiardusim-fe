'use client';

import { Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo } from 'react';
import { useSimulatorStore } from '@/store/useSimulatorStore';

export function GridFloor() {
  const wiringState = useSimulatorStore((state) => state.wiringState);
  const updateWiringTarget = useSimulatorStore((state) => state.updateWiringTarget);
  const cancelWiring = useSimulatorStore((state) => state.cancelWiring);

  const surfaceMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#1a2035',
    roughness: 0.95,
    metalness: 0.05,
  }), []);

  const handlePointerMove = (e: any) => {
    if (wiringState.active) {
      e.stopPropagation();
      updateWiringTarget([e.point.x, e.point.y, e.point.z]);
    }
  };

  const handlePointerUp = (e: any) => {
    if (wiringState.active) {
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
        onPointerUp={handlePointerUp}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Work surface (dark desk) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow material={surfaceMaterial}>
        <planeGeometry args={[200, 200]} />
      </mesh>

      {/* Grid overlay */}
      <Grid
        position={[0, -0.01, 0]}
        args={[60, 60]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#253050"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#334170"
        fadeDistance={50}
        fadeStrength={1.5}
        infiniteGrid
      />
    </group>
  );
}
