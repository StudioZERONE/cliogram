'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, User, LogOut, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { signOutUser } from '@/lib/auth';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [exchangeRate, setExchangeRate] = useState<number>(1415);
  const [userNickname, setUserNickname] = useState<string>('회원');
  const [userEmail, setUserEmail] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await signOutUser();
  };

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-8 shadow-xs select-none">
      {/* Page Title (No Icon per Requirement) */}
      <h2 className="text-2xl font-bold tracking-tight text-[var(--fg)]">{title}</h2>

      <div className="flex items-center gap-4">
        {/* Real-time Exchange Rate Badge */}
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2 text-sm font-medium">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[var(--fg-muted)]">USD/KRW:</span>
          <span className="font-bold text-[var(--fg)]">{exchangeRate.toLocaleString()}원</span>
        </div>

        {/* Uplon Theme Switcher */}
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

        {/* User Account Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 transition-colors hover:border-emerald-500 cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 font-bold text-white text-sm">
              {userNickname.charAt(0)}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-bold text-[var(--fg)]">{userNickname}</p>
              <p className="text-[10px] text-[var(--fg-muted)]">Google Auth</p>
            </div>
            <ChevronDown className="h-4 w-4 text-[var(--fg-muted)]" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl animate-in zoom-in-95 z-50">
              <div className="border-b border-[var(--border)] px-3 py-2.5">
                <p className="text-sm font-bold text-[var(--fg)]">{userNickname}</p>
                <p className="text-xs text-[var(--fg-muted)] truncate">{userEmail}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-[var(--fg)] hover:bg-[var(--bg)] cursor-pointer"
                >
                  <User className="h-4 w-4 text-emerald-500" />
                  <span>계정 정보 관리</span>
                </button>

                {/* Restored Red Color for Logout Button */}
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
