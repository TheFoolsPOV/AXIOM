import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Variable } from '../types';

interface UrlInputProps {
  value: string;
  onChange: (val: string) => void;
  variables: Variable[];
  accentColor: string;
  placeholder?: string;
}

const UrlInput: React.FC<UrlInputProps> = ({ value, onChange, variables, accentColor, placeholder }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestionState, setSuggestionState] = useState<{
    query: string;
    index: number;
    show: boolean;
  } | null>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const backdropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sharedTextStyles: React.CSSProperties = {
    fontFamily: '"Inter", sans-serif',
    fontSize: '13px',
    fontWeight: 500,
    letterSpacing: 'normal',
    paddingLeft: '1rem',
    paddingRight: '1rem',
    whiteSpace: 'nowrap',
    lineHeight: '44px',
    height: '44px',
    boxSizing: 'border-box'
  };

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom, left: rect.left, width: rect.width });
    }
  };

  useLayoutEffect(() => {
    if (suggestionState?.show) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [suggestionState?.show]);

  const filteredVars = suggestionState?.show 
    ? variables.filter(v => v.key.toLowerCase().includes(suggestionState.query.toLowerCase()))
    : [];

  const handleValueChange = (newVal: string) => {
    onChange(newVal);
    const lastOpenIndex = newVal.lastIndexOf('{{');
    const lastCloseIndex = newVal.lastIndexOf('}}');

    if (lastOpenIndex > lastCloseIndex) {
      const query = newVal.slice(lastOpenIndex + 2);
      setSuggestionState({ query, index: 0, show: true });
    } else {
      setSuggestionState(null);
    }
  };

  const insertSuggestion = (key: string) => {
    const lastOpenIndex = value.lastIndexOf('{{');
    const newVal = value.slice(0, lastOpenIndex) + `{{${key}}}`;
    onChange(newVal);
    setSuggestionState(null);
    inputRef.current?.focus();
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

  const renderDisplay = () => {
    if (!value && placeholder) return <span className="text-slate-700">{placeholder}</span>;
    
    const parts = value.split(/(\{\{.*?\}\})/g);
    return parts.map((part, i) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        const key = part.slice(2, -2);
        const exists = variables.some(v => v.key === key);
        if (exists) {
          return (
            <span key={i} className="font-black px-1.5 rounded bg-white/10 border border-white/20 mx-0.5 inline-block leading-none" style={{ color: accentColor }}>
              {key}
            </span>
          );
        }
        return <span key={i} className="text-rose-500 font-bold underline decoration-dotted">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const syncScroll = () => {
    if (inputRef.current && backdropRef.current) {
      backdropRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    syncScroll();
  }, [value]);

  return (
    <div ref={containerRef} className="relative flex-1 flex items-center h-11 bg-[#161b22] rounded-lg border border-[#30363d] focus-within:bg-[#1c2128] focus-within:border-[#3b82f6]/50 transition-none overflow-visible">
      <div 
        ref={backdropRef} 
        className="absolute inset-0 flex items-center pointer-events-none overflow-hidden no-scrollbar-ui"
        style={sharedTextStyles}
      >
        <div className={isFocused ? 'opacity-0' : 'opacity-100'} style={{ display: 'flex', alignItems: 'center' }}>
          {renderDisplay()}
        </div>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onScroll={syncScroll}
        onChange={(e) => handleValueChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => { setIsFocused(false); setSuggestionState(null); }, 250)}
        className="w-full h-full bg-transparent outline-none transition-none relative z-10 selection:bg-blue-500/30 border-none"
        style={{ 
          ...sharedTextStyles,
          color: isFocused ? '#e2e8f0' : 'transparent', 
          caretColor: '#e2e8f0'
        }}
        placeholder={isFocused ? placeholder : ""}
        spellCheck={false}
      />

      {suggestionState?.show && filteredVars.length > 0 && createPortal(
        <div 
          className="ultimate-solid-menu overflow-y-auto custom-scrollbar"
          style={{ 
            position: 'fixed',
            top: coords.top + 8,
            left: coords.left,
            width: coords.width,
            backgroundColor: '#1c2128',
            maxHeight: '224px',
            zIndex: 99999999,
            opacity: 1,
            pointerEvents: 'auto'
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {filteredVars.map((v, i) => (
            <button 
              key={v.key} 
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertSuggestion(v.key); }} 
              className={`flex items-center justify-between border-b border-[#30363d] last:border-0 ${suggestionState.index === i ? 'active-method' : ''}`}
              style={{ backgroundColor: '#1c2128', opacity: 1, border: 'none', color: '#e2e8f0', width: '100%', textAlign: 'left', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
            >
              <div className="flex flex-col pointer-events-none">
                <span className="text-[11px] font-black tracking-tight" style={{ color: suggestionState.index === i ? accentColor : '#e2e8f0' }}>{v.key}</span>
                <span className="text-[8px] text-slate-500 font-mono truncate max-w-[250px]">{v.value}</span>
              </div>
              <span className="text-[7px] font-black uppercase text-slate-600 bg-white/5 px-2 py-1 rounded pointer-events-none">Var</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default UrlInput;