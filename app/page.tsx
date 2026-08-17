'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { signInWithGoogle } from '@/lib/auth';

export default function IndexPage() {
  const { theme, setTheme } = useTheme();
  const [userNickname, setUserNickname] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check URL parameters for OAuth errors
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes('error') || search.includes('error')) {
      setAuthError('구글 인증 처리 중 오류가 발생했거나 취소되었습니다. 다시 시도해주세요.');
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserNickname(user.user_metadata?.full_name || user.email?.split('@')[0] || '회원');
      }
      setLoading(false);
    });
  }, []);

  const handleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle(rememberMe);
    } catch (err: any) {
      setAuthError(err.message || '인증 로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)] transition-colors select-none">
      {/* Top Header Bar (Clean Transparent Brand Logo - 100% Matched with Dashboard Sidebar) */}
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden shrink-0">
            <Image src="/icon.svg" alt="KLIOGRAM Logo" width={40} height={40} className="h-10 w-10 object-contain" priority />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">KLIOGRAM</h1>
            <p className="text-xs font-medium text-[var(--fg-muted)]">개인자산 관리 서비스</p>
          </div>
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
      </header>

      {/* Main Hero & Auth Card Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden mb-3">
              <Image src="/icon.svg" alt="Logo" width={56} height={56} className="h-14 w-14 object-contain" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--fg)]">KLIOGRAM</h2>
            <p className="text-sm font-medium text-[var(--fg-muted)]">고요히 흘러 마침내 숲이 될 하루</p>
          </div>

          {authError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-semibold text-red-600 dark:text-red-400">
              {authError}
            </div>
          )}

          {!loading && userNickname ? (
            <div className="space-y-4 pt-2">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-center">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">인증된 회원</p>
                <p className="text-base font-bold text-[var(--fg)] mt-1">{userNickname}님, 환영합니다!</p>
              </div>
              <Link
                href="/dashboard"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-base font-bold text-white transition-colors shadow-xs hover:bg-emerald-500 cursor-pointer"
              >
                <span>대시보드로 이동</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Google 계정으로 로그인 */}
              <button
                onClick={handleLogin}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] py-3.5 text-base font-bold text-[var(--fg)] transition-all hover:border-emerald-500 cursor-pointer shadow-xs"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google 계정으로 로그인</span>
              </button>

              {/* 30일간 로그인 유지 (Centered under button) */}
              <div className="flex items-center justify-center text-xs py-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded-md border-[var(--border)] text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="font-semibold text-sm">30일간 로그인 유지</span>
                </label>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--fg-muted)] pt-2 border-t border-[var(--border)]/50">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Google OAuth 2.0 보안 인증이 적용됩니다</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
