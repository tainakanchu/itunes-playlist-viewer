import { invoke } from "@tauri-apps/api/core";
import type { Track, PlaybackState } from "../types";

export async function playTrack(trackId: number): Promise<void> {
  return invoke("play_track", { trackId });
}

export async function pause(): Promise<void> {
  return invoke("pause");
}

export async function resume(): Promise<void> {
  return invoke("resume");
}

export async function stop(): Promise<void> {
  return invoke("stop");
}

export async function seek(positionMs: number): Promise<void> {
  return invoke("seek", { positionMs });
}

export async function getPlaybackState(): Promise<PlaybackState> {
  return invoke("get_playback_state");
}

export async function getRecentTracks(limit?: number): Promise<Track[]> {
  return invoke("get_recent_tracks", { limit });
}
