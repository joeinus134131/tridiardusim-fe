'use client';

import { useState } from 'react';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { ChevronDown, ChevronUp, Sliders, Trash2 } from 'lucide-react';

export function SensorPanel() {
  const components = useSimulatorStore(state => state.components);
  const updateComponentState = useSimulatorStore(state => state.updateComponentState);
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter components that are sensors and have configurable values
  const sensors = components.filter(c => c.type === 'sensor');

  if (sensors.length === 0) return null;

  if (!isExpanded) {
    return (
      <div className="absolute left-4 top-20 w-64 glass-panel z-[var(--z-panel)]">
        <div 
          className="panel-header flex items-center justify-between cursor-pointer rounded-[var(--panel-radius)] hover:bg-[var(--bg-hover)] transition-colors"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-[var(--accent)]" />
            <span>Sensors</span>
          </div>
          <ChevronDown size={16} />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute left-4 top-20 w-64 glass-panel flex flex-col z-[var(--z-panel)] shadow-2xl animate-slide-right border-[var(--border)] max-h-[60vh] overflow-hidden">
      <div className="h-10 border-b border-[var(--border)] flex items-center justify-between px-3 bg-[var(--bg-elevated)] shrink-0">
        <div className="flex items-center gap-2 font-medium text-sm">
          <Sliders size={16} className="text-[var(--accent)]" />
          <span>Sensor Controls</span>
        </div>
        <button 
          className="btn-icon p-1.5"
          onClick={() => setIsExpanded(false)}
        >
          <ChevronUp size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {sensors.map(sensor => (
          <div key={sensor.id} className="bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">{sensor.name}</span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">{sensor.id.slice(0, 4)}</span>
            </div>
            
            {/* Render appropriate controls based on sensor type */}
            {sensor.typeId === 'potentiometer' && (
              <div>
                <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                  <span>0</span>
                  <span>{Math.floor((sensor.state?.value || 0) * 1023)}</span>
                  <span>1023</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={sensor.state?.value || 0}
                  onChange={(e) => updateComponentState(sensor.id, { value: parseFloat(e.target.value) })}
                  className="w-full accent-[var(--accent)]"
                />
              </div>
            )}

            {sensor.typeId === 'push_button' && (
              <button 
                className={`w-full py-2 rounded text-sm font-medium transition-colors ${sensor.state?.isPressed ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent)]'}`}
                onMouseDown={() => updateComponentState(sensor.id, { isPressed: true })}
                onMouseUp={() => updateComponentState(sensor.id, { isPressed: false })}
                onMouseLeave={() => updateComponentState(sensor.id, { isPressed: false })}
              >
                {sensor.state?.isPressed ? 'Pressed' : 'Press & Hold'}
              </button>
            )}

            {/* Add more sensor UI controls here later (DHT11, PIR, etc.) */}
          </div>
        ))}
      </div>
    </div>
  );
}
