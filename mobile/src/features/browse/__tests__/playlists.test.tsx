// Playlists タブのコンポーネントテスト。接続済み + プレイリスト応答を返す fetch で
// 描画し、名前が出ること・行タップで router.push が呼ばれることを確認する。

import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import type { Playlist } from "@/lib/types";
import { setTestConnection, createQueryWrapper, resetTestState, mockFetch } from "@/test-utils";
import PlaylistsScreen from "@/app/(tabs)/playlists";

// SafeAreaProvider を張らずに insets を固定で返す。
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: 1,
    playlistId: 100,
    persistentId: null,
    parentPersistentId: null,
    name: "My List",
    isFolder: false,
    isSmart: false,
    isUserCreated: true,
    trackCount: 3,
    ...overrides,
  };
}

beforeEach(() => {
  resetTestState();
  (router.push as jest.Mock).mockClear();
});

describe("PlaylistsScreen", () => {
  test("renders playlist names and tapping a row navigates to its detail", async () => {
    setTestConnection();
    const playlists = [
      makePlaylist({ playlistId: 100, name: "House Bangers" }),
      makePlaylist({ playlistId: 200, name: "Chill", isSmart: true }),
    ];
    mockFetch({ body: playlists });

    const Wrapper = createQueryWrapper();
    await render(
      <Wrapper>
        <PlaylistsScreen />
      </Wrapper>,
    );

    const row = await screen.findByText("House Bangers");
    expect(screen.getByText("Chill")).toBeTruthy();

    fireEvent.press(row);

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith("/playlist/100");
    });
  });

  test("hides empty folders but keeps non-empty ones", async () => {
    setTestConnection();
    const playlists = [
      makePlaylist({ playlistId: 1, name: "Empty Folder", isFolder: true, trackCount: 0 }),
      makePlaylist({ playlistId: 2, name: "Full Folder", isFolder: true, trackCount: 5 }),
    ];
    mockFetch({ body: playlists });

    const Wrapper = createQueryWrapper();
    await render(
      <Wrapper>
        <PlaylistsScreen />
      </Wrapper>,
    );

    expect(await screen.findByText("Full Folder")).toBeTruthy();
    expect(screen.queryByText("Empty Folder")).toBeNull();
  });

  test("shows connect prompt when no client", async () => {
    const Wrapper = createQueryWrapper();
    await render(
      <Wrapper>
        <PlaylistsScreen />
      </Wrapper>,
    );
    expect(await screen.findByText("サーバーに接続してください")).toBeTruthy();
  });
});
