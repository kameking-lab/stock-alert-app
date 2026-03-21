import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StockItem } from '../types/stock';

const MY_STOCKS_KEY = '@stock_alert/my_stocks';
const LEGACY_STOCKS_KEY = '@stock_alert/stocks';

const DEFAULT_CREATED_AT = 1700000000000;

export const SP500_TOP20_STOCKS: StockItem[] = [
  { id: 'sp500-AAPL', ticker: 'AAPL', displayName: 'Apple', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 1 },
  { id: 'sp500-MSFT', ticker: 'MSFT', displayName: 'Microsoft', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 2 },
  { id: 'sp500-NVDA', ticker: 'NVDA', displayName: 'NVIDIA', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 3 },
  { id: 'sp500-GOOGL', ticker: 'GOOGL', displayName: 'Alphabet', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 4 },
  { id: 'sp500-AMZN', ticker: 'AMZN', displayName: 'Amazon', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 5 },
  { id: 'sp500-META', ticker: 'META', displayName: 'Meta Platforms', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 6 },
  { id: 'sp500-BRK-B', ticker: 'BRK-B', displayName: 'Berkshire Hathaway', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 7 },
  { id: 'sp500-LLY', ticker: 'LLY', displayName: 'Eli Lilly', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 8 },
  { id: 'sp500-AVGO', ticker: 'AVGO', displayName: 'Broadcom', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 9 },
  { id: 'sp500-JPM', ticker: 'JPM', displayName: 'JPMorgan Chase', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 10 },
  { id: 'sp500-TSLA', ticker: 'TSLA', displayName: 'Tesla', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 11 },
  { id: 'sp500-UNH', ticker: 'UNH', displayName: 'UnitedHealth', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 12 },
  { id: 'sp500-V', ticker: 'V', displayName: 'Visa', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 13 },
  { id: 'sp500-XOM', ticker: 'XOM', displayName: 'Exxon Mobil', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 14 },
  { id: 'sp500-MA', ticker: 'MA', displayName: 'Mastercard', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 15 },
  { id: 'sp500-JNJ', ticker: 'JNJ', displayName: 'Johnson & Johnson', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 16 },
  { id: 'sp500-PG', ticker: 'PG', displayName: 'Procter & Gamble', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 17 },
  { id: 'sp500-HD', ticker: 'HD', displayName: 'Home Depot', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 18 },
  { id: 'sp500-COST', ticker: 'COST', displayName: 'Costco', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 19 },
  { id: 'sp500-MRK', ticker: 'MRK', displayName: 'Merck', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 20 },
];

async function migrateLegacyStocksIfNeeded(): Promise<void> {
  try {
    const current = await AsyncStorage.getItem(MY_STOCKS_KEY);
    if (current != null) return;
    const legacyRaw = await AsyncStorage.getItem(LEGACY_STOCKS_KEY);
    if (!legacyRaw) return;
    const parsed = JSON.parse(legacyRaw) as unknown;
    if (!Array.isArray(parsed)) return;
    const filtered = (parsed as StockItem[]).filter((s) => !String(s.id).endsWith('-default'));
    await AsyncStorage.setItem(MY_STOCKS_KEY, JSON.stringify(filtered));
  } catch {
    /* ignore */
  }
}

export async function loadMyStocks(): Promise<StockItem[]> {
  await migrateLegacyStocksIfNeeded();
  try {
    const raw = await AsyncStorage.getItem(MY_STOCKS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as StockItem[];
  } catch {
    return [];
  }
}

export async function saveMyStocks(items: StockItem[]): Promise<void> {
  await AsyncStorage.setItem(MY_STOCKS_KEY, JSON.stringify(items));
}

export async function addStock(item: StockItem): Promise<void> {
  const items = await loadMyStocks();
  items.push(item);
  await saveMyStocks(items);
}

export async function removeStock(id: string): Promise<void> {
  const items = await loadMyStocks();
  const next = items.filter((s) => s.id !== id);
  await saveMyStocks(next);
}
