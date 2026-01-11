import React, { useRef } from 'react';

interface WorkbenchPortabilityProps {
  onImport: (data: any) => void;
  accentColor: string;
}

const WorkbenchPortability: React.FC<WorkbenchPortabilityProps> = ({ onImport, accentColor }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = {
      history: JSON.parse(localStorage.getItem('axiom_history_v3') || '[]'),
      library: JSON.parse(localStorage.getItem('axiom_library') || '[]'),
      environments: JSON.parse(localStorage.getItem('axiom_environments') || '[]'),
      activeEnvId: localStorage.getItem('axiom_active_env_id'),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axiom-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 glass-card bg-black/40 border-white/[0.04]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Portability</h3>
          <p className="text-[7px] text-slate-700 font-bold uppercase tracking-[0.2em] italic">Backup & Restore</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="p-2.5 glass-card !rounded-xl text-slate-600 hover:text-white transition-all bg-white/[0.02]" title="Backup Workspace">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="p-2.5 glass-card !rounded-xl text-slate-600 hover:text-white transition-all bg-white/[0.02]" title="Restore Workspace">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </button>
        </div>
      </div>
      <input 
        ref={fileInputRef}
        type="file" 
        accept=".json" 
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const r = new FileReader();
          r.onload = (ev) => {
            try { onImport(JSON.parse(ev.target?.result as string)); }
            catch (err) { alert('Invalid backup file.'); }
          };
          r.readAsText(file);
        }} 
        className="hidden" 
      />
    </div>
  );
};

export default WorkbenchPortability;