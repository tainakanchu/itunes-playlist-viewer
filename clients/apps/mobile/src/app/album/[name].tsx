// アルバム詳細。アルバム名 + 曲数 + 「再生」（全曲をキューにして先頭から）+ 一括ダウンロード。
// 曲を一覧し、タップでその位置からアルバム全体をキューにして再生する。

import { useMemo } from "react";
import { FlatList, Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { type Track, useConnection, usePlayer, useDownloads } from "@crateforge/core";
import { BRAND, PALETTE } from "@/constants/brand";
import Screen from "@/components/Screen";
import TrackRow from "@/components/TrackRow";
import DownloadButton from "@/components/DownloadButton";
import { Loading, ErrorView, EmptyView } from "@/components/StateViews";
import { useAlbumTracks } from "@/features/browse/hooks";

export default function AlbumScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const album = name ? decodeURIComponent(name) : "";
  const client = useConnection((s) => s.client);
  const query = useAlbumTracks(album || null);
  const currentTrackId = usePlayer((s) => s.current()?.trackId ?? null);

  // オフライン時はダウンロード済みエントリを album 名で絞って曲順に並べる。
  const entries = useDownloads((s) => s.entries);
  const offlineTracks = useMemo(() => {
    if (client) return [] as Track[];
    return Object.values(entries)
      .filter((e) => e.track.album === album)
      .map((e) => e.track)
      .sort(
        (a, b) =>
          (a.discNumber ?? 0) - (b.discNumber ?? 0) ||
          (a.trackNumber ?? 0) - (b.trackNumber ?? 0),
      );
  }, [client, entries, album]);
  const tracks = client ? (query.data ?? []) : offlineTracks;

  const onPressTrack = (index: number) => {
    usePlayer.getState().setQueue(tracks, index);
    router.push("/player");
  };

  const onPlayAll = () => {
    if (tracks.length === 0) return;
    usePlayer.getState().setQueue(tracks, 0);
    router.push("/player");
  };

  return (
    <Screen edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={2}>
            {album || "アルバム"}
          </Text>
          {tracks.length > 0 ? <Text style={styles.count}>{tracks.length}曲</Text> : null}
        </View>
      </View>

      {/* オフライン時のバナー */}
      {!client ? (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={15} color={PALETTE.textDim} />
          <Text style={styles.offlineBannerText}>オフライン再生</Text>
        </View>
      ) : null}

      {tracks.length > 0 ? (
        <View style={styles.actions}>
          <Pressable
            onPress={onPlayAll}
            accessibilityRole="button"
            accessibilityLabel="再生"
            style={({ pressed }) => [styles.playButton, pressed && styles.playPressed]}
          >
            <Ionicons name="play" size={18} color={BRAND.accentText} />
            <Text style={styles.playLabel}>再生</Text>
          </Pressable>
          {client ? <DownloadButton albumName={album} label="アルバムを保存" /> : null}
        </View>
      ) : null}

      {client ? (
        query.isLoading ? (
          <Loading />
        ) : query.isError ? (
          <ErrorView message={errorText(query.error)} onRetry={() => query.refetch()} />
        ) : tracks.length === 0 ? (
          <EmptyView message="このアルバムは空です" icon="musical-notes-outline" />
        ) : (
          <FlatList
            data={tracks}
            keyExtractor={(t) => String(t.trackId)}
            renderItem={({ item, index }: { item: Track; index: number }) => (
              <TrackRow
                track={item}
                index={index + 1}
                active={currentTrackId === item.trackId}
                onPress={() => onPressTrack(index)}
                onLongPress={() => usePlayer.getState().enqueueNext(item)}
                trailing={<DownloadButton track={item} />}
              />
            )}
            contentContainerStyle={styles.listContent}
          />
        )
      ) : offlineTracks.length === 0 ? (
        <EmptyView
          message="このアルバムはオフライン保存されていません"
          icon="cloud-offline-outline"
        />
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(t) => String(t.trackId)}
          renderItem={({ item, index }: { item: Track; index: number }) => (
            <TrackRow
              track={item}
              index={index + 1}
              active={currentTrackId === item.trackId}
              onPress={() => onPressTrack(index)}
              onLongPress={() => usePlayer.getState().enqueueNext(item)}
              trailing={<DownloadButton track={item} />}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </Screen>
  );
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : "読み込みに失敗しました";
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: PALETTE.text,
    fontSize: 22,
    fontWeight: "700",
  },
  count: {
    color: PALETTE.textFaint,
    fontSize: 13,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: PALETTE.accent,
  },
  playPressed: {
    opacity: 0.7,
  },
  playLabel: {
    color: BRAND.accentText,
    fontSize: 14,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 96,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: PALETTE.surface,
    borderWidth: 1,
    borderColor: PALETTE.border,
  },
  offlineBannerText: {
    color: PALETTE.textDim,
    fontSize: 13,
    fontWeight: "600",
  },
});
