'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { signInWithGoogle, checkSessionExpiry } from '@/lib/auth';
import { AlertCircle, ShieldCheck } from 'lucide-react';

function parseErrorMessage(rawError: string): string {
  if (!rawError) return '로그인 처리 중 오류가 발생했습니다.';
  const lower = rawError.toLowerCase();

  if (lower.includes('unsupported provider') || lower.includes('provider_not_enabled') || lower.includes('not enabled')) {
    return 'Supabase 프로젝트에서 Google 로그인(Provider)이 활성화되어 있지 않거나 OAuth Key 설정이 완료되지 않았습니다.';
  }
  if (lower.includes('access_denied') || lower.includes('cancelled')) {
    return 'Google 로그인 요청이 취소되었거나 거부되었습니다.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return '네트워크 연결이 일시적으로 원활하지 않습니다. 인터넷 연결을 확인해 주세요.';
  }
  if (lower.includes('invalid_client') || lower.includes('client_id')) {
    return 'Google OAuth Client ID 설정이 올바르지 않습니다.';
  }

  return rawError;
}

export default function IndexPage() {
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      if (typeof window !== 'undefined') {
        // 1. Search Query String 에러 파싱
        const urlParams = new URLSearchParams(window.location.search);
        const errQuery = urlParams.get('error_description') || urlParams.get('error') || urlParams.get('msg');

        // 2. Hash Parameter 에러 파싱 (#error_description=...)
        let errHash = '';
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          errHash = hashParams.get('error_description') || hashParams.get('error') || hashParams.get('msg') || '';
        }

        const rawErr = errQuery || errHash;
        if (rawErr) {
          setErrorMessage(parseErrorMessage(decodeURIComponent(rawErr)));
        }
      }

      // Check session expiry (30 days logic)
      const valid = await checkSessionExpiry();
      if (valid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          router.replace('/dashboard');
          return;
        }
      }

      setCheckingAuth(false);
    }

    checkAuth();
  }, [router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      if (!navigator.onLine) {
        throw new Error('네트워크 연결이 되어있지 않습니다. 인터넷 연결을 확인해 주세요.');
      }

      const { error } = await signInWithGoogle(rememberMe);
      if (error) {
        throw error;
      }
    } catch (err: unknown) {
      console.error('Google 로그인 에러:', err);
      const rawMsg = err instanceof Error ? err.message : String(err);
      setErrorMessage(parseErrorMessage(rawMsg));
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 transition-colors duration-200"
      style={{ background: 'var(--bg)' }}
    >
      <main className="w-full max-w-md space-y-8 animate-fade-in-up">
        {/* Header Logo & Title */}
        <div className="text-center space-y-3">
          <div
            className="w-14 h-14 md:w-16 md:h-16 mx-auto rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-extrabold shadow-lg transition-transform duration-200 hover:scale-105"
            style={{ background: 'var(--accent)', color: '#ffffff' }}
          >
            K
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
            KLIOGRAM
          </h1>
          <p className="text-sm md:text-base font-medium max-w-xs mx-auto" style={{ color: 'var(--text-sub)' }}>
            실시간 환율 연동 스마트 주식 매매 내역 & 배당금 포트폴리오 관리
          </p>
        </div>

        {/* Login Box Container */}
        <div
          className="rounded-3xl p-6 sm:p-8 space-y-6 transition-all duration-200"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div className="space-y-1 text-center">
            <h2 className="text-lg md:text-xl font-bold" style={{ color: 'var(--text)' }}>
              시작하기
            </h2>
            <p className="text-xs md:text-sm" style={{ color: 'var(--text-muted)' }}>
              Google 계정으로 안전하게 로그인하세요.
            </p>
          </div>

          {/* Google SSO Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl text-sm md:text-base font-bold flex items-center justify-center gap-3 transition-all duration-150 shadow-sm border hover:shadow-md active:scale-[0.99] disabled:opacity-50"
            style={{
              background: 'var(--surface-sub)',
              borderColor: 'var(--border-hi)',
              color: 'var(--text)',
            }}
          >
            {/* Google Icon SVG */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? '로그인 처리 중...' : 'Google 계정으로 로그인'}</span>
          </button>

          {/* Error Message Box (Under Login Button) */}
          {errorMessage && (
            <div
              className="p-4 rounded-2xl border flex items-start gap-3 text-xs md:text-sm animate-fade-in"
              style={{
                background: 'var(--danger-bg)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: 'var(--danger)',
              }}
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">로그인 안내 및 오류</p>
                <p className="opacity-90 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between pt-1 text-xs md:text-sm">
            <label className="flex items-center gap-2.5 cursor-pointer select-none" style={{ color: 'var(--text-sub)' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
              />
              <span className="font-semibold">30일간 자동 로그인 유지</span>
            </label>
            <span className="text-[11px] text-zinc-400">보안 세션 적용</span>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>보안 인증 및 SSL 암호화 적용</span>
        </div>
      </main>
    </div>
  );
}
