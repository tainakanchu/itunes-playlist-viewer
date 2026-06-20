// ユーザー設定ストア（zustand）。現状はオフラインダウンロードの既定音質のみ。
// SecureStore に永続化し、起動時に hydrate して復元する。

import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import type { DownloadQuality } from "@/lib/types";

const KEY_QUALITY = "crateforge.downloadQuality";

const DEFAULT_QUALITY: DownloadQuality = "aac192";

/** 永続化された文字列が正しい DownloadQuality か検証する。 */
function isQuality(v: string | null): v is DownloadQuality {
  return v === "original" || v === "aac256" || v === "aac192" || v === "aac128";
}

export interface SettingsState {
  /** ダウンロード時の既定音質。既定は "aac192"。 */
  downloadQuality: DownloadQuality;
  /** 既定音質を変更し永続化する。 */
  setDownloadQuality: (q: DownloadQuality) => void;
  /** 起動時に SecureStore から復元する。 */
  hydrate: () => Promise<void>;
}

export const useSettings = create<SettingsState>((set) => ({
  downloadQuality: DEFAULT_QUALITY,

  setDownloadQuality: (q) => {
    set({ downloadQuality: q });
    void SecureStore.setItemAsync(KEY_QUALITY, q).catch(() => {
      // 永続化失敗はメモリ上の値で動作継続。
    });
  },

  hydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(KEY_QUALITY);
      if (isQuality(stored)) set({ downloadQuality: stored });
    } catch {
      // 読み出し失敗は既定値のまま。
    }
  },
}));
