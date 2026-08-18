'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  Building2,
  Settings
} from 'lucide-react';
import { useCounts } from '@/components/CountsProvider';

export function Sidebar() {
  const pathname = usePathname();
  const { tradesCount, dividendsCount, stocksCount } = useCounts();
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const isOverview = pathname === '/dashboard';
  const isTrades = pathname === '/trades';
  const isDividends = pathname === '/dividends';
  const isStocks = pathname === '/stocks';
  const isCodes = pathname === '/codes';

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`sticky top-0 z-40 flex h-screen flex-col border-r border-[var(--border)] bg-[var(--surface)] p-3 shadow-md shrink-0 select-none transition-all duration-300 ease-in-out ${
        isHovered ? 'w-64 p-5 shadow-2xl' : 'w-20'
      }`}
    >
      {/* Brand Logo Section */}
      <div className={`flex items-center pb-5 border-b border-[var(--border)] transition-all ${
        isHovered ? 'gap-3 justify-start' : 'justify-center'
      }`}>
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden shrink-0">
          <Image src="/icon.svg" alt="KLIOGRAM Logo" width={40} height={40} className="h-10 w-10 object-contain" priority />
        </div>
        
        {/* Brand Text - Smoothly fade & expand on hover */}
        <div className={`flex flex-col transition-all duration-300 overflow-hidden whitespace-nowrap ${
          isHovered ? 'opacity-100 max-w-xs ml-1' : 'opacity-0 max-w-0 pointer-events-none'
        }`}>
          <h1 className="text-xl font-bold tracking-tight text-[#057a5d] dark:text-[#10b981]">KLIOGRAM</h1>
          <p className="text-[11px] font-medium text-[var(--fg-muted)]">고요히 흘러 마침내 숲이 될 하루</p>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="mt-6 flex-1 space-y-2">
        {/* Dashboard Link */}
        <Link
          href="/dashboard"
          className={`group relative flex items-center rounded-xl py-3 transition-all cursor-pointer ${
            isHovered ? 'px-4 justify-start gap-3' : 'justify-center px-0'
          } ${
            isOverview
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]'
          }`}
          title="대시보드"
        >
          {isOverview && (
            <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#057a5d] dark:bg-emerald-500" />
          )}
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-base font-semibold ${
            isHovered ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'
          }`}>
            대시보드
          </span>
        </Link>

        {/* Trades Link */}
        <Link
          href="/trades"
          className={`group relative flex items-center rounded-xl py-3 transition-all cursor-pointer ${
            isHovered ? 'px-4 justify-start gap-3' : 'justify-center px-0'
          } ${
            isTrades
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]'
          }`}
          title="매매 내역"
        >
          {isTrades && (
            <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#057a5d] dark:bg-emerald-500" />
          )}
          <TrendingUp className="h-5 w-5 shrink-0" />
          <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-base font-semibold ${
            isHovered ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'
          }`}>
            매매 내역
          </span>
          <span className={`ml-auto rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all duration-300 ${
            isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-0 w-0 p-0 overflow-hidden'
          }`}>
            {tradesCount}
          </span>
        </Link>

        {/* Dividends Link */}
        <Link
          href="/dividends"
          className={`group relative flex items-center rounded-xl py-3 transition-all cursor-pointer ${
            isHovered ? 'px-4 justify-start gap-3' : 'justify-center px-0'
          } ${
            isDividends
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]'
          }`}
          title="배당 내역"
        >
          {isDividends && (
            <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#057a5d] dark:bg-emerald-500" />
          )}
          <DollarSign className="h-5 w-5 shrink-0" />
          <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-base font-semibold ${
            isHovered ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'
          }`}>
            배당 내역
          </span>
          <span className={`ml-auto rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all duration-300 ${
            isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-0 w-0 p-0 overflow-hidden'
          }`}>
            {dividendsCount}
          </span>
        </Link>
      </nav>

      {/* Bottom Settings Box */}
      <div className="mt-auto">
        <div className={`rounded-2xl border border-[var(--border)] bg-[var(--bg)] transition-all ${
          isHovered ? 'p-3 space-y-2' : 'p-2 space-y-2'
        }`}>
          {/* Stocks Link */}
          <Link
            href="/stocks"
            className={`flex items-center justify-between rounded-xl py-2.5 text-sm font-semibold transition-all cursor-pointer border ${
              isHovered ? 'px-3.5' : 'px-0 justify-center'
            } ${
              isStocks
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold'
                : 'bg-[var(--surface)] border-[var(--border)] text-[var(--fg)] hover:border-emerald-500'
            }`}
            title="종목 마스터"
          >
            <span className="flex items-center gap-2.5">
              <Building2 className="h-4.5 w-4.5 shrink-0" />
              <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
                isHovered ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'
              }`}>
                종목 마스터
              </span>
            </span>
            <span className={`rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all duration-300 ${
              isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-0 w-0 p-0 overflow-hidden'
            }`}>
              {stocksCount}
            </span>
          </Link>

          {/* Common Codes Link */}
          <Link
            href="/codes"
            className={`flex items-center justify-between rounded-xl py-2.5 text-sm font-semibold transition-all cursor-pointer border ${
              isHovered ? 'px-3.5' : 'px-0 justify-center'
            } ${
              isCodes
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold'
                : 'bg-[var(--surface)] border-[var(--border)] text-[var(--fg)] hover:border-emerald-500'
            }`}
            title="공통코드"
          >
            <span className="flex items-center gap-2.5">
              <Settings className="h-4.5 w-4.5 shrink-0" />
              <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${
                isHovered ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'
              }`}>
                공통코드
              </span>
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
