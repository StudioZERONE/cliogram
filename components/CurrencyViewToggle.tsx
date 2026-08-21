'use client';

import React from 'react';

export type CurrencyViewMode = 'ORIGINAL' | 'KRW';

export interface CurrencyViewToggleProps {
  mode: CurrencyViewMode;
  onChange: (mode: CurrencyViewMode) => void;
  className?: string;
  showLabels?: boolean;
}

/**
 * Toss Securities style compact Currency View Toggle ($ vs 원)
 * - '$': 외화(달러 등 원본 통화) 기준 표출
 * - '원': 원화(KRW 환율 환산) 통합 기준 표출
 */
export function CurrencyViewToggle({
  mode,
  onChange,
  className = '',
  showLabels = false,
}: CurrencyViewToggleProps) {
  return (
    <div
      className={`inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-0.5 text-xs font-bold shadow-xs select-none ${className}`}
      role="group"
      aria-label="통화 표시 기준 선택"
    >
      <button
        type="button"
        onClick={() => onChange('ORIGINAL')}
        className={`flex items-center justify-center gap-1 rounded-lg px-2.5 sm:px-3 py-1 transition-all cursor-pointer min-w-[34px] ${
          mode === 'ORIGINAL'
            ? 'bg-emerald-600 text-white dark:bg-emerald-500 shadow-xs font-extrabold'
            : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] font-semibold'
        }`}
        title="외화/원본 통화($ 등) 기준으로 표시"
        aria-pressed={mode === 'ORIGINAL'}
      >
        <span className="text-xs sm:text-sm">$</span>
        {showLabels && <span className="text-[11px] hidden sm:inline">외화</span>}
      </button>

      <button
        type="button"
        onClick={() => onChange('KRW')}
        className={`flex items-center justify-center gap-1 rounded-lg px-2.5 sm:px-3 py-1 transition-all cursor-pointer min-w-[34px] ${
          mode === 'KRW'
            ? 'bg-emerald-600 text-white dark:bg-emerald-500 shadow-xs font-extrabold'
            : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] font-semibold'
        }`}
        title="원화(KRW) 환율 환산 통합 기준으로 표시"
        aria-pressed={mode === 'KRW'}
      >
        <span className="text-xs sm:text-sm">원</span>
        {showLabels && <span className="text-[11px] hidden sm:inline">원화</span>}
      </button>
    </div>
  );
}
