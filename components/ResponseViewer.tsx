import React, { useMemo } from 'react';

interface ResponseViewerProps {
  data: any;
  status?: number;
  accentColor: string;
  searchTerm?: string;
}

const ResponseViewer: React.FC<ResponseViewerProps> = ({ data, status = 200, accentColor, searchTerm = '' }) => {
  const normalizedSearch = searchTerm.toLowerCase();
  const isError = status >= 400;

  const renderSimpleValue = (val: any) => {
    if (val === null) return <span className="token-null">null</span>;
    if (typeof val === 'boolean') return <span className="token-boolean">{val.toString()}</span>;
    if (typeof val === 'number') return <span className="token-number">{val}</span>;
    if (typeof val === 'string') {
      const isMatch = normalizedSearch && val.toLowerCase().includes(normalizedSearch);
      return <span className={`token-string ${isMatch ? 'bg-yellow-500/20 ring-1 ring-yellow-500/30 rounded px-0.5 text-white' : ''}`}>"{val}"</span>;
    }
    return String(val);
  };

  const ObjectRecord: React.FC<{ obj: any, index?: number, forceErrorTheme?: boolean }> = ({ obj, index, forceErrorTheme = false }) => {
    const entries = Object.entries(obj);
    const hasMatch = useMemo(() => {
      if (!normalizedSearch) return true;
      const checkMatch = (item: any): boolean => {
        if (typeof item === 'string') return item.toLowerCase().includes(normalizedSearch);
        if (typeof item === 'number' || typeof item === 'boolean') return String(item).toLowerCase().includes(normalizedSearch);
        if (typeof item === 'object' && item !== null) {
          return Object.entries(item).some(([k, v]) => 
            k.toLowerCase().includes(normalizedSearch) || checkMatch(v)
          );
        }
        return false;
      };
      return checkMatch(obj);
    }, [obj, normalizedSearch]);

    if (normalizedSearch && !hasMatch) return null;

    const themeColor = forceErrorTheme ? '#f43f5e' : accentColor;

    return (
      <div className={`glass-card bg-white/[0.01] border rounded-2xl overflow-hidden mb-6 group transition-all animate-reveal ${forceErrorTheme ? 'border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.05)]' : 'border-white/[0.04] hover:border-white/10'}`}>
        <div className={`bg-white/[0.02] px-6 py-3 border-b flex justify-between items-center ${forceErrorTheme ? 'border-rose-500/20' : 'border-white/[0.04]'}`}>
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }}></span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {index !== undefined ? `Record #${index + 1}` : (forceErrorTheme ? 'Fault Details' : 'Object Data')}
            </span>
          </div>
          <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-md border tracking-tighter" style={{ backgroundColor: `${themeColor}22`, borderColor: `${themeColor}44`, color: themeColor }}>
            {forceErrorTheme ? 'EXCEPTION' : 'OBJECT'}
          </span>
        </div>
        <div className={`divide-y ${forceErrorTheme ? 'divide-rose-500/10' : 'divide-white/[0.03]'}`}>
          {entries.map(([key, value]) => {
            const keyMatch = normalizedSearch && key.toLowerCase().includes(normalizedSearch);
            return (
              <div key={key} className="flex items-start px-6 py-4 hover:bg-white/[0.01] transition-colors">
                <div className="w-1/3 pr-4">
                  <div className={`text-[10px] font-black uppercase tracking-widest truncate ${keyMatch ? 'text-white bg-white/20 rounded px-1' : (forceErrorTheme ? 'text-rose-400/70' : 'text-slate-500')}`} title={key}>
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
                          <div key={i} className={`bg-white/5 px-2 py-1 rounded text-[10px] border ${forceErrorTheme ? 'border-rose-500/10' : 'border-white/5'}`}>
                            {typeof v === 'object' ? '{...}' : renderSimpleValue(v)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <pre className={`text-[10px] p-3 rounded-xl border max-h-40 overflow-auto ${forceErrorTheme ? 'bg-rose-500/[0.05] border-rose-500/20 text-rose-200' : 'bg-black/40 border-white/5 text-slate-400'}`}>
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

  const renderErrorReport = (errorObj: any) => {
    // Check for standard RFC 7807 fields
    const title = errorObj.title || errorObj.error || 'Server Fault';
    const detail = errorObj.detail || errorObj.message;
    const errors = errorObj.errors; // Dictionary of field -> messages

    return (
      <div className="space-y-6 animate-reveal">
        <div className="glass-card bg-rose-500/[0.03] border border-rose-500/20 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-500 shadow-inner">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div>
              <h2 className="text-rose-400 font-black text-2xl tracking-tighter uppercase">{title}</h2>
              <p className="text-[10px] text-rose-500/60 font-bold uppercase tracking-[0.3em]">Status Code {status}</p>
            </div>
          </div>
          
          {detail && (
            <div className="bg-black/40 rounded-2xl p-5 border border-rose-500/10 mb-6 shadow-inner relative z-10">
              <p className="text-[13px] text-slate-300 font-medium leading-relaxed">{detail}</p>
            </div>
          )}

          {errors && typeof errors === 'object' && (
             <div className="space-y-3 relative z-10">
                <h4 className="text-[10px] font-black text-rose-500/50 uppercase tracking-widest mb-4">Model Validation Faults</h4>
                {Object.entries(errors).map(([field, msgs]) => (
                   <div key={field} className="bg-rose-500/[0.05] border border-rose-500/10 rounded-2xl p-5 group hover:border-rose-500/30 transition-all">
                      <div className="text-[11px] font-black text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                         <span className="w-1 h-1 rounded-full bg-rose-500"></span>
                         {field}
                      </div>
                      <div className="space-y-1">
                        {(Array.isArray(msgs) ? msgs : [msgs]).map((msg, i) => (
                           <p key={i} className="text-[12px] text-slate-400 font-medium leading-snug">{String(msg)}</p>
                        ))}
                      </div>
                   </div>
                ))}
             </div>
          )}
        </div>
        
        <div className="opacity-50 grayscale hover:grayscale-0 transition-all">
          <ObjectRecord obj={errorObj} forceErrorTheme />
        </div>
      </div>
    );
  };

  const renderData = () => {
    if (data === null || data === undefined) return <div className="text-slate-800 italic p-6 text-center uppercase font-black text-[10px] tracking-widest">Null Response</div>;

    // Handle Error State specifically
    if (isError && typeof data === 'object' && !Array.isArray(data)) {
       return renderErrorReport(data);
    }

    if (Array.isArray(data)) {
      const filtered = data.map((item, i) => (
        typeof item === 'object' && item !== null ? (
          <ObjectRecord key={i} obj={item} index={i} />
        ) : (
          normalizedSearch && !String(item).toLowerCase().includes(normalizedSearch) ? null : (
            <div key={i} className="glass-card p-4 bg-white/[0.01] mb-2 border border-white/[0.04] rounded-xl font-mono text-[12px]">
              {renderSimpleValue(item)}
            </div>
          )
        )
      )).filter(Boolean);

      return (
        <div className="space-y-6 pb-20">
          {filtered}
          {filtered.length === 0 && (
            <div className="py-20 text-center opacity-20 uppercase font-black tracking-widest text-slate-600">
              {normalizedSearch ? `No matches for "${searchTerm}"` : "Empty Collection"}
            </div>
          )}
        </div>
      );
    }

    if (typeof data === 'object') return <ObjectRecord obj={data} />;

    return (
      <div className="glass-card p-10 text-center bg-white/[0.01] rounded-[2rem] border border-white/5 shadow-inner">
        <div className="text-xl font-mono tracking-tighter text-white mb-2 break-all px-4">{renderSimpleValue(data)}</div>
        <p className="text-[9px] text-slate-700 font-black uppercase tracking-[0.4em] mt-4">Primitive Literal Response</p>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto pr-2 custom-scrollbar pb-10 px-1 relative">
      {renderData()}
    </div>
  );
};

export default ResponseViewer;