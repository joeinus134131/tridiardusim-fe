"use client";
import * as THREE from "three";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { ComponentRegistry } from "@/lib/components/ComponentRegistry";
import { PinHighlight } from "@/components/canvas/PinHighlight";
export function PushButton({ id }: { id: string }) {
  const down = useSimulatorStore(
    (s) => !!s.components.find((c) => c.id === id)?.state.isPressed,
  );
  const update = useSimulatorStore((s) => s.updateComponentState);
  return (
    <group>
      <mesh position={[0, 0.31, 0]} castShadow>
        <boxGeometry args={[1.2, 0.62, 1.2]} />
        <meshStandardMaterial color="#242321" />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[1.16, 0.06, 1.16]} />
        <meshStandardMaterial
          color="#bec2c4"
          metalness={0.8}
          roughness={0.35}
        />
      </mesh>
      <mesh
        position={[0, down ? 0.73 : 0.77, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          update(id, { isPressed: true });
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          update(id, { isPressed: false });
        }}
        onPointerLeave={() => update(id, { isPressed: false })}
      >
        <cylinderGeometry args={[0.35, 0.35, 0.18, 20]} />
        <meshStandardMaterial color="#ede1bd" />
      </mesh>
      {[-0.46, 0.46].flatMap((x) =>
        [-0.46, 0.46].map((z) => (
          <mesh key={x + ":" + z} position={[x, 0.69, z]}>
            <cylinderGeometry args={[0.07, 0.07, 0.035, 8]} />
            <meshStandardMaterial color="#353535" />
          </mesh>
        )),
      )}
      {ComponentRegistry.get("push_button")!.pins.map((p) => (
        <group key={p.id}>
          {[0,1].map(segment => {
            const side = Math.sign(p.position[0]);
            const points = [[side*.6,.05,p.position[2]],[side*.77,-.25,p.position[2]],[side*.65,-.7,p.position[2]]];
            const a = new THREE.Vector3(...points[segment]), b = new THREE.Vector3(...points[segment+1]);
            return <mesh key={segment} position={a.clone().lerp(b,.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize())}><boxGeometry args={[.06,a.distanceTo(b),.14]}/><meshStandardMaterial color="#bec2c4" metalness={.8}/></mesh>;
          })}
          <PinHighlight componentId={id} pin={p} />
        </group>
      ))}
    </group>
  );
}
