import { ApiError, json, request } from './api';

// Share the cooldown across the popup and call page; never switch Rajesh to a different voice.
let retryAfter = 0;
let unavailableMessage = '';
let cacheOwner = '';
const speechAudio = new Map<string, {blob: Blob; expires: number}>();
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
export async function requestCoachSpeech(text: string, signal: AbortSignal, owner = ''): Promise<Blob> {
  signal.throwIfAborted();
  // Private in-memory replay only; never persist guidance in browser storage.
  if (owner !== cacheOwner) { speechAudio.clear(); cacheOwner = owner; }
  const now = Date.now();
  for (const [key, entry] of speechAudio) if (entry.expires <= now) speechAudio.delete(key);
  const cached = owner ? speechAudio.get(text) : undefined;
  if (cached) {
    speechAudio.delete(text);
    speechAudio.set(text, cached);
    return cached.blob;
  }
  if (Date.now() < retryAfter) throw new Error(unavailableMessage);
  try {
    const response = await request('/api/student/coach/officer/speech', {
      ...json({ text }), signal, timeoutMs: 65000,
    });
    const blob = await response.blob();
    if (!blob.size) throw new Error('Coach voice returned no audio. You can continue using the conversation text.');
    if (!blob.type.startsWith('audio/')) throw new Error('Coach voice returned an unexpected response. Please retry; if it continues, contact support.');
    signal.throwIfAborted();
    if (owner && owner === cacheOwner && blob.size <= MAX_AUDIO_BYTES) {
      speechAudio.delete(text);
      let bytes = [...speechAudio.values()].reduce((total, entry) => total + entry.blob.size, 0);
      while (speechAudio.size && (bytes + blob.size > MAX_AUDIO_BYTES || speechAudio.size >= 24)) {
        const oldest = speechAudio.keys().next().value!;
        bytes -= speechAudio.get(oldest)!.blob.size;
        speechAudio.delete(oldest);
      }
      speechAudio.set(text, {blob, expires: Date.now() + 300000});
    }
    return blob;
  } catch (cause) {
    if (cause instanceof ApiError && (cause.status === 404 || cause.status === 405)) {
      throw new Error('Coach voice is not available on this server yet. Please contact support. You can still read your feedback; retrying will not fix a missing service.');
    }
    if (cause instanceof ApiError && (cause.status === 503 || cause.status === 429)) {
      retryAfter = Date.now() + 60000;
      unavailableMessage = cause.message;
    }
    throw cause;
  }
}
