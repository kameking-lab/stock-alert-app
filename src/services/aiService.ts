/**
 * Google Gemini による銘柄解説
 * キーは app.config.js 経由の extra.geminiApiKey（EAS の GEMINI_API_KEY）で全ユーザー共通。
 */

import Constants from 'expo-constants';

/** ユーザー向け：キー未埋め込み時 */
export const GEMINI_KEY_MISSING_MESSAGE =
  'AI分析用のGemini APIキーがアプリに組み込まれていません。開発者のビルド設定を確認してください。';

/** REST で指定するモデル ID */
export const GEMINI_MODEL_ID = 'gemini-3-flash';

export type StockAnalysisInput = {
  ticker: string;
  companyName?: string;
  currentPrice?: number | null;
  currency?: string;
  changePercent?: number | null;
  recommendationKey?: string | null;
  newsHeadlines: Array<{ title: string; summary?: string }>;
};

export function buildStockAnalysisPrompt(input: StockAnalysisInput): string {
  const lines: string[] = [];
  lines.push(`銘柄: ${input.ticker}`);
  if (input.companyName) lines.push(`会社名: ${input.companyName}`);
  if (input.currentPrice != null && Number.isFinite(input.currentPrice)) {
    lines.push(
      `現在価格: ${input.currentPrice} ${input.currency ?? 'USD'}（変動率: ${
        input.changePercent != null
          ? `${input.changePercent >= 0 ? '+' : ''}${input.changePercent.toFixed(2)}%`
          : '不明'
      }）`
    );
  }
  if (input.recommendationKey) {
    lines.push(`アナリスト推奨（Yahoo）: ${input.recommendationKey}`);
  }
  lines.push('');
  lines.push('【関連ニュース（タイトル・概要）】');
  if (input.newsHeadlines.length === 0) {
    lines.push('（ニュースなし）');
  } else {
    input.newsHeadlines.slice(0, 8).forEach((n, i) => {
      lines.push(`${i + 1}. ${n.title}`);
      if (n.summary) lines.push(`   概要: ${n.summary.slice(0, 200)}`);
    });
  }
  lines.push('');
  lines.push(
    '上記を踏まえ、この銘柄の現在の状況を要約し、投資初心者に向けて「買い時・売り時」の判断材料と解説を日本語で出力してください。箇条書きと短い段落を混ぜ、投資は自己責任である旨も一言添えてください。'
  );
  return lines.join('\n');
}

function getEmbeddedGeminiApiKey(): string | null {
  const extra = Constants.expoConfig?.extra as { geminiApiKey?: string } | undefined;
  const k = extra?.geminiApiKey?.trim();
  return k && k.length > 0 ? k : null;
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_MODEL_ID
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Gemini API: ${res.status} ${text.slice(0, 200)}`);
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Gemini API: JSON parse error');
  }
  const parts = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    ?.candidates?.[0]?.content?.parts;
  const out = parts?.map((p) => p.text).join('') ?? '';
  if (!out.trim()) throw new Error('Gemini API: 空の応答');
  return out.trim();
}

export async function analyzeStockWithAI(input: StockAnalysisInput): Promise<string> {
  const apiKey = getEmbeddedGeminiApiKey();
  if (!apiKey) {
    throw new Error(GEMINI_KEY_MISSING_MESSAGE);
  }
  const prompt = buildStockAnalysisPrompt(input);
  return callGemini(prompt, apiKey);
}
