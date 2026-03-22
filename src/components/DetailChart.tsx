/**
 * 銘柄詳細の SVG チャート（親の再レンダーから切り離して描画コストを抑える）
 */

import React, { useMemo } from 'react';
import Svg, { Polyline, Text as SvgText } from 'react-native-svg';

export type DetailChartProps = {
  chartPrices: number[];
  chartWidth: number;
  chartHeight: number;
  chartPad: number;
  detailCurrency: string;
  changeColor: string;
  xStartLabel: string;
  xEndLabel: string;
  midLabel: string;
};

function formatPrice(value: number, currency: string): string {
  return currency === 'JPY' ? `¥${Math.round(value)}` : `$${value.toFixed(2)}`;
}

function DetailChartInner({
  chartPrices,
  chartWidth,
  chartHeight,
  chartPad,
  detailCurrency,
  changeColor,
  xStartLabel,
  xEndLabel,
  midLabel,
}: DetailChartProps) {
  const chartInnerW = chartWidth - chartPad * 2;
  const chartInnerH = chartHeight - chartPad * 2;

  const { chartMin, chartMax, chartPoints } = useMemo(() => {
    if (chartPrices.length < 2) {
      return { chartMin: 0, chartMax: 0, chartPoints: '' };
    }
    const chartMin = Math.min(...chartPrices);
    const chartMax = Math.max(...chartPrices);
    const chartRange = chartMax - chartMin || 1;
    const chartPoints = chartPrices
      .map((value, index) => {
        const x = chartPad + (index / (chartPrices.length - 1)) * chartInnerW;
        const y = chartPad + chartInnerH - ((value - chartMin) / chartRange) * chartInnerH;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
    return { chartMin, chartMax, chartPoints };
  }, [chartPrices, chartPad, chartInnerW, chartInnerH]);

  if (!chartPoints) return null;

  return (
    <Svg width={chartWidth} height={chartHeight + 36}>
      <SvgText x={chartPad} y={18} fill="#EBEBF5" fontSize={12} fontWeight="600">
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
      <SvgText x={chartPad} y={chartHeight - 4} fill="#EBEBF5" fontSize={12} fontWeight="600">
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
  );
}

export default React.memo(DetailChartInner);
