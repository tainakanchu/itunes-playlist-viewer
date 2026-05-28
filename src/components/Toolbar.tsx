import { useCallback, useEffect, useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import * as libraryApi from "../api/library";
import type { LibraryStats } from "../types";

interface ToolbarProps {
  onLibraryChanged: () => void;
  onOpenRipDialog: () => void;
  onOpenRulesPanel: () => void;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function Toolbar({ onLibraryChanged, onOpenRipDialog, onOpenRulesPanel }: ToolbarProps) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importingFiles, setImportingFiles] = useState(false);
  const [status, setStatus] = useState("");
  const [stats, setStats] = useState<LibraryStats | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const s = await libraryApi.getLibraryStats();
      setStats(s);
    } catch {
      setStats(null);
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const handleImport = useCallback(async () => {
    const path = await open({
      filters: [{ name: "iTunes Library XML", extensions: ["xml"] }],
    });
    if (!path) return;

    setImporting(true);
    setStatus("Importing...");
    try {
      const result = await libraryApi.importLibrary(path);
      setStatus(
        `Imported ${result.trackCount} tracks, ${result.playlistCount} playlists` +
          (result.missingFiles > 0
            ? ` (${result.missingFiles} missing files)`
            : ""),
      );
      onLibraryChanged();
      refreshStats();
    } catch (err) {
      setStatus(`Import error: ${err}`);
    } finally {
      setImporting(false);
    }
  }, [onLibraryChanged, refreshStats]);

  const handleImportFiles = useCallback(async () => {
    const selected = await open({
      multiple: true,
      directory: false,
      filters: [
        {
          name: "Audio files",
          extensions: [
            "flac",
            "mp3",
            "m4a",
            "wav",
            "aac",
            "ogg",
            "opus",
            "aiff",
            "wma",
          ],
        },
      ],
    });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    if (paths.length === 0) return;

    setImportingFiles(true);
    setStatus(`Importing ${paths.length} file(s)...`);
    try {
      const result = await libraryApi.importFiles(paths);
      setStatus(
        `Imported ${result.addedTracks} file(s)` +
          (result.skipped > 0 ? `, skipped ${result.skipped}` : ""),
      );
      onLibraryChanged();
      refreshStats();
    } catch (err) {
      setStatus(`Import files error: ${err}`);
    } finally {
      setImportingFiles(false);
    }
  }, [onLibraryChanged, refreshStats]);

  const handleExport = useCallback(async () => {
    const path = await save({
      filters: [{ name: "iTunes Library XML", extensions: ["xml"] }],
      defaultPath: "iTunes Library.xml",
    });
    if (!path) return;

    setExporting(true);
    setStatus("Exporting...");
    try {
      const result = await libraryApi.exportLibrary(path);
      setStatus(
        `Exported ${result.trackCount} tracks, ${result.playlistCount} playlists → ${result.outputPath}`,
      );
    } catch (err) {
      setStatus(`Export error: ${err}`);
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <div className="toolbar">
      <div className="toolbar-actions">
        <button
          className="toolbar-btn primary"
          onClick={handleImport}
          disabled={importing}
          title="Import an existing iTunes Library.xml"
        >
          {importing ? "Importing..." : "📥 Import XML"}
        </button>
        <button
          className="toolbar-btn"
          onClick={handleImportFiles}
          disabled={importingFiles}
          title="Add audio files to the library"
        >
          {importingFiles ? "Adding..." : "🎵 Add Files"}
        </button>
        <button
          className="toolbar-btn"
          onClick={onOpenRipDialog}
          title="Rip an audio CD from an attached drive"
        >
          💿 Rip CD
        </button>
        <button
          className="toolbar-btn"
          onClick={onOpenRulesPanel}
          title="Build playlists declaratively from a YAML rules file"
        >
          ⚙️ Rules
        </button>
        <button
          className="toolbar-btn"
          onClick={handleExport}
          disabled={exporting || (stats?.trackCount ?? 0) === 0}
          title="Export library to iTunes-compatible XML"
        >
          {exporting ? "Exporting..." : "📤 Export XML"}
        </button>
      </div>

      {stats && (
        <div className="toolbar-stats">
          <span>
            <strong>{stats.trackCount.toLocaleString()}</strong> tracks
          </span>
          <span>·</span>
          <span>
            <strong>{stats.playlistCount}</strong> playlists
          </span>
          {stats.totalTimeMs > 0 && (
            <>
              <span>·</span>
              <span>{formatDuration(stats.totalTimeMs)}</span>
            </>
          )}
        </div>
      )}

      {status && <div className="toolbar-status">{status}</div>}
    </div>
  );
}
