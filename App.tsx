import React, { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import { ApiRequest, ApiResponse, HttpMethod, KeyValuePair, HistoryItem, ActiveTab, Variable, Environment, PingResult, generateId } from './types';
import HeaderManager from './components/HeaderManager';
import Editor from './components/Editor';
import JsonBuilder from './components/JsonBuilder';
import VariableManager from './components/VariableManager';
import ResponseViewer from './components/ResponseViewer';
import BulkTransmit from './components/BulkTransmit';
import CurlImporter from './components/CurlImporter';
import ErrorDiagnosis from './components/ErrorDiagnosis';
import UrlInput from './components/UrlInput';
import MethodSelector from './components/MethodSelector';
import WorkbenchPortability from './components/WorkbenchPortability';
import MonitoringTool from './components/Monitoring'; 

const MemoizedEditor = memo(Editor);
const MemoizedResponseViewer = memo(ResponseViewer);
const MemoizedHeaderManager = memo(HeaderManager);
const MemoizedJsonBuilder = memo(JsonBuilder);
const MemoizedVariableManager = memo(VariableManager);

const App: React.FC = () => {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [headers, setHeaders] = useState<KeyValuePair[]>([
    { id: generateId(), key: 'Accept', value: 'application/json', enabled: true },
    { id: generateId(), key: 'Content-Type', value: 'application/json', enabled: true }
  ]);
  const [body, setBody] = useState('{\n  "title": "Axiom Pro Test",\n  "body": "Universal Testing Payload",\n  "userId": 1\n}');
  const [builderFields, setBuilderFields] = useState<KeyValuePair[]>([
    { id: generateId(), key: 'title', value: 'Axiom Pro Test', enabled: true, type: 'string' },
    { id: generateId(), key: 'body', value: 'Universal Testing Payload', enabled: true, type: 'string' },
    { id: generateId(), key: 'userId', value: '1', enabled: true, type: 'number' }
  ]);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('request');
  const [sidebarTab, setSidebarTab] = useState<'recent' | 'library'>('recent');
  const [bodyMode, setBodyMode] = useState<'raw' | 'builder'>('raw');
  const [responseMode, setResponseMode] = useState<'visual' | 'raw'>('visual');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [showBulk, setShowBulk] = useState(false);
  const [showCurlImport, setShowCurlImport] = useState(false);
  
  const [environments, setEnvironments] = useState<Environment[]>([
    { id: 'env_default', name: 'Production', variables: [{ key: 'base_url', value: 'https://api.example.com' }] }
  ]);
  const [activeEnvId, setActiveEnvId] = useState<string>('env_default');

  const [monitorUrl, setMonitorUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [monitorHistory, setMonitorHistory] = useState<PingResult[]>([]);
  const [isMonitorLive, setIsMonitorLive] = useState(false);
  const [monitorInterval, setMonitorInterval] = useState(5000);
  const [monitorStatus, setMonitorStatus] = useState<'idle' | 'checking' | 'up' | 'down'>('idle');
  
  const activeVariables = useMemo(() => {
    return environments.find(e => e.id === activeEnvId)?.variables || [];
  }, [environments, activeEnvId]);

  const [globalAccent, setGlobalAccent] = useState('#3b82f6');

  const methodConfig = useMemo(() => {
    const configs = {
      GET: { hex: '#10b981', label: 'Fetch' },
      POST: { hex: globalAccent, label: 'Push' },
      PUT: { hex: '#f59e0b', label: 'Sync' },
      PATCH: { hex: '#06b6d4', label: 'Merge' },
      DELETE: { hex: '#f43f5e', label: 'Purge' }
    };
    return (configs as any)[method] || configs.POST;
  }, [method, globalAccent]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', methodConfig.hex);
  }, [methodConfig.hex]);

  const injectVars = useCallback((str: string) => {
    let result = str;
    activeVariables.forEach(v => {
      if (v.key) {
        const regex = new RegExp(`{{${v.key}}}`, 'g');
        result = result.replace(regex, v.value);
      }
    });
    return result;
  }, [activeVariables]);

  const syncArchitectToBody = useCallback((fields: KeyValuePair[]) => {
    const obj: Record<string, any> = {};
    fields.filter(f => f.enabled && f.key).forEach(f => {
      let val: any = f.value;
      if (f.type === 'number') val = Number(val);
      else if (f.type === 'boolean') val = val.toLowerCase() === 'true';
      else if (f.type === 'null') val = null;
      obj[f.key] = val;
    });
    setBody(JSON.stringify(obj, null, 2));
  }, []);

  const findMaxId = useCallback((data: any): { key: string; max: number } | null => {
    let max = -1;
    let foundKey = '';

    const scan = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      const idKey = Object.keys(obj).find(k => k.toLowerCase() === 'id');
      if (idKey) {
        const val = parseInt(String(obj[idKey]), 10);
        if (!isNaN(val) && val > max) {
          max = val;
          foundKey = idKey;
        }
      }
    };

    if (Array.isArray(data)) {
      data.forEach(scan);
    } else {
      scan(data);
    }

    return foundKey ? { key: foundKey, max } : null;
  }, []);

  const hydrateArchitect = useCallback((data: any) => {
    let target = Array.isArray(data) ? data[0] : data;
    if (typeof target !== 'object' || target === null) return;
    
    // Auto-population logic: find absolute max ID across the payload
    const maxInfo = findMaxId(data);
    
    const newFields: KeyValuePair[] = Object.entries(target).map(([key, value]) => {
      let type: 'string' | 'number' | 'boolean' | 'null' = 'string';
      let finalValue = value === null ? '' : String(value);

      // Handle ID field: Increment if POST, otherwise use current max ID
      if (maxInfo && key.toLowerCase() === maxInfo.key.toLowerCase()) {
        finalValue = method === 'POST' ? String(maxInfo.max + 1) : String(maxInfo.max);
      }

      if (value === null) type = 'null';
      else if (typeof value === 'number') type = 'number';
      else if (typeof value === 'boolean') type = 'boolean';

      return {
        id: generateId(),
        key,
        value: finalValue,
        enabled: true,
        type
      };
    });

    setBuilderFields(newFields);
    syncArchitectToBody(newFields);
    setBodyMode('builder');
    setActiveTab('request');
  }, [syncArchitectToBody, findMaxId, method]);

  const smartStartId = useMemo(() => {
    if (response?.data) {
      const maxInfo = findMaxId(response.data);
      if (maxInfo) return maxInfo.max;
    }
    return 0;
  }, [response, findMaxId]);

  const handleSend = async () => {
    setLoading(true); setError(null); setResponse(null); setActiveTab('response');
    const startTime = performance.now();
    try {
      const headerObj: Record<string, string> = {};
      headers.filter(h => h.enabled && h.key).forEach(h => { headerObj[injectVars(h.key)] = injectVars(h.value); });
      const options: RequestInit = {
        method,
        headers: headerObj,
        body: (method !== 'GET' && method !== 'DELETE') ? injectVars(body) : undefined,
      };
      const res = await fetch(injectVars(url), options);
      const endTime = performance.now();
      const rawText = await res.text();
      let data;
      try { data = JSON.parse(rawText); } catch (e) { data = rawText; }
      
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });
      const result: ApiResponse = { status: res.status, statusText: res.statusText, data, headers: resHeaders, time: Math.round(endTime - startTime), size: rawText.length };
      setResponse(result);
      setHistory(prev => [{ id: generateId(), request: { id: generateId(), name: `Req ${new Date().toLocaleTimeString()}`, method, url, headers: JSON.parse(JSON.stringify(headers)), body, createdAt: Date.now() }, response: result, timestamp: Date.now() }, ...prev].slice(0, 50));
    } catch (err: any) { 
      setError(err.message || 'System fault.'); 
    } finally { setLoading(false); }
  };

  const performPing = async () => {
    setMonitorStatus('checking');
    const start = performance.now();
    try {
      await fetch(monitorUrl, { method: 'HEAD', mode: 'no-cors' });
      const end = performance.now();
      const result: PingResult = { id: generateId(), timestamp: Date.now(), latency: Math.round(end - start), status: 'up', code: 'PONG' };
      setMonitorHistory(prev => [result, ...prev].slice(0, 50));
      setMonitorStatus('up');
    } catch (e) {
      setMonitorHistory(prev => [{ id: generateId(), timestamp: Date.now(), latency: 0, status: 'down', code: 'FAIL' }, ...prev].slice(0, 50));
      setMonitorStatus('down');
    }
  };

  useEffect(() => {
    let intervalId: any;
    if (isMonitorLive) {
      performPing();
      intervalId = setInterval(performPing, monitorInterval);
    }
    return () => clearInterval(intervalId);
  }, [isMonitorLive, monitorInterval, monitorUrl]);

  return (
    <div className="flex h-screen overflow-hidden p-6 gap-6 bg-[#06080c] select-none text-slate-300">
      {showBulk && (
        <BulkTransmit 
          url={url} 
          method={method} 
          setMethod={setMethod}
          headers={headers} 
          variables={activeVariables} 
          builderFields={builderFields} 
          initialN={smartStartId} 
          onClose={() => setShowBulk(false)} 
          accentColor={methodConfig.hex} 
        />
      )}
      {showCurlImport && <CurlImporter onImport={(d) => {setMethod(d.method as any); setUrl(d.url); setHeaders(d.headers); setBody(d.body);}} onClose={() => setShowCurlImport(false)} accentColor={methodConfig.hex} />}

      <aside className="w-80 flex flex-col shrink-0 gap-6 overflow-hidden">
        <div className="glass-panel flex flex-col flex-[1.4] overflow-hidden border-t-2 animate-fade" style={{ borderTopColor: methodConfig.hex }}>
          <div className="p-6">
             <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-sm font-black tracking-tighter text-white mb-0.5">AXIOM PRO</h1>
                  <p className="text-[7px] text-slate-500 font-black uppercase tracking-[0.4em]">Professional API Workbench</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500'} animate-pulse`}></div>
             </div>
             <div className="toggle-container">
                <button onClick={() => setSidebarTab('recent')} className={`toggle-item ${sidebarTab === 'recent' ? 'active' : ''}`}>Recent</button>
                <button onClick={() => setSidebarTab('library')} className={`toggle-item ${sidebarTab === 'library' ? 'active' : ''}`}>Library</button>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
            {sidebarTab === 'recent' ? history.map((item) => (
              <button key={item.id} onClick={() => { setMethod(item.request.method); setUrl(item.request.url); setHeaders(JSON.parse(JSON.stringify(item.request.headers))); setBody(item.request.body); if (item.response) setResponse(item.response); }} className="w-full text-left p-4 glass-card border border-transparent hover:border-white/10 transition-all">
                <div className="flex justify-between items-center mb-1 text-[8px] font-black uppercase tracking-widest">
                  <span className={item.request.method === 'GET' ? 'text-emerald-400' : 'text-blue-400'}>{item.request.method}</span>
                  <span className={item.response?.status && item.response.status < 400 ? 'text-emerald-500/40' : 'text-rose-500/40'}>{item.response?.status || '---'}</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate font-medium opacity-60">{item.request.url}</div>
              </button>
            )) : <div className="text-center py-10 opacity-10 text-[9px] font-black uppercase tracking-[0.5em]">Empty Vault</div>}
          </div>
          <div className="px-4 pb-4 mt-auto">
             <WorkbenchPortability onImport={() => {}} accentColor={methodConfig.hex} />
          </div>
        </div>
        <div className="glass-panel flex-1 min-h-0 p-6 overflow-hidden border-t-2 animate-fade" style={{ borderTopColor: methodConfig.hex }}>
          <MemoizedVariableManager environments={environments} setEnvironments={setEnvironments} activeEnvId={activeEnvId} setActiveEnvId={setActiveEnvId} url={url} headers={headers} body={body} accentColor={methodConfig.hex} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="glass-panel p-2 flex items-center gap-3 mb-6 border-l-4 shadow-2xl shrink-0 animate-fade" style={{ borderLeftColor: methodConfig.hex }}>
          <MethodSelector value={method} onChange={setMethod} />
          <UrlInput value={url} onChange={setUrl} variables={activeVariables} accentColor={methodConfig.hex} placeholder="Enter Request URL..." />
          <div className="flex gap-2">
            <button onClick={() => setShowBulk(true)} className="h-11 w-11 flex items-center justify-center glass-card hover:bg-white/10 text-slate-400 group relative" title="Launch Bulk Transmit Engine">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
               <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
            </button>
            <button onClick={handleSend} disabled={loading} className="h-11 px-10 active:scale-95 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest text-white rounded-xl shadow-2xl transition-all" style={{ backgroundColor: methodConfig.hex }}>{loading ? "..." : methodConfig.label}</button>
          </div>
        </div>

        <div className="flex px-4 mb-4 justify-between items-center shrink-0">
          <div className="flex gap-2">
            {(['request', 'response', 'monitor'] as ActiveTab[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`tab-btn transition-all duration-300 ${activeTab === tab ? 'active' : ''}`}>{tab}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'request' && (
            <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6 p-2 overflow-y-auto custom-scrollbar pb-24 animate-fade">
              <div className="glass-panel p-8 flex flex-col min-h-[400px] border-t border-white/5 shadow-xl">
                <MemoizedHeaderManager headers={headers} setHeaders={setHeaders} accentColor={methodConfig.hex} variables={activeVariables} />
              </div>
              <div className="flex flex-col gap-6 overflow-hidden min-h-[400px]">
                <div className="flex justify-between px-2 shrink-0">
                  <div className="toggle-container">
                    <button onClick={() => setBodyMode('raw')} className={`toggle-item ${bodyMode === 'raw' ? 'active' : ''}`}>Editor</button>
                    <button onClick={() => setBodyMode('builder')} className={`toggle-item ${bodyMode === 'builder' ? 'active' : ''}`}>Architect</button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {bodyMode === 'raw' ? (
                    <MemoizedEditor value={body} onChange={setBody} variables={activeVariables} accentColor={methodConfig.hex} />
                  ) : (
                    <div className="h-full glass-panel p-8 shadow-xl">
                      <MemoizedJsonBuilder 
                        fields={builderFields} 
                        setFields={(f) => { setBuilderFields(f); syncArchitectToBody(f); }} 
                        variables={activeVariables} 
                        accentColor={methodConfig.hex} 
                        onHydrate={() => hydrateArchitect(JSON.parse(body))}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'monitor' && <MonitoringTool accentColor={methodConfig.hex} targetUrl={monitorUrl} setTargetUrl={setMonitorUrl} pingStatus={monitorStatus} history={monitorHistory} setHistory={setMonitorHistory} isAutoPing={isMonitorLive} setIsAutoPing={setIsMonitorLive} pingInterval={monitorInterval} setPingInterval={setMonitorInterval} onTestNow={performPing} />}
          
          {activeTab === 'response' && (
            <div className="h-full flex flex-col gap-6 p-2 overflow-hidden animate-fade">
              <div className="grid grid-cols-3 gap-6 shrink-0">
                <div className="glass-panel p-6 shadow-lg flex flex-col justify-center border-t border-white/5">
                  <span className="section-label !mb-2">Protocol</span>
                  <span className={`font-mono text-xl font-bold ${response?.status && response.status < 400 ? 'text-emerald-400' : 'text-rose-400'}`}>{response?.status || '000'} {response?.statusText || 'OFFLINE'}</span>
                </div>
                <div className="glass-panel p-6 shadow-lg flex flex-col justify-center border-t border-white/5">
                  <span className="section-label !mb-2">Latency</span>
                  <span className="font-mono text-xl font-bold text-slate-200">{response?.time || '--'}ms</span>
                </div>
                <div className="glass-panel p-6 shadow-lg flex flex-col justify-center border-t border-white/5 overflow-hidden">
                  <span className="section-label !mb-2">Payload</span>
                  <span className="font-mono text-xl font-bold text-slate-200">{response?.size ? (response.size / 1024).toFixed(2) : '0.00'} KB</span>
                </div>
              </div>
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-4 px-2 shrink-0">
                  <div className="toggle-container">
                    <button onClick={() => setResponseMode('visual')} className={`toggle-item ${responseMode === 'visual' ? 'active' : ''}`}>Visual</button>
                    <button onClick={() => setResponseMode('raw')} className={`toggle-item ${responseMode === 'raw' ? 'active' : ''}`}>Source</button>
                  </div>
                  <div className="flex gap-2">
                    {response?.data && (
                      <button onClick={() => hydrateArchitect(response.data)} className="text-[9px] font-black uppercase text-blue-400 hover:text-white transition-all bg-blue-500/5 px-4 py-2 rounded-xl border border-blue-500/10">Hydrate Architect & Inc</button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {error ? (
                    <ErrorDiagnosis error={error} method={method} url={url} headers={headers} body={body} accentColor={methodConfig.hex} responseData={response?.data} />
                  ) : (
                    responseMode === 'raw' ? (
                      <div className="h-full glass-panel overflow-hidden shadow-2xl"><MemoizedEditor value={JSON.stringify(response?.data, null, 2)} readOnly variables={activeVariables} accentColor={methodConfig.hex} /></div>
                    ) : (
                      <div className="h-full glass-panel p-8 overflow-hidden shadow-2xl"><MemoizedResponseViewer data={response?.data} status={response?.status} accentColor={methodConfig.hex} /></div>
                    )
                  )}
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