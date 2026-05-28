import { useCallback, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useStore } from "../store/useStore";
import * as playbackApi from "../api/playback";
import * as playlistsApi from "../api/playlists";
import type { Track } from "../types";

function formatTime(ms: number | null): string {
  if (!ms) return "";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function formatRating(rating: number | null): string {
  if (!rating) return "";
  const stars = Math.round(rating / 20);
  return "★".repeat(stars) + "☆".repeat(5 - stars);
}

interface TrackTableProps {
  onLoadMore: () => void;
  onTracksChanged: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  track: Track;
}

export function TrackTable({ onLoadMore, onTracksChanged }: TrackTableProps) {
  const {
    tracks,
    isLoading,
    hasMore,
    playback,
    selectedTrackIds,
    toggleTrackSelection,
    setSelectedTrackIds,
    playlists,
    viewMode,
    selectedPlaylistId,
  } = useStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 20,
  });

  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el || isLoading || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      onLoadMore();
    }
  }, [isLoading, hasMore, onLoadMore]);

  const handleRowClick = useCallback(
    (e: React.MouseEvent, track: Track) => {
      const additive = e.ctrlKey || e.metaKey;
      if (e.shiftKey && selectedTrackIds.size > 0) {
        const lastSelectedTrackId = Array.from(selectedTrackIds).pop()!;
        const lastIdx = tracks.findIndex((t) => t.trackId === lastSelectedTrackId);
        const curIdx = tracks.findIndex((t) => t.trackId === track.trackId);
        if (lastIdx !== -1 && curIdx !== -1) {
          const [from, to] = lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
          const next = new Set<number>(additive ? selectedTrackIds : new Set());
          for (let i = from; i <= to; i++) next.add(tracks[i].trackId);
          setSelectedTrackIds(next);
          return;
        }
      }
      toggleTrackSelection(track.trackId, additive);
    },
    [tracks, selectedTrackIds, setSelectedTrackIds, toggleTrackSelection],
  );

  const handleDoubleClick = useCallback(async (track: Track) => {
    if (!track.fileExists) return;
    try {
      await playbackApi.playTrack(track.trackId);
    } catch (err) {
      console.error("Failed to play:", err);
    }
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, track: Track) => {
      e.preventDefault();
      if (!selectedTrackIds.has(track.trackId)) {
        toggleTrackSelection(track.trackId, false);
      }
      setContextMenu({ x: e.clientX, y: e.clientY, track });
    },
    [selectedTrackIds, toggleTrackSelection],
  );

  const handleAddToPlaylist = useCallback(
    async (playlistId: number) => {
      const ids =
        selectedTrackIds.size > 0
          ? Array.from(selectedTrackIds)
          : contextMenu
            ? [contextMenu.track.trackId]
            : [];
      if (ids.length === 0) return;
      try {
        await playlistsApi.addTracksToPlaylist(playlistId, ids);
        onTracksChanged();
      } catch (err) {
        alert(`Failed to add: ${err}`);
      }
      setContextMenu(null);
    },
    [contextMenu, selectedTrackIds, onTracksChanged],
  );

  const handleRemoveFromPlaylist = useCallback(
    async (track: Track) => {
      if (viewMode !== "playlist" || selectedPlaylistId === null) return;
      const idx = tracks.findIndex((t) => t.trackId === track.trackId);
      if (idx === -1) return;
      try {
        await playlistsApi.removeTrackFromPlaylist(selectedPlaylistId, idx);
        onTracksChanged();
      } catch (err) {
        alert(`Failed to remove: ${err}`);
      }
      setContextMenu(null);
    },
    [viewMode, selectedPlaylistId, tracks, onTracksChanged],
  );

  const closeMenu = useCallback(() => setContextMenu(null), []);

  const items = rowVirtualizer.getVirtualItems();
  const targetPlaylists = playlists.filter((p) => !p.isFolder && !p.isSmart);

  return (
    <div
      className="track-table-container"
      ref={parentRef}
      onScroll={handleScroll}
      onClick={closeMenu}
    >
      <div className="track-table-header">
        <div className="col col-name">Track</div>
        <div className="col col-artist">Artist</div>
        <div className="col col-album">Album</div>
        <div className="col col-genre">Genre</div>
        <div className="col col-rating">Rating</div>
        <div className="col col-plays">Plays</div>
        <div className="col col-time">Time</div>
        <div className="col col-bpm">BPM</div>
      </div>
      <div
        className="track-table-body"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {items.map((virtualRow) => {
          const track = tracks[virtualRow.index];
          const isCurrent = playback.currentTrackId === track.trackId;
          const isSelected = selectedTrackIds.has(track.trackId);
          return (
            <div
              key={track.id}
              className={`track-row ${isCurrent ? "playing" : ""} ${!track.fileExists ? "missing" : ""} ${isSelected ? "selected" : ""}`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              onClick={(e) => handleRowClick(e, track)}
              onDoubleClick={() => handleDoubleClick(track)}
              onContextMenu={(e) => handleContextMenu(e, track)}
            >
              <div className="col col-name">
                {!track.fileExists && (
                  <span className="missing-icon" title="File not found">⚠</span>
                )}
                {isCurrent && <span className="playing-icon">▶</span>}
                {track.name || "(unknown)"}
              </div>
              <div className="col col-artist">{track.artist || ""}</div>
              <div className="col col-album">{track.album || ""}</div>
              <div className="col col-genre">{track.genre || ""}</div>
              <div className="col col-rating">{formatRating(track.rating)}</div>
              <div className="col col-plays">{track.playCount ?? ""}</div>
              <div className="col col-time">{formatTime(track.totalTimeMs)}</div>
              <div className="col col-bpm">{track.bpm ?? ""}</div>
            </div>
          );
        })}
      </div>
      {isLoading && <div className="loading">Loading...</div>}
      {tracks.length === 0 && !isLoading && (
        <div className="empty">
          No tracks. Import an iTunes Library XML, rip a CD, or import files to get started.
        </div>
      )}

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">
            {selectedTrackIds.size > 1
              ? `${selectedTrackIds.size} tracks selected`
              : contextMenu.track.name || "(unknown)"}
          </div>
          <div
            className="context-menu-item"
            onClick={() => handleDoubleClick(contextMenu.track)}
          >
            ▶ Play
          </div>
          {viewMode === "playlist" && (
            <div
              className="context-menu-item"
              onClick={() => handleRemoveFromPlaylist(contextMenu.track)}
            >
              − Remove from this playlist
            </div>
          )}
          <div className="context-menu-divider" />
          <div className="context-menu-section">Add to playlist...</div>
          {targetPlaylists.length === 0 ? (
            <div className="context-menu-empty">No playlists yet</div>
          ) : (
            targetPlaylists.map((p) => (
              <div
                key={p.playlistId}
                className="context-menu-item"
                onClick={() => handleAddToPlaylist(p.playlistId)}
              >
                🎵 {p.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
