/**
 * メイン画面: マイウォッチリスト + 固定 S&P500 セクション
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DraggableFlatList from 'react-native-draggable-flatlist';
import type { StockItem, StockRowItem } from '../types/stock';
import { loadMyStocks, removeStock, saveMyStocks, SP500_TOP20_STOCKS } from '../services/storage';
import { fetchQuotes, fetchSparklines, getUsdJpyRate } from '../services/stockPriceService';
import * as Haptics from 'expo-haptics';
import { getDisplayName } from '../types/stock';
import StockRow from '../components/StockRow';
import AddStockModal from '../components/AddStockModal';
import MarketStatusBanner from '../components/MarketStatusBanner';
import type { RootStackParamList } from '../../App';

type HomeScreenNavigation = NativeStackNavigationProp<RootStackParamList, 'Home'>;

function todayLabelJst(): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date());
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigation>();
  const [rows, setRows] = useState<StockRowItem[]>([]);
  const [sp500Rows, setSp500Rows] = useState<StockRowItem[]>([]);
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [usdJpyRate, setUsdJpyRate] = useState<number | null>(null);

  const dateStr = useMemo(() => todayLabelJst(), []);

  const load = useCallback(async () => {
    const list = await loadMyStocks();
    const sp500 = SP500_TOP20_STOCKS;
    const allTickers = [...new Set([...list.map((s) => s.ticker), ...sp500.map((s) => s.ticker)])];

    if (allTickers.length === 0) {
      setRows([]);
      setSp500Rows([]);
      setSparklines({});
      setUsdJpyRate(null);
      return;
    }

    const [usdJpy, quotes, nextSparklines] = await Promise.all([
      getUsdJpyRate(),
      fetchQuotes(allTickers),
      fetchSparklines(allTickers),
    ]);
    setUsdJpyRate(usdJpy);
    setSparklines(nextSparklines);

    setRows(
      list.map((item) => ({
        ...item,
        quote: quotes[item.ticker],
      }))
    );
    setSp500Rows(
      sp500.map((item) => ({
        ...item,
        quote: quotes[item.ticker],
      }))
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setLoading(true);
    await load();
    setLoading(false);
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [load]);

  const onAdd = useCallback(() => {
    setModalVisible(true);
  }, []);

  const onModalClose = useCallback(() => {
    setModalVisible(false);
    load();
  }, [load]);

  const onDelete = useCallback(
    (item: StockItem) => {
      Alert.alert(
        '銘柄を削除',
        `${getDisplayName(item)} を削除しますか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除',
            style: 'destructive',
            onPress: async () => {
              await removeStock(item.id);
              await load();
            },
          },
        ]
      );
    },
    [load]
  );

  const onDragEnd = useCallback(
    async ({ data }: { data: StockRowItem[] }) => {
      setRows(data);
      const nextItems: StockItem[] = data.map((row) => ({
        id: row.id,
        ticker: row.ticker,
        upperLimit: row.upperLimit,
        lowerLimit: row.lowerLimit,
        displayName: row.displayName,
        createdAt: row.createdAt,
      }));
      await saveMyStocks(nextItems);
    },
    []
  );

  const listHeader = (
    <View>
      <Text style={styles.dateLine}>{dateStr}</Text>
      <MarketStatusBanner />
      <Text style={styles.sectionHeading}>マイウォッチリスト</Text>
    </View>
  );

  const listFooter = (
    <View style={styles.footerBlock}>
      <Text style={[styles.sectionHeading, styles.sp500Heading]}>S&P500 トップ20</Text>
      {sp500Rows.map((row) => (
        <StockRow
          key={row.id}
          variant="sp500"
          item={row}
          onDelete={() => {}}
          onPress={() => navigation.navigate('StockDetail', { ticker: row.ticker })}
          drag={() => {}}
          isActive={false}
          prices={sparklines[row.ticker.toUpperCase()]}
          usdJpyRate={usdJpyRate}
        />
      ))}
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>株価アラート</Text>
          <TouchableOpacity style={styles.addButton} onPress={onAdd}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <DraggableFlatList
          data={rows}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.emptyInline}>
              <Text style={styles.emptyInlineTitle}>まだ銘柄がありません</Text>
              <Text style={styles.emptyInlineSub}>右上の + から銘柄を追加できます。</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={onAdd}>
                <Text style={styles.emptyButtonText}>銘柄を追加</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={listFooter}
          renderItem={({ item, drag, isActive }) => (
            <StockRow
              variant="watchlist"
              item={item}
              onDelete={() => onDelete(item)}
              onPress={() => navigation.navigate('StockDetail', { ticker: item.ticker })}
              drag={drag}
              isActive={isActive}
              prices={sparklines[item.ticker.toUpperCase()]}
              usdJpyRate={usdJpyRate}
            />
          )}
          onDragEnd={onDragEnd}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              tintColor="#FFFFFF"
            />
          }
          contentContainerStyle={styles.listContent}
        />

        <AddStockModal visible={modalVisible} onClose={onModalClose} />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 24,
  },
  dateLine: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  sectionHeading: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 8,
    marginTop: 4,
  },
  sp500Heading: {
    marginTop: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
    flexGrow: 1,
  },
  footerBlock: {
    paddingBottom: 8,
  },
  emptyInline: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyInlineTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptyInlineSub: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0A84FF',
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
