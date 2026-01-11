import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { HttpMethod, KeyValuePair, Variable } from '../types';
import Editor from './Editor';

interface BulkTransmitProps {
  url: string;
  method: HttpMethod;
  headers: KeyValuePair[];
  variables: Variable[];
  builderFields: KeyValuePair[];
  initialN?: number;
  onClose: () => void;
  accentColor: string; 
  onModeChange: (color: string) => void;
  hasActiveResponse?: boolean;
}

interface FieldPattern {
  id: string;
  key: string;
  pattern: string;
  type: string;
}

type FactoryMode = 'linear' | 'chaotic';
type TransmissionStrategy = 'sequential' | 'burst';

const BulkTransmit: React.FC<BulkTransmitProps> = ({ 
  url: initialUrl, 
  method: initialMethod, 
  headers, 
  variables, 
  builderFields, 
  initialN = 0, 
  onClose, 
  accentColor: globalAccentColor,
  onModeChange,
  hasActiveResponse = false
}) => {
  const [targetUrl] = useState(initialUrl);
  const [targetMethod, setTargetMethod] = useState(initialMethod);
  const [strategy, setStrategy] = useState<TransmissionStrategy>('sequential');
  const [data, setData] = useState('[]');
  const [transmissionStatus, setTransmissionStatus] = useState<'idle' | 'running' | 'finished'>('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<{ status: number; text: string; time: number }[]>([]);
  const [viewMode, setViewMode] = useState<'generator' | 'visual' | 'raw'>('generator');
  const [factoryMode, setFactoryMode] = useState<FactoryMode>(globalAccentColor === '#a855f7' ? 'chaotic' : 'linear');
  const [rangeStart, setRangeStart] = useState(initialN + 1);
  const [rangeEnd, setRangeEnd] = useState(initialN + 10);
  const [fieldPatterns, setFieldPatterns] = useState<FieldPattern[]>([]);

  const currentAccent = useMemo(() => {
    const configs: Record<string, string> = {
      GET: '#10b981', POST: globalAccentColor, PUT: '#f59e0b', PATCH: '#06b6d4', DELETE: '#f43f5e'
    };
    return configs[targetMethod] || configs.POST;
  }, [targetMethod, globalAccentColor]);

  useEffect(() => {
    setFieldPatterns(builderFields.map(f => ({
      id: f.id, key: f.key, pattern: f.key.toLowerCase().includes('id') ? '{{n}}' : (f.key.toLowerCase().includes('title') || f.key.toLowerCase().includes('name')) ? `Unit-{{n}}` : (f.value || ''), type: f.type || 'string'
    })));
  }, [builderFields]);

  const generateRandom = (type: string) => {
    if (type === 'number') return Math.floor(Math.random() * 100000);
    if (type === 'boolean') return Math.random() > 0.5;
    return Math.random().toString(36).substring(2, 9).toUpperCase();
  };

  const handleSmartSeed = () => {
    // We already passed the smart initialN through props
    setRangeStart(initialN + 1);
    setRangeEnd(initialN + 10);
  };

  const generateBatch = useCallback(() => {
    const newBatch = [];
    const safeStart = isNaN(rangeStart) ? 1 : rangeStart;
    const safeEnd = isNaN(rangeEnd) ? safeStart : rangeEnd;
    for (let i = safeStart; i <= safeEnd; i++) {
      const item: Record<string, any> = {};
      fieldPatterns.forEach(fp => {
        if (!fp.key) return;
        let val: any;
        if (factoryMode === 'linear') { val = fp.pattern.replace(/{{n}}/g, i.toString()); } 
        else { val = fp.pattern.replace(/{{n}}/g, generateRandom(fp.type).toString()); if (fp.pattern === '{{n}}') val = generateRandom(fp.type); }
        if (fp.type === 'number') val = Number(val) || 0;
        else if (fp.type === 'boolean') val = String(val).toLowerCase() === 'true';
        else if (fp.type === 'null') val = null;
        item[fp.key] = val;
      });
      newBatch.push(item);
    }
    setData(JSON.stringify(newBatch, null, 2));
  }, [rangeStart, rangeEnd, fieldPatterns, factoryMode]);

  useEffect(() => { generateBatch(); }, [generateBatch]);

  const handleModeToggle = (mode: FactoryMode) => { setFactoryMode(mode); onModeChange(mode === 'chaotic' ? '#a855f7' : '#3b82f6'); };
  const parsedArray = useMemo(() => { try { const p = JSON.parse(data); return Array.isArray(p) ? p : []; } catch { return []; } }, [data]);
  const injectVars = (str: string) => { let res = str; variables.forEach(v => { if (v.key) res = res.replace(new RegExp(`{{${v.key}}}`, 'g'), v.value); }); return res; };

  const transmitPacket = async (payload: any, index: number) => {
    const startTime = performance.now();
    const headersObj: Record<string, string> = {};
    headers.filter(h => h.enabled && h.key && h.value).forEach(h => { headersObj[injectVars(h.key)] = injectVars(h.value); });
    const nValue = rangeStart + index;
    let finalUrl = injectVars(targetUrl).replace(/{{n}}/g, nValue.toString());
    if (targetMethod === 'GET' && payload) {
      const params = new URLSearchParams();
      Object.entries(payload).forEach(([k, v]) => { if (v !== null) params.append(k, String(v)); });
      const qs = params.toString(); if (qs) finalUrl += (finalUrl.includes('?') ? '&' : '?') + qs;
    }
    try {
      const res = await fetch(finalUrl, { method: targetMethod, headers: headersObj, body: (targetMethod !== 'GET' && targetMethod !== 'DELETE') ? JSON.stringify(payload) : undefined });
      const endTime = performance.now();
      const responseData = await res.text();
      return { status: res.status, text: `PKG #${index + 1}: ${res.statusText} [${responseData.substring(0, 100)}]`, time: Math.round(endTime - startTime) };
    } catch (err: any) { return { status: 0, text: `PKG #${index + 1}: ERROR - ${err.message}`, time: 0 }; }
  };

  const runBulk = async () => {
    if (!parsedArray.length) return;
    setTransmissionStatus('running'); setLogs([]); setProgress(0);
    if (strategy === 'sequential') {
      for (let i = 0; i < parsedArray.length; i++) {
        const result = await transmitPacket(parsedArray[i], i);
        setLogs(prev => [result, ...prev]); setProgress(Math.round(((i + 1) / parsedArray.length) * 100));
      }
    } else {
      const promises = parsedArray.map((p, i) => transmitPacket(p, i).then(res => {
        setLogs(prev => [res, ...prev]);
        setProgress(p => Math.min(100, Math.round(p + (100 / parsedArray.length))));
        return res;
      }));
      await Promise.all(promises); setProgress(100);
    }
    setTransmissionStatus('finished');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-fade">
      <div className="glass-panel w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden bg-[#0d1117] border-white/10 shadow-2xl">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#161b22] shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-2xl" style={{ backgroundColor: currentAccent }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-white font-black text-xl tracking-tighter uppercase leading-none">Mass Transmit Engine</h2>
                <div className="toggle-container h-7 flex items-center">
                  <button onClick={() => handleModeToggle('linear')} className={`toggle-item ${factoryMode === 'linear' ? 'active' : ''}`} style={factoryMode === 'linear' ? { color: currentAccent } : {}}>Linear</button>
                  <button onClick={() => handleModeToggle('chaotic')} className={`toggle-item ${factoryMode === 'chaotic' ? 'active' : ''}`} style={factoryMode === 'chaotic' ? { color: currentAccent } : {}}>Chaotic</button>
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full transition-all text-slate-600 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {transmissionStatus === 'idle' ? (
            <div className="flex-1 flex flex-col p-8 gap-6 overflow-hidden min-h-0">
              <div className="flex justify-between items-center shrink-0">
                <div className="toggle-container">
                  <button onClick={() => setViewMode('generator')} className={`toggle-item ${viewMode === 'generator' ? 'active' : ''}`}>Generator</button>
                  <button onClick={() => setViewMode('visual')} className={`toggle-item ${viewMode === 'visual' ? 'active' : ''}`}>Visual</button>
                  <button onClick={() => setViewMode('raw')} className={`toggle-item ${viewMode === 'raw' ? 'active' : ''}`}>Raw Buffer</button>
                </div>
                <div className="flex gap-4 items-center">
                   <div className="toggle-container items-center">
                      <button onClick={() => setStrategy('sequential')} className={`toggle-item ${strategy === 'sequential' ? 'active' : ''}`}>Sequential</button>
                      <button onClick={() => setStrategy('burst')} className={`toggle-item ${strategy === 'burst' ? 'active' : ''}`}>Burst</button>
                   </div>
                   <span className="text-[10px] font-black text-white uppercase tracking-widest">{parsedArray.length} Ready</span>
                </div>
              </div>

              <div className="flex-1 overflow-hidden min-h-0 relative">
                {viewMode === 'generator' && (
                  <div className="h-full animate-reveal overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-full">
                      <div className="lg:col-span-4 flex flex-col gap-4">
                        <div className="glass-card p-6 border-t border-white/5 shadow-xl">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Batch Range</h4>
                            <button 
                              onClick={handleSmartSeed} 
                              title={hasActiveResponse ? "Sync with Last Response Data" : "Seed from URL"} 
                              className={`p-1.5 glass-card transition-all flex items-center gap-2 group ${hasActiveResponse ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                              <span className="text-[8px] font-black uppercase hidden group-hover:inline-block">Sync Seed</span>
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[8px] font-black text-slate-700 uppercase tracking-widest block mb-1">Starting ID</label>
                              <input type="number" value={rangeStart} onChange={e => setRangeStart(parseInt(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-white font-black outline-none focus:border-white/20" />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-slate-700 uppercase tracking-widest block mb-1">Ending ID</label>
                              <input type="number" value={rangeEnd} onChange={e => setRangeEnd(parseInt(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-lg p-3 text-white font-black outline-none focus:border-white/20" />
                            </div>
                          </div>
                          <div className="mt-6 p-4 bg-black/40 rounded-lg border border-white/5">
                            <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest block mb-1.5">Sequence Token</span>
                            <div className="flex items-center gap-3">
                              <code className="px-2 py-1 rounded bg-white/10 text-[10px] font-black text-emerald-400">{"{{n}}"}</code>
                              <p className="text-[10px] text-slate-500 leading-tight">Injects the incrementing ID into your patterns below.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="lg:col-span-8 flex flex-col min-h-0">
                        <div className="glass-card flex-1 p-6 flex flex-col border-t border-white/5 shadow-xl">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Property Matrix</h4>
                          </div>
                          <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar space-y-3">
                            {fieldPatterns.map((fp, i) => (
                              <div key={fp.id} className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center glass-card p-4 hover:border-white/10 transition-all">
                                <div className="lg:col-span-4">
                                  <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest truncate block">{fp.key}</span>
                                </div>
                                <div className="lg:col-span-8">
                                  <input 
                                    type="text" value={fp.pattern} 
                                    onChange={e => { const next = [...fieldPatterns]; next[i].pattern = e.target.value; setFieldPatterns(next); }}
                                    className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-emerald-400 font-mono text-[12px] outline-none focus:border-emerald-500/20"
                                    placeholder="Pattern e.g. {{n}}"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {viewMode === 'raw' && <Editor value={data} onChange={setData} accentColor={currentAccent} />}
                {viewMode === 'visual' && (
                  <div className="h-full glass-card overflow-y-auto p-6 custom-scrollbar space-y-3">
                    {parsedArray.map((item: any, idx: number) => (
                      <div key={idx} className="glass-card p-4 flex items-center justify-between group">
                        <span className="text-[11px] font-black text-slate-600 tracking-tighter w-20 shrink-0 uppercase">#{idx + 1}</span>
                        <code className="text-[12px] text-emerald-400/80 font-mono truncate flex-1">{JSON.stringify(item)}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4 items-center mt-2 shrink-0">
                <div className="flex-1 p-4 glass-card flex items-center gap-6">
                   <div className="flex-1 overflow-hidden">
                      <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest block mb-1">Target Endpoint</span>
                      <div className="text-[11px] text-blue-400 font-mono truncate">{targetUrl}</div>
                   </div>
                   <div className="w-px h-10 bg-white/5"></div>
                   <div>
                      <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest block mb-1">Verb</span>
                      <div className="text-[11px] font-black uppercase" style={{ color: currentAccent }}>{targetMethod}</div>
                   </div>
                </div>
                <button onClick={runBulk} className="px-12 h-16 rounded-xl font-black text-sm uppercase tracking-widest text-white transition-all active:scale-95 shadow-2xl" style={{ backgroundColor: currentAccent }}>IGNITE</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-12 overflow-hidden bg-[#0d1117] animate-fade">
              <div className="mb-12 shrink-0">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black uppercase text-slate-400 tracking-[0.4em]">{transmissionStatus === 'running' ? 'Broadcasting...' : 'Transmission Complete'}</h3>
                  <span className="text-3xl font-black font-mono" style={{ color: currentAccent }}>{progress}%</span>
                </div>
                <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-1">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: currentAccent }}></div>
                </div>
              </div>
              <div className="flex-1 glass-card p-6 overflow-y-auto custom-scrollbar space-y-3">
                {logs.map((log, i) => (
                  <div key={i} className="flex justify-between items-center p-4 glass-card animate-reveal">
                    <div className="flex items-center gap-4">
                       <span className={`text-[10px] font-black px-3 py-1 rounded-md border ${log.status >= 200 && log.status < 300 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>{log.status || 'ERR'}</span>
                       <span className="text-[12px] font-mono text-slate-400 truncate">{log.text}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-600 font-black">{log.time}ms</span>
                  </div>
                ))}
              </div>
              {transmissionStatus === 'finished' && (
                <div className="mt-8 flex gap-4 animate-reveal shrink-0">
                  <button onClick={() => setTransmissionStatus('idle')} className="flex-1 py-4 glass-card text-[10px] font-black uppercase tracking-widest text-slate-300">New Batch</button>
                  <button onClick={onClose} className="flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: currentAccent }}>Close Engine</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkTransmit;