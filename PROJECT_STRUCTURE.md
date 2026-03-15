# 株価アラート Expo 版 — ディレクトリ構成

## ファイル一覧と役割

| パス | 役割 |
|------|------|
| **App.tsx** | エントリ。バックグラウンドタスク定義の読み込み、タスク登録、通知許可、HomeScreen 表示 |
| **app.json** | Expo 設定。iOS の `infoPlist`（UIBackgroundModes, BGTaskSchedulerPermittedIdentifiers）、プラグイン（expo-notifications, expo-background-fetch） |
| **src/types/stock.ts** | `StockItem`, `StockQuote`, `StockRowItem` の型と `createStockItem`, `getDisplayName`, `isAboveUpper`, `isBelowLower` |
| **src/services/storage.ts** | AsyncStorage で銘柄の load / save / add / remove |
| **src/services/stockPriceService.ts** | Yahoo Finance Chart API で `fetchQuote`, `fetchQuotes`（米国株・指数・日本株対応） |
| **src/services/notifications.ts** | 通知許可、`sendStockAlert`（タイトル・本文フォーマット） |
| **src/tasks/backgroundFetchTask.ts** | `TaskManager.defineTask` でタスク定義。銘柄取得 → API → 上限/下限判定 → 通知。`registerBackgroundFetchAsync`（minimumInterval: 15分） |
| **src/screens/HomeScreen.tsx** | 銘柄一覧（FlatList）、プルリフレッシュ、追加ボタン、空状態、AddStockModal の開閉、削除確認 |
| **src/components/StockRow.tsx** | 1行表示（ティッカー・現在価格・上下限・突破時ハイライト・削除ボタン） |
| **src/components/AddStockModal.tsx** | Modal。ティッカー・表示名・上限・下限入力、バリデーション、保存で storage に追加 |

## app.json に追加すべき権限（まとめ）

- **ios.infoPlist.UIBackgroundModes**: `["fetch"]`
- **ios.infoPlist.BGTaskSchedulerPermittedIdentifiers**: `["com.stockalert.app.refresh"]`（Bundle ID に合わせて変更可）
- **plugins**: `"expo-notifications"`, `"expo-background-fetch"`

以上で、Expo (React Native) + TypeScript 版の構成と権限が一覧できます。
