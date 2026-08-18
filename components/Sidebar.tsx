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
      className={`sticky top-0 z-40 flex h-[100dvh] flex-col border-r border-[var(--border)] bg-[var(--surface)] p-3 transition-all duration-300 ease-in-out select-none shrink-0 overflow-hidden ${
        isHovered
          ? 'w-64 shadow-2xl z-50'
          : 'w-14 sm:w-16 shadow-xs'
      }`}
    >
      {/* 1. Brand Logo Section (Fixed Padding & Height - Zero Y-shift) */}
      <div className="flex items-center h-12 pb-3 border-b border-[var(--border)] shrink-0 overflow-hidden">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center">
          <Image
            src="/icon.svg"
            alt="KLIOGRAM Logo"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            priority
          />
        </div>
        
        {/* Brand Text - Pure Horizontal Fade In */}
        <div
          className={`ml-3 flex flex-col whitespace-nowrap transition-all duration-300 ${
            isHovered
              ? 'opacity-100 max-w-xs'
              : 'opacity-0 max-w-0 pointer-events-none overflow-hidden'
          }`}
        >
          <h1 className="text-lg font-bold tracking-tight text-[#057a5d] dark:text-[#10b981] leading-none">
            KLIOGRAM
          </h1>
          <p className="text-[10px] font-medium text-[var(--fg-muted)] mt-1">
            고요히 흘러 마침내 숲이 될 하루
          </p>
        </div>
      </div>

      {/* 2. Main Navigation Links (Fixed Height & Spacing - Zero Y-shift) */}
      <nav className="mt-4 flex-1 space-y-1.5 overflow-hidden">
        {/* Dashboard Link */}
        <Link
          href="/dashboard"
          className={`group relative flex items-center h-11 rounded-xl transition-all cursor-pointer ${
            isOverview
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]'
          }`}
          title="대시보드"
        >
          {isOverview && (
            <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#057a5d] dark:bg-emerald-500" />
          )}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <span
            className={`ml-3 text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
              isHovered
                ? 'opacity-100 max-w-xs'
                : 'opacity-0 max-w-0 overflow-hidden'
            }`}
          >
            대시보드
          </span>
        </Link>

        {/* Trades Link */}
        <Link
          href="/trades"
          className={`group relative flex items-center h-11 rounded-xl transition-all cursor-pointer ${
            isTrades
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]'
          }`}
          title="매매 내역"
        >
          {isTrades && (
            <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#057a5d] dark:bg-emerald-500" />
          )}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span
            className={`ml-3 text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
              isHovered
                ? 'opacity-100 max-w-xs'
                : 'opacity-0 max-w-0 overflow-hidden'
            }`}
          >
            매매 내역
          </span>
          <span
            className={`ml-auto mr-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all duration-300 ${
              isHovered
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-0 w-0 p-0 overflow-hidden'
            }`}
          >
            {tradesCount}
          </span>
        </Link>

        {/* Dividends Link */}
        <Link
          href="/dividends"
          className={`group relative flex items-center h-11 rounded-xl transition-all cursor-pointer ${
            isDividends
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]'
          }`}
          title="배당 내역"
        >
          {isDividends && (
            <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#057a5d] dark:bg-emerald-500" />
          )}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
          <span
            className={`ml-3 text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
              isHovered
                ? 'opacity-100 max-w-xs'
                : 'opacity-0 max-w-0 overflow-hidden'
            }`}
          >
            배당 내역
          </span>
          <span
            className={`ml-auto mr-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all duration-300 ${
              isHovered
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-0 w-0 p-0 overflow-hidden'
            }`}
          >
            {dividendsCount}
          </span>
        </Link>
      </nav>

      {/* 3. Bottom Settings Box (Fixed Box Padding & Outer Bottom Padding pb-8 sm:pb-3) */}
      <div className="mt-auto pt-2 pb-8 sm:pb-3 shrink-0 overflow-hidden">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-1.5 space-y-1.5 overflow-hidden">
          {/* Stocks Link */}
          <Link
            href="/stocks"
            className={`flex items-center h-10 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
              isStocks
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold'
                : 'bg-[var(--surface)] border-[var(--border)] text-[var(--fg)] hover:border-emerald-500'
            }`}
            title="종목 마스터"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <span
              className={`ml-1 whitespace-nowrap transition-all duration-300 ${
                isHovered
                  ? 'opacity-100 max-w-xs'
                  : 'opacity-0 max-w-0 overflow-hidden'
              }`}
            >
              종목 마스터
            </span>
            <span
              className={`ml-auto mr-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all duration-300 ${
                isHovered
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-0 w-0 p-0 overflow-hidden'
              }`}
            >
              {stocksCount}
            </span>
          </Link>

          {/* Common Codes Link */}
          <Link
            href="/codes"
            className={`flex items-center h-10 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
              isCodes
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold'
                : 'bg-[var(--surface)] border-[var(--border)] text-[var(--fg)] hover:border-emerald-500'
            }`}
            title="공통코드"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              <Settings className="h-4.5 w-4.5" />
            </div>
            <span
              className={`ml-1 whitespace-nowrap transition-all duration-300 ${
                isHovered
                  ? 'opacity-100 max-w-xs'
                  : 'opacity-0 max-w-0 overflow-hidden'
              }`}
            >
              공통코드
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
