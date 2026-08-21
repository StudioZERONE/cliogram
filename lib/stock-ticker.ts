/**
 * 종목 정보 출처 (Stock Data Sourcing Architecture):
 * 1. 1차 소스 (Local Preset Dictionary): 미국/한국 주요 상장 종목 및 ETF 초고속 반환.
 * 2. 2차 소스 (Extensible Public API / DB Sync): 필요 시 공공 증권 API 및 외부 파이낸스 API 연동 구역.
 * 3. 3차 소스 (User Direct Editing): 자동 완성 추천 후 사용자의 직접 편집 및 덮어쓰기 허용.
 */
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

  // European & Global Major Stocks
  DHER: { ticker: 'DHER', name: 'Delivery Hero SE', short_name: '딜리버리히어로', type: 'Growth', currency: 'EUR', market: 'XETRA' },

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

/**
 * 티커 코드를 바탕으로 1차 로컬 딕셔너리 및 2차 백엔드 실시간 API(/api/stock-lookup) 통합 조회
 */
export async function fetchRemoteTickerInfo(ticker: string): Promise<(PresetStockInfo & { source?: string }) | null> {
  if (!ticker || !ticker.trim()) return null;
  const cleanTicker = ticker.trim().toUpperCase();

  // 1차: 로컬 딕셔너리 즉시 반환
  const local = lookupTickerInfo(cleanTicker);
  if (local) return { ...local, source: 'preset' };

  // 2차: 백엔드 API 라우트 호출
  try {
    const res = await fetch(`/api/stock-lookup?ticker=${encodeURIComponent(cleanTicker)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      ticker: data.ticker || cleanTicker,
      name: data.name || cleanTicker,
      short_name: data.short_name || data.name || cleanTicker,
      type: data.type || 'Growth',
      currency: data.currency || 'USD',
      market: data.market || 'NASDAQ',
      source: data.source || 'yahoo_finance',
    };
  } catch (err) {
    console.error('fetchRemoteTickerInfo error:', err);
    return null;
  }
}
