
import React, { useState } from 'react';

interface CurlImporterProps {
  onImport: (data: { method: string; url: string; headers: any[]; body: string }) => void;
  onClose: () => void;
  accentColor: string;
}

const CurlImporter: React.FC<CurlImporterProps> = ({ onImport, onClose, accentColor }) => {
  const [curl, setCurl] = useState('');

  const handleImport = () => {
    try {
      const result: any = { method: 'GET', url: '', headers: [], body: '' };
      
      // Extract URL
      const urlMatch = curl.match(/curl\s+(?:--location\s+)?(?:"|')?([^"'\s]+)/);
      if (urlMatch) result.url = urlMatch[1];

      // Extract Method
      const methodMatch = curl.match(/-X\s+(\w+)/) || curl.match(/--request\s+(\w+)/);
      if (methodMatch) result.method = methodMatch[1].toUpperCase();
      else if (curl.includes('--data') || curl.includes('-d')) result.method = 'POST';

      // Extract Headers
      const headerMatches = [...curl.matchAll(/-H\s+(?:"|')([^"']+)("?|')/g)];
      result.headers = headerMatches.map(m => {
        const [key, ...valParts] = m[1].split(':');
        return { id: crypto.randomUUID(), key: key.trim(), value: valParts.join(':').trim(), enabled: true };
      });

      // Extract Body
      const bodyMatch = curl.match(/-d\s+(?:"|')([^"']+)("?|')/) || 
                        curl.match(/--data\s+(?:"|')([^"']+)("?|')/) ||
                        curl.match(/--data-raw\s+(?:"|')([^"']+)("?|')/);
      if (bodyMatch) result.body = bodyMatch[1];

      onImport(result);
      onClose();
    } catch (e) {
      alert("Failed to parse cURL. Ensure it's in a standard format.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade">
      <div className="glass-panel w-full max-w-xl rounded-2xl flex flex-col overflow-hidden border-white/10">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-white font-black text-sm tracking-tighter uppercase">cURL Transmuter</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <textarea
            autoFocus
            value={curl}
            onChange={(e) => setCurl(e.target.value)}
            placeholder="Paste cURL command here..."
            className="h-48 bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-[12px] text-blue-400 outline-none focus:border-white/20 transition-all custom-scrollbar resize-none"
          />
          <button
            onClick={handleImport}
            className="py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-white transition-all active:scale-95 shadow-xl"
            style={{ backgroundColor: accentColor }}
          >
            Import Command
          </button>
        </div>
      </div>
    </div>
  );
};

export default CurlImporter;
