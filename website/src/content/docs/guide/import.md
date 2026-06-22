---
title: ライブラリ取り込み
description: iTunes / Music の Library.xml 取り込み、フォルダ・ファイル取り込み、iTunes 互換 XML の自動エクスポート。
---

Crateforge へのライブラリ取り込みは、**iTunes / Music の `Library.xml`** か、**手元の音楽ファイル** のどちらからでも行えます。

> 画像は後日追加

## iTunes / Music の Library.xml を取り込む

ツールバーの **「📥 Import XML」** から `iTunes Library.xml`（Apple plist 形式）を選びます。

- ストリーミング SAX パーサで読み込むため、大きなライブラリでも高速です。
- 取り込みはストリーミング解析で、トラック・プレイリスト・**フォルダ階層**（Persistent ID / Parent Persistent ID）を再現します。
- 取り込みは **ライブラリ全体の置換** として行われます（既存 XML への差分マージは未対応）。

:::note
スマートプレイリストの判定条件（`Smart Info`）は読み込み・書き出しともに **保持しません**。
取り込んだスマートプレイリストは、Crateforge の[スマートプレイリスト](../smart-playlists/)機能で作り直せます。
:::

### Library.xml の場所

- **macOS** — 「ミュージック」アプリの環境設定で「XML を共有」を有効化すると書き出されます（古い iTunes では `~/Music/iTunes/iTunes Library.xml`）。
- **Windows** — 通常は `%USERPROFILE%\Music\iTunes\iTunes Library.xml`。

## 音楽ファイルを取り込む

ツールバーの **「🎵 Add Files」** で、手元の音楽ファイルを直接取り込めます（複数選択可）。

- 対応形式: **FLAC / MP3 / M4A / WAV / Ogg / Opus / AIFF** など。
- タグ（タイトル / アーティスト / アルバム / ジャンル / 年 / カバーアートなど）を `lofty` で読み取ります。
- 取り込み時に **BPM タグ**（TBPM / tmpo / Vorbis BPM）も読み取ります。

### 整理先フォルダ（自動整理）

設定で「整理先（ライブラリルート）」を指定すると、取り込み・編集時にファイルを
`<整理先>/<アルバムアーティスト>/<アルバム>/` へ iTunes 準拠のリネームで配置します。

設定の **「自動検出」** を使うと、既存の曲のパスから整理先を推定して設定できます。

## iTunes 互換 XML を書き出す

ツールバーの **「📤 Export XML」** で `iTunes Library.xml`（Apple plist 形式）を書き出せます。
rekordbox / Serato / Traktor など、iTunes XML を読み取る DJ ソフトに渡せます。

書き出される XML には次が含まれます。

- `Major/Minor Version` / `Date` / `Application Version` / `Library Persistent ID` ヘッダ
- `Tracks` 辞書（Track ID キー、全フィールド）
- `Playlists` 配列（Persistent ID / Parent Persistent ID によるフォルダ階層、`Playlist Items` で trackId 参照）
- 文字列は `&` `<` `>` を数値文字参照でエスケープ、ファイルパスは `file://` URL に percent-encode

### 自動エクスポート

ツールバーの **🕐 トグル** を ON にすると、**変更があったときだけ・約 30 分間隔＋終了時** に
Library XML を自動で書き出します。DJ ソフト側に最新のライブラリを常に渡しておきたいときに便利です。

## CD から取り込む（リッピング）

ツールバーの **「💿 Rip CD」** から、物理 CD を取り込めます（MusicBrainz で曲情報、Cover Art Archive でジャケットを自動取得）。

1. **Drive** を入力して「🔍 Detect Disc」（Linux: `/dev/cdrom` / `/dev/sr0`、macOS: `disk1`、Windows: `D:`）
2. TOC が読まれ、自動的に MusicBrainz の候補アルバムを表示
3. 必要に応じてリリースを選び直し、トラックを選択
4. **Format**（FLAC / ALAC / MP3 / WAV）と **Output** フォルダを指定して「▶ Start Ripping」
5. 完了後は自動的にライブラリに追加（オプション ON 時）

:::caution
WSL2 では物理 CD が直接見えないため、`usbipd-win` でドライブを WSL2 に attach する必要があります。
Windows ビルドでは `discid` を外しているため TOC 自動取得は無効です（TOC 手動入力で MusicBrainz 検索は可能）。
:::
