/**
 * 本番: EAS の Production 環境変数 GEMINI_API_KEY をビルド時に extra に埋め込み（Git にキーを含めない）。
 * ローカル: ルートの .env に GEMINI_API_KEY=...（.gitignore 済み）
 */
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {
  /* optional */
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appJson = require('./app.json');

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
      geminiApiKey: process.env.GEMINI_API_KEY?.trim() || '',
    },
  },
};
