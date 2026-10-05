"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";

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
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.25, 0.62, 0.62]} />
        <meshStandardMaterial color="#27364a" metalness={0.72} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.2, -0.32]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.12, 32]} />
        <meshStandardMaterial color="#0b1320" metalness={0.55} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.2, -0.39]}>
        <sphereGeometry args={[0.075, 24, 16]} />
        <meshPhysicalMaterial color="#2276b9" roughness={0.08} metalness={0.2} clearcoat={1} />
      </mesh>
      <perspectiveCamera
        ref={cameraRef}
        position={[0, 0.2, -0.34]}
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
