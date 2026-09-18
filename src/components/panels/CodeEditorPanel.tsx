"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useSimulatorStore } from "@/store/useSimulatorStore";
import { download } from "@/lib/project/project";
import { useTheme } from "next-themes";
import {
  FileCode2,
  Hash,
  Download,
  Upload,
  ZoomIn,
  ZoomOut,
  Plus,
  X,
  BookOpen,
  Check,
  Code2,
  Search,
  Sparkles,
} from "lucide-react";

// Dynamic import of Monaco Editor with SSR disabled
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-400 text-xs font-mono">
      Memuat Editor Monaco...
    </div>
  ),
});

interface LibraryItem {
  id: string;
  name: string;
  category: "Sensors" | "Actuators" | "Displays" | "Communication";
  header: string;
  description: string;
  templateCode: string;
  wrapperHeaderName: string;
  wrapperHeaderCode: string;
}

const LIBRARIES_CATALOG: LibraryItem[] = [
  {
    id: "dht",
    name: "DHT Sensor (Suhu & Kelembaban)",
    category: "Sensors",
    header: "#include <DHT.h>",
    description: "Library standar untuk membaca suhu (°C) dan kelembaban udara (% RH) dari sensor DHT11 atau DHT22.",
    templateCode: `// Contoh Baca Sensor Suhu & RH DHT11
#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
  Serial.println("DHT11 Sensor Siap!");
}

void loop() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  Serial.print("Suhu: ");
  Serial.print(t);
  Serial.print(" *C  |  RH: ");
  Serial.print(h);
  Serial.println(" %");

  delay(1500);
}
`,
    wrapperHeaderName: "DHTSensor.h",
    wrapperHeaderCode: `// Wrapper Modular Sensor DHT11
#ifndef DHT_SENSOR_H
#define DHT_SENSOR_H

#include <DHT.h>

class DHTModule {
private:
  DHT dht;
  uint8_t pin;

public:
  DHTModule(uint8_t dhtPin, uint8_t type = DHT11) : dht(dhtPin, type), pin(dhtPin) {}

  void init() {
    dht.begin();
  }

  float getTemp() {
    return dht.readTemperature();
  }

  float getHumidity() {
    return dht.readHumidity();
  }
};

#endif
`,
  },
  {
    id: "hcsr04",
    name: "Ultrasonik HC-SR04 (Jarak)",
    category: "Sensors",
    header: "// HC-SR04 pulseIn\n#define TRIG_PIN 9\n#define ECHO_PIN 10",
    description: "Pengukuran jarak pantul gelombang suara presisi 2 cm s/d 400 cm menggunakan durasi pulseIn.",
    templateCode: `// Contoh Baca Sensor Jarak Ultrasonik HC-SR04
const int trigPin = 9;
const int echoPin = 10;

void setup() {
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  Serial.println("HC-SR04 Siap!");
}

void loop() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  float distanceCm = duration * 0.0343 / 2.0;

  Serial.print("Jarak Objek: ");
  Serial.print(distanceCm);
  Serial.println(" cm");

  delay(600);
}
`,
    wrapperHeaderName: "Ultrasonic.h",
    wrapperHeaderCode: `// Wrapper Modular Sensor HC-SR04
#ifndef ULTRASONIC_H
#define ULTRASONIC_H

class UltrasonicSensor {
private:
  int trigPin;
  int echoPin;

public:
  UltrasonicSensor(int trig, int echo) : trigPin(trig), echoPin(echo) {}

  void init() {
    pinMode(trigPin, OUTPUT);
    pinMode(echoPin, INPUT);
  }

  float readCm() {
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    long duration = pulseIn(echoPin, HIGH);
    return (float)(duration * 0.0343 / 2.0);
  }
};

#endif
`,
  },
  {
    id: "lcd1602",
    name: "LCD 16x2 I2C (LiquidCrystal_I2C)",
    category: "Displays",
    header: "#include <Wire.h>\n#include <LiquidCrystal_I2C.h>",
    description: "Modul layar karakter LCD 16x2 via interface bus I2C (PCF8574 address 0x27).",
    templateCode: `// Contoh Tampilan LCD 16x2 I2C
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Nexflux Lab 3D");
  lcd.setCursor(0, 1);
  lcd.print("LCD 16x2 Ready!");
}

void loop() {
  // Loop code here
}
`,
    wrapperHeaderName: "LCDScreen.h",
    wrapperHeaderCode: `// Wrapper Modular LCD 16x2 I2C
#ifndef LCD_SCREEN_H
#define LCD_SCREEN_H

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

class LCDScreen {
private:
  LiquidCrystal_I2C lcd;

public:
  LCDScreen(uint8_t addr = 0x27) : lcd(addr, 16, 2) {}

  void init(const char* line1, const char* line2) {
    lcd.init();
    lcd.backlight();
    lcd.setCursor(0, 0);
    lcd.print(line1);
    lcd.setCursor(0, 1);
    lcd.print(line2);
  }

  void updateText(const char* text, int row = 0) {
    lcd.setCursor(0, row);
    lcd.print(text);
  }
};

#endif
`,
  },
  {
    id: "servo",
    name: "Micro Servo SG90 (Servo.h)",
    category: "Actuators",
    header: "#include <Servo.h>",
    description: "Kontrol sudut putaran motor servo 0° s/d 180° via sinyal PWM pulsa.",
    templateCode: `// Contoh Kontrol Motor Servo SG90
#include <Servo.h>

Servo myServo;
const int servoPin = 9;

void setup() {
  myServo.attach(servoPin);
}

void loop() {
  myServo.write(0);
  delay(1000);
  myServo.write(90);
  delay(1000);
  myServo.write(180);
  delay(1000);
}
`,
    wrapperHeaderName: "ServoController.h",
    wrapperHeaderCode: `// Wrapper Modular Kontrol Servo
#ifndef SERVO_CONTROLLER_H
#define SERVO_CONTROLLER_H

#include <Servo.h>

class ServoModule {
private:
  Servo s;
  int pin;

public:
  ServoModule(int servoPin) : pin(servoPin) {}

  void init() {
    s.attach(pin);
  }

  void setAngle(int angle) {
    s.write(constrain(angle, 0, 180));
  }
};

#endif
`,
  },
  {
    id: "oled",
    name: "OLED SSD1306 128x64 I2C",
    category: "Displays",
    header: "#include <Wire.h>\n#include <Adafruit_GFX.h>\n#include <Adafruit_SSD1306.h>",
    description: "Layar grafis monokrom OLED 0.96 inch dengan interface I2C alamat 0x3C.",
    templateCode: `// Contoh Tampilan Layar OLED SSD1306
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup() {
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(10, 20);
  display.println("Simulasi OLED");
  display.display();
}

void loop() {}
`,
    wrapperHeaderName: "OLEDDisplay.h",
    wrapperHeaderCode: `// Wrapper Modular Layar OLED SSD1306
#ifndef OLED_DISPLAY_H
#define OLED_DISPLAY_H

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

class OLEDModule {
private:
  Adafruit_SSD1306 display;

public:
  OLEDModule() : display(128, 64, &Wire, -1) {}

  void init() {
    display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
    display.clearDisplay();
  }

  void showMessage(const char* msg) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(10, 25);
    display.println(msg);
    display.display();
  }
};

#endif
`,
  },
  {
    id: "wire",
    name: "I2C Bus Library (Wire.h)",
    category: "Communication",
    header: "#include <Wire.h>",
    description: "Protokol Two-Wire Interface standar Arduino untuk komunikasi antarmuka sensor & modul I2C.",
    templateCode: `// Scan Bus I2C Sederhana
#include <Wire.h>

void setup() {
  Wire.begin();
  Serial.begin(9600);
  Serial.println("I2C Bus Diinisialisasi.");
}

void loop() {}
`,
    wrapperHeaderName: "I2CScanner.h",
    wrapperHeaderCode: `// Header Konfigurasi I2C
#ifndef I2C_CONFIG_H
#define I2C_CONFIG_H

#include <Wire.h>

inline void setupI2C() {
  Wire.begin();
}

#endif
`,
  },
  {
    id: "wifi",
    name: "ESP32 Wi-Fi (WiFi.h)",
    category: "Communication",
    header: "#include <WiFi.h>",
    description: "Library komunikasi jaringan nirkabel bawaan mikrokontroler ESP32-WROOM.",
    templateCode: `// Contoh Koneksi WiFi ESP32
#include <WiFi.h>

const char* ssid = "Wokwi-GUEST";
const char* password = "";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  Serial.print("Menghubungkan ke WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nTerhubung! IP: " + WiFi.localIP().toString());
}

void loop() {}
`,
    wrapperHeaderName: "WiFiConfig.h",
    wrapperHeaderCode: `// Header Konfigurasi Wi-Fi Modular
#ifndef WIFI_CONFIG_H
#define WIFI_CONFIG_H

#include <WiFi.h>

inline void connectToWiFi(const char* ssid, const char* pass) {
  WiFi.begin(ssid, pass);
}

#endif
`,
  },
];

