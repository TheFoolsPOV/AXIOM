
import React from 'react';

interface Variable {
  key: string;
  value: string;
}

interface VariableManagerProps {
  variables: Variable[];
  setVariables: (vars: Variable[]) => void;
}

const VariableManager: React.FC<VariableManagerProps> = ({ variables, setVariables }) => {
  const addVariable = () => setVariables([...variables, { key: '', value: '' }]);
  const removeVariable = (index: number) => setVariables(variables.filter((_, i) => i !== index));
  const updateVariable = (index: number, field: keyof Variable, val: string) => {
    const next = [...variables];
    // Fix: Create a new object to avoid direct state mutation within the array
    next[index] = { ...next[index], [field]: val };
    setVariables(next);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Environment Variables</h3>
        <button onClick={addVariable} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase px-2 py-1 bg-blue-500/10 rounded border border-blue-500/20">
          + Add Key
        </button>
      </div>
      
      {/* Explanation Section */}
      <div className="mb-4 p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
        <p className="text-[10px] text-slate-500 leading-relaxed italic">
          {/* Fix: Wrapped {{key}} in quotes to prevent JSX parser from interpreting it as an invalid object shorthand literal */}
          Variables act as dynamic placeholders. Reference them anywhere using <code className="text-blue-400 font-bold">{"{{key}}"}</code> syntax. 
          Perfect for switching between <code className="text-slate-400">localhost</code> and <code className="text-slate-400">production</code> environments without rewriting your requests.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {variables.map((v, i) => (
          <div key={i} className="flex gap-2 items-center group">
            <input 
              placeholder="key (e.g. host)"
              value={v.key}
              onChange={e => updateVariable(i, 'key', e.target.value)}
              className="w-1/3 p-2 text-[11px] bg-black/20 border border-white/5 rounded text-slate-200 focus:border-blue-500/30 outline-none transition-all"
            />
            <input 
              placeholder="value"
              value={v.value}
              onChange={e => updateVariable(i, 'value', e.target.value)}
              className="flex-1 p-2 text-[11px] bg-black/20 border border-white/5 rounded text-slate-400 focus:border-blue-500/30 outline-none transition-all"
            />
            <button onClick={() => removeVariable(i)} className="text-slate-700 hover:text-rose-500 p-1 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        ))}
        {variables.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 border border-dashed border-white/5 rounded-lg">
             <p className="text-[10px] text-slate-700 font-medium uppercase tracking-widest">No keys defined</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VariableManager;
