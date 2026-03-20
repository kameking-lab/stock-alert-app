/**
 * 監視対象銘柄（ローカル保存用）
 */
export interface StockItem {
  id: string;
  ticker: string;
  upperLimit: number;
  lowerLimit: number;
  displayName?: string;
  createdAt: number;
}

/**
 * API から取得した1銘柄の現在価格
 */
export interface StockQuote {
  ticker: string;
  price: number;
  currency: 'USD' | 'JPY';
  changePercent?: number;
}

/**
 * 一覧行表示用（銘柄 + 取得済み価格）
 */
export interface StockRowItem extends StockItem {
  quote?: StockQuote;
}

export function createStockItem(
  ticker: string,
  upperLimit: number,
  lowerLimit: number,
  displayName?: string
): StockItem {
  const t = ticker.trim().toUpperCase();
  return {
    id: `${t}-${Date.now()}`,
    ticker: t,
    upperLimit,
    lowerLimit,
    displayName: displayName?.trim() || undefined,
    createdAt: Date.now(),
  };
}

export function getDisplayName(item: StockItem): string {
  return item.displayName || item.ticker;
}

export function isAboveUpper(item: StockRowItem): boolean {
  const p = item.quote?.price;
  return p != null && p >= item.upperLimit;
}

export function isBelowLower(item: StockRowItem): boolean {
  const p = item.quote?.price;
  return p != null && p <= item.lowerLimit;
}
