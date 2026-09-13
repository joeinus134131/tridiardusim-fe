'use client';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef,useEffect } from 'react';
import type { OrbitControls as Controls } from 'three-stdlib';
import * as THREE from 'three';
import { useSimulatorStore } from '@/store/useSimulatorStore';
export function CameraController(){
 const {camera,invalidate}=useThree();const ref=useRef<Controls>(null);const wiring=useSimulatorStore(s=>s.wiringState.active);const view=useSimulatorStore(s=>s.cameraView);
 useEffect(()=>{camera.position.set(...(view==='top'?[0,38,.01]:view==='front'?[0,8,32]:[0,25,25]) as [number,number,number]);camera.lookAt(0,0,0);ref.current?.target.set(0,0,0);ref.current?.update();invalidate();},[view,camera,invalidate]);
 return <OrbitControls ref={ref} makeDefault enabled={!wiring} enableDamping minDistance={5} maxDistance={160} maxPolarAngle={Math.PI/2-.02} mouseButtons={{LEFT:undefined,MIDDLE:THREE.MOUSE.PAN,RIGHT:THREE.MOUSE.ROTATE}}/>;
}
