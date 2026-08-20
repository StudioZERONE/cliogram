'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDropdownProps {
  labelPrefix: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  className?: string;
}

export function FilterDropdown({
  labelPrefix,
  value,
  options,
  onChange,
  className = '',
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];
  const displayLabel = selectedOption
    ? `${labelPrefix}: ${selectedOption.label}`
    : `${labelPrefix}: 전체`;

  // Ultra-compact dynamic width calculation to eliminate any excess right margin
  const widthPx = useMemo(() => {
    if (!options || options.length === 0) return 80;
    const labelLen = displayLabel.length;
    const maxOptLen = Math.max(...options.map((opt) => opt.label.length));
    const len = Math.max(labelLen, maxOptLen);
    // Compact formula: 8.2px per character + 22px (padding & icon)
    return Math.max(72, Math.ceil(len * 8.2 + 22));
  }, [displayLabel, options]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: `${widthPx}px` }}
        className={`flex items-center justify-between gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-xs transition-colors cursor-pointer hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
          isOpen ? 'ring-2 ring-emerald-500/30 bg-emerald-500/20' : ''
        }`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-1 w-full min-w-full max-h-60 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-[var(--fg)] hover:bg-[var(--bg)]'
                }`}
              >
                <span className="truncate pr-1">{opt.label}</span>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 ml-1" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
