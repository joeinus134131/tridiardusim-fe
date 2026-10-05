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
  if (kind === "sensor_fusion") {
    components.length = 0;
    components.push(
      instance("arduino_uno", "uno", [-8, 0, 0]),
      instance("rgbd_camera", "camera", [2, 0, -3]),
      instance("planar_lidar", "lidar", [2, 0, 0]),
      instance("imu_6axis", "imu", [2, 0, 3]),
    );
    code = `void setup() {
  Serial.begin(9600);
  Serial.println("Sensor worker bridge ready");
}

void loop() {
  Serial.print("RGB-D ");
  Serial.print(cameraWidth(""));
  Serial.print("x");
  Serial.print(cameraHeight(""));
  Serial.print(" center depth m=");
  Serial.println(cameraDepth("", 160, 120));

  Serial.print("LiDAR ray 0 m=");
  Serial.print(lidarRange("", 0));
  Serial.print(" hit=");
  Serial.println(lidarHit("", 0));

  Serial.print("IMU ay m/s2=");
  Serial.println(imuRead("", "ay"));
  delay(1000);
}`;
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
  if (kind === "servo" || kind === "servo_sweep") {
    components.length = 0;
    components.push(
      instance("arduino_uno", "uno", [-8, 0, 0]),
      instance("servo_sg90", "servo", [6, 0.6, 0]),
    );
    link("uno", "5V", "servo", "VCC", "#ef4444");
    link("uno", "GND1", "servo", "GND", "#1e293b");
    link("uno", "D9", "servo", "PWM", "#ea580c");
    code =
      '#include <Servo.h>\n\nServo myservo;\n\nvoid setup() {\n  Serial.begin(9600);\n  myservo.attach(9);\n  Serial.println("Servo SG90 Siap!");\n}\n\nvoid loop() {\n  Serial.println("Putar ke 0 derajat");\n  myservo.write(0);\n  delay(1000);\n\n  Serial.println("Putar ke 90 derajat (Tengah)");\n  myservo.write(90);\n  delay(1000);\n\n  Serial.println("Putar ke 180 derajat");\n  myservo.write(180);\n  delay(1000);\n}';
  }
  if (kind === "pca9685") {
    components.length = 0;
    components.push(
      instance("arduino_uno", "uno", [-9, 0, 0]),
      instance("pca9685_i2c", "pca", [-1, 0.5, 0]),
      instance("servo_sg90", "servo", [8, 0.6, 0]),
    );
    link("uno", "5V", "pca", "VCC", "#ef4444");
    link("uno", "5V", "pca", "V+", "#ef4444");
    link("uno", "GND1", "pca", "GND", "#1e293b");
    link("uno", "GND1", "pca", "OE", "#1e293b");
    link("uno", "SDA", "pca", "SDA", "#3b82f6");
    link("uno", "SCL", "pca", "SCL", "#eab308");
    link("uno", "5V", "servo", "VCC", "#ef4444");
    link("uno", "GND1", "servo", "GND", "#1e293b");
    link("pca", "PWM0", "servo", "PWM", "#ea580c");
    code = '#include <Wire.h>\n#include <Adafruit_PWMServoDriver.h>\n\nAdafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();\n\nvoid setup() {\n  Serial.begin(9600);\n  pwm.begin();\n  pwm.setPWMFreq(50);\n}\n\nvoid loop() {\n  pwm.setPWM(0, 0, 205); // ~1000 us, 0 degrees\n  Serial.println("Channel 0: 0 degrees");\n  delay(1000);\n  pwm.setPWM(0, 0, 307); // ~1500 us, 90 degrees\n  Serial.println("Channel 0: 90 degrees");\n  delay(1000);\n  pwm.setPWM(0, 0, 410); // ~2000 us, 180 degrees\n  Serial.println("Channel 0: 180 degrees");\n  delay(1000);\n}';
  }
  if (kind === "i2c_scan") {
    components.length = 0;
    components.push(
      instance("arduino_uno", "uno", [-12, 0, 0]),
      instance("imu_6axis", "imu", [-2, 0.6, -5]),
      instance("oled_ssd1306", "oled", [3, 0.6, -5]),
      instance("lcd1602_i2c", "lcd", [-2, 0.6, 2]),
      instance("pca9685_i2c", "pca", [5, 0.5, 2]),
    );
    for (const id of ["imu", "oled", "lcd", "pca"]) {
      link("uno", "5V", id, "VCC", "#ef4444");
      link("uno", "GND1", id, "GND", "#1e293b");
      link("uno", "SDA", id, "SDA", "#3b82f6");
      link("uno", "SCL", id, "SCL", "#eab308");
    }
    code = `#include <Wire.h>

void setup() {
  Serial.begin(9600);
  Wire.begin();
  Serial.println("I2C scan: addresses 0x01-0x7E");
}

void loop() {
  int found = 0;
  for (int address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    int result = Wire.endTransmission();
    if (result == 0) {
      Serial.print("ACK 0x");
      Serial.println(address, HEX);
      found++;
    }
  }
  Serial.print("Devices found: ");
  Serial.println(found);
  delay(2000);
}`;
  }
  if (kind === "stepper_a4988") {
    components.length = 0;
    components.push(
      instance("arduino_uno", "uno", [-9, 0, 0]),
      instance("a4988_stepper_driver", "driver", [1, 0, 0]),
      instance("stepper_nema17", "motor", [9, 0, 0]),
      instance("dc_supply", "supply", [1, 0, -7]),
      instance("incremental_encoder", "encoder", [13, 0.6, 0]),
    );
    components.find((item) => item.id === "encoder")!.state.coupledMotorId = "motor";
    link("uno", "5V", "driver", "VDD", "#ef4444");
    link("uno", "GND1", "driver", "GND_LOGIC", "#1e293b");
    link("supply", "GND", "driver", "GND_MOTOR", "#1e293b");
    link("supply", "V+", "driver", "VMOT", "#ef4444");
    link("supply", "GND", "uno", "GND1", "#1e293b");
    link("uno", "D8", "driver", "STEP");
    link("uno", "D9", "driver", "DIR");
    link("uno", "D10", "driver", "ENABLE");
    link("uno", "D11", "driver", "RESET");
    link("uno", "D12", "driver", "SLEEP");
    link("driver", "1A", "motor", "A+");
    link("driver", "1B", "motor", "A-");
    link("driver", "2A", "motor", "B+");
    link("driver", "2B", "motor", "B-");
    link("uno", "5V", "encoder", "VCC", "#ef4444");
    link("uno", "GND1", "encoder", "GND", "#1e293b");
    link("encoder", "A", "uno", "D2");
    link("encoder", "B", "uno", "D3");
    code = "volatile long encoderCount = 0;\nvolatile int lastAB = 0;\nvoid encoderISR() {\n  int currentAB = (digitalRead(2) << 1) | digitalRead(3);\n  if ((lastAB == 0 && currentAB == 1) || (lastAB == 1 && currentAB == 3) || (lastAB == 3 && currentAB == 2) || (lastAB == 2 && currentAB == 0)) { encoderCount++; }\n  else if ((lastAB == 0 && currentAB == 2) || (lastAB == 2 && currentAB == 3) || (lastAB == 3 && currentAB == 1) || (lastAB == 1 && currentAB == 0)) { encoderCount--; }\n  lastAB = currentAB;\n}\nvoid setup() {\n  Serial.begin(9600);\n  pinMode(8, OUTPUT); // STEP\n  pinMode(9, OUTPUT); // DIR\n  pinMode(10, OUTPUT); // ENABLE, active-low\n  pinMode(11, OUTPUT); // RESET\n  pinMode(12, OUTPUT); // SLEEP\n  pinMode(2, INPUT);\n  pinMode(3, INPUT);\n  attachInterrupt(digitalPinToInterrupt(2), encoderISR, CHANGE);\n  attachInterrupt(digitalPinToInterrupt(3), encoderISR, CHANGE);\n  digitalWrite(10, LOW);\n  digitalWrite(11, HIGH);\n  digitalWrite(12, HIGH);\n  digitalWrite(9, HIGH);\n}\nvoid loop() {\n  for (int i = 0; i < 200; i++) {\n    digitalWrite(8, HIGH);\n    delayMicroseconds(2);\n    digitalWrite(8, LOW);\n    delayMicroseconds(2);\n  }\n  Serial.print(\"CW x4 encoder count: \");\n  Serial.println(encoderCount);\n  digitalWrite(9, LOW);\n  for (int i = 0; i < 200; i++) {\n    digitalWrite(8, HIGH);\n    delayMicroseconds(2);\n    digitalWrite(8, LOW);\n    delayMicroseconds(2);\n  }\n  Serial.print(\"CCW x4 encoder count: \");\n  Serial.println(encoderCount);\n  digitalWrite(9, HIGH);\n}";
  }
  if (kind === "lcd1602" || kind === "lcd") {
    components.length = 0;
    components.push(
      instance("arduino_uno", "uno", [-10, 0, 0]),
      instance("lcd1602_i2c", "lcd", [9, 0.6, 0]),
    );
    link("uno", "5V", "lcd", "VCC", "#ef4444");
    link("uno", "GND1", "lcd", "GND", "#1e293b");
    link("uno", "SDA", "lcd", "SDA", "#3b82f6");
    link("uno", "SCL", "lcd", "SCL", "#eab308");
    code =
      '#include <Wire.h>\n#include <LiquidCrystal_I2C.h>\n\nLiquidCrystal_I2C lcd(0x27, 16, 2);\n\nint detik = 0;\n\nvoid setup() {\n  Serial.begin(9600);\n  lcd.init();\n  lcd.backlight();\n  lcd.setCursor(0, 0);\n  lcd.print("Nexflux Lab 3D");\n  lcd.setCursor(0, 1);\n  lcd.print("LCD 16x2 I2C OK");\n  delay(1500);\n}\n\nvoid loop() {\n  detik++;\n  lcd.setCursor(0, 0);\n  lcd.print("Nexflux Lab 3D  ");\n  lcd.setCursor(0, 1);\n  lcd.print("Detik: ");\n  lcd.print(detik);\n  lcd.print(" detik   ");\n  Serial.print("Waktu LCD: ");\n  Serial.println(detik);\n  delay(1000);\n}';
  }
  if (kind === "dht11") {
    components.length = 0;
    components.push(
      instance("arduino_uno", "uno", [-7, 0, 0]),
      instance("dht11", "dht", [5, 0.6, 0]),
    );
    link("uno", "5V", "dht", "VCC", "#ef4444");
    link("uno", "GND1", "dht", "GND", "#1e293b");
    link("uno", "D2", "dht", "DATA", "#3b82f6");
    code =
      '#include <DHT.h>\n\n#define DHTPIN 2\n#define DHTTYPE DHT11\n\nDHT dht(DHTPIN, DHTTYPE);\n\nvoid setup() {\n  Serial.begin(9600);\n  Serial.println("Menginisialisasi Sensor DHT11...");\n  dht.begin();\n}\n\nvoid loop() {\n  float h = dht.readHumidity();\n  float t = dht.readTemperature();\n\n  if (isnan(h) || isnan(t)) {\n    Serial.println("Gagal membaca dari sensor DHT11! Cek kabel.");\n    delay(1000);\n    return;\n  }\n\n  Serial.print("Suhu: ");\n  Serial.print(t);\n  Serial.print(" *C | Kelembaban: ");\n  Serial.print(h);\n  Serial.println(" %");\n  delay(1000);\n}';
  }
  if (kind === "hcsr04") {
    components.length = 0;
    components.push(
      instance("arduino_uno", "uno", [-7, 0, 0]),
      instance("hcsr04", "sonar", [6, 0.6, 0]),
    );
    link("uno", "5V", "sonar", "VCC", "#ef4444");
    link("uno", "GND1", "sonar", "GND", "#1e293b");
    link("uno", "D9", "sonar", "TRIG", "#eab308");
    link("uno", "D10", "sonar", "ECHO", "#3b82f6");
    code =
      'const int trigPin = 9;\nconst int echoPin = 10;\n\nvoid setup() {\n  Serial.begin(9600);\n  pinMode(trigPin, OUTPUT);\n  pinMode(echoPin, INPUT);\n  Serial.println("Ultrasonik HC-SR04 Siap!");\n}\n\nvoid loop() {\n  digitalWrite(trigPin, LOW);\n  delayMicroseconds(2);\n  digitalWrite(trigPin, HIGH);\n  delayMicroseconds(10);\n  digitalWrite(trigPin, LOW);\n\n  long durasi = pulseIn(echoPin, HIGH);\n  long jarak = durasi * 0.034 / 2;\n\n  Serial.print("Jarak Terdeteksi: ");\n  Serial.print(jarak);\n  Serial.print(" cm (Waktu: ");\n  Serial.print(durasi);\n  Serial.println(" us)");\n  delay(800);\n}';
  }
  return { version: 1, name: kind, code, components, wires };
}
