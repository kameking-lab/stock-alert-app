import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StockItem } from '../types/stock';

const STOCKS_KEY = '@stock_alert/stocks';

export async function loadStocks(): Promise<StockItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STOCKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StockItem[]) : [];
  } catch {
    return [];
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
