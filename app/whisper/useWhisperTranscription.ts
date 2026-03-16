import { useEffect, useRef, useState } from 'react';
// TODO: Migrate to expo-audio when SDK 55 ships — expo-audio has known Android stop() bugs in SDK 54
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { redactPII } from '../data/piiRedactor';
let initWhisper: any;
type WhisperContext = any;
try {
  initWhisper = require('whisper.rn').initWhisper;
} catch (e) {
  console.warn('whisper.rn native module not found (likely running in Expo Go)');
}

export type TranscriptSegment = {
  text: string;        // redacted text shown to user
  isPhishing: boolean;
  wasRedacted: boolean; // true if PII was found and masked in this chunk
};

const PHISHING_KEYWORDS = [
  'otp', 'account', 'block', 'band', 'kyc', 'verify', 'click', 'link',
  'urgent', 'immediately', 'suspended', 'frozen', 'fraud', 'rbi', 'sbi',
  'bank', 'reward', 'prize', 'claim', 'expire', 'password', 'pin',
  'खाता', 'बंद', 'ओटीपी', 'तुरंत', 'लिंक', 'ब्लॉक', 'पासवर्ड',
  'ખાતું', 'બ્લોક', 'OTP', 'તાત્કાળ',
  'खाते', 'बंद', 'ओटीपी', 'तातडीने',
];

const hasPhishingKeyword = (text: string): boolean => {
  const lower = text.toLowerCase();
  return PHISHING_KEYWORDS.some(k => lower.includes(k.toLowerCase()));
};

const MODEL_PATH = ((FileSystem as any).documentDirectory || '') + 'whisper/ggml-base.bin';

export function useWhisperTranscription() {
  const [isRecording, setIsRecording] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [riskScore, setRiskScore] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isModelReady, setIsModelReady] = useState(false);

  const whisperRef = useRef<WhisperContext | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const allTextRef = useRef('');

  useEffect(() => {
    loadModel();
    return () => cleanup();
  }, []);

  const loadModel = async () => {
    try {
      const info = await FileSystem.getInfoAsync(MODEL_PATH);
      if (!info.exists) {
        console.warn('Whisper model not found at', MODEL_PATH);
        return;
      }
      if (initWhisper) {
        whisperRef.current = await initWhisper({ filePath: MODEL_PATH });
        setIsModelReady(true);
      } else {
        console.warn('Whisper not initialized: module unavailable');
      }
    } catch (e) {
      console.error('Whisper init failed:', e);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      setSegments([]);
      setRiskScore(0);
      setSeconds(0);
      allTextRef.current = '';
      setIsRecording(true);

      await startChunk();

      timerRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);

      chunkTimerRef.current = setInterval(async () => {
        await processChunk();
        await startChunk();
      }, 4000);
    } catch (e) {
      console.error('Recording start failed:', e);
    }
  };

  const startChunk = async () => {
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
    }
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;
  };

  const processChunk = async () => {
    if (!recordingRef.current || !whisperRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      if (!uri) return;

      const { result } = await whisperRef.current.transcribe(uri, {
        language: 'auto',
        maxLen: 1,
        tokenTimestamps: false,
      });

      const rawText = result?.trim();
      if (!rawText) return;

      // 🛡 Redact PII before any further processing or storage
      const { redacted: text, hadPII } = redactPII(rawText);

      allTextRef.current += ' ' + text;

      const isPhish = hasPhishingKeyword(text);
      setSegments(prev => [...prev, { text, isPhishing: isPhish, wasRedacted: hadPII }]);

      const phishCount = allTextRef.current
        .split(' ')
        .filter(w => hasPhishingKeyword(w)).length;
      const totalWords = allTextRef.current.split(' ').length;
      const newScore = Math.min(95, Math.round((phishCount / Math.max(totalWords, 1)) * 300));
      setRiskScore(newScore);

      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (e) {
      console.error('Transcription chunk failed:', e);
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);

    await processChunk();
    setIsRecording(false);
  };

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
    }
  };

  const reset = () => {
    setSegments([]);
    setRiskScore(0);
    setSeconds(0);
    allTextRef.current = '';
  };

  return {
    isRecording,
    isModelReady,
    segments,
    riskScore,
    seconds,
    startRecording,
    stopRecording,
    reset,
  };
}

export default function __route() { return null; }
