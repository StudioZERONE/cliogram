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
});


