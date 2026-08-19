import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCommonCodes } from '@/lib/codes';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Common Codes Utility (lib/codes.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('유효한 그룹 ID로 요청 시 활성화된 코드 목록을 sort_order 순으로 반환해야 한다', async () => {
    const mockCodes = [
      { id: '1', group_id: 'CURRENCY_CODE', code: 'USD', code_name: '미국 달러 ($)', sort_order: 1, is_active: true },
      { id: '2', group_id: 'CURRENCY_CODE', code: 'KRW', code_name: '대한민국 원 (₩)', sort_order: 2, is_active: true },
    ];

    const mockOrder2 = vi.fn().mockResolvedValue({ data: mockCodes, error: null });
    const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
    const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder1 });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const result = await getCommonCodes('CURRENCY_CODE');

    expect(supabase.from).toHaveBeenCalledWith('common_codes');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq1).toHaveBeenCalledWith('group_id', 'CURRENCY_CODE');
    expect(mockEq2).toHaveBeenCalledWith('is_active', true);
    expect(mockOrder1).toHaveBeenCalledWith('sort_order', { ascending: true });
    expect(mockOrder2).toHaveBeenCalledWith('code', { ascending: true });
    expect(result).toEqual(mockCodes);
  });

  it('Strict DB Truth: DB 조회 실패 시 가짜 덤미 데이터를 반환하지 않고 빈 배열 []을 반환해야 한다', async () => {
    const mockOrder2 = vi.fn().mockResolvedValue({ data: null, error: new Error('DB Connection Failed') });
    const mockOrder1 = vi.fn().mockReturnValue({ order: mockOrder2 });
    const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder1 });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const result = await getCommonCodes('NON_EXISTING_GROUP');

    expect(result).toEqual([]);
  });
});
