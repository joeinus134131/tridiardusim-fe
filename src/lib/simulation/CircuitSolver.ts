import type { CircuitComponent, Wire, PinMode } from '../components/componentTypes';

export interface IO { mode: PinMode; value: number; }
export interface CircuitResult {
  voltages: Record<string, number>;
  states: Record<string, Record<string, number | boolean>>;
  warnings: string[];
}
export const terminal = (id: string, pin: string) => `${id}:${pin}`;

/** Quasi-static DC nodal solver. Ideal nets, finite output impedance, piecewise LED. */
export function solveCircuit(components: CircuitComponent[], wires: Wire[], io: Record<string, IO>): CircuitResult {
  const parent = new Map<string, string>();
  for (const c of components) for (const p of c.pins) parent.set(terminal(c.id, p.id), terminal(c.id, p.id));
  const root = (x: string): string => { const p = parent.get(x); if (!p || p === x) return x; const r = root(p); parent.set(x, r); return r; };
  const join = (a: string, b: string) => { if (parent.has(a) && parent.has(b)) parent.set(root(a), root(b)); };
  for (const w of wires) join(terminal(w.sourceComponentId, w.sourcePinId), terminal(w.targetComponentId, w.targetPinId));
  for (const c of components) {
    const j = (a: string, b: string) => join(terminal(c.id,a),terminal(c.id,b));
    if (c.typeId.startsWith('jumper_')) j('L','R');
    if (c.typeId === 'push_button') { j('1a','1b'); j('2a','2b'); if(c.state.isPressed) j('1a','2a'); }
    if (c.typeId === 'breadboard') {
      for(let col=0; col<30; col++) for(const side of ['t','b']) for(let row=1; row<5; row++) j(`${side}${col}_0`,`${side}${col}_${row}`);
      for(const rail of ['pt1','pt2','pb1','pb2']) for(let col=1; col<30; col++) j(`${rail}_0`,`${rail}_${col}`);
    }
    if(c.typeId === 'arduino_uno') { j('GND1','GND2'); j('GND1','GND3'); j('SDA','A4'); j('SCL','A5'); j('IOREF','5V'); j('ICSP_GND','GND1'); j('ICSP_5V','5V'); j('ICSP_MOSI','D11'); j('ICSP_MISO','D12'); j('ICSP_SCK','D13'); j('ICSP_RESET','RESET'); }
  }
  const warnings = new Set<string>();
  const fixed = new Map<string, number>();
  const sources: {node:string; voltage:number; resistance:number}[] = [];
  const edges: {a:string;b:string;r:number;vf:number;led?:string}[] = [];
  const node = (c:CircuitComponent,p:string) => root(terminal(c.id,p));
  const fix = (n:string,v:number) => { if(fixed.has(n) && Math.abs(fixed.get(n)!-v)>0.01) warnings.add('Hubung singkat antar catu/GND: hasil tidak valid.'); fixed.set(n,v); };
  for(const c of components) {
    if(c.typeId==='arduino_uno') {
      fix(node(c,'GND1'),0); fix(node(c,'5V'),5); fix(node(c,'3V3'),3.3);
      for(const p of c.pins) {
        const pin = io[p.id];
        if(pin?.mode==='OUTPUT') sources.push({node:node(c,p.id),voltage:pin.value,resistance:25});
        else if(pin?.mode==='INPUT_PULLUP') sources.push({node:node(c,p.id),voltage:5,resistance:30000});
      }
    }
    if(c.typeId==='resistor_220') edges.push({a:node(c,'L'),b:node(c,'R'),r:Math.max(1,Number(c.state.resistance)||220),vf:0});
    if(c.typeId==='potentiometer') {
      const v=Math.max(0,Math.min(1,Number(c.state.value)||0));
      edges.push({a:node(c,'1'),b:node(c,'W'),r:Math.max(1,10000*(1-v)),vf:0},{a:node(c,'W'),b:node(c,'2'),r:Math.max(1,10000*v),vf:0});
    }
    if(c.typeId==='led_red') edges.push({a:node(c,'A'),b:node(c,'C'),r:10,vf:1.8,led:c.id});
  }
  // Only solve electrically active nets; unused breadboard holes cost no matrix rows.
  const active = new Set([...fixed.keys(),...sources.map(s=>s.node),...edges.flatMap(e=>[e.a,e.b])]);
  const unknown = [...active].filter(n=>!fixed.has(n));
  if(unknown.length>256) throw new Error('Batas solver: 256 net aktif. Kurangi rangkaian.');
  const index = new Map(unknown.map((n,i)=>[n,i]));
  const voltage = new Map(fixed);
  for(const n of unknown) voltage.set(n,0);
  let enabled = new Set<string>();
  let converged = false;
  for(let iteration=0; iteration<40; iteration++) {
    const n=unknown.length;
    const a=Array.from({length:n},()=>new Float64Array(n+1));
    for(let i=0;i<n;i++) a[i][i]=1e-10; // deterministic floating-net reference
    const stamp = (x:string,y:string|undefined,g:number,offset:number) => {
      const i=index.get(x); if(i===undefined) return;
      a[i][i]+=g; a[i][n]+=g*offset;
      if(y!==undefined) { const j=index.get(y); if(j!==undefined) a[i][j]-=g; else a[i][n]+=g*(fixed.get(y)||0); }
    };
    for(const s of sources) stamp(s.node,undefined,1/s.resistance,s.voltage);
    for(const e of edges) {
      if(e.led && !enabled.has(e.led)) continue;
      stamp(e.a,e.b,1/e.r,e.vf); stamp(e.b,e.a,1/e.r,-e.vf);
    }
    for(let k=0;k<n;k++) {
      let pivot=k; for(let i=k+1;i<n;i++) if(Math.abs(a[i][k])>Math.abs(a[pivot][k])) pivot=i;
      [a[k],a[pivot]]=[a[pivot],a[k]];
      const d=a[k][k]; if(Math.abs(d)<1e-15) continue;
      for(let j=k;j<=n;j++) a[k][j]/=d;
      for(let i=k+1;i<n;i++) { const f=a[i][k]; if(!f) continue; for(let j=k;j<=n;j++) a[i][j]-=f*a[k][j]; }
    }
    for(let i=n-1;i>=0;i--) { let v=a[i][n]; for(let j=i+1;j<n;j++) v-=a[i][j]*(voltage.get(unknown[j])||0); voltage.set(unknown[i],v); }
    const next=new Set<string>();
    for(const e of edges) if(e.led && (voltage.get(e.a)!-voltage.get(e.b)!)>e.vf+1e-7) next.add(e.led);
    if([...next].every(x=>enabled.has(x)) && next.size===enabled.size) {converged=true;break;}
    enabled=next;
  }
  if(!converged) warnings.add('Solver LED tidak konvergen; sederhanakan rangkaian.');
  for(const s of sources) if(s.resistance===25 && Math.abs((s.voltage-(voltage.get(s.node)||0))/25)>.02) warnings.add('Arus pin melebihi 20 mA; periksa resistor atau hubung singkat.');
  const states:CircuitResult['states']={};
  for(const c of components) {
    if(c.typeId==='arduino_uno') states[c.id]={isOn:true,builtinLED:(voltage.get(node(c,'D13'))||0)>2.5};
    if(c.typeId==='led_red') {
      const e=edges.find(e=>e.led===c.id)!;
      const current=converged && enabled.has(c.id)?Math.max(0,((voltage.get(e.a)||0)-(voltage.get(e.b)||0)-1.8)/10):0;
      states[c.id]={isOn:current>0.0001,brightness:Math.min(255,Math.round(current/.02*255)),currentMa:current*1000};
      if(current>.02) warnings.add(`${c.name}: arus LED >20 mA. Tambahkan resistor pembatas.`);
    }
  }
  const voltages:Record<string,number>={};
  for(const t of parent.keys()) if(voltage.has(root(t))) voltages[t]=voltage.get(root(t))!;
  return {voltages,states,warnings:[...warnings]};
}
