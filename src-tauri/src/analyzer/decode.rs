//! 音声ファイルを解析用のモノラル f32 PCM にデコードする (symphonia)。
//!
//! rodio と同じ symphonia を共有するので追加の native 依存は無い。
//! どのサンプル形式でも `SampleBuffer<f32>` 経由で f32 に統一し、
//! 全チャンネルを平均してモノ化する。

use std::fs::File;
use std::path::Path;

use symphonia::core::audio::{AudioBufferRef, SampleBuffer};
use symphonia::core::codecs::{DecoderOptions, CODEC_TYPE_NULL};
use symphonia::core::errors::Error as SymError;
use symphonia::core::formats::FormatOptions;
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::MetadataOptions;
use symphonia::core::probe::Hint;

/// ファイルをモノラル f32 にデコードして `(samples, sample_rate)` を返す。
pub fn decode_mono(path: &str) -> Result<(Vec<f32>, u32), String> {
    let file = File::open(Path::new(path)).map_err(|e| format!("open failed: {e}"))?;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    if let Some(ext) = Path::new(path).extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }

    let probed = symphonia::default::get_probe()
        .format(
            &hint,
            mss,
            &FormatOptions::default(),
            &MetadataOptions::default(),
        )
        .map_err(|e| format!("probe failed: {e}"))?;
    let mut format = probed.format;

    let track = format
        .tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
        .ok_or("no decodable audio track")?;
    let track_id = track.id;
    let sample_rate = track
        .codec_params
        .sample_rate
        .ok_or("unknown sample rate")?;

    let mut decoder = symphonia::default::get_codecs()
        .make(&track.codec_params, &DecoderOptions::default())
        .map_err(|e| format!("decoder init failed: {e}"))?;

    let mut samples: Vec<f32> = Vec::new();

    loop {
        let packet = match format.next_packet() {
            Ok(p) => p,
            // 通常の終端 (EOF) と reset 要求はループ終了とみなす。
            Err(SymError::IoError(e)) if e.kind() == std::io::ErrorKind::UnexpectedEof => break,
            Err(SymError::ResetRequired) => break,
            Err(e) => return Err(format!("read packet failed: {e}")),
        };
        if packet.track_id() != track_id {
            continue;
        }
        match decoder.decode(&packet) {
            Ok(decoded) => append_mono(decoded, &mut samples),
            // 壊れたパケットは飛ばして続行。
            Err(SymError::DecodeError(_)) => continue,
            Err(SymError::IoError(_)) => break,
            Err(e) => return Err(format!("decode failed: {e}")),
        }
    }

    if samples.is_empty() {
        return Err("decoded zero samples".to_string());
    }
    Ok((samples, sample_rate))
}

/// デコード済みバッファをチャンネル平均でモノ化して push する。
fn append_mono(decoded: AudioBufferRef, out: &mut Vec<f32>) {
    let spec = *decoded.spec();
    let channels = spec.channels.count().max(1);
    let duration = decoded.capacity() as u64;

    let mut buf = SampleBuffer::<f32>::new(duration, spec);
    buf.copy_interleaved_ref(decoded);

    for frame in buf.samples().chunks(channels) {
        let sum: f32 = frame.iter().copied().sum();
        out.push(sum / channels as f32);
    }
}
