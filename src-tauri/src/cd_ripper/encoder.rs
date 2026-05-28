use std::path::Path;
use std::process::Command;

use crate::models::EncodeFormat;

pub struct EncodeMeta<'a> {
    pub title: Option<&'a str>,
    pub artist: Option<&'a str>,
    pub album: Option<&'a str>,
    pub album_artist: Option<&'a str>,
    pub track_number: Option<u32>,
    pub track_count: Option<u32>,
    pub date: Option<&'a str>,
}

pub fn encode(
    format: EncodeFormat,
    input: &Path,
    output: &Path,
    meta: &EncodeMeta,
) -> Result<(), String> {
    match format {
        EncodeFormat::Wav => {
            std::fs::copy(input, output).map_err(|e| format!("Copy failed: {}", e))?;
            Ok(())
        }
        EncodeFormat::Flac => encode_flac(input, output, meta),
        EncodeFormat::Mp3 => encode_mp3(input, output, meta),
        EncodeFormat::Alac => encode_alac(input, output, meta),
    }
}

fn encode_flac(input: &Path, output: &Path, meta: &EncodeMeta) -> Result<(), String> {
    let mut cmd = Command::new("flac");
    cmd.arg("-f").arg("-8").arg("-s");
    if let Some(t) = meta.title {
        cmd.arg(format!("--tag=TITLE={}", t));
    }
    if let Some(a) = meta.artist {
        cmd.arg(format!("--tag=ARTIST={}", a));
    }
    if let Some(al) = meta.album {
        cmd.arg(format!("--tag=ALBUM={}", al));
    }
    if let Some(aa) = meta.album_artist {
        cmd.arg(format!("--tag=ALBUMARTIST={}", aa));
    }
    if let Some(d) = meta.date {
        cmd.arg(format!("--tag=DATE={}", d));
    }
    match (meta.track_number, meta.track_count) {
        (Some(n), Some(c)) => {
            cmd.arg(format!("--tag=TRACKNUMBER={}", n));
            cmd.arg(format!("--tag=TRACKTOTAL={}", c));
        }
        (Some(n), None) => {
            cmd.arg(format!("--tag=TRACKNUMBER={}", n));
        }
        _ => {}
    }
    cmd.arg("-o").arg(output).arg(input);

    run(cmd, "flac")
}

fn encode_mp3(input: &Path, output: &Path, meta: &EncodeMeta) -> Result<(), String> {
    let mut cmd = Command::new("lame");
    cmd.arg("-b").arg("320").arg("--quiet");
    if let Some(t) = meta.title {
        cmd.arg("--tt").arg(t);
    }
    if let Some(a) = meta.artist {
        cmd.arg("--ta").arg(a);
    }
    if let Some(al) = meta.album {
        cmd.arg("--tl").arg(al);
    }
    if let Some(d) = meta.date {
        cmd.arg("--ty").arg(d);
    }
    if let Some(n) = meta.track_number {
        let s = match meta.track_count {
            Some(c) => format!("{}/{}", n, c),
            None => n.to_string(),
        };
        cmd.arg("--tn").arg(s);
    }
    cmd.arg(input).arg(output);

    run(cmd, "lame")
}

fn encode_alac(input: &Path, output: &Path, meta: &EncodeMeta) -> Result<(), String> {
    let mut cmd = Command::new("ffmpeg");
    cmd.arg("-y").arg("-loglevel").arg("error");
    cmd.arg("-i").arg(input);
    cmd.arg("-c:a").arg("alac");
    if let Some(t) = meta.title {
        cmd.arg("-metadata").arg(format!("title={}", t));
    }
    if let Some(a) = meta.artist {
        cmd.arg("-metadata").arg(format!("artist={}", a));
    }
    if let Some(al) = meta.album {
        cmd.arg("-metadata").arg(format!("album={}", al));
    }
    if let Some(aa) = meta.album_artist {
        cmd.arg("-metadata").arg(format!("album_artist={}", aa));
    }
    if let Some(d) = meta.date {
        cmd.arg("-metadata").arg(format!("date={}", d));
    }
    if let Some(n) = meta.track_number {
        let s = match meta.track_count {
            Some(c) => format!("{}/{}", n, c),
            None => n.to_string(),
        };
        cmd.arg("-metadata").arg(format!("track={}", s));
    }
    cmd.arg(output);

    run(cmd, "ffmpeg")
}

fn run(mut cmd: Command, name: &str) -> Result<(), String> {
    let status = cmd.status().map_err(|e| {
        format!(
            "`{}` not found ({}). Make sure it's in PATH (use `nix develop`).",
            name, e
        )
    })?;
    if !status.success() {
        return Err(format!("{} exited with status {}", name, status));
    }
    Ok(())
}
