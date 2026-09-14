import type { CircuitComponent } from './componentTypes';
export type Vec = [number, number, number];
export type Bounds = { min: Vec; max: Vec };
// Conservative physical envelopes, including terminals; no mesh scaling during placement.
export function localBounds(c: CircuitComponent): Bounds {
  const bounds: Record<string, [Vec, Vec]> = {
    arduino_uno: [[-7.8, 0, -5.34], [6.86, 2.8, 5.34]],
    esp32_wroom: [[-2.79, -.6, -5.5], [2.79, 1.15, 5.7]],
    breadboard: [[-8.4, 0, -5.43], [8.4, 1.7, 5.43]],
    resistor_220: [[-1.05, -.6, -.25], [1.05, .49, .25]],
    led_red: [[-.59, -5.4, -.59], [.59, 1.72, .59]],
    push_button: [[-.8, -.7, -.6], [.8, .86, .6]],
    potentiometer: [[-1, -.7, -1], [1, 4.6, 1]],
  };
  const b = c.typeId.startsWith('jumper_')
    ? [[-3.7, 0, -Number(c.state.depth || 8)-.2], [3.7, Number(c.state.bendHeight || .3)+.2, .1]] as [Vec, Vec]
    : bounds[c.typeId] || [[-.5, 0, -.5], [.5, 1, .5]];
  return { min: b[0], max: b[1] };
}
export function rotate(v: Vec, r: Vec): Vec {
  // THREE.Euler XYZ applies Z, then Y, then X to the vector.
  const [a,b,c] = r, [x,y,z] = v;
  const xx=x*Math.cos(c)-y*Math.sin(c), yy=x*Math.sin(c)+y*Math.cos(c);
  const xxx=xx*Math.cos(b)+z*Math.sin(b), zz=-xx*Math.sin(b)+z*Math.cos(b);
  return [xxx, yy*Math.cos(a)-zz*Math.sin(a), yy*Math.sin(a)+zz*Math.cos(a)];
}
export function world(c: CircuitComponent, p: Vec): Vec {
  return rotate(p,c.rotation).map((v,i)=>v+c.position[i]) as Vec;
}
export function worldBounds(c: CircuitComponent): Bounds {
  const b=localBounds(c), points: Vec[]=[];
  for(const x of [b.min[0],b.max[0]]) for(const y of [b.min[1],b.max[1]]) for(const z of [b.min[2],b.max[2]]) points.push(world(c,[x,y,z]));
  return {min:[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))) as Vec, max:[0,1,2].map(i=>Math.max(...points.map(p=>p[i]))) as Vec};
}
const mountable = (c:CircuitComponent) => ['resistor_220','led_red','potentiometer','esp32_wroom'].includes(c.typeId);
export type Contact = { componentId: string; pinId: string; boardId: string; holeId: string };
export function contacts(c:CircuitComponent, all:CircuitComponent[]):Contact[] {
  if(!mountable(c)) return [];
  for(const b of all.filter(x=>x.typeId==='breadboard')) {
    const holes=b.pins.map(p=>({id:p.id,p:world(b,p.position)}));
    const pairs:Contact[]=[];
    for(const pin of c.pins) {
      const p=world(c,pin.position);
      const hole=holes.find(h=>Math.hypot(p[0]-h.p[0],p[2]-h.p[2])<.025 && p[1]<=h.p[1]+.025 && p[1]>=h.p[1]-.4);
      if(hole) pairs.push({componentId:c.id,pinId:pin.id,boardId:b.id,holeId:hole.id});
    }
    if(pairs.length===c.pins.length && new Set(pairs.map(p=>p.holeId)).size===pairs.length) return pairs;
  }
  return [];
}
export function snapToBreadboard(c:CircuitComponent, all:CircuitComponent[]):CircuitComponent {
  if(!mountable(c) || c.rotation[0]!==0 || c.rotation[2]!==0) return c;
  const first=world(c,c.pins[0].position);
  for(const b of all.filter(x=>x.typeId==='breadboard' && x.rotation[0]===0 && x.rotation[2]===0)) {
    const bb=worldBounds(b);
    if(c.position[0]<bb.min[0] || c.position[0]>bb.max[0] || c.position[2]<bb.min[2] || c.position[2]>bb.max[2]) continue;
    const holes=b.pins.map(p=>world(b,p.position)).sort((a,b)=>Math.hypot(a[0]-first[0],a[2]-first[2])-Math.hypot(b[0]-first[0],b[2]-first[2]));
    for(const hole of holes.slice(0,8)) {
      if(Math.hypot(hole[0]-first[0],hole[2]-first[2])>.8) continue;
      const candidate={...c,position:[c.position[0]+hole[0]-first[0],hole[1]-Math.max(...c.pins.map(p=>p.position[1]))-.05,c.position[2]+hole[2]-first[2]] as Vec};
      if(contacts(candidate,[b]).length) return candidate;
    }
  }
  return c;
}
export function placementError(c:CircuitComponent, all:CircuitComponent[]):string {
  const a=worldBounds(c), own=contacts(c,all);
  if(a.min[1]<-.015 && !own.length) return 'Kaki komponen tidak boleh menembus meja.';
  const occupied=new Set(all.filter(x=>x.id!==c.id).flatMap(x=>contacts(x,all)).map(x=>x.boardId+':'+x.holeId));
  if(own.some(x=>occupied.has(x.boardId+':'+x.holeId))) return 'Lubang breadboard sudah ditempati kaki komponen lain.';
  for(const other of all) {
    if(other.id===c.id) continue;
    if(own.some(x=>x.boardId===other.id) || contacts(other,all).some(x=>x.boardId===c.id)) continue;
    const b=worldBounds(other);
    if([0,1,2].every(i=>a.max[i]>b.min[i]+.015 && a.min[i]<b.max[i]-.015)) return `Terhalang ${other.name}: bounding box bertabrakan.`;
  }
  return '';
}
