// Playlists タブ。プレイリストを縦に一覧する読みやすいリスト。
// 各行: 名前（太字）+ 曲数 + スマート/フォルダのアイコン。タップで詳細へ。
// 横スクロールの PlaylistsBar を置き換える。

import { useMemo } from "react";
import { FlatList } from "react-native";
import { useRouter } from "expo-router";

import type { Playlist } from "@/lib/types";
import Screen from "@/components/Screen";
import { Loading, ErrorView, EmptyView } from "@/components/StateViews";
import { useConnection } from "@/store/connection";
import { usePlaylists } from "@/features/browse/hooks";
import PlaylistRow from "@/features/browse/PlaylistRow";

export default function PlaylistsScreen() {
  const router = useRouter();
  const client = useConnection((s) => s.client);
  const query = usePlaylists();

  // フォルダ自身は曲を持たないので、中身のあるプレイリストとフォルダだけを残す。
  // 空フォルダ（trackCount 0）はノイズになるので除外する。
  const rows = useMemo(() => {
    const all = query.data ?? [];
    return all.filter((p) => (p.isFolder ? p.trackCount > 0 : true));
  }, [query.data]);

  if (!client) {
    return (
      <Screen>
        <EmptyView message="サーバーに接続してください" icon="wifi-outline" />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(p) => String(p.playlistId)}
        renderItem={({ item }: { item: Playlist }) => (
          <PlaylistRow
            playlist={item}
            onPress={() => router.push(`/playlist/${item.playlistId}`)}
          />
        )}
        ListEmptyComponent={
          query.isLoading ? (
            <Loading />
          ) : query.isError ? (
            <ErrorView message={errorText(query.error)} onRetry={() => query.refetch()} />
          ) : (
            <EmptyView message="プレイリストがありません" icon="list-outline" />
          )
        }
        contentContainerStyle={rows.length === 0 ? styles.emptyContent : styles.listContent}
      />
    </Screen>
  );
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : "読み込みに失敗しました";
}

const styles = {
  listContent: { paddingTop: 8, paddingBottom: 96 },
  emptyContent: { flexGrow: 1 },
} as const;
