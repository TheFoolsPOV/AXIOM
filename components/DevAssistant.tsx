import React from 'react';
import Editor from './Editor';

interface DevAssistantProps {
  port: string;
  accentColor: string;
}

const DevAssistant: React.FC<DevAssistantProps> = ({ port, accentColor }) => {
  const corsCode = `// Program.cs (.NET 6+)
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
    <div className="space-y-8 animate-fade pb-20">
      <div className="glass-panel border-purple-500/30 bg-purple-500/[0.03] p-8 rounded-3xl shadow-2xl shadow-purple-500/10">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
          </div>
          <div>
            <h2 className="text-white font-black text-2xl tracking-tighter uppercase">C# Connectivity Helper</h2>
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-[0.3em]">Bypass CORS for local development</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-purple-300 font-black text-xs uppercase tracking-widest mb-3">Setup: Program.cs</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Add this code to your C# backend. It allows Axiom to communicate with your localhost.
              </p>
              
              <div className="h-[320px] relative">
                <Editor 
                  value={corsCode} 
                  language="csharp" 
                  readOnly 
                  maxHeight="320px"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
              <h3 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                Mixed Content Fix
              </h3>
              <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
                <p>
                  Browsers block HTTP calls from HTTPS sites. Since your local API is likely <code className="text-amber-300 font-mono">http://</code>, follow these steps:
                </p>
                <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                  <ol className="list-decimal list-inside space-y-2 text-[11px] font-medium text-slate-300">
                    <li>Click 🔒 <strong>Lock</strong> icon in URL bar.</li>
                    <li>Open <strong>Site Settings</strong>.</li>
                    <li>Set <strong>Insecure Content</strong> to <strong>Allow</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="p-6 bg-purple-500/5 border border-purple-500/10 rounded-2xl">
              <h4 className="text-[10px] text-purple-400/80 font-bold uppercase mb-1">Target Port</h4>
              <p className="text-2xl font-black text-white tracking-tighter">localhost:{port}</p>
              <p className="text-[9px] text-slate-600 mt-2 uppercase tracking-widest italic">Axiom is ready for traffic.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevAssistant;