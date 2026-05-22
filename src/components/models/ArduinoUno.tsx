'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

interface ArduinoUnoR3Props {
  position?: [number, number, number];
}

function FemaleHeader({
  pins,
  position,
}: {
  pins: number;
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      {/* plastic body */}
      <mesh>
        <boxGeometry args={[pins * 0.42, 0.8, 0.6]} />
        <meshStandardMaterial color="#111827" />
      </mesh>

      {/* holes */}
      {Array.from({ length: pins }).map((_, i) => (
        <mesh
          key={i}
          position={[
            -(pins - 1) * 0.21 + i * 0.42,
            0.22,
            0,
          ]}
        >
          <boxGeometry args={[0.16, 0.12, 0.16]} />
          <meshStandardMaterial color="#050505" />
        </mesh>
      ))}
    </group>
  );
}

function Capacitor({
  position,
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      {/* body */}
      <mesh>
        <cylinderGeometry args={[0.35, 0.35, 0.8, 32]} />
        <meshStandardMaterial color="#c0c0c0" />
      </mesh>

      {/* black base */}
      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.1, 32]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
    </group>
  );
}

function Led({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={[0.22, 0.08, 0.12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.4}
      />
    </mesh>
  );
}

export function ArduinoUnoR3({
  position = [0, 0, 0],
}: ArduinoUnoR3Props) {
  const W = 13.8;
  const D = 10.8;
  const H = 0.22;

  const pcbMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#005db3',
        roughness: 0.7,
      }),
    []
  );

  const metalMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#d1d5db',
        metalness: 1,
        roughness: 0.2,
      }),
    []
  );

  const blackMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#111111',
      }),
    []
  );

  const pcbGeometry = useMemo(() => {
    const shape = new THREE.Shape();

    const hw = W / 2;
    const hd = D / 2;

    shape.moveTo(-hw, -hd);

    shape.lineTo(hw - 1, -hd);

    shape.lineTo(hw, -hd + 1);

    shape.lineTo(hw, hd - 1);

    shape.lineTo(hw - 1, hd);

    shape.lineTo(-hw, hd);

    shape.lineTo(-hw, -hd);

    return new THREE.ExtrudeGeometry(shape, {
      depth: H,
      bevelEnabled: false,
    });
  }, []);

  return (
    <group position={position}>

      {/* PCB */}
      <mesh
        geometry={pcbGeometry}
        material={pcbMaterial}
        rotation={[Math.PI / 2, 0, 0]}
        receiveShadow
      />

      {/* USB PORT */}
      <group position={[-5.2, 0.8, 3.7]}>
        <mesh material={metalMaterial}>
          <boxGeometry args={[2.6, 1.7, 2.5]} />
        </mesh>

        {/* inner */}
        <mesh position={[0, -0.3, 1]}>
          <boxGeometry args={[1.8, 0.4, 0.2]} />
          <meshStandardMaterial color="#f3f4f6" />
        </mesh>
      </group>

      {/* RESET BUTTON */}
      <group position={[-3.2, 0.25, 4.8]}>
        <mesh>
          <boxGeometry args={[0.7, 0.15, 0.7]} />
          <meshStandardMaterial color="#9ca3af" />
        </mesh>

        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.18, 0.18, 0.1, 24]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
      </group>

      {/* USB ICSP */}
      <group position={[-4.6, 0.2, 1.4]}>
        <mesh material={blackMaterial}>
          <boxGeometry args={[0.8, 0.22, 0.8]} />
        </mesh>

        {Array.from({ length: 6 }).map((_, i) => (
          <mesh
            key={i}
            position={[
              (i % 2) * 0.28 - 0.14,
              0.32,
              Math.floor(i / 2) * 0.24 - 0.24,
            ]}
          >
            <boxGeometry args={[0.06, 0.4, 0.06]} />
            <meshStandardMaterial color="#d1d5db" />
          </mesh>
        ))}
      </group>

      {/* ATMEGA16U2 */}
      <mesh position={[-1.8, 0.18, 1.8]}>
        <boxGeometry args={[1.2, 0.22, 1.2]} />
        <meshStandardMaterial color="#111111" />
      </mesh>

      {/* crystal */}
      <mesh position={[-2.6, 0.15, 0.2]}>
        <capsuleGeometry args={[0.22, 0.9, 8, 16]} />
        <meshStandardMaterial color="#cfd3d8" />
      </mesh>

      {/* LEDs */}
      <Led position={[-0.8, 0.12, 1]} color="#22c55e" />
      <Led position={[-0.8, 0.12, 0.55]} color="#e5e7eb" />
      <Led position={[-0.8, 0.12, 0.1]} color="#e5e7eb" />

      {/* small smd parts */}
      {[
        [-2.3, 2.1],
        [-1.9, 2.1],
        [-1.5, 2.1],
      ].map(([x, z], idx) => (
        <mesh
          key={idx}
          position={[x, 0.08, z]}
        >
          <boxGeometry args={[0.18, 0.08, 0.35]} />
          <meshStandardMaterial color="#d1d5db" />
        </mesh>
      ))}

      {/* POWER JACK */}
      <group position={[-6, 0.6, -2.8]}>
        <mesh>
          <cylinderGeometry args={[0.6, 0.6, 1.8, 32]} />
          <meshStandardMaterial color="#111111" />
        </mesh>

        <mesh position={[0, 0, -0.8]}>
          <boxGeometry args={[1.3, 1.2, 0.8]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </group>

      {/* regulators */}
      <mesh position={[-4.2, 0.2, -1.2]}>
        <boxGeometry args={[0.8, 0.4, 0.8]} />
        <meshStandardMaterial color="#111111" />
      </mesh>

      <mesh position={[-2.4, 0.2, -1.2]}>
        <boxGeometry args={[0.6, 0.3, 0.6]} />
        <meshStandardMaterial color="#111111" />
      </mesh>

      {/* capacitors */}
      <Capacitor position={[-4.1, 0.45, -3]} />
      <Capacitor position={[-3, 0.45, -3]} />

      {/* DIP SOCKET */}
      <mesh position={[2.2, 0.15, -0.8]}>
        <boxGeometry args={[6.2, 0.2, 2]} />
        <meshStandardMaterial color="#1f1f1f" />
      </mesh>

      {/* ATMEGA328P */}
      <group position={[2.2, 0.42, -0.8]}>

        <mesh material={blackMaterial}>
          <boxGeometry args={[5.8, 0.6, 1.6]} />
        </mesh>

        {/* top legs */}
        {Array.from({ length: 14 }).map((_, i) => (
          <mesh
            key={`t-${i}`}
            position={[-2.6 + i * 0.4, -0.2, -0.9]}
          >
            <boxGeometry args={[0.08, 0.3, 0.12]} />
            <meshStandardMaterial color="#c0c0c0" />
          </mesh>
        ))}

        {/* bottom legs */}
        {Array.from({ length: 14 }).map((_, i) => (
          <mesh
            key={`b-${i}`}
            position={[-2.6 + i * 0.4, -0.2, 0.9]}
          >
            <boxGeometry args={[0.08, 0.3, 0.12]} />
            <meshStandardMaterial color="#c0c0c0" />
          </mesh>
        ))}
      </group>

      {/* DIGITAL HEADERS */}
      <FemaleHeader
        pins={8}
        position={[2.2, 0.45, 4.8]}
      />

      <FemaleHeader
        pins={10}
        position={[5.5, 0.45, 4.8]}
      />

      {/* POWER HEADER */}
      <FemaleHeader
        pins={8}
        position={[-1.5, 0.45, -4.8]}
      />

      {/* ANALOG HEADER */}
      <FemaleHeader
        pins={6}
        position={[4.3, 0.45, -4.8]}
      />

      {/* MAIN ICSP */}
      <group position={[6, 0.22, -1]}>
        <mesh material={blackMaterial}>
          <boxGeometry args={[0.9, 0.25, 0.9]} />
        </mesh>

        {Array.from({ length: 6 }).map((_, i) => (
          <mesh
            key={i}
            position={[
              (i % 2) * 0.28 - 0.14,
              0.34,
              Math.floor(i / 2) * 0.24 - 0.24,
            ]}
          >
            <boxGeometry args={[0.06, 0.45, 0.06]} />
            <meshStandardMaterial color="#d1d5db" />
          </mesh>
        ))}
      </group>

      {/* mounting holes */}
      {[
        [-5.7, 4.7],
        [-5.7, -4.4],
        [6.4, 3.9],
        [6.2, -4.6],
      ].map(([x, z], idx) => (
        <mesh
          key={idx}
          position={[x, 0.02, z]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.32, 0.32, 0.08, 32]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
      ))}

      {/* silkscreen */}
      <group
        position={[0, 0.03, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >

        <Text
          position={[2.2, 1.2, 0]}
          fontSize={0.55}
          color="white"
        >
          ARDUINO
        </Text>

        <Text
          position={[4.9, 1.2, 0]}
          fontSize={0.7}
          color="white"
        >
          UNO
        </Text>

        <Text
          position={[3.8, -3.2, 0]}
          fontSize={0.7}
          color="white"
        >
          R3
        </Text>

        <Text
          position={[3.8, -4.1, 0]}
          fontSize={0.28}
          color="white"
        >
          ANALOG IN
        </Text>

        <Text
          position={[2.6, 3.9, 0]}
          fontSize={0.28}
          color="white"
        >
          DIGITAL (PWM~)
        </Text>

      </group>

    </group>
  );
}