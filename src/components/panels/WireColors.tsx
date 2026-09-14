'use client';
const colors=[['Merah','#ef4444'],['Hitam','#171717'],['Biru','#3b82f6'],['Hijau','#22c55e'],['Kuning','#eab308'],['Ungu','#a855f7'],['Putih','#ffffff']];
export function WireColors({onChange}:{onChange:(color:string)=>void}) {
 return <div className="wire-colors">{colors.map(([name,color])=><button key={name} type="button" aria-label={`Pilih warna ${name}`} title={name} style={{background:color}} onClick={()=>onChange(color)}/>)}</div>;
}
