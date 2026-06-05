import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export interface FfmpegStatus {
  available: boolean;
  path: string | null;
  /** どこで見つけたか。 */
  source: "cache" | "bundled" | "path" | "none";
  /** 自動ダウンロードに対応しているか（Windows のみ）。 */
  canDownload: boolean;
}

export type FfmpegProgress =
  | { kind: "start" }
  | { kind: "download"; received: number; total: number }
  | { kind: "extract" }
  | { kind: "done" }
  | { kind: "error"; message: string };

/** 変換用 ffmpeg の現在の状態を取得する。 */
export async function getFfmpegStatus(): Promise<FfmpegStatus> {
  return invoke("get_ffmpeg_status");
}

/** ffmpeg を取得する（既にあればその場所を返す）。進捗は onFfmpegProgress で。 */
export async function downloadFfmpeg(): Promise<string> {
  return invoke("download_ffmpeg");
}

export async function onFfmpegProgress(
  cb: (p: FfmpegProgress) => void,
): Promise<UnlistenFn> {
  return listen<FfmpegProgress>("ffmpeg-progress", (e) => cb(e.payload));
}
