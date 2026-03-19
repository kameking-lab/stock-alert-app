# 株パト 引き継ぎ書

## 1. アプリ概要
- アプリ名: `株パト`
- 技術: Expo + React Native + TypeScript
- 目的: 米国株・指数（例: `^GSPC`）・日本株（例: `7203.T`）を1画面で監視し、上限/下限到達時にローカル通知する
- データ保存: `@react-native-async-storage/async-storage`
- バックグラウンド監視: `expo-background-fetch` + `expo-task-manager`

## 2. 現在の進捗
- 主要機能（銘柄登録/削除、一覧表示、Yahoo Finance 取得、しきい値判定、通知送信）は実装済み
- iOS向け EAS Build / Submit 設定は完了済み
  - `eas.json` に `build.production` と `submit.production.ios` を設定済み
  - `app.json` に iOS `bundleIdentifier` / `buildNumber` / `CFBundleDisplayName` を設定済み
- 依存関係の調整（`npx expo install --fix`）と `expo-asset` の不足エラー対応は実施済み
- `assets` 未存在による prebuild エラー回避のため、**ダミーPNG** を配置済み
- 次の作業: **TestFlight 実機での通知・バックグラウンド挙動確認**

## 3. 新しいノートPCでの再開手順
1. リポジトリを取得
   - `git clone https://github.com/kameking-lab/stock-alert-app.git`
   - `cd stock-alert-app`
2. 依存関係をインストール
   - `npm install`
3. Expoログイン（EASを使う場合）
   - `npx expo login`
   - `eas login`
4. 開発サーバ起動
   - `npx expo start`
   - iOSシミュレータ: `npm run ios`
5. EASビルド（iOS本番/TestFlight）
   - `eas build --platform ios --profile production --auto-submit`

## 4. 主要パッケージと特別設定
- 主要パッケージ
  - `expo` `~52.0.0`
  - `react-native` `0.76.9`
  - `expo-notifications` `~0.29.0`
  - `expo-task-manager` `~12.0.0`
  - `expo-background-fetch` `~13.0.0`
  - `expo-asset` `~11.0.5`
  - `@react-native-async-storage/async-storage` `1.23.1`
- ルーティング
  - **Expo Router は未使用**（現在は単一画面ベース構成）
- 通知
  - `expo-notifications` 導入済み（ローカル通知送信）
  - iOSの表示名は `CFBundleDisplayName: 株パト` を設定済み
- バックグラウンド
  - iOS `UIBackgroundModes` に `fetch` を設定
  - `BGTaskSchedulerPermittedIdentifiers` に `com.stockalert.app.refresh` を設定
- 画像アセット
  - `assets/icon.png`
  - `assets/splash.png`
  - `assets/adaptive-icon.png`
  - 現在はビルドエラー回避用のダミー画像。リリース前に正式画像へ差し替え推奨

## 5. 補足
- GitHub リポジトリの現状は空表示の可能性があるため、初回 push 後に内容が反映されることを確認する
- 参考: [kameking-lab/stock-alert-app · GitHub](https://github.com/kameking-lab/stock-alert-app)
