import React, { useState, useRef, useEffect } from 'react';
import { Variable, Environment, generateId, KeyValuePair } from '../types';

interface VariableManagerProps {
  environments: Environment[];
  setEnvironments: (envs: Environment[]) => void;
  activeEnvId: string;
  setActiveEnvId: (id: string) => void;
  url: string;
  headers: KeyValuePair[];
  body: string;
  accentColor: string;
}

const VariableManager: React.FC<VariableManagerProps> = ({ environments, setEnvironments, activeEnvId, setActiveEnvId, url, headers, body, accentColor }) => {
  const activeEnv = environments.find(e => e.id === activeEnvId) || environments[0];
  const [isEditingName, setIsEditingName] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addEnv = () => {
    const id = generateId();
    setEnvironments([...environments, { id, name: `Environment ${environments.length + 1}`, variables: [] }]);
    setActiveEnvId(id);
    setIsDropdownOpen(false);
  };

  const deleteEnv = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (environments.length <= 1) {
      alert("You must keep at least one environment.");
      return;
    }

    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setConfirmDeleteId(null), 3000);
    } else {
      // Execute Deletion
      const remaining = environments.filter(env => env.id !== id);
      setEnvironments(remaining);
      if (activeEnvId === id) {
        setActiveEnvId(remaining[0].id);
      }
      setConfirmDeleteId(null);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  };

  const updateVar = (idx: number, field: keyof Variable, val: string) => {
    setEnvironments(environments.map(e => e.id === activeEnvId ? { ...e, variables: e.variables.map((v, i) => i === idx ? { ...v, [field]: val } : v) } : e));
  };

  const addVar = () => setEnvironments(environments.map(e => e.id === activeEnvId ? { ...e, variables: [...e.variables, { key: '', value: '' }] } : e));
  const removeVar = (idx: number) => setEnvironments(environments.map(e => e.id === activeEnvId ? { ...e, variables: e.variables.filter((_, i) => i !== idx) } : e));
  
  const isKeyUsed = (key: string) => {
    if (!key) return false;
    const p = `{{${key}}}`;
    return url.includes(p) || headers.some(h => h.key.includes(p) || h.value.includes(p)) || body.includes(p);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-5 px-1">
        <h3 className="section-label !mb-0">Environments</h3>
        <div className="flex gap-2">
          <button onClick={addVar} className="text-[9px] font-black uppercase px-3 py-1.5 glass-card hover:bg-white/5 active:scale-95 border-white/10" style={{ color: accentColor }}>+ Var</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
        {/* CUSTOM DROPDOWN SELECTOR */}
        <div className="flex items-center gap-2 mb-3 relative" ref={dropdownRef}>
          <div className="flex-1 relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full bg-[#0d1117] border border-white/10 text-[10px] font-black text-slate-300 outline-none cursor-pointer pl-3 pr-10 h-10 rounded-xl flex items-center justify-between hover:border-white/20 transition-all shadow-inner`}
            >
              <span className="truncate">{activeEnv.name}</span>
              <div className="text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 z-[9999] bg-[#1c2128] border-2 border-[#30363d] rounded-xl shadow-[0_40px_100px_rgba(0,0,0,1)] overflow-hidden animate-reveal">
                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                  {environments.map((e) => (
                    <div 
                      key={e.id}
                      onClick={() => { setActiveEnvId(e.id); setIsDropdownOpen(false); }}
                      className={`group flex items-center justify-between px-4 py-3 cursor-pointer transition-colors border-b border-[#30363d] last:border-0 hover:bg-[#2d333b] ${activeEnvId === e.id ? 'bg-[#232a35]' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${activeEnvId === e.id ? '' : 'bg-slate-700'}`} style={{ backgroundColor: activeEnvId === e.id ? accentColor : undefined }}></div>
                        <span className={`text-[11px] font-black tracking-tight ${activeEnvId === e.id ? 'text-white' : 'text-slate-400'}`}>{e.name}</span>
                      </div>
                      <button 
                        onClick={(ev) => deleteEnv(ev, e.id)}
                        className={`p-2 transition-all rounded-lg ${confirmDeleteId === e.id ? 'bg-rose-500 text-white animate-pulse' : 'opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10'}`}
                        title={confirmDeleteId === e.id ? "Click again to confirm" : "Delete Environment"}
                      >
                        {confirmDeleteId === e.id ? (
                          <span className="text-[8px] font-black uppercase px-1">Confirm?</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={addEnv}
                  className="w-full py-3 bg-[#161b22] text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors border-t border-[#30363d] flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  New Environment
                </button>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsEditingName(!isEditingName)} 
            className={`p-2.5 glass-card border-white/10 transition-all shrink-0 ${isEditingName ? 'bg-white/10 text-white' : 'text-slate-600 hover:text-white'}`}
            title="Rename Environment"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
        </div>

        {isEditingName && (
          <div className="p-3 glass-panel border-blue-500/20 bg-blue-500/[0.05] mb-4 flex gap-2 animate-reveal">
            <input 
              autoFocus 
              value={activeEnv.name} 
              onChange={e => setEnvironments(environments.map(env => env.id === activeEnvId ? { ...env, name: e.target.value } : env))}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
              className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[11px] font-black text-white outline-none w-full"
            />
            <button onClick={() => setIsEditingName(false)} className="text-[10px] font-black uppercase text-blue-500 px-2">OK</button>
          </div>
        )}

        <div className="space-y-3 pb-6">
          {activeEnv.variables.map((v, i) => {
            const active = isKeyUsed(v.key);
            return (
              <div key={i} className={`p-4 glass-card border flex flex-col gap-3 transition-all group ${active ? 'border-blue-500/30 bg-blue-500/[0.04] shadow-[0_0_20px_rgba(59,130,246,0.05)]' : 'bg-[#0d1117] border-white/[0.04]'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-blue-400 shadow-[0_0_8px_#60a5fa]' : 'bg-slate-800'}`}></span>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${active ? 'text-blue-400' : 'text-slate-700'}`}>{active ? 'Active' : 'Idle'}</span>
                  </div>
                  <button onClick={() => removeVar(i)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-800 hover:text-rose-500 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                </div>
                <div className="flex flex-col gap-2">
                  <input placeholder="KEY" value={v.key} onChange={e => updateVar(i, 'key', e.target.value)} className="bg-black/60 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-black text-slate-200 outline-none focus:border-white/10 placeholder:text-slate-800 focus:bg-black/80" />
                  <input placeholder="VALUE" value={v.value} onChange={e => updateVar(i, 'value', e.target.value)} className="bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-medium text-slate-500 outline-none focus:border-white/10 placeholder:text-slate-800 focus:bg-black/50" />
                </div>
              </div>
            );
          })}
          {activeEnv.variables.length === 0 && (
            <div className="py-12 text-center text-[9px] font-black text-slate-800 uppercase tracking-widest italic opacity-50">No environment variables</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VariableManager;