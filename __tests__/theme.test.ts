import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_EXPIRE_HOURS,
  THEME_CACHE_KEY_EXPIRE_HOURS,
  THEME_CACHE_KEY_OVERRIDE,
  THEME_CACHE_KEY_EXPIRES_AT,
  fetchAndCacheThemeExpireHours,
  checkAndApplyThemeExpiration,
  toggleSmartTheme,
} from '@/lib/theme';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Theme Management Utility (lib/theme.ts)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('기본 만료 시간 상수는 12시간이어야 한다', () => {
    expect(DEFAULT_EXPIRE_HOURS).toBe(12);
  });

  describe('fetchAndCacheThemeExpireHours', () => {
    it('Supabase에서 유효한 시간 설정이 오면 localStorage에 캐싱하고 해당 시간을 반환해야 한다', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq1 = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockEq3 = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { code_name: '24' },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        eq: mockEq1.mockReturnValue({
          eq: mockEq2.mockReturnValue({
            eq: mockEq3.mockReturnValue({
              maybeSingle: mockMaybeSingle,
            }),
          }),
        }),
      });

      const hours = await fetchAndCacheThemeExpireHours();
      expect(hours).toBe(24);
      expect(localStorage.getItem(THEME_CACHE_KEY_EXPIRE_HOURS)).toBe('24');
    });

    it('Supabase 조회 실패 시 캐시된 값이 있다면 캐시값을, 없다면 기본값 12를 반환해야 한다', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') }),
      });

      const hours = await fetchAndCacheThemeExpireHours();
      expect(hours).toBe(12);
    });
  });

  describe('checkAndApplyThemeExpiration', () => {
    it('만료 시간이 지난 오버라이드는 삭제하고 system 테마로 복귀시켜야 한다', () => {
      const setTheme = vi.fn();
      const pastTime = Date.now() - 1000; // 1초 전

      localStorage.setItem(THEME_CACHE_KEY_OVERRIDE, 'dark');
      localStorage.setItem(THEME_CACHE_KEY_EXPIRES_AT, pastTime.toString());

      checkAndApplyThemeExpiration(setTheme);

      expect(localStorage.getItem(THEME_CACHE_KEY_OVERRIDE)).toBeNull();
      expect(localStorage.getItem(THEME_CACHE_KEY_EXPIRES_AT)).toBeNull();
      expect(setTheme).toHaveBeenCalledWith('system');
    });

    it('만료 시간이 아직 남았다면 오버라이드를 유지해야 한다', () => {
      const setTheme = vi.fn();
      const futureTime = Date.now() + 100000; // 미래

      localStorage.setItem(THEME_CACHE_KEY_OVERRIDE, 'dark');
      localStorage.setItem(THEME_CACHE_KEY_EXPIRES_AT, futureTime.toString());

      checkAndApplyThemeExpiration(setTheme);

      expect(localStorage.getItem(THEME_CACHE_KEY_OVERRIDE)).toBe('dark');
      expect(setTheme).not.toHaveBeenCalled();
    });
  });
});
