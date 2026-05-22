'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { Environment } from '@react-three/drei';
import { CameraController } from './CameraController';
import { GridFloor } from './GridFloor';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { DraggableComponent } from './DraggableComponent';
import { ArduinoUnoR3 } from '@/components/models/ArduinoUno';
import { LED } from '@/components/models/LED';
import { PushButton } from '@/components/models/PushButton';
import { Potentiometer } from '@/components/models/Potentiometer';
import { Breadboard } from '@/components/models/Breadboard';
import { JumperWire } from '@/components/models/JumperWire';
import { Resistor } from '@/components/models/Resistor';
import { WireRenderer } from '@/components/canvas/WireRenderer';
import { ActiveWireRenderer } from '@/components/canvas/ActiveWireRenderer';

// Component factory
function ComponentRenderer({ id, typeId }: { id: string; typeId: string }) {
  switch (typeId) {
    case 'arduino_uno':
      return <ArduinoUnoR3 />;
    case 'led_red':
      return <LED id={id} />;
    case 'push_button':
      return <PushButton id={id} />;
    case 'potentiometer':
      return <Potentiometer id={id} />;
    case 'breadboard':
      return <Breadboard id={id} />;
    case 'resistor_220':
      return <Resistor id={id} />;
    case 'jumper_red':
    case 'jumper_black':
    case 'jumper_blue':
    case 'jumper_green':
    case 'jumper_yellow':
      return <JumperWire id={id} />;
    default:
      return (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#6366f1" />
        </mesh>
      );
  }
}

export function SimulatorCanvas() {
  const components = useSimulatorStore((state) => state.components);

  return (
    <div className="w-full h-full bg-[#060a14] relative">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 25, 25], fov: 45, near: 0.1, far: 500 }}
        gl={{ antialias: true, alpha: false }}
      >
        <CameraController />
        
        {/* Lighting — three-point setup */}
        <ambientLight intensity={0.35} color="#c8d0e0" />
        <directionalLight
          position={[15, 30, 15]}
          intensity={1.8}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
          shadow-camera-near={0.1}
          shadow-camera-far={100}
          shadow-bias={-0.001}
        />
        <directionalLight position={[-10, 15, -10]} intensity={0.4} color="#a0b0ff" />
        <pointLight position={[0, 20, 0]} intensity={0.3} color="#ffffff" />

        <Environment preset="city" />

        {/* Work surface */}
        <GridFloor />

        {/* Components */}
        <Suspense fallback={null}>
          {components.map((c) => (
            <DraggableComponent 
              key={c.id} 
              id={c.id}
              position={c.position}
              rotation={c.rotation}
            >
              <ComponentRenderer id={c.id} typeId={c.typeId} />
            </DraggableComponent>
          ))}
        </Suspense>

        {/* Wire connections */}
        <WireRenderer />
        <ActiveWireRenderer />
      </Canvas>
    </div>
  );
}
