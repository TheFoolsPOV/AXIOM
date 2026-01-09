
import React, { useState } from 'react';
import { HttpMethod, KeyValuePair } from '../types';

interface BulkTransmitProps {
  url: string;
  method: HttpMethod;
  headers: KeyValuePair[];
  variables: { key: string; value: string }[];
  onComplete: (results: any[]) => void;
  onClose: () => void;
  accentColor: string;
}

const BulkTransmit: React.FC<BulkTransmitProps> = ({ url, method, headers, variables, onComplete, onClose, accentColor }) => {
  const [data, setData] = useState('');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<{ status: number; text: string }[]>([]);

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

  const runBulk = async () => {
    let payloadArray;
    try {
      payloadArray = JSON.parse(data);
      if (!Array.isArray(payloadArray)) throw new Error("Input must be a JSON array.");
    } catch (e: any) {
      alert("Invalid JSON Array: " + e.message);
      return;
    }

    setIsTransmitting(true);
    setLogs([]);
    const results = [];
    const headerObj: Record<string, string> = {};
    headers.filter(h => h.enabled && h.key && h.value).forEach(h => { 
      headerObj[injectVars(h.key)] = injectVars(h.value); 
    });

    const targetUrl = injectVars(url);

    for (let i = 0; i < payloadArray.length; i++) {
      try {
        const res = await fetch(targetUrl, {
          method,
          headers: headerObj,
          body: JSON.stringify(payloadArray[i])
        });
        const status = res.status;
        setLogs(prev => [...prev, { status, text: `Record ${i + 1}: ${res.statusText}` }]);
        results.push({ index: i, status });
      } catch (err: any) {
        setLogs(prev => [...prev, { status: 0, text: `Record ${i + 1}: Failed - ${err.message}` }]);
      }
      setProgress(Math.round(((i + 1) / payloadArray.length) * 100));
    }

    setIsTransmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade">
      <div className="glass-panel w-full max-w-2xl rounded-2xl flex flex-col overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border-white/10">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div>
            <h2 className="text-white font-black text-sm tracking-tighter uppercase">Mass Transmit Engine</h2>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Batch Processing Mode</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-500 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 p-8 flex flex-col gap-6 overflow-hidden">
          {!isTransmitting ? (
            <>
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Enter a JSON array. Axiom will execute a <span className="font-bold" style={{ color: accentColor }}>{method}</span> for each object to:
                </p>
                <div className="bg-black/40 p-2 rounded border border-white/5 font-mono text-[10px] text-blue-400 truncate">
                  {url}
                </div>
              </div>
              <textarea
                value={data}
                onChange={(e) => setData(e.target.value)}
                placeholder='[{"id": 1, "name": "Item A"}, {"id": 2, "name": "Item B"}]'
                className="flex-1 bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-[12px] text-emerald-400 outline-none focus:border-white/20 transition-all custom-scrollbar resize-none"
              />
              <button
                onClick={runBulk}
                className="py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-white transition-all active:scale-95 shadow-2xl hover:brightness-110"
                style={{ backgroundColor: accentColor }}
              >
                Initiate Batch Transmission
              </button>
            </>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="mb-8">
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">
                  <span>Progress</span>
                  <span style={{ color: accentColor }}>{progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.2)]" style={{ width: `${progress}%`, backgroundColor: accentColor }}></div>
                </div>
              </div>
              <div className="flex-1 bg-black/60 rounded-xl p-4 overflow-y-auto custom-scrollbar space-y-2 border border-white/5 shadow-inner">
                {logs.length === 0 && <div className="text-[10px] text-slate-700 font-mono italic">Waiting for response...</div>}
                {logs.map((log, i) => (
                  <div key={i} className="flex gap-3 text-[10px] font-mono border-b border-white/[0.03] pb-2 last:border-0 animate-fade">
                    <span className={log.status >= 200 && log.status < 300 ? 'text-emerald-400' : 'text-rose-400'}>
                      [{log.status === 0 ? 'FAIL' : log.status}]
                    </span>
                    <span className="text-slate-400">{log.text}</span>
                  </div>
                ))}
              </div>
              {progress === 100 && (
                <button onClick={onClose} className="mt-6 py-3 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                  Close Engine
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkTransmit;
