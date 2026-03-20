/**
 * Yahoo Finance Chart API で株価を一括取得
 * 米国株・S&P500・日本株のティッカーに対応
 */

import type { StockQuote } from '../types/stock';

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string;
        regularMarketPrice?: number;
        regularMarketTime?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        symbol?: string;
      };
      indicators?: {
        quote?: Array<{ close?: (number | null)[] }>;
      };
    }>;
  };
}

interface YahooSearchResponse {
  quotes?: Array<{
    symbol?: string;
    shortname?: string;
    longname?: string;
    exchDisp?: string;
  }>;
  news?: Array<{
    uuid?: string;
    title?: string;
    summary?: string;
    publisher?: string;
    providerPublishTime?: number;
    link?: string;
    clickThroughUrl?: { url?: string };
  }>;
}

interface YahooSparkResponse {
  spark?: {
    result?: Array<{
      symbol?: string;
      response?: Array<{
        meta?: { symbol?: string };
        indicators?: { quote?: Array<{ close?: (number | null)[] }> };
      }>;
    }>;
  };
}

interface YahooQuoteSummaryResponse {
  quoteSummary?: {
    result?: Array<{
      price?: {
        currency?: string;
        regularMarketOpen?: { raw?: number };
        regularMarketDayHigh?: { raw?: number };
        regularMarketDayLow?: { raw?: number };
        marketCap?: { raw?: number };
      };
      summaryDetail?: {
        volume?: { raw?: number };
        averageVolume?: { raw?: number };
        trailingPE?: { raw?: number };
        fiftyTwoWeekHigh?: { raw?: number };
        fiftyTwoWeekLow?: { raw?: number };
      };
      defaultKeyStatistics?: {
        trailingPE?: { raw?: number };
      };
    }>;
  };
}

export interface StockSearchResult {
  symbol: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
}

export interface StockDetailData {
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  peRatio?: number;
  marketCap?: number;
  week52High?: number;
  week52Low?: number;
  avgVolume?: number;
  currency?: string;
}

export interface StockNewsItem {
  id: string;
  title: string;
  summary?: string;
  provider?: string;
  publishedAt?: number;
  url: string;
}

function parseChartResponse(ticker: string, data: YahooChartResponse): StockQuote | null {
  const result = data.chart?.result?.[0];
  if (!result) return null;

  let price: number | undefined = result.meta?.regularMarketPrice;
  let currency = (result.meta?.currency ?? 'USD').toUpperCase();
  const previousClose = result.meta?.chartPreviousClose ?? result.meta?.previousClose;

  if (price == null && result.indicators?.quote?.[0]?.close?.length) {
    const closes = result.indicators.quote[0].close;
    const last = closes.filter((c): c is number => c != null).pop();
    price = last;
  }

  if (price == null || price <= 0) return null;

  if (ticker.toUpperCase().endsWith('.T') || ticker.toUpperCase().endsWith('.TWO')) {
    currency = 'JPY';
  }

  return {
    ticker,
    price,
    currency: currency === 'JPY' ? 'JPY' : 'USD',
    changePercent:
      previousClose && previousClose > 0
        ? ((price - previousClose) / previousClose) * 100
        : undefined,
  };
}

export async function fetchQuote(ticker: string): Promise<StockQuote | null> {
  const encoded = encodeURIComponent(ticker);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1d`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as YahooChartResponse;
    return parseChartResponse(ticker, data);
  } catch {
    return null;
  }
}

export async function fetchQuotes(tickers: string[]): Promise<Record<string, StockQuote>> {
  const unique = [...new Set(tickers.filter(Boolean))];
  const results = await Promise.all(unique.map((t) => fetchQuote(t)));
  const out: Record<string, StockQuote> = {};
  unique.forEach((t, i) => {
    const q = results[i];
    if (q) out[t] = q;
  });
  return out;
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    q
  )}&quotesCount=10&newsCount=0&lang=ja-JP&region=JP`;

  try {
    const res = await fetch(url);
    const data = (await res.json()) as YahooSearchResponse;
    const quotes = Array.isArray(data.quotes) ? data.quotes : [];
    return quotes
      .filter((item): item is Required<Pick<StockSearchResult, 'symbol'>> & StockSearchResult =>
        Boolean(item.symbol)
      )
      .map((item) => ({
        symbol: item.symbol,
        shortname: item.shortname,
        longname: item.longname,
        exchDisp: item.exchDisp,
      }));
  } catch {
    return [];
  }
}

