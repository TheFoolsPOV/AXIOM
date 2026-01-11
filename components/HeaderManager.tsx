
import React from 'react';
import { KeyValuePair, generateId } from '../types';

interface HeaderManagerProps {
  headers: KeyValuePair[];
  setHeaders: (headers: KeyValuePair[]) => void;
  accentColor: string;
}

const HeaderManager: React.FC<HeaderManagerProps> = ({ headers, setHeaders, accentColor }) => {
  const addHeader = () => {
    setHeaders([...headers, { id: generateId(), key: '', value: '', enabled: true }]);
  };

  const addAuth = () => {
    const existing = headers.find(h => h.key.toLowerCase() === 'authorization');
    if (existing) {
      alert("Authorization header already exists.");
      return;
    }
    setHeaders([...headers, { id: generateId(), key: 'Authorization', value: 'Bearer ', enabled: true }]);
  };

  const removeHeader = (id: string) => {
    setHeaders(headers.filter(h => h.id !== id));
  };

  const updateHeader = (id: string, field: keyof KeyValuePair, val: any) => {
    setHeaders(headers.map(h => h.id === id ? { ...h, [field]: val } : h));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Request Headers
        </h3>
        <div className="flex gap-2">
          <button
            onClick={addAuth}
            className="text-[9px] font-black transition-all uppercase px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] rounded-lg border border-white/5 text-slate-500 hover:text-slate-300"
          >
            + Auth
          </button>
          <button
            onClick={addHeader}
            className="text-[10px] font-black transition-all uppercase flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] hover:bg-white/[0.08] rounded-lg border border-white/5 active:scale-95"
            style={{ color: accentColor }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Append
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {headers.map((header) => (
          <div key={header.id} className="flex gap-3 items-center bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04] group hover:border-white/10 transition-all">
            <input
              type="checkbox"
              checked={header.enabled}
              onChange={(e) => updateHeader(header.id, 'enabled', e.target.checked)}
              className="w-4 h-4 rounded-md bg-slate-900 border-white/10 focus:ring-0 cursor-pointer"
              style={{ accentColor }}
            />
            <input
              placeholder="Header Key"
              value={header.key}
              onChange={(e) => updateHeader(header.id, 'key', e.target.value)}
              className="w-1/3 px-3 py-1.5 bg-transparent text-[12px] text-slate-200 outline-none border-b border-transparent transition-all placeholder-slate-700 font-medium"
              onFocus={(e) => e.currentTarget.style.borderColor = accentColor + '44'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
            />
            <div className="w-px h-4 bg-white/5"></div>
            <input
              placeholder="Value"
              value={header.value}
              onChange={(e) => updateHeader(header.id, 'value', e.target.value)}
              className="flex-1 px-3 py-1.5 bg-transparent text-[12px] text-slate-400 outline-none border-b border-transparent transition-all placeholder-slate-800"
              onFocus={(e) => e.currentTarget.style.borderColor = accentColor + '44'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'transparent'}
            />
            <button
              onClick={() => removeHeader(header.id)}
              className="p-1.5 text-slate-600 hover:text-rose-500 transition-all rounded-lg hover:bg-rose-500/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </button>
          </div>
        ))}
        {headers.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-white/[0.03] rounded-2xl">
            <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest italic">Header Set Empty</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeaderManager;
