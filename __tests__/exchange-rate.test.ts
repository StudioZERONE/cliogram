import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/exchange-rate/route';
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

describe('Exchange Rate API Route (app/api/exchange-rate/route.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('잘못된 날짜 형식이 전달되면 400 에러를 반환해야 한다', async () => {
    const req = new NextRequest('http://localhost:3000/api/exchange-rate?date=invalid-date');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('Invalid date format');
  });

  it('과거 일자 조회 시 DB에 캐시된 환율이 있으면 DB 값을 즉시 반환해야 한다', async () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { rate_date: '2025-01-15', usd_krw: '1420.5' },
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/exchange-rate?date=2025-01-15');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.usd_krw).toBe(1420.5);
    expect(body.source).toBe('database');
  });

  it('과거 일자 조회 시 DB에 없으면 Frankfurter API를 호출하고 DB에 자동 캐싱해야 한다', async () => {
    // 1. DB 조회 결과 없음
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });

    // 2. Frankfurter API 응답 모킹
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        amount: 1.0,
        base: 'USD',
        date: '2025-01-10',
        rates: { KRW: 1435.2 },
      }),
    });

    const req = new NextRequest('http://localhost:3000/api/exchange-rate?date=2025-01-10');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.usd_krw).toBe(1435.2);
    expect(body.source).toBe('frankfurter_cached');
  });
});
