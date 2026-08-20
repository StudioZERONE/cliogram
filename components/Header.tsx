'use client';

import React, { useEffect, useState, useRef } from 'react';
import { User, LogOut, ChevronDown, Terminal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { signOutUser } from '@/lib/auth';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const [exchangeRate, setExchangeRate] = useState<number>(1415);
  const [userNickname, setUserNickname] = useState<string>('회원');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isDev, setIsDev] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if current environment points to development DB or local server
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const isDevEnv =
      supabaseUrl.includes('tulavtfoulzjpdtygmdx') ||
      supabaseUrl.includes('-dev') ||
      process.env.NODE_ENV === 'development';
    setIsDev(isDevEnv);

    // Track dark mode class on <html> element in real-time
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();

    const observer = new MutationObserver(() => {
      checkDarkMode();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    fetch('/api/exchange-rate')
      .then((res) => res.json())
      .then((data) => {
        if (data.rate) setExchangeRate(data.rate);
      })
      .catch(() => {});

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || '');
        setUserNickname(user.user_metadata?.full_name || user.email?.split('@')[0] || '회원');
      }
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      observer.disconnect();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await signOutUser();
  };

  // Dynamic style calculation for Dev Mode
  const getBadgeStyle = () => {
    if (!isDev) return {};
    if (isDark) {
      return {
        backgroundColor: 'rgba(255, 238, 0, 0.18)',
        borderColor: '#ffee00',
        color: '#ffee00',
      };
    }
    return {
      backgroundColor: 'rgba(249, 115, 22, 0.12)',
      borderColor: 'rgba(249, 115, 22, 0.5)',
      color: '#ea580c',
    };
  };

  const getAccountBtnStyle = () => {
    if (!isDev) return {};
    if (isDark) {
      return {
        backgroundColor: 'rgba(255, 238, 0, 0.15)',
        borderColor: '#ffee00',
      };
    }
    return {
      backgroundColor: 'rgba(249, 115, 22, 0.1)',
      borderColor: 'rgba(249, 115, 22, 0.6)',
    };
  };

  const getAvatarStyle = () => {
    if (!isDev) return {};
    if (isDark) {
      return {
        backgroundColor: '#ffee00',
        color: '#000000',
      };
    }
    return {
      backgroundColor: '#f97316',
      color: '#ffffff',
    };
  };

  const getTextColorStyle = () => {
    if (!isDev) return {};
    if (isDark) return { color: '#ffee00' };
    return { color: '#ea580c' };
  };

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-8 shadow-md transition-shadow select-none">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--fg)]">{title}</h2>
        {isDev && (
          <span
            style={getBadgeStyle()}
            className="hidden sm:inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-black shadow-xs"
          >
            <Terminal className="h-3 w-3" />
            Dev Sys
          </span>
        )}
      </div>

      {/* Right Tools & User Control (Order: Theme Toggle -> Exchange Rate -> User Account) */}
      <div className="flex items-center gap-4">
        {/* 1. Dynamic Single Theme Toggle Button */}
        <ThemeToggleButton />

        {/* 2. Real-time Exchange Rate Badge */}
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2 text-sm font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[var(--fg-muted)]">KRW/USD:</span>
          <span className="font-bold text-[var(--fg)]">{exchangeRate.toLocaleString()}원</span>
        </div>

        {/* 3. User Account Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={getAccountBtnStyle()}
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-1.5 transition-all cursor-pointer shadow-xs ${
              !isDev ? 'bg-[var(--bg)] border-[var(--border)] hover:border-[#057a5d] dark:hover:border-emerald-500' : ''
            }`}
          >
            <div
              style={getAvatarStyle()}
              className={`flex h-8 w-8 items-center justify-center rounded-full font-black text-sm ${
                !isDev ? 'bg-[#057a5d] dark:bg-emerald-600 text-white' : 'shadow-xs'
              }`}
            >
              {userNickname.charAt(0)}
            </div>
            <div className="text-left hidden md:block">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-[var(--fg)]">{userNickname}</p>
                {isDev && (
                  <span
                    style={getBadgeStyle()}
                    className="rounded-md border px-1 py-0.2 text-[9px] font-black"
                  >
                    DEV
                  </span>
                )}
              </div>
              <p
                style={getTextColorStyle()}
                className={`text-[10px] ${!isDev ? 'text-[var(--fg-muted)]' : 'font-bold'}`}
              >
                {isDev ? 'cliogram-dev' : 'Google Auth'}
              </p>
            </div>
            <ChevronDown
              style={getTextColorStyle()}
              className={`h-4 w-4 ${!isDev ? 'text-[var(--fg-muted)]' : ''}`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl animate-in zoom-in-95 z-50">
              <div
                style={getBadgeStyle()}
                className={`rounded-xl border px-3 py-2.5 mb-1 ${!isDev ? 'border-transparent' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-[var(--fg)]">{userNickname}</p>
                  {isDev && (
                    <span
                      style={getAvatarStyle()}
                      className="rounded-md px-1.5 py-0.5 text-[9px] font-black"
                    >
                      Dev Sys
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--fg-muted)] truncate mt-0.5">{userEmail}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-[var(--fg)] hover:bg-[var(--bg)] cursor-pointer"
                >
                  <User style={getTextColorStyle()} className={`h-4 w-4 ${!isDev ? 'text-[#057a5d] dark:text-emerald-400' : ''}`} />
                  <span>계정 정보 관리</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                >
                  <LogOut className="h-4 w-4 text-red-500 dark:text-red-400" />
                  <span>로그아웃</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
