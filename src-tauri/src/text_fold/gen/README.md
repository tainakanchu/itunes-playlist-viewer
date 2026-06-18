# 漢字字体フォールド表の生成

`../han_table.txt`（繁体字 / 日本語新字体 → 簡体字代表字の畳み込み表）を生成するための
スクリプトと元データ。`text_fold` モジュールが `include_str!` で読み込む。

## 再生成

```
node generate_han_table.mjs
```

`./TSCharacters.txt` と `./JPShinjitaiCharacters.txt` を読み、`../han_table.txt` を出力する。

## 元データの更新（任意）

OpenCC の最新辞書に追随したい場合のみ:

```
curl -sSL -o TSCharacters.txt          https://raw.githubusercontent.com/BYVoid/OpenCC/master/data/dictionary/TSCharacters.txt
curl -sSL -o JPShinjitaiCharacters.txt https://raw.githubusercontent.com/BYVoid/OpenCC/master/data/dictionary/JPShinjitaiCharacters.txt
node generate_han_table.mjs
```

## ライセンス / 帰属

`TSCharacters.txt` / `JPShinjitaiCharacters.txt` は
[OpenCC](https://github.com/BYVoid/OpenCC)（Apache-2.0）の辞書データ。
`han_table.txt` はこれらから派生した生成物。各ファイル先頭の OpenCC ヘッダ（ライセンス表記）を保持している。

## 方針メモ

- canonical = **簡体字の単一代表字**。`新字体→繁→簡` を不動点まで反復して全字体を1つに畳む。
- **過剰マッチ許容（再現率優先）**: 1 対多の簡略化（例: 乾/幹/干 → 干）で多少広く一致するのは許容。
- 字単位変換のため、句単位の文脈依存変換（OpenCC 本来の挙動）は行わない（検索用途では許容）。
