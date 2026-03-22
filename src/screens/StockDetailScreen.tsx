import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Linking,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Text as SvgText } from 'react-native-svg';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  fetchChartData,
  fetchQuote,
  fetchStockDetail,
  fetchStockNews,
  searchStocks,
  formatUsdAsJpyApprox,
  getUsdJpyRate,
  type StockDetailData,
  type StockNewsItem,
} from '../services/stockPriceService';
import type { StockQuote } from '../types/stock';
import { getExtendedHoursDisplay } from '../utils/extendedHours';
import type { RootStackParamList } from '../../App';
import AIAnalysisModal from '../components/AIAnalysisModal';
import { analyzeStockWithAI, GEMINI_KEY_MISSING_MESSAGE } from '../services/aiService';

type StockDetailRoute = RouteProp<RootStackParamList, 'StockDetail'>;
type StockDetailNav = NativeStackNavigationProp<RootStackParamList, 'StockDetail'>;
type RangeOption = {
  label: string;
  range: string;
};

const RANGE_OPTIONS: RangeOption[] = [
  { label: '1日', range: '1d' },
  { label: '1週間', range: '5d' },
  { label: '1か月', range: '1mo' },
  { label: '3か月', range: '3mo' },
  { label: '6か月', range: '6mo' },
  { label: '年初来', range: 'ytd' },
  { label: '1年間', range: '1y' },
  { label: '5年', range: '5y' },
];

function formatPrice(value: number, currency: string): string {
  return currency === 'JPY' ? `¥${Math.round(value)}` : `$${value.toFixed(2)}`;
}

function jstYmd(dateMs: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(dateMs));
}

function formatEarningsLine(ts: number): string {
  const dateStr = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'long',
    day: 'numeric',
  }).format(new Date(ts));
  const e = jstYmd(ts);
  const today = jstYmd(Date.now());
  const ea = new Date(`${e}T12:00:00+09:00`).getTime();
  const ta = new Date(`${today}T12:00:00+09:00`).getTime();
  const diffDays = Math.round((ea - ta) / 86400000);
  if (diffDays === 0) return `${dateStr}（本日）`;
  if (diffDays > 0) return `${dateStr}（あと${diffDays}日）`;
  return `${dateStr}（${Math.abs(diffDays)}日前）`;
}

function RecommendationBadgeView({ recommendationKey }: { recommendationKey: string }) {
  const k = recommendationKey.toLowerCase().replace(/-/g, '_');
  if (['strong_buy', 'buy'].includes(k)) {
    return (
      <View style={[styles.recBadge, { backgroundColor: '#1B5E20' }]}>
        <Text style={styles.recBadgeText}>🔥 買い推奨</Text>
      </View>
    );
  }
  if (k === 'hold') {
    return (
      <View style={[styles.recBadge, { backgroundColor: '#48484A' }]}>
        <Text style={styles.recBadgeText}>⚖️ 中立（ホールド）</Text>
      </View>
    );
  }
  if (['sell', 'strong_sell'].includes(k)) {
    return (
      <View style={[styles.recBadge, { backgroundColor: '#0077B6' }]}>
        <Text style={styles.recBadgeText}>❄️ 売り推奨</Text>
      </View>
    );
  }
  return (
    <View style={[styles.recBadge, { backgroundColor: '#3A3A3C' }]}>
      <Text style={styles.recBadgeText}>{recommendationKey}</Text>
    </View>
  );
}

