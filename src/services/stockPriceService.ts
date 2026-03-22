/**
 * Yahoo Finance API（非公式）で株価・チャート・検索を取得
 * React Native では User-Agent なしだと 403/空レスポンスになることが多い
 */

import type { StockQuote } from '../types/stock';
import { withTimeout } from '../utils/promiseTimeout';

/** ホームのミニチャート期間（スパークライン） */
export const SPARK_RANGE_OPTIONS: { label: string; range: string }[] = [
  { label: '1日', range: '1d' },
  { label: '1週間', range: '5d' },
  { label: '1か月', range: '1mo' },
  { label: '3か月', range: '3mo' },
  { label: '半年', range: '6mo' },
  { label: '年初来', range: 'ytd' },
  { label: '1年', range: '1y' },
  { label: '5年', range: '5y' },
];

export function getSparkIntervalForRange(range: string): string {
  const m: Record<string, string> = {
    '1d': '15m',
    '5d': '30m',
    '1mo': '1d',
    '3mo': '1d',
    '6mo': '1d',
    ytd: '1d',
    '1y': '1d',
    '5y': '1wk',
  };
  return m[range] ?? '1d';
}

const QUOTE_FETCH_MS = 12_000;
const SPARK_FETCH_MS = 18_000;
const FX_FETCH_MS = 8_000;

/** 開発時のみ詳細ログ（本番ビルドでは __DEV__ が false） */
function yahooLog(label: string, message: string, extra?: unknown): void {
  if (!__DEV__) return;
  if (extra !== undefined) {
    console.log(`[stockPriceService:${label}]`, message, extra);
  } else {
    console.log(`[stockPriceService:${label}]`, message);
  }
}

const YAHOO_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
};

async function yahooFetchJson<T = unknown>(url: string, label: string): Promise<T | null> {
  yahooLog(label, 'request', url);
  try {
    const res = await fetch(url, { headers: YAHOO_HEADERS });
    yahooLog(label, `response status ${res.status} ${res.statusText}`);
    const text = await res.text();
    if (!res.ok) {
      yahooLog(label, 'response body (error preview)', text.slice(0, 300));
      return null;
    }
    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      yahooLog(label, 'JSON parse failed, preview', text.slice(0, 200));
      return null;
    }
    if (__DEV__) {
      const preview = JSON.stringify(data).slice(0, 500);
      yahooLog(label, 'response body preview', `${preview}${preview.length >= 500 ? '…' : ''}`);
    }
    return data;
  } catch (e) {
    yahooLog(label, 'fetch error', String(e));
    return null;
  }
}

/** 複数銘柄用: カンマはエンコードしない（各シンボルのみ encode） */
function encodeSymbolsForSparkParam(symbols: string[]): string {
  return symbols.map((s) => encodeURIComponent(s.trim())).join(',');
}

function filterFiniteNumbers(values: (number | null | undefined)[] | undefined): number[] {
  if (!values?.length) return [];
  return values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
}

