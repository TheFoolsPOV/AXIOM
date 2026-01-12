import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { HttpMethod, KeyValuePair, Variable, generateId } from '../types';
import Editor from './Editor';
import MethodSelector from './MethodSelector';

interface BulkTransmitProps {
  url: string;
  method: HttpMethod;
  setMethod: (method: HttpMethod) => void;
  headers: KeyValuePair[];
  variables: Variable[];
  builderFields: KeyValuePair[];
  initialN?: number;
  onClose: () => void;
  accentColor: string; 
}

interface FieldPattern {
  id: string;
  key: string;
  pattern: string;
  type: string;
}

const BulkTransmit: React.FC<BulkTransmitProps> = ({ 
  url, 
  method, 
  setMethod,
  headers, 
  variables, 
  builderFields, 
  initialN = 0,
  onClose, 
  accentColor
}) => {
  const [strategy, setStrategy] = useState<'sequential' | 'burst'>('sequential');
  const [factoryMode, setFactoryMode] = useState<'linear' | 'chaotic'>('linear');
  const [data, setData] = useState('[]');
  const [status, setStatus] = useState<'idle' | 'running' | 'finished'>('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<{ status: number; text: string; time: number; id: string }[]>([]);
  const [viewMode, setViewMode] = useState<'generator' | 'raw'>('generator');
  
  // Internal Range Management
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(10);
  const [fieldPatterns, setFieldPatterns] = useState<FieldPattern[]>([]);

  // Regulation Logic: Sync range based on Method + initialN (Max ID found)
  useEffect(() => {
    if (method === 'POST') {
      // Create new resources: Start at max + 1
      setRangeStart(initialN + 1);
      setRangeEnd(initialN + 10);
    } else {
      // Modify/Delete existing: Start at 1, End at current max ID
      setRangeStart(1);
      setRangeEnd(initialN || 1);
    }
  }, [method, initialN]);

  // Handler for manual range changes with regulation
  const handleRangeEndChange = (val: string) => {
    const num = parseInt(val) || 1;
    if (method !== 'POST') {
      // Regulation: Max cannot exceed the current Max ID for non-POST methods
      setRangeEnd(Math.min(num, initialN || 1));
    } else {
      setRangeEnd(num);
    }
  };

  const handleRangeStartChange = (val: string) => {
    const num = parseInt(val) || 1;
    if (method !== 'POST') {
      setRangeStart(Math.min(num, initialN || 1));
    } else {
      setRangeStart(num);
    }
  };

  useEffect(() => {
    setFieldPatterns(builderFields.map(f => ({
      id: f.id, 
      key: f.key, 
      pattern: f.key.toLowerCase().includes('id') ? '{{n}}' : f.value, 
      type: f.type || 'string'
    })));
  }, [builderFields]);

  const generateBatch = useCallback(() => {
    const newBatch = [];
    const packetCount = Math.max(0, rangeEnd - rangeStart + 1);
    
    for (let i = 0; i < packetCount; i++) {
      const loopValue = rangeStart + i;
      const item: Record<string, any> = {};
      
      fieldPatterns.forEach(fp => {
        let val: any = fp.pattern;
        
        if (factoryMode === 'chaotic') {
          if (fp.type === 'number') val = Math.floor(Math.random() * 999999);
          else if (fp.type === 'boolean') val = Math.random() > 0.5;
          else if (fp.type === 'string' && fp.pattern === '{{n}}') val = loopValue.toString();
          else if (fp.type === 'string') val = `chaos_${Math.random().toString(36).slice(2, 7)}`;
        } else {
          val = String(val).replace(/{{n}}/g, loopValue.toString());
          if (fp.type === 'number') val = Number(val);
          else if (fp.type === 'boolean') val = String(val).toLowerCase() === 'true';
          else if (fp.type === 'null') val = null;
        }
        item[fp.key] = val;
      });
      newBatch.push(item);
    }
    setData(JSON.stringify(newBatch, null, 2));
  }, [rangeStart, rangeEnd, fieldPatterns, factoryMode]);

  useEffect(() => { if (viewMode === 'generator') generateBatch(); }, [generateBatch, viewMode]);

  const packetCountDisplay = useMemo(() => Math.max(0, rangeEnd - rangeStart + 1), [rangeStart, rangeEnd]);

  const injectVars = (str: string, loopIdx?: number) => {
    let res = str;
    variables.forEach(v => { if (v.key) res = res.replace(new RegExp(`{{${v.key}}}`, 'g'), v.value); });
    if (loopIdx !== undefined) res = res.replace(/{{n}}/g, loopIdx.toString());
    return res;
  };

  const transmitPacket = async (payload: any, index: number) => {
    const loopValue = rangeStart + index;
    const startTime = performance.now();
    const headersObj: Record<string, string> = {};
    
    headers.filter(h => h.enabled && h.key).forEach(h => { 
      headersObj[injectVars(h.key, loopValue)] = injectVars(h.value, loopValue); 
    });
    
    const finalUrl = injectVars(url, loopValue);
    try {
      const options: RequestInit = {
        method: method,
        headers: headersObj,
        body: (method !== 'GET' && method !== 'DELETE') ? JSON.stringify(payload) : undefined 
      };
      const res = await fetch(finalUrl, options);
      const endTime = performance.now();
      return { 
        id: generateId(), 
        status: res.status, 
        text: `PKG ${loopValue}: ${res.statusText || 'OK'}`, 
        time: Math.round(endTime - startTime) 
      };
    } catch (err: any) { 
      return { id: generateId(), status: 0, text: `PKG ${loopValue}: FAULT`, time: 0 }; 
    }
  };

  const runBulk = async () => {
    let parsed: any[];
    try { parsed = JSON.parse(data); } catch (e) { return; }
    if (!Array.isArray(parsed)) return;
    setStatus('running'); setLogs([]); setProgress(0);
    
    if (strategy === 'burst') {
      const promises = parsed.map((p, i) => transmitPacket(p, i).then(res => {
        setLogs(prev => [res, ...prev]);
        setProgress(pVal => Math.min(100, pVal + (100 / parsed.length)));
        return res;
      }));
      await Promise.all(promises);
    } else {
      for (let i = 0; i < parsed.length; i++) {
        const result = await transmitPacket(parsed[i], i);
        setLogs(prev => [result, ...prev]);
        setProgress(Math.round(((i + 1) / parsed.length) * 100));
      }
    }
    setStatus('finished');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl animate-reveal">
      <div className="glass-panel w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden bg-[#0d1117] border-white/10 shadow-[0_0_120px_rgba(0,0,0,1)]">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#161b22] shrink-0" style={{ borderTop: `4px solid ${accentColor}` }}>
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-2xl transition-all" style={{ backgroundColor: accentColor }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
            </div>
            <div>
               <h2 className="text-white font-black text-xl tracking-tighter uppercase mb-0.5">Mass Transmit Engine</h2>
               <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.4em]">Global Method Sync Enabled</p>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <button onClick={onClose} className="p-4 hover:bg-white/5 rounded-xl transition-all text-slate-600 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {status === 'idle' ? (
            <div className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
              <div className="flex justify-between items-center shrink-0">
                <div className="flex gap-4">
                   <div className="flex flex-col gap-1.5">
                      <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest ml-1">Operation Method (Global)</span>
                      <MethodSelector value={method} onChange={setMethod} />
                   </div>
                   <div className="flex flex-col gap-1.5">
                      <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest ml-1">Factory Mode</span>
                      <div className="toggle-container">
                        <button onClick={() => setFactoryMode('linear')} className={`toggle-item ${factoryMode === 'linear' ? 'active' : ''}`}>Linear</button>
                        <button onClick={() => setFactoryMode('chaotic')} className={`toggle-item ${factoryMode === 'chaotic' ? 'active' : ''}`}>Chaotic</button>
                      </div>
                   </div>
                </div>
                <div className="flex flex-col gap-1.5 items-end">
                   <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest mr-1">Transit Strategy</span>
                   <div className="toggle-container">
                      <button onClick={() => setStrategy('sequential')} className={`toggle-item ${strategy === 'sequential' ? 'active' : ''}`}>Sequential</button>
                      <button onClick={() => setStrategy('burst')} className={`toggle-item ${strategy === 'burst' ? 'active' : ''}`}>Burst (Parallel)</button>
                   </div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                {viewMode === 'generator' ? (
                  <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden pb-4">
                    <div className="glass-panel p-6 flex flex-col gap-6 bg-black/40 border-white/5 shadow-inner relative overflow-hidden">
                      <div className="flex justify-between items-center">
                        <h4 className="section-label !mb-0">Transmission Range</h4>
                        {method !== 'POST' && (
                          <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded">ID Cap: {initialN}</span>
                        )}
                      </div>
                      <div className="space-y-4">
                         <div>
                            <label className="text-[8px] font-black text-slate-600 uppercase mb-2 block tracking-widest">Sequence Start (n)</label>
                            <input 
                              type="number" 
                              value={rangeStart} 
                              onChange={e => handleRangeStartChange(e.target.value)} 
                              className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white font-black outline-none focus:border-white/20 transition-all text-xs shadow-inner" 
                            />
                         </div>
                         <div>
                            <label className="text-[8px] font-black text-slate-600 uppercase mb-2 block tracking-widest">Sequence End (max)</label>
                            <input 
                              type="number" 
                              value={rangeEnd} 
                              onChange={e => handleRangeEndChange(e.target.value)} 
                              className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white font-black outline-none focus:border-white/20 transition-all text-xs shadow-inner" 
                            />
                         </div>
                      </div>

                      <div className="mt-auto pt-6 flex flex-col items-center">
                        <div 
                          className="w-full max-w-[200px] p-4 glass-card bg-black/80 border-2 rounded-2xl relative overflow-hidden group transition-all duration-500 shadow-2xl"
                          style={{ borderColor: `${accentColor}40`, boxShadow: `0 0 30px ${accentColor}10` }}
                        >
                          <div 
                            className="absolute top-0 bottom-0 w-[1px] opacity-40 blur-sm"
                            style={{ 
                              backgroundColor: accentColor,
                              left: '0%',
                              animation: 'scan-horiz 3s linear infinite'
                            }}
                          />
                          
                          <div className="flex justify-between items-start relative z-10 mb-3">
                             <div className="flex flex-col">
                               <span className="text-[7px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1">Queue Density</span>
                               <span className="text-3xl font-black tabular-nums tracking-tighter" style={{ color: accentColor, textShadow: `0 0 15px ${accentColor}40` }}>{packetCountDisplay}</span>
                             </div>
                             <div className="w-8 h-8 rounded-lg border border-white/5 flex items-center justify-center opacity-40">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: accentColor }}><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-8 gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
                            {Array.from({ length: 16 }).map((_, i) => (
                              <div key={i} className="h-1 bg-white rounded-full transition-all duration-700" style={{ width: i % 2 === 0 ? '100%' : '60%', backgroundColor: i < (packetCountDisplay / 10) ? accentColor : undefined }}></div>
                            ))}
                          </div>
                          
                          <div className="mt-4 flex justify-between items-center">
                            <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Logic: {method === 'POST' ? 'Increment' : 'Cap At Max'}</span>
                            <div className="flex gap-0.5">
                               <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                               <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                               <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="lg:col-span-2 glass-panel p-6 flex flex-col overflow-hidden bg-black/40 border-white/5 shadow-2xl">
                       <h4 className="section-label mb-4">Mass Payload Mapping</h4>
                       <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-3 pb-4">
                          {fieldPatterns.map((fp, i) => (
                            <div key={fp.id} className="grid grid-cols-2 gap-3 items-center p-3 glass-card bg-black/20 border-white/5 hover:border-white/10 transition-all">
                               <div className="text-[9px] font-black text-slate-500 uppercase tracking-tighter truncate">{fp.key}</div>
                               <input 
                                  value={fp.pattern} 
                                  onChange={e => { const n = [...fieldPatterns]; n[i].pattern = e.target.value; setFieldPatterns(n); }} 
                                  placeholder="Pattern..."
                                  className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-blue-400 font-mono outline-none focus:border-blue-500/30 transition-all shadow-inner" 
                                />
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                ) : <div className="h-full rounded-2xl overflow-hidden border border-white/5 shadow-2xl mb-4"><Editor value={data} onChange={setData} accentColor={accentColor} /></div>}
              </div>

              <div className="flex justify-end pt-2 shrink-0">
                <button onClick={runBulk} className="px-14 py-4 text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-2xl shadow-2xl active:scale-95 transition-all hover:brightness-110" style={{ backgroundColor: accentColor }}>Begin Transmission</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-10 overflow-hidden animate-reveal">
              <div className="mb-10 shrink-0">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[10px] font-black uppercase text-slate-600 tracking-[0.5em]">{status === 'running' ? 'Active Pulses' : 'Telemetry Finalized'}</h3>
                  <span className="text-5xl font-black font-mono tracking-tighter" style={{ color: accentColor }}>{Math.round(progress)}%</span>
                </div>
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
                  <div className="h-full rounded-full transition-all duration-300 shadow-[0_0_10px_currentColor]" style={{ width: `${progress}%`, backgroundColor: accentColor, color: accentColor }}></div>
                </div>
              </div>
              <div className="flex-1 glass-panel p-6 overflow-y-auto custom-scrollbar space-y-1.5 bg-black/40 border-white/5 shadow-inner">
                {logs.map((log) => (
                  <div key={log.id} className="flex justify-between items-center p-2.5 glass-card bg-black/20 border-white/[0.02] animate-reveal">
                    <div className="flex items-center gap-3">
                       <span className={`text-[7px] font-black px-2 py-0.5 rounded-md border ${log.status >= 200 && log.status < 300 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{log.status || 'ERR'}</span>
                       <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">{log.text}</span>
                    </div>
                    <span className="text-[8px] font-mono text-slate-700 font-black">{log.time}ms</span>
                  </div>
                ))}
              </div>
              {status === 'finished' && (
                <div className="mt-8 flex gap-4 shrink-0">
                  <button onClick={() => setStatus('idle')} className="flex-1 py-4 glass-panel text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 border-white/10 hover:bg-white/5 transition-all">Config</button>
                  <button onClick={onClose} className="flex-[2] py-4 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl hover:brightness-110 transition-all" style={{ backgroundColor: accentColor }}>Close Engine</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes scan-horiz {
          0% { left: 0%; opacity: 0; }
          10% { opacity: 0.4; }
          90% { opacity: 0.4; }
          100% { left: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default BulkTransmit;