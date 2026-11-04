export function interviewMediaReady(stream) {
  const usable = track => track.readyState === 'live' && track.enabled && !track.muted;
  return !!stream?.getVideoTracks().some(usable) && !!stream?.getAudioTracks().some(usable);
}

async function waitForSignal(stream, timeoutMs) {
  const until = Date.now() + timeoutMs;
  while (!interviewMediaReady(stream)) {
    const tracks = stream?.getTracks() || [];
    if (!stream?.getVideoTracks().length || !stream?.getAudioTracks().length
        || tracks.some(track => track.readyState === 'ended')) return false;
    if (Date.now() >= until) return false;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return true;
}

export async function acquireInterviewMedia({handoff, acquire, attach, handoffWaitMs = 1500, freshWaitMs = 10000}) {
  if (handoff?.camera) {
    attach(handoff.camera);
    if (await waitForSignal(handoff.camera, handoffWaitMs)) return handoff.camera;
    // Do not keep reusing an ended/privacy-muted stream on every retry.
    handoff.camera.getTracks().forEach(track => track.stop());
    handoff.camera = null;
  }
  let stream;
  try {
    stream = await acquire();
    attach(stream);
    if (!await waitForSignal(stream, freshWaitMs)) {
      throw new Error('Camera or microphone is not sending a signal. Check device privacy settings or close another app using the camera, then retry.');
    }
    if (handoff) handoff.camera = stream;
    return stream;
  } catch (cause) {
    stream?.getTracks().forEach(track => track.stop());
    if (cause?.name === 'NotAllowedError') throw new Error('Camera or microphone access was denied. Allow both in browser site permissions, then select Retry in this panel.');
    if (cause?.name === 'NotFoundError') throw new Error('A camera and microphone are required. Connect both devices, then retry.');
    if (cause?.name === 'NotReadableError') throw new Error('The camera or microphone is busy or blocked by device privacy settings. Close other camera apps, then retry.');
    throw cause;
  }
}
