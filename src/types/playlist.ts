export interface Playlist {
  id: number;
  playlistId: number;
  persistentId: string | null;
  parentPersistentId: string | null;
  name: string;
  isFolder: boolean;
  isSmart: boolean;
  isUserCreated: boolean;
  trackCount: number;
}
