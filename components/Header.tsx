'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, User, LogOut, ChevronDown, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { signOutUser } from '@/lib/auth';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [userNickname, setUserNickname] = useState<string>('회원');
  const [userEmail, setUserEmail] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<number>(1415);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserNickname(user.user_metadata?.full_name || user.email?.split('@')[0] || '회원');
        setUserEmail(user.email || '');
      }
    });

    fetch('/api/exchange-rate')
      .then((res) => res.json())
      .then((data) => {
        if (data.rate) setExchangeRate(data.rate);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-8 py-4 select-none">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        </div>

        <div className="flex items-center gap-5">
          {/* Live Exchange Rate Indicator */}
          <div className="flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-medium">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[var(--fg-muted)]">USD/KRW:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{exchangeRate.toLocaleString()}원</span>
          </div>

          {/* Theme Switcher Toggle */}
          <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--bg)] p-1">
            <button
              onClick={() => setTheme('light')}
              className={`rounded-lg p-2 transition-colors cursor-pointer ${theme === 'light' ? 'bg-[var(--surface)] text-[var(--fg)] shadow-xs' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'}`}
              title="White Mode"
            >
              <Sun className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`rounded-lg p-2 transition-colors cursor-pointer ${theme === 'dark' ? 'bg-[var(--surface)] text-[var(--fg)] shadow-xs' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'}`}
              title="Dark Mode"
            >
              <Moon className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`rounded-lg p-2 transition-colors cursor-pointer ${theme === 'system' ? 'bg-[var(--surface)] text-[var(--fg)] shadow-xs' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'}`}
              title="System Mode"
            >
              <Monitor className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Top Right User Profile Dropdown Menu */}
          <div ref={profileMenuRef} className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-1.5 pr-3 transition-colors cursor-pointer hover:border-[var(--accent)]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-sm shadow-xs">
                {userNickname.substring(0, 1)}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-bold leading-tight">{userNickname}</p>
                <p className="text-xs text-[var(--fg-muted)] leading-tight">Google Auth</p>
              </div>
              <ChevronDown className={`h-4 w-4 text-[var(--fg-muted)] transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180 text-[var(--accent)]' : ''}`} />
            </button>

            {/* Profile Dropdown Popover */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl z-50 animate-in fade-in-50 zoom-in-95">
                <div className="px-3 py-2 border-b border-[var(--border)] mb-1">
                  <p className="text-sm font-bold truncate">{userNickname}</p>
                  <p className="text-xs text-[var(--fg-muted)] truncate">{userEmail}</p>
                </div>
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--fg)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
                >
                  <User className="h-4.5 w-4.5 text-emerald-500" />
                  <span>계정 정보 관리</span>
                </button>
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    signOutUser().then(() => router.push('/'));
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer dark:text-red-400"
                >
                  <LogOut className="h-4.5 w-4.5" />
                  <span>로그아웃</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Account Info Modal (Blank Canvas State) */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in-50">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-500" />
                계정 정보 관리
              </h3>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="rounded-lg p-1 text-[var(--fg-muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="py-8 text-center text-base text-[var(--fg-muted)] space-y-2">
              <p className="font-semibold text-[var(--fg)]">계정 정보 관리 페이지입니다.</p>
              <p className="text-sm">상세 관리 기능은 곧 추가될 예정입니다.</p>
            </div>
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="w-full rounded-xl bg-[var(--bg)] border border-[var(--border)] py-3 text-sm font-bold text-[var(--fg)] hover:border-emerald-500 transition-colors cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
