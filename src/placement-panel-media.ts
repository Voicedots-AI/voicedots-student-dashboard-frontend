export type PlacementPanelMedia = {
  studentId: string;
  driveId: string;
  screen: MediaStream;
  camera: MediaStream | null;
};
declare global { interface Window { __placementPanelMedia?: PlacementPanelMedia } }

export function placementMediaReady(media: PlacementPanelMedia | undefined, studentId: string, driveId: string) {
  const live = (track: MediaStreamTrack) => track.readyState === 'live' && track.enabled && !track.muted;
  return !!media && media.studentId === studentId && media.driveId === driveId
    && media.screen.getVideoTracks().some(track => live(track) && track.getSettings().displaySurface === 'monitor')
    && !!media.camera?.getVideoTracks().some(live)
    && !!media.camera?.getAudioTracks().some(live);
}

export async function waitForPlacementMedia(media: PlacementPanelMedia, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (!placementMediaReady(media, media.studentId, media.driveId)) {
    const tracks = [...media.screen.getVideoTracks(), ...(media.camera?.getTracks() || [])];
    if (!media.screen.getVideoTracks().length || !media.camera?.getVideoTracks().length || !media.camera?.getAudioTracks().length
        || tracks.some(track => track.readyState === 'ended')) {
      throw new Error('Camera, microphone or screen sharing stopped. Allow interview access again.');
    }
    if (Date.now() >= deadline) throw new Error('Camera or microphone is not sending a signal. Check browser permissions and device privacy settings, then retry.');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

export function releasePlacementPanelMedia() {
  const media = window.__placementPanelMedia;
  media?.screen.getTracks().forEach(track => track.stop());
  media?.camera?.getTracks().forEach(track => track.stop());
  delete window.__placementPanelMedia;
}
