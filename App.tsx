
import React, { useState, useEffect, useMemo } from 'react';
import { ApiRequest, ApiResponse, HttpMethod, KeyValuePair, HistoryItem, ActiveTab } from './types';
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
  const [url, setUrl] = useState('http://localhost:5000/api/values');
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
  const [variables, setVariables] = useState<{key: string, value: string}[]>([]);

  // Only show the Debug tab for localhost URLs
  const isLocalhost = useMemo(() => {
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('localhost') || lowerUrl.includes('127.0.0.1');
  }, [url]);

  const localPort = useMemo(() => {
    const match = url.match(/:([0-9]+)/);
    return match ? match[1] : '80/443';
  }, [url]);

  const methodConfig = useMemo(() => ({
    GET: { hex: '#10b981', text: 'text-emerald-400', shadow: 'shadow-emerald-500/10', label: 'Fetch' },
    POST: { hex: '#3b82f6', text: 'text-blue-400', shadow: 'shadow-blue-500/10', label: 'Execute' },
    PUT: { hex: '#f59e0b', text: 'text-amber-400', shadow: 'shadow-amber-500/10', label: 'Update' },
    PATCH: { hex: '#06b6d4', text: 'text-cyan-400', shadow: 'shadow-cyan-500/10', label: 'Modify' },
    DELETE: { hex: '#f43f5e', text: 'text-rose-400', shadow: 'shadow-rose-500/10', label: 'Remove' }
  }[method] || { hex: '#3b82f6', text: 'text-blue-400', shadow: 'shadow-blue-500/10', label: 'Transmit' }), [method]);

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

  useEffect(() => {
    if (activeTab === 'debug' && !isLocalhost) {
      setActiveTab('request');
    }
  }, [isLocalhost, activeTab]);

  const tabs = useMemo(() => {
    const list: ActiveTab[] = ['request', 'response'];
    if (isLocalhost) list.push('debug');
    return list;
  }, [isLocalhost]);

  return (
    <div className="flex h-screen overflow-hidden p-6 gap-6 bg-[#06080c]">
      {showBulk && <BulkTransmit url={url} method={method} headers={headers} variables={variables} onClose={() => setShowBulk(false)} onComplete={() => {}} accentColor={methodConfig.hex} />}
      {showCurlImport && <CurlImporter onImport={(d) => {setMethod(d.method as any); setUrl(d.url); setHeaders(d.headers); setBody(d.body);}} onClose={() => setShowCurlImport(false)} accentColor={methodConfig.hex} />}

      <aside className="w-80 flex flex-col shrink-0 gap-6 animate-fade">
        <div className="glass-panel flex flex-col h-[55%] overflow-hidden rounded-[var(--radius-main)] border-t-2 border-t-slate-800" style={{ borderTopColor: methodConfig.hex }}>
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
        <div className="glass-panel h-[45%] rounded-[var(--radius-main)] p-6 overflow-hidden border-t-2 border-t-slate-800" style={{ borderTopColor: methodConfig.hex }}>
          <VariableManager variables={variables} setVariables={setVariables} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 animate-fade">
        <div className={`glass-panel p-2 flex items-center gap-2 mb-6 rounded-[var(--radius-main)] transition-all border-l-4 ${methodConfig.shadow}`} style={{ borderLeftColor: methodConfig.hex }}>
          <select value={method} onChange={(e) => setMethod(e.target.value as HttpMethod)} className={`bg-white/5 border-none h-11 px-4 text-[11px] font-black tracking-widest cursor-pointer rounded-lg outline-none ${methodConfig.text}`}>
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m} value={m} className="bg-slate-900 text-white">{m}</option>)}
          </select>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="h-11 px-4 flex-1 text-[13px] font-medium text-slate-200 bg-white/[0.02] outline-none rounded-lg focus:bg-white/[0.05] transition-all" placeholder="http://api..." />
          <button onClick={handleSend} disabled={loading} className="h-11 px-10 active:scale-95 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest text-white rounded-lg transition-all shadow-2xl min-w-[140px]" style={{ backgroundColor: methodConfig.hex }}>
            {loading ? "..." : methodConfig.label}
          </button>
        </div>

        <div className="flex px-4 mb-2 justify-between items-center">
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`tab-btn transition-all duration-300 ${activeTab === tab ? 'active' : ''}`} 
                style={{ '--accent-primary': tab === 'debug' ? '#a855f7' : methodConfig.hex } as any}
              >
                {tab === 'debug' ? (
                   <span className="flex items-center gap-2 text-purple-400">
                     <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_#a855f7]"></span>
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
                  {bodyMode === 'raw' ? <Editor value={body} onChange={setBody} /> : <div className="h-full glass-card p-4 overflow-hidden border-t border-white/5"><JsonBuilder fields={builderFields} setFields={setBuilderFields} accentColor={methodConfig.hex} /></div>}
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
              <div className="flex-1 min-h-0 flex gap-4 overflow-hidden">
                <div className="flex-[2] flex flex-col gap-2 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <div className="flex bg-white/5 p-1 rounded-md self-start">
                      <button onClick={() => setResponseMode('visual')} className={`px-3 py-1 rounded text-[8px] font-bold uppercase ${responseMode === 'visual' ? 'bg-white/10' : 'text-slate-600'}`}>Visual</button>
                      <button onClick={() => setResponseMode('raw')} className={`px-3 py-1 rounded text-[8px] font-bold uppercase ${responseMode === 'raw' ? 'bg-white/10' : 'text-slate-600'}`}>Raw</button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {error && !response ? <ErrorDiagnosis error={error} method={method} url={url} headers={headers} body={body} accentColor={methodConfig.hex} responseData={response?.data} /> : (
                      responseMode === 'raw' ? <Editor value={JSON.stringify(response?.data, null, 2)} readOnly /> : <div className="h-full glass-card p-4 overflow-hidden border-t border-white/5"><ResponseViewer data={response?.data} accentColor={methodConfig.hex} /></div>
                    )}
                  </div>
                </div>
                <div className="flex-1 glass-card p-6 flex flex-col overflow-hidden border-t border-white/5">
                  <h3 className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-4">Response Headers</h3>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {response && Object.entries(response.headers).map(([k,v]) => <div key={k} className="border-b border-white/[0.04] pb-2 last:border-0"><div className="text-[7px] text-slate-600 font-bold uppercase mb-0.5">{k}</div><div className="text-[10px] text-slate-400 font-mono break-all">{v}</div></div>)}
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
