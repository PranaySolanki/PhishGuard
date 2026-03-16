import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
// TODO: Migrate to expo-audio when SDK 55 ships — expo-audio has known Android stop() bugs in SDK 54
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
let initWhisper: any;
type WhisperContext = any;
try {
  initWhisper = require('whisper.rn').initWhisper;
} catch (e) {
  console.warn('whisper.rn native module not found');
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const CHUNK_DURATION_MS = 3000;   // transcribe every 3 seconds
const LANGUAGE_HINTS = ['hi', 'gu', 'mr', 'en']; const MODEL_PATH = ((FileSystem as any).documentDirectory || '') + 'whisper/ggml-small.bin';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type TranscriptSegment = {
  id: number;
  text: string;
  isPartial: boolean;
  timestamp: number;
};

export type WhisperStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'recording'
  | 'transcribing'
  | 'error';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useWhisperSTT() {
  const [status, setStatus] = useState<WhisperStatus>('idle');
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [fullTranscript, setFullTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const whisperCtx = useRef<WhisperContext | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const segmentIdRef = useRef(0);
  const accumulatedText = useRef('');

  // ── Load model ────────────────────────────────────────────────────────────
  const loadModel = useCallback(async () => {
    if (whisperCtx.current) return; // already loaded
    try {
      setStatus('loading');
      if (!initWhisper) throw new Error("whisper.rn module not linked");
      const module = await initWhisper({ filePath: MODEL_PATH });
      whisperCtx.current = module;
      setStatus('ready');
    } catch (e: any) {
      console.warn('Whisper init failed:', e.message);
      setError(`Model load failed: ${e.message}`);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadModel();
    return () => {
      stopRecording();
      whisperCtx.current?.release?.();
    };
  }, []);

  // ── Request mic permission ─────────────────────────────────────────────
  const requestPermission = async (): Promise<boolean> => {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  };

  // ── Transcribe a single chunk (the current recording URI) ─────────────
  const transcribeChunk = useCallback(async (uri: string) => {
    if (!whisperCtx.current) return;
    setStatus('transcribing');
    try {
      const { result } = await whisperCtx.current.transcribe(uri, {
        language: detectLanguageHint(accumulatedText.current),
        maxLen: 1,           // word-level segmentation
        tokenTimestamps: true,
        noContext: false,
        audioCtx: true,
        // Suppress non-speech tokens for noisy audio
        suppressBlank: true,
        entropyThold: 2.8,   // higher = more aggressive noise suppression
        logprobThold: -1.0,
      });

      const cleaned = result.trim();
      if (cleaned && cleaned !== '[BLANK_AUDIO]' && cleaned !== '[ Silence ]') {
        accumulatedText.current += ' ' + cleaned;
        setFullTranscript(accumulatedText.current.trim());

        const newSeg: TranscriptSegment = {
          id: segmentIdRef.current++,
          text: cleaned,
          isPartial: false,
          timestamp: Date.now(),
        };
        setSegments(prev => [...prev, newSeg]);
      }
    } catch {
      // chunk failed silently — continue recording
    } finally {
      setStatus('recording');
    }
  }, []);

  // ── Detect best language hint from accumulated text ────────────────────
  const detectLanguageHint = (text: string): string => {
    if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Devanagari → Hindi/Marathi
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'; // Gujarati
    return 'hi'; // default to Hindi for Indian context
  };

  // ── Start recording in rolling chunks ─────────────────────────────────
  const startRecording = useCallback(async () => {
    if (status === 'loading') {
      setError('Model is still loading, please wait...');
      return;
    }
    const granted = await requestPermission();
    if (!granted) {
      setError('Microphone permission denied');
      return;
    }

    setSegments([]);
    setFullTranscript('');
    setElapsedSeconds(0);
    accumulatedText.current = '';
    segmentIdRef.current = 0;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const startChunk = async () => {
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,   // Whisper expects 16kHz
          numberOfChannels: 1, // mono
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      });
      await rec.startAsync();
      recordingRef.current = rec;
    };

    await startChunk();
    setStatus('recording');

    // Clock timer
    clockTimerRef.current = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);

    // Chunk timer — stop current recording, transcribe, start new one
    chunkTimerRef.current = setInterval(async () => {
      const current = recordingRef.current;
      if (!current) return;
      try {
        await current.stopAndUnloadAsync();
        const uri = current.getURI();
        recordingRef.current = null;
        if (uri) transcribeChunk(uri);
      } catch {}
      await startChunk();
    }, CHUNK_DURATION_MS);
  }, [status, transcribeChunk]);

  // ── Stop recording ────────────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    if (chunkTimerRef.current) { clearInterval(chunkTimerRef.current); chunkTimerRef.current = null; }
    if (clockTimerRef.current) { clearInterval(clockTimerRef.current); clockTimerRef.current = null; }

    const current = recordingRef.current;
    if (current) {
      try {
        await current.stopAndUnloadAsync();
        const uri = current.getURI();
        recordingRef.current = null;
        if (uri) await transcribeChunk(uri); // transcribe last chunk
      } catch {}
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    setStatus('ready');
  }, [transcribeChunk]);

  const resetTranscript = useCallback(() => {
    setSegments([]);
    setFullTranscript('');
    accumulatedText.current = '';
    segmentIdRef.current = 0;
  }, []);

  return {
    status,
    segments,
    fullTranscript,
    error,
    elapsedSeconds,
    isRecording: status === 'recording' || status === 'transcribing',
    isLoading: status === 'loading',
    isReady: status === 'ready',
    startRecording,
    stopRecording,
    resetTranscript,
  };
}

export default function __route() { return null; }
