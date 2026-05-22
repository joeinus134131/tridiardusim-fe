'use client';

import { useState } from 'react';
import { SimulatorCanvas } from '@/components/canvas/SimulatorCanvas';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { ComponentRegistry } from '@/lib/components/ComponentRegistry';
import { CodeEditorPanel } from '@/components/panels/CodeEditorPanel';
import { SensorPanel } from '@/components/panels/SensorPanel';
import { SerialMonitor } from '@/components/panels/SerialMonitor';
import { AIAssistantPanel } from '@/components/panels/AIAssistantPanel';
import { Play, Square, Plus, Code, Settings, Trash2, ChevronDown, RotateCcw } from 'lucide-react';

export default function WorkspacePage() {
  const { 
    components, 
    addComponent, 
    removeComponent,
    selectedComponentId,
    simulationState,
    startSimulation,
    stopSimulation
  } = useSimulatorStore();

  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Boards', 'Basic', 'Wiring', 'Sensors', 'Actuators', 'Displays'];

  const filteredComponents = activeCategory === 'All'
    ? ComponentRegistry.getAll()
    : ComponentRegistry.getByCategory(activeCategory);

  const handleAddComponent = (typeId: string) => {
    const config = ComponentRegistry.get(typeId);
    if (!config) return;
    
    // Offset spawning position so components don't stack
    const offset = components.length * 3;
    
    addComponent({
      typeId,
      name: config.name,
      type: config.type,
      position: [offset % 20, 0, Math.floor(offset / 20) * 3],
      rotation: [0, 0, 0],
      state: { ...config.defaultState },
      pins: [...config.pins]
    });
  };

  const selectedComponent = components.find(c => c.id === selectedComponentId);

  return (
    <div className="w-full h-screen flex flex-col relative overflow-hidden bg-[var(--bg-primary)]">
      
      {/* ── Toolbar ── */}
      <header className="h-12 border-b border-[var(--border)] glass-panel rounded-none flex items-center justify-between px-4 z-[var(--z-toolbar)] relative shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-white font-bold tracking-wider text-base">
            <span className="text-[var(--accent)]">⚡</span>
            <span className="text-[var(--accent)]">Ardu</span>Sim
            <span className="text-[8px] text-[var(--text-tertiary)] ml-1 font-normal tracking-normal">v1.0</span>
          </div>
          <div className="h-5 w-px bg-[var(--border)] mx-1"></div>
          
          <button 
            className={`btn-primary text-xs gap-1.5 ${simulationState === 'running' ? 'bg-red-600 hover:bg-red-700' : ''}`}
            onClick={simulationState === 'running' ? stopSimulation : startSimulation}
          >
            {simulationState === 'running' ? (
              <><Square size={13} /> Stop</>
            ) : (
              <><Play size={13} /> Run</>
            )}
          </button>

          {simulationState === 'running' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 animate-pulse">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
              Running
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--text-muted)] mr-2">
            {components.length} component{components.length !== 1 ? 's' : ''}
          </span>
          <button className="btn-icon tooltip p-1.5" data-tooltip="Settings">
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* ── Main Workspace ── */}
      <main className="flex-1 relative flex overflow-hidden">
        
        {/* Left Sidebar: Component Library */}
        <aside className="w-56 border-r border-[var(--border)] glass-panel rounded-none flex flex-col z-[var(--z-panel)] relative shrink-0">
          <div className="panel-header flex items-center justify-between py-2 px-3">
            <span className="text-sm font-semibold">Components</span>
          </div>
          
          {/* Category tabs */}
          <div className="px-2 pb-2 flex flex-wrap gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`text-[10px] px-2 py-1 rounded-full transition-all font-medium ${
                  activeCategory === cat
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-1.5">
            {filteredComponents.map(config => (
              <div 
                key={config.typeId}
                className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-2.5 hover:border-[var(--accent)] cursor-pointer transition-all hover:shadow-md group"
                onClick={() => handleAddComponent(config.typeId)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                    {config.name}
                  </span>
                  <Plus size={13} className="text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
                  {config.description}
                </div>
              </div>
            ))}

            {filteredComponents.length === 0 && (
              <div className="text-xs text-[var(--text-tertiary)] text-center py-4 italic">
                No components in this category yet
              </div>
            )}
          </div>
        </aside>

        {/* Center: 3D Canvas */}
        <section className="flex-1 relative">
          <SimulatorCanvas />
          
          {/* Component Properties */}
          {selectedComponent && (
            <div className="absolute top-3 right-3 w-56 glass-panel p-3 z-[var(--z-panel)] animate-slide-left shadow-xl border-[var(--border-active)]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-xs text-[var(--text-primary)]">{selectedComponent.name}</h3>
                <button 
                  className="btn-icon text-[var(--error)] hover:text-white hover:bg-[var(--error)] p-1"
                  onClick={() => removeComponent(selectedComponent.id)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              
              <div className="space-y-2">
                <div className="bg-[var(--bg-elevated)] p-2 rounded text-[10px]">
                  <span className="text-[var(--text-muted)] block mb-0.5">Position</span>
                  <div className="font-mono text-[var(--accent)]">
                    x:{selectedComponent.position[0].toFixed(1)} z:{selectedComponent.position[2].toFixed(1)}
                  </div>
                </div>
                <div className="bg-[var(--bg-elevated)] p-2 rounded text-[10px]">
                  <span className="text-[var(--text-muted)] block mb-0.5">Type</span>
                  <div className="font-mono text-[var(--text-primary)]">{selectedComponent.typeId}</div>
                </div>
              </div>
            </div>
          )}
          
          <SensorPanel />
          <CodeEditorPanel />
          <AIAssistantPanel />
        </section>

        <SerialMonitor />
      </main>
    </div>
  );
}