/** Yahoo の { raw } / { fmt } / 数値文字列 など幅広く数値化 */
function numFromYahooField(field: unknown): number | undefined {
  if (field == null) return undefined;
  if (typeof field === 'number' && Number.isFinite(field)) return field;
  if (typeof field === 'string') {
    const cleaned = field.replace(/,/g, '').trim();
    if (cleaned === '' || cleaned === '—') return undefined;
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
  }
  if (typeof field === 'object' && field !== null) {
    const o = field as Record<string, unknown>;
    if ('raw' in o) {
      const raw = o.raw;
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
      if (typeof raw === 'string') {
        const n = Number(raw.replace(/,/g, ''));
        if (Number.isFinite(n)) return n;
      }
    }
    if (typeof o.fmt === 'string') {
      const n = Number(o.fmt.replace(/,/g, ''));
      if (Number.isFinite(n)) return n;
    }
    if (typeof o.longFmt === 'string') {
      const n = Number(String(o.longFmt).replace(/[^\d.-]/g, ''));
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

/** 複数パスを順に試して最初の有効な数値を返す */
function firstNumeric(...fields: unknown[]): number | undefined {
  for (const f of fields) {
    const n = numFromYahooField(f);
    if (n != null) return n;
  }
  return undefined;
}

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
        marketState?: string;
        postMarketPrice?: number;
        postMarketChange?: number;
        postMarketChangePercent?: number;
        preMarketPrice?: number;
        preMarketChange?: number;
        preMarketChangePercent?: number;
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
    link?: string | { url?: string };
    clickThroughUrl?: { url?: string };
  }>;
}

/** Spark: レスポンス形がバージョンで微妙に異なるため広めに型付け */
interface YahooSparkResultEntry {
  symbol?: string;
  response?: Array<{
    meta?: { symbol?: string };
    indicators?: { quote?: Array<{ close?: (number | null | undefined)[] }> };
  }>;
  indicators?: { quote?: Array<{ close?: (number | null | undefined)[] }> };
}

interface YahooSparkResponse {
  spark?: {
    result?: YahooSparkResultEntry[];
  };
}

interface YahooQuoteSummaryResponse {
  quoteSummary?: {
    result?: Array<Record<string, unknown>>;
    error?: { description?: string };
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
  recommendationKey?: string;
  /** 次回決算予定日（Unix ms、Yahoo calendarEvents） */
  nextEarningsDateMs?: number;
}

export interface StockNewsItem {
  id: string;
  title: string;
  summary?: string;
  provider?: string;
  publishedAt?: number;
  url: string;
}

/** USD/JPY レートのキャッシュ（アプリ内で共有） */
let usdJpyCache: { rate: number; fetchedAt: number } | null = null;
const USDJPY_TTL_MS = 5 * 60 * 1000;

/**
 * Yahoo の USDJPY=X からドル円レートを取得（5分キャッシュ）
 */
export async function getUsdJpyRate(): Promise<number | null> {
  const now = Date.now();
  if (usdJpyCache && now - usdJpyCache.fetchedAt < USDJPY_TTL_MS) {
    return usdJpyCache.rate;
  }
  let q: StockQuote | null = null;
  try {
    q = await withTimeout(fetchQuote('USDJPY=X'), FX_FETCH_MS);
  } catch {
    return usdJpyCache?.rate ?? null;
  }
  const rate = q?.price;
  if (rate != null && rate > 50 && rate < 600) {
    usdJpyCache = { rate, fetchedAt: now };
    return rate;
  }
  return usdJpyCache?.rate ?? null;
}

/** 表示用: 米ドル価格を円換算の注記文字列に */
export function formatUsdAsJpyApprox(usdPrice: number, usdJpyRate: number): string {
  const jpy = Math.round(usdPrice * usdJpyRate);
  return `（約 ${new Intl.NumberFormat('ja-JP').format(jpy)}円）`;
}

function parseNextEarningsDateMs(result: Record<string, unknown>): number | undefined {
  const ce = result.calendarEvents as Record<string, unknown> | undefined;
  if (!ce) return undefined;
  const earnings = ce.earnings as Record<string, unknown> | undefined;
  if (!earnings) return undefined;
  const rawDates = earnings.earningsDate;
  if (!Array.isArray(rawDates) || rawDates.length === 0) return undefined;
  const candidates: number[] = [];
  for (const entry of rawDates) {
    if (entry && typeof entry === 'object') {
      const raw = (entry as { raw?: unknown }).raw;
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        const ms = raw > 1e12 ? raw : raw * 1000;
        candidates.push(ms);
      }
    }
  }
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => a - b);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const t0 = startOfToday.getTime();
  const next = candidates.find((t) => t >= t0 - 12 * 3600 * 1000) ?? candidates[candidates.length - 1];
  return next;
}

function extractClosesFromSparkEntry(entry: YahooSparkResultEntry | undefined): number[] {
  if (!entry) return [];
  const fromResponse = entry.response?.[0]?.indicators?.quote?.[0]?.close;
  const fromDirect = entry.indicators?.quote?.[0]?.close;
  const raw = fromResponse ?? fromDirect ?? [];
  return filterFiniteNumbers(raw);
}

function resolveNewsUrl(item: {
  clickThroughUrl?: { url?: string };
  link?: string | { url?: string };
}): string | undefined {
  const click = item.clickThroughUrl?.url;
  if (typeof click === 'string' && click.length > 0) return click;
  const link = item.link;
  if (typeof link === 'string' && link.length > 0) return link;
  if (link && typeof link === 'object' && typeof link.url === 'string') return link.url;
  return undefined;
}

/** v8 chart から close 列を取得（フォールバック用） */
async function fetchChartCloseSeries(
  symbol: string,
  range: string,
  interval: string,
  label: string
): Promise<number[]> {
  const enc = encodeURIComponent(symbol.trim());
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${enc}?range=${encodeURIComponent(
    range
  )}&interval=${encodeURIComponent(interval)}`;
  const data = await yahooFetchJson<YahooChartResponse>(url, `${label}:chart-fallback`);
  const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
  return filterFiniteNumbers(closes);
}

async function fetchSparkResponse(
  symbolsParam: string,
  range: string,
  interval: string,
  label: string
): Promise<YahooSparkResponse | null> {
  for (const host of ['query2', 'query1'] as const) {
    const url = `https://${host}.finance.yahoo.com/v8/finance/spark?symbols=${symbolsParam}&range=${encodeURIComponent(
      range
    )}&interval=${encodeURIComponent(interval)}`;
    const data = await yahooFetchJson<YahooSparkResponse>(url, `${label}:spark@${host}`);
    if (data?.spark?.result && data.spark.result.length > 0) {
      return data;
    }
  }
  return null;
}

async function fetchSparkResponseWithTimeout(
  symbolsParam: string,
  range: string,
  interval: string,
  label: string
): Promise<YahooSparkResponse | null> {
  try {
    return await withTimeout(fetchSparkResponse(symbolsParam, range, interval, label), SPARK_FETCH_MS);
  } catch {
    yahooLog('fetchSparkResponseWithTimeout', 'timeout', label);
    return null;
  }
}

function parseChartResponse(ticker: string, data: YahooChartResponse): StockQuote | null {
  const result = data.chart?.result?.[0];
  if (!result) return null;

  let price: number | undefined = result.meta?.regularMarketPrice;
  let currency = (result.meta?.currency ?? 'USD').toUpperCase();
  const previousClose = result.meta?.chartPreviousClose ?? result.meta?.previousClose;

  if (price == null && result.indicators?.quote?.[0]?.close?.length) {
    const closes = result.indicators.quote[0].close;
    const last = closes.filter((c): c is number => c != null && Number.isFinite(c)).pop();
    price = last;
  }

  if (price == null || price <= 0) return null;

  if (ticker.toUpperCase().endsWith('.T') || ticker.toUpperCase().endsWith('.TWO')) {
    currency = 'JPY';
  }

  const meta = result.meta;
  const marketState = typeof meta?.marketState === 'string' ? meta.marketState : undefined;

  return {
    ticker,
    price,
    currency: currency === 'JPY' ? 'JPY' : 'USD',
    changePercent:
      previousClose && previousClose > 0
        ? ((price - previousClose) / previousClose) * 100
        : undefined,
    marketState,
    postMarketPrice: numFromYahooField(meta?.postMarketPrice),
    postMarketChange: numFromYahooField(meta?.postMarketChange),
    postMarketChangePercent: numFromYahooField(meta?.postMarketChangePercent),
    preMarketPrice: numFromYahooField(meta?.preMarketPrice),
    preMarketChange: numFromYahooField(meta?.preMarketChange),
    preMarketChangePercent: numFromYahooField(meta?.preMarketChangePercent),
  };
}

export async function fetchQuote(ticker: string): Promise<StockQuote | null> {
  const encoded = encodeURIComponent(ticker);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1d`;
  const data = await yahooFetchJson<YahooChartResponse>(url, 'fetchQuote');
  if (!data) return null;
  return parseChartResponse(ticker, data);
}

export async function fetchQuotes(tickers: string[]): Promise<Record<string, StockQuote>> {
  const unique = [...new Set(tickers.filter(Boolean))];
  const results = await Promise.all(
    unique.map(async (t) => {
      try {
        return await withTimeout(fetchQuote(t), QUOTE_FETCH_MS);
      } catch {
        return null as StockQuote | null;
      }
    })
  );
  const out: Record<string, StockQuote> = {};
  unique.forEach((t, i) => {
    const q = results[i];
    if (q) out[t] = q;
  });
  return out;
}

