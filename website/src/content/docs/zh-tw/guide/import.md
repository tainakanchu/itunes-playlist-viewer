---
title: 音樂庫匯入
description: iTunes / Music 的 Library.xml 匯入、資料夾與檔案匯入、iTunes 相容 XML 的自動匯出。
---

要將音樂庫匯入 Crateforge，可從 **iTunes / Music 的 `Library.xml`** 或 **手邊的音樂檔案** 任一方式進行。

> 截圖稍後補上

## 匯入 iTunes / Music 的 Library.xml

從工具列的 **「📥 Import XML」** 選取 `iTunes Library.xml`（Apple plist 格式）。

- 採用串流 SAX 剖析器讀取，即使是大型音樂庫也很快。
- 匯入透過串流解析進行，重現曲目、播放清單、**資料夾階層**（Persistent ID / Parent Persistent ID）。
- 匯入會以 **整個音樂庫的取代** 方式進行（尚不支援對既有 XML 的差異合併）。

:::note
智慧型播放清單的判定條件（`Smart Info`）在讀取與匯出時 **皆不會保留**。
匯入的智慧型播放清單可用 Crateforge 的[智慧型播放清單](../smart-playlists/)功能重新建立。
:::

### Library.xml 的位置

- **macOS** — 在「音樂」應用程式的偏好設定中啟用「共享 XML」即可匯出（舊版 iTunes 為 `~/Music/iTunes/iTunes Library.xml`）。
- **Windows** — 通常位於 `%USERPROFILE%\Music\iTunes\iTunes Library.xml`。

## 匯入音樂檔案

從工具列的 **「🎵 Add Files」**，可直接匯入手邊的音樂檔案（可多選）。

- 支援格式：**FLAC / MP3 / M4A / WAV / Ogg / Opus / AIFF** 等。
- 以 `lofty` 讀取標籤（標題 / 演出者 / 專輯 / 類型 / 年份 等）。
- 匯入時也會讀取 **BPM 標籤**（TBPM / tmpo / Vorbis BPM）。

### 整理目標資料夾（音樂庫根目錄）（自動整理）

在設定中指定「整理目標（音樂庫根目錄）」後，匯入與編輯時會將檔案以 iTunes 慣例的命名方式
放置到 `<整理目標>/<專輯演出者>/<專輯>/`。

使用設定中的 **「自動偵測」**，可從既有曲目的路徑推測並設定整理目標。

## 匯出 iTunes 相容 XML

從工具列的 **「📤 Export XML」**，可匯出 `iTunes Library.xml`（Apple plist 格式）。
可交給 rekordbox / Serato / Traktor 等能讀取 iTunes XML 的 DJ 軟體。

匯出的 XML 包含以下內容。

- `Major/Minor Version` / `Date` / `Application Version` / `Library Persistent ID` 標頭
- `Tracks` 字典（Track ID 鍵，所有欄位）
- `Playlists` 陣列（依 Persistent ID / Parent Persistent ID 的資料夾階層，以 `Playlist Items` 參照 trackId）
- 字串會將 `&` `<` `>` 以數值字元參照跳脫，檔案路徑則 percent-encode 為 `file://` URL

### 自動匯出

將工具列的 **🕐 切換鈕** 開啟後，會在 **僅在有變更時、約每 30 分鐘一次＋結束時** 自動匯出
Library XML。想要隨時把最新的音樂庫交給 DJ 軟體時很方便。

## 從 CD 匯入（擷取）

從工具列的 **「💿 Rip CD」**，可匯入實體 CD（以 MusicBrainz 取得曲目資訊、以 Cover Art Archive 自動取得封面）。

1. 輸入 **Drive** 並按「🔍 Detect Disc」（預設為 Linux：`/dev/cdrom`、macOS：`disk1`、Windows：`D:`。Linux 也可直接輸入 `/dev/sr0` 等）
2. 讀取 TOC 後，自動顯示 MusicBrainz 的候選專輯
3. 視需要重新選擇發行版本，並選取曲目
4. 指定 **Format**（FLAC / ALAC / MP3 / WAV）與 **Output** 資料夾後按「▶ Start Ripping」
5. 完成後自動加入音樂庫（選項開啟時）

:::caution
WSL2 無法直接看到實體 CD，因此需用 `usbipd-win` 將光碟機 attach 到 WSL2。
Windows 組建未隨附 `discid`（libdiscid），但會使用 OS 的 IOCTL 直接讀取 TOC、並在應用程式端算出 MusicBrainz Disc ID，因此「Detect Disc」在 Windows 上也能運作（手動輸入 TOC 為備援方式）。
:::
