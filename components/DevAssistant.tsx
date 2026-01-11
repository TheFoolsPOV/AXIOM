import React from 'react';

interface DevAssistantProps {
  port: string;
  accentColor: string;
}

const DevAssistant: React.FC<DevAssistantProps> = ({ port, accentColor }) => {
  return (
    <div className="space-y-8 animate-fade pb-60">
      <div className="glass-panel p-8 border-t-4 bg-black/20 relative overflow-hidden" style={{ borderTopColor: accentColor }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.01] rounded-full blur-3xl -mr-32 -mt-32"></div>
        
        <div className="flex items-center gap-6 mb-12 pb-10 border-b border-white/5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner relative" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
            <div className="absolute inset-0 bg-current opacity-5 blur-xl"></div>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
          <div>
            <h2 className="text-white font-black text-2xl tracking-tighter uppercase leading-none mb-1">Connectivity Guide</h2>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Bypassing Security for Local Testing</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          <div className="space-y-8">
            <section>
              <h3 className="section-label">CORS Security Policy</h3>
              <p className="text-[13px] text-slate-400 leading-relaxed mb-6 font-medium">
                When testing APIs from a web client, you often hit <strong className="text-slate-200">Cross-Origin Resource Sharing</strong> restrictions. Browsers block scripts from making requests to different domains unless explicitly permitted.
              </p>
              
              <div className="glass-card bg-black/60 p-6 border-white/5 font-mono text-[11px] relative overflow-hidden group">
                <div className="space-y-1 relative z-10">
                  <span className="text-slate-600 select-none italic font-sans">// Example Headers needed from server</span><br/>
                  <div className="mt-2 space-y-0.5">
                    <span className="text-blue-400">Access-Control-Allow-Origin:</span> <span className="text-emerald-400">*</span><br/>
                    <span className="text-blue-400">Access-Control-Allow-Methods:</span> <span className="text-emerald-400">GET, POST, PUT, DELETE</span><br/>
                    <span className="text-blue-400">Access-Control-Allow-Headers:</span> <span className="text-emerald-400">Content-Type, Auth</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-10">
            <section className="bg-amber-500/[0.03] border border-amber-500/10 rounded-2xl p-6 relative overflow-hidden">
              <h3 className="text-amber-500 font-black text-[11px] uppercase tracking-[0.2em] mb-5 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Mixed Content Block
              </h3>
              
              <p className="text-[12px] text-slate-400 leading-relaxed mb-6 font-medium">
                Axiom runs on HTTPS. Browsers block calls to local <code className="text-amber-400/80 px-1 bg-amber-500/10 rounded">http://</code> APIs by default. Resolve this manually in Chrome:
              </p>

              <div className="space-y-3">
                {[
                  { n: "01", text: "Click the 🔒 icon in the URL address bar" },
                  { n: "02", text: "Open the 'Site Settings' dashboard" },
                  { n: "03", text: "Set 'Insecure Content' to 'Allow'" }
                ].map(step => (
                  <div key={step.n} className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5 hover:border-amber-500/20 transition-all">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20">{step.n}</span>
                    <span className="text-[11px] text-slate-300 font-bold tracking-tight">{step.text}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="p-6 glass-card bg-black/40 border-white/5 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <div>
              <h4 className="text-[8px] text-slate-600 font-black uppercase tracking-[0.3em] mb-1">Connection State</h4>
              <p className="text-xl font-black text-white tracking-tighter uppercase">Local Environment</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_#10b981]"></div>
              <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
            </div>
            <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Listening...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevAssistant;