import { NextRequest, NextResponse } from 'next/server';
import { lookupTickerInfo } from '@/lib/stock-ticker';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawTicker = searchParams.get('ticker');

    if (!rawTicker || !rawTicker.trim()) {
      return NextResponse.json(
        { error: 'Ticker query parameter is required.' },
        { status: 400 }
      );
    }

    const cleanTicker = rawTicker.trim().toUpperCase();

    // 1. Check Local Preset Dictionary First
    const preset = lookupTickerInfo(cleanTicker);
    if (preset) {
      return NextResponse.json({
        ...preset,
        source: 'preset',
      });
    }

    // 2. Query Yahoo Finance Search API for Live Info
    // For Korean 6-digit tickers, append .KS / .KQ if needed for Yahoo
    let searchSymbol = cleanTicker;
    if (/^\d{6}$/.test(cleanTicker)) {
      searchSymbol = `${cleanTicker}.KS`;
    }

    const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      searchSymbol
    )}&quotesCount=5&newsCount=0`;

    const res = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
      },
      next: { revalidate: 3600 }, // 1-hour cache
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Yahoo Finance API error: ${res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const quotes = data.quotes || [];

    if (quotes.length === 0) {
      return NextResponse.json(
        { error: `No stock info found for ticker '${cleanTicker}'` },
        { status: 404 }
      );
    }

    // Find best matching quote
    const matched =
      quotes.find(
        (q: any) =>
          q.symbol?.toUpperCase() === cleanTicker ||
          q.symbol?.toUpperCase() === searchSymbol ||
          q.symbol?.toUpperCase().startsWith(cleanTicker + '.')
      ) || quotes[0];

    const longName = matched.longname || matched.shortname || matched.name || cleanTicker;
    const shortName = matched.shortname || longName.split(' ')[0] || longName;

    // Detect Currency and Market
    let currency = 'USD';
    let market = matched.exchDisp || matched.exchange || 'NASDAQ';
    let type = 'Growth';

    const exchangeUpper = (matched.exchange || '').toUpperCase();
    const exchDispUpper = (matched.exchDisp || '').toUpperCase();
    const quoteTypeUpper = (matched.quoteType || '').toUpperCase();
    const symbolUpper = (matched.symbol || '').toUpperCase();

    if (quoteTypeUpper.includes('ETF')) {
      type = 'ETF';
    }

    if (
      exchangeUpper.includes('KOSPI') ||
      exchangeUpper.includes('KOSDAQ') ||
      exchangeUpper.includes('KRX') ||
      symbolUpper.endsWith('.KS') ||
      symbolUpper.endsWith('.KQ')
    ) {
      currency = 'KRW';
      market = exchangeUpper.includes('KOSDAQ') ? 'KOSDAQ' : 'KOSPI';
    } else if (
      exchangeUpper.includes('GER') ||
      exchangeUpper.includes('ETR') ||
      exchangeUpper.includes('FRA') ||
      exchangeUpper.includes('PAR') ||
      exchangeUpper.includes('AMS') ||
      exchDispUpper.includes('XETRA') ||
      exchDispUpper.includes('FRANKFURT') ||
      exchDispUpper.includes('EURONEXT') ||
      symbolUpper.endsWith('.DE') ||
      symbolUpper.endsWith('.PA')
    ) {
      currency = 'EUR';
      market = exchDispUpper || 'XETRA';
    } else if (exchangeUpper.includes('TYO') || symbolUpper.endsWith('.T')) {
      currency = 'JPY';
      market = 'Tokyo';
    } else if (exchangeUpper.includes('LSE') || symbolUpper.endsWith('.L')) {
      currency = 'GBP';
      market = 'LSE';
    } else if (exchangeUpper.includes('NYSE')) {
      market = 'NYSE';
    } else if (exchangeUpper.includes('NASDAQ')) {
      market = 'NASDAQ';
    }

    return NextResponse.json({
      ticker: cleanTicker,
      name: longName,
      short_name: shortName,
      type,
      currency,
      market,
      source: 'yahoo_finance',
    });
  } catch (error: any) {
    console.error('Stock lookup API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to lookup stock ticker' },
      { status: 500 }
    );
  }
}
