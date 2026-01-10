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
  accentColor: string; // This is the initial accent from App
  onModeChange: (color: string) => void;
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
  onModeChange
}) => {
  const [targetUrl] = useState(initialUrl);
  const [targetMethod, setTargetMethod] = useState(initialMethod);
  const [strategy, setStrategy] = useState<TransmissionStrategy>('sequential');

  const [data, setData] = useState('[]');
  const [transmissionStatus, setTransmissionStatus] = useState<'idle' | 'running' | 'finished'>('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<{ status: number; text: string; time: number }[]>([]);
  const [viewMode, setViewMode] = useState<'generator' | 'visual' | 'raw'>('generator');
  
  // Factory mode state.
  const [factoryMode, setFactoryMode] = useState<FactoryMode>(globalAccentColor === '#a855f7' ? 'chaotic' : 'linear');
  
  const [rangeStart, setRangeStart] = useState(initialN + 1);
  const [rangeEnd, setRangeEnd] = useState(initialN + 10);
  const [fieldPatterns, setFieldPatterns] = useState<FieldPattern[]>([]);

  // Local accent color calculation based on the current targetMethod
  const currentAccent = useMemo(() => {
    const configs: Record<string, string> = {
      GET: '#10b981', // emerald
      POST: globalAccentColor, // Respects linear/chaotic choice from parent for POST
      PUT: '#f59e0b', // amber
      PATCH: '#06b6d4', // cyan
      DELETE: '#f43f5e' // rose
    };
    return configs[targetMethod] || configs.POST;
  }, [targetMethod, globalAccentColor]);

  useEffect(() => {
    const initial = builderFields.map(f => ({
      id: f.id,
      key: f.key,
      pattern: f.key.toLowerCase().includes('id') ? '{{n}}' : (f.key.toLowerCase().includes('title') || f.key.toLowerCase().includes('name')) ? `Unit-{{n}}` : (f.value || ''),
      type: f.type || 'string'
    }));
    setFieldPatterns(initial);
  }, [builderFields]);

  const generateRandom = (type: string) => {
    if (type === 'number') return Math.floor(Math.random() * 100000);
    if (type === 'boolean') return Math.random() > 0.5;
    return Math.random().toString(36).substring(2, 9).toUpperCase();
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
        if (factoryMode === 'linear') {
          val = fp.pattern.replace(/{{n}}/g, i.toString());
        } else {
          val = fp.pattern.replace(/{{n}}/g, generateRandom(fp.type).toString());
          if (fp.pattern === '{{n}}') val = generateRandom(fp.type);
        }
        
        if (fp.type === 'number') val = Number(val) || 0;
        else if (fp.type === 'boolean') val = String(val).toLowerCase() === 'true';
        else if (fp.type === 'null') val = null;
        
        item[fp.key] = val;
      });
      newBatch.push(item);
    }
    setData(JSON.stringify(newBatch, null, 2));
  }, [rangeStart, rangeEnd, fieldPatterns, factoryMode]);

  useEffect(() => {
    generateBatch();
  }, [generateBatch]);

  const handleModeToggle = (mode: FactoryMode) => {
    setFactoryMode(mode);
    if (mode === 'chaotic') {
      onModeChange('#a855f7');
    } else {
      onModeChange('#3b82f6');
    }
  };

  const parsedArray = useMemo(() => {
    try {
      const p = JSON.parse(data);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }, [data]);

  const injectVars = (str: string) => {
    let result = str;
    variables.forEach(v => {
      if (v.key) {
        const regex = new RegExp(`{{${v.key}}}`, 'g');
        result = result.replace(regex, v.value);
      }
    });
    return result;
  };

  const transmitPacket = async (payload: any, index: number) => {
    const startTime = performance.now();
    const headersObj: Record<string, string> = {};
    headers.filter(h => h.enabled && h.key && h.value).forEach(h => { 
      headersObj[injectVars(h.key)] = injectVars(h.value); 
    });

    try {
      const res = await fetch(injectVars(targetUrl), {
        method: targetMethod,
        headers: headersObj,
        body: JSON.stringify(payload)
      });
      const endTime = performance.now();
      return { status: res.status, text: `PKG #${index + 1}: ${res.statusText}`, time: Math.round(endTime - startTime) };
    } catch (err: any) {
      return { status: 0, text: `PKG #${index + 1}: ERROR - ${err.message}`, time: 0 };
    }
  };

  const runBulk = async () => {
    if (!parsedArray || parsedArray.length === 0) return;

    setTransmissionStatus('running');
    setLogs([]);
    setProgress(0);

    if (strategy === 'sequential') {
      for (let i = 0; i < parsedArray.length; i++) {
        const result = await transmitPacket(parsedArray[i], i);
        setLogs(prev => [result, ...prev]);
        setProgress(Math.round(((i + 1) / parsedArray.length) * 100));
      }
    } else {
      const promises = parsedArray.map((p, i) => transmitPacket(p, i).then(res => {
        setLogs(prev => [res, ...prev]);
        setProgress(p => {
          const newP = p + (100 / parsedArray.length);
          return newP > 100 ? 100 : Math.round(newP);
        });
        return res;
      }));
      await Promise.all(promises);
      setProgress(100);
    }
    setTransmissionStatus('finished');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/98 backdrop-blur-3xl animate-fade">
      <div className="glass-panel w-full max-w-6xl h-[95vh] rounded-[3rem] flex flex-col overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] border-white/10 bg-[#0d1117]">
        {/* Header Section */}
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#161b22]">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl transition-all hover:rotate-6" style={{ backgroundColor: currentAccent }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-white font-black text-3xl tracking-tighter uppercase leading-none">Mass Transmit Engine</h2>
                <div className="flex bg-black/40 p-1 rounded-md border border-white/5 gap-1">
                  <button onClick={() => handleModeToggle('linear')} className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all ${factoryMode === 'linear' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-600'}`}>Linear</button>
                  <button onClick={() => handleModeToggle('chaotic')} className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all ${factoryMode === 'chaotic' ? 'bg-purple-500/20 text-purple-400 shadow-sm' : 'text-slate-600'}`}>Chaotic</button>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.4em] mt-1">Industrial Bulk Transmission Hub</p>
            </div>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-white/5 rounded-full transition-all active:scale-90 text-slate-600 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {transmissionStatus === 'idle' ? (
            <div className="flex-1 flex flex-col p-8 gap-6 overflow-hidden min-h-0">
              <div className="flex justify-between items-center bg-black/40 p-1.5 rounded-[2.5rem] border border-white/5 shrink-0">
                <div className="flex gap-1">
                  <button onClick={() => setViewMode('generator')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'generator' ? 'bg-white/10 text-white shadow-xl' : 'text-slate-600 hover:text-slate-400'}`}>Sequence Factory</button>
                  <button onClick={() => setViewMode('visual')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'visual' ? 'bg-white/10 text-white shadow-xl' : 'text-slate-600 hover:text-slate-400'}`}>Visual Batch</button>
                  <button onClick={() => setViewMode('raw')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'raw' ? 'bg-white/10 text-white shadow-xl' : 'text-slate-600 hover:text-slate-400'}`}>Raw Buffer</button>
                </div>
                <div className="px-6 flex items-center gap-6">
                   <div className="flex bg-black/60 p-1 rounded-xl border border-white/5 items-center gap-1">
                      <button onClick={() => setStrategy('sequential')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${strategy === 'sequential' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-600'}`}>Sequential</button>
                      <button onClick={() => setStrategy('burst')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${strategy === 'burst' ? 'bg-rose-500/80 text-white shadow-sm' : 'text-slate-600'}`}>Burst</button>
                   </div>
                   <div className="w-px h-8 bg-white/10"></div>
                   <span className="text-[10px] font-black text-white uppercase tracking-widest">{parsedArray.length} Packets Prepared</span>
                </div>
              </div>

              <div className="flex-1 overflow-hidden min-h-0">
                {viewMode === 'generator' && (
                  <div className="h-full flex flex-col gap-6 animate-reveal overflow-hidden">
                    <div className="grid grid-cols-12 gap-6 h-full overflow-hidden">
                      <div className="col-span-4 flex flex-col gap-6 h-full overflow-hidden">
                        <div className="glass-card p-6 border border-white/5 bg-[#161b22] rounded-[2rem] shrink-0">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Range Parameters</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[8px] font-black text-slate-700 uppercase tracking-widest block mb-1">Sequence Start</label>
                              <input type="number" value={rangeStart} onChange={e => setRangeStart(parseInt(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white font-black text-xl outline-none focus:border-white/20 transition-all shadow-inner" />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-slate-700 uppercase tracking-widest block mb-1">Sequence End</label>
                              <input type="number" value={rangeEnd} onChange={e => setRangeEnd(parseInt(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-white font-black text-xl outline-none focus:border-white/20 transition-all shadow-inner" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="glass-card p-8 bg-black/60 border border-white/10 flex flex-col justify-center items-center text-center rounded-[2.5rem] flex-1 shadow-2xl relative overflow-hidden min-h-0">
                            <div className="w-24 h-24 rounded-full border-4 border-dashed border-white/10 flex items-center justify-center mb-6 relative" style={{ borderColor: `${currentAccent}44` }}>
                               <div className="absolute inset-0 rounded-full animate-pulse opacity-5" style={{ backgroundColor: currentAccent }}></div>
                               <span className="text-4xl font-black relative z-10 text-white">{parsedArray.length}</span>
                            </div>
                            <h3 className="text-white font-black text-xl tracking-tight uppercase mb-2">Unit Projection</h3>
                            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest leading-relaxed">
                              Factory mode: <span className="font-black uppercase" style={{ color: currentAccent }}>{factoryMode}</span>
                            </p>
                        </div>
                      </div>

                      <div className="col-span-8 flex flex-col h-full overflow-hidden">
                        <div className="glass-card flex-1 p-8 border border-white/5 bg-[#161b22] flex flex-col overflow-hidden rounded-[2.5rem]">
                          <div className="flex justify-between items-center mb-6 shrink-0">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Property Rules</h4>
                            <span className="text-[9px] font-black text-slate-700 uppercase bg-white/5 px-3 py-1 rounded-full border border-white/5">Inject <code className="text-blue-400 font-mono">{"{{n}}"}</code></span>
                          </div>
                          <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar space-y-4 pb-4 min-h-0">
                            {fieldPatterns.map((fp, i) => (
                              <div key={fp.id} className="grid grid-cols-12 gap-6 items-center bg-black/40 p-4 rounded-[1.5rem] border border-white/[0.05] hover:border-white/10 transition-all group">
                                <div className="col-span-4">
                                  <span className="text-[12px] font-black text-slate-300 uppercase tracking-widest truncate block">{fp.key}</span>
                                  <span className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.3em] mt-1">{fp.type}</span>
                                </div>
                                <div className="col-span-8">
                                  <input 
                                    type="text" 
                                    value={fp.pattern} 
                                    onChange={e => {
                                      const next = [...fieldPatterns];
                                      next[i].pattern = e.target.value;
                                      setFieldPatterns(next);
                                    }}
                                    className="w-full bg-black/60 border border-white/10 rounded-xl px-5 py-3 text-emerald-400 font-mono text-[13px] outline-none focus:border-emerald-500/40 transition-all shadow-inner"
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
                  <div className="h-full bg-black/60 rounded-[2.5rem] border border-white/5 overflow-y-auto p-8 custom-scrollbar space-y-4 shadow-inner">
                    {parsedArray.map((item: any, idx: number) => (
                      <div key={idx} className="bg-[#161b22] border border-white/[0.03] p-6 rounded-[2rem] flex items-center justify-between group hover:border-white/10 transition-all animate-reveal">
                        <div className="flex items-center gap-8">
                          <span className="text-[12px] font-black text-slate-600 tracking-tighter w-24 uppercase">Unit-{(idx + 1).toString().padStart(4, '0')}</span>
                          <div className="w-px h-10 bg-white/5"></div>
                          <code className="text-[13px] text-emerald-400/90 font-mono truncate max-w-4xl">{JSON.stringify(item)}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="flex items-center gap-6 mt-2 shrink-0">
                <div className="flex-1 p-5 bg-[#161b22] border border-white/5 rounded-[2.5rem] flex items-center gap-6 shadow-inner">
                   <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.5em] mb-1.5 ml-2">Engine Destination</span>
                      <div className="bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-[12px] text-blue-400 font-mono truncate shadow-inner">
                        {targetUrl}
                      </div>
                   </div>
                   <div className="w-px h-10 bg-white/5"></div>
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.5em] mb-1.5 ml-1">Protocol Verb</span>
                      <select 
                        value={targetMethod} 
                        onChange={(e) => setTargetMethod(e.target.value as HttpMethod)}
                        className="bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-[12px] font-black outline-none cursor-pointer min-w-[100px] transition-colors shadow-inner"
                        style={{ color: currentAccent, borderColor: `${currentAccent}44` }}
                      >
                        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m} className="bg-[#161b22]">{m}</option>)}
                      </select>
                   </div>
                </div>
                <button
                  onClick={runBulk}
                  className="px-16 py-8 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.6em] text-white transition-all active:scale-95 shadow-2xl flex items-center gap-6 group hover:brightness-110"
                  style={{ backgroundColor: currentAccent }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-y-1 transition-transform"><path d="M12 2v10"/><path d="m16 8-4 4-4-4"/><path d="M4 20h16"/></svg>
                  IGNITE
                </button>
              </div>
            </div>
          ) : (
            /* Running / Finished View */
            <div className="flex-1 flex flex-col p-16 overflow-hidden bg-[#0d1117] animate-fade">
              <div className="mb-16">
                <div className="flex justify-between text-[14px] font-black uppercase text-slate-400 mb-8 tracking-[0.6em] items-center">
                  <span className="flex items-center gap-6">
                    {transmissionStatus === 'running' ? (
                      <>
                        <span className="w-6 h-6 rounded-full animate-ping" style={{ backgroundColor: currentAccent }}></span>
                        Shipping Packets via {strategy} hub...
                      </>
                    ) : (
                      <div className="flex items-center gap-4 text-emerald-400 animate-reveal">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        </div>
                        Transmission Success
                      </div>
                    )}
                  </span>
                  <span className="text-4xl font-black font-mono" style={{ color: transmissionStatus === 'finished' ? '#10b981' : currentAccent }}>
                    {progress}%
                  </span>
                </div>
                <div className="h-6 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-1.5 shadow-inner">
                  <div 
                    className="h-full transition-all duration-300 shadow-[0_0_50px_rgba(255,255,255,0.2)] rounded-full" 
                    style={{ width: `${progress}%`, backgroundColor: transmissionStatus === 'finished' ? '#10b981' : currentAccent }}
                  ></div>
                </div>
              </div>
              
              <div className="flex-1 bg-[#0a0d14] rounded-[4rem] p-12 overflow-y-auto custom-scrollbar space-y-4 border border-white/5 shadow-2xl">
                {logs.map((log, i) => (
                  <div key={i} className="flex justify-between items-center p-6 bg-white/[0.01] border border-white/[0.04] rounded-[2rem] animate-reveal group">
                    <div className="flex items-center gap-6">
                       <span className={`text-[12px] font-black px-5 py-2.5 rounded-2xl border ${log.status >= 200 && log.status < 300 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                         {log.status === 0 ? 'FAULT' : log.status}
                       </span>
                       <span className="text-[14px] font-mono text-slate-400 font-bold uppercase tracking-tight">{log.text}</span>
                    </div>
                    <span className="text-[12px] font-mono text-slate-600 font-black">{log.time}ms</span>
                  </div>
                ))}
              </div>
              
              {transmissionStatus === 'finished' && (
                <div className="mt-12 flex gap-6 animate-reveal">
                  <button onClick={() => setTransmissionStatus('idle')} className="flex-1 py-8 bg-white/5 hover:bg-white/10 rounded-[3rem] text-sm font-black uppercase tracking-[0.8em] text-slate-200 transition-all border border-white/10 shadow-xl active:scale-95">
                    Prepare New shipment
                  </button>
                  <button onClick={onClose} className="flex-1 py-8 rounded-[3rem] text-sm font-black uppercase tracking-[0.8em] text-white transition-all shadow-2xl active:scale-95" style={{ backgroundColor: currentAccent }}>
                    Close hub
                  </button>
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
