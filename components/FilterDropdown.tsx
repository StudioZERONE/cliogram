'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDropdownProps {
  labelPrefix: string;
  mobileLabelPrefix?: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  className?: string;
}

export function FilterDropdown({
  labelPrefix,
  mobileLabelPrefix,
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

  // Desktop label logic: "종목 유형: 전체", "종목 유형: 성장주"
  const desktopLabel = selectedOption
    ? `${labelPrefix}: ${selectedOption.label}`
    : `${labelPrefix}: 전체`;

  // Mobile compact label logic for iPhone 13 Mini:
  // When 'ALL' (전체): display shortened label ("유형", "시장", "상태")
  // When specific value selected: display selected value label ("성장주", "나스닥", "사용중")
  const mPrefix = mobileLabelPrefix || labelPrefix;
  const mobileLabel =
    selectedOption && selectedOption.value !== 'ALL'
      ? selectedOption.label
      : mPrefix;

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative text-left ${className}`}>
      {/* Combobox Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 sm:px-3.5 py-2 text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 shadow-xs transition-colors cursor-pointer hover:bg-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
          isOpen ? 'ring-2 ring-emerald-500/30 bg-emerald-500/20' : ''
        }`}
      >
        <span className="truncate hidden sm:inline">{desktopLabel}</span>
        <span className="truncate sm:hidden">{mobileLabel}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-emerald-600 dark:text-emerald-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 z-50 mt-1.5 min-w-full w-max max-w-[240px] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-[var(--fg)] hover:bg-[var(--bg)]'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 shrink-0 ml-1" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
