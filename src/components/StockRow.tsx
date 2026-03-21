/**
 * 一覧の1行: ティッカー・現在価格・上下限・突破時ハイライト
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline } from 'react-native-svg';
import type { StockRowItem } from '../types/stock';
import { isAboveUpper, isBelowLower } from '../types/stock';

function formatPrice(value: number, currency: string): string {
  return currency === 'JPY' ? `¥${Math.round(value)}` : `$${value.toFixed(2)}`;
}

interface Props {
  item: StockRowItem;
  onDelete: () => void;
  onPress: () => void;
  drag: () => void;
  isActive: boolean;
  prices?: number[];
}

export default function StockRow({ item, onDelete, onPress, drag, isActive, prices }: Props) {
  const above = isAboveUpper(item);
  const below = isBelowLower(item);
  const currency = item.quote?.currency ?? 'USD';
  const price = item.quote?.price;
  const changePercent = item.quote?.changePercent ?? 0;
  const positive = changePercent >= 0;
  const badgeColor = positive ? '#34C759' : '#FF3B30';
  const lineColor = positive ? '#34C759' : '#FF3B30';

  const chartWidth = 90;
  const chartHeight = 40;
  const validPrices =
    prices?.filter((v) => typeof v === 'number' && Number.isFinite(v)) ?? [];
  let points = '';
  if (validPrices.length >= 2) {
    const min = Math.min(...validPrices);
    const max = Math.max(...validPrices);
    const range = max - min || 1;
    points = validPrices
      .map((value, index) => {
        const x = (index / (validPrices.length - 1)) * chartWidth;
        const y = chartHeight - ((value - min) / range) * chartHeight;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .filter((p): p is string => p != null)
      .join(' ');
  }

  return (
    <View
      style={[
        styles.wrapper,
        isActive && styles.activeWrapper,
        above && styles.aboveBorder,
        below && styles.belowBorder,
      ]}
    >
      <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={onPress}>
        <View style={styles.left}>
          <Text style={styles.ticker}>{item.ticker}</Text>
          <Text style={styles.company}>{item.displayName || item.ticker}</Text>
        </View>

        <View style={styles.chartPlaceholder}>
          {points ? (
            <Svg width={chartWidth} height={chartHeight}>
              <Polyline
                points={points}
                fill="none"
                stroke={lineColor}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </Svg>
          ) : null}
        </View>

        <View style={styles.right}>
          <Text style={styles.price}>{price != null ? formatPrice(price, currency) : '—'}</Text>
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>
              {positive ? '+' : ''}
              {changePercent.toFixed(2)}%
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.dragHandle} onLongPress={drag}>
          <Ionicons name="menu" size={18} color="#8E8E93" />
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Text style={styles.deleteBtnText}>削除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    backgroundColor: '#000000',
  },
  activeWrapper: {
    backgroundColor: '#2C2C2E',
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  left: {
    flex: 1.1,
    paddingRight: 10,
  },
  chartPlaceholder: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#1C1C1E',
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  right: {
    flex: 0.9,
    alignItems: 'flex-end',
    marginRight: 8,
  },
  dragHandle: {
    height: 42,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  ticker: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  company: {
    marginTop: 4,
    fontSize: 12,
    color: '#8E8E93',
  },
  price: {
    fontSize: 19,
    color: '#FFFFFF',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  badge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  actions: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteBtnText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  aboveBorder: {
    borderLeftWidth: 2,
    borderLeftColor: '#34C759',
    paddingLeft: 10,
  },
  belowBorder: {
    borderLeftWidth: 2,
    borderLeftColor: '#FF3B30',
    paddingLeft: 10,
  },
});
