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

    const yahooUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      searchSymbol
    )}&quotesCount=5&newsCount=0`;

    const res = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
          q.symbol?.toUpperCase() === searchSymbol
      ) || quotes[0];

    const longName = matched.longname || matched.shortname || matched.name || cleanTicker;
    const shortName = matched.shortname || longName.split(' ')[0] || longName;

    // Detect Currency and Market
    let currency = 'USD';
    let market = matched.exchange || 'NASDAQ';
    let type = 'Growth';

    const exchangeUpper = (matched.exchange || '').toUpperCase();
    const quoteTypeUpper = (matched.quoteType || '').toUpperCase();

    if (quoteTypeUpper.includes('ETF')) {
      type = 'ETF';
    }

    if (
      exchangeUpper.includes('KOSPI') ||
      exchangeUpper.includes('KOSDAQ') ||
      exchangeUpper.includes('KRX') ||
      matched.symbol?.endsWith('.KS') ||
      matched.symbol?.endsWith('.KQ')
    ) {
      currency = 'KRW';
      market = exchangeUpper.includes('KOSDAQ') ? 'KOSDAQ' : 'KOSPI';
    } else if (exchangeUpper.includes('NYSE')) {
      market = 'NYSE';
    } else if (exchangeUpper.includes('NASDAQ')) {
      market = 'NASDAQ';
    } else if (exchangeUpper.includes('GER') || exchangeUpper.includes('ETR')) {
      currency = 'EUR';
      market = 'XETRA';
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
