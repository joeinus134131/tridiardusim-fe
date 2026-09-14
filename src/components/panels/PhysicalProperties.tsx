'use client';
import { WireColors } from './WireColors';
import { useState } from 'react';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { contacts, world, type Vec } from '@/lib/components/placement';
import type { CircuitComponent } from '@/lib/components/componentTypes';
export function PhysicalProperties({component:c}:{component:CircuitComponent}) {
 const all=useSimulatorStore(s=>s.components);
 const [boardId,setBoardId]=useState('');
 const [holeId,setHoleId]=useState(contacts(c,all)[0]?.holeId||'t10_2');
 const boards=all.filter(x=>x.typeId==='breadboard');
 const board=boards.find(b=>b.id===boardId)||boards[0];
 const mounted=contacts(c,all);
 const colors:Record<string,string>={red:'#ef4444',black:'#171717',blue:'#3b82f6',green:'#22c55e',yellow:'#eab308'};
 const state=useSimulatorStore.getState;
 return <>
  <p>Rigid · bounding box aktif</p>
  {['resistor_220','led_red','potentiometer','esp32_wroom'].includes(c.typeId) && <details open>
   <summary>Pasang ke breadboard</summary>
   <p>{mounted.length?`${mounted.length} kaki tersambung langsung ke lubang.`:'Pilih lubang untuk kaki pertama. Putar 90° jika footprint belum cocok.'}</p>
   {board && <>
    <select aria-label="Breadboard pemasangan" value={board.id} onChange={e=>setBoardId(e.target.value)}>{boards.map(b=><option key={b.id} value={b.id}>{b.name} · {b.id.slice(0,4)}</option>)}</select>
    <select aria-label="Lubang kaki pertama" value={holeId} onChange={e=>setHoleId(e.target.value)}>{board.pins.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <button className="small-button" onClick={()=>{
     const hole=board.pins.find(p=>p.id===holeId)!;
     const target=world(board,hole.position), first=world(c,c.pins[0].position);
     const position=c.position.map((v,i)=>v+target[i]-first[i]) as Vec;
     state().updateComponentPosition(c.id,position);
    }}>Pasang kaki ke lubang</button>
   </>}
   {c.typeId==='resistor_220' && <p>Kaki tekuk tetap · pitch 10,16 mm. Geser keluar breadboard untuk melepas kontak.</p>}
  </details>}
  {c.typeId.startsWith('jumper_') && <>
   <WireColors onChange={color=>state().updateComponentState(c.id,{color})} />
   <label>Warna jumper<input aria-label="Warna jumper" type="color" value={colors[String(c.state.color)]||String(c.state.color)} onChange={e=>state().updateComponentState(c.id,{color:e.target.value})}/></label>
   {(['depth','bendHeight'] as const).map((key)=><label key={key}>{key==='depth'?'Panjang lekukan':'Tinggi lekukan'}<input aria-label={key==='depth'?'Panjang lekukan jumper':'Tinggi lekukan jumper'} type="range" min={key==='depth'?3:.3} max={key==='depth'?16:8} step="0.1" value={Number(c.state[key])} onChange={e=>state().updateComponentState(c.id,{[key]:Number(e.target.value)})}/></label>)}
  </>}
 </>;
}
