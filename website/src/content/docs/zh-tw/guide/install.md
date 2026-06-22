---
title: インストール
description: Crateforge のダウンロード・初回起動・アプリ内自動アップデート・ショートカット作成について。
---

> 🚧 翻訳準備中 / Translation in progress / 翻譯準備中

Crateforge は Windows / macOS / Linux に対応しています。最新版は GitHub の
[Releases](https://github.com/tainakanchu/crateforge/releases/latest) から入手できます。

> 画像は後日追加

## ダウンロードと配布形態

| OS | 配布形態 | 備考 |
|---|---|---|
| **Windows** | 単体 `.exe` / ポータブル `.zip` / `.msi` / セットアップ `.exe` | アプリ内の自動更新に対応 |
| **macOS** | `.dmg`（Apple Silicon / Intel の各ネイティブ版） | **未署名**。初回は Gatekeeper の回避が必要 |
| **Linux** | `.AppImage`（単一ファイル） / `.deb` | |

### Windows

- **インストーラ版（セットアップ `.exe` / `.msi`）** — 通常のインストール。
  インストーラからの **デスクトップショートカット作成は既定でオフ** です（必要ならインストール時に有効化してください）。
- **ポータブル版（`.zip`）** — 解凍して `crateforge.exe` を起動するだけ。インストール不要です。

いずれの版でも、アプリ内アップデートは **exe をその場で差し替えて再起動するだけ** なので高速で、
SmartScreen の警告も出ません（v0.6.3 以降）。

### macOS

未署名のため、初回起動時に Gatekeeper の警告が出ます。次のいずれかで回避してください。

- Finder で `.app` を **右クリック → 「開く」**
- もしくはターミナルで `xattr -cr /Applications/Crateforge.app`

### Linux

- `.AppImage` は実行権限を付けて起動します（`chmod +x ./Crateforge*.AppImage && ./Crateforge*.AppImage`）。
- `.deb` はパッケージマネージャでインストールします。

## 初回起動

1. アプリを起動すると空のライブラリが開きます。
2. 既存の `iTunes Library.xml` を持っている場合はツールバーの **「📥 Import XML」** で取り込みます（[ライブラリ取り込み](../import/)）。
3. XML を持っていない場合は **「🎵 Add Files」** で手元の音楽ファイルを直接取り込めます。

ライブラリの真実は SQLite (WAL) に常駐するため、初回取り込み後は次回以降すぐに開けます。

## アプリ内の自動アップデート

新しい GitHub Release が公開されると、ウィンドウ上部に **非ブロッキングなバナー** で通知されます。
リリースノートは折りたたみ表示で確認できます（日本語化済み）。

更新の適用には次の選択肢があります。

- **今すぐ更新** — ダウンロードしてその場で適用・再起動します。
- **閉じるときに更新** — いまは使い続け、**ウィンドウを閉じるタイミングで自動的に適用** します（起動時に作業を中断されません）。

:::caution
アプリ内の自動更新は **Windows 専用** です。macOS / Linux は [Releases](https://github.com/tainakanchu/crateforge/releases/latest) から
手動でダウンロードして入れ替えてください。
:::

## ショートカット（デスクトップ）

Windows のインストーラはデスクトップショートカットを **既定で作成しません**。
必要な場合はインストール時のオプションで有効化してください。
