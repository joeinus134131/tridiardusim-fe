import type { PyodideInterface } from "pyodide";
import { PYTHON_PROGRAM_SETUP, pythonExecSource } from "./pythonProgram";
import { PYODIDE_VERSION } from "./pyodideVersion";

type RGBDFrame = { width: number; height: number; rgba: Uint8Array; sampleCount: number };
type WorkerMessage =
  | { type: "start"; code: string; boardType: string; boardId: string; voltages: Record<string, number>; camera?: RGBDFrame }
  | { type: "pause" | "resume" }
  | { type: "gpio_voltages"; voltages: Record<string, number> }
  | { type: "camera_frame"; frame: RGBDFrame };

type WorkerScope = {
  location: Location;
  postMessage: (message: unknown) => void;
  onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null;
};
const selfWorker = self as unknown as WorkerScope;
const packageBaseUrl = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const pyodideReady = (async () => {
  const runtimeModuleUrl = new URL("/pyodide/pyodide.mjs", selfWorker.location.origin).href;
  const { loadPyodide } = await import(/* webpackIgnore: true */ runtimeModuleUrl);
  return loadPyodide({
    indexURL: new URL("/pyodide/", selfWorker.location.origin).href,
    packageBaseUrl,
  });
})();
let pyodide: PyodideInterface | null = null;
let paused = false;
let busy = false;
let boardType = "arduino_uno";
let inputsReady = false;
let pendingVoltages: Record<string, number> | null = null;
let pendingCamera: RGBDFrame | null = null;

function send(data: Record<string, unknown>) { selfWorker.postMessage(data); }

const installVhal = `
import sys, types, numpy as np, cv2

__gpio_voltages = {}
__camera_rgba = None
__camera_width = 0
__camera_height = 0
__gpio_board_type = "arduino_uno"
__gpio_board_id = ""
__gpio_supply = 5.0
__gpio_channels = set()

def __set_gpio_context(board_type, supply, board_id):
    global __gpio_board_type, __gpio_board_id, __gpio_supply
    __gpio_board_type, __gpio_board_id = board_type, board_id
    __gpio_supply = supply

class __VirtualVideoCapture:
    def __init__(self, index=0):
        if int(index) != 0:
            raise ValueError("V-SBC hanya menyediakan kamera virtual index 0.")
        self.opened = True
    def isOpened(self): return self.opened
    def read(self):
        if not self.opened or __camera_rgba is None:
            return False, None
        array = np.frombuffer(__camera_rgba, dtype=np.uint8)
        if array.size != __camera_width * __camera_height * 4: return False, None
        # Three.js rows use lower-left origin; OpenCV expects BGR and top-left origin.
        image = array.reshape((__camera_height, __camera_width, 4))[::-1, :, :3][:, :, ::-1].copy()
        return True, image
    def release(self): self.opened = False
    def get(self, prop):
        if prop == 3: return __camera_width
        if prop == 4: return __camera_height
        return 0
    def set(self, prop, value): return False

cv2.VideoCapture = __VirtualVideoCapture

class __GPIOPWM:
    def __init__(self, channel, frequency):
        self.channel, self.frequency, self.running = int(channel), float(frequency), False
    def start(self, duty_cycle):
        self.running = True
        __gpio_emit(self.channel, "PWM", float(duty_cycle))
    def ChangeDutyCycle(self, duty_cycle):
        if self.running: __gpio_emit(self.channel, "PWM", float(duty_cycle))
    def ChangeFrequency(self, frequency): self.frequency = float(frequency)
    def stop(self):
        if self.running: __gpio_emit(self.channel, "OUTPUT", 0)
        self.running = False

GPIO = types.ModuleType("Jetson.GPIO")
GPIO.BCM, GPIO.BOARD = 11, 10
GPIO.IN, GPIO.OUT = 0, 1
GPIO.LOW, GPIO.HIGH = 0, 1
GPIO.PUD_OFF, GPIO.PUD_DOWN, GPIO.PUD_UP = 20, 21, 22
GPIO.FALLING, GPIO.RISING, GPIO.BOTH = 31, 32, 33
GPIO.setwarnings = lambda enabled: None
GPIO.setmode = lambda mode: (_ for _ in ()).throw(ValueError("V-SBC mendukung GPIO.BCM; GPIO.BOARD belum didukung.")) if mode != GPIO.BCM else None
GPIO.PWM = __GPIOPWM

def __pin_name(channel):
    pin = int(channel)
    if pin < 0 or pin > 48: raise ValueError("Nomor GPIO harus berada pada rentang 0–48.")
    if __gpio_board_type == "esp32_wroom": return "GPIO" + str(pin)
    return "A" + str(pin - 14) if pin >= 14 else "D" + str(pin)

def __gpio_setup(channel, mode, pull_up_down=None, initial=None):
    if mode not in (GPIO.IN, GPIO.OUT): raise ValueError("Mode GPIO harus IN atau OUT.")
    __gpio_channels.add(int(channel))
    if mode == GPIO.OUT:
        value = GPIO.LOW if initial is None else int(bool(initial))
        __gpio_emit(int(channel), "OUTPUT", value)
    elif pull_up_down == GPIO.PUD_UP:
        __gpio_emit(int(channel), "INPUT_PULLUP", 1)
    else:
        __gpio_emit(int(channel), "INPUT", 0)

def __gpio_output(channel, value):
    if not isinstance(value, (int, bool)): raise ValueError("Nilai GPIO harus LOW atau HIGH.")
    __gpio_emit(int(channel), "OUTPUT", int(bool(value)))

def __gpio_input(channel):
    voltage = float(__gpio_voltages.get(__gpio_board_id + ":" + __pin_name(channel), 0.0))
    return int(voltage >= __gpio_supply / 2)

def __gpio_cleanup(channel=None):
    channels = list(__gpio_channels) if channel is None else [int(channel)]
    for pin in channels:
        __gpio_emit(pin, "INPUT", 0)
        __gpio_channels.discard(pin)

GPIO.setup = __gpio_setup
GPIO.output = __gpio_output
GPIO.input = __gpio_input
GPIO.cleanup = __gpio_cleanup
GPIO.gpio_function = lambda channel: GPIO.IN
GPIO.getmode = lambda: GPIO.BCM
GPIO.JETSON_INFO = {"P1_REVISION": 1, "RAM": "virtual", "REVISION": "V-SBC", "TYPE": "Virtual SBC", "MANUFACTURER": "TridiArduSim", "PROCESSOR": "WebAssembly"}
GPIO.VERSION = "V-SBC"
GPIO.__version__ = "V-SBC"
jetson = types.ModuleType("Jetson")
jetson.GPIO = GPIO
sys.modules["Jetson"] = jetson
sys.modules["Jetson.GPIO"] = GPIO

`;

