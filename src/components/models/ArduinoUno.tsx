"use client";
import { useMemo, memo } from "react";
import * as THREE from "three";
import { unoPins, PITCH } from "@/lib/components/physical";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { PinHighlight } from "@/components/canvas/PinHighlight";
import { Label } from "./Label";

function Box({
  p,
  s,
  color = "#151719",
  shadow = false,
}: {
  p: [number, number, number];
  s: [number, number, number];
  color?: string;
  shadow?: boolean;
}) {
  return (
    <mesh position={p} castShadow={shadow}>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={color}
        roughness={0.55}
        metalness={color === "#c2c7cb" ? 0.75 : 0}
      />
    </mesh>
  );
}

export const ArduinoUnoR3 = memo(function ArduinoUnoR3({
  id,
}: {
  id?: string;
}) {
  const on = useSimulatorStore(
    (s) =>
      (id ? s.components.find((c) => c.id === id)?.state.isOn : false) || false,
  );
  const led = useSimulatorStore(
    (s) =>
      (id ? s.components.find((c) => c.id === id)?.state.builtinLED : false) ||
      false,
  );

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    // A000066 mechanical drawing, mm converted at 0.2 units/mm.
    // Physically with USB on left: Digital pins top (-Z), Power/Analog bottom (+Z).
    s.moveTo(-6.858, 5.334);
    s.lineTo(6.35, 5.334);
    s.lineTo(6.35, 4.826);
    s.lineTo(6.858, 4.318);
    s.lineTo(6.858, -2.286);
    s.lineTo(6.35, -2.794);
    s.lineTo(6.35, -5.08);
    s.lineTo(6.096, -5.334);
    s.lineTo(-6.858, -5.334);
    s.closePath();
    for (const [x, z] of [[-3.81, -4.826], [-4.064, 4.826], [6.35, -1.778], [6.35, 3.81]]) {
      const h = new THREE.Path();
      h.absarc(x, z, 0.32, 0, Math.PI * 2, true);
      s.holes.push(h);
    }
    return s;
  }, []);

  return (
    <group>
      {/* PCB board */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0.32, 0]}
        castShadow
        receiveShadow
      >
        <extrudeGeometry
          args={[
            shape,
            { depth: 0.32, bevelEnabled: false, curveSegments: 16 },
          ]}
        />
        <meshStandardMaterial color="#087b83" roughness={0.7} />
      </mesh>
      {/* USB type B metal shell and recessed socket, on top-left edge (-Z). */}
      <Box p={[-6.15, 1.35, -2.35]} s={[3.2, 2.1, 2.4]} color="#c2c7cb" shadow />
      <Box p={[-7.76, 1.32, -2.35]} s={[0.02, 1.55, 1.9]} />
      <Box p={[-7.79, 1.2, -2.35]} s={[0.03, 0.68, 1.15]} color="#d7d9dc" />
      {/* Power barrel jack on bottom-left edge (+Z) */}
      <Box p={[-5.75, 1.45, 3.5]} s={[2.7, 2.25, 1.8]} shadow />
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-7.11, 1.5, 3.5]}>
        <cylinderGeometry args={[0.72, 0.72, 0.05, 20]} />
        <meshStandardMaterial color="#060606" />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-7.15, 1.5, 3.5]}>
        <cylinderGeometry args={[0.18, 0.18, 0.07, 14]} />
        <meshStandardMaterial color="#c2c7cb" metalness={0.8} />
      </mesh>
      {/* DIP28 socket, package and two 14-lead rows at 2.54mm pitch. */}
      <Box p={[2.15, 0.58, 1.25]} s={[7.4, 0.5, 1.94]} shadow />
      <Box p={[2.15, 1.0, 1.25]} s={[7, 0.6, 1.5]} shadow />
      <Label text="ATMEGA328P-PU" position={[2.15, 1.31, 1.25]} size={0.35} />
      {[-1, 1].flatMap((side) =>
        Array.from({ length: 14 }, (_, i) => (
          <Box
            key={side + ":" + i}
            p={[2.15 - 6.5 * PITCH + i * PITCH, 0.69, 1.25 + side * 0.87]}
            s={[0.11, 0.42, 0.15]}
            color="#c2c7cb"
          />
        )),
      )}
      {/* R3 four header groups, from the same coordinates used by wiring. */}
      {[
        [0, 7],
        [8, 17],
        [18, 25],
        [26, 31],
      ].map(([a, b]) => {
        const first = unoPins[a].position;
        const last = unoPins[b].position;
        return (
          <Box
            key={a}
            p={[(first[0] + last[0]) / 2, 1.17, first[2]]}
            s={[Math.abs(last[0] - first[0]) + PITCH, 1.7, 0.51]}
          />
        );
      })}
      {unoPins
        .filter((p) => !p.id.includes("ICSP"))
        .map((p) => (
          <group key={p.id}>
            <Box
              p={[p.position[0], 2.023, p.position[2]]}
              s={[0.2, 0.012, 0.2]}
              color="#030405"
            />
            <Label
              text={p.id
                .replace("GND1", "GND")
                .replace("GND2", "GND")
                .replace("GND3", "GND")}
              position={[
                p.position[0],
                0.333,
                p.position[2] + (p.position[2] > 0 ? -0.54 : 0.54),
              ]}
              size={0.16}
              rotation={Math.PI / 2}
            />
          </group>
        ))}
      {/* Main ICSP pins; USB ICSP is visual (USB MCU not emulated). */}
      {[0, 1].map((i) => (
        <group key={i}>
          {i === 0 ? (
            <Box p={[6.154, 0.65, 0]} s={[1.016, 0.65, 1.524]} />
          ) : (
            <Box p={[-4.25, 0.65, -3.75]} s={[1.016, 0.65, 1.524]} />
          )}
          {(i === 0
            ? unoPins.filter((p) => p.id.startsWith("ICSP"))
            : Array.from({ length: 6 }, (_, j) => ({
                id: String(j),
                position: [
                  -4.504 + (j % 2) * PITCH,
                  1.9,
                  -3.75 + (Math.floor(j / 2) - 1) * PITCH,
                ] as [number, number, number],
              }))
          ).map((p) => (
            <Box
              key={p.id}
              p={[p.position[0], 1.4, p.position[2]]}
              s={[0.128, 1, 0.128]}
              color="#c2c7cb"
            />
          ))}
        </group>
      ))}
      <Box p={[-2.5, 0.65, -2.2]} s={[1.4, 0.35, 1.4]} />
      <Label text="16U2" position={[-2.5, 0.84, -2.2]} size={0.16} />
      <Box p={[-3.4, 0.55, -0.6]} s={[1.5, 0.46, 0.65]} color="#c2c7cb" />
      <Box p={[-4.7, 0.52, 1]} s={[1.35, 0.4, 1]} />
      <Box p={[-4.7, 0.73, 1.45]} s={[1.25, 0.06, 0.5]} color="#c2c7cb" />
      {[-4, -2.7].map((x) => (
        <group key={x}>
          <mesh position={[x, 1.2, 3.5]}>
            <cylinderGeometry args={[0.5, 0.5, 1.7, 16]} />
            <meshStandardMaterial color="#272c31" />
          </mesh>
          <mesh position={[x, 2.06, 3.5]}>
            <cylinderGeometry args={[0.48, 0.48, 0.03, 16]} />
            <meshStandardMaterial color="#c2c7cb" metalness={0.7} />
          </mesh>
        </group>
      ))}
      <group
        onClick={(e) => {
          e.stopPropagation();
          const s = useSimulatorStore.getState();
          if (s.simulationState !== "stopped") {
            s.stopSimulation();
            s.startSimulation();
          }
        }}
      >
        <Box p={[-3.8, 0.52, -4.4]} s={[1.2, 0.35, 1.2]} color="#c2c7cb" />
        <Box p={[-3.8, 0.8, -4.4]} s={[0.6, 0.3, 0.6]} color="#ece6cd" />
      </group>
      <Label text="RESET" position={[-4, 0.34, -3.55]} size={0.19} />
      <Label text="ARDUINO" position={[0.8, 0.34, -1.1]} size={0.6} />
      <Label text="UNO" position={[3.5, 0.34, -2.25]} size={0.85} />
      <Label text="DIGITAL (PWM ~)" position={[2, 0.34, -3.5]} size={0.22} />
      <Label text="POWER" position={[0.5, 0.34, 3.75]} size={0.25} />
      <Label text="ANALOG IN" position={[4.7, 0.34, 3.75]} size={0.25} />
      {[
        [0, -2.2, "L", led],
        [-0.8, -2.2, "TX", false],
        [-1.6, -2.2, "RX", false],
        [4, -1, "ON", on],
      ].map(([x, z, name, lit]) => (
        <group key={String(name)}>
          <mesh position={[Number(x), 0.45, Number(z)]}>
            <boxGeometry args={[0.3, 0.2, 0.15]} />
            <meshStandardMaterial
              color={lit ? "#bfff5a" : "#857b35"}
              emissive={lit ? "#b2ff36" : "#000000"}
              emissiveIntensity={lit ? 2 : 0}
            />
          </mesh>
          <Label
            text={String(name)}
            position={[Number(x), 0.34, Number(z) + 0.3]}
            size={0.14}
          />
        </group>
      ))}
      {id &&
        unoPins.map((p) => (
          <PinHighlight key={p.id} componentId={id} pin={p} />
        ))}
    </group>
  );
});
