/**
 * Yahoo 株価 API を React Query でラップ（staleTime により無駄な再取得を抑制）
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchChartData,
  fetchQuote,
  fetchQuotes,
  fetchSparklines,
  fetchStockDetail,
  fetchStockNews,
  getUsdJpyRate,
  searchStocks,
} from '../services/stockPriceService';

const STALE_USD_JPY_MS = 5 * 60 * 1000;
const STALE_QUOTES_MS = 60 * 1000;
const STALE_SPARKLINES_MS = 2 * 60 * 1000;
const STALE_SEARCH_MS = 10 * 60 * 1000;
const STALE_DETAIL_MS = 2 * 60 * 1000;
const STALE_NEWS_MS = 3 * 60 * 1000;
const STALE_CHART_MS = 2 * 60 * 1000;

/** ホームの自動更新など、画面フォーカス時に refetchInterval と併用 */
export type StockQueryPollOptions = {
  refetchInterval?: number | false;
};

function sortedTickerKey(tickers: string[]): string {
  return [...new Set(tickers.filter(Boolean).map((s) => s.trim()))].sort().join(',');
}

export function useUsdJpyRate(poll?: StockQueryPollOptions) {
  return useQuery({
    queryKey: ['usdJpy'] as const,
    queryFn: getUsdJpyRate,
    staleTime: STALE_USD_JPY_MS,
    refetchInterval: poll?.refetchInterval ?? false,
    refetchIntervalInBackground: false,
  });
}

export function useStockQuotes(tickers: string[], poll?: StockQueryPollOptions) {
  const key = sortedTickerKey(tickers);
  return useQuery({
    queryKey: ['quotes', key] as const,
    queryFn: () => fetchQuotes(tickers),
    enabled: tickers.length > 0,
    staleTime: STALE_QUOTES_MS,
    refetchInterval: poll?.refetchInterval ?? false,
    refetchIntervalInBackground: false,
  });
}

export function useSparklines(symbols: string[], range: string, poll?: StockQueryPollOptions) {
  const key = sortedTickerKey(symbols);
  return useQuery({
    queryKey: ['sparklines', key, range] as const,
    queryFn: () => fetchSparklines(symbols, range),
    enabled: symbols.length > 0,
    staleTime: STALE_SPARKLINES_MS,
    refetchInterval: poll?.refetchInterval ?? false,
    refetchIntervalInBackground: false,
  });
}

export function useStockQuote(ticker: string, poll?: StockQueryPollOptions) {
  const t = ticker.trim();
  return useQuery({
    queryKey: ['quote', t.toUpperCase()] as const,
    queryFn: () => fetchQuote(t),
    enabled: t.length > 0,
    staleTime: STALE_QUOTES_MS,
    refetchInterval: poll?.refetchInterval ?? false,
    refetchIntervalInBackground: false,
  });
}

/** 銘柄コードで検索し、会社名・市場などのメタ取得に利用 */
export function useStockSearchForTicker(ticker: string) {
  const t = ticker.trim();
  return useQuery({
    queryKey: ['stockSearch', t.toUpperCase()] as const,
    queryFn: () => searchStocks(t),
    enabled: t.length > 0,
    staleTime: STALE_SEARCH_MS,
  });
}

export function useStockDetail(symbol: string) {
  const s = symbol.trim().toUpperCase();
  return useQuery({
    queryKey: ['stockDetail', s] as const,
    queryFn: () => fetchStockDetail(s),
    enabled: s.length > 0,
    staleTime: STALE_DETAIL_MS,
  });
}

export function useStockNews(symbol: string) {
  const s = symbol.trim().toUpperCase();
  return useQuery({
    queryKey: ['stockNews', s] as const,
    queryFn: () => fetchStockNews(s),
    enabled: s.length > 0,
    staleTime: STALE_NEWS_MS,
  });
}

export function useStockChart(symbol: string, range: string) {
  const s = symbol.trim().toUpperCase();
  return useQuery({
    queryKey: ['stockChart', s, range] as const,
    queryFn: () => fetchChartData(s, range),
    enabled: s.length > 0,
    staleTime: STALE_CHART_MS,
  });
}
