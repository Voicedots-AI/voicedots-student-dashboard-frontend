import { ApiError, json, request } from './api';

// Share the cooldown across the popup and call page; never switch Rajesh to a different voice.
let retryAfter = 0;
let unavailableMessage = '';
export async function requestCoachSpeech(text: string, signal: AbortSignal): Promise<Blob> {
  if (Date.now() < retryAfter) throw new Error(unavailableMessage);
  try {
    const response = await request('/api/student/coach/officer/speech', {
      ...json({ text }), signal, timeoutMs: 65000,
    });
    const blob = await response.blob();
    if (!blob.size) throw new Error('Coach voice returned no audio. You can continue using the conversation text.');
    if (!blob.type.startsWith('audio/')) throw new Error('Coach voice returned an unexpected response. Please retry; if it continues, contact support.');
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
