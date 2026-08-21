import { describe, it, expect } from 'vitest';

export interface TradeRecord {
  id: string;
  trade_date: string;
  ticker: string;
  stock_name: string;
  trade_type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  currency: 'KRW' | 'USD' | 'EUR';
  exchange_rate: number;
  total_amount: number;
  total_amount_krw: number;
  created_at: string;
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

export function aggregateTradeTotals(trades: TradeRecord[], mode: 'ORIGINAL' | 'KRW') {
  let buyTotal = 0;
  let sellTotal = 0;

  trades.forEach((t) => {
    const { totalOriginal, totalKrw } = calculateTradeAmounts(t);
    const amount = mode === 'KRW' ? totalKrw : totalOriginal;

    if (t.trade_type === 'BUY') {
      buyTotal += amount;
    } else {
      sellTotal += amount;
    }
  });

  return {
    buyTotal,
    sellTotal,
    netTotal: buyTotal - sellTotal,
  };
}

describe('Trades Logic & Dual Currency Conversion Tests', () => {
  const mockTrades: TradeRecord[] = [
    {
      id: 't1',
      trade_date: '2026-08-20',
      ticker: 'AAPL',
      stock_name: '애플',
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
      stock_name: '삼성전자',
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
      stock_name: '애플',
      trade_type: 'SELL',
      quantity: 5,
      price: 220,
      currency: 'USD',
      exchange_rate: 1450,
      total_amount: 1100,
      total_amount_krw: 1595000,
      created_at: '2026-08-21T11:00:00Z',
    },
  ];

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

  it('aggregates trade totals in KRW Converted mode correctly', () => {
    const summary = aggregateTradeTotals(mockTrades, 'KRW');
    // Buy total: 2,900,000 (AAPL) + 3,500,000 (삼성전자) = 6,400,000 KRW
    expect(summary.buyTotal).toBe(6400000);
    // Sell total: 1,595,000 (AAPL) KRW
    expect(summary.sellTotal).toBe(1595000);
    // Net total: 6,400,000 - 1,595,000 = 4,805,000 KRW
    expect(summary.netTotal).toBe(4805000);
  });

  it('sorts trades deterministically by trade_date DESC and created_at DESC', () => {
    const sorted = [...mockTrades].sort((a, b) => {
      const dateCompare = new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    expect(sorted[0].id).toBe('t3'); // 2026-08-21 11:00
    expect(sorted[1].id).toBe('t2'); // 2026-08-21 09:00
    expect(sorted[2].id).toBe('t1'); // 2026-08-20 10:00
  });
});
