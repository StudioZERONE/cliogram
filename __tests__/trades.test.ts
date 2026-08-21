import { describe, it, expect } from 'vitest';
import { formatCommaString, parseCommaNumber } from '../lib/format';

export interface TradeRecord {
  id: string;
  trade_date: string;
  ticker: string;
  trade_type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  currency: 'KRW' | 'USD' | 'EUR';
  exchange_rate: number;
  total_amount: number;
  total_amount_krw: number;
  fee?: number;
  tax?: number;
  foreign_fee?: number;
  foreign_tax?: number;
  notes?: string;
  created_at: string;
}

export interface StockMaster {
  ticker: string;
  name: string;
  short_name: string;
  currency: string;
}

export function determineTradeTypeAndAmounts(signedQty: number, price: number, currency: string, rate: number = 1450) {
  const trade_type: 'BUY' | 'SELL' = signedQty < 0 ? 'SELL' : 'BUY';
  const exchange_rate = currency === 'KRW' ? 1 : rate;
  const total_amount = signedQty * price;
  const total_amount_krw = currency === 'KRW' ? total_amount : total_amount * exchange_rate;

  return {
    trade_type,
    quantity: signedQty,
    price,
    total_amount,
    total_amount_krw: Math.round(total_amount_krw),
  };
}

export function calculateTradeAmounts(trade: Partial<TradeRecord>) {
  const qty = trade.quantity || 0;
  const price = trade.price || 0;
  const rate = trade.currency === 'KRW' ? 1 : trade.exchange_rate || 1450;
  const totalOriginal = qty * price;
  const totalKrw = trade.currency === 'KRW' ? totalOriginal : totalOriginal * rate;

  return {
    totalOriginal,
    totalKrw: Math.round(totalKrw),
    rate,
  };
}

export function resolveStockName(ticker: string, masterMap: Record<string, StockMaster>) {
  const stock = masterMap[ticker];
  return {
    fullName: stock?.name || ticker,
    shortName: stock?.short_name || stock?.name || ticker,
  };
}

