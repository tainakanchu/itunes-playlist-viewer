import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl: string;
  releaseNotes: string;
  publishedAt: string | null;
  /** この OS 向けの直接ダウンロード URL（無ければ null）。通常は exe 差し替え用の zip。 */
  downloadUrl: string | null;
  /** ポータブル運用（exe の隣に portable.txt）か。 */
  portable: boolean;
  /** インストーラ無しで exe をその場差し替え（再起動のみ）する更新か。 */
  selfReplace: boolean;
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  return invoke("check_for_update");
}

/// 更新を取得して適用する。通常は exe をその場差し替えして再起動（インストーラ不要）。
/// `[installer-required]` 版や zip が無い版ではインストーラを起動する。戻り値は保存先/差し替え先パス。
export async function downloadAndRunUpdate(url: string): Promise<string> {
  return invoke("download_and_run_update", { url });
}

export async function updateSmtc(
  title: string,
  artist: string,
  album: string,
  isPlaying: boolean,
  positionMs: number,
  durationMs: number,
): Promise<void> {
  return invoke("update_smtc", {
    title,
    artist,
    album,
    isPlaying,
    positionMs,
    durationMs,
  });
}

export type SmtcButton = "play" | "pause" | "toggle" | "next" | "prev" | "stop";

export async function onSmtcButton(
  handler: (kind: SmtcButton) => void,
): Promise<UnlistenFn> {
  return listen<string>("smtc-button", (e) => handler(e.payload as SmtcButton));
}
