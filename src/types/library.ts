export interface ImportResult {
  trackCount: number;
  playlistCount: number;
  missingFiles: number;
}

export interface ExportResult {
  outputPath: string;
  trackCount: number;
  playlistCount: number;
}

export interface ImportFileResult {
  addedTracks: number;
  skipped: number;
}

export interface LibraryStats {
  trackCount: number;
  playlistCount: number;
  totalTimeMs: number;
}
