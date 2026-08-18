'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { toggleSmartTheme, checkAndApplyThemeExpiration } from '@/lib/theme';

export function ThemeToggleButton() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAndApplyThemeExpiration(setTheme);
  }, [setTheme]);

  if (!mounted) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] shadow-xs">
        <span className="h-4.5 w-4.5 animate-pulse rounded-full bg-[var(--fg-muted)]/20" />
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  const handleClick = () => {
    toggleSmartTheme(resolvedTheme, setTheme);
  };

  return (
    <button
      onClick={handleClick}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] transition-all hover:border-[#057a5d] dark:hover:border-emerald-500 cursor-pointer shadow-xs group"
      title={
        isDark
          ? '현재 다크 모드 (클릭 시 라이트 모드로 전환)'
          : '현재 라이트 모드 (클릭 시 다크 모드로 전환)'
      }
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <Sun className="h-4.5 w-4.5 text-amber-400 transition-transform group-hover:rotate-45" />
      ) : (
        <Moon className="h-4.5 w-4.5 text-slate-700 dark:text-slate-200 transition-transform group-hover:-rotate-12" />
      )}
    </button>
  );
}
