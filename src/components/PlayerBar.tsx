import { useCallback } from "react";
import { useStore } from "../store/useStore";
import * as playbackApi from "../api/playback";

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function PlayerBar() {
  const {
    playback,
    tracks,
    volume,
    shuffle,
    repeat,
    setVolume,
    setShuffle,
    setRepeat,
  } = useStore();

  const currentTrack = playback.currentTrackId
    ? tracks.find((t) => t.trackId === playback.currentTrackId)
    : null;

  const handlePlayPause = useCallback(async () => {
    if (playback.isPlaying) {
      await playbackApi.pause();
    } else if (playback.currentTrackId !== null) {
      await playbackApi.resume();
    }
  }, [playback.isPlaying, playback.currentTrackId]);

  const handleStop = useCallback(async () => {
    await playbackApi.stop();
  }, []);

  const handleNext = useCallback(async () => {
    await playbackApi.playNext();
  }, []);

  const handlePrev = useCallback(async () => {
    await playbackApi.playPrev();
  }, []);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pos = parseInt(e.target.value, 10);
      playbackApi.seek(pos);
    },
    [],
  );

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value);
      setVolume(v);
      playbackApi.setVolume(v);
    },
    [setVolume],
  );

  const handleShuffleToggle = useCallback(async () => {
    const next = !shuffle;
    setShuffle(next);
    await playbackApi.setShuffle(next);
  }, [shuffle, setShuffle]);

  const handleRepeatToggle = useCallback(async () => {
    const order = ["off", "all", "one"] as const;
    const i = order.indexOf(repeat);
    const next = order[(i + 1) % order.length];
    setRepeat(next);
    await playbackApi.setRepeat(next);
  }, [repeat, setRepeat]);

  const repeatIcon = repeat === "one" ? "🔂" : repeat === "all" ? "🔁" : "🔁";
  const repeatTitle = repeat === "one" ? "Repeat One" : repeat === "all" ? "Repeat All" : "Repeat Off";

  return (
    <div className="player-bar">
      <div className="player-controls">
        <button className="player-btn small" onClick={handlePrev} title="Previous (J)">
          ⏮
        </button>
        <button className="player-btn" onClick={handlePlayPause} title="Play/Pause (Space)">
          {playback.isPlaying ? "⏸" : "▶"}
        </button>
        <button className="player-btn small" onClick={handleStop} title="Stop">
          ⏹
        </button>
        <button className="player-btn small" onClick={handleNext} title="Next (K)">
          ⏭
        </button>
        <button
          className={`player-btn small toggle ${shuffle ? "on" : ""}`}
          onClick={handleShuffleToggle}
          title="Shuffle (S)"
        >
          🔀
        </button>
        <button
          className={`player-btn small toggle ${repeat !== "off" ? "on" : ""}`}
          onClick={handleRepeatToggle}
          title={`${repeatTitle} (R)`}
        >
          <span style={{ position: "relative" }}>
            {repeatIcon}
            {repeat === "one" && <span className="repeat-one-badge">1</span>}
          </span>
        </button>
      </div>

      <div className="player-track-info">
        {currentTrack ? (
          <>
            <span className="player-track-name">
              {currentTrack.name || "(unknown)"}
            </span>
            <span className="player-track-artist">
              {currentTrack.artist || ""}
              {currentTrack.album ? ` — ${currentTrack.album}` : ""}
            </span>
          </>
        ) : (
          <span className="player-track-name dim">No track playing</span>
        )}
      </div>

      <div className="player-seek">
        <span className="player-time">{formatTime(playback.positionMs)}</span>
        <input
          type="range"
          min={0}
          max={playback.durationMs || 100}
          value={playback.positionMs}
          onChange={handleSeek}
          className="seek-slider"
          disabled={!currentTrack}
        />
        <span className="player-time">{formatTime(playback.durationMs)}</span>
      </div>

      <div className="player-volume" title="Volume (↑/↓)">
        <span className="player-volume-icon">🔊</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={volume}
          onChange={handleVolumeChange}
          className="seek-slider volume-slider"
        />
      </div>
    </div>
  );
}
