/**
 * Prebuild エラー回避用: 最小限の有効な PNG を assets に配置する
 * （本番用には 1024x1024 の icon 等に差し替えることを推奨）
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');

// 1x1 ピクセルの有効な PNG（灰色）
const MINIMAL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const buffer = Buffer.from(MINIMAL_PNG_BASE64, 'base64');

const files = ['icon.png', 'splash.png', 'adaptive-icon.png'];

if (!fs.existsSync(ASSETS)) {
  fs.mkdirSync(ASSETS, { recursive: true });
}

files.forEach((name) => {
  const filePath = path.join(ASSETS, name);
  fs.writeFileSync(filePath, buffer);
  console.log('Written:', filePath);
});

console.log('Done. Replace with proper 1024x1024 icon / splash for production if needed.');
