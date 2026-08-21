'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Tag, Coins } from 'lucide-react';

export interface ViewSettingsMenuProps {
  showSplitBalance?: boolean;
  onToggleSplitBalance?: (value: boolean) => void;
  displayTicker: boolean;
  onToggleDisplayTicker: (value: boolean) => void;
  className?: string;
}

/**
 * Toss Securities style view settings popover menu (···)
 * - 원화 · 달러 분할 카드 표시 토글
 * - 티커로 표시 토글
 */
export function ViewSettingsMenu({
  showSplitBalance,
  onToggleSplitBalance,
  displayTicker,
  onToggleDisplayTicker,
  className = '',
}: ViewSettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-block ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface-muted)] transition-all cursor-pointer shadow-xs"
        title="화면 보기 설정"
        aria-label="화면 보기 설정"
        aria-expanded={isOpen}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-60 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
          <div className="px-2 py-1.5 border-b border-[var(--border)] mb-1.5">
            <span className="font-bold text-[11px] text-[var(--fg-muted)]">보기 설정</span>
          </div>

          <div className="space-y-1">
            {/* Split Balance Card Toggle (if handler provided) */}
            {onToggleSplitBalance !== undefined && showSplitBalance !== undefined && (
              <div
                onClick={() => onToggleSplitBalance(!showSplitBalance)}
                className="flex items-center justify-between px-2 py-2 rounded-xl hover:bg-[var(--surface-muted)] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Coins className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
                  <span className="font-semibold text-[var(--fg)]">원화 · 달러 금액 카드</span>
                </div>
                <div
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    showSplitBalance ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-gray-300 dark:bg-zinc-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      showSplitBalance ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Display as Ticker Toggle */}
            <div
              onClick={() => onToggleDisplayTicker(!displayTicker)}
              className="flex items-center justify-between px-2 py-2 rounded-xl hover:bg-[var(--surface-muted)] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
                <span className="font-semibold text-[var(--fg)]">티커로 표시</span>
              </div>
              <div
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                  displayTicker ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-gray-300 dark:bg-zinc-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    displayTicker ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
