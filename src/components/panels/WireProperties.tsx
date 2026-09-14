'use client';
import { WireColors } from './WireColors';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { world, type Vec } from '@/lib/components/placement';
export function WireProperties() {
 const wire=useSimulatorStore(s=>s.wires.find(w=>w.id===s.selectedWireId));
 const all=useSimulatorStore(s=>s.components);
 const update=useSimulatorStore(s=>s.updateWire);
 if(!wire) return null;
 const addPoint=()=>{
  const a=all.find(c=>c.id===wire.sourceComponentId)!, b=all.find(c=>c.id===wire.targetComponentId)!;
  const start=world(a,a.pins.find(p=>p.id===wire.sourcePinId)!.position), end=world(b,b.pins.find(p=>p.id===wire.targetPinId)!.position);
  const path=wire.path||[];
  const from=path.at(-1)||start;
  update(wire.id,{path:[...path,from.map((v,i)=>(v+end[i])/2+(i===1?2:0)) as Vec]});
 };
 return <div className="properties"><div className="panel-heading"><strong>Jalur kabel</strong><button aria-label="Tutup properti kabel" onClick={()=>useSimulatorStore.getState().selectWire(null)}>×</button></div><div className="property-body">
  <label>Warna kabel<input type="color" aria-label="Warna kabel terpilih" value={wire.color} onChange={e=>update(wire.id,{color:e.target.value})}/></label>
  <WireColors onChange={color=>update(wire.id,{color})} />
  <p>Tambah titik lekukan, lalu geser titik di kanvas atau atur X/Y/Z. Y mengatur ketinggian. Ujung kabel tetap mengikuti pin.</p>
  <button className="small-button" disabled={(wire.path?.length||0)>=12} onClick={addPoint}>Tambah titik lekukan</button>
  <button className="small-button" onClick={()=>update(wire.id,{path:undefined})}>Reset jalur otomatis</button>
  {(wire.path||[]).map((p,index)=><fieldset key={index}><legend>Tekukan {index+1}</legend>{['X','Y','Z'].map((axis,i)=><label key={axis}>{axis}<input aria-label={`Tekukan ${index+1} ${axis}`} type="number" step="0.254" value={Number(p[i].toFixed(3))} onChange={e=>{
    const n=Number(e.target.value); if(!Number.isFinite(n)||Math.abs(n)>10000) return;
    update(wire.id,{path:wire.path!.map((v,j)=>j===index?v.map((x,k)=>k===i?n:x) as Vec:v)});
  }}/></label>)}<button className="small-button" onClick={()=>update(wire.id,{path:wire.path!.filter((_,i)=>i!==index)})}>Hapus tekukan {index+1}</button></fieldset>)}
 </div></div>;
}
