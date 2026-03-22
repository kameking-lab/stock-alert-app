import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCountdownJa, getUsMarketUiState } from '../utils/usMarketTime';

const TICK_MS = 60 * 1000;

type BannerProps = {
  /** アプリがアクティブかつホームにフォーカスがあるときだけ 1 分カウントダウンを更新 */
  enableMinuteTicker?: boolean;
};

function MarketStatusBannerInner({ enableMinuteTicker = true }: BannerProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!enableMinuteTicker) return;
    const id = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(id);
  }, [enableMinuteTicker]);

  const state = getUsMarketUiState(new Date());
  const countdown = formatCountdownJa(state.countdownMs);

  return (
    <View style={styles.wrap}>
      <Text style={styles.line}>
        {state.dot} {state.title}
      </Text>
      <Text style={styles.sub}>
        {state.countdownLabel} {countdown}
      </Text>
      <Text style={styles.hint}>※祝日は考慮していません（平日スケジュールのみ）</Text>
    </View>
  );
}

export default React.memo(MarketStatusBannerInner);

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  line: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sub: {
    marginTop: 6,
    color: '#AEAEB2',
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    marginTop: 8,
    color: '#636366',
    fontSize: 11,
  },
});
