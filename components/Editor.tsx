import React, { useRef, useEffect, useState } from 'react';
import { Variable } from '../types';

interface EditorProps {
  value: string;
  onChange?: (val: string) => void;
  language?: 'json' | 'text' | 'csharp' | string;
  readOnly?: boolean;
  placeholder?: string;
  maxHeight?: string;
  variables?: Variable[];
  accentColor?: string;
}

const Editor: React.FC<EditorProps> = ({ 
  value, 
  onChange, 
  language = 'json', 
  readOnly = false, 
  placeholder, 
  maxHeight,
  variables = [],
  accentColor = '#3b82f6'
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [suggestionState, setSuggestionState] = useState<{
    query: string;
    index: number;
    show: boolean;
    pos: { top: number; left: number };
  } | null>(null);

  const filteredVars = suggestionState?.show 
    ? variables.filter(v => v.key.toLowerCase().includes(suggestionState.query.toLowerCase()))
    : [];

  const handleValueChange = (newVal: string) => {
    if (readOnly) return;
    onChange?.(newVal);
    const cursor = textareaRef.current?.selectionStart || 0;
    const textBefore = newVal.slice(0, cursor);
    const lastOpenIndex = textBefore.lastIndexOf('{{');
    const lastCloseIndex = textBefore.lastIndexOf('}}');

    if (lastOpenIndex !== -1 && lastOpenIndex > lastCloseIndex) {
      const query = textBefore.slice(lastOpenIndex + 2);
      const lines = textBefore.split('\n');
      const top = (lines.length * 20.8) + 24; 
      setSuggestionState({ query, index: 0, show: true, pos: { top: Math.min(top, 300), left: 40 } });
    } else {
      setSuggestionState(null);
    }
  };

  const insertSuggestion = (key: string) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBefore = value.slice(0, cursor);
    const textAfter = value.slice(cursor);
    const lastOpenIndex = textBefore.lastIndexOf('{{');
    
    const newVal = textBefore.slice(0, lastOpenIndex) + `{{${key}}}` + textAfter;
    onChange?.(newVal);
    setSuggestionState(null);
    
    setTimeout(() => {
      textareaRef.current?.focus();
      const newPos = lastOpenIndex + key.length + 4;
      textareaRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestionState || !suggestionState.show || filteredVars.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionState(prev => prev ? { ...prev, index: (prev.index + 1) % filteredVars.length } : null);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionState(prev => prev ? { ...prev, index: (prev.index - 1 + filteredVars.length) % filteredVars.length } : null);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertSuggestion(filteredVars[suggestionState.index].key);
    } else if (e.key === 'Escape') {
      setSuggestionState(null);
    }
  };

  const highlightVariables = (text: string) => {
    const parts = text.split(/(\{\{.*?\}\})/g);
    return parts.map((part, i) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        const key = part.slice(2, -2);
        const exists = variables.some(v => v.key === key);
        if (exists) {
          return (
            <span key={i} className="px-1 font-black rounded bg-white/5 border border-white/5 mx-0.5 inline-block" style={{ color: accentColor }}>
              {key}
            </span>
          );
        }
        return <span key={i} className="text-rose-500 font-bold underline decoration-dotted">{part}</span>;
      }
      return part;
    });
  };

  const highlightJson = (json: string) => {
    if (!json) return null;
    const parts = json.split(/("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[\{\}\[\],])/g);
    
    return parts.map((part, i) => {
      if (part === undefined || part === "") return null;
      
      if (part.startsWith('"')) {
        const isKey = part.includes('":') || part.endsWith(':');
        const className = isKey ? "token-key" : "token-string";
        return <span key={i} className={className}>{highlightVariables(part)}</span>;
      }
      
      if (part === 'true' || part === 'false') return <span key={i} className="token-boolean">{part}</span>;
      if (part === 'null') return <span key={i} className="token-null">{part}</span>;
      if (/^-?\d+/.test(part)) return <span key={i} className="token-number">{part}</span>;
      if (/[\{\}\[\],]/.test(part)) return <span key={i} className="text-slate-500 font-bold">{part}</span>;
      
      return <span key={i}>{part}</span>;
    });
  };

  const syncScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  useEffect(() => { syncScroll(); }, [value]);

  const sharedStyles: React.CSSProperties = {
    fontFamily: '"Fira Code", monospace',
    fontSize: '13px',
    lineHeight: '1.6',
    whiteSpace: 'pre',
    wordBreak: 'normal',
    padding: '24px',
    margin: 0,
    border: 'none',
    boxSizing: 'border-box',
    letterSpacing: 'normal',
    tabSize: 2,
    textAlign: 'left',
    width: '100%',
    minHeight: '100%',
    fontVariantLigatures: 'none'
  };

  return (
    <div 
      className={`relative w-full h-full rounded-xl overflow-hidden border border-white/5 bg-[#0a0d14] shadow-inner transition-all duration-200 ${maxHeight ? '' : 'min-h-[200px]'}`} 
      style={maxHeight ? { maxHeight } : {}}
    >
      <div 
        ref={backdropRef} 
        className="absolute inset-0 pointer-events-none overflow-hidden no-scrollbar-ui"
      >
        <div style={sharedStyles} className="select-none">
          {language === 'json' ? highlightJson(value) : value}
          <div style={{ height: '100px' }} />
        </div>
      </div>
      <textarea
        ref={textareaRef}
        onScroll={syncScroll}
        onKeyDown={handleKeyDown}
        className={`relative w-full h-full bg-transparent outline-none resize-none placeholder-slate-800 selection:bg-blue-500/30 custom-scrollbar transition-colors caret-white`}
        style={{ 
          ...sharedStyles, 
          color: 'transparent', 
          overflowX: 'auto',
          display: 'block'
        }}
        value={value}
        onChange={(e) => handleValueChange(e.target.value)}
        onBlur={() => setTimeout(() => setSuggestionState(null), 200)}
        readOnly={readOnly}
        placeholder={placeholder || "..."}
        spellCheck={false}
        wrap="off"
      />

      {suggestionState?.show && filteredVars.length > 0 && (
        <div 
          className="absolute z-[100] bg-[#11141b] border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[200px] animate-reveal"
          style={{ top: suggestionState.pos.top, left: suggestionState.pos.left }}
        >
          {filteredVars.map((v, i) => (
            <button 
              key={v.key} 
              onMouseDown={(e) => { e.preventDefault(); insertSuggestion(v.key); }} 
              className={`w-full text-left px-3 py-2 flex justify-between items-center transition-colors ${suggestionState.index === i ? 'bg-white/10' : 'hover:bg-white/[0.03]'}`}
            >
              <span 
                className="text-[10px] font-black" 
                style={{ color: suggestionState.index === i ? accentColor : '#e2e8f0' }}
              >
                {v.key}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Editor;