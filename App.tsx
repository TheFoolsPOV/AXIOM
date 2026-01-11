
import React, { useState, useEffect, useMemo } from 'react';
import { ApiRequest, ApiResponse, HttpMethod, KeyValuePair, HistoryItem, ActiveTab, Variable, EnvironmentProfile, generateId } from './types';
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
    { id: generateId(), key: 'Accept', value: 'application/json', enabled: true },
    { id: generateId(), key: 'Content-Type', value: 'application/json', enabled: true }
  ]);
  const [body, setBody] = useState('{\n  "key": "value"\n}');
  const [builderFields, setBuilderFields] = useState<KeyValuePair[]>([]);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [library, setLibrary] = useState<ApiRequest[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('request');
  const [sidebarTab, setSidebarTab] = useState<'recent' | 'library'>('recent');
  const [bodyMode, setBodyMode] = useState<'raw' | 'builder'>('raw');
  const [responseMode, setResponseMode] = useState<'visual' | 'raw'>('visual');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showBulk, setShowBulk] = useState(false);
  const [showCurlImport, setShowCurlImport] = useState(false);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [profiles, setProfiles] = useState<EnvironmentProfile[]>([]);

  const [globalAccent, setGlobalAccent] = useState('#3b82f6');

  const isLocalhost = useMemo(() => {
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('localhost') || lowerUrl.includes('127.0.0.1');
  }, [url]);

  const localPort = useMemo(() => {
    const match = url.match(/:([0-9]+)/);
    return match ? match[1] : '80/443';
  }, [url]);

  const maxDetectedId = useMemo(() => {
    if (!response || !response.data) return 0;
    let max = 0;
    const findIds = (obj: any) => {
      if (!obj) return;
      if (Array.isArray(obj)) obj.forEach(findIds);
      else if (typeof obj === 'object') {
        Object.entries(obj).forEach(([key, val]) => {
          if (key.toLowerCase().includes('id') && typeof val === 'number') max = Math.max(max, val);
          else if (typeof val === 'object') findIds(val);
        });
      }
    };
    findIds(response.data);
    return max;
  }, [response]);

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

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', methodConfig.hex);
  }, [methodConfig.hex]);

  useEffect(() => {
    if (bodyMode === 'builder' && builderFields.length > 0) {
      const result: Record<string, any> = {};
      builderFields.forEach(f => {
        if (!f.key) return;
        let val: any = f.value;
        if (!(typeof val === 'string' && val.includes('{{'))) {
          if (f.type === 'number') val = Number(f.value);
          else if (f.type === 'boolean') val = f.value === 'true';
          else if (f.type === 'null') val = null;
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
    
    const savedHistory = localStorage.getItem('axiom_history_v3');
    if (savedHistory) try { setHistory(JSON.parse(savedHistory)); } catch (e) {}
    
    const savedLibrary = localStorage.getItem('axiom_library');
    if (savedLibrary) try { setLibrary(JSON.parse(savedLibrary)); } catch (e) {}
    
    const savedVars = localStorage.getItem('axiom_variables');
    if (savedVars) try { setVariables(JSON.parse(savedVars)); } catch (e) {}

    const savedProfiles = localStorage.getItem('axiom_profiles');
    if (savedProfiles) try { setProfiles(JSON.parse(savedProfiles)); } catch (e) {}
    
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  useEffect(() => { localStorage.setItem('axiom_variables', JSON.stringify(variables)); }, [variables]);
  useEffect(() => { localStorage.setItem('axiom_profiles', JSON.stringify(profiles)); }, [profiles]);
  useEffect(() => { if (history.length >= 0) localStorage.setItem('axiom_history_v3', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('axiom_library', JSON.stringify(library)); }, [library]);

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
      
      if (contentType.includes('json')) {
        data = await res.json();
      } else {
        const rawText = await res.text();
        if (rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
          try { data = JSON.parse(rawText); } catch (e) { data = rawText; }
        } else { data = rawText; }
      }

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });
      const result: ApiResponse = { status: res.status, statusText: res.statusText, data, headers: resHeaders, time: Math.round(endTime - startTime), size: JSON.stringify(data).length };
      setResponse(result);
      const newItem: HistoryItem = { id: generateId(), request: { id: generateId(), name: `Req ${new Date().toLocaleTimeString()}`, method, url, headers: JSON.parse(JSON.stringify(headers)), body, createdAt: Date.now() }, response: result, timestamp: Date.now() };
      setHistory(prev => [newItem, ...prev].slice(0, 50));
      if (!res.ok) setError(`Status ${res.status}: ${res.statusText}`);
    } catch (err: any) { 
      setError(err.message || 'Transmission failed.'); 
      setActiveTab('response');
    }
    finally { setLoading(false); }
  };

  const saveToLibrary = () => {
    const name = prompt("Enter a name for this request:", `Endpoint ${new Date().toLocaleTimeString()}`);
    if (name === null) return;
    const finalName = name.trim() || `Saved Request ${library.length + 1}`;
    const req: ApiRequest = { id: generateId(), name: finalName, method, url, headers: JSON.parse(JSON.stringify(headers)), body, createdAt: Date.now() };
    setLibrary(prev => [req, ...prev]);
    setSidebarTab('library');
  };

  const loadFromLibrary = (req: ApiRequest) => {
    setMethod(req.method);
    setUrl(req.url);
    setHeaders(JSON.parse(JSON.stringify(req.headers)));
    setBody(req.body);
    setActiveTab('request');
  };

  const deleteFromLibrary = (id: string) => {
    if (confirm("Delete this saved request?")) setLibrary(prev => prev.filter(r => r.id !== id));
  };

  const handleClearHistory = () => {
    if (confirm('Wipe transmission history?')) {
      setHistory([]);
      // State update will trigger persistence via useEffect
    }
  };

  const hydrateArchitect = (data: any) => {
    if (!data) return;
    const template = Array.isArray(data) ? data[0] : data;
    setBody(JSON.stringify(template, null, 2));
    if (typeof template === 'object' && template !== null) {
      setBuilderFields(Object.entries(template).map(([key, value]) => ({
        id: generateId(), key, value: String(value), enabled: true, 
        type: value === null ? 'null' : typeof value as any
      })));
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
        <BulkTransmit url={url} method={method} headers={headers} variables={variables} builderFields={builderFields} initialN={maxDetectedId} onClose={() => setShowBulk(false)} accentColor={methodConfig.hex} onModeChange={setGlobalAccent} />
      )}
      {showCurlImport && <CurlImporter onImport={(d) => {setMethod(d.method as any); setUrl(d.url); setHeaders(d.headers); setBody(d.body);}} onClose={() => setShowCurlImport(false)} accentColor={methodConfig.hex} />}

      <aside className="w-80 flex flex-col shrink-0 gap-6 animate-fade overflow-hidden">
        <div className="glass-panel flex flex-col flex-[1.2] min-h-0 overflow-hidden rounded-[var(--radius-main)] border-t-2" style={{ borderTopColor: methodConfig.hex }}>
          <div className="p-6 pb-2 shrink-0">
             <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-sm font-black tracking-tighter text-white mb-1">AXIOM PRO</h1>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-rose-500 shadow-[0_0_5px_#f43f5e]'}`}></span>
                    <p className="text-[7px] text-slate-500 font-bold uppercase tracking-[0.2em]">{isOnline ? 'Online' : 'Offline'}</p>
                  </div>
                </div>
                {sidebarTab === 'recent' && history.length > 0 && (
                  <button onClick={handleClearHistory} className="text-[9px] font-black uppercase text-slate-400 hover:text-rose-500 transition-colors">Clear</button>
                )}
             </div>
             <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                <button onClick={() => setSidebarTab('recent')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'recent' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}>Recent</button>
                <button onClick={() => setSidebarTab('library')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'library' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}>Library</button>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2 custom-scrollbar">
            {sidebarTab === 'recent' ? (
              history.map((item) => (
                <button key={item.id} onClick={() => { setMethod(item.request.method); setUrl(item.request.url); setHeaders(JSON.parse(JSON.stringify(item.request.headers))); setBody(item.request.body); if (item.response) setResponse(item.response); }} className="w-full text-left p-3 rounded-lg hover:bg-white/[0.03] transition-all border border-transparent hover:border-white/5 group relative">
                  <div className="flex justify-between items-center mb-1 text-[8px] font-black uppercase">
                    <span className={item.request.method === 'GET' ? 'text-emerald-400' : 'text-blue-400'}>{item.request.method}</span>
                    <span className={item.response?.status && item.response.status < 400 ? 'text-emerald-500/60' : 'text-rose-500/60'}>{item.response?.status || 'ERR'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate font-medium">{item.request.url}</div>
                </button>
              ))
            ) : (
              library.map((req) => (
                <div key={req.id} className="w-full flex items-center gap-2 group p-1 transition-all animate-reveal">
                  <button onClick={() => loadFromLibrary(req)} className="flex-1 text-left p-3 rounded-lg hover:bg-white/[0.03] transition-all border border-transparent hover:border-white/5 overflow-hidden">
                    <div className="text-[10px] font-black text-white uppercase tracking-tight truncate">{req.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[7px] font-black uppercase ${req.method === 'GET' ? 'text-emerald-500' : 'text-blue-500'}`}>{req.method}</span>
                      <span className="text-[7px] text-slate-500 truncate">{req.url}</span>
                    </div>
                  </button>
                  <button onClick={() => deleteFromLibrary(req.id)} className="p-2 opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-all text-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                  </button>
                </div>
              ))
            )}
            {(sidebarTab === 'recent' ? history.length : library.length) === 0 && (
              <div className="py-20 flex flex-col items-center justify-center opacity-30 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] mt-4">
                  {sidebarTab === 'recent' ? 'History Empty' : 'Library Empty'}
                </p>
                {sidebarTab === 'library' && (
                   <p className="text-[7px] text-slate-600 mt-2 uppercase tracking-widest font-bold">Use the floppy icon above to save</p>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="glass-panel flex-1 min-h-0 rounded-[var(--radius-main)] p-6 overflow-hidden border-t-2" style={{ borderTopColor: methodConfig.hex }}>
          <VariableManager variables={variables} setVariables={setVariables} url={url} headers={headers} body={body} accentColor={methodConfig.hex} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 animate-fade overflow-hidden">
        <div className="glass-panel p-2 flex items-center gap-2 mb-6 rounded-[var(--radius-main)] border-l-4 shadow-2xl shrink-0" style={{ borderLeftColor: methodConfig.hex }}>
          <select value={method} onChange={(e) => setMethod(e.target.value as HttpMethod)} className={`bg-white/5 border-none h-11 px-4 text-[11px] font-black tracking-widest cursor-pointer rounded-lg outline-none ${methodConfig.text}`}>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m} className="bg-slate-900 text-white">{m}</option>)}
          </select>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="h-11 px-4 flex-1 text-[13px] font-medium text-slate-200 bg-white/[0.02] outline-none rounded-lg focus:bg-white/[0.05] transition-all" placeholder="http://api..." />
          <div className="flex gap-2">
            <button onClick={saveToLibrary} title="Save to Library" className="h-11 w-11 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-emerald-400 border border-white/5 active:scale-95 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            </button>
            <button onClick={() => setShowBulk(true)} title="Bulk Transmit" className="h-11 w-11 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white border border-white/5 active:scale-95 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
            </button>
            <button onClick={handleSend} disabled={loading} className="h-11 px-10 active:scale-95 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest text-white rounded-lg min-w-[140px] shadow-2xl" style={{ backgroundColor: methodConfig.hex }}>
              {loading ? "..." : methodConfig.label}
            </button>
          </div>
        </div>

        <div className="flex px-4 mb-2 justify-between items-center shrink-0">
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`tab-btn transition-all duration-300 ${activeTab === tab ? 'active' : ''}`}>{tab}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'request' && (
            <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6 p-2 overflow-y-auto custom-scrollbar pb-20">
              <div className="glass-card p-6 flex flex-col min-h-[300px] border-t border-white/5"><HeaderManager headers={headers} setHeaders={setHeaders} accentColor={methodConfig.hex} /></div>
              <div className="flex flex-col gap-4 overflow-hidden min-h-[400px]">
                <div className="flex justify-between px-4 shrink-0">
                  <div className="flex bg-white/5 p-1 rounded-md">
                    <button onClick={() => setBodyMode('raw')} className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase ${bodyMode === 'raw' ? 'bg-white/10' : 'text-slate-600'}`} style={bodyMode === 'raw' ? { color: methodConfig.hex } : {}}>Raw</button>
                    <button onClick={() => setBodyMode('builder')} className={`px-4 py-1.5 rounded text-[10px] font-bold uppercase ${bodyMode === 'builder' ? 'bg-white/10' : 'text-slate-600'}`} style={bodyMode === 'builder' ? { color: methodConfig.hex } : {}}>Architect</button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {bodyMode === 'raw' ? <Editor value={body} onChange={setBody} variables={variables} accentColor={methodConfig.hex} /> : <div className="h-full glass-card p-4 border-t border-white/5"><JsonBuilder fields={builderFields} setFields={setBuilderFields} variables={variables} accentColor={methodConfig.hex} onInteraction={() => method === 'GET' && setMethod('POST')} /></div>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'debug' && isLocalhost && (
            <div className="h-full p-2 overflow-y-auto custom-scrollbar"><div className="max-w-4xl mx-auto py-4"><DevAssistant port={localPort} accentColor={methodConfig.hex} /></div></div>
          )}

          {activeTab === 'response' && (
            <div className="h-full flex flex-col gap-4 p-2 overflow-hidden">
              <div className="grid grid-cols-3 gap-4 shrink-0">
                <div className="glass-card p-4 border-t border-white/5">
                  <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest block mb-1">Status</span>
                  <span className={`font-mono text-xl font-bold ${response?.status && response.status < 400 ? 'text-emerald-400' : 'text-rose-400'}`}>{response?.status || 'FAIL'}</span>
                </div>
                <div className="glass-card p-4 border-t border-white/5">
                  <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest block mb-1">Time</span>
                  <span className="font-mono text-xl font-bold text-slate-200">{response?.time || '--'}ms</span>
                </div>
                <div className="glass-card p-4 border-t border-white/5">
                  <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest block mb-1">Size</span>
                  <span className="font-mono text-xl font-bold text-slate-200">{response?.size ? (response.size / 1024).toFixed(2) : '0.00'}KB</span>
                </div>
              </div>
              <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 overflow-hidden">
                <div className="flex-[2] flex flex-col gap-2 overflow-hidden">
                  <div className="flex justify-between items-center mb-2 px-2 shrink-0">
                    <div className="flex bg-white/5 p-1 rounded-md items-center gap-1">
                      <button onClick={() => setResponseMode('visual')} className={`px-4 py-1.5 rounded text-[8px] font-bold uppercase transition-all ${responseMode === 'visual' ? 'bg-white/10 text-white' : 'text-slate-600 hover:text-slate-400'}`}>Visual</button>
                      <button onClick={() => setResponseMode('raw')} className={`px-4 py-1.5 rounded text-[8px] font-bold uppercase transition-all ${responseMode === 'raw' ? 'bg-white/10 text-white' : 'text-slate-600 hover:text-slate-400'}`}>Raw</button>
                      
                      {response && (
                         <div className="flex items-center bg-black/20 rounded-lg px-2 border border-white/10 group ml-2">
                           <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 group-focus-within:text-white transition-colors"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                           <input 
                              type="text" 
                              value={searchTerm} 
                              onChange={(e) => setSearchTerm(e.target.value)} 
                              placeholder="Filter results..." 
                              className="bg-transparent h-7 px-2 text-[9px] font-black text-white outline-none w-32 placeholder:text-slate-700"
                           />
                           {searchTerm && <button onClick={() => setSearchTerm('')} className="text-slate-600 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>}
                         </div>
                      )}
                    </div>
                    {response?.data && <button onClick={() => hydrateArchitect(response.data)} className="px-5 py-2.5 bg-[#10b981] hover:bg-emerald-400 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95">Hydrate Architect</button>}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {error && !response ? <ErrorDiagnosis error={error} method={method} url={url} headers={headers} body={body} accentColor={methodConfig.hex} responseData={response?.data} /> : (
                      responseMode === 'raw' ? <Editor value={JSON.stringify(response?.data, null, 2)} readOnly variables={variables} accentColor={methodConfig.hex} /> : <div className="h-full glass-card p-4 overflow-hidden border-t border-white/5"><ResponseViewer data={response?.data} status={response?.status} accentColor={methodConfig.hex} searchTerm={searchTerm} /></div>
                    )}
                  </div>
                </div>
                <div className="flex-1 glass-card p-8 flex flex-col overflow-hidden border-t border-white/5 bg-white/[0.01]">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8 border-b border-white/5 pb-3 shrink-0">Response Headers</h3>
                  <div className="flex-1 overflow-y-auto space-y-5 pr-3 custom-scrollbar">
                    {response ? Object.entries(response.headers).map(([k,v]) => (
                      <div key={k} className="group relative">
                        <div className="text-[7px] text-slate-600 font-black uppercase tracking-widest mb-1.5 flex items-center gap-2">
                           <div className="w-1 h-1 rounded-full bg-white/20"></div>{k}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono break-all bg-white/[0.02] p-3 rounded-xl border border-transparent group-hover:border-white/10 transition-all shadow-inner">{v}</div>
                      </div>
                    )) : <div className="h-full flex flex-col items-center justify-center opacity-20 text-center uppercase font-black text-[9px] tracking-widest">Awaiting Transaction...</div>}
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
