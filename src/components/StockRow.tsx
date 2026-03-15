/**
 * 一覧の1行: ティッカー・現在価格・上下限・突破時ハイライト
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { StockRowItem } from '../types/stock';
import { getDisplayName, isAboveUpper, isBelowLower } from '../types/stock';

function formatPrice(value: number, currency: string): string {
  return currency === 'JPY' ? `¥${Math.round(value)}` : `$${value.toFixed(2)}`;
}

interface Props {
  item: StockRowItem;
  onDelete: () => void;
}

export default function StockRow({ item, onDelete }: Props) {
  const above = isAboveUpper(item);
  const below = isBelowLower(item);
  const currency = item.quote?.currency ?? 'USD';
  const price = item.quote?.price;

  const bg = above ? '#e8f5e9' : below ? '#ffebee' : '#fff';
  const priceColor = above ? '#2e7d32' : below ? '#c62828' : '#000';

  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>
      <View style={styles.row}>
        <View style={styles.main}>
          <Text style={styles.ticker}>{getDisplayName(item)}</Text>
          <Text style={[styles.price, { color: priceColor }]}>
            {price != null ? formatPrice(price, currency) : '—'}
          </Text>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Text style={styles.deleteBtnText}>削除</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.limits}>
        <Text style={styles.limitText}>
          上限: {formatPrice(item.upperLimit, currency)}
        </Text>
        <Text style={styles.limitText}>
          下限: {formatPrice(item.lowerLimit, currency)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  main: {
    flex: 1,
  },
  ticker: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteBtnText: {
    color: '#c62828',
    fontSize: 14,
  },
  limits: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  limitText: {
    fontSize: 12,
    color: '#666',
  },
});
