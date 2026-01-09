import React, { useMemo } from 'react';
import Editor from './Editor';

interface ErrorDiagnosisProps {
  error: string;
  method: string;
  url: string;
  headers: any[];
  body: string;
  accentColor: string;
  responseData?: any;
}

const ErrorDiagnosis: React.FC<ErrorDiagnosisProps> = ({ 
  error, 
  method, 
  url, 
  headers, 
  body, 
  accentColor,
  responseData 
}) => {
  const parsedData = useMemo(() => {
    if (typeof responseData === 'object' && responseData !== null) return responseData;
    if (typeof responseData === 'string' && responseData.trim().startsWith('{')) {
      try {
        return JSON.parse(responseData);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [responseData]);

  const validationErrors = parsedData?.errors ? Object.entries(parsedData.errors) : null;
  const isValidationError = validationErrors !== null && validationErrors.length > 0;
  
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
  const isHttpsHost = window.location.protocol === 'https:';
  const isMixedContent = isHttpsHost && url.startsWith('http://');
  const isCORS = error.toLowerCase().includes('fetch') || error.toLowerCase().includes('cors') || error.toLowerCase().includes('failed to fetch');

  const formattedPayload = useMemo(() => {
    if (parsedData) return JSON.stringify(parsedData, null, 2);
    if (typeof responseData === 'string') return responseData;
    return String(responseData || '');
  }, [parsedData, responseData]);

  const likelyCause = useMemo(() => {
    if (isMixedContent && isLocalhost) return "Mixed Content Block: You are on HTTPS calling an HTTP local API. Chrome blocks this by default.";
    if (isValidationError) return "Server received the request but the payload failed validation rules.";
    if (isCORS) return "CORS Policy Block: The server is not allowing requests from this origin.";
    if (error.includes("401")) return "Unauthorized: Missing or invalid authentication credentials.";
    if (error.includes("500")) return "Internal Server Error: The C# code crashed or encountered an exception.";
    return "Server rejected connection or is offline.";
  }, [isValidationError, isCORS, error, isMixedContent, isLocalhost]);

  return (
    <div className="h-full flex flex-col gap-3 animate-fade overflow-y-auto custom-scrollbar pr-2 pb-6">
      
      {isMixedContent && isLocalhost && (
        <div className="glass-panel border-blue-500/30 bg-blue-500/[0.03] p-4 rounded-xl animate-reveal shadow-2xl shadow-blue-500/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </div>
            <div>
              <h3 className="text-blue-400 font-black text-[11px] uppercase tracking-tight">Mixed Content Detected</h3>
              <p className="text-[8px] text-blue-500/60 font-bold uppercase tracking-widest">Local C# API Fix</p>
            </div>
          </div>
          <div className="text-[11px] text-slate-300 space-y-2 leading-relaxed">
            <p>To test local APIs from a hosted workbench:</p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>Click the <strong>Lock Icon</strong> in the address bar.</li>
              <li>Go to <strong>Site Settings</strong>.</li>
              <li>Find <strong>Insecure Content</strong> and set it to <strong>Allow</strong>.</li>
              <li>Reload the page and try your request again.</li>
            </ol>
          </div>
        </div>
      )}

      {isValidationError && (
        <div className="glass-panel border-amber-500/30 bg-amber-500/[0.03] p-4 rounded-xl animate-reveal shadow-2xl shadow-amber-500/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>
            </div>
            <div>
              <h3 className="text-amber-400 font-black text-[11px] uppercase tracking-tight">Validation Failed</h3>
              <p className="text-[8px] text-amber-500/60 font-bold uppercase tracking-widest">Model State Invalid</p>
            </div>
          </div>
          <div className="space-y-2">
            {validationErrors.map(([field, messages]) => (
              <div key={field} className="bg-black/20 rounded-lg p-3 border border-amber-500/10 transition-all hover:border-amber-500/30">
                <div className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">{field}</div>
                <div className="space-y-0.5">
                  {(messages as string[]).map((msg, i) => (
                    <p key={i} className="text-[11px] text-slate-300 font-medium leading-relaxed flex items-start gap-2">
                      <span className="text-amber-500">•</span> {msg}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`glass-panel border-rose-500/20 bg-rose-500/[0.02] p-4 rounded-xl relative overflow-hidden shadow-2xl ${isValidationError || isMixedContent ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div>
            <h2 className="text-rose-400 font-black text-[13px] tracking-tight uppercase">Transmission Fault</h2>
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Diagnostic Summary</p>
          </div>
        </div>
        <div className="bg-black/40 rounded-lg p-3 border border-rose-500/10 mb-3">
          <p className="text-rose-300/80 font-mono text-[10px] leading-relaxed break-all">{error}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
            <h4 className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Likely Cause</h4>
            <p className="text-[10px] text-slate-300 font-medium leading-tight">{likelyCause}</p>
          </div>
          <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
            <h4 className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Context</h4>
            <p className="text-[10px] text-slate-300 font-medium leading-tight">{isLocalhost ? "Local C# Env" : "Remote Host"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDiagnosis;