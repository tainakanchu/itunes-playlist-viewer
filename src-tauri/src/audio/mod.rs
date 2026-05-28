use std::fs::File;
use std::io::BufReader;
use std::path::Path;
use std::time::{Duration, Instant};

use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink, Source};
use serde::{Deserialize, Serialize};

use crate::models::PlaybackState;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RepeatMode {
    Off,
    All,
    One,
}

pub struct AudioPlayer {
    _stream: Option<OutputStream>,
    stream_handle: Option<OutputStreamHandle>,
    sink: Option<Sink>,
    current_track_id: Option<i64>,
    duration_ms: u64,
    play_started_at: Option<Instant>,
    accumulated_position_ms: u64,
    volume: f32,

    queue: Vec<i64>,
    queue_index: Option<usize>,
    shuffle: bool,
    repeat: RepeatMode,
    /// `set_track_played` でフロントから「曲が終わった」と通知された後、
    /// `is_finished()` で次曲に進めるべきか判定するための sentinel。
    finished_for_advance: bool,
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
            volume: 1.0,

            queue: Vec::new(),
            queue_index: None,
            shuffle: false,
            repeat: RepeatMode::Off,
            finished_for_advance: false,
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

        // Prefer the decoded source's reported duration when available.
        let actual_duration = source.total_duration().map(|d| d.as_millis() as u64);

        let sink = Sink::try_new(handle).map_err(|e| format!("Failed to create sink: {}", e))?;
        sink.set_volume(self.volume);
        sink.append(source);

        self.sink = Some(sink);
        self.current_track_id = Some(track_id);
        self.duration_ms = actual_duration.unwrap_or(duration_ms);
        self.play_started_at = Some(Instant::now());
        self.accumulated_position_ms = 0;
        self.finished_for_advance = false;

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
        self.finished_for_advance = false;
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

    pub fn set_volume(&mut self, v: f32) {
        let clamped = v.clamp(0.0, 1.0);
        self.volume = clamped;
        if let Some(ref sink) = self.sink {
            sink.set_volume(clamped);
        }
    }

    pub fn volume(&self) -> f32 {
        self.volume
    }

    pub fn is_playing(&self) -> bool {
        self.sink
            .as_ref()
            .is_some_and(|s| !s.is_paused() && !s.empty())
    }

    /// 現在の sink が完了しているか (キュー進行判定用)。
    pub fn is_finished(&mut self) -> bool {
        if let Some(ref sink) = self.sink {
            if sink.empty() && !self.finished_for_advance {
                self.finished_for_advance = true;
                return true;
            }
        }
        false
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

    // ===== Queue management =====

    pub fn set_queue(&mut self, track_ids: Vec<i64>, start_index: usize) {
        self.queue = track_ids;
        self.queue_index = if self.queue.is_empty() {
            None
        } else {
            Some(start_index.min(self.queue.len() - 1))
        };
    }

    pub fn enqueue(&mut self, track_id: i64) {
        self.queue.push(track_id);
    }

    pub fn clear_queue(&mut self) {
        self.queue.clear();
        self.queue_index = None;
    }

    pub fn queue(&self) -> &[i64] {
        &self.queue
    }

    pub fn queue_index(&self) -> Option<usize> {
        self.queue_index
    }

    pub fn set_shuffle(&mut self, on: bool) {
        self.shuffle = on;
    }

    pub fn shuffle(&self) -> bool {
        self.shuffle
    }

    pub fn set_repeat(&mut self, mode: RepeatMode) {
        self.repeat = mode;
    }

    pub fn repeat(&self) -> RepeatMode {
        self.repeat
    }

    /// 次に再生すべき track_id を計算 (キュー上のインデックスも進める)。
    /// - shuffle が ON ならランダム
    /// - repeat = One なら現在の曲を返す
    /// - repeat = All なら末尾で先頭に戻る
    pub fn advance_next(&mut self) -> Option<i64> {
        if self.queue.is_empty() {
            return None;
        }

        if matches!(self.repeat, RepeatMode::One) {
            return self.queue_index.and_then(|i| self.queue.get(i).copied());
        }

        let next_index = if self.shuffle {
            pseudo_random_index(self.queue.len(), self.queue_index)
        } else {
            match self.queue_index {
                Some(i) if i + 1 < self.queue.len() => Some(i + 1),
                Some(_) => {
                    if matches!(self.repeat, RepeatMode::All) {
                        Some(0)
                    } else {
                        None
                    }
                }
                None => Some(0),
            }
        };

        self.queue_index = next_index;
        next_index.and_then(|i| self.queue.get(i).copied())
    }

    pub fn advance_prev(&mut self) -> Option<i64> {
        if self.queue.is_empty() {
            return None;
        }
        let next_index = match self.queue_index {
            Some(0) => {
                if matches!(self.repeat, RepeatMode::All) {
                    Some(self.queue.len() - 1)
                } else {
                    Some(0)
                }
            }
            Some(i) => Some(i - 1),
            None => Some(0),
        };
        self.queue_index = next_index;
        next_index.and_then(|i| self.queue.get(i).copied())
    }
}

/// std::time ベースの粗いランダム (`rand` 依存を増やさずに済ませる)。
fn pseudo_random_index(len: usize, exclude: Option<usize>) -> Option<usize> {
    if len == 0 {
        return None;
    }
    if len == 1 {
        return Some(0);
    }
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.subsec_nanos() as usize)
        .unwrap_or(0);
    let mut idx = nanos % len;
    if Some(idx) == exclude {
        idx = (idx + 1) % len;
    }
    Some(idx)
}
