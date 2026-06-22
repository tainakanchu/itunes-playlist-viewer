---
title: 播放、佇列、Crate
description: 本機播放、Up Next 佇列、DJ 選曲用的 Crate、Now Playing 的 BPM / Key / Energy 顯示。
---

Crateforge 支援本機播放（rodio + symphonia），可直接解碼各種格式。
在右側欄的 **Now Playing / Up Next / Crate** 組建播放與選曲。

> 截圖稍後補上

## 進行播放

- **雙擊** 曲目即可播放。
- `Space` 為 **播放 / 暫停**，`Enter` 播放焦點/選取列。
- `J` / `K` 為上一首 / 下一首，`Shift + ←` / `Shift + →` 為 5 秒搜尋。
- `S` 為隨機播放，`R` 為重複播放（關閉 / 全部 / 單曲）。`Ctrl + ↑` / `Ctrl + ↓` 為音量。

在播放器列中，可拖曳搜尋列進行 scrub，點選時間顯示可切換「已經過 ⇄ 剩餘」，
音量列有滑塊與 % 顯示。波形以解析峰值的實際波形繪製。

曲目的自動接續由 **Rust 端的工作執行緒** 驅動。即使將視窗最小化播放仍會持續，
若找不到下一首的檔案，會自動跳過並繼續播放。
播放失敗的曲目會以 toast 通知，並將失敗內容（檔案不存在 / 解碼失敗 / 解碼器當機）
記錄到 `crateforge.log`。

### ReplayGain

可在設定中切換 ReplayGain（逐曲音量正規化，以 −18 LUFS 為基準）。

## Up Next（播放佇列）

右側欄的 **Up Next** 即接下來會播放的佇列。

- 透過內容選單的 **「Play Next（接著播放）」**，可將選取的曲目（可多選、保持選取順序）
  插入正在播放曲目的緊接之後。
- 用列懸停時出現的 **「×」** 可從佇列移除，**拖放** 可重新排序。
- 標頭會顯示 **件數、總時間、隨機播放徽章**。
- 隨機播放會事先計算實際的播放順序（Fisher–Yates），因此 Up Next 會反映接下來實際播放的順序。

## Crate（DJ 選曲）

右側欄的 **Crate** 是用來組建選曲初稿的暫存區。

- 把曲目逐一加入 Crate，湊齊後可 **「儲存為播放清單」**。
- 以 **smooth（平滑排序）** 按鈕，可根據解析值以貪婪最近鄰自動排序成順暢的流動。
- Crate 不會被保存（儲存為播放清單後才會留存）。

:::tip
預期的流程是：用[相似度選曲](../dj-analysis/)（Similar 分頁）或 [AI 選曲](../api-server/)（dj-curator）蒐集候選，
在 Crate 做成初稿，最終的曲序再用 GUI 細修。
:::

## Now Playing（BPM / Key / Energy）

右側欄的 **Now Playing** 會與正在播放曲目的封面圖一起顯示 **Key / Energy**。
BPM、Key (Camelot)、Energy 會在已[解析](../dj-analysis/)的曲目上顯示，可用於判斷銜接。

在 **Similar** 分頁中，會針對正在播放（或右鍵 →「Find similar」）的曲目，
提示 Camelot 鍵相容 + 節奏相近的「下一手」（可用 Harmonic 切換鈕篩選）。
結果可加入 Crate（或雙擊播放）。若全部都已加入，「Add all」會被停用（"All added"）。
