/**
 * 一覧の1行: ティッカー・現在価格・上下限・突破時ハイライト
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Swipeable, TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Polyline, Line } from 'react-native-svg';
import type { StockRowItem } from '../types/stock';
import { isAboveUpper, isBelowLower } from '../types/stock';
import { getExtendedHoursDisplay } from '../utils/extendedHours';
import { formatUsdAsJpyApprox } from '../services/stockPriceService';

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
  variant?: 'watchlist' | 'sp500';
  /** USD 銘柄のときの円換算（参考） */
  usdJpyRate?: number | null;
}

function StockRowInner({
  item,
  onDelete,
  onPress,
  drag,
  isActive,
  prices,
  variant = 'watchlist',
  usdJpyRate,
}: Props) {
  const isSp500 = variant === 'sp500';
  const above = isAboveUpper(item);
  const below = isBelowLower(item);
  const currency = item.quote?.currency ?? 'USD';
  const price = item.quote?.price;
  const changePercent = item.quote?.changePercent ?? 0;
  const positive = changePercent >= 0;
  const badgeColor = positive ? '#34C759' : '#FF3B30';
  const lineColor = positive ? '#34C759' : '#FF3B30';

  const ext = getExtendedHoursDisplay(item.quote);
  const showExt = ext != null;

  const showJpy =
    currency === 'USD' && price != null && usdJpyRate != null && usdJpyRate > 0;

  const chartWidth = 90;
  const chartHeight = 40;
  const validPrices =
    prices?.filter((v) => typeof v === 'number' && Number.isFinite(v)) ?? [];

  const ul = item.upperLimit;
  const ll = item.lowerLimit;
  const showAlertLines =
    !isSp500 && validPrices.length >= 2 && price != null && ul < 1e12 && ll >= 0 && ul > ll;

  let chartMin = validPrices.length ? Math.min(...validPrices) : 0;
  let chartMax = validPrices.length ? Math.max(...validPrices) : 1;
  if (showAlertLines) {
    chartMin = Math.min(chartMin, ul, ll);
    chartMax = Math.max(chartMax, ul, ll);
  }
  const range = chartMax - chartMin || 1;

  let points = '';
  if (validPrices.length >= 2) {
    points = validPrices
      .map((value, index) => {
        const x = (index / (validPrices.length - 1)) * chartWidth;
        const y = chartHeight - ((value - chartMin) / range) * chartHeight;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .filter((p): p is string => p != null)
      .join(' ');
  }

  const yUpper =
    showAlertLines && Number.isFinite(ul)
      ? chartHeight - ((ul - chartMin) / range) * chartHeight
      : null;
  const yLower =
    showAlertLines && Number.isFinite(ll)
      ? chartHeight - ((ll - chartMin) / range) * chartHeight
      : null;

  const rowInner = (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.55}
      onPress={onPress}
      delayPressIn={0}
    >
      <View style={styles.left}>
        <Text style={styles.ticker}>{item.ticker}</Text>
        <Text style={styles.company}>{item.displayName || item.ticker}</Text>
      </View>

      <View style={styles.chartPlaceholder}>
        {points ? (
          <Svg width={chartWidth} height={chartHeight}>
            {yUpper != null && yUpper >= 0 && yUpper <= chartHeight ? (
              <Line
                x1={0}
                y1={yUpper}
                x2={chartWidth}
                y2={yUpper}
                stroke="#34C759"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.5}
              />
            ) : null}
            {yLower != null && yLower >= 0 && yLower <= chartHeight ? (
              <Line
                x1={0}
                y1={yLower}
                x2={chartWidth}
                y2={yLower}
                stroke="#FF3B30"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.5}
              />
            ) : null}
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
        {showJpy ? (
          <Text style={styles.jpyHint}>{formatUsdAsJpyApprox(price, usdJpyRate)}</Text>
        ) : null}
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>
            {positive ? '+' : ''}
            {changePercent.toFixed(2)}%
          </Text>
        </View>
        {showAlertLines && price != null ? (
          <View style={styles.alertDistCol}>
            {price < ul ? (
              <Text style={styles.alertDistText} numberOfLines={1}>
                上限まであと {formatPrice(ul - price, currency)}
              </Text>
            ) : null}
            {price > ll ? (
              <Text style={styles.alertDistText} numberOfLines={1}>
                下限まであと {formatPrice(price - ll, currency)}
              </Text>
            ) : null}
          </View>
        ) : null}
        {showExt ? (
          <View style={styles.extRow}>
            <Text style={styles.moon}>🌙</Text>
            <Text style={styles.extText} numberOfLines={1}>
              {ext.label}: {formatPrice(ext.price, currency)} ({ext.changePercent >= 0 ? '+' : ''}
              {ext.changePercent.toFixed(2)}%)
            </Text>
          </View>
        ) : null}
      </View>

      {!isSp500 ? (
        <TouchableOpacity
          style={styles.dragHandle}
          onLongPress={drag}
          delayLongPress={180}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        >
          <Ionicons name="menu" size={18} color="#8E8E93" />
        </TouchableOpacity>
      ) : (
        <View style={styles.dragHandleSpacer} />
      )}
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.wrapper,
        isActive && styles.activeWrapper,
        above && styles.aboveBorder,
        below && styles.belowBorder,
      ]}
    >
      {!isSp500 ? (
        <Swipeable
          overshootRight={false}
          friction={2}
          activeOffsetX={[-30, 30]}
          renderRightActions={() => (
            <TouchableOpacity
              style={styles.swipeDeleteBtn}
              activeOpacity={0.85}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onDelete();
              }}
              accessibilityRole="button"
              accessibilityLabel="削除"
            >
              <Ionicons name="trash" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        >
          {rowInner}
        </Swipeable>
      ) : (
        rowInner
      )}
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
  swipeDeleteBtn: {
    width: 80,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 0,
    alignSelf: 'stretch',
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
  dragHandleSpacer: {
    width: 22,
    height: 42,
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
  jpyHint: {
    marginTop: 2,
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
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
  alertDistCol: {
    marginTop: 6,
    alignItems: 'flex-end',
    maxWidth: 170,
  },
  alertDistText: {
    fontSize: 10,
    color: '#AEAEB2',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  extRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 160,
    gap: 4,
  },
  moon: {
    fontSize: 11,
  },
  extText: {
    flex: 1,
    color: '#AEAEB2',
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
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

export default React.memo(StockRowInner);
