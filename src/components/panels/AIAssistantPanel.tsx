'use client';

import { useState } from 'react';
import { Bot, User, Send, X, Sparkles, Loader2 } from 'lucide-react';
import { useSimulatorStore } from '@/store/useSimulatorStore';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export function AIAssistantPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'ai',
      content: "Hi! I'm ArduBot, your AI circuit assistant. How can I help you build or code your project today?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate network delay and basic AI response for MVP
    // In full implementation, this calls the Go backend POST /api/ai/chat
    setTimeout(() => {
      let reply = "I can help with that! However, I am currently running in offline mode. Once the backend is fully connected, I'll be able to generate circuits and write code for you.";
      
      if (userMsg.content.toLowerCase().includes('blink')) {
        reply = "To make an LED blink, you need an Arduino Uno, an LED, and a 220-ohm resistor. Connect the long leg (anode) to pin 13 and the short leg (cathode) to GND. The default code in the editor already blinks pin 13!";
      }

      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'ai', content: reply };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  if (!isOpen) {
    return (
      <button 
        className="absolute right-4 top-20 glass-panel p-3 text-[var(--accent)] hover:text-white hover:bg-[var(--accent)] transition-all rounded-full shadow-lg z-[var(--z-panel)] animate-pulse-glow flex items-center justify-center"
        onClick={() => setIsOpen(true)}
        title="Open AI Assistant"
      >
        <Bot size={24} />
      </button>
    );
  }

  return (
    <div className="absolute right-4 top-20 w-80 glass-panel flex flex-col z-[var(--z-panel)] shadow-2xl animate-slide-left border-[var(--border)] h-[500px]">
      
      {/* Header */}
      <div className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4 bg-gradient-to-r from-[var(--bg-elevated)] to-[var(--bg-hover)] rounded-t-[var(--panel-radius)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[var(--accent-dim)] rounded-lg text-[var(--accent)]">
            <Sparkles size={16} />
          </div>
          <span className="font-semibold text-sm">ArduBot AI</span>
        </div>
        <button 
          className="btn-icon p-1.5"
          onClick={() => setIsOpen(false)}
        >
          <X size={16} />
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-[var(--bg-hover)] text-[var(--text-secondary)]' : 'bg-[var(--accent)] text-white'}`}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`p-3 rounded-2xl text-sm leading-relaxed max-w-[80%] ${msg.role === 'user' ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-tr-sm' : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)] rounded-tl-sm'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--accent)] text-white">
              <Bot size={14} />
            </div>
            <div className="p-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] rounded-tl-sm text-[var(--text-muted)] flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">ArduBot is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-[var(--border)] bg-[var(--bg-elevated)] rounded-b-[var(--panel-radius)] flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 bg-[var(--bg-surface)] border border-[var(--border)] rounded-full px-4 py-2 text-sm outline-none focus:border-[var(--accent)] transition-colors"
          disabled={isTyping}
        />
        <button 
          type="submit" 
          disabled={!input.trim() || isTyping}
          className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          <Send size={16} className="ml-1" />
        </button>
      </form>
    </div>
  );
}
