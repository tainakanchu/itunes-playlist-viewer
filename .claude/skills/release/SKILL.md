---
name: release
description: Crateforge をリリースする(desktop / mobile / TV のいずれか)。前回リリースからの差分を解析し、desktop は version 4ファイル同期+ja/en CHANGELOG+ライセンス再生成+docsチェック→chore(release)コミット→タグ push で release.yml を起動。mobile/TV(Expo)は fingerprint で OTA(eas update)かネイティブビルド(eas build)かを判定して実行。「リリースして」「desktop/mobile/TV を出して」「vX.Y.Z を出して」等で使う。
---

# release スキル — Crateforge リリース手順

## 共通ガードレール

- Rust/Tauri ビルドは必ず `nix develop -c <cmd>` で実行する。`| tail` や `; echo` は exit code を隠すので使わない。
- 着手前に `git fetch origin main` でリモート main の先行コミットを取り込む(並行セッションで main が先行しがち)。
- リリース対象ファイル(version/CHANGELOG 等)の編集はサブエージェント経由で行う。実行者 Claude は読み取り・検証・git・判断に集中する。
- **許可ゲート一覧** — 以下は必ずユーザーに明示確認してから実行する:
  - コミット前
  - main へのプッシュ前
  - タグプッシュ前
  - `eas update`(特に production ブランチ)前
  - `eas build` 前
- リリースコミットは **main へ直コミット**(PR 経由でない)。

---

## Section 0: 概要 / 対象判定

Crateforge monorepo には以下の 3 対象が存在し、それぞれ独立してリリースできる。

| 対象 | バージョン管理 | CI/CD |
|---|---|---|
| Desktop (Tauri) | `package.json` / `tauri.conf.json` / `Cargo.toml` | タグ push → `release.yml` |
| Mobile (Expo) | `clients/apps/mobile/app.config.ts` | EAS (OTA or ネイティブビルド) |
| TV (Expo) | `clients/apps/tv/app.config.ts` | EAS (OTA or ネイティブビルド) |

### 起動時の処理

1. 引数(`desktop` / `mobile` / `tv` / `vX.Y.Z`)があればそれに従う。
2. 引数がなければ `git fetch origin main` 後、前回リリース以降の変更パスを解析して提示し、ユーザーに選ばせる。

```bash
# 前回タグ取得
LAST=$(git describe --tags --abbrev=0)
# 変更パス確認
git diff --stat ${LAST}..origin/main
```

変更パスの判定基準:

| 変化したパス | 対象 |
|---|---|
| `src/`, `src-tauri/`, ルート設定(`package.json`, `tauri.conf.json`, `CHANGELOG.md` 等) | Desktop |
| `clients/apps/mobile/`(+共有 `clients/packages/`) | Mobile |
| `clients/apps/tv/`(+共有 `clients/packages/`) | TV |

---

## Section A: Desktop (Tauri) リリース

### A0 Preflight

```bash
# main ブランチか確認
git branch --show-current          # main であること

# 作業ツリー clean 確認
git status --short                 # 何も出ないこと

# リモート main 取得 + fast-forward 確認
git fetch origin main
git log HEAD..origin/main --oneline  # 差分がある場合は pull/rebase してから進む

# 直近の CI が緑か確認
gh run list --branch main --limit 5

# 前タグ取得
LAST=$(git describe --tags --abbrev=0)
echo "前回タグ: ${LAST}"
```

### A1 差分解析 → 次版提案

```bash
# マージ済みコミット一覧
git log ${LAST}..origin/main --oneline

# 前タグ日時以降のマージ済み PR 一覧
gh pr list --base main --state merged --limit 50
```

セマンティックバージョニング判定(0.x 系):

| コミット種別 | バージョン変化 |
|---|---|
| `feat:` / `feat(…):` | minor (0.x.0) |
| `fix:` / その他 | patch (0.x.y) |
| `BREAKING CHANGE` / `!:` | major(0.x 系は実質 minor 扱いで要相談) |

判定結果を**提案**し、ユーザーが確認または上書きする。

### A2 installer 要否判定

前タグ以降の diff で、exe 外部に影響する変更を確認する:

```bash
git diff ${LAST}..origin/main -- \
  src-tauri/tauri.conf.json \
  src-tauri/capabilities/ \
  src-tauri/icons/
```

