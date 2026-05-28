import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  DiscToc,
  ReleaseCandidate,
  RipProgress,
  RipRequest,
} from "../types";

export async function detectDisc(device?: string): Promise<DiscToc> {
  return invoke("detect_disc", { device: device ?? null });
}

export async function lookupReleaseByDiscId(
  musicbrainzId: string,
): Promise<ReleaseCandidate[]> {
  return invoke("lookup_release_by_disc_id", { musicbrainzId });
}

export async function lookupReleaseByToc(
  trackCount: number,
  leadout: number,
  offsets: number[],
): Promise<ReleaseCandidate[]> {
  return invoke("lookup_release_by_toc", { trackCount, leadout, offsets });
}

export async function ripCd(request: RipRequest): Promise<void> {
  return invoke("rip_cd", { request });
}

export async function onRipProgress(
  handler: (p: RipProgress) => void,
): Promise<UnlistenFn> {
  return listen<RipProgress>("rip-progress", (e) => handler(e.payload));
}
