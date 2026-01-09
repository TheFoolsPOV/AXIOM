
import React from 'react';

interface DevAssistantProps {
  port: string;
  accentColor: string;
}

const DevAssistant: React.FC<DevAssistantProps> = ({ port, accentColor }) => {
  const csCode = `// Program.cs (.NET 6+)
var builder = WebApplication.CreateBuilder(args);

// 1. ADD THIS SERVICE
builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy => {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// 2. ENABLE THE MIDDLEWARE
app.UseCors(); // Must be before MapControllers

app.MapControllers();
app.Run();`;

  return (
    <div className="space-y-6 animate-fade">
      <div className="glass-panel border-purple-500/30 bg-purple-500/[0.03] p-8 rounded-3xl shadow-2xl shadow-purple-500/10">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
          </div>
          <div>
            <h2 className="text-white font-black text-2xl tracking-tighter uppercase">Local Connectivity Hub</h2>
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-[0.3em]">Bypass browser security for C# development</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-purple-300 font-black text-xs uppercase tracking-widest mb-3">Step 1: Configure CORS</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Browsers block web-to-local calls by default. Your C# API must explicitly signal that it trusts Axiom Pro.
              </p>
              
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative">
                  <pre className="p-5 bg-black/60 rounded-xl border border-white/5 font-mono text-[11px] text-slate-300 overflow-x-auto custom-scrollbar leading-relaxed">
                    {csCode}
                  </pre>
                  <button 
                    onClick={() => navigator.clipboard.writeText(csCode)}
                    className="absolute top-3 right-3 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all text-[10px] font-black uppercase border border-white/5"
                  >
                    Copy Snippet
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
              <h3 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                Mixed Content Warning
              </h3>
              <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
                <p>
                  Since this workbench is hosted on <code className="text-blue-300 font-mono">https://</code>, but your local API likely uses <code className="text-amber-300 font-mono">http://</code>, Chrome will block the request as "Mixed Content".
                </p>
                <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                  <p className="text-[10px] font-black text-white uppercase mb-2">The One-Time Fix:</p>
                  <ol className="list-decimal list-inside space-y-2 text-[11px] font-medium text-slate-300">
                    <li>Click the 🔒 <strong>Lock</strong> in the URL bar.</li>
                    <li>Select <strong>Site Settings</strong>.</li>
                    <li>Find <strong>Insecure Content</strong> (at the bottom).</li>
                    <li>Set it to <strong>Allow</strong>.</li>
                    <li>Refresh this page.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="p-6 bg-purple-500/5 border border-purple-500/10 rounded-2xl">
              <h4 className="text-[10px] text-purple-400/80 font-bold uppercase mb-2">Detected Port</h4>
              <p className="text-xl font-black text-white">{port}</p>
              <p className="text-[10px] text-slate-500 mt-1 italic">Axiom is actively monitoring this port for local traffic.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevAssistant;
