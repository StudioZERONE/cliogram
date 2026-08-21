'use client';

import React from 'react';
import { Globe, Coins } from 'lucide-react';

export type CurrencyViewMode = 'ORIGINAL' | 'KRW';

export interface CurrencyViewToggleProps {
  mode: CurrencyViewMode;
  onChange: (mode: CurrencyViewMode) => void;
  className?: string;
}

export function CurrencyViewToggle({
  mode,
  onChange,
  className = '',
}: CurrencyViewToggleProps) {
  return (
    <div className={`inline-flex rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-1 font-bold text-xs shadow-xs ${className}`}>
      <button
        type="button"
        onClick={() => onChange('ORIGINAL')}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all cursor-pointer select-none ${
          mode === 'ORIGINAL'
            ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-xs'
            : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
        }`}
        title="각 거래의 본래 원본 통화(KRW, USD, EUR 등)로 표출"
      >
        <Globe className="h-3.5 w-3.5" />
        <span>원본 통화 보기</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('KRW')}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all cursor-pointer select-none ${
          mode === 'KRW'
            ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-xs'
            : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
        }`}
        title="모든 외화 거래를 환율 반영 원화(KRW)로 환산하여 통합 표출"
      >
        <Coins className="h-3.5 w-3.5" />
        <span>원화 통합 보기</span>
      </button>
    </div>
  );
}
