import React, { useMemo } from 'react';

interface ResponseViewerProps {
  data: any;
  status?: number;
  accentColor: string;
  searchTerm?: string;
  onAddHeader?: (key: string, value: string) => void;
}

const ResponseViewer: React.FC<ResponseViewerProps> = ({ data, status = 200, accentColor, searchTerm = '', onAddHeader }) => {
  const normalizedSearch = searchTerm.toLowerCase().trim();
  const isError = status >= 400;

  const matchesFilter = (item: any, search: string): boolean => {
    if (!search) return true;
    const parts = search.split(/[=:]/);
    if (parts.length === 2) {
      const filterKey = parts[0].trim().toLowerCase();
      const filterVal = parts[1].trim().toLowerCase();
      if (typeof item === 'object' && item !== null) {
        const targetEntry = Object.entries(item).find(([k]) => k.toLowerCase() === filterKey);
        if (targetEntry) {
          const [_, val] = targetEntry;
          return String(val).toLowerCase().includes(filterVal);
        }
        return false;
      }
      return false;
    }
    const checkMatch = (val: any): boolean => {
      if (val === null || val === undefined) return false;
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        return String(val).toLowerCase().includes(search.toLowerCase());
      }
      if (typeof val === 'object') {
        return Object.entries(val).some(([k, v]) => k.toLowerCase().includes(search.toLowerCase()) || checkMatch(v));
      }
      return false;
    };
    return checkMatch(item);
  };

  const renderSimpleValue = (val: any) => {
    if (val === null) return <span className="token-null">null</span>;
    if (typeof val === 'boolean') return <span className="token-boolean">{val.toString()}</span>;
    if (typeof val === 'number') return <span className="token-number">{val}</span>;
    if (typeof val === 'string') {
      const isMatch = normalizedSearch && !normalizedSearch.includes('=') && !normalizedSearch.includes(':') && val.toLowerCase().includes(normalizedSearch);
      return <span className={`token-string ${isMatch ? 'bg-yellow-500/20 ring-1 ring-yellow-500/30 rounded px-0.5 text-white' : ''}`}>"{val}"</span>;
    }
    return String(val);
  };

  const ObjectRecord: React.FC<{ obj: any, index?: number, forceErrorTheme?: boolean }> = ({ obj, index, forceErrorTheme = false }) => {
    const entries = Object.entries(obj);
    const themeColor = forceErrorTheme ? '#f43f5e' : accentColor;

    return (
      <div className={`glass-card bg-black/20 border rounded-xl overflow-hidden mb-4 group transition-all animate-reveal ${forceErrorTheme ? 'border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,0.05)]' : 'border-white/[0.04] hover:border-white/10'}`}>
        <div className={`bg-white/[0.02] px-4 py-2 border-b flex justify-between items-center ${forceErrorTheme ? 'border-rose-500/20' : 'border-white/[0.04]'}`}>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: themeColor }}></span>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              {index !== undefined ? `Entry #${index + 1}` : (forceErrorTheme ? 'Fault Data' : 'Object Data')}
            </span>
          </div>
        </div>
        <div className={`divide-y ${forceErrorTheme ? 'divide-rose-500/10' : 'divide-white/[0.03]'}`}>
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-start px-4 py-3 hover:bg-white/[0.01] transition-colors">
              <div className="w-1/4 shrink-0 pr-4">
                <div className={`text-[9px] font-black uppercase tracking-widest truncate ${forceErrorTheme ? 'text-rose-400/70' : 'text-slate-500'}`} title={key}>
                  {key}
                </div>
              </div>
              <div className="flex-1 text-[11px] font-medium text-slate-300 break-all">
                {typeof value === 'object' && value !== null ? (
                  <pre className="text-[10px] p-2 rounded bg-black/40 border border-white/5 text-slate-400 overflow-auto max-h-40">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                ) : renderSimpleValue(value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderErrorReport = (errorObj: any) => {
    let title = 'Server Fault';
    let detail = '';
    if (errorObj.title && typeof errorObj.title === 'string') title = errorObj.title;
    else if (errorObj.error) {
      if (typeof errorObj.error === 'string') title = errorObj.error;
      else if (typeof errorObj.error === 'object' && errorObj.error !== null) {
        title = errorObj.error.message || errorObj.error.code || errorObj.error.type || 'API Error';
        detail = errorObj.error.message || '';
      }
    }
    if (errorObj.detail && typeof errorObj.detail === 'string') detail = errorObj.detail;
    else if (errorObj.message && typeof errorObj.message === 'string') detail = errorObj.message;

    return (
      <div className="space-y-4 animate-reveal">
        <div className="glass-card bg-rose-500/[0.03] border border-rose-500/20 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div>
              <h2 className="text-rose-400 font-black text-lg tracking-tighter uppercase">{String(title)}</h2>
              <p className="text-[8px] text-rose-500/60 font-bold uppercase tracking-[0.3em]">Status {status}</p>
            </div>
          </div>
          {detail && (
            <div className="bg-black/40 rounded-xl p-4 border border-rose-500/10 mb-4">
              <p className="text-[12px] text-slate-300 leading-relaxed">{String(detail)}</p>
            </div>
          )}
        </div>
        <ObjectRecord obj={errorObj} forceErrorTheme />
      </div>
    );
  };

  const renderData = () => {
    if (data === null || data === undefined) return <div className="text-slate-800 italic p-6 text-center uppercase font-black text-[9px] tracking-widest">Null Response</div>;
    if (isError && typeof data === 'object' && !Array.isArray(data)) return renderErrorReport(data);
    if (Array.isArray(data)) {
      const filteredItems = data.filter((item) => matchesFilter(item, normalizedSearch));
      return (
        <div className="space-y-3 pb-10">
          {filteredItems.map((item, i) => (
            typeof item === 'object' && item !== null ? <ObjectRecord key={i} obj={item} index={i} /> : 
            <div key={i} className="glass-card p-3 bg-white/[0.01] border border-white/[0.04] rounded-lg font-mono text-[11px]">{renderSimpleValue(item)}</div>
          ))}
        </div>
      );
    }
    if (typeof data === 'object') return <ObjectRecord obj={data} />;
    return <div className="glass-card p-8 text-center bg-white/[0.01] rounded-2xl border border-white/5 font-mono text-white text-lg">{renderSimpleValue(data)}</div>;
  };

  return <div className="h-full overflow-y-auto pr-1 custom-scrollbar pb-10 px-1">{renderData()}</div>;
};

export default ResponseViewer;