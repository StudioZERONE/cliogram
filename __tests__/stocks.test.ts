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
});
