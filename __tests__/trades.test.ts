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

describe('Trades Logic, Signed Quantities & Automated Type Tests', () => {
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
      quantity: -5,
      price: 220,
      currency: 'USD',
      exchange_rate: 1450,
      total_amount: -1100,
      total_amount_krw: -1595000,
      created_at: '2026-08-21T11:00:00Z',
    },
  ];

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

  it('aggregates trade totals in KRW Converted mode correctly', () => {
    const summary = aggregateTradeTotals(mockTrades, 'KRW');
    // Buy total: 2,900,000 (AAPL) + 3,500,000 (삼성전자) = 6,400,000 KRW
    expect(summary.buyTotal).toBe(6400000);
    // Sell total: Math.abs(-1,595,000) (AAPL) KRW
    expect(Math.abs(summary.sellTotal)).toBe(1595000);
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
