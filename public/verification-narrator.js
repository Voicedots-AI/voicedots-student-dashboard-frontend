export async function verifyIdentityWithNarration({ verify, speak, onVerified, onFailed }) {
  try {
    await verify();
  } catch (error) {
    const text = "I couldn't verify your identity. Please face the camera in steady light, blink naturally, and try again.";
    onFailed(text);
    await speak(text);
    throw error;
  }
  const text = "Identity verified successfully. Thank you. Let's get your interview ready.";
  onVerified(text);
  await speak(text);
}

/** One narrator for pre-interview guidance. No silent fallback or voice switch. */
export function createVerificationNarrator({
  fetchAudio,
  onSpeaking = () => {},
  onStatus = () => {},
  onRetry = () => {},
  makePlayer = url => new Audio(url),
  createUrl = blob => URL.createObjectURL(blob),
  revokeUrl = url => URL.revokeObjectURL(url),
  playbackTimeout = 60000,
}) {
  let current = null;

  function cancel() {
    if (!current) return;
    const speech = current;
    current = null;
    speech.controller.abort();
    speech.cleanup();
    speech.reject(new DOMException('Verification narration cancelled.', 'AbortError'));
  }

  function speak(text) {
    cancel();
    return new Promise((resolve, reject) => {
      let player = null;
      let url = null;
      let timer = null;
      let busy = false;
      const controller = new AbortController();
      const speech = { controller, reject, cleanup };
      current = speech;
      const active = () => current === speech && !controller.signal.aborted;

      function clearPlayer() {
        clearTimeout(timer);
        timer = null;
        if (player) {
          player.onplaying = player.onended = player.onerror = null;
          player.pause();
          player = null;
        }
        if (url) revokeUrl(url);
        url = null;
        onSpeaking(false);
      }

      function cleanup() {
        clearPlayer();
        onRetry(null);
      }

      function failed(error) {
        if (!active()) return;
        busy = false;
        clearTimeout(timer);
        onSpeaking(false);
        if (error?.retryable === false) {
          current = null;
          cleanup();
          reject(error);
          return;
        }
        const blocked = error?.name === 'NotAllowedError';
        if (!blocked) clearPlayer();
        onStatus(blocked
          ? "Select Play Priya's voice to enable sound and continue."
          : error?.message || "Priya's voice could not play. Select Retry voice to continue.");
        // Keep already-generated audio when the browser only needs a click.
        onRetry(attempt, blocked ? "Play Priya's voice" : 'Retry voice');
      }

      async function attempt() {
        if (!active() || busy) return;
        busy = true;
        onRetry(null);
        onStatus(player ? "Starting Priya's voice…" : "Preparing Priya's voice…");
        try {
          if (!player) {
            const blob = await fetchAudio(text, controller.signal);
            if (!active()) return;
            if (!blob?.size || !blob.type.startsWith('audio/')) {
              throw new Error("Priya's voice returned no playable audio. Select Retry voice.");
            }
            url = createUrl(blob);
            player = makePlayer(url);
            player.volume = 1;
            player.muted = false;
            player.playbackRate = 1;
            player.onplaying = () => {
              if (!active()) return;
              onSpeaking(true);
              onStatus('Priya is speaking…');
            };
            player.onended = () => {
              if (!active()) return;
              current = null;
              cleanup();
              onStatus('');
              resolve();
            };
            player.onerror = () => failed(new Error('Audio playback failed. Select Retry voice.'));
          }
          timer = setTimeout(() => failed(new Error('Audio playback stopped. Select Retry voice.')), playbackTimeout);
          // On a retry this runs directly in the click gesture, without another fetch.
          await player.play();
          busy = false;
        } catch (error) {
          failed(error);
        }
      }
      void attempt();
    });
  }

  return { speak, cancel };
}
