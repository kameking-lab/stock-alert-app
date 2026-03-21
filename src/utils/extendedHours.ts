import type { StockQuote } from '../types/stock';

export interface ExtendedHoursDisplay {
  label: string;
  price: number;
  changePercent: number;
}

function num(v: number | undefined): number | undefined {
  return v != null && Number.isFinite(v) ? v : undefined;
}

export function getExtendedHoursDisplay(quote: StockQuote | undefined): ExtendedHoursDisplay | null {
  if (!quote) return null;

  const ms = quote.marketState?.toUpperCase() ?? '';

  if (ms === 'REGULAR') {
    return null;
  }

  const postP = num(quote.postMarketPrice);
  const postPct = num(quote.postMarketChangePercent);
  const preP = num(quote.preMarketPrice);
  const prePct = num(quote.preMarketChangePercent);

  if (ms === 'POST' || ms === 'POSTPOST') {
    if (postP != null && postPct != null) {
      return { label: 'アフター', price: postP, changePercent: postPct };
    }
  }
  if (ms === 'PRE' || ms === 'PREPRE' || ms === 'PREPOST') {
    if (preP != null && prePct != null) {
      return { label: 'プレ', price: preP, changePercent: prePct };
    }
  }

  if (postP != null && postPct != null) {
    return { label: '時間外', price: postP, changePercent: postPct };
  }
  if (preP != null && prePct != null) {
    return { label: '時間外', price: preP, changePercent: prePct };
  }

  return null;
}
