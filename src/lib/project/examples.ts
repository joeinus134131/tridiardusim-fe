import { snapToBreadboard } from "../components/placement";
import { ComponentRegistry } from "../components/ComponentRegistry";
import type { CircuitComponent, Wire } from "../components/componentTypes";
import type { Project } from "./project";
export function instance(
  typeId: string,
  id: string,
  position: [number, number, number],
): CircuitComponent {
  const c = ComponentRegistry.get(typeId)!;
  return {
    id,
    typeId,
    name: c.name,
    type: c.type,
    pins: c.pins,
    state: { ...c.defaultState },
    rotation: [0, 0, 0],
    position: typeId === "resistor_220" && position[1]===0 ? [position[0],.6,position[2]] : position,
  };
}
export function example(kind: string): Project {
  const components = [instance("arduino_uno", "uno", [-7, 0, 0])];
  const wires: Wire[] = [];
  const link = (
    a: string,
    p: string,
    b: string,
    q: string,
    color = "#3b82f6",
  ) =>
    wires.push({
      id: `wire${wires.length}`,
      sourceComponentId: a,
      sourcePinId: p,
      targetComponentId: b,
      targetPinId: q,
      color,
    });
  let code =
    "void setup() {\n  Serial.begin(9600);\n}\nvoid loop() {\n  if (Serial.available() > 0) {\n    Serial.write(Serial.read());\n  }\n  delay(10);\n}";
  if (kind === "blink" || kind === "pwm" || kind === "breadboard") {
    components.push(
      instance("resistor_220", "r", [5, 0, 0]),
      instance("led_red", "led", [9, 5.5, 0]),
    );
    link("uno", kind === "pwm" ? "D9" : "D13", "r", "L");
    link("r", "R", "led", "A");
    link("led", "C", "uno", "GND1", "#1e293b");
    code =
      'void setup() {\n  pinMode(13, OUTPUT);\n  Serial.begin(9600);\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n  Serial.println("LED ON");\n  delay(500);\n  digitalWrite(13, LOW);\n  Serial.println("LED OFF");\n  delay(500);\n}';
    if (kind === "pwm") {
      components.push(instance("potentiometer", "pot", [5, 0.8, 6]));
      link("uno", "5V", "pot", "1", "#ef4444");
      link("uno", "GND2", "pot", "2", "#1e293b");
      link("pot", "W", "uno", "A0");
      code =
        "void setup() {\n  pinMode(9, OUTPUT);\n  Serial.begin(9600);\n}\nvoid loop() {\n  int sensor = analogRead(A0);\n  analogWrite(9, map(sensor, 0, 1023, 0, 255));\n  Serial.println(sensor);\n  delay(100);\n}";
    }
    if (kind === "breadboard") {
      components.push(
        instance("breadboard", "bb", [6, 0, 10]),
        instance("jumper_green", "jumper", [4, 0, -5]),
      );
      wires.length = 0;
      link("uno", "D13", "jumper", "L");
      link("jumper", "R", "bb", "t0_0");
      link("bb", "t0_4", "r", "L");
      link("r", "R", "led", "A");
      link("led", "C", "bb", "pb2_10", "#1e293b");
      link("bb", "pb2_24", "uno", "GND1", "#1e293b");
    }
  }
  if (kind === "button") {
    components.push(instance("push_button", "button", [4, 0.7, 0]));
    link("uno", "D2", "button", "1a");
    link("uno", "GND1", "button", "2a", "#1e293b");
    code =
      "void setup() {\n  pinMode(2, INPUT_PULLUP);\n  pinMode(13, OUTPUT);\n  Serial.begin(9600);\n}\nvoid loop() {\n  int pressed = digitalRead(2) == LOW;\n  digitalWrite(13, pressed);\n  Serial.println(pressed);\n  delay(100);\n}";
  }
  if(kind==='esp32' || kind==='mounted') {
    components.length=0;
    components.push(instance('esp32_wroom','esp',[-15,.6,0]),instance('breadboard','bb',[1,0,0]),instance('led_red','led',[12,5.5,0]));
    const resistor=instance('resistor_220','r',[-1.286,.6,-1.778]);
    components.push(snapToBreadboard(resistor,components));
    // Physical feet land in C9 / C13. Only the breadboard holes are wired.
    link('esp','GPIO25','bb','t8_0','#a855f7');
    link('bb','t12_0','led','A','#ef4444');
    link('led','C','esp','GND1','#64748b');
    wires[0].path=[[-8,4,-3],[-4,3,-3]];
    code='void setup() {\n  pinMode(25, OUTPUT);\n  Serial.begin(9600);\n}\nvoid loop() {\n  digitalWrite(25, HIGH);\n  Serial.println("ESP32 GPIO25 ON - 3.3V");\n  delay(500);\n  digitalWrite(25, LOW);\n  Serial.println("ESP32 GPIO25 OFF");\n  delay(500);\n}';
  }
  return { version: 1, name: kind, code, components, wires };
}
