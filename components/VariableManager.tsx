
import React from 'react';
import { Variable, KeyValuePair } from '../types';

interface VariableManagerProps {
  variables: Variable[];
  setVariables: (vars: Variable[]) => void;
  url: string;
  headers: KeyValuePair[];
  body: string;
  accentColor: string;
}

const VariableManager: React.FC<VariableManagerProps> = ({ variables, setVariables, url, headers, body, accentColor }) => {
  const addVariable = () => setVariables([...variables, { key: '', value: '' }]);
  const removeVariable = (index: number) => setVariables(variables.filter((_, i) => i !== index));
  const updateVariable = (index: number, field: keyof Variable, val: string) => {
    const next = [...variables];
    next[index] = { ...next[index], [field]: val };
    setVariables(next);
  };

  const isKeyUsed = (key: string) => {
    if (!key) return false;
    const pattern = `{{${key}}}`;
    const inUrl = url.includes(pattern);
    const inHeaders = headers.some(h => h.key.includes(pattern) || h.value.includes(pattern));
    const inBody = body.includes(pattern);
    return inUrl || inHeaders || inBody;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4 px-1">
        <div>
          <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Environment</h3>
          <p className="text-[7px] text-slate-600 font-bold uppercase tracking-widest">Global Variables</p>
        </div>
        <button 
          onClick={addVariable} 
          className="text-[9px] font-black transition-all uppercase px-4 py-2 rounded-xl border active:scale-95 shadow-lg flex items-center gap-2"
          style={{ 
            color: accentColor, 
            borderColor: `${accentColor}33`,
            backgroundColor: `${accentColor}11`
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          ADD KEY
        </button>
      </div>
      
      <div className="mb-4 p-3 bg-white/[0.02] rounded-xl border border-white/[0.05]">
        <p className="text-[9px] text-slate-500 leading-relaxed italic">
          Variables act as dynamic placeholders. Reference them anywhere using <code className="text-blue-400 font-bold">{"{{key}}"}</code>.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-4">
        {variables.map((v, i) => {
          const active = isKeyUsed(v.key);
          return (
            <div 
              key={i} 
              className="flex flex-col gap-2 p-3 rounded-2xl border transition-all animate-reveal group"
              style={{ 
                borderColor: active ? `${accentColor}66` : 'rgba(255,255,255,0.04)',
                backgroundColor: active ? `${accentColor}11` : 'rgba(255,255,255,0.01)',
                boxShadow: active ? `0 0 20px ${accentColor}11` : 'none'
              }}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[7px] font-black uppercase tracking-[0.2em]" style={{ color: active ? accentColor : '#334155' }}>
                  {active ? 'ACTIVE' : 'Definition'}
                </span>
                <button 
                  onClick={() => removeVariable(i)} 
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-700 hover:text-rose-500 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  placeholder="NAME"
                  value={v.key}
                  onChange={e => updateVariable(i, 'key', e.target.value)}
                  className="w-full p-2 text-[10px] bg-black/40 border border-white/5 rounded-lg outline-none transition-all font-black tracking-widest text-slate-300 focus:border-white/20"
                  style={active ? { color: accentColor } : {}}
                />
                <input 
                  placeholder="VALUE"
                  value={v.value}
                  onChange={e => updateVariable(i, 'value', e.target.value)}
                  className="w-full p-2 text-[10px] bg-black/40 border border-white/5 rounded-lg text-slate-500 focus:border-white/20 outline-none transition-all font-medium"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VariableManager;
