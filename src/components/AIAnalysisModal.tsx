import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  title: string;
  loading: boolean;
  text: string | null;
  error: string | null;
  onClose: () => void;
};

export default function AIAnalysisModal({ visible, title, loading, text, error, onClose }: Props) {
  const { height } = useWindowDimensions();
  const maxH = Math.min(height * 0.78, 560);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { maxHeight: maxH }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} numberOfLines={2}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#BF5AF2" />
              <Text style={styles.loadingText}>分析中…</Text>
            </View>
          ) : error ? (
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
              <Text style={styles.errorText}>{error}</Text>
            </ScrollView>
          ) : (
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator
            >
              <Text style={styles.bodyText}>{text ?? ''}</Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  sheetTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    paddingRight: 12,
  },
  closeBtn: {
    padding: 4,
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#AEAEB2',
    fontSize: 14,
  },
  body: {
    maxHeight: 420,
  },
  bodyContent: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  bodyText: {
    color: '#EBEBF5',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 15,
    lineHeight: 22,
  },
});
