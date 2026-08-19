'use client';

import React, { useEffect, useState } from 'react';
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
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isOverview = pathname === '/dashboard';
  const isTrades = pathname === '/trades';
  const isDividends = pathname === '/dividends';
  const isStocks = pathname === '/stocks';
  const isCodes = pathname === '/codes';

  return (
    /* Outer Fixed Container: Uses 100dvh (Dynamic Viewport Height) for mobile browser toolbar adaptation */
    <div className="shrink-0 w-14 sm:w-16 h-[100dvh] select-none z-40">
      {/* Floating Fixed Overlay Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 left-0 flex h-[100dvh] flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-all duration-300 ease-in-out overflow-hidden ${
          isHovered
            ? 'w-64 shadow-2xl z-50'
            : 'w-14 sm:w-16 shadow-xs z-40'
        }`}
      >
        {/* 1. Brand Logo Section (Height 80px h-20, Separated Line: mx-1 border-b) */}
        <div className="flex flex-col justify-between h-20 px-2 sm:px-3 shrink-0 overflow-hidden">
          <div className="flex items-center h-[79px] overflow-hidden">
            {/* Logo Container (Closed 32px -> Open 36px) */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              <Image
                src="/icon.svg"
                alt="KLIOGRAM Logo"
                width={36}
                height={36}
                className={`object-contain transition-all duration-300 ${
                  isHovered ? 'h-9 w-9' : 'h-8 w-8'
                }`}
                priority
              />
            </div>
            
            {/* Brand Text */}
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

          {/* Separated Bottom Line (Does not touch side walls) */}
          <div className="border-b border-[var(--border)] mx-1" />
        </div>

        {/* 2. Main Navigation Links (Slim closed alignment, Padding px-2 sm:px-3) */}
        <nav className="mt-4 flex-1 space-y-1.5 px-2 sm:px-3 overflow-y-auto scrollbar-none">
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
              <LayoutDashboard className={`transition-all duration-300 ${isHovered ? 'h-5 w-5' : 'h-4.5 w-4.5'}`} />
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
              <TrendingUp className={`transition-all duration-300 ${isHovered ? 'h-5 w-5' : 'h-4.5 w-4.5'}`} />
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
              suppressHydrationWarning
              className={`ml-auto mr-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all duration-300 ${
                isHovered
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-0 w-0 p-0 overflow-hidden'
              }`}
            >
              {mounted ? tradesCount : 0}
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
              <DollarSign className={`transition-all duration-300 ${isHovered ? 'h-5 w-5' : 'h-4.5 w-4.5'}`} />
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
              suppressHydrationWarning
              className={`ml-auto mr-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all duration-300 ${
                isHovered
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-0 w-0 p-0 overflow-hidden'
              }`}
            >
              {mounted ? dividendsCount : 0}
            </span>
          </Link>
        </nav>

        {/* 3. Bottom Settings Section (Separated Top Line, Slim Padding px-2 sm:px-3) */}
        <div className="mt-auto pt-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] px-2 sm:px-3 space-y-1.5 shrink-0 overflow-hidden">
          <div className="border-t border-[var(--border)] mx-1 mb-2.5" />

          {/* Stocks Link */}
          <Link
            href="/stocks"
            className={`group relative flex items-center h-11 rounded-xl transition-all cursor-pointer ${
              isStocks
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]'
            }`}
            title="종목 마스터"
          >
            {isStocks && (
              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#057a5d] dark:bg-emerald-500" />
            )}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              <Building2 className={`transition-all duration-300 ${isHovered ? 'h-5 w-5' : 'h-4.5 w-4.5'}`} />
            </div>
            <span
              className={`ml-3 text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                isHovered
                  ? 'opacity-100 max-w-xs'
                  : 'opacity-0 max-w-0 overflow-hidden'
              }`}
            >
              종목 마스터
            </span>
            <span
              suppressHydrationWarning
              className={`ml-auto mr-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-all duration-300 ${
                isHovered
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-0 w-0 p-0 overflow-hidden'
              }`}
            >
              {mounted ? stocksCount : 0}
            </span>
          </Link>

          {/* Common Codes Link */}
          <Link
            href="/codes"
            className={`group relative flex items-center h-11 rounded-xl transition-all cursor-pointer ${
              isCodes
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]'
            }`}
            title="공통코드"
          >
            {isCodes && (
              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#057a5d] dark:bg-emerald-500" />
            )}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              <Settings className={`transition-all duration-300 ${isHovered ? 'h-5 w-5' : 'h-4.5 w-4.5'}`} />
            </div>
            <span
              className={`ml-3 text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                isHovered
                  ? 'opacity-100 max-w-xs'
                  : 'opacity-0 max-w-0 overflow-hidden'
              }`}
            >
              공통코드
            </span>
          </Link>
        </div>
      </aside>
    </div>
  );
}
