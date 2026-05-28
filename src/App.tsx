import { useEffect, useCallback, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { SearchBar } from "./components/SearchBar";
import { TrackTable } from "./components/TrackTable";
import { PlayerBar } from "./components/PlayerBar";
import { Toolbar } from "./components/Toolbar";
import { RipDialog } from "./components/ripper/RipDialog";
import { useStore } from "./store/useStore";
import * as libraryApi from "./api/library";
import * as playlistsApi from "./api/playlists";
import * as playbackApi from "./api/playback";

const isTauri = "__TAURI_INTERNALS__" in window;

export default function App() {
  const {
    viewMode,
    selectedPlaylistId,
    searchQuery,
    setTracks,
    appendTracks,
    setPlaylists,
    setIsLoading,
    setHasMore,
    setPlayback,
    tracks,
    playback,
  } = useStore();

  const PAGE_SIZE = 500;
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const [reloadCount, setReloadCount] = useState(0);
  const [ripOpen, setRipOpen] = useState(false);

  const reloadPlaylists = useCallback(async () => {
    if (!isTauri) return;
    try {
      const pls = await playlistsApi.getPlaylists();
      setPlaylists(pls);
    } catch (err) {
      console.error("Failed to load playlists:", err);
    }
  }, [setPlaylists]);

  const loadTracks = useCallback(
    async (reset = true) => {
      if (!isTauri) {
        setTracks([]);
        setHasMore(false);
        return;
      }

      setIsLoading(true);
      try {
        const offset = reset ? 0 : tracks.length;
        let result;

        if (viewMode === "recent") {
          result = await playbackApi.getRecentTracks(200);
          setTracks(result);
          setHasMore(false);
        } else if (searchQuery) {
          result = await libraryApi.searchTracks(searchQuery, PAGE_SIZE, offset);
          if (reset) setTracks(result);
          else appendTracks(result);
          setHasMore(result.length === PAGE_SIZE);
        } else if (viewMode === "playlist" && selectedPlaylistId !== null) {
          result = await playlistsApi.getPlaylistTracks(
            selectedPlaylistId,
            PAGE_SIZE,
            offset,
          );
          if (reset) setTracks(result);
          else appendTracks(result);
          setHasMore(result.length === PAGE_SIZE);
        } else {
          result = await libraryApi.getTracks(PAGE_SIZE, offset);
          if (reset) setTracks(result);
          else appendTracks(result);
          setHasMore(result.length === PAGE_SIZE);
        }
      } catch (err) {
        console.error("Failed to load tracks:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [viewMode, selectedPlaylistId, searchQuery, tracks.length, setTracks, appendTracks, setHasMore, setIsLoading],
  );

  useEffect(() => {
    loadTracks(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedPlaylistId, searchQuery, reloadCount]);

  useEffect(() => {
    reloadPlaylists();
  }, [reloadPlaylists]);

  useEffect(() => {
    if (!isTauri) return;
    pollRef.current = setInterval(async () => {
      try {
        const state = await playbackApi.getPlaybackState();
        setPlayback(state);
      } catch {
        // ignore polling errors
      }
    }, 250);
    return () => clearInterval(pollRef.current);
  }, [setPlayback]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      }
      if (e.key === "Escape" && isInput) {
        (target as HTMLInputElement).blur();
      }
      if (e.key === " " && !isInput) {
        e.preventDefault();
        if (isTauri) {
          if (playback.isPlaying) {
            playbackApi.pause();
          } else if (playback.currentTrackId !== null) {
            playbackApi.resume();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playback.isPlaying, playback.currentTrackId]);

  const handleLoadMore = useCallback(() => {
    loadTracks(false);
  }, [loadTracks]);

  const triggerReload = useCallback(() => {
    setReloadCount((c) => c + 1);
    reloadPlaylists();
  }, [reloadPlaylists]);

  return (
    <div className="app">
      <Sidebar onPlaylistsChanged={triggerReload} />
      <div className="main">
        <Toolbar onLibraryChanged={triggerReload} onOpenRipDialog={() => setRipOpen(true)} />
        <SearchBar />
        <TrackTable onLoadMore={handleLoadMore} onTracksChanged={triggerReload} />
      </div>
      <PlayerBar />
      <RipDialog open={ripOpen} onClose={() => setRipOpen(false)} onLibraryChanged={triggerReload} />
    </div>
  );
}
