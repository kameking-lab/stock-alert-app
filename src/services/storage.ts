import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StockItem } from '../types/stock';

const STOCKS_KEY = '@stock_alert/stocks';
const DEFAULT_CREATED_AT = 1700000000000;

const DEFAULT_STOCKS: StockItem[] = [
  { id: 'AAPL-default', ticker: 'AAPL', displayName: 'Apple', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 1 },
  { id: 'MSFT-default', ticker: 'MSFT', displayName: 'Microsoft', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 2 },
  { id: 'NVDA-default', ticker: 'NVDA', displayName: 'NVIDIA', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 3 },
  { id: 'GOOGL-default', ticker: 'GOOGL', displayName: 'Alphabet', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 4 },
  { id: 'AMZN-default', ticker: 'AMZN', displayName: 'Amazon', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 5 },
  { id: 'META-default', ticker: 'META', displayName: 'Meta Platforms', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 6 },
  { id: 'BRK-B-default', ticker: 'BRK-B', displayName: 'Berkshire Hathaway', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 7 },
  { id: 'LLY-default', ticker: 'LLY', displayName: 'Eli Lilly', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 8 },
  { id: 'AVGO-default', ticker: 'AVGO', displayName: 'Broadcom', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 9 },
  { id: 'JPM-default', ticker: 'JPM', displayName: 'JPMorgan Chase', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 10 },
  { id: 'TSLA-default', ticker: 'TSLA', displayName: 'Tesla', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 11 },
  { id: 'UNH-default', ticker: 'UNH', displayName: 'UnitedHealth', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 12 },
  { id: 'V-default', ticker: 'V', displayName: 'Visa', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 13 },
  { id: 'XOM-default', ticker: 'XOM', displayName: 'Exxon Mobil', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 14 },
  { id: 'MA-default', ticker: 'MA', displayName: 'Mastercard', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 15 },
  { id: 'JNJ-default', ticker: 'JNJ', displayName: 'Johnson & Johnson', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 16 },
  { id: 'PG-default', ticker: 'PG', displayName: 'Procter & Gamble', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 17 },
  { id: 'HD-default', ticker: 'HD', displayName: 'Home Depot', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 18 },
  { id: 'COST-default', ticker: 'COST', displayName: 'Costco', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 19 },
  { id: 'MRK-default', ticker: 'MRK', displayName: 'Merck', upperLimit: 999999, lowerLimit: 0, createdAt: DEFAULT_CREATED_AT + 20 },
];

export async function loadStocks(): Promise<StockItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STOCKS_KEY);
    if (!raw) {
      await saveStocks(DEFAULT_STOCKS);
      return DEFAULT_STOCKS;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      await saveStocks(DEFAULT_STOCKS);
      return DEFAULT_STOCKS;
    }
    return parsed as StockItem[];
  } catch {
    return DEFAULT_STOCKS;
  }
}

export async function saveStocks(items: StockItem[]): Promise<void> {
  await AsyncStorage.setItem(STOCKS_KEY, JSON.stringify(items));
}

export async function addStock(item: StockItem): Promise<void> {
  const items = await loadStocks();
  items.push(item);
  await saveStocks(items);
}

export async function removeStock(id: string): Promise<void> {
  const items = await loadStocks();
  const next = items.filter((s) => s.id !== id);
  await saveStocks(next);
}
