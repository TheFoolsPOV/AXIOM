import React, { useState, useEffect, useMemo } from 'react';
import { ApiRequest, ApiResponse, HttpMethod, KeyValuePair, HistoryItem, ActiveTab, Variable } from './types';
import HeaderManager from './components/HeaderManager';
import Editor from './components/Editor';
import JsonBuilder from './components/JsonBuilder';
import VariableManager from './components/VariableManager';
import ResponseViewer from './components/ResponseViewer';
import BulkTransmit from './components/BulkTransmit';
import CurlImporter from './components/CurlImporter';
import ErrorDiagnosis from './components/ErrorDiagnosis';
import DevAssistant from './components/DevAssistant';

const App: React.FC = () => {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('http://localhost:5223/api/Todo');
  const [headers, setHeaders] = useState<KeyValuePair[]>([
    { id: '1', key: 'Accept', value: 'application/json', enabled: true },
    { id: '2', key: 'Content-Type', value: 'application/json', enabled: true }
  ]);
  const [body, setBody] = useState('{\n  "key": "value"\n}');
  const [builderFields, setBuilderFields] = useState<KeyValuePair[]>([]);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('request');
  const [bodyMode, setBodyMode] = useState<'raw' | 'builder'>('raw');
  const [responseMode, setResponseMode] = useState<'visual' | 'raw'>('visual');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [showBulk, setShowBulk] = useState(false);
  const [showCurlImport, setShowCurlImport] = useState(false);
  const [variables, setVariables] = useState<Variable[]>([]);

  // Global Accent State - synchronized with Engine Modes (Linear/Chaotic)
  const [globalAccent, setGlobalAccent] = useState('#3b82f6');

  const isLocalhost = useMemo(() => {
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('localhost') || lowerUrl.includes('127.0.0.1');
  }, [url]);

  const localPort = useMemo(() => {
    const match = url.match(/:([0-9]+)/);
    return match ? match[1] : '80/443';
  }, [url]);

  // Max ID detection to prevent duplicates in bulk runs
  const maxDetectedId = useMemo(() => {
    if (!response || !response.data) return 0;
    let max = 0;
    const findIds = (obj: any) => {
      if (!obj) return;
      if (Array.isArray(obj)) {
        obj.forEach(findIds);
      } else if (typeof obj === 'object') {
        Object.entries(obj).forEach(([key, val]) => {
          if (key.toLowerCase().includes('id') && typeof val === 'number') {
            max = Math.max(max, val);
          } else if (typeof val === 'object') {
            findIds(val);
          }
        });
      }
    };
    findIds(response.data);
    return max;
  }, [response]);

  // Method specific colors (Accents)
  const methodConfig = useMemo(() => {
    const configs = {
      GET: { hex: '#10b981', text: 'text-emerald-400', label: 'Fetch' },
      POST: { hex: globalAccent, text: 'text-white', label: 'Execute' },
      PUT: { hex: '#f59e0b', text: 'text-amber-400', label: 'Update' },
      PATCH: { hex: '#06b6d4', text: 'text-cyan-400', label: 'Modify' },
      DELETE: { hex: '#f43f5e', text: 'text-rose-400', label: 'Remove' }
    };
    return (configs as any)[method] || configs.POST;
  }, [method, globalAccent]);

  // Sync the CSS variable with the current method's accent color
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', methodConfig.hex);
  }, [methodConfig.hex]);

  // Sync Architect -> Raw
  useEffect(() => {
    if (bodyMode === 'builder' && builderFields.length > 0) {
      const result: Record<string, any> = {};
      builderFields.forEach(f => {
        if (!f.key) return;
        let val: any = f.value;
        const isVariable = typeof val === 'string' && val.includes('{{') && val.includes('}}');
        if (!isVariable) {
          if (f.type === 'number') {
            const num = Number(f.value);
            val = isNaN(num) ? f.value : num;
          } else if (f.type === 'boolean') {
            val = f.value === 'true';
          } else if (f.type === 'null') {
            val = null;
          }
        }
        result[f.key] = val;
      });
      setBody(JSON.stringify(result, null, 2));
    }
  }, [builderFields, bodyMode]);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    const saved = localStorage.getItem('axiom_history_v3');
    if (saved) try { setHistory(JSON.parse(saved)); } catch (e) { console.error(e); }
    const savedVars = localStorage.getItem('axiom_variables');
    if (savedVars) try { setVariables(JSON.parse(savedVars)); } catch (e) { console.error(e); }
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('axiom_variables', JSON.stringify(variables));
  }, [variables]);

  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('axiom_history_v3', JSON.stringify(history));
    }
  }, [history]);

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

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setActiveTab('response');
    const startTime = performance.now();
    try {
      const headerObj: Record<string, string> = {};
      headers.filter(h => h.enabled && h.key && h.value).forEach(h => { headerObj[injectVars(h.key)] = injectVars(h.value); });
      const options: RequestInit = {
        method,
        headers: headerObj,
        body: (method !== 'GET' && method !== 'DELETE') ? injectVars(body) : undefined,
      };
      const res = await fetch(injectVars(url), options);
      const endTime = performance.now();
      let data;
      const contentType = res.headers.get('content-type')?.toLowerCase() || '';
      if (contentType.includes('application/json')) data = await res.json();
      else data = await res.text();
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });
      const result: ApiResponse = { status: res.status, statusText: res.statusText, data, headers: resHeaders, time: Math.round(endTime - startTime), size: JSON.stringify(data).length };
      setResponse(result);
      const newItem: HistoryItem = { id: crypto.randomUUID(), request: { id: crypto.randomUUID(), name: `Req ${new Date().toLocaleTimeString()}`, method, url, headers, body, createdAt: Date.now() }, response: result, timestamp: Date.now() };
      setHistory(prev => [newItem, ...prev].slice(0, 50));
      if (!res.ok) setError(`Status ${res.status}: ${res.statusText}`);
    } catch (err: any) { 
      setError(err.message || 'Transmission failed.'); 
      setActiveTab('response');
    }
    finally { setLoading(false); }
  };

  const hydrateArchitect = (data: any) => {
    if (data === undefined || data === null) return;
    const template = Array.isArray(data) ? data[0] : data;
    setBody(JSON.stringify(template, null, 2));
    if (typeof template !== 'object' || template === null) {
      setBuilderFields([{ id: crypto.randomUUID(), key: 'value', value: String(template), enabled: true, type: typeof template as any }]);
    } else {
      const newFields: KeyValuePair[] = Object.entries(template).map(([key, value]) => {
        let type: 'string' | 'number' | 'boolean' | 'null' = 'string';
        if (value === null) type = 'null';
        else if (typeof value === 'number') type = 'number';
        else if (typeof value === 'boolean') type = 'boolean';
        return { id: crypto.randomUUID(), key, value: (typeof value === 'object' && value !== null) ? JSON.stringify(value) : String(value), enabled: true, type };
      });
      setBuilderFields(newFields);
    }
    setBodyMode('builder');
    setMethod('POST');
    setActiveTab('request');
  };

  const tabs = useMemo(() => {
    const list: ActiveTab[] = ['request', 'response'];
    if (isLocalhost) list.push('debug');
    return list;
  }, [isLocalhost]);

  return (
    <div className="flex h-screen overflow-hidden p-6 gap-6 bg-[#06080c]">
      {showBulk && (
        <BulkTransmit 
          url={url} 
          method={method} 
          headers={headers} 
          variables={variables} 
          builderFields={builderFields} 
          initialN={maxDetectedId}
          onClose={() => setShowBulk(false)} 
          accentColor={methodConfig.hex}
          onModeChange={setGlobalAccent}
        />
      )}
      {showCurlImport && <CurlImporter onImport={(d) => {setMethod(d.method as any); setUrl(d.url); setHeaders(d.headers); setBody(d.body);}} onClose={() => setShowCurlImport(false)} accentColor={methodConfig.hex} />}

      <aside className="w-80 flex flex-col shrink-0 gap-6 animate-fade">
        <div className="glass-panel flex flex-col h-[55%] overflow-hidden rounded-[var(--radius-main)] border-t-2" style={{ borderTopColor: methodConfig.hex }}>
          <div className="p-6 pb-2 flex justify-between items-center">
            <div>
              <h1 className="text-sm font-black tracking-tighter text-white mb-1">AXIOM PRO</h1>
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-rose-500 shadow-[0_0_5px_#f43f5e]'}`}></span>
                <p className="text-[7px] text-slate-600 font-bold uppercase tracking-[0.2em]">{isOnline ? 'Network Online' : 'Offline Mode'}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2 custom-scrollbar">
            {history.map((item) => (
              <button key={item.id} onClick={() => { setMethod(item.request.method); setUrl(item.request.url); setHeaders(item.request.headers); setBody(item.request.body); if (item.response) setResponse(item.response); }} className="w-full text-left p-3 rounded-lg hover:bg-white/[0.03] transition-all border border-transparent hover:border-white/5 group relative overflow-hidden">
                <div className="flex justify-between items-center mb-1 text-[8px] font-black uppercase relative z-10">
                  <span className={item.request.method === 'GET' ? 'text-emerald-400' : 'text-blue-400'}>{item.request.method}</span>
                  <span className={item.response && item.response.status < 400 ? 'text-emerald-500/60' : 'text-rose-500/60'}>{item.response?.status || 'ERR'}</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate font-medium relative z-10">{item.request.url}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="glass-panel h-[45%] rounded-[var(--radius-main)] p-6 overflow-hidden border-t-2" style={{ borderTopColor: methodConfig.hex }}>
          <VariableManager variables={variables} setVariables={setVariables} url={url} headers={headers} body={body} accentColor={methodConfig.hex} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 animate-fade">
        <div className="glass-panel p-2 flex items-center gap-2 mb-6 rounded-[var(--radius-main)] transition-all border-l-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)]" style={{ borderLeftColor: methodConfig.hex }}>
          <select value={method} onChange={(e) => setMethod(e.target.value as HttpMethod)} className={`bg-white/5 border-none h-11 px-4 text-[11px] font-black tracking-widest cursor-pointer rounded-lg outline-none ${methodConfig.text}`}>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m} className="bg-slate-900 text-white">{m}</option>)}
          </select>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="h-11 px-4 flex-1 text-[13px] font-medium text-slate-200 bg-white/[0.02] outline-none rounded-lg focus:bg-white/[0.05] transition-all" placeholder="http://api..." />
          <div className="flex gap-2">
            <button onClick={() => setShowBulk(true)} title="Batch Transmission Engine" className="h-11 w-11 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white border border-white/5 active:scale-95 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
            </button>
            <button onClick={handleSend} disabled={loading} className="h-11 px-10 active:scale-95 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest text-white rounded-lg transition-all shadow-2xl min-w-[140px]" style={{ backgroundColor: methodConfig.hex }}>
              {loading ? "..." : methodConfig.label}
            </button>
          </div>
        </div>

        <div className="flex px-4 mb-2 justify-between items-center">
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`tab-btn transition-all duration-300 ${activeTab === tab ? 'active' : ''}`} 
              >
                {tab === 'debug' ? (
                   <span className="flex items-center gap-2" style={{ color: activeTab === 'debug' ? methodConfig.hex : '#9333ea' }}>
                     <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeTab === 'debug' ? '' : 'bg-purple-500'}`} style={activeTab === 'debug' ? { backgroundColor: methodConfig.hex } : {}}></span>
                     C# Helper
                   </span>
                ) : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'request' && (
            <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6 p-2 overflow-y-auto custom-scrollbar pb-20">
              <div className="space-y-6 flex flex-col">
                <div className="glass-card p-6 flex flex-col overflow-hidden border-t border-white/5 h-fit">
                  <HeaderManager headers={headers} setHeaders={setHeaders} accentColor={methodConfig.hex} />
                </div>
              </div>
              <div className="flex flex-col gap-4 overflow-hidden">
                <div className="flex justify-between items-center px-4">
                  <div className="flex bg-white/5 p-1 rounded-md">
                    <button onClick={() => setBodyMode('raw')} className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${bodyMode === 'raw' ? 'bg-white/10' : 'text-slate-600'}`} style={bodyMode === 'raw' ? { color: methodConfig.hex } : {}}>Raw</button>
                    <button onClick={() => setBodyMode('builder')} className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${bodyMode === 'builder' ? 'bg-white/10' : 'text-slate-600'}`} style={bodyMode === 'builder' ? { color: methodConfig.hex } : {}}>Architect</button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {bodyMode === 'raw' ? <Editor value={body} onChange={setBody} variables={variables} accentColor={methodConfig.hex} /> : <div className="h-full glass-card p-4 overflow-hidden border-t border-white/5"><JsonBuilder fields={builderFields} setFields={setBuilderFields} variables={variables} accentColor={methodConfig.hex} onInteraction={() => method === 'GET' && setMethod('POST')} /></div>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'debug' && isLocalhost && (
            <div className="h-full p-2 overflow-y-auto custom-scrollbar">
              <div className="max-w-4xl mx-auto py-4">
                <DevAssistant port={localPort} accentColor={methodConfig.hex} />
              </div>
            </div>
          )}

          {activeTab === 'response' && (
            <div className="h-full flex flex-col gap-4 p-2">
              <div className="grid grid-cols-3 gap-4">
                <div className="glass-card p-4 border-t border-white/5">
                  <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-1 block">Status</span>
                  <span className={`font-mono text-xl font-bold ${response?.status && response.status < 400 ? 'text-emerald-400' : 'text-rose-400'}`}>{response?.status || 'FAIL'}</span>
                </div>
                <div className="glass-card p-4 border-t border-white/5">
                  <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-1 block">Time</span>
                  <span className="font-mono text-xl font-bold text-slate-200">{response?.time || '--'}ms</span>
                </div>
                <div className="glass-card p-4 border-t border-white/5">
                  <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-1 block">Size</span>
                  <span className="font-mono text-xl font-bold text-slate-200">{response?.size ? (response.size / 1024).toFixed(2) : '0.00'}KB</span>
                </div>
              </div>
              <div className="flex-1 min-h-0 flex gap-4 overflow-hidden relative">
                <div className="flex-[2] flex flex-col gap-2 overflow-hidden relative">
                  <div className="flex justify-between items-center mb-2 px-2">
                    <div className="flex bg-white/5 p-1 rounded-md self-start items-center gap-1">
                      <button onClick={() => setResponseMode('visual')} className={`px-4 py-1.5 rounded text-[8px] font-bold uppercase transition-all ${responseMode === 'visual' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-600 hover:text-slate-400'}`}>Visual</button>
                      <button onClick={() => setResponseMode('raw')} className={`px-4 py-1.5 rounded text-[8px] font-bold uppercase transition-all ${responseMode === 'raw' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-600 hover:text-slate-400'}`}>Raw</button>
                    </div>
                    {response?.data && (
                      <button 
                        onClick={() => hydrateArchitect(response.data)}
                        className="px-5 py-2.5 bg-[#10b981] hover:bg-emerald-400 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center gap-2 border border-emerald-400/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                        Hydrate Architect
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden relative">
                    {error && !response ? <ErrorDiagnosis error={error} method={method} url={url} headers={headers} body={body} accentColor={methodConfig.hex} responseData={response?.data} /> : (
                      responseMode === 'raw' ? <Editor value={JSON.stringify(response?.data, null, 2)} readOnly variables={variables} accentColor={methodConfig.hex} /> : <div className="h-full glass-card p-4 overflow-hidden border-t border-white/5"><ResponseViewer data={response?.data} accentColor={methodConfig.hex} /></div>
                    )}
                  </div>
                </div>
                <div className="flex-1 glass-card p-8 flex flex-col overflow-hidden border-t border-white/5 bg-white/[0.01]">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8 border-b border-white/5 pb-3">Response Headers</h3>
                  <div className="flex-1 overflow-y-auto space-y-5 pr-3 custom-scrollbar">
                    {response && Object.entries(response.headers).map(([k,v]) => (
                      <div key={k} className="group relative">
                        <div className="text-[7px] text-slate-600 font-black uppercase tracking-widest mb-1.5 flex items-center gap-2">
                           <div className="w-1 h-1 rounded-full bg-white/20"></div>
                           {k}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono break-all bg-white/[0.02] p-3 rounded-xl border border-transparent group-hover:border-white/10 group-hover:bg-white/[0.04] transition-all shadow-inner">
                          {v}
                        </div>
                      </div>
                    ))}
                    {!response && (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                         <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                         <span className="text-[9px] font-black uppercase tracking-widest">Awaiting Transaction...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;