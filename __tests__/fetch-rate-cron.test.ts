import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/cron/fetch-rate/route';
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Daily Closing Rate Cron API (app/api/cron/fetch-rate/route.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Cron 요청 시 Frankfurter에서 최신 환율을 조회하여 Supabase exchange_rates 테이블에 저장해야 한다', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        amount: 1.0,
        base: 'USD',
        date: '2026-08-19',
        rates: { KRW: 1395.8 },
      }),
    });

    const mockSelect = vi.fn().mockResolvedValue({
      data: [{ rate_date: '2026-08-19', usd_krw: 1395.8 }],
      error: null,
    });
    const mockUpsert = vi.fn().mockReturnValue({
      select: mockSelect,
    });

    (supabase.from as any).mockReturnValue({
      upsert: mockUpsert,
    });

    const req = new NextRequest('http://localhost:3000/api/cron/fetch-rate');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('exchange_rates');
    expect(mockUpsert).toHaveBeenCalled();
  });
});