const CJK_OR_KANA = /[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]/;

function parseSearchQuotes(data: YahooSearchResponse | null): StockSearchResult[] {
  if (!data) return [];
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
}

function mergeDedupeSearchResults(rows: StockSearchResult[]): StockSearchResult[] {
  const seen = new Set<string>();
  const out: StockSearchResult[] = [];
  for (const r of rows) {
    const k = r.symbol.toUpperCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function buildSearchUrl(queryStr: string, lang: string, region: string, quotesCount: number): string {
  return `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    queryStr
  )}&quotesCount=${quotesCount}&newsCount=0&lang=${lang}&region=${region}`;
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const queryVariants: string[] = [q.normalize('NFC')];
  if (/^\d{4}$/.test(q)) {
    queryVariants.push(`${q}.T`);
  }

  const paramSets: [string, string, number][] = [
    ['ja-JP', 'JP', 40],
    ['en-US', 'JP', 40],
    ['ja-JP', 'JP', 20],
    ['en-US', 'US', 40],
  ];

  let merged: StockSearchResult[] = [];

  for (const qq of queryVariants) {
    for (const [lang, region, n] of paramSets) {
      const data = await yahooFetchJson<YahooSearchResponse>(
        buildSearchUrl(qq, lang, region, n),
        `searchStocks:${lang}:${region}`
      );
      merged = mergeDedupeSearchResults([...merged, ...parseSearchQuotes(data)]);
      if (merged.length >= 18) {
        return merged.slice(0, 20);
      }
    }
  }

  if (merged.length === 0 && CJK_OR_KANA.test(q)) {
    yahooLog('searchStocks', 'CJK empty, last resort en-US US');
    const data = await yahooFetchJson<YahooSearchResponse>(
      buildSearchUrl(q, 'en-US', 'US', 40),
      'searchStocks:en-last'
    );
    merged = parseSearchQuotes(data);
  }

  return merged;
}

export async function fetchSparklines(symbols: string[], range?: string): Promise<Record<string, number[]>> {
  const unique = [...new Set(symbols.map((s) => s.trim()).filter(Boolean))];
  if (unique.length === 0) return {};

  const rangeKey = range ?? '1d';
  const interval = getSparkIntervalForRange(rangeKey);

  const symbolsParam = encodeSymbolsForSparkParam(unique);
  const data = await fetchSparkResponseWithTimeout(
    symbolsParam,
    rangeKey,
    interval,
    `fetchSparklines:${rangeKey}`
  );
  const out: Record<string, number[]> = {};

  if (data?.spark?.result) {
    for (const item of data.spark.result) {
      const closes = extractClosesFromSparkEntry(item);
      const sym =
        item.symbol?.toUpperCase() ??
        item.response?.[0]?.meta?.symbol?.toUpperCase() ??
        undefined;
      if (sym && closes.length > 0) {
        out[sym] = closes;
      }
    }
  }

  const missing = unique.filter((s) => !out[s.toUpperCase()]?.length);
  if (missing.length > 0) {
    yahooLog('fetchSparklines', `fallback chart for ${missing.length} symbols`);
    await Promise.all(
      missing.map(async (sym) => {
        try {
          const closes = await withTimeout(
            fetchChartCloseSeries(sym, rangeKey, interval, `fetchSparklines:${sym}`),
            SPARK_FETCH_MS
          );
          if (closes.length > 0) {
            out[sym.toUpperCase()] = closes;
          }
        } catch {
          /* timeout / 失敗はスキップ */
        }
      })
    );
  }

  return out;
}

function parseQuoteSummaryToDetail(
  result: Record<string, unknown> | undefined,
  symbol: string
): StockDetailData | null {
  if (!result) {
    yahooLog('fetchStockDetail', `no result for ${symbol}`);
    return null;
  }

  const price = (result.price ?? {}) as Record<string, unknown>;
  const summaryDetail = (result.summaryDetail ?? {}) as Record<string, unknown>;
  const defaultKeyStatistics = (result.defaultKeyStatistics ?? {}) as Record<string, unknown>;
  const financialData = (result.financialData ?? {}) as Record<string, unknown>;

  let recommendationKey: string | undefined;
  const rawRec = financialData.recommendationKey;
  if (typeof rawRec === 'string' && rawRec.length > 0) {
    recommendationKey = rawRec;
  } else if (rawRec && typeof rawRec === 'object' && rawRec !== null) {
    const o = rawRec as { fmt?: unknown; raw?: unknown };
    if (typeof o.fmt === 'string') recommendationKey = o.fmt;
    else if (typeof o.raw === 'string') recommendationKey = o.raw;
  }

  return {
    open: firstNumeric(
      price.regularMarketOpen,
      price.open,
      summaryDetail.open,
      summaryDetail.regularMarketOpen
    ),
    high: firstNumeric(
      price.regularMarketDayHigh,
      price.regularMarketHigh,
      price.dayHigh,
      summaryDetail.dayHigh,
      summaryDetail.regularMarketDayHigh,
      summaryDetail.regularMarketHigh
    ),
    low: firstNumeric(
      price.regularMarketDayLow,
      price.regularMarketLow,
      price.dayLow,
      summaryDetail.dayLow,
      summaryDetail.regularMarketDayLow,
      summaryDetail.regularMarketLow
    ),
    volume: firstNumeric(
      price.regularMarketVolume,
      summaryDetail.volume,
      summaryDetail.regularMarketVolume,
      defaultKeyStatistics.volume
    ),
    peRatio: firstNumeric(
      summaryDetail.trailingPE,
      defaultKeyStatistics.trailingPE,
      price.trailingPE,
      summaryDetail.forwardPE,
      price.forwardPE
    ),
    marketCap: firstNumeric(price.marketCap, summaryDetail.marketCap, defaultKeyStatistics.marketCap),
    week52High: firstNumeric(
      summaryDetail.fiftyTwoWeekHigh,
      defaultKeyStatistics.fiftyTwoWeekHigh,
      price.fiftyTwoWeekHigh
    ),
    week52Low: firstNumeric(
      summaryDetail.fiftyTwoWeekLow,
      defaultKeyStatistics.fiftyTwoWeekLow,
      price.fiftyTwoWeekLow
    ),
    avgVolume: firstNumeric(
      summaryDetail.averageVolume,
      summaryDetail.averageVolume10days,
      defaultKeyStatistics.averageVolume,
      defaultKeyStatistics.averageVolume10days
    ),
    currency: typeof price.currency === 'string' ? price.currency : undefined,
    recommendationKey,
    nextEarningsDateMs: parseNextEarningsDateMs(result),
  };
}

function isDetailDataEmpty(d: StockDetailData | null): boolean {
  if (!d) return true;
  if (d.recommendationKey) return false;
  if (d.nextEarningsDateMs != null) return false;
  return (
    d.open == null &&
    d.high == null &&
    d.low == null &&
    d.volume == null &&
    d.marketCap == null &&
    d.peRatio == null &&
    d.week52High == null &&
    d.week52Low == null &&
    d.avgVolume == null
  );
}

export async function fetchStockDetail(symbol: string): Promise<StockDetailData | null> {
  const s = symbol.trim().toUpperCase();
  if (!s) return null;

  const path = `/v10/finance/quoteSummary/${encodeURIComponent(
    s
  )}?modules=price,summaryDetail,defaultKeyStatistics,financialData,calendarEvents`;

  const tryHost = async (host: 'query2' | 'query1'): Promise<StockDetailData | null> => {
    const data = await yahooFetchJson<YahooQuoteSummaryResponse>(
      `https://${host}.finance.yahoo.com${path}`,
      `fetchStockDetail@${host}`
    );
    const err = data?.quoteSummary?.error;
    if (err) {
      yahooLog('fetchStockDetail', `${host} API error`, err.description ?? err);
    }
    const result = data?.quoteSummary?.result?.[0] as Record<string, unknown> | undefined;
    return parseQuoteSummaryToDetail(result, s);
  };

  let parsed = await tryHost('query2');
  if (isDetailDataEmpty(parsed)) {
    yahooLog('fetchStockDetail', 'retry quoteSummary on query1');
    parsed = await tryHost('query1');
  }

  return parsed;
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
    '5y': '1wk',
  };
  const interval = intervalMap[range] ?? '1d';

  const symbolsParam = encodeSymbolsForSparkParam([s]);
  const data = await fetchSparkResponse(symbolsParam, range, interval, 'fetchChartData');
  const entry = data?.spark?.result?.[0];
  let closes = extractClosesFromSparkEntry(entry);

  if (closes.length < 2) {
    yahooLog('fetchChartData', 'spark insufficient, using chart fallback');
    closes = await fetchChartCloseSeries(s, range, interval, 'fetchChartData');
  }

  return closes;
}

export async function fetchStockNews(symbol: string): Promise<StockNewsItem[]> {
  const s = symbol.trim().toUpperCase();
  if (!s) return [];

  const buildNewsUrl = (lang: string, region: string) =>
    `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      s
    )}&quotesCount=0&newsCount=10&lang=${lang}&region=${region}`;

  let data = await yahooFetchJson<YahooSearchResponse>(
    buildNewsUrl('ja-JP', 'JP'),
    'fetchStockNews:ja'
  );
  let news = Array.isArray(data?.news) ? data.news : [];

  if (news.length === 0) {
    yahooLog('fetchStockNews', 'no news ja-JP, retry en-US');
    data = await yahooFetchJson<YahooSearchResponse>(
      buildNewsUrl('en-US', 'US'),
      'fetchStockNews:en'
    );
    news = Array.isArray(data?.news) ? data.news : [];
  }

  return news
    .map((item, index) => {
      const resolvedUrl = resolveNewsUrl(item);
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
}

/** Yahoo スクリーナー（上昇・下落）1件 */
export interface DayMoverItem {
  symbol: string;
  shortName?: string;
  /** 当日の変動率（%） */
  changePercent: number;
  regularMarketPrice?: number;
}

function parseScreenerQuotes(data: unknown): DayMoverItem[] {
  const finance = (data as { finance?: { result?: Array<{ quotes?: unknown[] }> } })?.finance;
  const quotes = finance?.result?.[0]?.quotes;
  if (!Array.isArray(quotes)) return [];

  const out: DayMoverItem[] = [];
  for (const raw of quotes) {
    const q = raw as Record<string, unknown>;
    const symbol = typeof q.symbol === 'string' ? q.symbol.trim().toUpperCase() : '';
    if (!symbol) continue;
    const changePercent = firstNumeric(q.regularMarketChangePercent) ?? 0;
    const regularMarketPrice = firstNumeric(q.regularMarketPrice, q.regularMarketPreviousClose);
    let shortName: string | undefined;
    if (typeof q.shortName === 'string' && q.shortName.length > 0) shortName = q.shortName;
    else if (typeof q.longName === 'string' && q.longName.length > 0) shortName = q.longName;

    out.push({
      symbol,
      shortName,
      changePercent,
      regularMarketPrice,
    });
  }
  return out;
}

/**
 * 米国株の当日上昇・下落ランキング（Yahoo 定義済みスクリーナー）
 */
export async function fetchDayMovers(count = 25): Promise<{
  gainers: DayMoverItem[];
  losers: DayMoverItem[];
}> {
  const n = Math.min(50, Math.max(5, count));
  const base2 = 'https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved';
  const base1 = 'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved';

  const [gainersJson, losersJson] = await Promise.all([
    yahooFetchJson<unknown>(`${base2}?scrIds=day_gainers&count=${n}`, 'fetchDayMovers:gainers'),
    yahooFetchJson<unknown>(`${base2}?scrIds=day_losers&count=${n}`, 'fetchDayMovers:losers'),
  ]);

  let gainers = parseScreenerQuotes(gainersJson);
  let losers = parseScreenerQuotes(losersJson);

  if (gainers.length === 0 || losers.length === 0) {
    yahooLog('fetchDayMovers', 'retry screener on query1');
    const [g2, l2] = await Promise.all([
      yahooFetchJson<unknown>(`${base1}?scrIds=day_gainers&count=${n}`, 'fetchDayMovers:gainers:q1'),
      yahooFetchJson<unknown>(`${base1}?scrIds=day_losers&count=${n}`, 'fetchDayMovers:losers:q1'),
    ]);
    if (gainers.length === 0) gainers = parseScreenerQuotes(g2);
    if (losers.length === 0) losers = parseScreenerQuotes(l2);
  }

  return { gainers, losers };
}
