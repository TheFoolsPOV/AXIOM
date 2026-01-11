import React, { useState, useMemo } from 'react';
import { HttpMethod, KeyValuePair, Variable } from '../types';
import Editor from './Editor';

interface SnippetGeneratorProps {
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  body: string;
  variables: Variable[];
  onClose: () => void;
  accentColor: string;
}

const SnippetGenerator: React.FC<SnippetGeneratorProps> = ({ method, url, headers, body, variables, onClose, accentColor }) => {
  const [lang, setLang] = useState<'js' | 'csharp' | 'python' | 'curl'>('js');
  const [copied, setCopied] = useState(false);

  const injectVars = (str: string) => {
    let res = str;
    variables.forEach(v => {
      if (v.key) res = res.replace(new RegExp(`{{${v.key}}}`, 'g'), v.value);
    });
    return res;
  };

  const code = useMemo(() => {
    const finalUrl = injectVars(url);
    const activeHeaders = headers.filter(h => h.enabled && h.key);
    const injectedBody = injectVars(body);

    switch (lang) {
      case 'curl':
        let curl = `curl --location --request ${method} '${finalUrl}' \\\n`;
        activeHeaders.forEach(h => {
          curl += `--header '${h.key}: ${injectVars(h.value)}' \\\n`;
        });
        if (method !== 'GET' && injectedBody) {
          curl += `--data-raw '${injectedBody.replace(/'/g, "'\\''")}'`;
        }
        return curl.trim();

      case 'js':
        return `const myHeaders = new Headers();\n${activeHeaders.map(h => `myHeaders.append("${h.key}", "${injectVars(h.value)}");`).join('\n')}\n\nconst raw = JSON.stringify(${injectedBody});\n\nconst requestOptions = {\n  method: "${method}",\n  headers: myHeaders,\n  ${method !== 'GET' ? `body: raw,` : ''}\n  redirect: "follow"\n};\n\nfetch("${finalUrl}", requestOptions)\n  .then((response) => response.text())\n  .then((result) => console.log(result))\n  .catch((error) => console.error(error));`;

      case 'csharp':
        return `var client = new HttpClient();\nvar request = new HttpRequestMessage(HttpMethod.${method === 'PATCH' ? 'Patch' : method.charAt(0) + method.slice(1).toLowerCase()}, "${finalUrl}");\n${activeHeaders.map(h => `request.Headers.Add("${h.key}", "${injectVars(h.value)}");`).join('\n')}\n${method !== 'GET' ? `var content = new StringContent(${JSON.stringify(injectedBody)}, null, "application/json");\nrequest.Content = content;` : ''}\nvar response = await client.SendAsync(request);\nresponse.EnsureSuccessStatusCode();\nconsole.WriteLine(await response.Content.ReadAsStringAsync());`;

      case 'python':
        return `import requests\nimport json\n\nurl = "${finalUrl}"\n\npayload = json.dumps(${injectedBody})\nheaders = {\n${activeHeaders.map(h => `  '${h.key}': '${injectVars(h.value)}'`).join(',\n')}\n}\n\nresponse = requests.request("${method}", url, headers=headers, data=payload)\n\nprint(response.text)`;

      default:
        return '';
    }
  }, [lang, method, url, headers, body, variables]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-fade">
      <div className="glass-panel w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl border-white/10">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: accentColor }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </div>
            <div>
              <h2 className="text-white font-black text-lg tracking-tighter uppercase leading-none">Code Transmuter</h2>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Exporting Request to Production</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="toggle-container">
              {(['js', 'csharp', 'python', 'curl'] as const).map(l => (
                <button key={l} onClick={() => setLang(l)} className={`toggle-item ${lang === l ? 'active' : ''}`} style={lang === l ? { color: accentColor } : {}}>
                  {l === 'js' ? 'Fetch' : l === 'csharp' ? 'C#' : l === 'python' ? 'Python' : 'cURL'}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all text-slate-600 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden p-6 relative">
          <Editor value={code} readOnly language={lang === 'js' ? 'javascript' : lang === 'csharp' ? 'csharp' : 'text'} accentColor={accentColor} />
          <button 
            onClick={handleCopy}
            className={`absolute bottom-10 right-10 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-2xl flex items-center gap-3 ${copied ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {copied ? (
              <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
            ) : (
              <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> Copy Snippet</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SnippetGenerator;