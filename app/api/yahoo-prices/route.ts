import { NextRequest, NextResponse } from 'next/server';

interface YahooQuoteResult {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  marketCap: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketOpen: number;
  regularMarketPreviousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  shortName: string;
}

interface YahooOptionChain {
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  expiration: string;
  type: 'call' | 'put';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tickers = searchParams.get('tickers');
  const includeOptions = searchParams.get('options') === 'true';

  if (!tickers) {
    return NextResponse.json({ error: 'Missing tickers parameter' }, { status: 400 });
  }

  const tickerList = tickers.split(',').map(t => t.trim().toUpperCase()).slice(0, 15);

  try {
    // Fetch stock quotes from Yahoo Finance v7 API
    const quotesUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickerList.join(',')}`;
    const quotesRes = await fetch(quotesUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      next: { revalidate: 30 }, // Cache for 30 seconds
    });

    let quotes: YahooQuoteResult[] = [];

    if (quotesRes.ok) {
      const quotesData = await quotesRes.json();
      quotes = (quotesData?.quoteResponse?.result || []).map((q: Record<string, unknown>) => ({
        symbol: q.symbol,
        regularMarketPrice: q.regularMarketPrice,
        regularMarketChange: q.regularMarketChange,
        regularMarketChangePercent: q.regularMarketChangePercent,
        regularMarketVolume: q.regularMarketVolume,
        marketCap: q.marketCap,
        regularMarketDayHigh: q.regularMarketDayHigh,
        regularMarketDayLow: q.regularMarketDayLow,
        regularMarketOpen: q.regularMarketOpen,
        regularMarketPreviousClose: q.regularMarketPreviousClose,
        fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: q.fiftyTwoWeekLow,
        shortName: q.shortName,
      }));
    }

    // If Yahoo v7 fails, try v8 chart API as fallback
    if (quotes.length === 0) {
      const chartPromises = tickerList.map(async (ticker) => {
        try {
          const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
          const chartRes = await fetch(chartUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });
          if (!chartRes.ok) return null;
          const chartData = await chartRes.json();
          const meta = chartData?.chart?.result?.[0]?.meta;
          if (!meta) return null;
          return {
            symbol: meta.symbol,
            regularMarketPrice: meta.regularMarketPrice,
            regularMarketChange: (meta.regularMarketPrice || 0) - (meta.previousClose || 0),
            regularMarketChangePercent:
              meta.previousClose
                ? (((meta.regularMarketPrice || 0) - meta.previousClose) / meta.previousClose) * 100
                : 0,
            regularMarketVolume: meta.regularMarketVolume || 0,
            marketCap: 0,
            regularMarketDayHigh: meta.regularMarketDayHigh || meta.regularMarketPrice,
            regularMarketDayLow: meta.regularMarketDayLow || meta.regularMarketPrice,
            regularMarketOpen: meta.regularMarketOpen || meta.regularMarketPrice,
            regularMarketPreviousClose: meta.previousClose || 0,
            fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
            fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
            shortName: meta.shortName || ticker,
          } as YahooQuoteResult;
        } catch {
          return null;
        }
      });
      const results = await Promise.all(chartPromises);
      quotes = results.filter((r): r is YahooQuoteResult => r !== null);
    }

    // Optionally fetch options data for closest expiration
    let options: YahooOptionChain[] = [];
    if (includeOptions && tickerList.length <= 5) {
      const optPromises = tickerList.map(async (ticker) => {
        try {
          const optUrl = `https://query1.finance.yahoo.com/v7/finance/options/${ticker}`;
          const optRes = await fetch(optUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });
          if (!optRes.ok) return [];
          const optData = await optRes.json();
          const chain = optData?.optionChain?.result?.[0];
          if (!chain?.options?.[0]) return [];

          const expDate = chain.options[0].expirationDate;
          const expStr = new Date(expDate * 1000).toISOString().split('T')[0];
          const stockPrice = chain.quote?.regularMarketPrice || 0;

          const calls = (chain.options[0].calls || [])
            .filter((c: Record<string, unknown>) =>
              Math.abs((c.strike as number) - stockPrice) / stockPrice < 0.15
            )
            .slice(0, 5)
            .map((c: Record<string, unknown>) => ({
              symbol: ticker,
              strike: c.strike,
              lastPrice: c.lastPrice,
              bid: c.bid,
              ask: c.ask,
              volume: c.volume || 0,
              openInterest: c.openInterest || 0,
              impliedVolatility: c.impliedVolatility,
              expiration: expStr,
              type: 'call' as const,
            }));

          const puts = (chain.options[0].puts || [])
            .filter((p: Record<string, unknown>) =>
              Math.abs((p.strike as number) - stockPrice) / stockPrice < 0.15
            )
            .slice(0, 5)
            .map((p: Record<string, unknown>) => ({
              symbol: ticker,
              strike: p.strike,
              lastPrice: p.lastPrice,
              bid: p.bid,
              ask: p.ask,
              volume: p.volume || 0,
              openInterest: p.openInterest || 0,
              impliedVolatility: p.impliedVolatility,
              expiration: expStr,
              type: 'put' as const,
            }));

          return [...calls, ...puts];
        } catch {
          return [];
        }
      });
      const optResults = await Promise.all(optPromises);
      options = optResults.flat();
    }

    return NextResponse.json({
      status: 'ok',
      source: 'yahoo-finance-direct',
      fetchedAt: new Date().toISOString(),
      quotes,
      options,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch Yahoo Finance data' },
      { status: 500 }
    );
  }
}
