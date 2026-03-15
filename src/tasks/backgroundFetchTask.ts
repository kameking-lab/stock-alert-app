/**
 * バックグラウンドで株価取得・アラート判定・通知送信
 * expo-task-manager + expo-background-fetch
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { loadStocks } from '../services/storage';
import { fetchQuotes } from '../services/stockPriceService';
import { sendStockAlert, requestNotificationPermissions } from '../services/notifications';
import type { StockItem, StockQuote } from '../types/stock';

export const BACKGROUND_FETCH_TASK = 'BACKGROUND_FETCH_STOCK_PRICES';

async function runBackgroundFetch(): Promise<void> {
  const items = await loadStocks();
  if (items.length === 0) return;

  const tickers = items.map((s) => s.ticker);
  const quotes = await fetchQuotes(tickers);

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  for (const item of items) {
    const quote = quotes[item.ticker] as StockQuote | undefined;
    if (!quote) continue;

    if (quote.price >= item.upperLimit) {
      sendStockAlert(item, quote, 'upper');
    }
    if (quote.price <= item.lowerLimit) {
      sendStockAlert(item, quote, 'lower');
    }
  }
}

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    await runBackgroundFetch();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

const MINIMUM_INTERVAL_SECONDS = 15 * 60; // 15分

export async function registerBackgroundFetchAsync(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();
  if (status !== BackgroundFetch.BackgroundFetchStatus.Available) {
    return;
  }
  await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: MINIMUM_INTERVAL_SECONDS,
    stopOnTerminate: false,
    startOnBoot: false,
  });
}