export default function StockDetailScreen() {
  const navigation = useNavigation<StockDetailNav>();
  const route = useRoute<StockDetailRoute>();
  const { ticker } = route.params;
  const { width: windowWidth } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'JPY'>('USD');
  const [changePercent, setChangePercent] = useState<number>(0);
  const [companyName, setCompanyName] = useState<string>(ticker);
  const [exchange, setExchange] = useState<string>('—');
  const [detailData, setDetailData] = useState<StockDetailData | null>(null);
  const [selectedRange, setSelectedRange] = useState<string>('1d');
  const [chartPrices, setChartPrices] = useState<number[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [newsItems, setNewsItems] = useState<StockNewsItem[]>([]);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [usdJpyRate, setUsdJpyRate] = useState<number | null>(null);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResultText, setAiResultText] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [quoteRes, matches, detail, usdJpy] = await Promise.all([
        fetchQuote(ticker),
        searchStocks(ticker),
        fetchStockDetail(ticker),
        getUsdJpyRate(),
      ]);
      if (!alive) return;
      setUsdJpyRate(usdJpy);

      const exact = matches.find((item) => item.symbol.toUpperCase() === ticker.toUpperCase()) || matches[0];
      if (exact) {
        setCompanyName(exact.longname || exact.shortname || exact.symbol);
        setExchange(exact.exchDisp || '—');
      }

      if (quoteRes) {
        setQuote(quoteRes);
        setPrice(quoteRes.price);
        setCurrency(quoteRes.currency);
        setChangePercent(quoteRes.changePercent ?? 0);
      } else {
        setQuote(null);
      }
      setDetailData(detail);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [ticker]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const news = await fetchStockNews(ticker);
      if (!alive) return;
      setNewsItems(news);
    })();
    return () => {
      alive = false;
    };
  }, [ticker]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setChartLoading(true);
      const prices = await fetchChartData(ticker, selectedRange);
      if (!alive) return;
      setChartPrices(prices);
      setChartLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [ticker, selectedRange]);

  const changeAmount = useMemo(() => {
    if (price == null) return 0;
    const base = 1 + changePercent / 100;
    if (base <= 0) return 0;
    const previousClose = price / base;
    return price - previousClose;
  }, [price, changePercent]);

  const extDisplay = useMemo(() => getExtendedHoursDisplay(quote ?? undefined), [quote]);

  const positive = changePercent >= 0;
  const changeColor = positive ? '#34C759' : '#FF3B30';
  const detailCurrency = (detailData?.currency as 'USD' | 'JPY' | undefined) ?? currency;

  const formatNumber = (value?: number): string => {
    if (value == null || !Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  };

  const formatCompact = (value?: number): string => {
    if (value == null || !Number.isFinite(value)) return '—';
    const abs = Math.abs(value);
    if (abs >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)}T`;
    if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
    return formatNumber(value);
  };

  const chartWidth = Math.min(Math.max(windowWidth - 64, 260), 360);
  const chartHeight = 150;
  const chartPad = 12;
  const chartInnerW = chartWidth - chartPad * 2;
  const chartInnerH = chartHeight - chartPad * 2;
  const chartMin = chartPrices.length > 0 ? Math.min(...chartPrices) : 0;
  const chartMax = chartPrices.length > 0 ? Math.max(...chartPrices) : 0;
  const chartRange = chartMax - chartMin || 1;
  const chartPoints =
    chartPrices.length >= 2
      ? chartPrices
          .map((value, index) => {
            const x = chartPad + (index / (chartPrices.length - 1)) * chartInnerW;
            const y =
              chartPad + chartInnerH - ((value - chartMin) / chartRange) * chartInnerH;
            return `${x.toFixed(2)},${y.toFixed(2)}`;
          })
          .join(' ')
      : '';

  const xStartLabel = selectedRange === '1d' ? '開始' : '過去';
  const xEndLabel = selectedRange === '1d' ? '現在' : '現在';
  const midLabel = RANGE_OPTIONS.find((item) => item.range === selectedRange)?.label ?? selectedRange;

  const runAiAnalysis = async () => {
    setAiModalVisible(true);
    setAiLoading(true);
    setAiResultText(null);
    setAiError(null);
    try {
      const text = await analyzeStockWithAI({
        ticker: ticker.toUpperCase(),
        companyName,
        currentPrice: price,
        currency,
        changePercent,
        recommendationKey: detailData?.recommendationKey ?? null,
        newsHeadlines: newsItems.map((n) => ({ title: n.title, summary: n.summary })),
      });
      setAiResultText(text);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '不明なエラーが発生しました';
      setAiError(msg);
      if (msg === GEMINI_KEY_MISSING_MESSAGE || msg.includes('Gemini APIキー')) {
        Alert.alert('AI分析', GEMINI_KEY_MISSING_MESSAGE);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const formatRelativeTime = (timestamp?: number): string => {
    if (!timestamp) return '日時不明';
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.max(0, now - timestamp);
    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return `${minutes}分前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}時間前`;
    const days = Math.floor(hours / 24);
    return `${days}日前`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#0A84FF" />
        ) : (
          <>
            <Text style={styles.ticker}>{ticker.toUpperCase()}</Text>
            <Text style={styles.company}>{companyName}</Text>

            <Text style={styles.price}>
              {price != null ? formatPrice(price, currency) : '—'}
            </Text>
            {currency === 'USD' && price != null && usdJpyRate != null ? (
              <Text style={styles.jpyHint}>{formatUsdAsJpyApprox(price, usdJpyRate)}</Text>
            ) : null}
            <Text style={[styles.change, { color: changeColor }]}>
              {changeAmount >= 0 ? '+' : ''}
              {formatPrice(Math.abs(changeAmount), currency)} ({changePercent >= 0 ? '+' : ''}
              {changePercent.toFixed(2)}%)
            </Text>

            {extDisplay ? (
              <View style={styles.extRow}>
                <Text style={styles.extMoon}>🌙</Text>
                <Text style={styles.extDetailText}>
                  {extDisplay.label}: {formatPrice(extDisplay.price, currency)} (
                  {extDisplay.changePercent >= 0 ? '+' : ''}
                  {extDisplay.changePercent.toFixed(2)}%)
                </Text>
              </View>
            ) : null}

            {detailData?.recommendationKey ? (
              <RecommendationBadgeView recommendationKey={detailData.recommendationKey} />
            ) : null}

            <Text style={styles.market}>
              {exchange} - {currency}
            </Text>

            <View style={styles.chartSection}>
              <View style={styles.tabs}>
                {RANGE_OPTIONS.map((option) => {
                  const active = option.range === selectedRange;
                  return (
                    <TouchableOpacity
                      key={option.range}
                      style={styles.tabItem}
                      onPress={() => setSelectedRange(option.range)}
                    >
                      <Text style={[styles.tabText, active && styles.tabTextActive]}>
                        {option.label}
                      </Text>
                      <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.chartBox}>
                {chartLoading ? (
                  <ActivityIndicator size="small" color="#0A84FF" />
                ) : chartPoints ? (
                  <Svg width={chartWidth} height={chartHeight + 36}>
                    <SvgText
                      x={chartPad}
                      y={18}
                      fill="#EBEBF5"
                      fontSize={12}
                      fontWeight="600"
                    >
                      {chartMax ? formatPrice(chartMax, detailCurrency) : '—'}
                    </SvgText>
                    <SvgText
                      x={chartWidth - chartPad}
                      y={18}
                      fill="#EBEBF5"
                      fontSize={12}
                      fontWeight="600"
                      textAnchor="end"
                    >
                      高
                    </SvgText>
                    <Polyline
                      points={chartPoints}
                      fill="none"
                      stroke={changeColor}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <SvgText
                      x={chartPad}
                      y={chartHeight - 4}
                      fill="#EBEBF5"
                      fontSize={12}
                      fontWeight="600"
                    >
                      {chartMin ? formatPrice(chartMin, detailCurrency) : '—'}
                    </SvgText>
                    <SvgText
                      x={chartWidth - chartPad}
                      y={chartHeight - 4}
                      fill="#EBEBF5"
                      fontSize={12}
                      fontWeight="600"
                      textAnchor="end"
                    >
                      低
                    </SvgText>
                    <SvgText
                      x={chartPad}
                      y={chartHeight + 22}
                      fill="#AEAEB2"
                      fontSize={11}
                      fontWeight="500"
                    >
                      {xStartLabel}
                    </SvgText>
                    <SvgText
                      x={chartWidth / 2}
                      y={chartHeight + 22}
                      fill="#AEAEB2"
                      fontSize={11}
                      fontWeight="500"
                      textAnchor="middle"
                    >
                      {midLabel}
                    </SvgText>
                    <SvgText
                      x={chartWidth - chartPad}
                      y={chartHeight + 22}
                      fill="#AEAEB2"
                      fontSize={11}
                      fontWeight="500"
                      textAnchor="end"
                    >
                      {xEndLabel}
                    </SvgText>
                  </Svg>
                ) : (
                  <Text style={styles.noChartText}>チャートデータなし</Text>
                )}
              </View>
            </View>

            {detailData?.nextEarningsDateMs != null ? (
              <View style={styles.earningsCard}>
                <Text style={styles.earningsTitle}>次回決算日</Text>
                <Text style={styles.earningsValue}>
                  {formatEarningsLine(detailData.nextEarningsDateMs)}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={runAiAnalysis}
              style={styles.aiButtonWrap}
              accessibilityRole="button"
              accessibilityLabel="AIで買い時売り時を分析"
            >
              <LinearGradient
                colors={['#4845E8', '#A855F7', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiGradient}
              >
                <Text style={styles.aiButtonText}>✨ AIで買い時・売り時を分析</Text>
                <Text style={styles.aiButtonSub}>ニュースと指標をまとめて解説（日本語）</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.newsSection}>
              <Text style={styles.newsTitle}>関連ニュース</Text>
              <FlatList
                data={newsItems}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.newsItem}
                    onPress={() => Linking.openURL(item.url)}
                  >
                    <Text style={styles.newsHeadline}>{item.title}</Text>
                    <Text style={styles.newsSummary} numberOfLines={2}>
                      {item.summary || item.provider || 'ニュース概要なし'}
                    </Text>
                    <Text style={styles.newsTime}>{formatRelativeTime(item.publishedAt)}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.newsEmpty}>ニュースはまだありません</Text>
                }
              />
            </View>

            <View style={styles.grid}>
              <View style={styles.gridColumn}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridKey}>始値</Text>
                  <Text style={styles.gridValue}>
                    {detailData?.open != null ? formatPrice(detailData.open, detailCurrency) : '—'}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridKey}>高値</Text>
                  <Text style={styles.gridValue}>
                    {detailData?.high != null ? formatPrice(detailData.high, detailCurrency) : '—'}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridKey}>安値</Text>
                  <Text style={styles.gridValue}>
                    {detailData?.low != null ? formatPrice(detailData.low, detailCurrency) : '—'}
                  </Text>
                </View>
              </View>

              <View style={styles.gridColumn}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridKey}>出来高</Text>
                  <Text style={styles.gridValue}>{formatNumber(detailData?.volume)}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridKey}>PER</Text>
                  <Text style={styles.gridValue}>
                    {detailData?.peRatio != null ? detailData.peRatio.toFixed(2) : '—'}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridKey}>時価総額</Text>
                  <Text style={styles.gridValue}>{formatCompact(detailData?.marketCap)}</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridKey}>52週高値</Text>
                  <Text style={styles.gridValue}>
                    {detailData?.week52High != null
                      ? formatPrice(detailData.week52High, detailCurrency)
                      : '—'}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridKey}>52週安値</Text>
                  <Text style={styles.gridValue}>
                    {detailData?.week52Low != null
                      ? formatPrice(detailData.week52Low, detailCurrency)
                      : '—'}
                  </Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridKey}>平均出来高</Text>
                  <Text style={styles.gridValue}>{formatNumber(detailData?.avgVolume)}</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <AIAnalysisModal
        visible={aiModalVisible}
        title={`${ticker.toUpperCase()} — AI分析`}
        loading={aiLoading}
        text={aiResultText}
        error={aiError}
        onClose={() => setAiModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    marginTop: 26,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  ticker: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  company: {
    marginTop: 6,
    color: '#8E8E93',
    fontSize: 15,
  },
  price: {
    marginTop: 18,
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  jpyHint: {
    marginTop: 6,
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  earningsCard: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  earningsTitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  earningsValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  aiButtonWrap: {
    marginTop: 20,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  aiGradient: {
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  aiButtonSub: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontWeight: '600',
  },
  change: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  market: {
    marginTop: 8,
    color: '#8E8E93',
    fontSize: 14,
  },
  extRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  extMoon: {
    fontSize: 14,
  },
  extDetailText: {
    flex: 1,
    color: '#AEAEB2',
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  recBadge: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  recBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  chartSection: {
    marginTop: 24,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 14,
  },
  tabItem: {
    alignItems: 'center',
  },
  tabText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tabUnderline: {
    marginTop: 4,
    height: 2,
    width: 28,
    backgroundColor: 'transparent',
  },
  tabUnderlineActive: {
    backgroundColor: '#FFFFFF',
  },
  chartBox: {
    marginTop: 14,
    minHeight: 200,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noChartText: {
    color: '#8E8E93',
    fontSize: 13,
  },
  chartAxisRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: {
    color: '#8E8E93',
    fontSize: 11,
  },
  newsSection: {
    marginTop: 24,
  },
  newsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  newsItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  newsHeadline: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  newsSummary: {
    marginTop: 6,
    color: '#8E8E93',
    fontSize: 13,
    lineHeight: 18,
  },
  newsTime: {
    marginTop: 8,
    color: '#8E8E93',
    fontSize: 12,
  },
  newsEmpty: {
    color: '#8E8E93',
    fontSize: 13,
    paddingVertical: 8,
  },
  grid: {
    marginTop: 26,
    flexDirection: 'row',
    gap: 20,
  },
  gridColumn: {
    flex: 1,
    gap: 14,
  },
  gridItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    paddingBottom: 10,
  },
  gridKey: {
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 4,
  },
  gridValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
