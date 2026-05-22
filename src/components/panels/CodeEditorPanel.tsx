'use client';

import Editor, { useMonaco } from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import { useSimulatorStore } from '@/store/useSimulatorStore';
import { arduinoLanguageDefinition, arduinoLanguageConfig } from '@/lib/editor/arduinoLanguage';
import { ChevronDown, ChevronUp, Copy, Play } from 'lucide-react';

export function CodeEditorPanel() {
  const code = useSimulatorStore(state => state.code);
  const setCode = useSimulatorStore(state => state.setCode);
  const simulationState = useSimulatorStore(state => state.simulationState);
  const startSimulation = useSimulatorStore(state => state.startSimulation);
  
  const [isExpanded, setIsExpanded] = useState(true);
  const editorRef = useRef<any>(null);
  const monaco = useMonaco();

  useEffect(() => {
    if (monaco) {
      monaco.languages.register({ id: 'arduino' });
      monaco.languages.setMonarchTokensProvider('arduino', arduinoLanguageDefinition as any);
      monaco.languages.setLanguageConfiguration('arduino', arduinoLanguageConfig as any);
      
      // Define a custom theme that matches our dark theme
      monaco.editor.defineTheme('arduTheme', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: '3b82f6' }, // accent
          { token: 'constant', foreground: 'f59e0b' }, // warning
          { token: 'type.identifier', foreground: '10b981' }, // success
          { token: 'string', foreground: '22c55e' },
          { token: 'comment', foreground: '64748b' },
          { token: 'number', foreground: '8b5cf6' },
        ],
        colors: {
          'editor.background': '#0c1120', // bg-secondary
          'editor.lineHighlightBackground': '#1f2b3f',
          'editorLineNumber.foreground': '#475569',
          'editorIndentGuide.background': '#1e293b',
        }
      });
    }
  }, [monaco]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
  };

  if (!isExpanded) {
    return (
      <div className="absolute right-4 bottom-4 w-64 glass-panel z-[var(--z-panel)]">
        <div 
          className="panel-header flex items-center justify-between cursor-pointer rounded-[var(--panel-radius)] hover:bg-[var(--bg-hover)] transition-colors"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center gap-2">
            <span className="text-[var(--accent)] text-lg">{'{}'}</span>
            <span>Code Editor</span>
          </div>
          <ChevronUp size={16} />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-4 bottom-4 w-96 h-[500px] glass-panel flex flex-col z-[var(--z-panel)] shadow-2xl animate-slide-left border-[var(--border)] overflow-hidden">
      
      {/* Header */}
      <div className="h-10 border-b border-[var(--border)] flex items-center justify-between px-3 bg-[var(--bg-elevated)] shrink-0">
        <div className="flex items-center gap-2 font-mono text-sm">
          <span className="text-[var(--accent)]">sketch.ino</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            className="btn-icon p-1.5" 
            onClick={copyToClipboard}
            title="Copy Code"
          >
            <Copy size={14} />
          </button>
          
          <button 
            className="btn-icon p-1.5 text-[var(--success)] hover:text-white hover:bg-[var(--success)]"
            onClick={startSimulation}
            disabled={simulationState === 'running'}
            title="Upload & Run"
          >
            <Play size={14} />
          </button>

          <div className="w-px h-4 bg-[var(--border)] mx-1"></div>
          
          <button 
            className="btn-icon p-1.5"
            onClick={() => setIsExpanded(false)}
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          language="arduino"
          theme="arduTheme"
          value={code}
          onChange={(val) => setCode(val || '')}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'var(--font-geist-mono)',
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            padding: { top: 16 },
            overviewRulerLanes: 0,
            lineNumbersMinChars: 3,
          }}
        />
      </div>
    </div>
  );
}
