import { create } from "zustand";
import type { Track, Playlist, PlaybackState, ViewMode } from "../types";

interface AppState {
  // View
  viewMode: ViewMode;
  selectedPlaylistId: number | null;
  searchQuery: string;

  // Data
  tracks: Track[];
  playlists: Playlist[];
  selectedTrackIds: Set<number>;
  isLoading: boolean;
  hasMore: boolean;

  // Playback
  playback: PlaybackState;

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setSelectedPlaylistId: (id: number | null) => void;
  setSearchQuery: (query: string) => void;
  setTracks: (tracks: Track[]) => void;
  appendTracks: (tracks: Track[]) => void;
  setPlaylists: (playlists: Playlist[]) => void;
  setIsLoading: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  setPlayback: (state: PlaybackState) => void;
  setSelectedTrackIds: (ids: Set<number>) => void;
  toggleTrackSelection: (id: number, additive: boolean) => void;
  clearTrackSelection: () => void;
}

export const useStore = create<AppState>((set) => ({
  viewMode: "library",
  selectedPlaylistId: null,
  searchQuery: "",
  tracks: [],
  playlists: [],
  selectedTrackIds: new Set(),
  isLoading: false,
  hasMore: true,
  playback: {
    isPlaying: false,
    currentTrackId: null,
    positionMs: 0,
    durationMs: 0,
  },

  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedPlaylistId: (id) => set({ selectedPlaylistId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setTracks: (tracks) => set({ tracks, selectedTrackIds: new Set() }),
  appendTracks: (tracks) =>
    set((state) => ({ tracks: [...state.tracks, ...tracks] })),
  setPlaylists: (playlists) => set({ playlists }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setHasMore: (hasMore) => set({ hasMore }),
  setPlayback: (playback) => set({ playback }),
  setSelectedTrackIds: (ids) => set({ selectedTrackIds: ids }),
  toggleTrackSelection: (id, additive) =>
    set((state) => {
      const next = additive ? new Set(state.selectedTrackIds) : new Set<number>();
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedTrackIds: next };
    }),
  clearTrackSelection: () => set({ selectedTrackIds: new Set() }),
}));
