"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { CircuitComponent } from "@/lib/components/componentTypes";
import { forwardKinematics } from "@/lib/robotics/kinematics";
import { aeroArm6Dof, eduArm3Dof } from "@/lib/robotics/robots";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { PinHighlight } from "@/components/canvas/PinHighlight";
import { Label } from "./Label";

function seedFromId(id: string) {
  let seed = 2166136261;
  for (let i = 0; i < id.length; i++) seed = Math.imul(seed ^ id.charCodeAt(i), 16777619);
  return seed >>> 0;
}

function gaussianNoise(seed: number, count: number, deviation: number) {
  let state = (seed + Math.imul(count + 1, 0x6d2b79f5)) >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const u1 = Math.max(Number.EPSILON, random());
  const u2 = random();
  return deviation * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function sourcePose(
  source: CircuitComponent | undefined,
  fallback: CircuitComponent,
) {
  if (!source) {
    return {
      position: new THREE.Vector3(...fallback.position),
      quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(...fallback.rotation, "XYZ")),
    };
  }
  if (source.typeId === "rover_bot_4wd") {
    return {
      position: new THREE.Vector3(Number(source.state.x) || 0, 0, Number(source.state.z) || 0),
      quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Number(source.state.heading) || 0, 0, "XYZ")),
    };
  }

  const robot = source.typeId === "aero_arm_6dof" ? aeroArm6Dof : source.typeId === "edu_arm_3dof" ? eduArm3Dof : null;
  if (!robot) {
    return {
      position: new THREE.Vector3(...source.position),
      quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(...source.rotation, "XYZ")),
    };
  }
  const angles = robot.joints.map((_, index) => Number(source.state[`joint${index}`]) || 0);
  const pose = forwardKinematics(robot.joints, angles, robot.home);
  const baseQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...source.rotation, "XYZ"));
  const localRotation = new THREE.Matrix4().set(
    pose[0], pose[1], pose[2], 0,
    pose[4], pose[5], pose[6], 0,
    pose[8], pose[9], pose[10], 0,
    0, 0, 0, 1,
  );
  const localQuaternion = new THREE.Quaternion().setFromRotationMatrix(localRotation);
  const position = new THREE.Vector3(pose[3], pose[7], pose[11]).applyQuaternion(baseQuaternion);
  position.add(new THREE.Vector3(...source.position));
  return { position, quaternion: baseQuaternion.multiply(localQuaternion) };
}

export function ImuSensor({ id }: { id: string }) {
  const component = useSimulatorStore((state) => state.components.find((item) => item.id === id));
  const components = useSimulatorStore((state) => state.components);
  const elapsedMs = useSimulatorStore((state) => state.elapsedMs);
  const sourceId = String(component?.state.sourceComponentId ?? "");
  const previousTime = useRef<number | null>(null);
  const previousPosition = useRef(new THREE.Vector3());
  const previousQuaternion = useRef(new THREE.Quaternion());
  const previousVelocity = useRef(new THREE.Vector3());
  const sampleCount = useRef(0);
  const lastSampleMs = useRef(Number.NEGATIVE_INFINITY);
  const lastConfigKey = useRef("");
  const lastSourceId = useRef(sourceId);
  const seed = useMemo(() => seedFromId(id), [id]);
  const sampleRate = Math.max(1, Math.min(100, Number(component?.state.sampleRateHz) || 100));
  const accelNoise = Math.max(0, Math.min(2, Number(component?.state.accelNoise) || 0));
  const gyroNoise = Math.max(0, Math.min(0.2, Number(component?.state.gyroNoise) || 0));

  useFrame(() => {
    if (!component) return;
    const configKey = `${component.position.join(",")}|${component.rotation.join(",")}|${sourceId}|${sampleRate}|${accelNoise}|${gyroNoise}`;
    if (elapsedMs - lastSampleMs.current < 1000 / sampleRate && configKey === lastConfigKey.current) return;
    if (lastSourceId.current !== sourceId) {
      previousTime.current = null;
      previousVelocity.current.set(0, 0, 0);
      lastSourceId.current = sourceId;
    }
    const source = components.find((item) => item.id === sourceId);
    const pose = sourcePose(source, component);
    const accelerationWorld = new THREE.Vector3();
    const angularVelocityBody = new THREE.Vector3();
    const dt = previousTime.current === null ? 0 : (elapsedMs - previousTime.current) / 1000;

    if (dt > 0 && dt <= 1) {
      const velocity = pose.position.clone().sub(previousPosition.current).divideScalar(dt);
      accelerationWorld.copy(velocity).sub(previousVelocity.current).divideScalar(dt);
      previousVelocity.current.copy(velocity);

      const delta = previousQuaternion.current.clone().invert().multiply(pose.quaternion).normalize();
      const angle = 2 * Math.acos(Math.max(-1, Math.min(1, delta.w)));
      const axisScale = Math.sqrt(Math.max(0, 1 - delta.w * delta.w));
      if (axisScale > 1e-8) {
        angularVelocityBody.set(delta.x / axisScale, delta.y / axisScale, delta.z / axisScale).multiplyScalar(angle / dt);
      }
    } else {
      previousVelocity.current.set(0, 0, 0);
    }

    previousTime.current = elapsedMs;
    previousPosition.current.copy(pose.position);
    previousQuaternion.current.copy(pose.quaternion);

    // An accelerometer measures specific force: world acceleration minus gravity, in sensor axes.
    const accelerationBody = accelerationWorld.sub(new THREE.Vector3(0, -9.80665, 0)).applyQuaternion(pose.quaternion.clone().invert());
    const count = sampleCount.current++;
    const accelerationMps2: [number, number, number] = [0, 1, 2].map((axis) =>
      accelerationBody.getComponent(axis) + gaussianNoise(seed + axis, count, accelNoise),
    ) as [number, number, number];
    const angularVelocityRadS: [number, number, number] = [0, 1, 2].map((axis) =>
      angularVelocityBody.getComponent(axis) + gaussianNoise(seed + axis + 3, count, gyroNoise),
    ) as [number, number, number];

    useSimulatorStore.getState().setImuFrame(id, {
      accelerationMps2,
      angularVelocityRadS,
      sampleCount: count + 1,
      capturedAtSimMs: elapsedMs,
      sourceComponentId: source?.id ?? "",
    });
    lastSampleMs.current = elapsedMs;
    lastConfigKey.current = configKey;
  }, -1);

  return (
    <group>
      {/* GY-521 breakout board, nominal 20.3 x 15.25 mm. */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.06, 0.16, 3.05]} />
        <meshStandardMaterial color="#176b62" metalness={0.25} roughness={0.52} />
      </mesh>
      <mesh position={[0, 0.2, 0.05]} castShadow>
        <boxGeometry args={[0.8, 0.18, 0.8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.25} roughness={0.35} />
      </mesh>
      {/* Low-noise 3.3 V regulator and decoupling parts. */}
      <mesh position={[-1.38, 0.2, 0.38]}><boxGeometry args={[0.38, 0.12, 0.28]} /><meshStandardMaterial color="#111827" metalness={0.28} roughness={0.4} /></mesh>
      {[-0.88, 0.92, 1.42].map((x, index) => <mesh key={x} position={[x, 0.19, index % 2 ? 0.82 : 0.45]}><boxGeometry args={[0.18, 0.08, 0.14]} /><meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} /></mesh>)}
      {/* Eight-pin 0.1 inch header along the board's short edge. */}
      {Array.from({ length: 8 }, (_, index) => {
        const x = -1.778 + index * 0.508;
        const pinLabels = ["VCC", "GND", "SCL", "SDA", "XDA", "XCL", "AD0", "INT"];
        return <group key={index} position={[x, 0.31, -1.4]}>
          <mesh><boxGeometry args={[0.22, 0.22, 0.22]} /><meshStandardMaterial color="#111827" /></mesh>
          <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.045, 0.045, 0.28, 8]} /><meshStandardMaterial color="#d4a843" metalness={0.82} roughness={0.22} /></mesh>
          <Label text={pinLabels[index]} position={[0, -0.13, 0.36]} size={0.065} color="#e5e7eb" />
        </group>;
      })}
      {/* X/Y/Z axes, shown as a compact silkscreen orientation mark. */}
      {[[1.45, "#ef4444"], [1.65, "#22c55e"], [1.85, "#3b82f6"]].map(([x, color]) => (
        <mesh key={String(x)} position={[Number(x), 0.175, -0.48]}><boxGeometry args={[0.1, 0.018, 0.46]} /><meshBasicMaterial color={String(color)} /></mesh>
      ))}
      <mesh position={[0.72, 0.2, 0.78]}>
        <sphereGeometry args={[0.035, 12, 8]} />
        <meshStandardMaterial color="#f59e0b" emissive="#78350f" />
      </mesh>
      <mesh position={[0, 0.205, 0]}><boxGeometry args={[0.26, 0.025, 0.22]} /><meshBasicMaterial color="#e2e8f0" /></mesh>
      {component?.pins.map((pin) => <PinHighlight key={pin.id} componentId={id} pin={pin} />)}
    </group>
  );
}
