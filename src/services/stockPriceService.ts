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
        symbol?: string;
      };
      indicators?: {
        quote?: Array<{ close?: (number | null)[] }>;
      };
    }>;
  };
}

function parseChartResponse(ticker: string, data: YahooChartResponse): StockQuote | null {
  const result = data.chart?.result?.[0];
  if (!result) return null;

  let price: number | undefined = result.meta?.regularMarketPrice;
  let currency = (result.meta?.currency ?? 'USD').toUpperCase();

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
