'use client';

import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { CAMERA_START_POS, CAMERA_START_TARGET } from '@/lib/constants';
import { useSimulatorStore } from '@/store/useSimulatorStore';

interface CameraControllerProps {
  focusTarget?: [number, number, number] | null;
}

export function CameraController({ focusTarget }: CameraControllerProps) {
  const { camera, controls } = useThree();
  const controlsRef = useRef<any>(null);
  const wiringState = useSimulatorStore(state => state.wiringState);

  useEffect(() => {
    // Initial camera setup
    camera.position.set(...CAMERA_START_POS);
    camera.lookAt(...CAMERA_START_TARGET);
    if (controlsRef.current) {
      controlsRef.current.target.set(...CAMERA_START_TARGET);
      controlsRef.current.update();
    }
  }, [camera]);

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!wiringState.active}
      enableDamping
      dampingFactor={0.05}
      minDistance={10}
      maxDistance={200}
      maxPolarAngle={Math.PI / 2 - 0.05} // Don't go below ground
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      }}
    />
  );
}
