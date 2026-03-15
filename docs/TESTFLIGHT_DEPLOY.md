# TestFlight（App Store Connect）への EAS Build と自動提出

## 前提

- Expo プロジェクトのルート（`stock/`）で作業します。
- [Expo アカウント](https://expo.dev) と [Apple Developer Program](https://developer.apple.com) の登録が必要です。

---

## 1. app.json の確認結果

| 項目 | 状態 | 内容 |
|------|------|------|
| `ios.bundleIdentifier` | ✅ 設定済み | `com.stockalert.app`（必要に応じて変更してください） |
| `version` | ✅ 設定済み | `1.0.0` |
| `ios.buildNumber` | ✅ 追加済み | `1`（TestFlight 提出のたびに増やすか、`eas.json` の `autoIncrement: true` で自動増分） |
| バックグラウンドフェッチ | ✅ 維持 | `infoPlist.UIBackgroundModes`: `["fetch"]` |

---

## 2. eas.json の設定

- **ビルド**: `production` プロファイルで `distribution: "store"`、iOS は App Store / TestFlight 用ビルド。
- **提出**: `submit.production` に Apple ID や App Store Connect の App ID などを指定可能（未設定の場合は実行時にプロンプトで入力）。

初回や CI で対話を減らしたい場合は、`eas.json` の `submit.production.ios` に以下を設定してください。

- `appleId`: Apple ID（メール）
- `ascAppId`: App Store Connect の「アプリ情報」にある **Apple ID**（数値）
- `appleTeamId`: Apple Developer の **Team ID**（開発者サイトの Membership などで確認）

---

## 3. 実行手順（コマンドの流れ）

### 3.1 初回のみ: EAS CLI とログイン

```bash
npm install -g eas-cli
eas login
```

`eas login` で Expo アカウントのメールとパスワードを入力します。

### 3.2 プロジェクトを EAS にリンク（初回のみ）

```bash
cd c:\Users\kanet\Downloads\stock
eas build:configure
```

既に `eas.json` がある場合は、必要に応じて上書きするかスキップします。

### 3.3 iOS 用の証明書・プロビジョニング（初回ビルド時）

初回の `eas build` 時、EAS が Apple Developer の情報を聞いてきます。

- **Apple ID**: App Store Connect / 開発者サイトにログインする Apple ID
- **Team / Distribution Certificate**: 自動管理を選ぶと EAS が証明書を作成・管理します（推奨）

対話で「Apple ID でログイン」「証明書は自動管理」を選べば、その後のビルドは同じ設定を再利用できます。

### 3.4 ビルドと TestFlight への自動提出

```bash
cd c:\Users\kanet\Downloads\stock
eas build --platform ios --profile production --auto-submit
```

- `--platform ios`: iOS のみビルド
- `--profile production`: `eas.json` の `production` を使用（Store 配布・ビルド番号自動増分）
- `--auto-submit`: ビルド成功後に App Store Connect へ提出（TestFlight に反映）

初回で `submit.production` を未設定の場合は、提出時に Apple ID や App の選択を聞かれるので、画面の指示に従って入力してください。

### 3.5 提出のみ行う場合（ビルドは既にあるとき）

```bash
eas submit --platform ios --profile production --latest
```

`--latest`: 直近の production ビルドを提出します。

---

## 4. コマンド一覧（流れだけ）

```bash
# 初回
npm install -g eas-cli
eas login
cd c:\Users\kanet\Downloads\stock
eas build:configure

# ビルド + TestFlight 自動提出
eas build --platform ios --profile production --auto-submit
```

---

## 5. 注意事項

- **バックグラウンドフェッチ**: `app.json` の `UIBackgroundModes: ["fetch"]` は維持されています。EAS ビルドでも有効です。
- **ビルド番号**: `eas.json` の `production` に `autoIncrement: true` を入れているため、同じ `version` でもビルド番号が自動で上がり、TestFlight に重複せず提出できます。
- **Bundle ID**: 変更する場合は `app.json` の `ios.bundleIdentifier` と `infoPlist.BGTaskSchedulerPermittedIdentifiers` を合わせて変更してください。