| 変化した項目 | 判定 |
|---|---|
| `tauri.conf.json` の `bundle` セクション(targets/resources/externalBin/icon/identifier/NSIS/MSI/WiX/fileAssociations 等) | installer 必要 |
| `src-tauri/capabilities/` の変更 | installer 必要 |
| 新規 sidecar/resources の同梱、アイコン変更 | installer 必要 |
| JS/Rust ロジックのみ変更 | exe 差し替えで足りる |

- 変化あり → CHANGELOG 該当節に `<!-- [installer-required] -->` を追加(`body_requires_installer()` が部分一致検出)
- 変化なし → マーカー不要
- **判定根拠(変わったファイル)を提示し、最終は人間が確認/上書き**

### A3 CHANGELOG 生成

**コミットのオウム返しではなく、ユーザー向けに実現したことを記述する。**

- 入力: マージ済み PR タイトル/番号 + 必要なら実 diff
- 除外: `refactor` / `chore` / `test` / `ci` / `deps` 等の内部変更。PR またいで重複は統合。
- 構成: サーフェス別(Desktop/Mobile/TV/API/Docs 等)に整理
- **日本語(canonical)+English の 2 ブロック併記**、PR 番号付き(`(#NN)`)。CHANGELOG.md 冒頭の方針文(各バージョンは日本語と English の 2 ブロックを併記)に倣う
- mobile/TV のエントリは B1(OTA か ネイティブビルドか)の判定結果に応じてカテゴリを選ぶ(OTA → `モバイル（OTA 配信）`、ネイティブビルド → `モバイル・TV（フルビルド）`)。
- `## [Unreleased]` は空のまま残す
- 日付は `date +%F` で取得

CHANGELOG.md 構造例:

```markdown
## [Unreleased]

## [v0.10.0] - 2026-06-29

### 日本語

#### デスクトップ
- … (#NN)

#### モバイル（OTA 配信）
- … (#NN)

#### モバイル・TV（フルビルド）
- … (#NN)

#### TV（フルビルド）
- … (#NN)

### English

#### Desktop
- … (#NN)

#### Mobile (OTA)
- … (#NN)

#### Mobile / TV (full build)
- … (#NN)

#### TV (full build)
- … (#NN)
```

### A4 version bump

以下 4 ファイルを新バージョンに更新する(編集はサブエージェント経由):

| ファイル | 対象フィールド |
|---|---|
| `package.json` | `"version"` |
| `src-tauri/tauri.conf.json` | `"version"` |
| `src-tauri/Cargo.toml` | `[package] version` |
| `src-tauri/Cargo.lock` | cargo update で追従 |

```bash
# Cargo.lock 追従
nix develop -c cargo update -p crateforge

# 4 ファイルの version 一致を検証
grep -E '"version"' package.json src-tauri/tauri.conf.json
grep -E '^version' src-tauri/Cargo.toml
grep -A1 'name = "crateforge"' src-tauri/Cargo.lock | grep version
```

### A5 ライセンス再生成 + docs チェック

```bash
# ライセンス再生成(配布前必須)
nix develop -c node scripts/gen-licenses.mjs
# → src/generated/third-party-licenses.json が更新される

# docs チェック(緑必須)
pnpm check:docs
```

- `pnpm check:docs` が失敗した場合は修正または差し戻してから進む。
- `website/MAINTAINING.md` の人間チェックリストを今回変わった機能領域付きで提示し、確認を促す。

### A6 軽量検証

```bash
nix develop -c pnpm typecheck   # 型チェック
nix develop -c pnpm build       # フロントビルド
nix develop -c cargo test       # Rust テスト
```

フル OS ビルドはタグ後の `release.yml` に委ねる(ローカルでフルビルドはしない)。

### A7 コミット (許可ゲート)

ステージするファイル:

```
CHANGELOG.md
package.json
src-tauri/Cargo.toml
src-tauri/Cargo.lock
src-tauri/tauri.conf.json
src/generated/third-party-licenses.json
```

コミットメッセージ: `chore(release): vX.Y.Z`

**ユーザーの確認を得てから**コミット。push 前に `git fetch` で fast-forward を確認し、main へ直 push。

```bash
git add CHANGELOG.md package.json src-tauri/Cargo.toml src-tauri/Cargo.lock \
        src-tauri/tauri.conf.json src/generated/third-party-licenses.json
# (ユーザー確認後)
git commit -m "chore(release): vX.Y.Z"
git fetch origin main
git push origin main
```

### A8 タグ → release.yml 起動 + 監視 (高リスク許可ゲート)

**ユーザーの最終 GO を得てから**実行:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

監視:

```bash
gh run list --limit 10
gh run watch <run-id>
```

