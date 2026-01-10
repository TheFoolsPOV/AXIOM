
import React from 'react';

interface ResponseViewerProps {
  data: any;
  accentColor: string;
  searchTerm?: string;
}

const ResponseViewer: React.FC<ResponseViewerProps> = ({ data, accentColor, searchTerm = '' }) => {
  const normalizedSearch = searchTerm.toLowerCase();

  const renderSimpleValue = (val: any) => {
    if (val === null) return <span className="token-null">null</span>;
    if (typeof val === 'boolean') return <span className="token-boolean">{val.toString()}</span>;
    if (typeof val === 'number') return <span className="token-number">{val}</span>;
    if (typeof val === 'string') {
      const isMatch = normalizedSearch && val.toLowerCase().includes(normalizedSearch);
      return <span className={`token-string ${isMatch ? 'bg-yellow-500/20 ring-1 ring-yellow-500/30 rounded px-0.5' : ''}`}>"{val}"</span>;
    }
    return String(val);
  };

  const ObjectRecord: React.FC<{ obj: any, index?: number }> = ({ obj, index }) => {
    const entries = Object.entries(obj);
    
    const hasMatch = entries.some(([k, v]) => 
      k.toLowerCase().includes(normalizedSearch) || 
      String(v).toLowerCase().includes(normalizedSearch)
    );

    if (normalizedSearch && !hasMatch) return null;

    return (
      <div className="glass-card bg-white/[0.01] border border-white/[0.04] rounded-2xl overflow-hidden mb-6 group hover:border-white/10 transition-all animate-reveal">
        <div className="bg-white/[0.02] px-6 py-3 border-b border-white/[0.04] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}></span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {index !== undefined ? `Record #${index + 1}` : 'Object Data'}
            </span>
          </div>
          <span className="text-[9px] font-black text-white uppercase px-2.5 py-1 rounded-md border shadow-sm tracking-tighter" style={{ backgroundColor: `${accentColor}22`, borderColor: `${accentColor}44`, color: accentColor }}>
            OBJECT
          </span>
        </div>
        <div className="divide-y divide-white/[0.03]">
          {entries.map(([key, value]) => {
            const keyMatch = normalizedSearch && key.toLowerCase().includes(normalizedSearch);
            return (
              <div key={key} className="flex items-start px-6 py-4 hover:bg-white/[0.01] transition-colors">
                <div className="w-1/3 pr-4">
                  <div className={`text-[10px] font-black uppercase tracking-widest truncate ${keyMatch ? 'text-white bg-white/10 rounded px-1' : 'text-slate-500'}`} title={key}>
                    {key}
                  </div>
                  <div className="text-[7px] font-mono text-slate-700 uppercase mt-1">
                    {Array.isArray(value) ? 'array' : typeof value}
                  </div>
                </div>
                <div className="flex-1 text-[12px] leading-relaxed break-all font-medium text-slate-300">
                  {typeof value === 'object' && value !== null ? (
                    Array.isArray(value) ? (
                      <div className="flex gap-2 flex-wrap">
                        {value.map((v, i) => (
                          <div key={i} className="bg-white/5 px-2 py-1 rounded text-[10px] border border-white/5">
                            {typeof v === 'object' ? '{...}' : renderSimpleValue(v)}
                          </div>
                        ))}
                        {value.length === 0 && <span className="text-slate-800 italic">[ Empty Array ]</span>}
                      </div>
                    ) : (
                      <pre className="text-[10px] text-slate-400 bg-black/40 p-3 rounded-xl custom-scrollbar max-h-40 overflow-auto border border-white/5">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    )
                  ) : (
                    renderSimpleValue(value)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderData = () => {
    if (data === null || data === undefined) return <div className="text-slate-800 italic p-6">No Data</div>;

    if (Array.isArray(data)) {
      const filtered = data.map((item, i) => (
        typeof item === 'object' && item !== null ? (
          <ObjectRecord key={i} obj={item} index={i} />
        ) : (
          <div key={i} className="glass-card p-4 bg-white/[0.01] mb-2 border border-white/[0.04]">
            {renderSimpleValue(item)}
          </div>
        )
      )).filter(Boolean);

      return (
        <div className="space-y-6">
          {filtered}
          {filtered.length === 0 && (
            <div className="py-20 text-center opacity-20 uppercase font-black tracking-widest text-slate-600">
              {normalizedSearch ? "No items matching filter" : "Empty Collection"}
            </div>
          )}
          <div className="py-10 border-t border-white/[0.05] flex flex-col items-center gap-3 opacity-10">
              <div className="w-10 h-10 rounded-full border border-dashed border-white/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              </div>
              <span className="text-[8px] font-black uppercase tracking-[0.3em]">End of results</span>
          </div>
        </div>
      );
    }

    if (typeof data === 'object') {
      return (
        <div className="space-y-6">
          <ObjectRecord obj={data} />
        </div>
      );
    }

    return (
      <div className="glass-card p-12 text-center bg-white/[0.01] rounded-3xl border border-white/5">
        <div className="text-3xl font-mono tracking-tighter text-white mb-2">{renderSimpleValue(data)}</div>
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Single Value Response</p>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto pr-2 custom-scrollbar pb-20 px-1 relative">
      {renderData()}
    </div>
  );
};

export default ResponseViewer;
