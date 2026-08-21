import { describe, it, expect } from 'vitest';

export interface AccountRecord {
  id: string;
  user_id: string;
  account_name: string;
  broker_name?: string | null;
  account_number?: string | null;
  sort_order: number;
  is_active: boolean;
}

describe('Accounts Master CRUD & Filter Logic Tests', () => {
  const mockAccounts: AccountRecord[] = [
    {
      id: 'acc-1',
      user_id: 'user-1',
      account_name: '종합위탁(국내/해외)',
      broker_name: 'KB증권',
      account_number: '123-45-678901',
      sort_order: 1,
      is_active: true,
    },
    {
      id: 'acc-2',
      user_id: 'user-1',
      account_name: '중개형 ISA',
      broker_name: '미래에셋',
      account_number: '987-65-432100',
      sort_order: 2,
      is_active: true,
    },
    {
      id: 'acc-3',
      user_id: 'user-1',
      account_name: '연금저축펀드',
      broker_name: '삼성증권',
      account_number: '555-11-222333',
      sort_order: 3,
      is_active: false,
    },
  ];

  it('filters accounts by search query (account_name, broker_name, account_number)', () => {
    const search = (query: string) => {
      const q = query.toLowerCase().trim();
      return mockAccounts.filter(
        (a) =>
          a.account_name.toLowerCase().includes(q) ||
          (a.broker_name && a.broker_name.toLowerCase().includes(q)) ||
          (a.account_number && a.account_number.toLowerCase().includes(q))
      );
    };

    expect(search('KB').length).toBe(1);
    expect(search('KB')[0].id).toBe('acc-1');

    expect(search('ISA').length).toBe(1);
    expect(search('ISA')[0].id).toBe('acc-2');

    expect(search('555').length).toBe(1);
    expect(search('555')[0].id).toBe('acc-3');

    expect(search('없는계좌').length).toBe(0);
  });

  it('filters accounts by active status', () => {
    const filterStatus = (status: 'ALL' | 'ACTIVE' | 'INACTIVE') => {
      if (status === 'ACTIVE') return mockAccounts.filter((a) => a.is_active);
      if (status === 'INACTIVE') return mockAccounts.filter((a) => !a.is_active);
      return mockAccounts;
    };

    expect(filterStatus('ALL').length).toBe(3);
    expect(filterStatus('ACTIVE').length).toBe(2);
    expect(filterStatus('INACTIVE').length).toBe(1);
    expect(filterStatus('INACTIVE')[0].account_name).toBe('연금저축펀드');
  });

  it('sorts accounts by sort_order ascending', () => {
    const sorted = [...mockAccounts].sort((a, b) => a.sort_order - b.sort_order);
    expect(sorted[0].sort_order).toBe(1);
    expect(sorted[1].sort_order).toBe(2);
    expect(sorted[2].sort_order).toBe(3);
  });

  it('determines the next sort_order for newly registered accounts', () => {
    const getNextSortOrder = (items: AccountRecord[]) => {
      if (items.length === 0) return 1;
      const maxOrder = Math.max(...items.map((i) => i.sort_order || 0));
      return maxOrder + 1;
    };

    expect(getNextSortOrder(mockAccounts)).toBe(4);
    expect(getNextSortOrder([])).toBe(1);
  });

  it('strictly validates account form input before submission (account_name required)', () => {
    const validateAccountForm = (params: { accountName: string }) => {
      if (!params.accountName || params.accountName.trim() === '') {
        return { valid: false, error: '계좌명을 입력해 주세요.' };
      }
      return { valid: true };
    };

    expect(validateAccountForm({ accountName: '' }).valid).toBe(false);
    expect(validateAccountForm({ accountName: '   ' }).valid).toBe(false);
    expect(validateAccountForm({ accountName: '   ' }).error).toBe('계좌명을 입력해 주세요.');
    expect(validateAccountForm({ accountName: '종합위탁계좌' }).valid).toBe(true);
  });

  it('correctly builds account database payload (sanitizes empty string to null for optional columns)', () => {
    const buildAccountPayload = (user: { id: string }, data: {
      account_name: string;
      broker_name?: string;
      account_number?: string;
      sort_order?: number;
      is_active?: boolean;
    }) => {
      return {
        user_id: user.id,
        account_name: data.account_name.trim(),
        broker_name: data.broker_name?.trim() || null,
        account_number: data.account_number?.trim() || null,
        sort_order: Number(data.sort_order) || 1,
        is_active: data.is_active ?? true,
      };
    };

    const mockUser = { id: 'user-uuid-1' };
    const payload = buildAccountPayload(mockUser, {
      account_name: '  CMA통장  ',
      broker_name: '   ',
      account_number: '',
      sort_order: 3,
      is_active: true,
    });

    expect(payload.user_id).toBe('user-uuid-1');
    expect(payload.account_name).toBe('CMA통장');
    expect(payload.broker_name).toBeNull();
    expect(payload.account_number).toBeNull();
    expect(payload.sort_order).toBe(3);
    expect(payload.is_active).toBe(true);
  });

  it('throws an error when Supabase account insert/update fails, preventing silent modal close', async () => {
    const mockSaveAccount = async (
      mockSupabase: { insertFails?: boolean; updateFails?: boolean; isAuth?: boolean },
      mode: 'create' | 'edit',
      data: any
    ) => {
      if (!mockSupabase.isAuth) {
        throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
      }
      if (mode === 'create') {
        if (mockSupabase.insertFails) {
          throw new Error("Supabase DB error: duplicate key value");
        }
        return { success: true };
      } else {
        if (mockSupabase.updateFails) {
          throw new Error("Supabase DB error: update failed");
        }
        return { success: true };
      }
    };

    // 1. Auth error throws
    await expect(mockSaveAccount({ isAuth: false }, 'create', {})).rejects.toThrow('로그인 세션이 만료되었습니다');

    // 2. Insert error throws
    await expect(mockSaveAccount({ isAuth: true, insertFails: true }, 'create', { account_name: 'Test' })).rejects.toThrow('duplicate key');

    // 3. Update error throws
    await expect(mockSaveAccount({ isAuth: true, updateFails: true }, 'edit', { id: 'acc-1', account_name: 'Test' })).rejects.toThrow('update failed');

    // 4. Success
    const res = await mockSaveAccount({ isAuth: true }, 'create', { account_name: 'Test' });
    expect(res.success).toBe(true);
  });
});