function installCamera(frame?: RGBDFrame) {
  if (!pyodide) return;
  const previous = pyodide.globals.get("__camera_rgba");
  if (!frame?.rgba?.length || frame.rgba.length !== frame.width * frame.height * 4) {
    pyodide.globals.set("__camera_rgba", null);
    pyodide.globals.set("__camera_width", 0);
    pyodide.globals.set("__camera_height", 0);
    if (previous && typeof previous.destroy === "function") previous.destroy();
    return;
  }
  const bytes = pyodide.toPy(frame.rgba);
  pyodide.globals.set("__camera_rgba", bytes);
  pyodide.globals.set("__camera_width", frame.width);
  pyodide.globals.set("__camera_height", frame.height);
  if (previous && typeof previous.destroy === "function") previous.destroy();
}

function installVoltages(voltages: Record<string, number>) {
  if (!pyodide) return;
  const values = pyodide.toPy(voltages);
  const previous = pyodide.globals.get("__gpio_voltages");
  pyodide.globals.set("__gpio_voltages", values);
  if (previous && typeof previous.destroy === "function") previous.destroy();
  values.destroy();
}

async function start(message: Extract<WorkerMessage, { type: "start" }>) {
  if (busy) return;
  busy = true;
  boardType = message.boardType;
  paused = false;
  inputsReady = false;
  pendingVoltages = null;
  pendingCamera = null;
  send({ type: "status", status: "loading" });
  try {
    const runtime = await pyodideReady;
    pyodide = runtime;
    runtime.setStdout({ batched: (text: string) => send({ type: "stdout", text }) });
    runtime.setStderr({ batched: (text: string) => send({ type: "stderr", text }) });
    await runtime.loadPackage(["numpy", "opencv-python"]);
    runtime.globals.set("__gpio_emit", (pin: number, mode: string, value: number) => {
      send({ type: "gpio", pin, mode, value });
    });
    runtime.globals.set("__is_paused", () => paused);
    await runtime.runPythonAsync(installVhal + PYTHON_PROGRAM_SETUP);
    await runtime.runPythonAsync(`__set_gpio_context(${JSON.stringify(boardType)}, ${boardType === "esp32_wroom" ? 3.3 : 5}, ${JSON.stringify(message.boardId)})`);
    installVoltages(message.voltages ?? {});
    installCamera(message.camera);
    inputsReady = true;
    if (pendingVoltages) installVoltages(pendingVoltages);
    if (pendingCamera) installCamera(pendingCamera);
    // Sketches run in a worker with browser networking disabled. V-HAL messages
    // are the only supported route from user Python back into the simulator.
    const blockNetwork = () => { throw new Error("Akses jaringan dinonaktifkan di V-SBC simulator."); };
    for (const name of ["fetch", "XMLHttpRequest", "WebSocket", "Worker", "SharedWorker", "EventSource", "WebTransport"]) {
      try { Object.defineProperty(selfWorker, name, { configurable: false, writable: false, value: name === "fetch" ? blockNetwork : undefined }); } catch { /* Browser-owned properties may be non-configurable. */ }
    }
    send({ type: "status", status: "running", pyodideVersion: PYODIDE_VERSION });
    await runtime.runPythonAsync(pythonExecSource(message.code));
    send({ type: "status", status: "finished" });
  } catch (error) {
    send({ type: "error", message: error instanceof Error ? error.message : String(error) });
  } finally {
    busy = false;
  }
}

selfWorker.onmessage = async ({ data }: MessageEvent<WorkerMessage>) => {
  if (data.type === "start") {
    await start(data);
  } else if (data.type === "pause") {
    paused = true;
  } else if (data.type === "resume") {
    paused = false;
  } else if (data.type === "gpio_voltages") {
    if (inputsReady) installVoltages(data.voltages);
    else pendingVoltages = data.voltages;
  } else if (data.type === "camera_frame") {
    if (inputsReady) installCamera(data.frame);
    else pendingCamera = data.frame;
  }
};
