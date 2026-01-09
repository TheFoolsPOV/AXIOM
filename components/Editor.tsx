
import React, { useRef, useEffect } from 'react';

interface EditorProps {
  value: string;
  onChange?: (val: string) => void;
  language?: 'json' | 'text' | 'csharp' | string;
  readOnly?: boolean;
  placeholder?: string;
  maxHeight?: string;
}

const highlightJson = (json: string) => {
  if (!json) return null;
  const parts = json.split(/("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g);
  return parts.map((part, i) => {
    if (part === undefined || part === "") return null;
    if (part.startsWith('"')) {
      if (part.endsWith(':') || part.includes('":')) return <span key={i} className="token-key">{part}</span>;
      return <span key={i} className="token-string">{part}</span>;
    }
    if (part === 'true' || part === 'false') return <span key={i} className="token-boolean">{part}</span>;
    if (part === 'null') return <span key={i} className="token-null">{part}</span>;
    if (/^-?\d+/.test(part)) return <span key={i} className="token-number">{part}</span>;
    return <span key={i}>{part}</span>;
  });
};

const highlightCSharp = (code: string) => {
  if (!code) return null;
  // Basic C# highlighting
  const keywordList = [
    'public', 'private', 'protected', 'internal', 'class', 'record', 'struct', 'enum', 
    'interface', 'void', 'async', 'await', 'Task', 'using', 'namespace', 'string', 
    'int', 'decimal', 'bool', 'get', 'set', 'init', 'return', 'new', 'var', 'null'
  ];
  
  // Split by words, strings, and attributes [PropertyName]
  const parts = code.split(/("(?:[^"\\]|\\.)*"|\[\w+\]|\b\w+\b)/g);

  return parts.map((part, i) => {
    if (part === undefined || part === "") return null;
    
    // Highlight Strings
    if (part.startsWith('"')) return <span key={i} className="text-emerald-400">{part}</span>;
    
    // Highlight Attributes like [JsonPropertyName]
    if (part.startsWith('[') && part.endsWith(']')) return <span key={i} className="text-slate-500 italic">{part}</span>;
    
    // Highlight Keywords
    if (keywordList.includes(part)) return <span key={i} className="text-blue-400 font-bold">{part}</span>;
    
    // Highlight Types/Classes (PascalCase words)
    if (/^[A-Z]\w+/.test(part)) return <span key={i} className="text-amber-300">{part}</span>;
    
    return <span key={i} className="text-slate-300">{part}</span>;
  });
};

const Editor: React.FC<EditorProps> = ({ value, onChange, language = 'json', readOnly = false, placeholder, maxHeight }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const syncScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  useEffect(() => { syncScroll(); }, [value]);

  const sharedStyles: React.CSSProperties = {
    fontFamily: '"Fira Code", monospace',
    fontSize: '13px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    padding: '20px',
    margin: 0,
    border: 'none',
    boxSizing: 'border-box',
    letterSpacing: 'normal',
    tabSize: 2,
    textAlign: 'left',
  };

  return (
    <div className={`relative w-full h-full rounded-[10px] overflow-hidden border border-white/5 bg-slate-950/90 shadow-2xl transition-all duration-200 ${maxHeight ? '' : 'min-h-[160px]'}`} style={maxHeight ? { maxHeight } : {}}>
      <div ref={backdropRef} className="absolute inset-0 pointer-events-none overflow-hidden no-scrollbar-ui">
        <div style={sharedStyles} className="select-none">
          {language === 'json' ? highlightJson(value) : language === 'csharp' ? highlightCSharp(value) : value}
          {'\n\n\n'}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        onScroll={syncScroll}
        className={`relative w-full h-full bg-transparent outline-none resize-none placeholder-slate-800 selection:bg-blue-500/20 custom-scrollbar transition-colors ${readOnly ? 'text-slate-300' : 'text-transparent caret-white'}`}
        style={sharedStyles}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder || "..."}
        spellCheck={false}
      />
      <div className="absolute top-3 right-3 px-2 py-0.5 text-[7px] font-bold uppercase tracking-widest bg-white/5 text-slate-600 rounded border border-white/5 pointer-events-none z-10 select-none">
        {language}
      </div>
    </div>
  );
};

export default Editor;
