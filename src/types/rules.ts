export interface PlaylistNodeOut {
  type: "playlist";
  name: string;
  fullPath: string;
  parentPath: string | null;
  trackIds: number[];
}

export interface FolderNodeOut {
  type: "folder";
  name: string;
  fullPath: string;
  parentPath: string | null;
  children: TreeNodeOut[];
}

export type TreeNodeOut = FolderNodeOut | PlaylistNodeOut;

export interface EvaluationResult {
  tree: FolderNodeOut;
  playlistCount: number;
  folderCount: number;
  referencedTrackCount: number;
}

export interface ApplyResult {
  generatedPlaylistCount: number;
  generatedFolderCount: number;
  removedExisting: boolean;
}
