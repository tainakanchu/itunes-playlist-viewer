use std::fs::File;
use std::io::BufReader;
use std::path::Path;
use std::time::{Duration, Instant};

use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink};

use crate::models::PlaybackState;

pub struct AudioPlayer {
    _stream: Option<OutputStream>,
    stream_handle: Option<OutputStreamHandle>,
    sink: Option<Sink>,
    current_track_id: Option<i64>,
    duration_ms: u64,
    play_started_at: Option<Instant>,
    accumulated_position_ms: u64,
}

// OutputStream internally holds a cpal Stream which is !Send on some platforms
// but we guarantee single-threaded access via Mutex
unsafe impl Send for AudioPlayer {}
unsafe impl Sync for AudioPlayer {}

impl AudioPlayer {
    pub fn new() -> Self {
        let (stream, handle) = match OutputStream::try_default() {
            Ok((s, h)) => (Some(s), Some(h)),
            Err(_) => (None, None),
        };
        AudioPlayer {
            stream_handle: handle,
            _stream: stream,
            sink: None,
            current_track_id: None,
            duration_ms: 0,
            play_started_at: None,
            accumulated_position_ms: 0,
        }
    }

    pub fn play(&mut self, file_path: &str, track_id: i64, duration_ms: u64) -> Result<(), String> {
        self.stop_internal();

        let handle = self
            .stream_handle
            .as_ref()
            .ok_or("No audio output available")?;

        let path = Path::new(file_path);
        if !path.exists() {
            return Err(format!("File not found: {}", file_path));
        }

        let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
        let reader = BufReader::new(file);
        let source = Decoder::new(reader).map_err(|e| format!("Failed to decode audio: {}", e))?;

        let sink = Sink::try_new(handle).map_err(|e| format!("Failed to create sink: {}", e))?;
        sink.append(source);

        self.sink = Some(sink);
        self.current_track_id = Some(track_id);
        self.duration_ms = duration_ms;
        self.play_started_at = Some(Instant::now());
        self.accumulated_position_ms = 0;

        Ok(())
    }

    pub fn pause(&mut self) {
        if let Some(ref sink) = self.sink {
            sink.pause();
            if let Some(started) = self.play_started_at.take() {
                self.accumulated_position_ms += started.elapsed().as_millis() as u64;
            }
        }
    }

    pub fn resume(&mut self) {
        if let Some(ref sink) = self.sink {
            sink.play();
            self.play_started_at = Some(Instant::now());
        }
    }

    pub fn stop(&mut self) {
        self.stop_internal();
    }

    fn stop_internal(&mut self) {
        if let Some(sink) = self.sink.take() {
            sink.stop();
        }
        self.current_track_id = None;
        self.duration_ms = 0;
        self.play_started_at = None;
        self.accumulated_position_ms = 0;
    }

    pub fn seek(&mut self, position_ms: u64) {
        if let Some(ref sink) = self.sink {
            let _ = sink.try_seek(Duration::from_millis(position_ms));
            self.accumulated_position_ms = position_ms;
            if self.play_started_at.is_some() {
                self.play_started_at = Some(Instant::now());
            }
        }
    }

    pub fn is_playing(&self) -> bool {
        self.sink
            .as_ref()
            .is_some_and(|s| !s.is_paused() && !s.empty())
    }

    pub fn get_state(&self) -> PlaybackState {
        let position_ms = self.accumulated_position_ms
            + self
                .play_started_at
                .map(|t| t.elapsed().as_millis() as u64)
                .unwrap_or(0);

        PlaybackState {
            is_playing: self.is_playing(),
            current_track_id: self.current_track_id,
            position_ms: position_ms.min(self.duration_ms.max(1)),
            duration_ms: self.duration_ms,
        }
    }
}
