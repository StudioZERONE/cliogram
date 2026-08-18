import { supabase } from '@/lib/supabase';

export const THEME_CACHE_KEY_EXPIRE_HOURS = 'kliogram_theme_expire_hours';
export const THEME_CACHE_KEY_OVERRIDE = 'kliogram_theme_manual_override';
export const THEME_CACHE_KEY_EXPIRES_AT = 'kliogram_theme_override_expires_at';

export const DEFAULT_EXPIRE_HOURS = 12;

/**
 * Supabase common_codes에서 THEME_CONFIG / THEME_EXPIRE_HOURS 설정값을 가져와 로컬 캐싱합니다.
 */
export async function fetchAndCacheThemeExpireHours(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('common_codes')
      .select('code_name')
      .eq('group_id', 'THEME_CONFIG')
      .eq('code', 'THEME_EXPIRE_HOURS')
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(THEME_CACHE_KEY_EXPIRE_HOURS);
        return cached ? parseInt(cached, 10) || DEFAULT_EXPIRE_HOURS : DEFAULT_EXPIRE_HOURS;
      }
      return DEFAULT_EXPIRE_HOURS;
    }

    const hours = parseInt(data.code_name, 10) || DEFAULT_EXPIRE_HOURS;
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_CACHE_KEY_EXPIRE_HOURS, hours.toString());
    }
    return hours;
  } catch {
    return DEFAULT_EXPIRE_HOURS;
  }
}

/**
 * 테마 오버라이드 만료 여부를 검사하고, 만료 시 자동으로 system 모드로 복귀시킵니다.
 */
export function checkAndApplyThemeExpiration(setTheme: (theme: string) => void) {
  if (typeof window === 'undefined') return;

  const override = localStorage.getItem(THEME_CACHE_KEY_OVERRIDE);
  const expiresAtStr = localStorage.getItem(THEME_CACHE_KEY_EXPIRES_AT);

  if (override && expiresAtStr) {
    const expiresAt = parseInt(expiresAtStr, 10);
    if (!isNaN(expiresAt) && Date.now() >= expiresAt) {
      // 만료됨 -> 오버라이드 정보 삭제 및 system 모드 복귀
      localStorage.removeItem(THEME_CACHE_KEY_OVERRIDE);
      localStorage.removeItem(THEME_CACHE_KEY_EXPIRES_AT);
      setTheme('system');
    }
  }
}

/**
 * 단일 토글 버튼 클릭 시 스마트 테마 전환 로직을 수행합니다.
 */
export async function toggleSmartTheme(
  resolvedTheme: string | undefined,
  setTheme: (theme: string) => void
) {
  if (typeof window === 'undefined') return;

  // 1. 현재 시스템 기본 테마 감지 (Dark 여부)
  const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const currentSystemTheme = isSystemDark ? 'dark' : 'light';

  // 2. 사용자가 전환하고자 하는 다음 테마
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

  // 3. 만약 선택하려는 다음 테마가 시스템 기본 테마와 같다면 -> system 모드로 복귀!
  if (nextTheme === currentSystemTheme) {
    localStorage.removeItem(THEME_CACHE_KEY_OVERRIDE);
    localStorage.removeItem(THEME_CACHE_KEY_EXPIRES_AT);
    setTheme('system');
  } else {
    // 4. 시스템 모드와 다르다면 -> 수동 오버라이드 및 만료 시간 설정
    const expireHours = await fetchAndCacheThemeExpireHours();
    const expiresAt = Date.now() + expireHours * 60 * 60 * 1000;

    localStorage.setItem(THEME_CACHE_KEY_OVERRIDE, nextTheme);
    localStorage.setItem(THEME_CACHE_KEY_EXPIRES_AT, expiresAt.toString());
    setTheme(nextTheme);
  }
}
