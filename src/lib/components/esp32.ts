import type { PinDefinition } from './componentTypes';
// Espressif ESP32-DevKitC V4 J2/J3, ordered antenna -> USB.
const rows = [
 ['3V3','EN','GPIO36','GPIO39','GPIO34','GPIO35','GPIO32','GPIO33','GPIO25','GPIO26','GPIO27','GPIO14','GPIO12','GND1','GPIO13','GPIO9','GPIO10','GPIO11','5V'],
 ['GND2','GPIO23','GPIO22','GPIO1','GPIO3','GPIO21','GND3','GPIO19','GPIO18','GPIO5','GPIO17','GPIO16','GPIO4','GPIO0','GPIO2','GPIO15','GPIO8','GPIO7','GPIO6'],
];
export const esp32AnalogPins=[0,2,4,12,13,14,15,25,26,27,32,33,34,35,36,39];
export const esp32Pins: PinDefinition[]=rows.flatMap((row,side)=>row.map((id,i)=>({
 id, name: id==='GPIO36'?'VP / GPIO36':id==='GPIO39'?'VN / GPIO39':id,
 type:id.startsWith('GND')?'ground':['5V','3V3'].includes(id)?'power':esp32AnalogPins.includes(Number(id.replace('GPIO','')))?'analog':'digital',
 position:[side===0?-2.54:2.54,-.6,(i-9)*.508],
})));
export const isMicrocontroller=(type:string)=>type==='arduino_uno'||type==='esp32_wroom';
export function gpioPin(type:string, value:number, analog=false):string {
 if(type==='esp32_wroom') {
   if(!Number.isInteger(value) || !esp32Pins.some(p=>p.id===`GPIO${value}`)) throw new Error(`GPIO ESP32 tidak valid: ${value}`);
   if(value>=6 && value<=11) throw new Error('GPIO6–11 dipakai flash ESP32; gunakan GPIO lain.');
   if(analog && !esp32AnalogPins.includes(value)) throw new Error(`GPIO${value} tidak mempunyai ADC.`);
   return `GPIO${value}`;
 }
 if(!Number.isInteger(value)||value<0||value>19) throw new Error(`Pin tidak valid: ${value}`);
 return analog&&value<6?`A${value}`:value>=14?`A${value-14}`:`D${value}`;
}
export function validateOutput(type:string,pin:string,mode:string) {
 if(type==='esp32_wroom' && Number(pin.replace('GPIO',''))>=34 && mode!=='INPUT') throw new Error(`${pin} hanya INPUT dan tidak memiliki pull-up internal.`);
}
