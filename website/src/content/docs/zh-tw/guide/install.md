---
title: 安裝
description: 關於 Crateforge 的下載、首次啟動、應用程式內自動更新與捷徑建立。
---

Crateforge 支援 Windows / macOS / Linux。最新版可從 GitHub 的
[Releases](https://github.com/tainakanchu/crateforge/releases/latest) 取得。

> 截圖稍後補上

## 下載與發佈形式

| OS | 發佈形式 | 備註 |
|---|---|---|
| **Windows** | 單一 `.exe` / 可攜式 `.zip` / `.msi` / 安裝程式 `.exe` | 支援應用程式內自動更新 |
| **macOS** | `.dmg`（Apple Silicon 原生） | **未簽署**。首次需繞過 Gatekeeper |
| **Linux** | `.AppImage`（單一檔案） / `.deb` | |

### Windows

- **安裝版（安裝程式 `.exe` / `.msi`）** — 一般安裝方式。
  從安裝程式 **建立桌面捷徑的選項預設為關閉**（如有需要，請於安裝時啟用）。
- **可攜版（`.zip`）** — 解壓縮後直接執行 `crateforge.exe` 即可，無需安裝。

無論哪一種版本，應用程式內更新都 **只需就地替換 exe 並重新啟動**，所以速度很快，
也不會跳出 SmartScreen 警告（v0.6.3 起）。

### macOS

由於未簽署，首次啟動時會出現 Gatekeeper 警告。請以下列任一方式繞過。

- 在 Finder 中 **右鍵點選 `.app` →「開啟」**
- 或在終端機執行 `xattr -cr /Applications/Crateforge.app`

### Linux

- `.AppImage` 需賦予執行權限後啟動（`chmod +x ./Crateforge*.AppImage && ./Crateforge*.AppImage`）。
- `.deb` 以套件管理員安裝。

## 首次啟動

1. 啟動應用程式後會開啟一個空的音樂庫。
2. 若你已有既有的 `iTunes Library.xml`，請用工具列的 **「📥 Import XML」** 匯入（[音樂庫匯入](../import/)）。
3. 若沒有 XML，也可用 **「🎵 Add Files」** 直接匯入手邊的音樂檔案。

由於音樂庫的真實資料常駐於 SQLite (WAL)，首次匯入後，往後再開啟都會很快。

## 應用程式內自動更新

當有新的 GitHub Release 發佈時，會在視窗上方以 **非阻斷式橫幅** 通知你。
發行說明（日英對照）可用摺疊方式檢視。

套用更新時有以下選擇。

- **立即更新** — 下載後就地套用並重新啟動。
- **關閉時更新** — 現在繼續使用，並 **在關閉視窗時自動套用**（啟動時不會中斷你的工作）。

:::caution
應用程式內的自動更新 **僅限 Windows**。macOS / Linux 請從 [Releases](https://github.com/tainakanchu/crateforge/releases/latest)
手動下載並替換。
:::

## 捷徑（桌面）

Windows 的安裝程式 **預設不會建立桌面捷徑**。
如有需要，請於安裝時的選項中啟用。
