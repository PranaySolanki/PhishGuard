import * as FileSystem from 'expo-file-system/legacy';

export const WHISPER_MODEL_URL =
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin';

export const MODEL_DIR = ((FileSystem as any).documentDirectory || '') + 'whisper/';
export const MODEL_PATH = MODEL_DIR + 'ggml-base.bin';

export type DownloadStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'downloading'; progress: number; totalMB: number; downloadedMB: number }
  | { state: 'ready'; path: string }
  | { state: 'error'; message: string };

export async function isModelDownloaded(): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(MODEL_PATH);
    return info.exists && (info as any).size > 100_000_000;
  } catch {
    return false;
  }
}

export async function ensureModelDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(MODEL_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });
  }
}

export async function downloadModel(
  onProgress: (status: DownloadStatus) => void
): Promise<string> {
  await ensureModelDir();

  onProgress({ state: 'downloading', progress: 0, totalMB: 142, downloadedMB: 0 });

  const downloadResumable = FileSystem.createDownloadResumable(
    WHISPER_MODEL_URL,
    MODEL_PATH,
    {},
    (downloadProgress) => {
      const { totalBytesWritten, totalBytesExpectedToWrite } = downloadProgress;
      const progress =
        totalBytesExpectedToWrite > 0
          ? totalBytesWritten / totalBytesExpectedToWrite
          : 0;
      const downloadedMB = +(totalBytesWritten / 1_000_000).toFixed(1);
      const totalMB = +(totalBytesExpectedToWrite / 1_000_000).toFixed(1);
      onProgress({ state: 'downloading', progress, totalMB, downloadedMB });
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result?.uri) throw new Error('Download failed — no URI returned');

  onProgress({ state: 'ready', path: result.uri });
  return result.uri;
}

export async function deleteModel(): Promise<void> {
  const exists = await isModelDownloaded();
  if (exists) await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
}

export default function __route() { return null; }
