/**
 * Real microphone recording using MediaRecorder API.
 * Handles permission requests, recording lifecycle, and blob generation.
 */

import {
  getMicPreflightError,
  mapGetUserMediaError,
} from "@/lib/microphoneAccess";

export type RecorderState =
  | "idle"
  | "requesting_permission"
  | "recording"
  | "stopping"
  | "ready"
  | "error";

export interface RecorderCallbacks {
  onStateChange: (state: RecorderState) => void;
  onDurationUpdate: (seconds: number) => void;
  onError: (message: string) => void;
  onAudioLevel: (level: number) => void; // 0–1 for waveform
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private analyserTimer: ReturnType<typeof setInterval> | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private durationSeconds = 0;
  private callbacks: RecorderCallbacks;

  constructor(callbacks: RecorderCallbacks) {
    this.callbacks = callbacks;
  }

  async requestPermissionAndStart(): Promise<void> {
    const preflight = getMicPreflightError();
    if (preflight) {
      this.callbacks.onError(preflight);
      this.callbacks.onStateChange("error");
      return;
    }

    this.callbacks.onStateChange("requesting_permission");

    try {
      // Avoid strict sampleRate — it causes OverconstrainedError on many devices/browsers.
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (err: unknown) {
      const { message } = mapGetUserMediaError(err);
      this.callbacks.onError(message);
      this.callbacks.onStateChange("error");
      return;
    }

    this.startRecording();
  }

  private startRecording(): void {
    if (!this.stream) return;

    this.chunks = [];
    this.durationSeconds = 0;

    // Pick best supported format
    const mimeType = this.getSupportedMimeType();

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
    } catch {
      // Fallback without specifying mimeType
      this.mediaRecorder = new MediaRecorder(this.stream);
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.mediaRecorder.onerror = () => {
      this.callbacks.onError("Recording error occurred.");
      this.callbacks.onStateChange("error");
      this.cleanup();
    };

    // Collect data every 250ms for smoother blobs
    this.mediaRecorder.start(250);
    this.callbacks.onStateChange("recording");

    // Duration counter
    this.durationTimer = setInterval(() => {
      this.durationSeconds++;
      this.callbacks.onDurationUpdate(this.durationSeconds);
    }, 1000);

    // Audio level analyser for waveform visualization
    this.setupAudioAnalyser();
  }

  private setupAudioAnalyser(): void {
    if (!this.stream) return;
    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyserTimer = setInterval(() => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        this.callbacks.onAudioLevel(Math.min(avg / 128, 1));
      }, 50);
    } catch {
      // Analyser is optional — don't fail recording if it errors
    }
  }

  async stop(): Promise<Blob | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
      return null;
    }

    this.callbacks.onStateChange("stopping");

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || "audio/webm";
        const blob = new Blob(this.chunks, { type: mimeType });
        this.cleanup();
        this.callbacks.onStateChange("ready");
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanup(): void {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    if (this.analyserTimer) {
      clearInterval(this.analyserTimer);
      this.analyserTimer = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.analyser = null;
    this.mediaRecorder = null;
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    this.cleanup();
    this.callbacks.onStateChange("idle");
  }

  get isRecording(): boolean {
    return this.mediaRecorder?.state === "recording";
  }

  private getSupportedMimeType(): string {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return "";
  }
}

/** Convert a Blob to a File with a proper name for upload */
export function blobToFile(blob: Blob, filename = "recording.webm"): File {
  return new File([blob], filename, { type: blob.type });
}

/** Format seconds as mm:ss */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
