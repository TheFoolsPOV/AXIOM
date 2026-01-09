
import React, { useMemo } from 'react';
import Editor from './Editor';

interface ErrorDiagnosisProps {
  error: string;
  method: string;
  url: string;
  headers: any[];
  body: string;
  accentColor: string;
  responseData?: any; // The actual body returned by the server on error
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
  // Attempt to parse responseData if it arrived as a string (common with application/problem+json on some setups)
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

  // Detect structured validation errors (standard ASP.NET Core ValidationProblemDetails / RFC 7807)
  const validationErrors = parsedData?.errors ? Object.entries(parsedData.errors) : null;
  const isValidationError = validationErrors !== null && validationErrors.length > 0;
  
  const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');
  const isCORS = error.toLowerCase().includes('fetch') || error.toLowerCase().includes('cors');

  // Format the response data for the code block (prettified)
  const formattedPayload = useMemo(() => {
    if (parsedData) return JSON.stringify(parsedData, null, 2);
    if (typeof responseData === 'string') return responseData;
    return String(responseData || '');
  }, [parsedData, responseData]);

  // Precise Likely Cause logic
  const likelyCause = useMemo(() => {
    if (isValidationError) return "Server received the request but the payload failed validation rules.";
    if (isCORS) return "CORS Policy Block: The server is not allowing requests from this origin.";
    if (error.includes("400")) return "Bad Request: The server couldn't understand the request or it violated business logic.";
    if (error.includes("401")) return "Unauthorized: Missing or invalid authentication credentials.";
    if (error.includes("403")) return "Forbidden: You don't have permission to access this resource.";
    if (error.includes("404")) return "Not Found: The endpoint URL does not exist on the server.";
    if (error.includes("500")) return "Internal Server Error: The C# code crashed or encountered an unhandled exception.";
    return "Server rejected connection or is offline.";
  }, [isValidationError, isCORS, error]);

  return (
    <div className="h-full flex flex-col gap-3 animate-fade overflow-y-auto custom-scrollbar pr-2 pb-6">
      
      {/* 1. Validation Summary Card - High Priority */}
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
                      <span className="text-amber-500">•</span>
                      {msg}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Basic Diagnosis Box */}
      <div className={`glass-panel border-rose-500/20 bg-rose-500/[0.02] p-4 rounded-xl relative overflow-hidden shadow-2xl ${isValidationError ? 'opacity-50 hover:opacity-100 transition-opacity' : ''}`}>
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        </div>
        
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div>
            <h2 className="text-rose-400 font-black text-[13px] tracking-tight uppercase">Transmission Fault</h2>
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Diagnostic Summary</p>
          </div>
        </div>

        <div className="bg-black/40 rounded-lg p-3 border border-rose-500/10 mb-3 group transition-all hover:border-rose-500/20">
          <p className="text-rose-300/80 font-mono text-[10px] leading-relaxed break-all">
            {error}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
            <h4 className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Likely Cause</h4>
            <p className="text-[10px] text-slate-300 font-medium leading-tight">
              {likelyCause}
            </p>
          </div>
          <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
            <h4 className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Context</h4>
            <p className="text-[10px] text-slate-300 font-medium leading-tight">
              {isLocalhost ? "Local C# Env Detected." : "Remote Link Error."}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Payload Inspection Box */}
      {responseData && (
        <div className="glass-panel border-white/5 bg-white/[0.01] p-3 rounded-xl animate-reveal">
          <div className="flex items-center gap-2 mb-2">
             <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
             <h3 className="text-slate-500 font-black text-[9px] uppercase tracking-[0.2em]">Raw JSON Response</h3>
          </div>
          <div className="h-32 rounded-lg overflow-hidden border border-white/5 shadow-inner">
            <Editor 
              value={formattedPayload} 
              readOnly 
              language={formattedPayload.trim().startsWith('{') ? 'json' : 'text'} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorDiagnosis;
