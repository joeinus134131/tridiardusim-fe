"use client";

import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { PinHighlight } from "@/components/canvas/PinHighlight";

interface ServoProps {
  id: string;
}

export function ServoMotor({ id }: ServoProps) {
  const component = useSimulatorStore((state) =>
    state.components.find((c) => c.id === id),
  );

  const hornRef = useRef<THREE.Group>(null);
  const currentAngleRef = useRef<number>(
    typeof component?.state?.angle === "number" ? component.state.angle : 90,
  );

  const targetAngle =
    typeof component?.state?.angle === "number" ? component.state.angle : 90;
  const isPowered = component?.state?.isPowered !== false;
  const hornType = (component?.state?.hornType as string) || "single";

  // Smooth rotation physics in animation loop
  useFrame((_, delta) => {
    if (!hornRef.current) return;
    const target = Math.max(0, Math.min(180, targetAngle));

    if (isPowered) {
      // SG90 speed: ~600 deg/sec = ~10 deg per frame at 60fps
      const maxStep = 600 * delta;
      const diff = target - currentAngleRef.current;
      if (Math.abs(diff) <= maxStep) {
        currentAngleRef.current = target;
      } else {
        currentAngleRef.current += Math.sign(diff) * maxStep;
      }
    }

    // 0 deg is left (-90 deg offset), 90 deg is center (0), 180 deg is right (+90 deg)
    hornRef.current.rotation.y = THREE.MathUtils.degToRad(
      currentAngleRef.current - 90,
    );
  });

  // Materials
  const materials = useMemo(
    () => ({
      casing: new THREE.MeshPhysicalMaterial({
        color: "#1e6091",
        transmission: 0.6,
        opacity: 0.88,
        transparent: true,
        roughness: 0.25,
        metalness: 0.1,
        clearcoat: 0.5,
      }),
      solidPlastic: new THREE.MeshStandardMaterial({
        color: "#0f4c81",
        roughness: 0.35,
        metalness: 0.15,
      }),
      nylonHorn: new THREE.MeshStandardMaterial({
        color: "#f8fafc",
        roughness: 0.4,
        metalness: 0.05,
      }),
      screwBrass: new THREE.MeshStandardMaterial({
        color: "#d4af37",
        roughness: 0.2,
        metalness: 0.8,
      }),
      cableBrown: new THREE.MeshStandardMaterial({
        color: "#451a03",
        roughness: 0.6,
      }),
      cableRed: new THREE.MeshStandardMaterial({
        color: "#dc2626",
        roughness: 0.6,
      }),
      cableOrange: new THREE.MeshStandardMaterial({
        color: "#ea580c",
        roughness: 0.6,
      }),
      blackHousing: new THREE.MeshStandardMaterial({
        color: "#18181b",
        roughness: 0.4,
      }),
      metalPin: new THREE.MeshStandardMaterial({
        color: "#e2e8f0",
        metalness: 0.9,
        roughness: 0.1,
      }),
    }),
    [],
  );

  return (
    <group>
      {/* ─── INTERACTIVE PIN HIGHLIGHTS (Wiring Terminals) ─── */}
      {component?.pins.map((p) => (
        <PinHighlight key={p.id} componentId={id} pin={p} />
      ))}

      {/* ─── PHYSICAL SERVO ASSEMBLY ─── */}
      <group position={[0, 1.2, 0]}>
        {/* ─── MAIN SERVO BODY (SG90 translucent blue casing) ─── */}
        {/* Lower motor & gear box */}
      <mesh material={materials.casing} position={[0, 0, 0]}>
        <boxGeometry args={[4.5, 2.4, 2.4]} />
      </mesh>

      {/* Center case seam band */}
      <mesh material={materials.solidPlastic} position={[0, 0, 0]}>
        <boxGeometry args={[4.55, 0.15, 2.45]} />
      </mesh>

      {/* Top Gear Tower Step 1 */}
      <mesh material={materials.casing} position={[0.7, 1.45, 0]}>
        <boxGeometry args={[2.7, 0.5, 2.2]} />
      </mesh>

      {/* Top Gear Dome Step 2 (Over output spline) */}
      <mesh
        material={materials.casing}
        position={[1.2, 1.8, 0]}
        rotation={[0, 0, 0]}
      >
        <cylinderGeometry args={[1.0, 1.05, 0.4, 24]} />
      </mesh>

      {/* Idler Gear Dome (Smaller back hump) */}
      <mesh material={materials.casing} position={[-0.1, 1.75, 0]}>
        <cylinderGeometry args={[0.65, 0.7, 0.3, 20]} />
      </mesh>

      {/* Output Spline Brass Shaft Center */}
      <mesh material={materials.screwBrass} position={[1.2, 2.05, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.25, 16]} />
      </mesh>

      {/* Center Retaining Screw */}
      <mesh material={materials.screwBrass} position={[1.2, 2.25, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.08, 12]} />
      </mesh>

      {/* ─── SIDE MOUNTING EARS (With 2 screw holes each) ─── */}
      {/* Left Mounting Ear */}
      <group position={[-2.75, 0.7, 0]}>
        <mesh material={materials.casing}>
          <boxGeometry args={[1.0, 0.2, 2.3]} />
        </mesh>
        {/* Left Screw Hole 1 */}
        <mesh position={[-0.1, 0, -0.6]} material={materials.solidPlastic}>
          <cylinderGeometry args={[0.18, 0.18, 0.25, 12]} />
        </mesh>
        {/* Left Screw Hole 2 */}
        <mesh position={[-0.1, 0, 0.6]} material={materials.solidPlastic}>
          <cylinderGeometry args={[0.18, 0.18, 0.25, 12]} />
        </mesh>
      </group>

      {/* Right Mounting Ear */}
      <group position={[2.75, 0.7, 0]}>
        <mesh material={materials.casing}>
          <boxGeometry args={[1.0, 0.2, 2.3]} />
        </mesh>
        {/* Right Screw Hole 1 */}
        <mesh position={[0.1, 0, -0.6]} material={materials.solidPlastic}>
          <cylinderGeometry args={[0.18, 0.18, 0.25, 12]} />
        </mesh>
        {/* Right Screw Hole 2 */}
        <mesh position={[0.1, 0, 0.6]} material={materials.solidPlastic}>
          <cylinderGeometry args={[0.18, 0.18, 0.25, 12]} />
        </mesh>
      </group>

      {/* ─── DYNAMIC ROTATING SERVO HORN (Lengan Putar 0°-180°) ─── */}
      <group position={[1.2, 2.15, 0]} ref={hornRef}>
        {/* Hub Disc */}
        <mesh material={materials.nylonHorn} position={[0, 0, 0]}>
          <cylinderGeometry args={[0.55, 0.55, 0.16, 24]} />
        </mesh>

        {/* Horn Arm Styles */}
        {hornType === "cross" ? (
          // 4-Point Cross Horn
          <>
            <mesh material={materials.nylonHorn} position={[1.2, 0, 0]}>
              <boxGeometry args={[2.0, 0.14, 0.45]} />
            </mesh>
            <mesh material={materials.nylonHorn} position={[-1.2, 0, 0]}>
              <boxGeometry args={[2.0, 0.14, 0.45]} />
            </mesh>
            <mesh material={materials.nylonHorn} position={[0, 0, 1.2]}>
              <boxGeometry args={[0.45, 0.14, 2.0]} />
            </mesh>
            <mesh material={materials.nylonHorn} position={[0, 0, -1.2]}>
              <boxGeometry args={[0.45, 0.14, 2.0]} />
            </mesh>
          </>
        ) : hornType === "double" ? (
          // Double-Sided Horn
          <>
            <mesh material={materials.nylonHorn} position={[1.3, 0, 0]}>
              <boxGeometry args={[2.2, 0.14, 0.45]} />
            </mesh>
            <mesh material={materials.nylonHorn} position={[-1.3, 0, 0]}>
              <boxGeometry args={[2.2, 0.14, 0.45]} />
            </mesh>
          </>
        ) : (
          // Standard Single-Arm Horn (Default SG90)
          <group position={[1.35, 0, 0]}>
            <mesh material={materials.nylonHorn}>
              <boxGeometry args={[2.2, 0.14, 0.48]} />
            </mesh>
            {/* Rounded Arm Tip */}
            <mesh
              material={materials.nylonHorn}
              position={[1.1, 0, 0]}
              rotation={[0, 0, 0]}
            >
              <cylinderGeometry args={[0.24, 0.24, 0.14, 16]} />
            </mesh>
            {/* 4 Pinholes for linkage wire */}
            {[0.2, 0.5, 0.8, 1.1].map((xOffset, i) => (
              <mesh
                key={i}
                position={[xOffset - 0.4, 0, 0]}
                material={materials.solidPlastic}
              >
                <cylinderGeometry args={[0.06, 0.06, 0.16, 8]} />
              </mesh>
            ))}
          </group>
        )}
      </group>

      {/* ─── 3-WIRE RIBBON CABLE & DUPONT CONNECTOR ─── */}
      {/* Cable exit grommet at front-bottom of servo casing */}
      <mesh material={materials.blackHousing} position={[0, -0.95, 1.22]}>
        <boxGeometry args={[1.7, 0.28, 0.15]} />
      </mesh>

      {/* 3 Color-Coded Ribbon Conductors (Brown=GND, Red=VCC, Orange=PWM) running straight into DuPont housing */}
      <group position={[0, -0.95, 1.6]}>
        {/* Brown Wire (GND, x = -0.508) */}
        <mesh material={materials.cableBrown} position={[-0.508, 0, 0]}>
          <boxGeometry args={[0.2, 0.12, 0.8]} />
        </mesh>
        {/* Red Wire (VCC, x = 0) */}
        <mesh material={materials.cableRed} position={[0, 0, 0]}>
          <boxGeometry args={[0.2, 0.12, 0.8]} />
        </mesh>
        {/* Orange Wire (PWM Signal, x = 0.508) */}
        <mesh material={materials.cableOrange} position={[0.508, 0, 0]}>
          <boxGeometry args={[0.2, 0.12, 0.8]} />
        </mesh>
      </group>

      {/* 3-Pin Female DuPont Header Housing at Z = 2.0, Y = -0.8 (world Y = 0.4, matches pin positions) */}
      <group position={[0, -0.8, 2.0]}>
        {/* Black DuPont Connector Shell */}
        <mesh material={materials.blackHousing} position={[0, 0, 0]}>
          <boxGeometry args={[1.7, 0.55, 0.55]} />
        </mesh>
        {/* Top Wire Strain Relief Collar */}
        <mesh material={materials.blackHousing} position={[0, 0.3, 0]}>
          <boxGeometry args={[1.65, 0.08, 0.52]} />
        </mesh>
        {/* Terminal Pin Holes inside connector matching exact pin positions */}
        {[-0.508, 0, 0.508].map((x, idx) => (
          <group key={idx} position={[x, 0, 0]}>
            {/* Square terminal hole */}
            <mesh material={materials.metalPin} position={[0, 0.2, 0]}>
              <boxGeometry args={[0.22, 0.2, 0.22]} />
            </mesh>
            {/* Gold leaf spring contact inside */}
            <mesh
              position={[0, 0.05, 0]}
              material={new THREE.MeshStandardMaterial({ color: "#f59e0b", metalness: 0.9, roughness: 0.2 })}
            >
              <boxGeometry args={[0.12, 0.25, 0.12]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* SG90 Silkscreen Label Decal on front casing */}
      <group position={[0, 0, 1.21]}>
        <mesh>
          <planeGeometry args={[3.4, 1.1]} />
          <meshStandardMaterial color="#0284c7" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0.002]}>
          <planeGeometry args={[3.2, 0.45]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
      </group>
      </group>
    </group>
  );
}
