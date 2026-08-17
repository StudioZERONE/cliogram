import { supabase } from './supabase';

const REMEMBER_KEY = 'kliogram_remember_me';
const EXPIRY_KEY = 'kliogram_remember_expiry';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function signInWithGoogle(rememberMe: boolean) {
  if (typeof window !== 'undefined') {
    if (rememberMe) {
      const expiry = Date.now() + THIRTY_DAYS_MS;
      localStorage.setItem(REMEMBER_KEY, 'true');
      localStorage.setItem(EXPIRY_KEY, String(expiry));
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(EXPIRY_KEY);
    }
  }

  const redirectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/dashboard`
    : 'https://kliogram.vercel.app/dashboard';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  });

  return { data, error };
}

export async function checkSessionExpiry() {
  if (typeof window === 'undefined') return true;

  const rememberMe = localStorage.getItem(REMEMBER_KEY);
  const expiryStr = localStorage.getItem(EXPIRY_KEY);

  if (rememberMe === 'true' && expiryStr) {
    const expiry = parseInt(expiryStr, 10);
    if (Date.now() > expiry) {
      // 30일 자동 로그인 만료 -> 로그아웃 처리
      await signOutUser();
      return false;
    }
  }

  return true;
}

export async function signOutUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const nowFormatted = new Date().toISOString().replace('T', ' ').substring(0, 19);
      await supabase
        .from('profiles')
        .update({ last_logout_at: nowFormatted })
        .eq('id', user.id);
    }
  } catch (err) {
    console.error('로그아웃 시 프로필 갱신 오류:', err);
  } finally {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(EXPIRY_KEY);
    }
    await supabase.auth.signOut();
  }
}
