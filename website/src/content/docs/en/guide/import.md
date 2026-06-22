---
title: Library import
description: Importing iTunes / Music Library.xml, importing folders and files, and auto-exporting iTunes-compatible XML.
---

You can import a library into Crateforge from either the **iTunes / Music `Library.xml`** or your **own music files**.

> Screenshots to be added

## Importing the iTunes / Music Library.xml

From **"📥 Import XML"** in the toolbar, select an `iTunes Library.xml` (Apple plist format).

- It is read with a streaming SAX parser, so even large libraries import fast.
- The import uses streaming parsing and reproduces tracks, playlists, and the **folder hierarchy** (Persistent ID / Parent Persistent ID).
- The import is performed as a **full replacement of the library** (merging diffs into an existing XML is not supported).

:::note
Smart Playlist criteria (`Smart Info`) are **not preserved** on either import or export.
You can recreate imported Smart Playlists with Crateforge's [Smart Playlist](../smart-playlists/) feature.
:::

### Where the Library.xml is

- **macOS** — Enabling "Share XML" in the Music app's preferences exports it (on older iTunes, `~/Music/iTunes/iTunes Library.xml`).
- **Windows** — Usually `%USERPROFILE%\Music\iTunes\iTunes Library.xml`.

## Importing music files

With **"🎵 Add Files"** in the toolbar, you can import your own music files directly (multiple selection supported).

- Supported formats: **FLAC / MP3 / M4A / WAV / Ogg / Opus / AIFF** and more.
- Tags (title / artist / album / genre / year, etc.) are read with `lofty`.
- The **BPM tag** (TBPM / tmpo / Vorbis BPM) is also read on import.

### Organize folder (auto-organize)

If you set an "organize folder (library root)" in settings, files are placed under
`<organize folder>/<album artist>/<album>/` with iTunes-style renaming on import and edit.

Using **"Auto-detect"** in settings infers the organize folder from the paths of existing tracks and sets it.

## Exporting iTunes-compatible XML

With **"📤 Export XML"** in the toolbar, you can export an `iTunes Library.xml` (Apple plist format).
You can hand it to DJ software that reads iTunes XML, such as rekordbox / Serato / Traktor.

The exported XML includes the following.

- `Major/Minor Version` / `Date` / `Application Version` / `Library Persistent ID` headers
- A `Tracks` dictionary (Track ID keys, all fields)
- A `Playlists` array (folder hierarchy via Persistent ID / Parent Persistent ID, with `Playlist Items` referencing trackId)
- Strings escape `&` `<` `>` as numeric character references, and file paths are percent-encoded into `file://` URLs

### Auto-export

Turning on the **🕐 toggle** in the toolbar automatically exports the Library XML **only when there have been changes, roughly every 30 minutes plus on exit**.
This is handy when you always want to keep your DJ software fed with the latest library.

## Importing from a CD (ripping)

From **"💿 Rip CD"** in the toolbar, you can import a physical CD (track info is fetched automatically from MusicBrainz, and cover art from the Cover Art Archive).

1. Enter the **Drive** and click "🔍 Detect Disc" (defaults are Linux: `/dev/cdrom`, macOS: `disk1`, Windows: `D:`; on Linux you can also type `/dev/sr0` and the like manually)
2. The TOC is read and candidate albums from MusicBrainz are displayed automatically
3. Re-pick the release if needed, and select the tracks
4. Specify the **Format** (FLAC / ALAC / MP3 / WAV) and the **Output** folder, then click "▶ Start Ripping"
5. When done, it is added to the library automatically (when the option is on)

:::caution
Under WSL2, a physical CD isn't visible directly, so you need to attach the drive to WSL2 with `usbipd-win`.
The Windows build does not bundle `discid` (libdiscid), but "Detect Disc" still works because it reads the TOC directly via the OS IOCTL and computes the MusicBrainz Disc ID in-house. Entering the TOC manually is a fallback for environments where neither libdiscid nor IOCTL is available.
:::
