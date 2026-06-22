---
title: Customizing the display
description: Adding / reordering / resizing columns, adjusting row height, covers, and the right rail, plus a keyboard shortcut list.
---

You can fine-tune the track table and the right rail to match how you work. Settings are persisted.

> Screenshots to be added

## Customizing columns

- **Resizing columns** — drag the right edge of a header to change the column width (you can widen Genre / tag columns enough to see everything).
- **Reordering columns** — reorder by dragging the header directly, or with the pointer in the column picker (customize menu).
- **Toggling visible columns** — show / hide columns in the column picker.
- **Track number columns** — you can show two kinds: "Track #" (the track number within the album) and "No." (the sequential number in the current display order).

## Row height, covers, and the right rail

- **Row height** — adjust within 32–64px with a slider.
- **Artwork (cover) size** — choose from none / small (20px) / medium (28px).
- **List / Covers view** — switch with the segment in the toolbar. Covers groups the same album into a single card, and clicking it expands the in-album track list in place.
- **Show / hide the right rail** — hide it with a toggle.

Truncated cells (track name / album / album artist) show the full text as a tooltip on hover.

## CJK variant-normalizing search

In the search box, the built-in API, and Smart Playlists, **Traditional / Simplified Chinese, Japanese kanji and kana (hiragana ↔ katakana), full-width / half-width, and upper / lowercase** are normalized,
so whichever variant you type matches across the board. The strength can be set to **off / light / standard** in settings.

Focus the search with `/`, and the query is split on spaces with each token AND-combined
(matching any of name / artist / album / album artist / genre / comments).
You can also filter by [analysis values](../dj-analysis/) like `bpm:120-128` / `key:8A` / `energy:60-100`.

## Keyboard shortcuts

Press `?` to show the shortcut list overlay. The main ones are as follows.

### Playback

| Key | Action |
|---|---|
| `Space` | Play / pause |
| `Enter` | Play the selected track |
| `J` | Previous track |
| `K` | Next track |
| `Shift` + `←` | Seek back 5 seconds |
| `Shift` + `→` | Seek forward 5 seconds |
| `S` | Toggle shuffle |
| `R` | Toggle repeat |
| `Ctrl` + `↑` | Volume up |
| `Ctrl` + `↓` | Volume down |

### Navigation & search

| Key | Action |
|---|---|
| `/` | Focus search |
| `Ctrl` + `F` | Focus search |
| `Ctrl` + `L` | Return to library (clear search) |
| `Esc` | Exit search / input, close dialog |

### List operations

| Key | Action |
|---|---|
| `↑` / `↓` | Move the selection up / down |
| `Shift` + `↑` / `↓` | Extend the selection |
| `Ctrl` + `A` | Select all |
| `Ctrl` + `I` | Edit the selected track (Get Info) |
| `≣` (application key) | Context menu (shown relative to the focused row) |

### Help

| Key | Action |
|---|---|
| `?` | Show this shortcut list |
