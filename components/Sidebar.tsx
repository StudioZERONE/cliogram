'use client';

import React from 'react';
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

  const isOverview = pathname === '/dashboard';
  const isTrades = pathname === '/trades';
  const isDividends = pathname === '/dividends';
  const isStocks = pathname === '/stocks';
  const isCodes = pathname === '/codes';

  return (
    <aside className="sticky top-0 z-40 flex h-screen w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-5 shadow-xs shrink-0 select-none">
      {/* Brand Logo - Completely Clean & Transparent Background */}
      <div className="flex items-center gap-3 pb-6 border-b border-[var(--border)]">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden shrink-0">
          <Image src="/icon.svg" alt="KLIOGRAM Logo" width={40} height={40} className="h-10 w-10 object-contain" priority />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">KLIOGRAM</h1>
          <p className="text-xs font-medium text-[var(--fg-muted)]">고요히 흘러 마침내 숲이 될 하루</p>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="mt-6 flex-1 space-y-2">
        <Link
          href="/dashboard"
          className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition-colors cursor-pointer ${
            isOverview
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]'
          }`}
        >
          {isOverview && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-500"></span>}
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          <span>대시보드</span>
        </Link>

        <Link
          href="/trades"
          className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition-colors cursor-pointer ${
            isTrades
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]'
          }`}
        >
          {isTrades && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-500"></span>}
          <TrendingUp className="h-5 w-5 shrink-0" />
          <span>매매 내역</span>
          <span className="ml-auto rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">{tradesCount}</span>
        </Link>

        <Link
          href="/dividends"
          className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition-colors cursor-pointer ${
            isDividends
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]'
          }`}
        >
          {isDividends && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-500"></span>}
          <DollarSign className="h-5 w-5 shrink-0" />
          <span>배당 내역</span>
          <span className="ml-auto rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">{dividendsCount}</span>
        </Link>
      </nav>

      {/* Bottom Settings Box */}
      <div className="mt-auto">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3 space-y-2">
          <Link
            href="/stocks"
            className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors cursor-pointer border ${
              isStocks
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold'
                : 'bg-[var(--surface)] border-[var(--border)] text-[var(--fg)] hover:border-emerald-500'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Building2 className="h-4.5 w-4.5" />
              종목 마스터
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">{stocksCount}</span>
          </Link>

          <Link
            href="/codes"
            className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors cursor-pointer border ${
              isCodes
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold'
                : 'bg-[var(--surface)] border-[var(--border)] text-[var(--fg)] hover:border-emerald-500'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Settings className="h-4.5 w-4.5" />
              공통코드
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
