"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { Label } from "./Label";

const DEPTH_VERTEX = `
  varying float vViewDepth;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDepth = -viewPosition.z;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const DEPTH_FRAGMENT = `
  uniform float uFar;
  varying float vViewDepth;
  void main() {
    float depth = clamp(vViewDepth / uFar, 0.0, 1.0);
    vec3 encoded = fract(depth * vec3(1.0, 255.0, 65025.0));
    encoded -= encoded.yzz * vec3(1.0 / 255.0, 1.0 / 255.0, 0.0);
    gl_FragColor = vec4(encoded, 1.0);
  }
`;

export function RGBDCameraSensor({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((item) => item.id === id));
  const elapsedMs = useSimulatorStore((state) => state.elapsedMs);
  const lastCaptureMs = useRef(Number.NEGATIVE_INFINITY);
  const lastPose = useRef("");
  const captureSequence = useRef(0);
  const width = Math.max(64, Math.min(640, Math.trunc(Number(component?.state.width) || 320)));
  const height = Math.max(48, Math.min(480, Math.trunc(Number(component?.state.height) || 240)));
  const fov = Math.max(30, Math.min(110, Number(component?.state.fov) || 70));
  const near = Math.max(0.05, Math.min(2, Number(component?.state.near) || 0.1));
  const far = Math.max(near + 1, Math.min(100, Number(component?.state.far) || 30));

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const depthMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const colorTarget = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });
    target.texture.colorSpace = THREE.SRGBColorSpace;
    return target;
  }, [height, width]);
  const depthTarget = useMemo(() => new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: true,
    stencilBuffer: false,
  }), [height, width]);
  const depthMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uFar: { value: far } },
    vertexShader: DEPTH_VERTEX,
    fragmentShader: DEPTH_FRAGMENT,
    depthTest: true,
    depthWrite: true,
    toneMapped: false,
  }), [far]);

  useEffect(() => () => {
    colorTarget.dispose();
    depthTarget.dispose();
    depthMaterial.dispose();
  }, [colorTarget, depthMaterial, depthTarget]);

  useFrame(({ gl, scene }) => {
    if (!component) return;
    const poseKey = `${component.position.join(",")}|${component.rotation.join(",")}|${width}|${height}|${fov}|${near}|${far}`;
    const poseChanged = lastPose.current !== poseKey;
    if (elapsedMs - lastCaptureMs.current < 100 && !poseChanged) return;

    const sensorCamera = cameraRef.current;
    const sensorDepthMaterial = depthMaterialRef.current;
    if (!sensorCamera || !sensorDepthMaterial) return;
    sensorCamera.fov = fov;
    sensorCamera.near = near;
    sensorCamera.far = far;
    sensorCamera.aspect = width / height;
    sensorCamera.updateProjectionMatrix();
    sensorCamera.updateWorldMatrix(true, false);
    sensorDepthMaterial.uniforms.uFar.value = far;

    const rgba = new Uint8Array(width * height * 4);
    const packedDepth = new Uint8Array(width * height * 4);
    const depthMeters = new Float32Array(width * height);
    const previousTarget = gl.getRenderTarget();
    const previousOverride = scene.overrideMaterial;
    const previousClear = gl.getClearColor(new THREE.Color()).clone();
    const previousClearAlpha = gl.getClearAlpha();
    try {
      gl.setRenderTarget(colorTarget);
      gl.setClearColor(0x000000, 0);
      gl.clear(true, true, true);
      gl.render(scene, sensorCamera);
      gl.readRenderTargetPixels(colorTarget, 0, 0, width, height, rgba);

      gl.setRenderTarget(depthTarget);
      gl.setClearColor(0xffffff, 1);
      gl.clear(true, true, true);
      scene.overrideMaterial = sensorDepthMaterial;
      gl.render(scene, sensorCamera);
      gl.readRenderTargetPixels(depthTarget, 0, 0, width, height, packedDepth);
      for (let pixel = 0; pixel < depthMeters.length; pixel++) {
        const offset = pixel * 4;
        const normalized = Math.min(1, packedDepth[offset] / 255 + packedDepth[offset + 1] / 65025 + packedDepth[offset + 2] / 16581375);
        depthMeters[pixel] = normalized * far;
      }
    } finally {
      scene.overrideMaterial = previousOverride;
      gl.setRenderTarget(previousTarget);
      gl.setClearColor(previousClear, previousClearAlpha);
    }

    useSimulatorStore.getState().setRGBDFrame(id, {
      width,
      height,
      rgba,
      depthMeters,
      sampleCount: ++captureSequence.current,
      capturedAtSimMs: elapsedMs,
      intrinsics: {
        fx: height / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2)),
        fy: height / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2)),
        cx: width / 2,
        cy: height / 2,
      },
      near,
      far,
    });
    lastCaptureMs.current = elapsedMs;
    lastPose.current = poseKey;
  }, -1);

  return (
    <group>
      {/* D435 nominal housing: 90 x 25 x 25 mm at 5 mm per scene unit. */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[18, 5, 5]} />
        <meshStandardMaterial color="#27364a" metalness={0.62} roughness={0.38} />
      </mesh>
      {/* Front fascia and inset optical panel separate the glass apertures from the case. */}
      <RoundedBox args={[17.3, 4.35, 0.18]} radius={0.24} smoothness={3} position={[0, 0.08, -2.47]}>
        <meshStandardMaterial color="#172334" metalness={0.45} roughness={0.3} />
      </RoundedBox>
      {[-1, 1].flatMap((x) => [-1, 1].map((y) => <mesh key={`front-screw:${x}:${y}`} position={[x * 8.12, y * 1.82, -2.575]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.045, 10]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.88} roughness={0.2} />
      </mesh>))}
      {[
        [-5.0, 0.4, "#121a27", 0.46], // Left IR imager
        [0, 0.4, "#312e81", 0.36], // Pattern projector
        [5.0, 0.4, "#121a27", 0.46], // Right IR imager
        [0, -0.9, "#111827", 0.38], // RGB imager, below the IR baseline
      ].map(([x, y, color, radius]) => (
        <group key={String(x) + String(y)} position={[Number(x), Number(y), -2.38]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[Number(radius) + 0.16, Number(radius) + 0.16, 0.3, 28]} />
            <meshStandardMaterial color="#111827" metalness={0.72} roughness={0.22} />
          </mesh>
          <mesh position={[0, 0.035, -0.18]}>
            <sphereGeometry args={[Number(radius), 24, 16]} />
            <meshPhysicalMaterial color={String(color)} roughness={0.08} metalness={0.18} clearcoat={1} />
          </mesh>
        </group>
      ))}
      {/* Three underside threaded mounts: two M3 and one 1/4-20. */}
      {[-1.5, 1.5].map((x) => <group key={x} position={[x, -2.56, 0.1]}><mesh><cylinderGeometry args={[0.3, 0.3, 0.12, 20]} /><meshStandardMaterial color="#94a3b8" metalness={0.78} roughness={0.28} /></mesh><mesh position={[0, -0.07, 0]}><cylinderGeometry args={[0.11, 0.11, 0.02, 16]} /><meshStandardMaterial color="#111827" /></mesh></group>)}
      <group position={[0, -2.56, 0.1]}><mesh><cylinderGeometry args={[0.48, 0.48, 0.12, 24]} /><meshStandardMaterial color="#94a3b8" metalness={0.78} roughness={0.28} /></mesh><mesh position={[0, -0.07, 0]}><cylinderGeometry args={[0.22, 0.22, 0.02, 18]} /><meshStandardMaterial color="#111827" /></mesh></group>
      {/* Side ventilation and top identification marks found on the D435 family housing. */}
      {[-1, 1].flatMap((side) => Array.from({ length: 7 }, (_, index) => <mesh key={`vent:${side}:${index}`} position={[side * 9.02, -0.4 + index * 0.15, 0.65]}>
        <boxGeometry args={[0.035, 0.055, 1.05]} />
        <meshStandardMaterial color="#101923" roughness={0.82} />
      </mesh>))}
      <Label text="Intel RealSense D435" position={[0, 2.53, 0.35]} size={0.22} color="#dbeafe" />
      <mesh position={[-7.7, 2.53, 1.55]}><boxGeometry args={[0.5, 0.035, 0.5]} /><meshStandardMaterial color="#64748b" metalness={0.45} roughness={0.42} /></mesh>
      {/* USB-C connector on the rear face. */}
      <group position={[0, 0.1, 2.55]}><mesh><boxGeometry args={[1.15, 0.68, 0.44]} /><meshStandardMaterial color="#cbd5e1" metalness={0.82} roughness={0.24} /></mesh><mesh position={[0, 0, 0.23]}><boxGeometry args={[0.72, 0.32, 0.04]} /><meshStandardMaterial color="#111827" /></mesh></group>
      <perspectiveCamera
        ref={cameraRef}
        position={[0, 0.4, -2.62]}
        fov={fov}
        near={near}
        far={far}
        aspect={width / height}
      />
      <mesh visible={false}>
        <sphereGeometry args={[0.001, 4, 4]} />
        <primitive object={depthMaterial} ref={depthMaterialRef} attach="material" />
      </mesh>
    </group>
  );
}
