import React, { useRef, useEffect } from 'react';
import { Variable } from '../types';

interface EditorProps {
  value: string;
  onChange?: (val: string) => void;
  language?: 'json' | 'text' | 'csharp' | string;
  readOnly?: boolean;
  placeholder?: string;
  maxHeight?: string;
  variables?: Variable[];
  accentColor?: string;
}

const Editor: React.FC<EditorProps> = ({ 
  value, 
  onChange, 
  language = 'json', 
  readOnly = false, 
  placeholder, 
  maxHeight,
  variables = [],
  accentColor = '#3b82f6'
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const highlightVariables = (text: string) => {
    // Regex to match {{key}}
    const parts = text.split(/(\{\{.*?\}\})/g);
    return parts.map((part, i) => {
      if (part.startsWith('{{') && part.endsWith('}}')) {
        const key = part.slice(2, -2);
        const exists = variables.some(v => v.key === key);
        if (exists) {
          // Hide brackets, show key in accent color
          return (
            <span key={i} className="px-1.5 rounded bg-white/5 font-black border border-white/5" style={{ color: accentColor }}>
              {key}
            </span>
          );
        }
        return <span key={i} className="text-rose-500 font-bold underline decoration-dotted">{part}</span>;
      }
      return part;
    });
  };

  const highlightJson = (json: string) => {
    if (!json) return null;
    const parts = json.split(/("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g);
    return parts.map((part, i) => {
      if (part === undefined || part === "") return null;
      if (part.startsWith('"')) {
        const isKey = part.endsWith(':') || part.includes('":');
        const className = isKey ? "token-key" : "token-string";
        return <span key={i} className={className}>{highlightVariables(part)}</span>;
      }
      if (part === 'true' || part === 'false') return <span key={i} className="token-boolean">{part}</span>;
      if (part === 'null') return <span key={i} className="token-null">{part}</span>;
      if (/^-?\d+/.test(part)) return <span key={i} className="token-number">{part}</span>;
      return <span key={i}>{part}</span>;
    });
  };

  const highlightCSharp = (code: string) => {
    if (!code) return null;
    const keywordList = [
      'public', 'private', 'protected', 'internal', 'class', 'record', 'struct', 'enum', 
      'interface', 'void', 'async', 'await', 'Task', 'using', 'namespace', 'string', 
      'int', 'decimal', 'bool', 'get', 'set', 'init', 'return', 'new', 'var', 'null'
    ];
    const parts = code.split(/("(?:[^"\\]|\\.)*"|\[\w+\]|\b\w+\b)/g);
    return parts.map((part, i) => {
      if (part === undefined || part === "") return null;
      if (part.startsWith('"')) return <span key={i} className="text-emerald-400">{part}</span>;
      if (part.startsWith('[') && part.endsWith(']')) return <span key={i} className="text-slate-500 italic">{part}</span>;
      if (keywordList.includes(part)) return <span key={i} className="text-blue-400 font-bold">{part}</span>;
      if (/^[A-Z]\w+/.test(part)) return <span key={i} className="text-amber-300">{part}</span>;
      return <span key={i} className="text-slate-300">{part}</span>;
    });
  };

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
    padding: '24px',
    margin: 0,
    border: 'none',
    boxSizing: 'border-box',
    letterSpacing: 'normal',
    tabSize: 2,
    textAlign: 'left',
    width: '100%',
    minHeight: '100%',
  };

  return (
    <div className={`relative w-full h-full rounded-xl overflow-hidden border border-white/5 bg-[#0a0d14] shadow-inner transition-all duration-200 ${maxHeight ? '' : 'min-h-[200px]'}`} style={maxHeight ? { maxHeight } : {}}>
      <div ref={backdropRef} className="absolute inset-0 pointer-events-none overflow-hidden no-scrollbar-ui">
        <div style={sharedStyles} className="select-none">
          {language === 'json' ? highlightJson(value) : language === 'csharp' ? highlightCSharp(value) : value}
          <div style={{ height: '100px' }} />
        </div>
      </div>
      <textarea
        ref={textareaRef}
        onScroll={syncScroll}
        className={`relative w-full h-full bg-transparent outline-none resize-none placeholder-slate-800 selection:bg-blue-500/30 custom-scrollbar transition-colors ${readOnly ? 'text-slate-200' : 'text-transparent caret-white'}`}
        style={{ ...sharedStyles, color: readOnly ? 'rgba(226, 232, 240, 0.9)' : 'transparent' }}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder || "..."}
        spellCheck={false}
      />
    </div>
  );
};

export default Editor;