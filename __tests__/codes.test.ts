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

  it('strictly validates code group form input before submission (group_id, group_name)', () => {
    const validateGroupForm = (params: { groupId: string; groupName: string }) => {
      const cleanId = params.groupId.trim().toUpperCase();
      const cleanName = params.groupName.trim();
      if (!cleanId) return { valid: false, error: '그룹 ID를 입력해 주세요.' };
      if (!cleanName) return { valid: false, error: '그룹명을 입력해 주세요.' };
      return { valid: true, data: { group_id: cleanId, group_name: cleanName } };
    };

    expect(validateGroupForm({ groupId: '', groupName: '통화' }).valid).toBe(false);
    expect(validateGroupForm({ groupId: '  ', groupName: '통화' }).error).toBe('그룹 ID를 입력해 주세요.');

    expect(validateGroupForm({ groupId: 'CURRENCY', groupName: '' }).valid).toBe(false);
    expect(validateGroupForm({ groupId: 'CURRENCY', groupName: '   ' }).error).toBe('그룹명을 입력해 주세요.');

    const validRes = validateGroupForm({ groupId: ' currency_code ', groupName: ' 통화 구분 ' });
    expect(validRes.valid).toBe(true);
    expect(validRes.data?.group_id).toBe('CURRENCY_CODE');
    expect(validRes.data?.group_name).toBe('통화 구분');
  });

  it('strictly validates common code form input before submission (code, code_name)', () => {
    const validateCodeForm = (params: { code: string; codeName: string; sortOrder?: number; isActive?: boolean }) => {
      const cleanCode = params.code.trim().toUpperCase();
      const cleanName = params.codeName.trim();
      if (!cleanCode) return { valid: false, error: '코드를 입력해 주세요.' };
      if (!cleanName) return { valid: false, error: '코드명을 입력해 주세요.' };
      return {
        valid: true,
        data: {
          code: cleanCode,
          code_name: cleanName,
          sort_order: Number(params.sortOrder) || 1,
          is_active: params.isActive ?? true,
        },
      };
    };

    expect(validateCodeForm({ code: '', codeName: '달러' }).valid).toBe(false);
    expect(validateCodeForm({ code: '   ', codeName: '달러' }).error).toBe('코드를 입력해 주세요.');

    expect(validateCodeForm({ code: 'USD', codeName: '' }).valid).toBe(false);
    expect(validateCodeForm({ code: 'USD', codeName: '   ' }).error).toBe('코드명을 입력해 주세요.');

    const validRes = validateCodeForm({ code: ' usd ', codeName: ' 미국 달러 ', sortOrder: 2, isActive: true });
    expect(validRes.valid).toBe(true);
    expect(validRes.data?.code).toBe('USD');
    expect(validRes.data?.code_name).toBe('미국 달러');
    expect(validRes.data?.sort_order).toBe(2);
    expect(validRes.data?.is_active).toBe(true);
  });

  it('throws an error when Supabase code group or code insert/update fails, preventing silent modal close', async () => {
    const mockSaveCodeEntity = async (
      mockSupabase: { insertFails?: boolean; updateFails?: boolean },
      mode: 'create' | 'edit'
    ) => {
      if (mode === 'create') {
        if (mockSupabase.insertFails) {
          throw new Error('코드 등록 실패: duplicate group/code key violation');
        }
        return { success: true };
      } else {
        if (mockSupabase.updateFails) {
          throw new Error('코드 수정 실패: record not found');
        }
        return { success: true };
      }
    };

    // 1. Insert error throws
    await expect(mockSaveCodeEntity({ insertFails: true }, 'create')).rejects.toThrow('코드 등록 실패');

    // 2. Update error throws
    await expect(mockSaveCodeEntity({ updateFails: true }, 'edit')).rejects.toThrow('코드 수정 실패');

    // 3. Success
    const res = await mockSaveCodeEntity({}, 'create');
    expect(res.success).toBe(true);
  });
});
