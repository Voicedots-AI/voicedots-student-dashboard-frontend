export type PlacementPanelMedia = {
  studentId: string;
  driveId: string;
  screen: MediaStream;
  camera: MediaStream | null;
};
declare global { interface Window { __placementPanelMedia?: PlacementPanelMedia } }

export function releasePlacementPanelMedia() {
  const media = window.__placementPanelMedia;
  media?.screen.getTracks().forEach(track => track.stop());
  media?.camera?.getTracks().forEach(track => track.stop());
  delete window.__placementPanelMedia;
}
