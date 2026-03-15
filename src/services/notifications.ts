/**
 * expo-notifications によるローカル通知（株価アラート）
 */

import * as Notifications from 'expo-notifications';
import type { StockItem, StockQuote } from '../types/stock';
import { getDisplayName } from '../types/stock';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function formatPrice(value: number, currency: string): string {
  return currency === 'JPY' ? `¥${Math.round(value)}` : `$${value.toFixed(2)}`;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export function sendStockAlert(
  item: StockItem,
  quote: StockQuote,
  kind: 'upper' | 'lower'
): void {
  const name = getDisplayName(item);
  const limit = kind === 'upper' ? item.upperLimit : item.lowerLimit;
  const limitStr = formatPrice(limit, quote.currency);
  const currentStr = formatPrice(quote.price, quote.currency);
  const kindLabel = kind === 'upper' ? '上限' : '下限';

  Notifications.scheduleNotificationAsync({
    content: {
      title: `株価アラート: ${name}`,
      body: `設定値(${kindLabel})に達しました。現在値: ${currentStr}`,
      data: { ticker: item.ticker },
    },
    trigger: { seconds: 1 },
  });
}
