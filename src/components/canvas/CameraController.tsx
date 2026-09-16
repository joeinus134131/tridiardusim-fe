"use client";
import { worldBounds } from "@/lib/components/placement";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef, useLayoutEffect, useState, useEffect, useMemo } from "react";
import type { OrbitControls as Controls } from "three-stdlib";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";

export function CameraController() {
  const { camera, invalidate, size } = useThree();
  const ref = useRef<Controls>(null);
  const wiring = useSimulatorStore((s) => s.wiringState.active);
  const view = useSimulatorStore((s) => s.cameraView);
  const cameraMode = useSimulatorStore((s) => s.cameraMode);
  const prevView = useRef<string | null>(null);

  const [isPanKeyActive, setIsPanKeyActive] = useState(false);

  // Allow temporary pan mode by holding Spacebar or Shift key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === "Space" || e.key === "Shift") {
        setIsPanKeyActive(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "Shift") {
        setIsPanKeyActive(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useLayoutEffect(() => {
    // Only re-position camera if view explicitly changes or on initial mount
    if (prevView.current === view) return;
    prevView.current = view;

    const components = useSimulatorStore.getState().components;
    const bounds = new THREE.Box3();
    for (const c of components) {
      const b = worldBounds(c);
      bounds.expandByPoint(new THREE.Vector3(...b.min));
      bounds.expandByPoint(new THREE.Vector3(...b.max));
    }
    if (bounds.isEmpty()) {
      bounds.set(new THREE.Vector3(-10, 0, -8), new THREE.Vector3(10, 3, 8));
    }
    const center = bounds.getCenter(new THREE.Vector3());
    const extent = bounds.getSize(new THREE.Vector3());
    const distance =
      Math.max(extent.x / (size.width / size.height), extent.z, 18) /
      (2 * Math.tan(Math.PI / 8)) *
      1.25;

    if (view === "top") {
      camera.position.set(center.x, center.y + distance, center.z + 0.001);
    } else if (view === "front") {
      camera.position.set(center.x, center.y + distance * 0.25, center.z + distance);
    } else {
      camera.position.set(
        center.x + distance * 0.5,
        center.y + distance * 0.75,
        center.z + distance * 0.75
      );
    }
    camera.lookAt(center);
    if (ref.current) {
      ref.current.target.copy(center);
      ref.current.update();
    }
    invalidate();
  }, [view, camera, invalidate, size.width, size.height]);

  const isPan = cameraMode === "pan" || isPanKeyActive;

  const mouseButtons = useMemo(
    () =>
      isPan
        ? {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE,
          }
        : {
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
          },
    [isPan]
  );

  const touches = useMemo(
    () =>
      isPan
        ? {
            ONE: THREE.TOUCH.PAN,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }
        : {
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
          },
    [isPan]
  );

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enabled={!wiring}
      enableDamping
      dampingFactor={0.08}
      screenSpacePanning={true}
      rotateSpeed={0.9}
      panSpeed={1.8}
      zoomSpeed={1.2}
      minDistance={2}
      maxDistance={350}
      maxPolarAngle={Math.PI / 2 - 0.01}
      mouseButtons={mouseButtons}
      touches={touches}
    />
  );
}
