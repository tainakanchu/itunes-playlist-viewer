//! GeneratedPlaylist のリストから folder/playlist のツリーを組み立てる。

use std::collections::{HashMap, HashSet};

use super::models::{FolderNodeOut, GeneratedPlaylist, PlaylistNodeOut, TreeNodeOut};

pub fn build_folder_tree(namespace: &str, playlists: &[GeneratedPlaylist]) -> FolderNodeOut {
    // We build the tree by full path. `folders[path] -> children index list` is
    // tracked separately so we can append children in insertion order.
    let mut folders: HashMap<String, FolderNodeOut> = HashMap::new();
    folders.insert(
        namespace.to_string(),
        FolderNodeOut {
            name: namespace.to_string(),
            full_path: namespace.to_string(),
            parent_path: None,
            children: Vec::new(),
        },
    );

    // Track which (parent, child_name) pairs we've already created to dedupe
    // folder creation across multiple playlists.
    let mut order: Vec<String> = Vec::new();
    order.push(namespace.to_string());

    // Helper: ensure folder + all ancestors exist.
    fn ensure_folder(
        full_path: &str,
        folders: &mut HashMap<String, FolderNodeOut>,
        order: &mut Vec<String>,
    ) {
        if folders.contains_key(full_path) {
            return;
        }
        let (parent_path, name) = match full_path.rsplit_once('/') {
            Some((p, n)) => (p.to_string(), n.to_string()),
            None => (String::new(), full_path.to_string()),
        };
        ensure_folder(&parent_path, folders, order);

        folders.insert(
            full_path.to_string(),
            FolderNodeOut {
                name,
                full_path: full_path.to_string(),
                parent_path: Some(parent_path),
                children: Vec::new(),
            },
        );
        order.push(full_path.to_string());
    }

    for pl in playlists {
        let playlist_full_path = format!("{}/{}", namespace, pl.path);
        let (parent_full_path, playlist_name) = match playlist_full_path.rsplit_once('/') {
            Some((p, n)) => (p.to_string(), n.to_string()),
            None => (namespace.to_string(), playlist_full_path.clone()),
        };

        ensure_folder(&parent_full_path, &mut folders, &mut order);

        let parent = folders
            .get_mut(&parent_full_path)
            .expect("folder was ensured");
        parent.children.push(TreeNodeOut::Playlist(PlaylistNodeOut {
            name: playlist_name,
            full_path: playlist_full_path,
            parent_path: Some(parent_full_path.clone()),
            track_ids: pl.track_ids.clone(),
        }));
    }

    // Now attach child folders to their parents.
    // Process in reverse order so children are placed before parents finalize.
    // We do two passes: first collect parent->child folder relationships.
    let mut child_folders: HashMap<String, Vec<String>> = HashMap::new();
    for full_path in &order {
        if full_path == namespace {
            continue;
        }
        if let Some(folder) = folders.get(full_path) {
            if let Some(parent) = &folder.parent_path {
                child_folders
                    .entry(parent.clone())
                    .or_default()
                    .push(full_path.clone());
            }
        }
    }

    // Bottom-up assemble.
    // Remove folders one-by-one from `folders` and attach them to their parents.
    let mut processed: HashSet<String> = HashSet::new();
    let order_rev: Vec<String> = order.iter().rev().cloned().collect();
    for full_path in &order_rev {
        if full_path == namespace || processed.contains(full_path) {
            continue;
        }
        if let Some(folder) = folders.remove(full_path) {
            let parent_path = folder.parent_path.clone().unwrap_or_default();
            let node = TreeNodeOut::Folder(folder);
            if let Some(parent) = folders.get_mut(&parent_path) {
                parent.children.push(node);
            }
            processed.insert(full_path.clone());
        }
    }

    folders.remove(namespace).expect("root must exist")
}

pub fn count_nodes(root: &FolderNodeOut) -> (usize, usize) {
    let mut folder_count = 0usize;
    let mut playlist_count = 0usize;

    fn walk(node: &TreeNodeOut, folders: &mut usize, playlists: &mut usize) {
        match node {
            TreeNodeOut::Folder(f) => {
                *folders += 1;
                for c in &f.children {
                    walk(c, folders, playlists);
                }
            }
            TreeNodeOut::Playlist(_) => {
                *playlists += 1;
            }
        }
    }

    for c in &root.children {
        walk(c, &mut folder_count, &mut playlist_count);
    }
    (folder_count, playlist_count)
}

pub fn collect_referenced_tracks(root: &FolderNodeOut) -> HashSet<i64> {
    let mut set = HashSet::new();
    fn walk(node: &TreeNodeOut, set: &mut HashSet<i64>) {
        match node {
            TreeNodeOut::Folder(f) => {
                for c in &f.children {
                    walk(c, set);
                }
            }
            TreeNodeOut::Playlist(p) => {
                for id in &p.track_ids {
                    set.insert(*id);
                }
            }
        }
    }
    for c in &root.children {
        walk(c, &mut set);
    }
    set
}
