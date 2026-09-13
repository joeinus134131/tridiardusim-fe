"use client";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef, useLayoutEffect } from "react";
import type { OrbitControls as Controls } from "three-stdlib";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";
export function CameraController() {
  const { camera, invalidate, size } = useThree();
  const ref = useRef<Controls>(null);
  const wiring = useSimulatorStore((s) => s.wiringState.active);
  const view = useSimulatorStore((s) => s.cameraView);
  const topology = useSimulatorStore(s => s.components.map(c => c.id).join(","));
  useLayoutEffect(() => {
    const components = useSimulatorStore.getState().components;
    const bounds = new THREE.Box3();
    for (const c of components) {
      const half = c.typeId === "arduino_uno" ? [7,3,5.5] : c.typeId === "breadboard" ? [8.4,1.7,5.43] : c.typeId.startsWith("jumper_") ? [4,.5,8] : [2,3,2];
      bounds.expandByPoint(new THREE.Vector3(c.position[0]-half[0],0,c.position[2]-half[2]));
      bounds.expandByPoint(new THREE.Vector3(c.position[0]+half[0],c.position[1]+half[1],c.position[2]+half[2]));
    }
    if(bounds.isEmpty()) bounds.set(new THREE.Vector3(-10,0,-8),new THREE.Vector3(10,3,8));
    const center = bounds.getCenter(new THREE.Vector3());
    const extent = bounds.getSize(new THREE.Vector3());
    const distance = Math.max(extent.x/(size.width/size.height),extent.z,18) / (2*Math.tan(Math.PI/8))*1.25;
    camera.position.set(center.x,center.y+(view === "top" ? distance : view === "front" ? distance*.25 : distance*.75),center.z+(view === "top" ? .01 : view === "front" ? distance : distance*.75));
    camera.lookAt(center);
    ref.current?.target.copy(center);
    ref.current?.update();
    invalidate();
  }, [view, topology, camera, invalidate, size.width, size.height]);

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enabled={!wiring}
      enableDamping
      minDistance={5}
      maxDistance={160}
      maxPolarAngle={Math.PI / 2 - 0.02}
      mouseButtons={{
        LEFT: undefined,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
    />
  );
}
