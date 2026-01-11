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
import DevAssistant from './components/DevAssistant';
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
  const [library, setLibrary] = useState<ApiRequest[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('request');
  const [sidebarTab, setSidebarTab] = useState<'recent' | 'library'>('recent');
  const [bodyMode, setBodyMode] = useState<'raw' | 'builder'>('raw');
  const [responseMode, setResponseMode] = useState<'visual' | 'raw'>('visual');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showBulk, setShowBulk] = useState(false);
  const [showCurlImport, setShowCurlImport] = useState(false);
  
  const [environments, setEnvironments] = useState<Environment[]>([
    { id: 'env_default', name: 'Production', variables: [{ key: 'base_url', value: 'https://api.example.com' }] }
  ]);
  const [activeEnvId, setActiveEnvId] = useState<string>('env_default');

  // Background Monitoring State
  const [monitorUrl, setMonitorUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [monitorHistory, setMonitorHistory] = useState<PingResult[]>([]);
  const [isMonitorLive, setIsMonitorLive] = useState(false);
  const [monitorInterval, setMonitorInterval] = useState(5000);
  const [monitorStatus, setMonitorStatus] = useState<'idle' | 'checking' | 'up' | 'down'>('idle');
  
  const monitorTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const activeVariables = useMemo(() => {
    return environments.find(e => e.id === activeEnvId)?.variables || [];
  }, [environments, activeEnvId]);

  const [isNamingRequest, setIsNamingRequest] = useState(false);
  const [tempRequestName, setTempRequestName] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [globalAccent, setGlobalAccent] = useState('#3b82f6');
  const [storageReady, setStorageReady] = useState(false);

  // SMART START ID: Scans response data first, then falls back to URL segments
  const smartStartId = useMemo(() => {
    // 1. Try to find the largest ID in the response data
    if (response?.data) {
      const data = response.data;
      if (Array.isArray(data)) {
        const ids = data
          .map(item => parseInt(item?.id || item?.Id || item?.ID, 10))
          .filter(id => !isNaN(id));
        if (ids.length > 0) return Math.max(...ids);
      } else if (typeof data === 'object') {
        const id = parseInt(data?.id || data?.Id || data?.ID, 10);
        if (!isNaN(id)) return id;
      }
    }

    // 2. Fallback: Extract from URL segments
    const segments = url.split('/');
    for (let i = segments.length - 1; i >= 0; i--) {
      const num = parseInt(segments[i], 10);
      if (!isNaN(num)) return num;
    }
    return 0;
  }, [url, response]);

  const methodConfig = useMemo(() => {
    const configs = {
      GET: { hex: '#10b981', text: 'text-emerald-400', label: 'Fetch' },
      POST: { hex: globalAccent, text: 'text-white', label: 'Send' },
      PUT: { hex: '#f59e0b', text: 'text-amber-400', label: 'Update' },
      PATCH: { hex: '#06b6d4', text: 'text-cyan-400', label: 'Modify' },
      DELETE: { hex: '#f43f5e', text: 'text-rose-400', label: 'Delete' }
    };
    return (configs as any)[method] || configs.POST;
  }, [method, globalAccent]);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent-primary', methodConfig.hex);
  }, [methodConfig.hex]);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    try {
      const savedHistory = localStorage.getItem('axiom_history_v3');
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      const savedLibrary = localStorage.getItem('axiom_library');
      if (savedLibrary) setLibrary(JSON.parse(savedLibrary));
      const savedEnvs = localStorage.getItem('axiom_environments');
      if (savedEnvs) setEnvironments(JSON.parse(savedEnvs));
      const savedEnvId = localStorage.getItem('axiom_active_env_id');
      if (savedEnvId) setActiveEnvId(savedEnvId);
      const savedSidebar = localStorage.getItem('axiom_sidebar_tab');
      if (savedSidebar) setSidebarTab(savedSidebar as any);
      
      const savedMonitorUrl = localStorage.getItem('axiom_monitor_url');
      if (savedMonitorUrl) setMonitorUrl(savedMonitorUrl);
    } catch (e) { console.warn("Storage hydration failed", e); }
    const t = setTimeout(() => setStorageReady(true), 100);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => { if (storageReady) localStorage.setItem('axiom_history_v3', JSON.stringify(history)); }, [history, storageReady]);
  useEffect(() => { if (storageReady) localStorage.setItem('axiom_library', JSON.stringify(library)); }, [library, storageReady]);
  useEffect(() => { if (storageReady) localStorage.setItem('axiom_environments', JSON.stringify(environments)); }, [environments, storageReady]);
  useEffect(() => { if (storageReady) localStorage.setItem('axiom_active_env_id', activeEnvId); }, [activeEnvId, storageReady]);
  useEffect(() => { if (storageReady) localStorage.setItem('axiom_sidebar_tab', sidebarTab); }, [sidebarTab, storageReady]);
  useEffect(() => { if (storageReady) localStorage.setItem('axiom_monitor_url', monitorUrl); }, [monitorUrl, storageReady]);

  // Reset Monitor Stats on URL change
  useEffect(() => {
    setMonitorHistory([]);
    setMonitorStatus('idle');
  }, [monitorUrl]);

  // Background Monitor Logic
  const checkHealth = useCallback(async () => {
    setMonitorStatus('checking');
    const startTime = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      await fetch(monitorUrl, { mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      const result: PingResult = {
        id: generateId(),
        timestamp: Date.now(),
        latency,
        status: 'up',
        code: 'REACHABLE'
      };
      setMonitorStatus('up');
      setMonitorHistory(prev => [result, ...prev].slice(0, 50));
    } catch (err: any) {
      const result: PingResult = {
        id: generateId(),
        timestamp: Date.now(),
        latency: 0,
        status: 'down',
        code: err.name === 'AbortError' ? 'TIMEOUT' : 'FAILED'
      };
      setMonitorStatus('down');
      setMonitorHistory(prev => [result, ...prev].slice(0, 50));
    }
  }, [monitorUrl]);

  useEffect(() => {
    if (isMonitorLive) {
      // Trigger immediately when turned on
      checkHealth();
      monitorTimerRef.current = setInterval(checkHealth, monitorInterval);
    } else {
      if (monitorTimerRef.current) clearInterval(monitorTimerRef.current);
      setMonitorStatus('idle');
    }
    return () => { if (monitorTimerRef.current) clearInterval(monitorTimerRef.current); };
  }, [isMonitorLive, monitorInterval, checkHealth]);

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

  const handleSend = async () => {
    setLoading(true); setError(null); setResponse(null); setActiveTab('response');
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
      const newItem: HistoryItem = { 
        id: generateId(), 
        request: { id: generateId(), name: `Req ${new Date().toLocaleTimeString()}`, method, url, headers: JSON.parse(JSON.stringify(headers)), body, createdAt: Date.now() }, 
        response: result, timestamp: Date.now() 
      };
      setHistory(prev => [newItem, ...prev].slice(0, 50));
      if (!res.ok) {
        setError(`Status ${res.status}: ${res.statusText}`);
      }
    } catch (err: any) { 
      setError(err.message || 'Transmission failed.'); 
      setActiveTab('response'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleImportWorkbench = (data: any) => {
    if (data.history) setHistory(data.history);
    if (data.library) setLibrary(data.library);
    if (data.environments) setEnvironments(data.environments);
    if (data.activeEnvId) setActiveEnvId(data.activeEnvId);
    alert('Workbench state restored successfully.');
  };

  const initSaveToLibrary = () => { setTempRequestName(`Endpoint ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`); setIsNamingRequest(true); };
  const confirmSaveToLibrary = () => {
    const finalName = tempRequestName.trim() || `Saved Request ${library.length + 1}`;
    setLibrary(prev => [{ id: generateId(), name: finalName, method, url, headers: JSON.parse(JSON.stringify(headers)), body, createdAt: Date.now() }, ...prev]);
    setIsNamingRequest(false); setSidebarTab('library');
  };
  const loadFromLibrary = (req: ApiRequest) => { setMethod(req.method); setUrl(req.url); setHeaders(JSON.parse(JSON.stringify(req.headers))); setBody(req.body); setResponse(null); setActiveTab('request'); };
  const deleteFromLibrary = (id: string) => { setLibrary(prev => prev.filter(req => req.id !== id)); };
  const handleClearHistory = () => { if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); } else { setHistory([]); setConfirmClear(false); } };
  
  const hydrateArchitect = useCallback((data: any) => {
    if (!data) return;
    const template = Array.isArray(data) ? data[0] : data;
    setBody(JSON.stringify(template, null, 2));
    if (typeof template === 'object' && template !== null) {
      setBuilderFields(Object.entries(template).map(([key, value]) => ({ id: generateId(), key, value: String(value), enabled: true, type: value === null ? 'null' : typeof value as any })));
    }
    setBodyMode('builder'); setMethod('POST'); setActiveTab('request');
  }, []);

  const handleAddHeaderShortcut = useCallback((key: string, value: string) => {
    setHeaders(prev => {
      const existing = prev.find(h => h.key.toLowerCase() === key.toLowerCase());
      if (!existing) {
        return [...prev, { id: generateId(), key, value, enabled: true }];
      }
      return prev;
    });
    setActiveTab('request');
  }, []);

  const availableTabs = useMemo<ActiveTab[]>(() => ['request', 'response', 'monitor', 'debug'], []);

  return (
    <div className="flex h-screen overflow-hidden p-6 gap-6 bg-[#06080c]">
      {showBulk && (
        <BulkTransmit 
          url={url} 
          method={method} 
          headers={headers} 
          variables={activeVariables} 
          builderFields={builderFields} 
          initialN={smartStartId}
          onClose={() => setShowBulk(false)} 
          accentColor={methodConfig.hex} 
          onModeChange={setGlobalAccent} 
          hasActiveResponse={!!response?.data}
        />
      )}
      {showCurlImport && <CurlImporter onImport={(d) => {setMethod(d.method as any); setUrl(d.url); setHeaders(d.headers); setBody(d.body);}} onClose={() => setShowCurlImport(false)} accentColor={methodConfig.hex} />}

      <aside className="w-80 flex flex-col shrink-0 gap-6 overflow-hidden">
        <div className="glass-panel flex flex-col flex-[1.2] min-h-0 overflow-hidden border-t-2 animate-fade" style={{ borderTopColor: methodConfig.hex }}>
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
                  <button onClick={handleClearHistory} className={`text-[9px] font-black uppercase transition-all px-2 py-1 rounded-md ${confirmClear ? 'bg-rose-500 text-white' : 'text-slate-500 hover:text-rose-500'}`}>
                    {confirmClear ? 'Confirm Clear?' : 'Clear'}
                  </button>
                )}
             </div>
             
             <div className="toggle-container">
                <button onClick={() => setSidebarTab('recent')} className={`toggle-item ${sidebarTab === 'recent' ? 'active' : ''}`} style={sidebarTab === 'recent' ? { color: methodConfig.hex } : {}}>Recent</button>
                <button onClick={() => setSidebarTab('library')} className={`toggle-item ${sidebarTab === 'library' ? 'active' : ''}`} style={sidebarTab === 'library' ? { color: methodConfig.hex } : {}}>Library</button>
             </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
            {sidebarTab === 'recent' ? (
              history.map((item) => (
                <button key={item.id} onClick={() => { setMethod(item.request.method); setUrl(item.request.url); setHeaders(JSON.parse(JSON.stringify(item.request.headers))); setBody(item.request.body); if (item.response) setResponse(item.response); }} className="w-full text-left p-3 glass-card group">
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
                  <button onClick={() => loadFromLibrary(req)} className="flex-1 text-left p-3 glass-card overflow-hidden">
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
              <div className="py-20 flex flex-col items-center justify-center opacity-30 text-center uppercase font-black tracking-widest text-[9px]">
                {sidebarTab === 'recent' ? 'History Empty' : 'Library Empty'}
              </div>
            )}
          </div>
          <div className="px-4 pb-4 mt-auto">
             <WorkbenchPortability onImport={handleImportWorkbench} accentColor={methodConfig.hex} />
          </div>
        </div>
        <div className="glass-panel flex-1 min-h-0 p-6 overflow-hidden border-t-2 animate-fade" style={{ borderTopColor: methodConfig.hex }}>
          <MemoizedVariableManager 
            environments={environments} 
            setEnvironments={setEnvironments}
            activeEnvId={activeEnvId}
            setActiveEnvId={setActiveEnvId}
            url={url} 
            headers={headers} 
            body={body} 
            accentColor={methodConfig.hex} 
          />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isNamingRequest ? (
          <div className="glass-panel p-4 mb-6 border-l-4 border-emerald-500 flex items-center gap-4 animate-reveal shadow-2xl">
             <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg></div>
             <div className="flex-1">
               <label className="text-[8px] font-black uppercase text-emerald-500/50 block mb-0.5">Library Entry Name</label>
               <input autoFocus type="text" value={tempRequestName} onChange={(e) => setTempRequestName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && confirmSaveToLibrary()} className="bg-transparent text-[13px] font-bold text-white outline-none w-full" placeholder="Name your request..." />
             </div>
             <div className="flex gap-2">
                <button onClick={() => setIsNamingRequest(false)} className="px-4 py-2 text-[10px] font-black uppercase text-slate-500 hover:text-slate-300">Cancel</button>
                <button onClick={confirmSaveToLibrary} className="px-6 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-lg shadow-lg">Save</button>
             </div>
          </div>
        ) : (
          <div className="glass-panel p-2 flex items-center gap-2 mb-6 border-l-4 shadow-2xl shrink-0 animate-fade" style={{ borderLeftColor: methodConfig.hex }}>
            <MethodSelector value={method} onChange={setMethod} />
            <UrlInput 
              value={url} 
              onChange={setUrl} 
              variables={activeVariables} 
              accentColor={methodConfig.hex} 
              placeholder="https://api.openai.com..." 
            />
            <div className="flex gap-2">
              <button onClick={() => setShowCurlImport(true)} title="Import cURL" className="h-11 w-11 flex items-center justify-center glass-card hover:bg-white/10 text-slate-400 hover:text-white active:scale-95 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </button>
              <button onClick={initSaveToLibrary} title="Save to Library" className="h-11 w-11 flex items-center justify-center glass-card hover:bg-white/10 text-slate-400 hover:text-emerald-400 active:scale-95 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
              </button>
              <button onClick={() => setShowBulk(true)} title="Bulk Transmit" className="h-11 w-11 flex items-center justify-center glass-card hover:bg-white/10 text-slate-400 hover:text-white active:scale-95 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
              </button>
              <button onClick={handleSend} disabled={loading} className="h-11 px-10 active:scale-95 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest text-white rounded-lg min-w-[140px] shadow-2xl" style={{ backgroundColor: methodConfig.hex }}>{loading ? "..." : methodConfig.label}</button>
            </div>
          </div>
        )}

        <div className="flex px-4 mb-2 justify-between items-center shrink-0">
          <div className="flex gap-2">
            {availableTabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`tab-btn transition-all duration-300 ${activeTab === tab ? 'active' : ''}`}>
                {tab === 'debug' ? 'Guide' : tab === 'monitor' ? 'Monitor' : tab}
                {tab === 'monitor' && isMonitorLive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'request' && (
            <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6 p-2 overflow-y-auto custom-scrollbar pb-20 animate-fade">
              <div className="glass-card p-6 flex flex-col min-h-[300px] border-t border-white/5 shadow-xl"><MemoizedHeaderManager headers={headers} setHeaders={setHeaders} accentColor={methodConfig.hex} variables={activeVariables} /></div>
              <div className="flex flex-col gap-4 overflow-hidden min-h-[400px]">
                <div className="flex justify-between px-4 shrink-0">
                  <div className="toggle-container">
                    <button onClick={() => setBodyMode('raw')} className={`toggle-item ${bodyMode === 'raw' ? 'active' : ''}`} style={bodyMode === 'raw' ? { color: methodConfig.hex } : {}}>Raw</button>
                    <button onClick={() => setBodyMode('builder')} className={`toggle-item ${bodyMode === 'builder' ? 'active' : ''}`} style={bodyMode === 'builder' ? { color: methodConfig.hex } : {}}>Architect</button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {bodyMode === 'raw' ? <MemoizedEditor value={body} onChange={setBody} variables={activeVariables} accentColor={methodConfig.hex} /> : <div className="h-full glass-card p-4 border-t border-white/5 shadow-xl"><MemoizedJsonBuilder fields={builderFields} setFields={setBuilderFields} variables={activeVariables} accentColor={methodConfig.hex} onInteraction={() => method === 'GET' && setMethod('POST')} /></div>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'monitor' && (
            <div className="h-full p-2 overflow-hidden animate-fade">
              <MonitoringTool 
                accentColor={methodConfig.hex}
                targetUrl={monitorUrl}
                setTargetUrl={setMonitorUrl}
                pingStatus={monitorStatus}
                history={monitorHistory}
                setHistory={setMonitorHistory}
                isAutoPing={isMonitorLive}
                setIsAutoPing={setIsMonitorLive}
                pingInterval={monitorInterval}
                setPingInterval={setMonitorInterval}
                onTestNow={checkHealth}
              />
            </div>
          )}

          {activeTab === 'debug' && (
            <div className="h-full p-2 overflow-y-auto custom-scrollbar animate-fade">
              <div className="max-w-4xl mx-auto py-4">
                <DevAssistant port={methodConfig.hex} accentColor={methodConfig.hex} />
              </div>
            </div>
          )}

          {activeTab === 'response' && (
            <div className="h-full flex flex-col gap-4 p-2 overflow-hidden animate-fade">
              <div className="grid grid-cols-3 gap-4 shrink-0">
                <div className="glass-card p-4 border-t border-white/5 shadow-lg">
                  <span className="section-label mb-1">Status</span>
                  <span className={`font-mono text-xl font-bold ${response?.status && response.status < 400 ? 'text-emerald-400' : 'text-rose-400'}`}>{response?.status || 'FAIL'}</span>
                </div>
                <div className="glass-card p-4 border-t border-white/5 shadow-lg">
                  <span className="section-label mb-1">Time</span>
                  <span className="font-mono text-xl font-bold text-slate-200">{response?.time || '--'}ms</span>
                </div>
                <div className="glass-card p-4 border-t border-white/5 shadow-lg">
                  <span className="section-label mb-1">Size</span>
                  <span className="font-mono text-xl font-bold text-slate-200">{response?.size ? (response.size / 1024).toFixed(2) : '0.00'}KB</span>
                </div>
              </div>
              <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 overflow-hidden">
                <div className="flex-[2] flex flex-col gap-2 overflow-hidden">
                  <div className="flex justify-between items-center mb-2 px-2 shrink-0">
                    <div className="toggle-container items-center">
                      <button onClick={() => setResponseMode('visual')} className={`toggle-item ${responseMode === 'visual' ? 'active' : ''}`}>Visual</button>
                      <button onClick={() => setResponseMode('raw')} className={`toggle-item ${responseMode === 'raw' ? 'active' : ''}`}>Raw</button>
                      {response && (
                         <div className="flex items-center bg-black/20 rounded-md px-2 border border-white/10 group ml-2 h-7 focus-within:border-white/20 transition-all">
                           <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Filter (e.g. id=5)..." className="bg-transparent text-[9px] font-black text-white outline-none w-36 placeholder:text-slate-700" />
                         </div>
                      )}
                    </div>
                    {response?.data && <button onClick={() => hydrateArchitect(response.data)} className="px-5 py-2.5 bg-[#10b981] hover:bg-emerald-400 text-white font-black text-[10px] uppercase tracking-widest rounded-lg transition-all shadow-lg active:scale-95">Hydrate Architect</button>}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    {error && (!response || response.status === 0) ? (
                      <ErrorDiagnosis error={error} method={method} url={url} headers={headers} body={body} accentColor={methodConfig.hex} responseData={response?.data} />
                    ) : (
                      responseMode === 'raw' ? (
                        <div className="h-full glass-card overflow-hidden border-t border-white/5 shadow-xl">
                          <MemoizedEditor value={JSON.stringify(response?.data, null, 2)} readOnly variables={activeVariables} accentColor={methodConfig.hex} />
                        </div>
                      ) : (
                        <div className="h-full glass-card p-4 overflow-hidden border-t border-white/5 shadow-xl">
                          <MemoizedResponseViewer 
                            data={response?.data} 
                            status={response?.status} 
                            accentColor={methodConfig.hex} 
                            searchTerm={searchTerm} 
                            onAddHeader={handleAddHeaderShortcut}
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div className="flex-1 glass-card p-6 flex flex-col overflow-hidden border-t border-white/5 bg-white/[0.01] shadow-xl">
                  <h3 className="section-label border-b border-white/5 pb-3 shrink-0">Response Headers</h3>
                  <div className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar mt-4">
                    {response ? Object.entries(response.headers).map(([k,v]) => (
                      <div key={k} className="group relative">
                        <div className="text-[7px] text-slate-600 font-black uppercase tracking-widest mb-1.5 flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-white/20"></div>{k}</div>
                        <div className="text-[10px] text-slate-400 font-mono break-all glass-card p-3 shadow-inner bg-black/20">{v}</div>
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