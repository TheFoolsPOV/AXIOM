import React, { useState } from 'react';
import { KeyValuePair, Variable, generateId } from '../types';

interface HeaderManagerProps {
  headers: KeyValuePair[];
  setHeaders: (headers: KeyValuePair[]) => void;
  accentColor: string;
  variables: Variable[];
}

const HeaderManager: React.FC<HeaderManagerProps> = ({ headers, setHeaders, accentColor, variables }) => {
  const [suggestionState, setSuggestionState] = useState<{
    id: string;
    field: 'key' | 'value';
    query: string;
    index: number;
  } | null>(null);

  const addHeader = () => {
    setHeaders([...headers, { id: generateId(), key: '', value: '', enabled: true }]);
  };

  const addAuth = () => {
    const existing = headers.find(h => h.key.toLowerCase() === 'authorization');
    if (existing) return;
    setHeaders([...headers, { id: generateId(), key: 'Authorization', value: 'Bearer ', enabled: true }]);
  };

  const removeHeader = (id: string) => {
    setHeaders(headers.filter(h => h.id !== id));
  };

  const updateHeader = (id: string, field: keyof KeyValuePair, val: any) => {
    setHeaders(headers.map(h => h.id === id ? { ...h, [field]: val } : h));
    
    if (typeof val === 'string' && (field === 'key' || field === 'value')) {
      const lastOpenIndex = val.lastIndexOf('{{');
      const lastCloseIndex = val.lastIndexOf('}}');
      if (lastOpenIndex > lastCloseIndex) {
        setSuggestionState({ id, field, query: val.slice(lastOpenIndex + 2), index: 0 });
      } else {
        setSuggestionState(null);
      }
    }
  };

  const filteredVars = suggestionState 
    ? variables.filter(v => v.key.toLowerCase().includes(suggestionState.query.toLowerCase()))
    : [];

  const insertSuggestion = (id: string, field: 'key' | 'value', key: string) => {
    const header = headers.find(h => h.id === id);
    if (!header) return;
    const currentVal = header[field] as string;
    const lastOpenIndex = currentVal.lastIndexOf('{{');
    const newVal = currentVal.slice(0, lastOpenIndex) + `{{${key}}}`;
    updateHeader(id, field, newVal);
    setSuggestionState(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string, field: 'key' | 'value') => {
    if (!suggestionState || filteredVars.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionState(prev => prev ? { ...prev, index: (prev.index + 1) % filteredVars.length } : null);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionState(prev => prev ? { ...prev, index: (prev.index - 1 + filteredVars.length) % filteredVars.length } : null);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertSuggestion(id, field, filteredVars[suggestionState.index].key);
    } else if (e.key === 'Escape') {
      setSuggestionState(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-visible">
      <div className="flex justify-between items-center mb-6">
        <h3 className="section-label !mb-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Request Headers
        </h3>
        <div className="flex gap-2">
          <button onClick={addAuth} className="text-[9px] font-black transition-all uppercase px-3 py-1.5 glass-card !rounded-lg text-slate-500 hover:text-slate-300">+ Auth</button>
          <button onClick={addHeader} className="text-[10px] font-black transition-all uppercase flex items-center gap-2 px-3 py-1.5 glass-card !rounded-lg active:scale-95" style={{ color: accentColor }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Append
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-20">
        {headers.map((header) => (
          <div key={header.id} className="relative flex gap-3 items-center glass-card p-2.5 group hover:border-white/10 shadow-sm">
            <input
              type="checkbox"
              checked={header.enabled}
              onChange={(e) => updateHeader(header.id, 'enabled', e.target.checked)}
              className="w-4 h-4 rounded-md bg-slate-900 border-white/10 focus:ring-0 cursor-pointer"
              style={{ accentColor }}
            />
            <div className="w-1/3 relative">
              <input
                placeholder="Header Key"
                value={header.key}
                onChange={(e) => updateHeader(header.id, 'key', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, header.id, 'key')}
                onBlur={() => setTimeout(() => setSuggestionState(null), 200)}
                className="w-full px-3 py-1.5 bg-transparent text-[12px] text-slate-200 outline-none border-b border-transparent transition-all placeholder-slate-700 font-medium focus:border-white/10"
              />
              {suggestionState?.id === header.id && suggestionState.field === 'key' && filteredVars.length > 0 && (
                <div className="absolute left-0 top-full mt-1 w-64 z-[100] bg-[#11141b] border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-reveal">
                  {filteredVars.map((v, i) => (
                    <button key={v.key} onMouseDown={(e) => { e.preventDefault(); insertSuggestion(header.id, 'key', v.key); }} className={`w-full text-left px-3 py-2 flex justify-between items-center ${suggestionState.index === i ? 'bg-white/10' : 'hover:bg-white/[0.03]'}`}>
                      <span className="text-[10px] font-black" style={{ color: suggestionState.index === i ? accentColor : '#e2e8f0' }}>{v.key}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="w-px h-4 bg-white/5"></div>
            <div className="flex-1 relative">
              <input
                placeholder="Value"
                value={header.value}
                onChange={(e) => updateHeader(header.id, 'value', e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, header.id, 'value')}
                onBlur={() => setTimeout(() => setSuggestionState(null), 200)}
                className="w-full px-3 py-1.5 bg-transparent text-[12px] text-slate-400 outline-none border-b border-transparent transition-all placeholder-slate-800 focus:border-white/10"
              />
              {suggestionState?.id === header.id && suggestionState.field === 'value' && filteredVars.length > 0 && (
                <div className="absolute left-0 top-full mt-1 w-full z-[100] bg-[#11141b] border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-reveal">
                  {filteredVars.map((v, i) => (
                    <button key={v.key} onMouseDown={(e) => { e.preventDefault(); insertSuggestion(header.id, 'value', v.key); }} className={`w-full text-left px-3 py-2 flex justify-between items-center ${suggestionState.index === i ? 'bg-white/10' : 'hover:bg-white/[0.03]'}`}>
                      <span className="text-[10px] font-black" style={{ color: suggestionState.index === i ? accentColor : '#e2e8f0' }}>{v.key}</span>
                      <span className="text-[8px] text-slate-500 font-mono truncate ml-2">{v.value}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => removeHeader(header.id)} className="p-1.5 text-slate-600 hover:text-rose-500 transition-all rounded-lg hover:bg-rose-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeaderManager;