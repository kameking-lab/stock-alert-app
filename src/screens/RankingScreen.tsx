/**
 * 当日の上昇・下落ランキング（Yahoo Finance スクリーナー）
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchDayMovers, type DayMoverItem } from '../services/stockPriceService';
import type { MainTabParamList, RootStackParamList } from '../../App';

type RankingNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Ranking'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function MoverRow({
  item,
  positive,
  onPress,
}: {
  item: DayMoverItem;
  positive: boolean;
  onPress: () => void;
}) {
  const color = positive ? '#34C759' : '#FF3B30';
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <Text style={styles.symbol}>{item.symbol}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {item.shortName ?? '—'}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.pct, { color }]}>
          {item.changePercent >= 0 ? '+' : ''}
          {item.changePercent.toFixed(2)}%
        </Text>
        {item.regularMarketPrice != null ? (
          <Text style={styles.price}>${item.regularMarketPrice.toFixed(2)}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function RankingScreen() {
  const navigation = useNavigation<RankingNav>();
  const [gainers, setGainers] = useState<DayMoverItem[]>([]);
  const [losers, setLosers] = useState<DayMoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { gainers: g, losers: l } = await fetchDayMovers(25);
    setGainers(g);
    setLosers(l);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      await load();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const goDetail = (ticker: string) => {
    navigation.navigate('StockDetail', { ticker });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ランキング</Text>
      <Text style={styles.sub}>米国市場の当日変動率（Yahoo Finance）</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0A84FF" />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>買い時候補（上昇率上位）</Text>
            {gainers.length === 0 ? (
              <Text style={styles.empty}>データを取得できませんでした</Text>
            ) : (
              gainers.map((item) => (
                <MoverRow
                  key={item.symbol}
                  item={item}
                  positive
                  onPress={() => goDetail(item.symbol)}
                />
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>売り時候補（下落率上位）</Text>
            {losers.length === 0 ? (
              <Text style={styles.empty}>データを取得できませんでした</Text>
            ) : (
              losers.map((item) => (
                <MoverRow
                  key={item.symbol}
                  item={item}
                  positive={false}
                  onPress={() => goDetail(item.symbol)}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  sub: {
    marginTop: 6,
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  empty: {
    color: '#8E8E93',
    fontSize: 14,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  rowLeft: {
    flex: 1,
    marginRight: 12,
  },
  symbol: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  name: {
    marginTop: 4,
    color: '#8E8E93',
    fontSize: 13,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  pct: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  price: {
    marginTop: 4,
    color: '#AEAEB2',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
});