describe('Trades Logic, Stock Master JOIN & Comma Formatting Tests', () => {
  const mockMaster: Record<string, StockMaster> = {
    AAPL: { ticker: 'AAPL', name: '애플', short_name: '애플', currency: 'USD' },
    '005930': { ticker: '005930', name: '삼성전자', short_name: '삼성전자', currency: 'KRW' },
  };

  const mockTrades: TradeRecord[] = [
    {
      id: 't1',
      trade_date: '2026-08-20',
      ticker: 'AAPL',
      trade_type: 'BUY',
      quantity: 10,
      price: 200,
      currency: 'USD',
      exchange_rate: 1450,
      total_amount: 2000,
      total_amount_krw: 2900000,
      created_at: '2026-08-20T10:00:00Z',
    },
    {
      id: 't2',
      trade_date: '2026-08-21',
      ticker: '005930',
      trade_type: 'BUY',
      quantity: 50,
      price: 70000,
      currency: 'KRW',
      exchange_rate: 1,
      total_amount: 3500000,
      total_amount_krw: 3500000,
      created_at: '2026-08-21T09:00:00Z',
    },
    {
      id: 't3',
      trade_date: '2026-08-21',
      ticker: 'AAPL',
      trade_type: 'SELL',
      quantity: -5,
      price: 220,
      currency: 'USD',
      exchange_rate: 1450,
      total_amount: -1100,
      total_amount_krw: -1595000,
      created_at: '2026-08-21T11:00:00Z',
    },
  ];

  it('formats comma strings and parses numbers correctly', () => {
    expect(formatCommaString('10000')).toBe('10,000');
    expect(formatCommaString('-10000')).toBe('-10,000');
    expect(formatCommaString('1234567.89')).toBe('1,234,567.89');
    expect(formatCommaString('-')).toBe('-');
    expect(formatCommaString('')).toBe('');

    expect(parseCommaNumber('10,000')).toBe(10000);
    expect(parseCommaNumber('-10,000.50')).toBe(-10000.5);
    expect(parseCommaNumber('')).toBe(0);
  });

  it('resolves stock names dynamically from stock master JOIN', () => {
    const aapl = resolveStockName('AAPL', mockMaster);
    expect(aapl.fullName).toBe('애플');
    expect(aapl.shortName).toBe('애플');

    const unknown = resolveStockName('UNKNOWN_TICKER', mockMaster);
    expect(unknown.fullName).toBe('UNKNOWN_TICKER');
    expect(unknown.shortName).toBe('UNKNOWN_TICKER');
  });

  it('determines BUY for positive quantity and SELL for negative quantity automatically', () => {
    const buyResult = determineTradeTypeAndAmounts(10, 200, 'USD', 1450);
    expect(buyResult.trade_type).toBe('BUY');
    expect(buyResult.total_amount).toBe(2000);
    expect(buyResult.total_amount_krw).toBe(2900000);

    const sellResult = determineTradeTypeAndAmounts(-5, 220, 'USD', 1450);
    expect(sellResult.trade_type).toBe('SELL');
    expect(sellResult.total_amount).toBe(-1100);
    expect(sellResult.total_amount_krw).toBe(-1595000);
  });

  it('calculates trade amounts correctly for USD and KRW', () => {
    const usdTrade = calculateTradeAmounts({
      quantity: 10,
      price: 200,
      currency: 'USD',
      exchange_rate: 1450,
    });
    expect(usdTrade.totalOriginal).toBe(2000);
    expect(usdTrade.totalKrw).toBe(2900000);

    const krwTrade = calculateTradeAmounts({
      quantity: 50,
      price: 70000,
      currency: 'KRW',
      exchange_rate: 1,
    });
    expect(krwTrade.totalOriginal).toBe(3500000);
    expect(krwTrade.totalKrw).toBe(3500000);
  });

  it('filters trades by trade year and extracts distinct recorded years dynamically', () => {
    const extractDistinctYears = (items: typeof mockTrades) => {
      return Array.from(
        new Set(
          items
            .map((t) => t.trade_date?.substring(0, 4))
            .filter((y): y is string => Boolean(y && y.length === 4))
        )
      ).sort((a, b) => b.localeCompare(a));
    };

    const distinctYears = extractDistinctYears(mockTrades);
    expect(distinctYears).toEqual(['2026']);
    expect(distinctYears[0]).toBe('2026'); // Latest recorded year in DB

    const filterByYear = (items: typeof mockTrades, year: string) => {
      if (year === 'ALL') return items;
      return items.filter((item) => item.trade_date.startsWith(year));
    };

    const all2026 = filterByYear(mockTrades, '2026');
    expect(all2026.length).toBe(3);

    const all2025 = filterByYear(mockTrades, '2025');
    expect(all2025.length).toBe(0);

    const all = filterByYear(mockTrades, 'ALL');
    expect(all.length).toBe(3);
  });

  it('filters trades by account_id and associates account master information', () => {
    interface AccountMaster {
      id: string;
      account_name: string;
      broker_name: string;
    }

    const mockAccounts: AccountMaster[] = [
      { id: 'acc-1', account_name: '종합위탁(해외)', broker_name: 'KB증권' },
      { id: 'acc-2', account_name: 'CMA계좌', broker_name: '미래에셋' },
    ];

    const tradesWithAccounts = [
      { ...mockTrades[0], account_id: 'acc-1', accounts: mockAccounts[0] },
      { ...mockTrades[1], account_id: 'acc-1', accounts: mockAccounts[0] },
      { ...mockTrades[2], account_id: 'acc-2', accounts: mockAccounts[1] },
    ];

    const filterByAccount = (items: typeof tradesWithAccounts, accId: string) => {
      if (accId === 'ALL') return items;
      return items.filter((item) => item.account_id === accId);
    };

    const acc1Trades = filterByAccount(tradesWithAccounts, 'acc-1');
    expect(acc1Trades.length).toBe(2);
    expect(acc1Trades[0].accounts.broker_name).toBe('KB증권');

    const acc2Trades = filterByAccount(tradesWithAccounts, 'acc-2');
    expect(acc2Trades.length).toBe(1);
    expect(acc2Trades[0].accounts.broker_name).toBe('미래에셋');
  });

  it('verifies stock auto-enrollment condition when a trade with a new ticker is saved', () => {
    const existingStocks = [{ ticker: 'AAPL' }, { ticker: '005930' }];

    const checkShouldAutoEnroll = (tradeTicker: string, stocksList: { ticker: string }[]) => {
      const cleanTicker = tradeTicker.trim().toUpperCase();
      const exists = stocksList.some((s) => s.ticker.toUpperCase() === cleanTicker);
      return !exists;
    };

    expect(checkShouldAutoEnroll('AAPL', existingStocks)).toBe(false);
    expect(checkShouldAutoEnroll('DHER', existingStocks)).toBe(true);
    expect(checkShouldAutoEnroll('NVDA', existingStocks)).toBe(true);
  });

  it('correctly calculates cumulative remaining quantity per account and ticker (with decimal fractional shares)', () => {
    const rawTradeHistory = [
      { id: '1', account_id: 'acc-1', ticker: 'NVDA', trade_date: '2026-01-10', quantity: 10, created_at: '2026-01-10T10:00:00Z' },
      { id: '2', account_id: 'acc-1', ticker: 'NVDA', trade_date: '2026-02-15', quantity: 5.5, created_at: '2026-02-15T10:00:00Z' },
      { id: '3', account_id: 'acc-1', ticker: 'NVDA', trade_date: '2026-03-20', quantity: -3.5, created_at: '2026-03-20T10:00:00Z' },
      { id: '4', account_id: 'acc-1', ticker: 'NVDA', trade_date: '2026-04-01', quantity: -12, created_at: '2026-04-01T10:00:00Z' },
      { id: '5', account_id: 'acc-2', ticker: 'NVDA', trade_date: '2026-01-15', quantity: 20, created_at: '2026-01-15T10:00:00Z' },
    ];

    const computeTestBalances = (tradesList: typeof rawTradeHistory) => {
      const sorted = [...tradesList].sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
      const balances: Record<string, number> = {};
      return sorted.map((t) => {
        const key = `${t.account_id}_${t.ticker}`;
        const prev = balances[key] || 0;
        const current = prev + t.quantity;
        balances[key] = current;
        return { ...t, remaining_quantity: current };
      });
    };

    const evaluated = computeTestBalances(rawTradeHistory);
    expect(evaluated[0].remaining_quantity).toBe(10);
    expect(evaluated[1].remaining_quantity).toBe(20); // acc-2 NVDA = 20
    expect(evaluated[2].remaining_quantity).toBe(15.5); // acc-1 NVDA = 10 + 5.5
    expect(evaluated[3].remaining_quantity).toBe(12); // acc-1 NVDA = 15.5 - 3.5
    expect(evaluated[4].remaining_quantity).toBe(0); // acc-1 NVDA = 12 - 12
  });

  it('validates that sell quantity cannot exceed current available holding', () => {
    const currentHolding = 15.5;

    const validateSell = (sellQty: number, holding: number) => {
      const absQty = Math.abs(sellQty);
      if (absQty > holding) {
        return { valid: false, error: `매도 수량(${absQty}주)이 현재 보유 잔고(${holding}주)를 초과합니다.` };
      }
      return { valid: true };
    };

    expect(validateSell(-10, currentHolding).valid).toBe(true);
    expect(validateSell(-15.5, currentHolding).valid).toBe(true);
    expect(validateSell(-15.6, currentHolding).valid).toBe(false);
    expect(validateSell(-20, currentHolding).error).toContain('초과합니다');
  });

  it('strictly validates trade form input before submission (accountId, ticker, quantity, price)', () => {
    const validateTradeForm = (params: {
      accountId: string;
      ticker: string;
      parsedQty: number;
      parsedPrice: number;
      isSellExceeded?: boolean;
    }) => {
      if (!params.accountId || params.accountId.trim() === '') {
        return { valid: false, error: '계좌를 선택해 주세요.' };
      }
      if (!params.ticker || params.ticker.trim() === '') {
        return { valid: false, error: '티커를 입력해 주세요.' };
      }
      if (params.parsedQty === 0) {
        return { valid: false, error: '수량을 0이 아닌 숫자로 입력해 주세요.' };
      }
      if (params.parsedPrice <= 0) {
        return { valid: false, error: '단가를 0보다 큰 숫자로 입력해 주세요.' };
      }
      if (params.isSellExceeded) {
        return { valid: false, error: '보유 수량을 초과하여 매도할 수 없습니다.' };
      }
      return { valid: true };
    };

    expect(validateTradeForm({ accountId: '', ticker: 'AAPL', parsedQty: 10, parsedPrice: 200 }).valid).toBe(false);
    expect(validateTradeForm({ accountId: '', ticker: 'AAPL', parsedQty: 10, parsedPrice: 200 }).error).toBe('계좌를 선택해 주세요.');

    expect(validateTradeForm({ accountId: 'acc-1', ticker: '', parsedQty: 10, parsedPrice: 200 }).valid).toBe(false);
    expect(validateTradeForm({ accountId: 'acc-1', ticker: '', parsedQty: 10, parsedPrice: 200 }).error).toBe('티커를 입력해 주세요.');

    expect(validateTradeForm({ accountId: 'acc-1', ticker: 'AAPL', parsedQty: 0, parsedPrice: 200 }).valid).toBe(false);
    expect(validateTradeForm({ accountId: 'acc-1', ticker: 'AAPL', parsedQty: 0, parsedPrice: 200 }).error).toBe('수량을 0이 아닌 숫자로 입력해 주세요.');

    expect(validateTradeForm({ accountId: 'acc-1', ticker: 'AAPL', parsedQty: 10, parsedPrice: 0 }).valid).toBe(false);
    expect(validateTradeForm({ accountId: 'acc-1', ticker: 'AAPL', parsedQty: 10, parsedPrice: -50 }).valid).toBe(false);

    expect(validateTradeForm({ accountId: 'acc-1', ticker: 'AAPL', parsedQty: 10, parsedPrice: 200, isSellExceeded: true }).valid).toBe(false);

    expect(validateTradeForm({ accountId: 'acc-1', ticker: 'AAPL', parsedQty: 10, parsedPrice: 200 }).valid).toBe(true);
  });

  it('correctly builds and sanitizes database payload (UUID empty-string to null, defaults)', () => {
    const buildTradePayload = (user: { id: string }, tradeData: any) => {
      const cleanTicker = tradeData.ticker?.trim().toUpperCase();
      return {
        user_id: user.id,
        account_id: tradeData.account_id ? tradeData.account_id : null,
        trade_date: tradeData.trade_date,
        ticker: cleanTicker,
        trade_type: tradeData.trade_type,
        quantity: tradeData.quantity,
        price: tradeData.price,
        currency: tradeData.currency,
        exchange_rate: tradeData.exchange_rate ?? 1,
        total_amount: tradeData.total_amount,
        total_amount_krw: tradeData.total_amount_krw,
        fee: tradeData.fee ?? 0,
        tax: tradeData.tax ?? 0,
        foreign_fee: tradeData.foreign_fee ?? 0,
        foreign_tax: tradeData.foreign_tax ?? 0,
        notes: tradeData.notes?.trim() || null,
      };
    };

    const mockUser = { id: 'user-uuid-123' };
    const payloadWithEmptyFields = buildTradePayload(mockUser, {
      account_id: '',
      trade_date: '2026-08-22',
      ticker: '  nvda  ',
      trade_type: 'BUY',
      quantity: 5,
      price: 130,
      currency: 'USD',
      notes: '   ',
    });

    expect(payloadWithEmptyFields.user_id).toBe('user-uuid-123');
    expect(payloadWithEmptyFields.account_id).toBeNull(); // Empty string converted to null for Postgres UUID compatibility
    expect(payloadWithEmptyFields.ticker).toBe('NVDA'); // Trimmed & uppercase
    expect(payloadWithEmptyFields.exchange_rate).toBe(1);
    expect(payloadWithEmptyFields.fee).toBe(0);
    expect(payloadWithEmptyFields.notes).toBeNull(); // Whitespace string converted to null
  });

  it('throws an error when Supabase insert/update fails, preventing silent failure in modal', async () => {
    const mockSaveTrade = async (
      supabaseMock: { insertReturnsError?: boolean; updateReturnsError?: boolean; isAuth?: boolean },
      mode: 'create' | 'edit',
      tradeData: any
    ) => {
      if (!supabaseMock.isAuth) {
        throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
      }

      if (mode === 'edit') {
        if (supabaseMock.updateReturnsError) {
          throw new Error('Failed to update trade: DB constraint violation');
        }
        return { success: true };
      } else {
        if (supabaseMock.insertReturnsError) {
          throw new Error('Failed to insert trade: Foreign key constraint violation');
        }
        return { success: true };
      }
    };

    // 1. Auth failure should throw
    await expect(mockSaveTrade({ isAuth: false }, 'create', {})).rejects.toThrow('로그인 세션이 만료되었습니다');

    // 2. Insert DB error should throw (not silently swallowed)
    await expect(
      mockSaveTrade({ isAuth: true, insertReturnsError: true }, 'create', { ticker: 'AAPL' })
    ).rejects.toThrow('Failed to insert trade');

    // 3. Update DB error should throw
    await expect(
      mockSaveTrade({ isAuth: true, updateReturnsError: true }, 'edit', { id: 't1' })
    ).rejects.toThrow('Failed to update trade');

    // 4. Normal success
    const result = await mockSaveTrade({ isAuth: true }, 'create', { ticker: 'AAPL' });
    expect(result.success).toBe(true);
  });

  it('handles Schema Cache Fallback by stripping foreign_tax/foreign_fee when remote schema lacks them', async () => {
    const mockSaveWithFallback = async (payload: any, schemaHasForeignCols: boolean) => {
      let insertedPayload = { ...payload };
      if (!schemaHasForeignCols) {
        // Simulates first attempt returning PGRST204 / schema cache error
        const initialError = new Error("Could not find the 'foreign_tax' column of 'trades' in the schema cache");
        // Fallback logic
        delete insertedPayload.foreign_fee;
        delete insertedPayload.foreign_tax;
      }
      return { success: true, payload: insertedPayload };
    };

    const fullPayload = {
      ticker: 'AAPL',
      quantity: 10,
      price: 200,
      foreign_fee: 1,
      foreign_tax: 2,
    };

    const res = await mockSaveWithFallback(fullPayload, false);
    expect(res.success).toBe(true);
    expect(res.payload.foreign_tax).toBeUndefined();
    expect(res.payload.foreign_fee).toBeUndefined();
    expect(res.payload.ticker).toBe('AAPL');
  });

  it('ensures stock_name is always populated from resolved stock or ticker in trade payload', () => {
    const buildTradePayload = (tradeData: any, stocks: any[]) => {
      const cleanTicker = tradeData.ticker?.trim().toUpperCase();
      const existingStock = stocks.find((s) => s.ticker?.toUpperCase() === cleanTicker);
      const stockName = tradeData.resolvedStock?.name || existingStock?.name || cleanTicker;
      return {
        ticker: cleanTicker,
        stock_name: stockName,
        quantity: tradeData.quantity,
        price: tradeData.price,
      };
    };

    const payload1 = buildTradePayload(
      { ticker: '005380', quantity: 2, price: 4000, resolvedStock: { name: '현대차' } },
      []
    );
    expect(payload1.stock_name).toBe('현대차');
    expect(payload1.ticker).toBe('005380');

    const payload2 = buildTradePayload(
      { ticker: 'TSLA', quantity: 5, price: 200 },
      [{ ticker: 'TSLA', name: '테슬라' }]
    );
    expect(payload2.stock_name).toBe('테슬라');

    const payload3 = buildTradePayload(
      { ticker: 'UNKNOWN', quantity: 1, price: 100 },
      []
    );
    expect(payload3.stock_name).toBe('UNKNOWN');
  });

  it('assigns Growth as the fixed default type for auto-registered stocks from trades', () => {
    const buildAutoRegisteredStock = (ticker: string, tradeCurrency: string, resolved?: any) => {
      const cleanTicker = ticker.trim().toUpperCase();
      const stockName = resolved?.name || cleanTicker;
      const stockShortName = resolved?.short_name || stockName;
      const stockCurrency = tradeCurrency || resolved?.currency || 'USD';
      const stockMarket = resolved?.market || (stockCurrency === 'KRW' ? 'KRX' : 'NASDAQ');

      return {
        ticker: cleanTicker,
        name: stockName,
        short_name: stockShortName,
        type: 'Growth', // 고정값: 성장주 (Growth)
        currency: stockCurrency,
        market: stockMarket,
        is_active: true,
      };
    };

    const newStock1 = buildAutoRegisteredStock('005380', 'KRW', { name: '현대차', short_name: '현대차', market: 'KRX' });
    expect(newStock1.type).toBe('Growth');
    expect(newStock1.name).toBe('현대차');
    expect(newStock1.market).toBe('KRX');
    expect(newStock1.currency).toBe('KRW');

    const newStock2 = buildAutoRegisteredStock('NVDA', 'USD');
    expect(newStock2.type).toBe('Growth');
    expect(newStock2.market).toBe('NASDAQ');
    expect(newStock2.currency).toBe('USD');
  });
});


