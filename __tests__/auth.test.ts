import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkSessionExpiry } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

describe('Auth & Session Expiry Utility (lib/auth.ts)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('세션이 없는 경우 false를 반환해야 한다', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const isValid = await checkSessionExpiry();
    expect(isValid).toBe(false);
  });

  it('유효한 세션이 있고 만료되지 않은 경우 true를 반환해야 한다', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'test-user-id' } } },
      error: null,
    });

    const futureExpiry = Date.now() + 1000000;
    localStorage.setItem('cliogram_remember_me', 'true');
    localStorage.setItem('cliogram_remember_expiry', futureExpiry.toString());

    const isValid = await checkSessionExpiry();
    expect(isValid).toBe(true);
  });

  it('30일 자동 로그인 기간이 만료된 경우 false를 반환하고 로그아웃을 처리해야 한다', async () => {
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: { id: 'test-user-id' } } },
      error: null,
    });
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
    });
    (supabase.from as any).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const pastExpiry = Date.now() - 5000; // 5초 전 만료
    localStorage.setItem('cliogram_remember_me', 'true');
    localStorage.setItem('cliogram_remember_expiry', pastExpiry.toString());

    const isValid = await checkSessionExpiry();
    expect(isValid).toBe(false);
    expect(localStorage.getItem('cliogram_remember_me')).toBeNull();
  });
});
