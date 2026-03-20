/**
 * 新規銘柄登録モーダル（ティッカー・上限・下限）
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { createStockItem } from '../types/stock';
import { addStock } from '../services/storage';
import {
  fetchQuote,
  searchStocks,
  type StockSearchResult,
} from '../services/stockPriceService';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AddStockModal({ visible, onClose }: Props) {
  const [ticker, setTicker] = useState('');
  const [upperStr, setUpperStr] = useState('');
  const [lowerStr, setLowerStr] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [calculatingPercent, setCalculatingPercent] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const reset = () => {
    setTicker('');
    setUpperStr('');
    setLowerStr('');
    setDisplayName('');
    setError('');
    setSearchResults([]);
    setSearchLoading(false);
  };

  useEffect(() => {
    const q = ticker.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(() => {
      searchStocks(q)
        .then((results) => {
          setSearchResults(results);
        })
        .finally(() => {
          setSearchLoading(false);
        });
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [ticker]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = async () => {
    setError('');
    const t = ticker.trim().toUpperCase();
    if (!t) {
      setError('ティッカーを入力してください。');
      return;
    }
    const upper = parseFloat(upperStr.replace(/,/g, ''));
    const lower = parseFloat(lowerStr.replace(/,/g, ''));
    if (Number.isNaN(upper) || upper <= 0) {
      setError('有効な上限値を入力してください。');
      return;
    }
    if (Number.isNaN(lower) || lower <= 0) {
      setError('有効な下限値を入力してください。');
      return;
    }
    if (lower >= upper) {
      setError('下限値は上限値より小さくしてください。');
      return;
    }

    const item = createStockItem(t, upper, lower, displayName || undefined);
    await addStock(item);
    handleClose();
  };

  const applyPercentRange = async (percent: number) => {
    const t = ticker.trim().toUpperCase();
    if (!t) {
      setError('先にティッカーを入力してください。');
      return;
    }
    setError('');
    setCalculatingPercent(percent);
    try {
      const quote = await fetchQuote(t);
      if (!quote) {
        setError('現在価格を取得できませんでした。ティッカーを確認してください。');
        return;
      }
      const base = quote.price;
      const upper = base * (1 + percent / 100);
      const lower = base * (1 - percent / 100);
      setUpperStr(upper.toFixed(2));
      setLowerStr(lower.toFixed(2));
      if (!displayName.trim()) {
        setDisplayName(t);
      }
    } finally {
      setCalculatingPercent(null);
    }
  };

  const percentOptions = [5, 10, 20];
  const isCalculating = calculatingPercent !== null;

  const onTickerChange = (value: string) => {
    setTicker(value);
    if (value.trim().length === 0) {
      setSearchResults([]);
      setSearchLoading(false);
    }
  };

  const onSelectSearchResult = (result: StockSearchResult) => {
    setTicker(result.symbol);
    setSearchResults([]);
    if (!displayName.trim()) {
      setDisplayName(result.longname || result.shortname || result.symbol);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>銘柄を追加</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.cancelText}>キャンセル</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>ティッカー</Text>
            <TextInput
              style={styles.input}
              placeholder="例: AAPL, ^GSPC, 7203.T"
              placeholderTextColor="#8E8E93"
              value={ticker}
              onChangeText={onTickerChange}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {searchLoading ? (
              <View style={styles.searchLoadingRow}>
                <ActivityIndicator size="small" color="#0A84FF" />
                <Text style={styles.searchLoadingText}>候補を検索中...</Text>
              </View>
            ) : null}
            {searchResults.length > 0 ? (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => `${item.symbol}-${item.exchDisp ?? ''}`}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => onSelectSearchResult(item)}
                    >
                      <Text style={styles.suggestionSymbol}>{item.symbol}</Text>
                      <Text style={styles.suggestionSubText} numberOfLines={1}>
                        {item.longname || item.shortname || '名称なし'}
                        {item.exchDisp ? ` ・ ${item.exchDisp}` : ''}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            ) : null}

            <View style={styles.percentSection}>
              <Text style={styles.percentLabel}>上限・下限を一括設定</Text>
              <View style={styles.percentRow}>
                {percentOptions.map((percent) => (
                  <TouchableOpacity
                    key={percent}
                    style={[
                      styles.percentButton,
                      isCalculating && styles.percentButtonDisabled,
                    ]}
                    onPress={() => applyPercentRange(percent)}
                    disabled={isCalculating}
                  >
                    {calculatingPercent === percent ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.percentButtonText}>±{percent}%</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={styles.label}>表示名（任意）</Text>
            <TextInput
              style={styles.input}
              placeholder="表示名"
              placeholderTextColor="#8E8E93"
              value={displayName}
              onChangeText={setDisplayName}
            />

            <Text style={styles.label}>上限値</Text>
            <TextInput
              style={styles.input}
              placeholder="上限"
              placeholderTextColor="#8E8E93"
              value={upperStr}
              onChangeText={setUpperStr}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>下限値</Text>
            <TextInput
              style={styles.input}
              placeholder="下限"
              placeholderTextColor="#8E8E93"
              value={lowerStr}
              onChangeText={setLowerStr}
              keyboardType="decimal-pad"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.saveButton, isCalculating && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isCalculating}
            >
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelText: {
    color: '#0A84FF',
    fontSize: 16,
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#2C2C2E',
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  searchLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -8,
    marginBottom: 10,
  },
  searchLoadingText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  suggestionsContainer: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3A3A3C',
    maxHeight: 220,
    marginTop: -8,
    marginBottom: 14,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3C',
  },
  suggestionSymbol: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  suggestionSubText: {
    marginTop: 2,
    color: '#8E8E93',
    fontSize: 12,
  },
  percentSection: {
    marginBottom: 16,
  },
  percentLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 8,
  },
  percentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  percentButton: {
    minWidth: 72,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  percentButtonDisabled: {
    opacity: 0.6,
  },
  percentButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  error: {
    color: '#FF453A',
    fontSize: 14,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#0A84FF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
