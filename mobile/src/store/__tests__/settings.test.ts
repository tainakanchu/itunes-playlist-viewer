// useSettings ストアの単体テスト。SecureStore はグローバルモック。
// setDownloadQuality が state を更新し永続化、hydrate が復元することを検証する。

import * as SecureStore from "expo-secure-store";

import { useSettings } from "@/store/settings";

const getItem = SecureStore.getItemAsync as jest.Mock;
const setItem = SecureStore.setItemAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  getItem.mockReset().mockResolvedValue(null);
  setItem.mockReset().mockResolvedValue(undefined);
  // 既定へ戻す。
  useSettings.setState({ downloadQuality: "aac192" });
});

describe("useSettings", () => {
  it("既定の音質は aac192", () => {
    expect(useSettings.getState().downloadQuality).toBe("aac192");
  });

  it("setDownloadQuality が state を更新し SecureStore に永続化する", () => {
    useSettings.getState().setDownloadQuality("aac256");
    expect(useSettings.getState().downloadQuality).toBe("aac256");
    expect(setItem).toHaveBeenCalledWith("crateforge.downloadQuality", "aac256");

    useSettings.getState().setDownloadQuality("original");
    expect(useSettings.getState().downloadQuality).toBe("original");
  });

  it("hydrate が永続化された有効な音質を復元する", async () => {
    getItem.mockResolvedValueOnce("aac128");
    await useSettings.getState().hydrate();
    expect(useSettings.getState().downloadQuality).toBe("aac128");
  });

  it("hydrate は不正な値なら既定のままにする", async () => {
    getItem.mockResolvedValueOnce("garbage");
    await useSettings.getState().hydrate();
    expect(useSettings.getState().downloadQuality).toBe("aac192");
  });
});
