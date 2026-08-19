'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { getCommonCodes, CommonCode } from '@/lib/codes';

interface CodeSelectProps {
  groupId: 'CURRENCY_CODE' | 'STOCK_TYPE' | 'MARKET_TYPE' | 'TRADE_TYPE';
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function CodeSelect({ groupId, value, onChange, className = '', disabled = false }: CodeSelectProps) {
  const [codes, setCodes] = useState<CommonCode[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    getCommonCodes(groupId).then((data) => {
      if (isMounted) {
        setCodes(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [groupId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCodeObj = codes.find((c) => c.code === value) || codes[0];
  const displayLabel = selectedCodeObj ? selectedCodeObj.code_name : value;

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block w-full text-left ${className}`}>
      {/* Custom Combobox Trigger Button with text-left */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base font-medium text-[var(--fg)] shadow-xs transition-colors cursor-pointer hover:border-[var(--accent)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 disabled:cursor-not-allowed disabled:opacity-50 ${
          isOpen ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/20' : ''
        }`}
      >
        <span className="truncate text-left w-full">{displayLabel}</span>
        <ChevronDown className={`h-4.5 w-4.5 shrink-0 text-[var(--fg-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180 text-[var(--accent)]' : ''}`} />
      </button>

      {/* Custom Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
          {codes.length === 0 ? (
            <div className="px-3.5 py-3 text-xs text-[var(--fg-muted)] text-center">
              등록된 공통코드가 없습니다.
            </div>
          ) : (
            codes.map((item) => {
              const isSelected = item.code === value;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleSelect(item.code)}
                  className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-base font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-[var(--fg)] hover:bg-[var(--bg)]'
                  }`}
                >
                  <span className="text-left w-full">{item.code_name}</span>
                  {isSelected && <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
