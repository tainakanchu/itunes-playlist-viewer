import { invoke } from "@tauri-apps/api/core";
import type {
  Track,
  ImportResult,
  ExportResult,
  ImportFileResult,
  LibraryStats,
} from "../types";

export async function importLibrary(xmlPath: string): Promise<ImportResult> {
  return invoke("import_library", { xmlPath });
}

export async function exportLibrary(outputPath: string): Promise<ExportResult> {
  return invoke("export_library", { outputPath });
}

export async function importFiles(paths: string[]): Promise<ImportFileResult> {
  return invoke("import_files", { paths });
}

export async function getTracks(
  limit?: number,
  offset?: number,
): Promise<Track[]> {
  return invoke("get_tracks", { limit, offset });
}

export async function searchTracks(
  query: string,
  limit?: number,
  offset?: number,
): Promise<Track[]> {
  return invoke("search_tracks", { query, limit, offset });
}

export async function getLibraryStats(): Promise<LibraryStats> {
  return invoke("get_library_stats");
}
