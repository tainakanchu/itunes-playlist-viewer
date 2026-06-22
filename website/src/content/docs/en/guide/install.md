---
title: Installation
description: Downloading Crateforge, first launch, in-app auto-update, and creating shortcuts.
---

Crateforge supports Windows / macOS / Linux. The latest version is available from
[Releases](https://github.com/tainakanchu/crateforge/releases/latest) on GitHub.

> Screenshots to be added

## Download and distribution formats

| OS | Distribution format | Notes |
|---|---|---|
| **Windows** | standalone `.exe` / portable `.zip` / `.msi` / setup `.exe` | Supports in-app auto-update |
| **macOS** | `.dmg` (Apple Silicon native) | **Unsigned**. The first launch requires bypassing Gatekeeper |
| **Linux** | `.AppImage` (single file) / `.deb` | |

### Windows

- **Installer (setup `.exe` / `.msi`)** — a standard installation.
  Creating a **desktop shortcut from the installer is off by default** (enable it during installation if you want one).
- **Portable (`.zip`)** — just unzip and launch `crateforge.exe`. No installation required.

With either version, in-app updates simply **swap the exe in place and restart**, so they are fast and
do not trigger SmartScreen warnings (v0.6.3 and later).

### macOS

Because it is unsigned, Gatekeeper shows a warning on first launch. Bypass it in one of the following ways.

- In Finder, **right-click** the `.app` and choose **"Open"**
- Or, in a terminal, run `xattr -cr /Applications/Crateforge.app`

### Linux

- For `.AppImage`, make it executable and launch it (`chmod +x ./Crateforge*.AppImage && ./Crateforge*.AppImage`).
- Install `.deb` with your package manager.

## First launch

1. Launching the app opens an empty library.
2. If you already have an `iTunes Library.xml`, import it with **"📥 Import XML"** in the toolbar ([Library import](../import/)).
3. If you don't have an XML, you can import your own music files directly with **"🎵 Add Files"**.

The source of truth for the library lives in SQLite (WAL), so after the first import it opens instantly every time after that.

## In-app auto-update

When a new GitHub Release is published, you are notified by a **non-blocking banner** at the top of the window.
The release notes (bilingual, Japanese + English) can be reviewed in a collapsible view.

You have the following options for applying an update.

- **Update now** — download and apply it on the spot, then restart.
- **Update when closing** — keep using the current version, and **apply automatically when you close the window** (so your work isn't interrupted at startup).

:::caution
In-app auto-update is **Windows-only**. For macOS / Linux, download the latest version manually from
[Releases](https://github.com/tainakanchu/crateforge/releases/latest) and replace it.
:::

## Shortcuts (desktop)

The Windows installer **does not create a desktop shortcut by default**.
If you want one, enable the option during installation.
