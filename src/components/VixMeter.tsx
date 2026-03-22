/**
 * VIX（恐怖指数）の簡易表示 — ホーム用
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useStockQuote, type StockQueryPollOptions } from '../hooks/useStocks';

type Props = {
  poll?: StockQueryPollOptions;
};

function VixMeterInner({ poll }: Props) {
  const { data, isPending } = useStockQuote('^VIX', poll);
  const price = data?.price;
  const changePercent = data?.changePercent ?? 0;
  const positive = changePercent >= 0;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>VIX（参考）</Text>
      {isPending && price == null ? (
        <ActivityIndicator size="small" color="#8E8E93" style={styles.loader} />
      ) : (
        <View style={styles.row}>
          <Text style={styles.value}>{price != null ? price.toFixed(2) : '—'}</Text>
          {price != null ? (
            <Text style={[styles.change, { color: positive ? '#34C759' : '#FF3B30' }]}>
              {positive ? '+' : ''}
              {changePercent.toFixed(2)}%
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

export default React.memo(VixMeterInner);

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  label: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  change: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  loader: {
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
});
