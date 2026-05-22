import { useSimulatorStore } from '@/store/useSimulatorStore';
import { ComponentRegistry } from '../components/ComponentRegistry';
import { clamp } from '../utils';

// Global execution context for the interpreted code
const ctx: any = {
  pins: new Map<number, { mode: string, digitalValue: number, analogValue: number }>(),
  timeMs: 0,
};

export class ArduinoInterpreter {
  private isRunning = false;
  private currentTimeout: any = null;
  private loopInterval: any = null;

  start() {
    this.isRunning = true;
    ctx.timeMs = 0;
    
    // Reset virtual pins
    ctx.pins.clear();
    for (let i = 0; i <= 20; i++) {
      ctx.pins.set(i, { mode: 'INPUT', digitalValue: 0, analogValue: 0 });
    }

    const store = useSimulatorStore.getState();
    const code = store.code;

    // Transpile Arduino C++ to JS
    // MVP limitation: Very basic regex replacement. A real parser (like esprima + custom AST) or WASM is needed for full C++
    let jsCode = code
      .replace(/void setup\s*\(\)\s*\{/g, 'async function setup() {')
      .replace(/void loop\s*\(\)\s*\{/g, 'async function loop() {')
      .replace(/int /g, 'let ')
      .replace(/float /g, 'let ')
      .replace(/String /g, 'let ')
      .replace(/bool /g, 'let ')
      .replace(/byte /g, 'let ')
      .replace(/delay\(/g, 'await delay('); // Make delay non-blocking

    // API Implementations
    const api = `
      const HIGH = 1;
      const LOW = 0;
      const INPUT = 'INPUT';
      const OUTPUT = 'OUTPUT';
      const INPUT_PULLUP = 'INPUT_PULLUP';
      const LED_BUILTIN = 13;

      function pinMode(pin, mode) {
        if (ctx.pins.has(pin)) {
          ctx.pins.get(pin).mode = mode;
        }
      }

      function digitalWrite(pin, val) {
        if (ctx.pins.has(pin)) {
          ctx.pins.get(pin).digitalValue = val;
          // Trigger component updates
          updateComponents(pin, 'digital', val);
        }
      }

      function digitalRead(pin) {
        // Find which component is connected to this pin and read its state
        return readComponentState(pin, 'digital');
      }

      function analogWrite(pin, val) {
        if (ctx.pins.has(pin)) {
          ctx.pins.get(pin).analogValue = val;
          updateComponents(pin, 'pwm', val);
        }
      }

      function analogRead(pin) {
        // e.g. A0 is usually pin 14 in raw indexing
        return readComponentState(pin, 'analog');
      }

      const Serial = {
        begin: (baud) => { console.log('Serial begin', baud); },
        print: (msg) => { printSerial(msg); },
        println: (msg) => { printSerial(msg + '\\n'); }
      };

      const delay = ms => new Promise(res => setTimeout(res, ms));
      const millis = () => ctx.timeMs;
    `;

    // Inject into function body
    const executor = new Function('ctx', 'updateComponents', 'readComponentState', 'printSerial', `
      return (async function() {
        ${api}
        ${jsCode}
        
        try {
          if (typeof setup === 'function') await setup();
          return loop; // Return the loop function to be called repeatedly
        } catch(e) {
          console.error(e);
          printSerial('Error: ' + e.message + '\\n');
          return null;
        }
      })();
    `);

    // Bridge functions
    const updateComponents = (pin: number, type: string, value: number) => {
      // Very naive mapping for MVP: assume pin 13 is the LED if an LED exists
      const store = useSimulatorStore.getState();
      
      // Real logic: traverse wires from Arduino Pin to Component
      // Fake logic for MVP Blink test:
      if (pin === 13) {
        store.components.forEach(c => {
          if (c.typeId === 'led_red') {
            store.updateComponentState(c.id, { isOn: value === 1, brightness: type === 'pwm' ? value : 0 });
          }
        });
      }
    };

    const readComponentState = (pin: number, type: string) => {
      const store = useSimulatorStore.getState();
      // Fake logic: if reading pin 2, look for a button
      if (pin === 2 || pin === 'D2') {
         const btn = store.components.find(c => c.typeId === 'push_button');
         if (btn) return btn.state.isPressed ? 1 : 0;
      }
      if (pin === 14 || pin === 'A0') {
         const pot = store.components.find(c => c.typeId === 'potentiometer');
         if (pot) return Math.floor(pot.state.value * 1023);
      }
      return 0;
    };

    const printSerial = (msg: string) => {
      useSimulatorStore.getState().addSerialMessage({ message: String(msg), type: 'info' });
    };

    // Execute
    executor(ctx, updateComponents, readComponentState, printSerial).then((loopFn: any) => {
      if (!loopFn) return;
      
      const runLoop = async () => {
        if (!this.isRunning) return;
        try {
          await loopFn();
          ctx.timeMs += 16; // increment time roughly by tick
          this.currentTimeout = setTimeout(runLoop, 16);
        } catch(e: any) {
          console.error(e);
          printSerial('Error in loop: ' + e.message + '\n');
          this.stop();
        }
      };

      runLoop();
    });
  }

  stop() {
    this.isRunning = false;
    if (this.currentTimeout) clearTimeout(this.currentTimeout);
    if (this.loopInterval) clearInterval(this.loopInterval);
    
    // Turn everything off
    const store = useSimulatorStore.getState();
    store.components.forEach(c => {
      if (c.typeId === 'led_red') {
        store.updateComponentState(c.id, { isOn: false, brightness: 0 });
      }
    });
  }
}

// Singleton instance
export const arduinoEngine = new ArduinoInterpreter();
