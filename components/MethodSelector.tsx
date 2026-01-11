import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { HttpMethod } from '../types';

interface MethodSelectorProps {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
}

const MethodSelector: React.FC<MethodSelectorProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const methods: { label: HttpMethod; color: string; desc: string }[] = [
    { label: 'GET', color: '#10b981', desc: 'Fetch Data' },
    { label: 'POST', color: '#3b82f6', desc: 'Create Resource' },
    { label: 'PUT', color: '#f59e0b', desc: 'Replace Data' },
    { label: 'PATCH', color: '#06b6d4', desc: 'Update Partial' },
    { label: 'DELETE', color: '#f43f5e', desc: 'Remove Data' },
  ];

  const currentMethod = methods.find(m => m.label === value) || methods[1];

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom, left: rect.left });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
    }
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // If clicking on the portal itself, don't close
        const portalMenu = document.getElementById('method-portal-menu');
        if (portalMenu && portalMenu.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (e: React.MouseEvent, label: HttpMethod) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(label);
    setIsOpen(false);
  };

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className="h-11 px-5 flex items-center gap-3 bg-[#1c2128] border border-[#30363d] rounded-lg transition-none shadow-lg active:brightness-90"
      >
        <span 
          className="text-[11px] font-black tracking-widest uppercase"
          style={{ color: currentMethod.color }}
        >
          {value}
        </span>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="10" 
          height="10" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="4" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {isOpen && createPortal(
        <div 
          id="method-portal-menu"
          className="ultimate-solid-menu py-1 overflow-hidden"
          style={{ 
            position: 'fixed',
            top: coords.top + 8,
            left: coords.left,
            width: '224px', 
            backgroundColor: '#1c2128', 
            opacity: 1, 
            zIndex: 99999999, 
            pointerEvents: 'auto',
            display: 'block',
            visibility: 'visible'
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {methods.map((m) => (
            <button
              key={m.label}
              type="button"
              onClick={(e) => handleSelect(e, m.label)}
              className={`${value === m.label ? 'active-method' : ''}`}
              style={{ 
                backgroundColor: '#1c2128', 
                opacity: 1,
                color: '#e2e8f0',
                width: '100%',
                textAlign: 'left',
                padding: '12px 20px',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
            >
              <div className="flex flex-col items-start pointer-events-none">
                <span 
                  className="text-[10px] font-black tracking-widest uppercase"
                  style={{ color: m.color }}
                >
                  {m.label}
                </span>
                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  {m.desc}
                </span>
              </div>
              {value === m.label && (
                <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: m.color, color: m.color }}></div>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export default MethodSelector;