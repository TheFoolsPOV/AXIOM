
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
      return <span className={`token-string ${isMatch ? 'bg-yellow-500/20 ring-1 ring-yellow-500/30 rounded' : ''}`}>"{val}"</span>;
    }
    return String(val);
  };

  const ObjectRecord: React.FC<{ obj: any, index?: number }> = ({ obj, index }) => {
    const entries = Object.entries(obj);
    
    // Check if this record matches the search
    const hasMatch = entries.some(([k, v]) => 
      k.toLowerCase().includes(normalizedSearch) || 
      String(v).toLowerCase().includes(normalizedSearch)
    );

    if (normalizedSearch && !hasMatch) return null;

    return (
      <div className="glass-card bg-white/[0.01] border border-white/[0.04] rounded-2xl overflow-hidden mb-6 group hover:border-white/10 transition-all animate-reveal">
        {index !== undefined && (
          <div className="bg-white/[0.02] px-6 py-2 border-b border-white/[0.04] flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Record #{index + 1}</span>
            <span className="text-[7px] font-mono text-slate-800 uppercase px-1.5 py-0.5 rounded bg-white/5">Object</span>
          </div>
        )}
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
                <div className="flex-1 text-[12px] leading-relaxed break-all">
                  {typeof value === 'object' && value !== null ? (
                    Array.isArray(value) ? (
                      <div className="flex gap-2 flex-wrap">
                        {value.map((v, i) => (
                          <div key={i} className="bg-white/5 px-2 py-1 rounded text-[10px]">
                            {typeof v === 'object' ? '{...}' : renderSimpleValue(v)}
                          </div>
                        ))}
                        {value.length === 0 && <span className="text-slate-800 italic">[ Empty Array ]</span>}
                      </div>
                    ) : (
                      <pre className="text-[10px] text-slate-400 bg-black/20 p-2 rounded-lg">
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
          <div key={i} className="glass-card p-4 bg-white/[0.01] mb-2">
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
        </div>
      );
    }

    if (typeof data === 'object') {
      return <ObjectRecord obj={data} />;
    }

    return (
      <div className="glass-card p-8 text-center bg-white/[0.01]">
        <div className="text-2xl font-mono">{renderSimpleValue(data)}</div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto pr-2 custom-scrollbar pb-10 px-1">
      {renderData()}
    </div>
  );
};

export default ResponseViewer;
