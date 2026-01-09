
import React, { useState } from 'react';
import { KeyValuePair, Variable } from '../types';

interface JsonBuilderProps {
  fields: KeyValuePair[];
  setFields: (fields: KeyValuePair[]) => void;
  variables: Variable[];
  accentColor: string;
  onInteraction?: () => void;
}

const VariableAwareInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder: string;
  variables: Variable[];
  accentColor: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
}> = ({ value, onChange, onKeyDown, placeholder, variables, accentColor, className = "", onFocus, onBlur, disabled }) => {
  const [isFocused, setIsFocused] = useState(false);

  const renderDisplay = () => {
    if (!value) return <span className="text-slate-700">{placeholder}</span>;
    
    const parts = value.split(/(\{\{.*?\}\})/g);
    return parts.map((part, i) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        const key = part.slice(2, -2);
        const exists = variables.some(v => v.key === key);
        if (exists) {
          // Key exists: Hide brackets, show in accent color with a distinct background for readability
          return (
            <span key={i} className="font-black px-1.5 rounded bg-white/10 border border-white/5 mx-0.5 inline-block leading-tight" style={{ color: accentColor }}>
              {key}
            </span>
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={`relative flex items-center min-h-[38px] ${className}`}>
      {!isFocused && (
        <div className="absolute inset-0 px-3 py-2 pointer-events-none truncate text-[12px] font-medium flex items-center overflow-hidden">
          {renderDisplay()}
        </div>
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => { setIsFocused(true); onFocus?.(); }}
        onBlur={() => { setIsFocused(false); onBlur?.(); }}
        disabled={disabled}
        placeholder={isFocused ? placeholder : ""}
        className={`w-full px-3 py-2 bg-transparent outline-none border-none text-[12px] transition-all font-medium ${isFocused ? 'text-white' : 'text-transparent cursor-text'}`}
        spellCheck={false}
      />
    </div>
  );
};

const JsonBuilder: React.FC<JsonBuilderProps> = ({ fields, setFields, variables, accentColor, onInteraction }) => {
  const [suggestionState, setSuggestionState] = useState<{
    fieldId: string;
    fieldName: 'key' | 'value';
    query: string;
    index: number;
    show: boolean;
  } | null>(null);

  const addField = () => {
    onInteraction?.();
    setFields([...fields, { id: crypto.randomUUID(), key: '', value: '', enabled: true, type: 'string' }]);
  };

  const removeField = (id: string) => {
    onInteraction?.();
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id: string, field: keyof KeyValuePair, val: any) => {
    onInteraction?.();
    setFields(fields.map(f => f.id === id ? { ...f, [field]: val } : f));
  };

  const handleValueChange = (id: string, fieldName: 'key' | 'value', value: string) => {
    updateField(id, fieldName, value);

    const lastOpenIndex = value.lastIndexOf('{{');
    const lastCloseIndex = value.lastIndexOf('}}');

    if (lastOpenIndex > lastCloseIndex) {
      const query = value.slice(lastOpenIndex + 2);
      setSuggestionState({ fieldId: id, fieldName, query, index: 0, show: true });
    } else {
      setSuggestionState(null);
    }
  };

  const insertSuggestion = (id: string, fieldName: 'key' | 'value', key: string) => {
    const field = fields.find(f => f.id === id);
    if (!field) return;

    const currentVal = (field[fieldName] || '') as string;
    const lastOpenIndex = currentVal.lastIndexOf('{{');
    const newVal = currentVal.slice(0, lastOpenIndex) + `{{${key}}}`;
    
    updateField(id, fieldName, newVal);
    setSuggestionState(null);
  };

  const filteredVars = suggestionState 
    ? variables.filter(v => v.key.toLowerCase().includes(suggestionState.query.toLowerCase()))
    : [];

  const handleKeyDown = (e: React.KeyboardEvent, id: string, fieldName: 'key' | 'value') => {
    if (!suggestionState || !suggestionState.show || filteredVars.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionState(prev => prev ? { ...prev, index: (prev.index + 1) % filteredVars.length } : null);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionState(prev => prev ? { ...prev, index: (prev.index - 1 + filteredVars.length) % filteredVars.length } : null);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertSuggestion(id, fieldName, filteredVars[suggestionState.index].key);
    } else if (e.key === 'Escape') {
      setSuggestionState(null);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col overflow-hidden" onClick={onInteraction}>
      <div className="flex justify-between items-center px-2">
        <div>
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/></svg>
            Schema Architect
          </h3>
          <p className="text-[7px] text-slate-700 font-bold uppercase tracking-widest mt-1">Structured Mapping</p>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); addField(); }} 
          className="text-[10px] font-black uppercase flex items-center gap-2 transition-all hover:scale-105 active:scale-95 px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] rounded-lg border border-white/5"
          style={{ color: accentColor }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Add Item
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar pb-10">
        {fields.map((f) => {
          const isCurrentField = suggestionState?.fieldId === f.id;
          
          return (
            <div key={f.id} className="flex flex-col gap-2 bg-white/[0.01] p-3 rounded-xl border border-white/[0.04] hover:border-white/10 transition-all animate-reveal">
              <div className="flex gap-3 items-center">
                <div className="flex-1 relative">
                  <VariableAwareInput
                    placeholder="Field Key"
                    value={f.key}
                    onChange={(val) => handleValueChange(f.id, 'key', val)}
                    onKeyDown={(e) => handleKeyDown(e, f.id, 'key')}
                    variables={variables}
                    accentColor={accentColor}
                    className="w-full bg-black/40 rounded-lg border border-white/5"
                    onBlur={() => setTimeout(() => setSuggestionState(null), 200)}
                  />
                  {isCurrentField && suggestionState.fieldName === 'key' && filteredVars.length > 0 && (
                    <div className="absolute left-0 top-full mt-2 w-full z-[100] bg-[#11141b] border border-white/10 rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,1)] max-h-48 overflow-y-auto custom-scrollbar">
                      <div className="p-2 border-b border-white/5 bg-black/40">
                         <p className="text-[7px] text-slate-600 font-black uppercase tracking-[0.2em]">Variable Suggestions</p>
                      </div>
                      {filteredVars.map((v, i) => (
                        <button
                          key={v.key}
                          onMouseDown={(e) => { e.preventDefault(); insertSuggestion(f.id, 'key', v.key); }}
                          className={`w-full text-left px-4 py-3 flex items-center justify-between transition-all border-b border-white/[0.03] last:border-0 ${suggestionState.index === i ? 'bg-white/10' : 'hover:bg-white/[0.03]'}`}
                        >
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black tracking-tight" style={{ color: suggestionState.index === i ? accentColor : '#e2e8f0' }}>{v.key}</span>
                            <span className="text-[7px] text-slate-500 font-bold uppercase truncate max-w-[150px] mt-0.5">{v.value}</span>
                          </div>
                          {suggestionState.index === i && <span className="text-[7px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase" style={{ backgroundColor: `${accentColor}33`, color: accentColor }}>Select</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <select
                  value={f.type}
                  onChange={(e) => updateField(f.id, 'type', e.target.value)}
                  className="bg-transparent text-[9px] font-black uppercase outline-none cursor-pointer p-1"
                  style={{ color: accentColor }}
                >
                  <option value="string" className="bg-slate-900">String</option>
                  <option value="number" className="bg-slate-900">Number</option>
                  <option value="boolean" className="bg-slate-900">Boolean</option>
                  <option value="null" className="bg-slate-900">Null</option>
                </select>
                <button onClick={() => removeField(f.id)} className="p-1.5 text-slate-800 hover:text-rose-500 transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                </button>
              </div>

              <div className="relative">
                <VariableAwareInput
                  placeholder="Field Value"
                  value={f.value}
                  onChange={(val) => handleValueChange(f.id, 'value', val)}
                  onKeyDown={(e) => handleKeyDown(e, f.id, 'value')}
                  variables={variables}
                  accentColor={accentColor}
                  className="w-full bg-black/60 rounded-lg border border-white/5"
                  disabled={f.type === 'null'}
                  onBlur={() => setTimeout(() => setSuggestionState(null), 200)}
                />
                
                {isCurrentField && suggestionState.fieldName === 'value' && filteredVars.length > 0 && (
                  <div className="absolute left-0 top-full mt-2 w-full z-[100] bg-[#11141b] border border-white/10 rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,1)] max-h-48 overflow-y-auto custom-scrollbar">
                    <div className="p-2 border-b border-white/5 bg-black/40">
                       <p className="text-[7px] text-slate-600 font-black uppercase tracking-[0.2em]">Variable Suggestions</p>
                    </div>
                    {filteredVars.map((v, i) => (
                      <button
                        key={v.key}
                        onMouseDown={(e) => { e.preventDefault(); insertSuggestion(f.id, 'value', v.key); }}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between transition-all border-b border-white/[0.03] last:border-0 ${suggestionState.index === i ? 'bg-white/10' : 'hover:bg-white/[0.03]'}`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black tracking-tight" style={{ color: suggestionState.index === i ? accentColor : '#e2e8f0' }}>{v.key}</span>
                          <span className="text-[7px] text-slate-500 font-bold uppercase truncate max-w-[180px] mt-0.5">{v.value}</span>
                        </div>
                        {suggestionState.index === i && <span className="text-[7px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase" style={{ backgroundColor: `${accentColor}33`, color: accentColor }}>Select</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JsonBuilder;
