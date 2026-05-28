use crate::models::DiscToc;

/// 指定デバイスの TOC を libdiscid 経由で読み取り、MusicBrainz disc id を計算する。
///
/// Windows は libdiscid の入手が面倒なため未対応 (エラーを返す)。
#[cfg(unix)]
pub fn detect_disc(device: &str) -> Result<DiscToc, String> {
    use discid::DiscId;

    let device_opt = if device.is_empty() { None } else { Some(device) };

    let disc = DiscId::read(device_opt).map_err(|e| {
        format!(
            "Failed to read disc from {}: {}. Insert an audio CD and check the drive path.",
            device, e
        )
    })?;

    let first = disc.first_track_num();
    let last = disc.last_track_num();
    let total_sectors = disc.sectors();

    let mut track_lengths_sec = Vec::with_capacity((last - first + 1) as usize);
    for t in disc.tracks() {
        track_lengths_sec.push((t.sectors as u32) / 75);
    }

    Ok(DiscToc {
        freedb_id: disc.freedb_id().to_string(),
        musicbrainz_id: Some(disc.id().to_string()),
        device: device.to_string(),
        track_count: (last - first + 1) as usize,
        track_lengths_sec,
        total_sectors: total_sectors as u32,
    })
}

#[cfg(not(unix))]
pub fn detect_disc(_device: &str) -> Result<DiscToc, String> {
    Err(
        "CD detection is not supported on this platform yet. \
         Use the Linux/macOS build for physical CD ripping, \
         or paste a TOC manually and use `compute_disc_id` to look it up on MusicBrainz."
            .to_string(),
    )
}
