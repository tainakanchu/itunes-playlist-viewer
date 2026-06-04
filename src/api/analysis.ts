import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  TrackAnalysis,
  AnalysisStatus,
  AnalysisProgress,
  SimilarHit,
} from "../types";

export interface SimilarOpts {
  limit?: number;
  /// BPM 許容差（base 比の割合, 例 0.08）。
  bpmTol?: number;
  /// Camelot 互換キーのみに絞るか。
  keyCompatible?: boolean;
  /// エネルギー許容差（0..1 の絶対差）。
  energyTol?: number;
}

/// track_id に似た曲を距離昇順で取得する。
export async function getSimilar(
  trackId: number,
  opts: SimilarOpts = {},
): Promise<SimilarHit[]> {
  return invoke("get_similar", {
    trackId,
    limit: opts.limit ?? null,
    bpmTol: opts.bpmTol ?? null,
    keyCompatible: opts.keyCompatible ?? null,
    energyTol: opts.energyTol ?? null,
  });
}

/// 指定トラックをバックグラウンド解析キューへ投入する。force で再解析を強制。
export async function analyzeTracks(trackIds: number[], force = false): Promise<void> {
  return invoke("analyze_tracks", { trackIds, force });
}

export async function getAnalysis(trackId: number): Promise<TrackAnalysis | null> {
  return invoke("get_analysis", { trackId });
}

export async function getAnalysisStatus(): Promise<AnalysisStatus> {
  return invoke("get_analysis_status");
}

export async function getAllAnalyses(): Promise<TrackAnalysis[]> {
  return invoke("get_all_analyses");
}

export async function onAnalysisProgress(
  handler: (p: AnalysisProgress) => void,
): Promise<UnlistenFn> {
  return listen<AnalysisProgress>("analysis-progress", (e) => handler(e.payload));
}
