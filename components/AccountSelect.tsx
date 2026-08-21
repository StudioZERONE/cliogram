'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface AccountOption {
  id: string;
  account_name: string;
  broker_name?: string;
  account_number?: string;
  is_active?: boolean;
}

interface AccountSelectProps {
  accounts: AccountOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function AccountSelect({ accounts, value, onChange, className = '', disabled = false }: AccountSelectProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOpen = () => {
    if (disabled) return;
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 230 && spaceAbove > spaceBelow) {
        setOpenDirection('up');
      } else {
        setOpenDirection('down');
      }
    }
    setIsOpen(!isOpen);
  };

  const formatAccountLabel = (item: AccountOption) => {
    if (item.account_number) {
      return `${item.account_name} (${item.account_number})`;
    }
    return item.broker_name ? `${item.broker_name} (${item.account_name})` : item.account_name;
  };

  const selectedAccount = accounts.find((a) => a.id === value);
  const displayLabel = selectedAccount
    ? formatAccountLabel(selectedAccount)
    : accounts.length > 0 ? '계좌 선택 (미지정)' : '등록된 계좌 없음';

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block w-full text-left ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleOpen}
        disabled={disabled}
        className={`flex w-full h-[38px] sm:h-[40px] items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 sm:px-3.5 text-xs sm:text-sm font-semibold text-[var(--fg)] shadow-inner transition-colors cursor-pointer hover:border-[var(--accent)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 disabled:cursor-not-allowed disabled:opacity-50 ${
          isOpen ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/20' : ''
        }`}
      >
        <span className={`truncate text-left w-full ${!selectedAccount ? 'text-[var(--fg-muted)]' : 'text-[var(--fg)]'}`}>
          {displayLabel}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--fg-muted)] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[var(--accent)]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 z-50 w-full max-h-52 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl backdrop-blur-md animate-in fade-in-50 zoom-in-95 ${
            openDirection === 'up' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {accounts.length === 0 ? (
            <div className="px-3.5 py-2 text-xs text-[var(--fg-muted)] text-center">
              등록된 계좌가 없습니다.
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                  value === ''
                    ? 'bg-[var(--accent)]/10 font-bold text-[var(--accent)]'
                    : 'text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]'
                }`}
              >
                <span>계좌 선택 (미지정)</span>
                {value === '' && <Check className="h-3.5 w-3.5 text-[var(--accent)]" />}
              </button>
              {accounts.map((item) => {
                const isSelected = item.id === value;
                const label = formatAccountLabel(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--accent)]/10 font-bold text-[var(--accent)]'
                        : 'text-[var(--fg)] hover:bg-[var(--bg)]'
                    }`}
                  >
                    <span className="truncate">{label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-[var(--accent)]" />}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
