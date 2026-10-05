"use client";
import type { CircuitComponent } from "@/lib/components/componentTypes";

export function RigidBodyPanel({
  component,
  components,
  updateState,
  simulationState,
}: {
  component: CircuitComponent;
  components: CircuitComponent[];
  updateState: (id: string, update: Record<string, number | string | boolean>) => void;
  simulationState: "stopped" | "running" | "paused";
}) {
  const mode = component.state.physicsMode === "dynamic" || component.state.physicsMode === "fixed"
    ? component.state.physicsMode
    : "off";
  const dynamic = mode === "dynamic";
  const physicsParentId = String(component.state.physicsParentId || "");
  return (
    <section className="inspector-card flex flex-col gap-2" aria-label="Rigid body settings">
      <div>
        <strong className="text-xs">Rigid body physics</strong>
        <p className="mt-1 text-[10px] opacity-65">Rapier 3D berjalan di worker pada fixed step simulasi 5 ms. Collider memakai kotak batas fisik komponen dan lantai meja.</p>
      </div>
      <label className="text-[10px] flex flex-col gap-1">
        Mode
        <select
          aria-label="Mode rigid body"
          className="inspector-input"
          value={mode}
          onChange={(event) => updateState(component.id, { physicsMode: event.target.value })}
        >
          <option value="off">Nonaktif</option>
          <option value="fixed">Tetap · menerima tabrakan</option>
          <option value="dynamic">Dinamis · gravitasi dan tabrakan</option>
        </select>
      </label>
      <div className="grid grid-cols-3 gap-1.5">
        {([
          ["physicsMassKg", "Massa (kg)", 0.01, 1000, 0.01],
          ["physicsFriction", "Gesekan", 0, 2, 0.05],
          ["physicsRestitution", "Pantulan", 0, 1, 0.05],
        ] as const).map(([key, label, min, max, step]) => (
          <label key={key} className="text-[9px] flex flex-col gap-1">
            {label}
            <input
              aria-label={label}
              className="inspector-input min-w-0"
              type="number"
              min={min}
              max={max}
              step={step}
              disabled={key === "physicsMassKg" && !dynamic}
              value={typeof component.state[key] === "number" ? component.state[key] as number : key === "physicsMassKg" ? 0.2 : key === "physicsFriction" ? 0.7 : 0}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value)) updateState(component.id, { [key]: value });
              }}
            />
          </label>
        ))}
      </div>
      <label className="text-[10px] flex flex-col gap-1">
        Hubungkan ke objek
        <select
          aria-label="Parent joint physics"
          className="inspector-input"
          value={physicsParentId}
          onChange={(event) => {
            const parentId = event.target.value;
            updateState(component.id, {
              physicsParentId: parentId,
              physicsJointType: parentId ? component.state.physicsJointType || "fixed" : "",
            });
            const parent = components.find((item) => item.id === parentId);
            if (parent && parent.state.physicsMode !== "fixed" && parent.state.physicsMode !== "dynamic") {
              updateState(parent.id, { physicsMode: "fixed" });
            }
          }}
        >
          <option value="">Tidak terhubung</option>
          {components.filter((item) => item.id !== component.id).map((item) => (
            <option key={item.id} value={item.id}>{item.name} ({item.typeId})</option>
          ))}
        </select>
      </label>
      {physicsParentId && (
        <label className="text-[10px] flex flex-col gap-1">
          Tipe sambungan
          <select
            aria-label="Tipe sambungan physics"
            className="inspector-input"
            value={component.state.physicsJointType === "revolute" || component.state.physicsJointType === "prismatic" ? component.state.physicsJointType : "fixed"}
            onChange={(event) => updateState(component.id, { physicsJointType: event.target.value })}
          >
            <option value="fixed">Fixed · terkunci</option>
            <option value="revolute">Revolute · putar pada sumbu Y</option>
            <option value="prismatic">Prismatic · geser pada sumbu Y</option>
          </select>
        </label>
      )}
      <p className="text-[10px] opacity-60">
        {simulationState === "stopped" ? "Pilih mode lalu jalankan simulasi untuk menerapkan fisika." : simulationState === "paused" ? "Simulasi dijeda; posisi physics dipertahankan." : "Simulasi aktif. Objek dinamis mengikuti gravitasi; objek tetap menjadi obstacle."}
      </p>
    </section>
  );
}
