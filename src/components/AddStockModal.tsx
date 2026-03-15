/**
 * 新規銘柄登録モーダル（ティッカー・上限・下限）
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { createStockItem } from '../types/stock';
import { addStock } from '../services/storage';

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

  const reset = () => {
    setTicker('');
    setUpperStr('');
    setLowerStr('');
    setDisplayName('');
    setError('');
  };

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
              placeholderTextColor="#999"
              value={ticker}
              onChangeText={setTicker}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <Text style={styles.label}>表示名（任意）</Text>
            <TextInput
              style={styles.input}
              placeholder="表示名"
              placeholderTextColor="#999"
              value={displayName}
              onChangeText={setDisplayName}
            />

            <Text style={styles.label}>上限値</Text>
            <TextInput
              style={styles.input}
              placeholder="上限"
              placeholderTextColor="#999"
              value={upperStr}
              onChangeText={setUpperStr}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>下限値</Text>
            <TextInput
              style={styles.input}
              placeholder="下限"
              placeholderTextColor="#999"
              value={lowerStr}
              onChangeText={setLowerStr}
              keyboardType="decimal-pad"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
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
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  error: {
    color: '#c62828',
    fontSize: 14,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
