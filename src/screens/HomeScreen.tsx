/**
 * メイン画面: 銘柄一覧（FlatList）・追加モーダル・スワイプ削除
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import type { StockItem, StockRowItem } from '../types/stock';
import { loadStocks, removeStock } from '../services/storage';
import { fetchQuotes } from '../services/stockPriceService';
import { getDisplayName, isAboveUpper, isBelowLower } from '../types/stock';
import StockRow from '../components/StockRow';
import AddStockModal from '../components/AddStockModal';

export default function HomeScreen() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [rows, setRows] = useState<StockRowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const load = useCallback(async () => {
    const list = await loadStocks();
    setItems(list);
    if (list.length === 0) {
      setRows([]);
      return;
    }
    const tickers = list.map((s) => s.ticker);
    const quotes = await fetchQuotes(tickers);
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

  return (
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
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StockRow item={item} onDelete={() => onDelete(item)} />
          )}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <AddStockModal visible={modalVisible} onClose={onModalClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 12,
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
  },
  emptySub: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
