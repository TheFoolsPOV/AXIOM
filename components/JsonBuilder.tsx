import React from 'react';
import { KeyValuePair } from '../types';

interface JsonBuilderProps {
  fields: KeyValuePair[];
  setFields: (fields: KeyValuePair[]) => void;
  accentColor: string;
  onInteraction?: () => void;
}

const JsonBuilder: React.FC<JsonBuilderProps> = ({ fields, setFields, accentColor, onInteraction }) => {
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

  return (
    <div 
      className="space-y-4 h-full flex flex-col overflow-hidden"
      onClick={onInteraction}
    >
      <div className="flex justify-between items-center px-2">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/></svg>
          Schema Architect
        </h3>
        <button 
          onClick={(e) => { e.stopPropagation(); addField(); }} 
          className="text-[10px] font-black uppercase flex items-center gap-2 transition-all hover:scale-105 active:scale-95 px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] rounded-lg border border-white/5"
          style={{ color: accentColor }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Property
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {fields.map((f) => (
          <div key={f.id} className="flex gap-3 items-center bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04] group hover:border-white/10 transition-all animate-reveal">
            <input
              placeholder="Key Name"
              value={f.key}
              onChange={(e) => updateField(f.id, 'key', e.target.value)}
              onFocus={onInteraction}
              className="w-1/3 px-3 py-1.5 bg-transparent text-[12px] text-slate-200 outline-none border-b border-transparent transition-all placeholder-slate-700 font-bold"
              onFocusCapture={(e) => e.currentTarget.style.borderColor = accentColor + '44'}
              onBlurCapture={(e) => e.currentTarget.style.borderColor = 'transparent'}
            />
            <div className="w-px h-4 bg-white/5"></div>
            <select
              value={f.type}
              onChange={(e) => updateField(f.id, 'type', e.target.value)}
              className="bg-transparent text-[9px] font-black uppercase outline-none cursor-pointer transition-colors"
              style={{ color: accentColor }}
            >
              <option value="string" className="bg-slate-900">Str</option>
              <option value="number" className="bg-slate-900">Num</option>
              <option value="boolean" className="bg-slate-900">Bool</option>
              <option value="null" className="bg-slate-900">Null</option>
            </select>
            <div className="w-px h-4 bg-white/5"></div>
            <input
              placeholder="Payload Value"
              value={f.value}
              onChange={(e) => updateField(f.id, 'value', e.target.value)}
              onFocus={onInteraction}
              disabled={f.type === 'null'}
              className="flex-1 px-3 py-1.5 bg-transparent text-[12px] text-slate-400 outline-none border-b border-transparent transition-all placeholder-slate-800 disabled:opacity-10"
              onFocusCapture={(e) => e.currentTarget.style.borderColor = accentColor + '44'}
              onBlurCapture={(e) => e.currentTarget.style.borderColor = 'transparent'}
            />
            <button 
              onClick={(e) => { e.stopPropagation(); removeField(f.id); }} 
              className="p-1.5 text-slate-700 hover:text-rose-500 transition-all rounded-lg hover:bg-rose-500/10"
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </button>
          </div>
        ))}
        {fields.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/[0.03] rounded-2xl opacity-40">
             <p className="text-[10px] text-slate-600 uppercase font-black tracking-[0.4em]">Empty Schema</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JsonBuilder;