export async function fetchSparklines(symbols: string[]): Promise<Record<string, number[]>> {
  const unique = [...new Set(symbols.map((s) => s.trim()).filter(Boolean))];
  if (unique.length === 0) return {};

  const url = `https://query2.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(
    unique.join(',')
  )}&range=1d&interval=15m`;

  try {
    const res = await fetch(url);
    const data = (await res.json()) as YahooSparkResponse;
    const results = data.spark?.result ?? [];
    const out: Record<string, number[]> = {};

    for (const item of results) {
      const symbol = item.symbol || item.response?.[0]?.meta?.symbol;
      const closes = item.response?.[0]?.indicators?.quote?.[0]?.close ?? [];
      const cleaned = closes.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      if (symbol) {
        out[symbol] = cleaned;
      }
    }

    return out;
  } catch {
    return {};
  }
}

export async function fetchStockDetail(symbol: string): Promise<StockDetailData | null> {
  const s = symbol.trim().toUpperCase();
  if (!s) return null;

  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    s
  )}?modules=price,summaryDetail,defaultKeyStatistics`;

  try {
    const res = await fetch(url);
    const data = (await res.json()) as YahooQuoteSummaryResponse;
    const result = data.quoteSummary?.result?.[0];
    if (!result) return null;

    const price = result.price;
    const detail = result.summaryDetail;
    const stats = result.defaultKeyStatistics;

    return {
      open: price?.regularMarketOpen?.raw,
      high: price?.regularMarketDayHigh?.raw,
      low: price?.regularMarketDayLow?.raw,
      volume: detail?.volume?.raw,
      peRatio: detail?.trailingPE?.raw ?? stats?.trailingPE?.raw,
      marketCap: price?.marketCap?.raw,
      week52High: detail?.fiftyTwoWeekHigh?.raw,
      week52Low: detail?.fiftyTwoWeekLow?.raw,
      avgVolume: detail?.averageVolume?.raw,
      currency: price?.currency,
    };
  } catch {
    return null;
  }
}

export async function fetchChartData(symbol: string, range: string): Promise<number[]> {
  const s = symbol.trim().toUpperCase();
  if (!s) return [];

  const intervalMap: Record<string, string> = {
    '1d': '15m',
    '5d': '30m',
    '1mo': '1d',
    '3mo': '1d',
    '6mo': '1d',
    ytd: '1d',
    '1y': '1d',
  };
  const interval = intervalMap[range] ?? '1d';

  const url = `https://query2.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(
    s
  )}&range=${encodeURIComponent(range)}&interval=${interval}`;

  try {
    const res = await fetch(url);
    const data = (await res.json()) as YahooSparkResponse;
    const result = data.spark?.result?.[0];
    const closes = result?.response?.[0]?.indicators?.quote?.[0]?.close ?? [];
    return closes.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  } catch {
    return [];
  }
}

export async function fetchStockNews(symbol: string): Promise<StockNewsItem[]> {
  const s = symbol.trim().toUpperCase();
  if (!s) return [];

  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    s
  )}&newsCount=5&lang=ja-JP&region=JP`;

  try {
    const res = await fetch(url);
    const data = (await res.json()) as YahooSearchResponse;
    const news = Array.isArray(data.news) ? data.news : [];
    return news
      .map((item, index) => {
        const resolvedUrl = item.clickThroughUrl?.url || item.link;
        if (!item.title || !resolvedUrl) return null;
        return {
          id: item.uuid || `${s}-news-${index}`,
          title: item.title,
          summary: item.summary,
          provider: item.publisher,
          publishedAt: item.providerPublishTime,
          url: resolvedUrl,
        } as StockNewsItem;
      })
      .filter((item): item is StockNewsItem => item != null);
  } catch {
    return [];
  }
}
