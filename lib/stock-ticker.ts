export interface PresetStockInfo {
  ticker: string;
  name: string;
  short_name: string;
  type: string;
  currency: string;
  market: string;
}

export const POPULAR_STOCKS_PRESETS: Record<string, PresetStockInfo> = {
  // US Major Stocks & ETFs
  AAPL: { ticker: 'AAPL', name: 'Apple Inc.', short_name: '애플', type: 'Growth', currency: 'USD', market: 'NASDAQ' },
  MSFT: { ticker: 'MSFT', name: 'Microsoft Corporation', short_name: '마이크로소프트', type: 'Growth', currency: 'USD', market: 'NASDAQ' },
  NVDA: { ticker: 'NVDA', name: 'NVIDIA Corporation', short_name: '엔비디아', type: 'Growth', currency: 'USD', market: 'NASDAQ' },
  TSLA: { ticker: 'TSLA', name: 'Tesla, Inc.', short_name: '테슬라', type: 'Growth', currency: 'USD', market: 'NASDAQ' },
  GOOGL: { ticker: 'GOOGL', name: 'Alphabet Inc. Class A', short_name: '알파벳(구글)', type: 'Growth', currency: 'USD', market: 'NASDAQ' },
  GOOG: { ticker: 'GOOG', name: 'Alphabet Inc. Class C', short_name: '알파벳(구글C)', type: 'Growth', currency: 'USD', market: 'NASDAQ' },
  AMZN: { ticker: 'AMZN', name: 'Amazon.com, Inc.', short_name: '아마존', type: 'Growth', currency: 'USD', market: 'NASDAQ' },
  META: { ticker: 'META', name: 'Meta Platforms, Inc.', short_name: '메타', type: 'Growth', currency: 'USD', market: 'NASDAQ' },
  SCHD: { ticker: 'SCHD', name: 'Schwab U.S. Dividend Equity ETF', short_name: 'SCHD', type: 'Dividend', currency: 'USD', market: 'NYSE' },
  QQQ: { ticker: 'QQQ', name: 'Invesco QQQ Trust ETF', short_name: 'QQQ', type: 'ETF', currency: 'USD', market: 'NASDAQ' },
  SPY: { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', short_name: 'SPY', type: 'ETF', currency: 'USD', market: 'NYSE' },
  VOO: { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', short_name: 'VOO', type: 'ETF', currency: 'USD', market: 'NYSE' },
  O: { ticker: 'O', name: 'Realty Income Corporation', short_name: '리얼티인컴', type: 'Dividend', currency: 'USD', market: 'NYSE' },
  TLT: { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', short_name: 'TLT', type: 'ETF', currency: 'USD', market: 'NASDAQ' },
  JEPI: { ticker: 'JEPI', name: 'JPMorgan Equity Premium Income ETF', short_name: 'JEPI', type: 'Dividend', currency: 'USD', market: 'NYSE' },
  JEPQ: { ticker: 'JEPQ', name: 'JPMorgan Nasdaq Equity Premium Income ETF', short_name: 'JEPQ', type: 'Dividend', currency: 'USD', market: 'NASDAQ' },

  // KR Major Stocks & ETFs
  '005930': { ticker: '005930', name: '삼성전자', short_name: '삼성전자', type: 'Dividend', currency: 'KRW', market: 'KOSPI' },
  '005935': { ticker: '005935', name: '삼성전자우', short_name: '삼성전자우', type: 'Dividend', currency: 'KRW', market: 'KOSPI' },
  '000660': { ticker: '000660', name: 'SK하이닉스', short_name: 'SK하이닉스', type: 'Growth', currency: 'KRW', market: 'KOSPI' },
  '035420': { ticker: '035420', name: 'NAVER', short_name: '네이버', type: 'Growth', currency: 'KRW', market: 'KOSPI' },
  '035720': { ticker: '035720', name: '카카오', short_name: '카카오', type: 'Growth', currency: 'KRW', market: 'KOSPI' },
  '373220': { ticker: '373220', name: 'LG에너지솔루션', short_name: 'LG엔솔', type: 'Growth', currency: 'KRW', market: 'KOSPI' },
  '005380': { ticker: '005380', name: '현대자동차', short_name: '현대차', type: 'Dividend', currency: 'KRW', market: 'KOSPI' },
  '000270': { ticker: '000270', name: '기아', short_name: '기아', type: 'Dividend', currency: 'KRW', market: 'KOSPI' },
};

/**
 * 티커 코드를 바탕으로 주요 상장 종목 프리셋 정보를 조회합니다.
 */
export function lookupTickerInfo(ticker: string): PresetStockInfo | null {
  if (!ticker) return null;
  const cleanTicker = ticker.trim().toUpperCase();
  return POPULAR_STOCKS_PRESETS[cleanTicker] || null;
}