- Windows ビルド成功 = in-app updater の前提。
- 全ビルド成功後、GitHub Release URL とアセット一覧を報告する。

### 撤回手順(ビルド失敗時)

```bash
# タグ削除
git push --delete origin vX.Y.Z
git tag -d vX.Y.Z

# Release が作られていれば削除
gh release delete vX.Y.Z

# 修正後、再タグ
git tag vX.Y.Z
git push origin vX.Y.Z
```

---

## Section B: Mobile / TV (Expo) リリース

### B0 対象選択

- mobile か tv か(両方なら順に)を確認。作業ディレクトリ: `clients/apps/<app>`
- ログイン確認:

```bash
eas whoami
```

未ログインの場合、Claude は対話ログインを代行できない。**ユーザーに `eas login` を実行するよう促す。**

### B1 OTA か ネイティブビルドか の判定 (核心)

#### 権威的判定(fingerprint)

```bash
cd clients/apps/<app>
# fingerprint 比較(正確なフラグは実行時 --help で確認)
npx expo fingerprint --help
# または
eas fingerprint:compare --help
```

- 一致 → OTA 可(B2-OTA へ)
- 不一致 → ネイティブビルド必須(B2-BUILD へ)

#### 高速ヒューリスティック(事前参考)

前リリース以降に以下のパスが変化していれば **ネイティブビルド濃厚**:

| パス | 理由 |
|---|---|
| `clients/apps/<app>/app.config.ts` の `plugins` 配列 / permissions | ネイティブ設定変更 |
| `clients/apps/<app>/package.json` の expo / react-native / config plugin 系の増減・バージョン | ネイティブ依存変更 |
| `clients/packages/expo-crateforge-mdns/ios/*.swift` / `android/**` / `build.gradle` | 自前ネイティブモジュール変更 |
| `clients/apps/tv/app.plugin.js`(TV のみ) | TV マニフェスト変更 |
| `eas.json` の profile/distribution 変更 | ビルド設定変更 |

いずれも変化なし → OTA 候補(最終は fingerprint で確定)。

**判定根拠を提示し、人間が確認/上書き。**

### B2-OTA: eas update

```bash
cd clients/apps/<app>

# channel を選択: preview / production
# mobile のみ scripts 経由も可
pnpm ota:preview   # preview
pnpm ota:prod      # production (mobile のみ)

# または直接
eas update --branch <channel> --message "<簡潔なリリースノート>"
```

- **production は本番ユーザーへ即配信なので許可ゲート必須。**
- 配信後、Expo の update URL/結果を報告。

### B2-BUILD: eas build

```bash
cd clients/apps/<app>

# profile: preview(internal apk/QR配布) / production(app-bundle)
# mobile のみ scripts 経由も可
pnpm build:android          # preview (mobile)
pnpm build:android:prod     # production (mobile のみ)

# または直接
eas build --platform android --profile <profile>
```

- `version`(`0.1.0` 等)を上げるか確認(versionCode は `autoIncrement` で EAS 管理)。
- **許可ゲート必須。**
- 完了後、internal distribution の QR/URL を報告。
- 新ランタイムに対して OTA を続けて配るか案内。

> **TV は現状 `ota:preview` / preview のみ実装。`ota:prod` / `build:android:prod` スクリプト未整備。**

### B3 検証(eas 実行前)

```bash
cd clients/apps/<app>

# 型チェック
pnpm typecheck

# テスト(jest-expo がある場合)
pnpm test
```

---

## Section C: 早見表 & 注意 (混同禁止)

| 概念 | 対象 | 判定軸 | 実行コマンド |
|---|---|---|---|
| Expo OTA update | mobile / TV | fingerprint 一致(JS/アセットのみ変更) | `eas update --branch <channel>` |
| Expo ネイティブビルド | mobile / TV | fingerprint 変化(native 変更あり) | `eas build --platform android --profile <profile>` |
| desktop installer 要否 | Desktop(Windows) | exe 外部の bundle/capabilities 等の変更 | CHANGELOG に `<!-- [installer-required] -->` マーカー |

### 注意事項

- **「OTA」は Expo の `eas update` だけを指す。desktop の exe 自己差し替えを OTA と呼ばない。**
- mobile/TV は desktop と別バージョン・別 EAS プロジェクト・別 channel。
- TV は production スクリプト未整備(`ota:prod` / `build:android:prod` なし)。
- iOS は mobile のみ(TV は Android TV / Fire TV のみ)。
- Expo の対話ログイン(`eas login`)や 2FA は Claude が代行できない → ユーザーに直接 `eas login` を促す。
