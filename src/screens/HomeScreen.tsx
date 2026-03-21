/**
 * メイン画面: 銘柄一覧（FlatList）・追加モーダル・スワイプ削除
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DraggableFlatList from 'react-native-draggable-flatlist';
import type { StockItem, StockRowItem } from '../types/stock';
import { loadStocks, removeStock, saveStocks } from '../services/storage';
import { fetchQuotes, fetchSparklines } from '../services/stockPriceService';
import { getDisplayName } from '../types/stock';
import StockRow from '../components/StockRow';
import AddStockModal from '../components/AddStockModal';
import type { RootStackParamList } from '../../App';

type HomeScreenNavigation = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigation>();
  const [items, setItems] = useState<StockItem[]>([]);
  const [rows, setRows] = useState<StockRowItem[]>([]);
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    const list = await loadStocks();
    setItems(list);
    if (list.length === 0) {
      setRows([]);
      setSparklines({});
      return;
    }
    const tickers = list.map((s) => s.ticker);
    const [quotes, nextSparklines] = await Promise.all([
      fetchQuotes(tickers),
      fetchSparklines(tickers),
    ]);
    setSparklines(nextSparklines);
    setRows(
      list.map((item) => ({
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
      setItems(nextItems);
      await saveStocks(nextItems);
    },
    []
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

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>銘柄を追加</Text>
          <Text style={styles.emptySub}>右下の + から銘柄と上下限を登録してください。</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={onAdd}>
            <Text style={styles.emptyButtonText}>銘柄を追加</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <DraggableFlatList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={({ item, drag, isActive }) => (
            <StockRow
              item={item}
              onDelete={() => onDelete(item)}
              onPress={() => navigation.navigate('StockDetail', { ticker: item.ticker })}
              drag={drag}
              isActive={isActive}
              prices={sparklines[item.ticker.toUpperCase()]}
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
      )}

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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#FFFFFF',
  },
  emptySub: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
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
