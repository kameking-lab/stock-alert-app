# 株価アラート（Expo + TypeScript）

米国株・S&P500・日本株の株価を一覧で管理し、上限/下限に達したらローカル通知するアプリです。

## 1. パッケージのインストール

```bash
cd stock
npm install
npx expo install expo-background-fetch expo-constants expo-notifications expo-status-bar expo-task-manager @react-native-async-storage/async-storage
```

（`package.json` に既に含まれている場合は `npm install` のみで可）

## 2. プロジェクト構成

```
stock/
├── App.tsx                    # エントリ・タスク登録・通知許可
├── app.json                   # Expo設定・iOS権限・プラグイン
├── package.json
├── tsconfig.json
├── babel.config.js
│
├── src/
│   ├── types/
│   │   └── stock.ts           # StockItem, StockQuote, ヘルパー
│   ├── services/
│   │   ├── storage.ts         # AsyncStorage で銘柄の永続化
│   │   ├── stockPriceService.ts  # Yahoo Finance API
│   │   └── notifications.ts  # expo-notifications
│   ├── tasks/
│   │   └── backgroundFetchTask.ts  # バックグラウンド取得・アラート・通知
│   ├── screens/
│   │   └── HomeScreen.tsx     # メイン一覧（FlatList）
│   └── components/
│       ├── StockRow.tsx      # 一覧1行（ハイライト付き）
│       └── AddStockModal.tsx # 銘柄追加モーダル
│
└── assets/                    # icon.png, splash.png 等（Expo テンプレで生成可）
```

## 3. app.json に追加すべき権限

以下はすでに `app.json` に含めています。

### iOS（infoPlist）

- **UIBackgroundModes**: `["fetch"]` … バックグラウンドフェッチを有効化
- **BGTaskSchedulerPermittedIdentifiers**: `["com.stockalert.app.refresh"]` … バックグラウンドタスクの ID（Bundle ID に合わせて変更可）

### プラグイン

- **expo-notifications** … ローカル通知
- **expo-background-fetch** … バックグラウンド定期実行

### アセット

- `./assets/icon.png`, `./assets/splash.png`, `./assets/adaptive-icon.png` が必要です。
- 用意していない場合は、別ディレクトリで `npx create-expo-app@latest temp-app --template blank-typescript` を実行し、生成された `assets` フォルダを本プロジェクトの `stock/` にコピーしてください。

## 4. 実行

```bash
npx expo start
```

- **Expo Go**: `npx expo start` のあと QR コードで起動可能。ただし **バックグラウンドフェッチは Expo Go では動作しません**。
- **開発ビルド（実機）**: バックグラウンド取得と通知をフルに試す場合は、`eas build` などで開発ビルドを作成し、実機にインストールしてください。

## 5. 主な機能

- **データ取得**: Yahoo Finance Chart API で複数ティッカー（AAPL, ^GSPC, 7203.T 等）を取得
- **一覧**: FlatList でティッカー・現在値・上下限を表示。上限突破は緑、下限突破は赤でハイライト
- **追加**: モーダルでティッカー・上限・下限を入力して保存（AsyncStorage）
- **削除**: 各行の「削除」ボタンで削除
- **バックグラウンド**: 約15分間隔で価格取得し、上限以上/下限以下でローカル通知（タイトル「株価アラート: {銘柄名}」、本文に設定値と現在値）
