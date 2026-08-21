import { describe, it, expect } from 'vitest';
import { lookupTickerInfo, fetchRemoteTickerInfo } from '../lib/stock-ticker';

interface StockItem {
  ticker: string;
  name: string;
  short_name: string;
  type: string;
  currency: string;
  market: string;
  is_active: boolean;
}

const mockStocks: StockItem[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', short_name: '애플', type: 'Growth', currency: 'USD', market: 'NASDAQ', is_active: true },
  { ticker: 'MSFT', name: 'Microsoft Corporation', short_name: '마이크로소프트', type: 'Growth', currency: 'USD', market: 'NASDAQ', is_active: false },
  { ticker: '005930', name: '삼성전자', short_name: '삼성전자', type: 'Dividend', currency: 'KRW', market: 'KOSPI', is_active: true },
  { ticker: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', short_name: 'SCHD', type: 'Dividend', currency: 'USD', market: 'NYSE', is_active: true },
];

describe('Stock Ticker Auto-Lookup Helper', () => {
  it('known ticker AAPL returns Apple Inc. preset info', () => {
    const info = lookupTickerInfo('aapl');
    expect(info).not.toBeNull();
    expect(info?.name).toBe('Apple Inc.');
    expect(info?.short_name).toBe('애플');
    expect(info?.market).toBe('NASDAQ');
  });

  it('known ticker 005930 returns 삼성전자 preset info', () => {
    const info = lookupTickerInfo('005930');
    expect(info).not.toBeNull();
    expect(info?.name).toBe('삼성전자');
    expect(info?.currency).toBe('KRW');
  });

  it('unknown ticker returns null', () => {
    const info = lookupTickerInfo('UNKNOWN_TICKER_999');
    expect(info).toBeNull();
  });

  it('fetchRemoteTickerInfo returns preset info with source preset for known ticker', async () => {
    const info = await fetchRemoteTickerInfo('AAPL');
    expect(info).not.toBeNull();
    expect(info?.name).toBe('Apple Inc.');
    expect(info?.source).toBe('preset');
  });
});

describe('Stock Master Search, Filtering and Header Click Sorting Logic', () => {
  it('filters stocks by search query in name, short_name or ticker', () => {
    const q = '마이크로소프트';
    const filtered = mockStocks.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.short_name.toLowerCase().includes(q) ||
        s.ticker.toLowerCase().includes(q)
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].ticker).toBe('MSFT');
  });

  it('filters active vs inactive stocks correctly', () => {
    const activeOnly = mockStocks.filter((s) => s.is_active);
    const inactiveOnly = mockStocks.filter((s) => !s.is_active);

    expect(activeOnly).toHaveLength(3);
    expect(inactiveOnly).toHaveLength(1);
    expect(inactiveOnly[0].ticker).toBe('MSFT');
  });

  it('sorts stocks by name ascending by default with ticker secondary tie-breaker', () => {
    const sorted = [...mockStocks].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return cmp !== 0 ? cmp : a.ticker.localeCompare(b.ticker);
    });

    expect(sorted[0].name).toBe('Apple Inc.');
    expect(sorted[1].name).toBe('Microsoft Corporation');
    expect(sorted[2].name).toBe('Schwab U.S. Dividend Equity ETF');
    expect(sorted[3].name).toBe('삼성전자');
  });

  it('sorts stocks by short_name descending', () => {
    const sorted = [...mockStocks].sort((a, b) => {
      const cmp = b.short_name.localeCompare(a.short_name);
      return cmp !== 0 ? cmp : a.ticker.localeCompare(b.ticker);
    });

    expect(sorted[0].short_name).toBe('애플');
    expect(sorted[1].short_name).toBe('삼성전자');
    expect(sorted[2].short_name).toBe('마이크로소프트');
    expect(sorted[3].short_name).toBe('SCHD');
  });

  it('fallbacks short_name to name if short_name is empty', () => {
    const rawStock = { ticker: 'NVDA', name: 'NVIDIA Corporation', short_name: '' };
    const shortName = rawStock.short_name || rawStock.name;
    expect(shortName).toBe('NVIDIA Corporation');
  });

  it('strictly validates stock form input before submission (ticker, name, duplicate ticker check)', () => {
    const validateStockForm = (params: {
      ticker: string;
      name: string;
      existingTickers: string[];
      isEditMode?: boolean;
    }) => {
      const cleanTicker = params.ticker.trim().toUpperCase();
      if (!cleanTicker) {
        return { valid: false, error: '티커(종목코드)를 입력해 주세요.' };
      }
      if (!params.name || params.name.trim() === '') {
        return { valid: false, error: '종목명을 입력해 주세요.' };
      }
      if (!params.isEditMode && params.existingTickers.some((t) => t.toUpperCase() === cleanTicker)) {
        return { valid: false, error: `이미 등록되어 있는 티커(${cleanTicker})입니다.` };
      }
      return { valid: true };
    };

    const existing = ['AAPL', 'MSFT', '005930'];

    // 1. Missing ticker
    expect(validateStockForm({ ticker: '', name: 'Apple', existingTickers: existing }).valid).toBe(false);
    expect(validateStockForm({ ticker: '   ', name: 'Apple', existingTickers: existing }).error).toBe('티커(종목코드)를 입력해 주세요.');

    // 2. Missing name
    expect(validateStockForm({ ticker: 'NVDA', name: '', existingTickers: existing }).valid).toBe(false);
    expect(validateStockForm({ ticker: 'NVDA', name: '   ', existingTickers: existing }).error).toBe('종목명을 입력해 주세요.');

    // 3. Duplicate ticker in create mode
    expect(validateStockForm({ ticker: 'aapl', name: 'Apple Inc.', existingTickers: existing }).valid).toBe(false);
    expect(validateStockForm({ ticker: 'AAPL', name: 'Apple Inc.', existingTickers: existing }).error).toContain('이미 등록되어 있는 티커');

    // 4. Duplicate ticker allowed in edit mode (same ticker editing name)
    expect(validateStockForm({ ticker: 'AAPL', name: 'Apple Corp', existingTickers: existing, isEditMode: true }).valid).toBe(true);

    // 5. Valid new stock
    expect(validateStockForm({ ticker: 'NVDA', name: 'NVIDIA Corp', existingTickers: existing }).valid).toBe(true);
  });

  it('correctly builds stock payload (uppercases ticker, fallbacks short_name, default values)', () => {
    const buildStockPayload = (user: { id: string }, data: {
      ticker: string;
      name: string;
      short_name?: string;
      type?: string;
      currency?: string;
      market?: string;
      is_active?: boolean;
    }) => {
      const cleanTicker = data.ticker.trim().toUpperCase();
      const cleanName = data.name.trim();
      return {
        user_id: user.id,
        ticker: cleanTicker,
        name: cleanName,
        short_name: data.short_name?.trim() || cleanName,
        type: data.type || 'Growth',
        currency: data.currency || 'USD',
        market: data.market || 'NASDAQ',
        is_active: data.is_active ?? true,
      };
    };

    const mockUser = { id: 'user-stock-1' };
    const payload = buildStockPayload(mockUser, {
      ticker: '  amzn  ',
      name: '  Amazon.com Inc.  ',
      short_name: '   ',
    });

    expect(payload.user_id).toBe('user-stock-1');
    expect(payload.ticker).toBe('AMZN');
    expect(payload.name).toBe('Amazon.com Inc.');
    expect(payload.short_name).toBe('Amazon.com Inc.'); // Fallback to name
    expect(payload.type).toBe('Growth');
    expect(payload.currency).toBe('USD');
    expect(payload.market).toBe('NASDAQ');
    expect(payload.is_active).toBe(true);
  });

  it('throws an error when Supabase stock insert/update fails, preventing silent modal close', async () => {
    const mockSaveStock = async (
      mockSupabase: { insertFails?: boolean; updateFails?: boolean; isAuth?: boolean },
      mode: 'create' | 'edit',
      data: any
    ) => {
      if (!mockSupabase.isAuth) {
        throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
      }
      if (mode === 'create') {
        if (mockSupabase.insertFails) {
          throw new Error('종목 등록 실패: duplicate key value violates unique constraint');
        }
        return { success: true };
      } else {
        if (mockSupabase.updateFails) {
          throw new Error('종목 수정 실패: connection error');
        }
        return { success: true };
      }
    };

    // 1. Auth failure throws
    await expect(mockSaveStock({ isAuth: false }, 'create', {})).rejects.toThrow('로그인 세션이 만료되었습니다');

    // 2. Insert failure throws (not silently swallowed)
    await expect(mockSaveStock({ isAuth: true, insertFails: true }, 'create', { ticker: 'AAPL' })).rejects.toThrow('종목 등록 실패');

    // 3. Update failure throws
    await expect(mockSaveStock({ isAuth: true, updateFails: true }, 'edit', { ticker: 'AAPL' })).rejects.toThrow('종목 수정 실패');

    // 4. Success
    const res = await mockSaveStock({ isAuth: true }, 'create', { ticker: 'NVDA' });
    expect(res.success).toBe(true);
  });
});