export function CodeEditorPanel() {
  const code = useSimulatorStore((s) => s.code);
  const setCode = useSimulatorStore((s) => s.setCode);
  const files = useSimulatorStore(
    (s) => s.files || [{ name: "sketch.ino", content: s.code }]
  );
  const activeFileName = useSimulatorStore(
    (s) => s.activeFileName || "sketch.ino"
  );
  const setActiveFile = useSimulatorStore((s) => s.setActiveFile);
  const addFile = useSimulatorStore((s) => s.addFile);
  const deleteFile = useSimulatorStore((s) => s.deleteFile);

  const { resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState<boolean>(false);
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true);
  const [editorTheme, setEditorTheme] = useState<string>("auto");
  const [fontSize, setFontSize] = useState<number>(13);

  // Multi-file creation state
  const [showNewFileInput, setShowNewFileInput] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>("");

  // Library modal state
  const [showLibraryModal, setShowLibraryModal] = useState<boolean>(false);
  const [librarySearch, setLibrarySearch] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine actual Monaco theme safely for SSR
  const activeTheme =
    editorTheme === "auto"
      ? mounted && resolvedTheme === "light"
        ? "vs"
        : "vs-dark"
      : editorTheme;

  const lineCount = code.split("\n").length;
  const charCount = code.length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3200);
  };

  const handleCreateFile = () => {
    let name = newFileName.trim();
    if (!name) return;

    if (!name.includes(".")) {
      name += ".h";
    }

    const guardName = name.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase();
    let initialContent = "";
    if (name.endsWith(".h")) {
      initialContent = `#ifndef ${guardName}\n#define ${guardName}\n\n// Tulis deklarasi fungsi, struct, atau class di sini\n\n#endif\n`;
    } else if (name.endsWith(".cpp") || name.endsWith(".c")) {
      initialContent = `// Implementasi tambahan untuk sketch\n\n`;
    }

    addFile(name, initialContent);
    setShowNewFileInput(false);
    setNewFileName("");
    showToast(`File ${name} berhasil dibuat!`);
  };

  // Filtered libraries catalog
  const filteredLibraries = useMemo(() => {
    const q = librarySearch.toLowerCase().trim();
    if (!q) return LIBRARIES_CATALOG;
    return LIBRARIES_CATALOG.filter(
      (lib) =>
        lib.name.toLowerCase().includes(q) ||
        lib.description.toLowerCase().includes(q) ||
        lib.header.toLowerCase().includes(q)
    );
  }, [librarySearch]);

  const insertHeaderToSketch = (headerLine: string) => {
    const mainFile = files.find((f) => f.name === "sketch.ino") || files[0];
    const currentText = mainFile ? mainFile.content : code;

    // Check if already included
    const lines = headerLine.split("\n");
    const missingLines = lines.filter(
      (l) => l.startsWith("#include") && !currentText.includes(l.trim())
    );

    if (missingLines.length === 0) {
      showToast("Library sudah terpasang di dalam sketch.");
      return;
    }

    const updated = missingLines.join("\n") + "\n\n" + currentText;
    if (activeFileName === "sketch.ino") {
      setCode(updated);
    } else {
      setActiveFile("sketch.ino");
      setTimeout(() => setCode(updated), 50);
    }
    showToast(`Berhasil menyisipkan ${missingLines.join(", ")}`);
    setShowLibraryModal(false);
  };

  const insertTemplateToSketch = (template: string) => {
    if (activeFileName === "sketch.ino") {
      setCode(template);
    } else {
      setActiveFile("sketch.ino");
      setTimeout(() => setCode(template), 50);
    }
    showToast("Template lengkap berhasil dimuat ke sketch.ino!");
    setShowLibraryModal(false);
  };

  const createWrapperHeader = (name: string, content: string) => {
    addFile(name, content);
    showToast(`File header wrapper ${name} berhasil ditambahkan!`);
    setShowLibraryModal(false);
  };

  return (
    <section className="code-panel flex flex-col h-full bg-slate-900/50 relative">
      {/* ─── TOAST NOTIFICATION ─── */}
      {toastMessage && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-md bg-sky-600 text-white text-xs shadow-lg flex items-center gap-2 border border-sky-400/50 animate-fade-in font-medium">
          <Check size={14} className="text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─── TOOLBAR ─── */}
      <div className="panel-heading flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-slate-700/50 bg-slate-900/80">
        {/* Left: Library Import Button & Info */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-medium transition cursor-pointer"
            onClick={() => setShowLibraryModal(true)}
            title="Katalog Library & Sensor"
          >
            <BookOpen size={13} className="text-sky-400" />
            <span>Import Library</span>
          </button>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            C++ / Arduino IDE
          </span>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {/* Toggle Line Numbers */}
          <button
            type="button"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              showLineNumbers
                ? "bg-slate-800 text-sky-300 border-sky-500/40"
                : "bg-slate-800/40 text-slate-400 border-slate-700 hover:border-slate-600"
            }`}
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            title={showLineNumbers ? "Sembunyikan Nomor Baris" : "Tampilkan Nomor Baris"}
          >
            <Hash size={12} />
            <span>{showLineNumbers ? "Baris: ON" : "Baris: OFF"}</span>
          </button>

          {/* Theme Selector */}
          <div
            suppressHydrationWarning
            className="flex items-center rounded border border-slate-700 bg-slate-800/60 p-0.5"
          >
            <button
              type="button"
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                activeTheme === "vs-dark"
                  ? "bg-sky-600 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              onClick={() => setEditorTheme("vs-dark")}
              title="Tema Gelap (VS Code Dark)"
            >
              Dark
            </button>
            <button
              type="button"
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                activeTheme === "vs"
                  ? "bg-sky-600 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              onClick={() => setEditorTheme("vs")}
              title="Tema Terang (VS Code Light)"
            >
              Light
            </button>
            <button
              type="button"
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                activeTheme === "hc-black"
                  ? "bg-sky-600 text-white font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              onClick={() => setEditorTheme("hc-black")}
              title="Tema High Contrast"
            >
              HC
            </button>
          </div>

          {/* Font Size Zoom Controls */}
          <div className="flex items-center gap-0.5 bg-slate-800/60 rounded border border-slate-700 px-1 py-0.5">
            <button
              type="button"
              className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
              disabled={fontSize <= 11}
              onClick={() => setFontSize(Math.max(11, fontSize - 1))}
              title="Kecilkan Font"
            >
              <ZoomOut size={12} />
            </button>
            <span className="text-[10px] font-mono text-slate-300 px-0.5">
              {fontSize}px
            </span>
            <button
              type="button"
              className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
              disabled={fontSize >= 18}
              onClick={() => setFontSize(Math.min(18, fontSize + 1))}
              title="Besarkan Font"
            >
              <ZoomIn size={12} />
            </button>
          </div>

          {/* Open .ino / .h / .cpp File */}
          <label className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium cursor-pointer transition-colors">
            <Upload size={12} />
            <span>Buka</span>
            <input
              hidden
              type="file"
              accept=".ino,.cpp,.h,.c,.txt"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f && f.size <= 64000) {
                  const content = await f.text();
                  if (f.name.endsWith(".h") || f.name.endsWith(".cpp")) {
                    addFile(f.name, content);
                  } else {
                    setCode(content);
                  }
                }
                e.target.value = "";
              }}
            />
          </label>

          {/* Download File */}
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium transition-colors"
            onClick={() => download(activeFileName, code)}
            title={`Download ${activeFileName}`}
          >
            <Download size={12} />
            <span>Unduh</span>
          </button>
        </div>
      </div>

      {/* ─── MULTI-FILE TABS BAR ─── */}
      <div className="flex items-center gap-1 px-3 py-1 bg-slate-950/90 border-b border-slate-800 text-xs overflow-x-auto select-none">
        {files.map((file) => {
          const isActive = file.name === activeFileName;
          const isMain = file.name === "sketch.ino";
          return (
            <div
              key={file.name}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-t border-t border-x transition cursor-pointer text-[11px] font-mono shrink-0 ${
                isActive
                  ? "bg-slate-900 border-slate-700 text-sky-400 font-semibold"
                  : "bg-slate-950/60 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
              onClick={() => setActiveFile(file.name)}
            >
              <FileCode2 size={12} className={isActive ? "text-sky-400" : "text-slate-500"} />
              <span>{file.name}</span>
              {!isMain && (
                <button
                  type="button"
                  className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 ml-1 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteFile(file.name);
                  }}
                  title={`Tutup ${file.name}`}
                >
                  <X size={11} />
                </button>
              )}
            </div>
          );
        })}

        {/* Add File Trigger */}
        {showNewFileInput ? (
          <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 ml-1">
            <input
              type="text"
              autoFocus
              className="bg-transparent text-[11px] font-mono text-slate-100 outline-none w-28"
              placeholder="sensor.h"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFile();
                if (e.key === "Escape") setShowNewFileInput(false);
              }}
            />
            <button
              type="button"
              className="text-[10px] text-sky-400 font-bold px-1 hover:underline"
              onClick={handleCreateFile}
            >
              OK
            </button>
            <button
              type="button"
              className="text-[10px] text-slate-400 px-0.5 hover:text-rose-400"
              onClick={() => setShowNewFileInput(false)}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition ml-1 shrink-0"
            onClick={() => {
              setNewFileName("");
              setShowNewFileInput(true);
            }}
            title="Tambah file baru (.h atau .cpp)"
          >
            <Plus size={12} />
            <span>+ File</span>
          </button>
        )}
      </div>

      {/* ─── MONACO EDITOR INSTANCE ─── */}
      <div className="flex-1 w-full min-h-[160px] relative overflow-hidden">
        <MonacoEditor
          height="100%"
          language="cpp"
          theme={activeTheme}
          value={code}
          onChange={(val) => setCode(val ?? "")}
          options={{
            lineNumbers: showLineNumbers ? "on" : "off",
            fontSize: fontSize,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            tabSize: 2,
            renderLineHighlight: "line",
            folding: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>

      {/* ─── INTEGRATED MICRO STATUS BAR ─── */}
      <div className="flex items-center justify-between px-2.5 py-1 border-t border-slate-800/80 bg-slate-950/90 text-[10px] text-slate-400 font-mono select-none shrink-0 z-10">
        <div className="flex items-center gap-2 truncate">
          <span className="text-slate-300">{lineCount} baris</span>
          <span className="text-slate-600">·</span>
          <span>{charCount} kar</span>
          <span className="text-slate-600">·</span>
          <span className="text-sky-400 font-semibold truncate max-w-[110px] sm:max-w-[160px]">{activeFileName}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/70 text-slate-300 border border-slate-700/50 hover:text-sky-300 hover:border-sky-500/40 transition cursor-help hidden xs:inline-block"
            title="Pustaka C++ Bawaan: DHT.h, NewPing.h, LiquidCrystal_I2C.h, Servo.h, Adafruit_SSD1306.h, WiFi.h"
          >
            C++ (Arduino)
          </span>
          <button
            type="button"
            onClick={() => setShowLibraryModal(true)}
            className="flex items-center gap-1 text-[9px] text-sky-400 hover:text-sky-300 hover:underline transition px-1 py-0.5 rounded hover:bg-slate-800/50"
            title="Kelola & Import Pustaka"
          >
            <BookOpen size={10} />
            <span className="hidden sm:inline">Library (6)</span>
          </button>
        </div>
      </div>

      {/* ─── MODAL IMPORT LIBRARY & SENSOR ─── */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Katalog Library & Sensor Bawaan
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Impor header, boilerplate, atau buat wrapper file .h langsung ke sketch
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="p-1 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition"
                onClick={() => setShowLibraryModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Filter */}
            <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-950/40">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
                <Search size={14} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari library (DHT11, Ultrasonik, LCD 16x2, Servo, OLED, I2C)..."
                  className="bg-transparent text-xs text-slate-200 outline-none w-full"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                />
                {librarySearch && (
                  <button
                    type="button"
                    onClick={() => setLibrarySearch("")}
                    className="text-slate-400 hover:text-slate-200 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Library Cards List */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {filteredLibraries.map((lib) => (
                <div
                  key={lib.id}
                  className="p-3 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950/60 flex flex-col gap-2 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">{lib.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                          {lib.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {lib.description}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 px-2 py-1 rounded font-mono text-[10px] text-sky-300 border border-slate-800 overflow-x-auto">
                    {lib.header}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-medium flex items-center gap-1.5 transition shadow-sm"
                      onClick={() => insertHeaderToSketch(lib.header)}
                    >
                      <Plus size={11} />
                      <span>Sisipkan #include</span>
                    </button>

                    <button
                      type="button"
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1.5 transition"
                      onClick={() => insertTemplateToSketch(lib.templateCode)}
                    >
                      <Code2 size={11} className="text-indigo-400" />
                      <span>Pakai Template Lengkap</span>
                    </button>

                    <button
                      type="button"
                      className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1.5 transition"
                      onClick={() => createWrapperHeader(lib.wrapperHeaderName, lib.wrapperHeaderCode)}
                      title={`Buat file header ${lib.wrapperHeaderName} di tab baru`}
                    >
                      <Sparkles size={11} className="text-amber-400" />
                      <span>Buat Header Modular ({lib.wrapperHeaderName})</span>
                    </button>
                  </div>
                </div>
              ))}

              {filteredLibraries.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Tidak ada library yang cocok dengan pencarian "{librarySearch}".
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-900 flex justify-between items-center text-[11px] text-slate-400">
              <span>{filteredLibraries.length} library siap pakai</span>
              <button
                type="button"
                className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
                onClick={() => setShowLibraryModal(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
