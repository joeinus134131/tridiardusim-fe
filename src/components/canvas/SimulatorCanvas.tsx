"use client";

import { ESP32Wroom } from "@/components/models/ESP32Wroom";
import { Canvas } from "@react-three/fiber";
import { Suspense, memo } from "react";
import * as THREE from "three";
import { useTheme } from "next-themes";

import { CameraController } from "./CameraController";
import { GridFloor } from "./GridFloor";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { DraggableComponent } from "./DraggableComponent";
import { ArduinoUnoR3 } from "@/components/models/ArduinoUno";
import { LED } from "@/components/models/LED";
import { PushButton } from "@/components/models/PushButton";
import { Potentiometer } from "@/components/models/Potentiometer";
import { Breadboard } from "@/components/models/Breadboard";
import { JumperWire } from "@/components/models/JumperWire";
import { Resistor } from "@/components/models/Resistor";
import { OLEDDisplay } from "@/components/models/OLEDDisplay";
import { ServoMotor } from "@/components/models/ServoMotor";
import { LCD1602Display } from "@/components/models/LCD1602Display";
import { WireRenderer } from "@/components/canvas/WireRenderer";
import { ActiveWireRenderer } from "@/components/canvas/ActiveWireRenderer";

// Component factory (memoized to prevent unneeded recreation)
const ComponentRenderer = memo(function ComponentRenderer({
  id,
  typeId,
}: {
  id: string;
  typeId: string;
}) {
  switch (typeId) {
    case "esp32_wroom":
      return <ESP32Wroom id={id} />;
    case "arduino_uno":
      return <ArduinoUnoR3 id={id} />;
    case "oled_ssd1306":
      return <OLEDDisplay id={id} />;
    case "lcd1602_i2c":
      return <LCD1602Display id={id} />;
    case "servo_sg90":
      return <ServoMotor id={id} />;
    case "led_red":
      return <LED id={id} />;
    case "push_button":
      return <PushButton id={id} />;
    case "potentiometer":
      return <Potentiometer id={id} />;
    case "breadboard":
      return <Breadboard id={id} />;
    case "resistor_220":
      return <Resistor id={id} />;
    case "jumper_red":
    case "jumper_black":
    case "jumper_blue":
    case "jumper_green":
    case "jumper_yellow":
      return <JumperWire id={id} />;
    default:
      return (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#6366f1" />
        </mesh>
      );
  }
});

export const SimulatorCanvas = memo(function SimulatorCanvas() {
  const components = useSimulatorStore((state) => state.components);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  return (
    <div
      className={`w-full h-full relative transition-colors duration-300 ${
        isLight ? "bg-[#e2e8f0]" : "bg-[#060a14]"
      }`}
    >
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        dpr={[1, 1.5]}
        frameloop="always"
        camera={{ position: [0, 25, 25], fov: 45, near: 0.1, far: 500 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
        }}
      >
        <CameraController />

        {/* Lighting — three-point setup with light mode daylight adaptation */}
        <ambientLight
          intensity={isLight ? 1.4 : 0.9}
          color={isLight ? "#ffffff" : "#c8d0e0"}
        />
        <directionalLight
          position={[15, 30, 15]}
          intensity={isLight ? 2.2 : 1.8}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
          shadow-camera-near={0.1}
          shadow-camera-far={100}
          shadow-bias={-0.001}
        />
        <directionalLight
          position={[-10, 15, -10]}
          intensity={isLight ? 0.8 : 0.4}
          color={isLight ? "#e0e7ff" : "#a0b0ff"}
        />
        <pointLight
          position={[0, 20, 0]}
          intensity={isLight ? 0.6 : 0.3}
          color="#ffffff"
        />

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
});
