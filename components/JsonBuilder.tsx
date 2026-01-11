import React, { useState } from 'react';
import { KeyValuePair, Variable, generateId } from '../types';

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
    if (!value) return <span className="text-slate-800">{placeholder}</span>;
    const parts = value.split(/(\{\{.*?\}\})/g);
    return parts.map((part, i) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        const key = part.slice(2, -2);
        const exists = variables.some(v => v.key === key);
        if (exists) return <span key={i} className="font-black px-1.5 rounded bg-white/10 border border-white/5 mx-0.5 inline-block" style={{ color: accentColor }}>{key}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={`relative flex items-center min-h-[34px] ${className}`}>
      {!isFocused && <div className="absolute inset-0 px-3 py-2 pointer-events-none truncate text-[11px] font-medium flex items-center">{renderDisplay()}</div>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => { setIsFocused(true); onFocus?.(); }}
        onBlur={() => { setIsFocused(false); onBlur?.(); }}
        disabled={disabled}
        placeholder={isFocused ? placeholder : ""}
        className={`w-full px-3 py-2 bg-transparent outline-none border-none text-[11px] font-medium ${isFocused ? 'text-white' : 'text-transparent cursor-text'}`}
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
    setFields([...fields, { id: generateId(), key: '', value: '', enabled: true, type: 'string' }]);
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
      setSuggestionState({ fieldId: id, fieldName, query: value.slice(lastOpenIndex + 2), index: 0, show: true });
    } else {
      setSuggestionState(null);
    }
  };

  const insertSuggestion = (id: string, fieldName: 'key' | 'value', key: string) => {
    const field = fields.find(f => f.id === id);
    if (!field) return;
    const currentVal = (field[fieldName] || '') as string;
    const lastOpenIndex = currentVal.lastIndexOf('{{');
    updateField(id, fieldName, currentVal.slice(0, lastOpenIndex) + `{{${key}}}`);
    setSuggestionState(null);
  };

  const filteredVars = suggestionState ? variables.filter(v => v.key.toLowerCase().includes(suggestionState.query.toLowerCase())) : [];

  return (
    <div className="space-y-4 h-full flex flex-col overflow-hidden" onClick={onInteraction}>
      <div className="flex justify-between items-center px-1 mb-2">
        <h3 className="section-label !mb-0">Schema Architect</h3>
        <button onClick={(e) => { e.stopPropagation(); addField(); }} className="text-[9px] font-black uppercase flex items-center gap-2 transition-all active:scale-95 px-3 py-1.5 glass-card !rounded-lg border-white/10" style={{ color: accentColor }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Add Item
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-10">
        {fields.map((f) => (
          <div key={f.id} className="flex flex-col gap-2 p-3 glass-card bg-black/40 border-white/[0.04] hover:border-white/10 transition-all animate-reveal shadow-sm">
            <div className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <VariableAwareInput
                  placeholder="Key"
                  value={f.key}
                  onChange={(val) => handleValueChange(f.id, 'key', val)}
                  onKeyDown={(e) => {
                    if (suggestionState?.show && filteredVars.length > 0) {
                      if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestionState(p => p ? { ...p, index: (p.index + 1) % filteredVars.length } : null); }
                      else if (e.key === 'ArrowUp') { e.preventDefault(); setSuggestionState(p => p ? { ...p, index: (p.index - 1 + filteredVars.length) % filteredVars.length } : null); }
                      else if (e.key === 'Enter') { e.preventDefault(); insertSuggestion(f.id, 'key', filteredVars[suggestionState.index].key); }
                    }
                  }}
                  variables={variables}
                  accentColor={accentColor}
                  className="bg-black/60 rounded-lg border border-white/5"
                  onBlur={() => setTimeout(() => setSuggestionState(null), 200)}
                />
                {suggestionState?.fieldId === f.id && suggestionState.fieldName === 'key' && filteredVars.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 w-full z-50 bg-[#1c2128] border border-white/10 rounded-lg shadow-2xl overflow-hidden">
                    {filteredVars.map((v, i) => (
                      <button key={v.key} onMouseDown={(e) => { e.preventDefault(); insertSuggestion(f.id, 'key', v.key); }} className={`w-full text-left px-3 py-2 text-[10px] font-bold ${suggestionState.index === i ? 'bg-white/10' : 'hover:bg-white/5'}`} style={{ color: suggestionState.index === i ? accentColor : '#e2e8f0' }}>{v.key}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative h-[34px] group">
                <select 
                  value={f.type} 
                  onChange={(e) => updateField(f.id, 'type', e.target.value)} 
                  className="h-full bg-[#1c2128] text-[9px] font-black uppercase outline-none cursor-pointer pl-4 pr-10 rounded-lg border border-white/10 transition-all hover:border-white/20 appearance-none min-w-[110px] shadow-inner"
                  style={{ color: accentColor }}
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="null">Null</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 group-hover:text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
              <button onClick={() => removeField(f.id)} className="p-1.5 text-slate-700 hover:text-rose-500 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg></button>
            </div>
            <VariableAwareInput 
              placeholder="Value" 
              value={f.value} 
              onChange={(val) => handleValueChange(f.id, 'value', val)} 
              variables={variables} 
              accentColor={accentColor} 
              className="bg-black/20 rounded-lg border border-white/5" 
              disabled={f.type === 'null'} 
              onBlur={() => setTimeout(() => setSuggestionState(null), 200)} 
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default JsonBuilder;