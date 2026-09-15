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
  if (kind === "esp32_wifi") {
    components.length = 0;
    components.push(
      instance("esp32_wroom", "esp", [-8, 0.6, 0]),
      instance("breadboard", "bb", [8, 0, 0]),
      instance("led_red", "led", [12, 0.8, 0])
    );
    link("esp", "GPIO2", "led", "A", "#3b82f6");
    link("led", "C", "esp", "GND1", "#1e293b");
    code =
      '#include <WiFi.h>\n\nconst char* ssid = "Wokwi-GUEST";\nconst char* password = "";\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(2, OUTPUT);\n  WiFi.begin(ssid, password);\n  Serial.print("Menghubungkan WiFi");\n  while (WiFi.status() != WL_CONNECTED) {\n    delay(500);\n    Serial.print(".");\n  }\n  Serial.println("");\n  Serial.println("WiFi Terhubung!");\n  Serial.print("IP Address: ");\n  Serial.println(WiFi.localIP());\n  digitalWrite(2, HIGH);\n}\n\nvoid loop() {\n  delay(1000);\n}';
  }
  if (kind === "oled" || kind === "oled_demo") {
    components.length = 0;
    components.push(
      instance("arduino_uno", "uno", [-8, 0, 0]),
      instance("oled_ssd1306", "oled", [5, 0.6, 0]),
    );
    link("uno", "5V", "oled", "VCC", "#ef4444");
    link("uno", "GND1", "oled", "GND", "#1e293b");
    link("uno", "SCL", "oled", "SCL", "#eab308");
    link("uno", "SDA", "oled", "SDA", "#3b82f6");
    code =
      '#include <Wire.h>\n#include <Adafruit_GFX.h>\n#include <Adafruit_SSD1306.h>\n\n#define SCREEN_WIDTH 128\n#define SCREEN_HEIGHT 64\n#define OLED_RESET -1\n#define SCREEN_ADDRESS 0x3C\n\nAdafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);\n\nint counter = 0;\n\nvoid setup() {\n  Serial.begin(9600);\n  display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS);\n  display.clearDisplay();\n  display.setTextSize(1);\n  display.setTextColor(WHITE);\n  display.setCursor(0, 0);\n  display.println("NEXFLUX LAB 3D");\n  display.println("SSD1306 0.96\\" OLED");\n  display.println("I2C Bus: Connected");\n  display.display();\n  delay(1000);\n}\n\nvoid loop() {\n  counter++;\n  display.clearDisplay();\n  display.setCursor(0, 0);\n  display.println("=== NEXFLUX OLED ===");\n  display.print("Detik Aktif: ");\n  display.println(counter);\n  display.println("Resolusi: 128x64");\n  display.println("I2C Addr: 0x3C OK");\n  display.display();\n  Serial.print("OLED Frame Detik: ");\n  Serial.println(counter);\n  delay(1000);\n}';
  }
  return { version: 1, name: kind, code, components, wires };
}
