import React, { useMemo } from 'react';
import { PingResult } from '../types';

interface MonitorToolProps {
  accentColor: string;
  targetUrl: string;
  setTargetUrl: (url: string) => void;
  pingStatus: 'idle' | 'checking' | 'up' | 'down';
  history: PingResult[];
  setHistory: (history: PingResult[]) => void;
  isAutoPing: boolean;
  setIsAutoPing: (val: boolean) => void;
  pingInterval: number;
  setPingInterval: (val: number) => void;
  onTestNow: () => void;
}

const MonitorTool: React.FC<MonitorToolProps> = ({ 
  accentColor,
  targetUrl,
  setTargetUrl,
  pingStatus,
  history,
  setHistory,
  isAutoPing,
  setIsAutoPing,
  pingInterval,
  setPingInterval,
  onTestNow
}) => {
  const stats = useMemo(() => {
    if (history.length === 0) return { avg: 0, uptime: 0, success: 0, fail: 0, peak: 0 };
    const success = history.filter(h => h.status === 'up');
    const avg = success.length > 0 ? Math.round(success.reduce((acc, curr) => acc + curr.latency, 0) / success.length) : 0;
    const uptime = Math.round((success.length / history.length) * 100);
    const peak = Math.max(...history.map(h => h.latency));
    return { avg, uptime, success: success.length, fail: history.length - success.length, peak };
  }, [history]);

  // SVG Graph Logic
  const graphPoints = useMemo(() => {
    if (history.length < 2) return "";
    const width = 800;
    const height = 100;
    const maxLatency = Math.max(stats.peak, 100);
    const data = [...history].reverse();
    const step = width / (data.length - 1);
    
    return data.map((h, i) => {
      const x = i * step;
      const y = h.status === 'up' ? height - (h.latency / maxLatency) * height : height;
      return `${x},${y}`;
    }).join(" ");
  }, [history, stats.peak]);

  return (
    <div className="h-full flex flex-col gap-4 animate-fade overflow-hidden max-w-6xl mx-auto w-full">
      {/* HEADER SECTION */}
      <div className="shrink-0 flex flex-col lg:flex-row gap-4">
        <div className="flex-[2] glass-panel p-4 border-t-2 shadow-xl transition-all" style={{ borderTopColor: accentColor }}>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="section-label !mb-0 text-[9px]">Endpoint Health Monitor</h3>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5 opacity-60">Real-time Telemetry</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/5">
                 {[2000, 5000, 10000].map(ms => (
                   <button 
                    key={ms} 
                    onClick={() => setPingInterval(ms)}
                    className={`px-2 py-0.5 text-[7px] font-black uppercase rounded transition-all ${pingInterval === ms ? 'bg-white/10 text-white' : 'text-slate-600 hover:text-slate-400'}`}
                   >
                     {ms/1000}s
                   </button>
                 ))}
               </div>
               <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black uppercase text-slate-500">Live</span>
                  <button 
                    onClick={() => setIsAutoPing(!isAutoPing)}
                    className={`w-8 h-4 rounded-full relative transition-all ${isAutoPing ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-slate-800'}`}
                  >
                    <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${isAutoPing ? 'left-5' : 'left-0.5'}`}></div>
                  </button>
               </div>
            </div>
          </div>
          
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative group">
              <input 
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://api.domain.com/health"
                className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-white font-mono text-[11px] outline-none focus:border-white/10 group-hover:bg-black/60 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${pingStatus === 'up' ? 'bg-emerald-500 animate-pulse' : pingStatus === 'down' ? 'bg-rose-500' : 'bg-slate-700'}`}></div>
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">{pingStatus}</span>
              </div>
            </div>
            <button 
              onClick={onTestNow}
              disabled={pingStatus === 'checking'}
              className="px-6 rounded-lg font-black text-[9px] uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: accentColor }}
            >
              {pingStatus === 'checking' ? '...' : 'Test Now'}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Last result', value: history[0]?.latency ? `${history[0].latency}ms` : '---', color: history[0]?.status === 'up' ? 'text-emerald-500' : history[0]?.status === 'down' ? 'text-rose-500' : 'text-slate-400' },
              { label: 'Average', value: `${stats.avg}ms`, color: 'text-white' },
              { label: 'Uptime', value: `${stats.uptime}%`, color: 'text-emerald-500' },
              { label: 'Samples', value: history.length, color: 'text-blue-400' }
            ].map((stat, i) => (
              <div key={i} className="p-2.5 glass-card bg-black/20 border-white/[0.04]">
                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-0.5 block">{stat.label}</span>
                <span className={`text-[12px] font-black ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GRAPH SECTION */}
      <div className="shrink-0 glass-panel p-4 overflow-hidden border-t border-white/5">
        <h3 className="section-label mb-3 text-[9px]">Latency Profile (ms)</h3>
        <div className="relative h-24 w-full bg-black/40 rounded-lg border border-white/5 overflow-hidden">
          <div className="absolute inset-0 flex flex-col justify-between opacity-5">
            {[1,2,3].map(i => <div key={i} className="w-full h-px bg-white"></div>)}
          </div>
          <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 800 100">
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity="0.8" />
                <stop offset="100%" stopColor={accentColor} stopOpacity="0.1" />
              </linearGradient>
            </defs>
            {graphPoints && (
              <>
                <polyline
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={graphPoints}
                  className="transition-all duration-500"
                />
                <polyline
                  fill={`url(#lineGrad)`}
                  opacity="0.1"
                  points={`${graphPoints} 800,100 0,100`}
                  className="transition-all duration-500"
                />
              </>
            )}
          </svg>
          {history.length < 2 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
               <span className="text-[8px] font-black uppercase tracking-widest italic">Awaiting Telemetry...</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* EVENT LOG */}
        <div className="lg:col-span-8 glass-panel p-4 flex flex-col min-h-0 overflow-hidden border-t border-white/5">
          <div className="flex justify-between items-center mb-3 shrink-0">
            <h3 className="section-label !mb-0 text-[9px]">Status History</h3>
            <button onClick={() => setHistory([])} className="text-[7px] font-black uppercase text-slate-600 hover:text-rose-500 transition-colors">Clear</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between p-2 glass-card bg-black/20 border-white/[0.04] animate-reveal hover:bg-black/40 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`w-1 h-1 rounded-full ${h.status === 'up' ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'}`}></div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-300 font-mono leading-none mb-0.5">{new Date(h.timestamp).toLocaleTimeString()}</span>
                    <span className={`text-[7px] font-black uppercase tracking-tighter leading-none ${h.status === 'up' ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>{h.code}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                   {h.status === 'up' && (
                     <div className="h-0.5 w-16 bg-white/5 rounded-full overflow-hidden hidden md:block">
                       <div className="h-full bg-emerald-500/50" style={{ width: `${Math.min(100, (h.latency / 500) * 100)}%` }}></div>
                     </div>
                   )}
                   <span className="text-[10px] font-black font-mono text-slate-400 w-12 text-right">{h.latency > 0 ? `${h.latency}ms` : '---'}</span>
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                <p className="text-[8px] font-black uppercase tracking-widest">Awaiting records</p>
              </div>
            )}
          </div>
        </div>

        {/* QUICK DIAGNOSTICS */}
        <div className="lg:col-span-4 glass-panel p-4 flex flex-col gap-3 border-t border-white/5">
          <h3 className="section-label mb-1 text-[9px]">Diagnostics</h3>
          <div className="flex-1 flex flex-col gap-3">
            {[
              { label: 'Peak Latency', value: `${stats.peak}ms`, color: 'text-white' },
              { label: 'Total Failures', value: stats.fail, color: 'text-rose-500' },
              { label: 'System Health', value: stats.uptime > 95 ? 'Stable' : 'Unstable', color: stats.uptime > 95 ? 'text-emerald-400' : 'text-amber-400' }
            ].map((diag, i) => (
              <div key={i} className="flex-1 p-3 bg-white/[0.01] border border-white/5 rounded-lg flex flex-col justify-center">
                 <h4 className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">{diag.label}</h4>
                 <p className={`text-[13px] font-black ${diag.color}`}>{diag.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitorTool;