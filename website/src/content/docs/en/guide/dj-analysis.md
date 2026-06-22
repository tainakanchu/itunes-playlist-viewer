---
title: DJ analysis
description: Analyzing BPM / Key (Camelot) / Energy / loudness / similarity with a pure-Rust DSP, and how to use it.
---

Crateforge performs DJ-oriented audio analysis with a **pure-Rust DSP**.
Without depending on external tools, it estimates **BPM / Key (Camelot) / Energy / loudness** and a similarity vector.

> Screenshots to be added

## What gets analyzed

| Metric | Description |
|---|---|
| **BPM** | Detects tempo automatically. Lets you find tracks that are easy to mix. |
| **Key (Camelot)** | For harmonic mixing, shows the key in Camelot notation (e.g. `8A`). |
| **Energy** | Quantifies a track's drive. Lets you design the flow of a set. |
| **Loudness** | The volume level. Used for rendering the real waveform and for normalization. |
| **Similarity vector** | An internal representation for pulling in tracks with a similar vibe. |

Of the analysis results, **Key / Energy** can be shown as columns in the track table and are also shown in Now Playing.

## When analysis runs

Analysis runs in the background only for "the tracks you use often." It is triggered by either of the following.

- When you **play** a track
- When you run **"Analyze"** via right-click

Progress is shown in the toolbar. Rather than analyzing your entire library at once,
it focuses on the tracks you actually use, so it works without waste.

## Similarity-based curation (Similar)

The **Similar** tab in the right rail suggests "next moves" based on analysis values.

- Right-click a track and choose **"Find similar"** to show candidates that are **Camelot-key compatible + close in tempo**.
- The **Harmonic toggle** narrows results to those that fit harmonically.
- You can **add results to the Crate** (or double-click to play) (when everything has been added, it is disabled with "All added").

## Search filter syntax

You can also filter by analysis values in search (AND-combined with text search).

```text
bpm:120-128
key:8A
energy:60-100
```

## Integration with Smart Playlists and AI curation

- You can use BPM / Key / Energy in [Smart Playlist](../smart-playlists/) rules.
- The [built-in API server](../api-server/) also returns analysis results and similar tracks, so AI curation such as dj-curator can leverage analysis values as a bonus.

:::note
The basic policy is to curate **primarily by metadata** (rating / genre / era),
and to treat BPM / Key / Energy as a "use-it-if-you-have-it bonus."
:::
