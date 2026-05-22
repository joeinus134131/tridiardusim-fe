'use client';

import { useState, useRef, useEffect } from 'react';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { Terminal, Trash2, Download, Pause, Play, ChevronDown, ChevronUp } from 'lucide-react';

export function SerialMonitor() {
  const serialOutput = useSimulatorStore(state => state.serialOutput);
  const clearSerial = useSimulatorStore(state => state.clearSerial);
  const baudRate = useSimulatorStore(state => state.baudRate);
  const setBaudRate = useSimulatorStore(state => state.setBaudRate);

  const [isExpanded, setIsExpanded] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [inputValue, setInputValue] = useState('');
  
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [serialOutput, autoScroll, isExpanded]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    // In a full implementation, this sends data to the Arduino simulation engine via Serial.read()
    // For MVP, we just echo it
    useSimulatorStore.getState().addSerialMessage({
      message: `> ${inputValue}\n`,
      type: 'info'
    });
    setInputValue('');
  };

  const handleExport = () => {
    const text = serialOutput.map(msg => msg.message).join('');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serial_log_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isExpanded) {
    return (
      <div className="absolute left-64 bottom-0 w-[calc(100%-16rem)] px-4">
        <div 
          className="bg-[var(--bg-elevated)] border-t border-x border-[var(--border)] rounded-t-xl px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-hover)] transition-colors w-72 mx-auto shadow-[0_-4px_12px_rgba(0,0,0,0.2)]"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-[var(--accent)]" />
            <span className="text-sm font-medium">Serial Monitor</span>
            {serialOutput.length > 0 && (
              <span className="bg-[var(--accent)] text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse-glow">
                New
              </span>
            )}
          </div>
          <ChevronUp size={16} />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute left-64 right-96 bottom-0 h-64 bg-[var(--bg-surface)] border-t border-x border-[var(--border)] rounded-t-xl z-[var(--z-panel)] flex flex-col shadow-[0_-8px_24px_rgba(0,0,0,0.3)] animate-slide-up mx-4">
      
      {/* Header */}
      <div className="h-10 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 flex items-center justify-between shrink-0 rounded-t-xl">
        <div className="flex items-center gap-3">
          <Terminal size={16} className="text-[var(--accent)]" />
          <span className="font-medium text-sm">Serial Monitor</span>
          <div className="h-4 w-px bg-[var(--border)] mx-1"></div>
          <select 
            value={baudRate} 
            onChange={(e) => setBaudRate(Number(e.target.value))}
            className="bg-transparent text-xs text-[var(--text-secondary)] border border-[var(--border)] rounded px-2 py-0.5 outline-none hover:border-[var(--accent)]"
          >
            {[300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200].map(rate => (
              <option key={rate} value={rate}>{rate} baud</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button 
            className={`btn-icon p-1.5 ${autoScroll ? 'text-[var(--accent)]' : ''}`}
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? "Pause Autoscroll" : "Resume Autoscroll"}
          >
            {autoScroll ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button 
            className="btn-icon p-1.5"
            onClick={clearSerial}
            title="Clear Output"
          >
            <Trash2 size={14} />
          </button>
          <button 
            className="btn-icon p-1.5"
            onClick={handleExport}
            title="Export to File"
          >
            <Download size={14} />
          </button>
          <div className="h-4 w-px bg-[var(--border)] mx-1"></div>
          <button 
            className="btn-icon p-1.5"
            onClick={() => setIsExpanded(false)}
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div 
        ref={outputRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap select-text"
      >
        {serialOutput.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[var(--text-tertiary)] italic">
            Waiting for serial data...
          </div>
        ) : (
          serialOutput.map(msg => (
            <span 
              key={msg.id} 
              className={msg.type === 'error' ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'}
            >
              {msg.message}
            </span>
          ))
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="h-12 border-t border-[var(--border)] bg-[var(--bg-elevated)] px-4 flex items-center gap-3 shrink-0">
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Send message to Arduino..."
          className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded px-3 py-1.5 text-sm outline-none focus:border-[var(--accent)] font-mono transition-colors"
        />
        <button type="submit" className="btn-primary py-1.5 px-4 text-sm font-medium whitespace-nowrap">
          Send
        </button>
      </form>

    </div>
  );
}
