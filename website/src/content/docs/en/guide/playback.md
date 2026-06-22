---
title: Playback, queue & Crate
description: Local playback, the Up Next queue, the Crate for DJ curation, and the Now Playing BPM / Key / Energy display.
---

Crateforge supports local playback (rodio + symphonia) and decodes a wide range of formats directly.
You build up playback and curation in the right rail's **Now Playing / Up Next / Crate**.

> Screenshots to be added

## Playing

- **Double-click** a track to play it.
- `Space` to **play / pause**, `Enter` to play the focused/selected row.
- `J` / `K` for previous / next track, `Shift + ←` / `Shift + →` to seek 5 seconds.
- `S` for shuffle, `R` for repeat (off / all / one). `Ctrl + ↑` / `Ctrl + ↓` for volume.

In the player bar, drag the seek bar to scrub, click the time display to toggle "elapsed ⇄ remaining,"
and the volume bar has a knob and a % display. The waveform is rendered as a real waveform from analysis peaks.

Automatic track advance is driven by a **worker thread on the Rust side**. Playback continues even when the window is minimized,
and if the next track's file can't be found, it skips automatically and keeps playing.
Tracks that fail to play are notified via a toast, and the failure details (file missing / decode failure / decoder crash) are
logged to `crateforge.log`.

### ReplayGain

You can toggle ReplayGain (per-track volume normalization, −18 LUFS reference) in settings.

## Up Next (playback queue)

The **Up Next** in the right rail is the queue of what will be played next.

- **"Play Next"** in the context menu inserts the selected tracks (multiple supported, selection order preserved)
  right after the currently playing track.
- The **"×"** that appears on row hover removes from the queue, and you can reorder with **drag and drop**.
- The header shows the **count, total time, and a shuffle badge**.
- Shuffle precomputes the actual play order (Fisher–Yates), so Up Next reflects the order that will actually play.

## Crate (DJ curation)

The **Crate** in the right rail is a staging area for building a starting point for your set.

- Add tracks to the Crate, and once you have a batch you can **"Save as playlist."**
- The **smooth** button auto-sorts into a smooth flow using greedy nearest-neighbor based on analysis values.
- The Crate is not persisted (it stays if you save it as a playlist).

:::tip
The intended flow is: gather candidates with [similarity-based curation](../dj-analysis/) (the Similar tab) or [AI curation](../api-server/) (dj-curator),
use the Crate as a starting point, and finalize the track order in the GUI.
:::

## Now Playing (BPM / Key / Energy)

The **Now Playing** in the right rail shows **Key / Energy** along with the artwork of the playing track.
BPM, Key (Camelot), and Energy are shown for [analyzed](../dj-analysis/) tracks and help you decide on transitions.

The **Similar** tab presents "next moves" — Camelot-key compatible + close in tempo — for the playing track
(or via right-click → "Find similar") (narrow with the Harmonic toggle).
You can add results to the Crate (or double-click to play). When everything has been added, "Add all" is disabled ("All added").
