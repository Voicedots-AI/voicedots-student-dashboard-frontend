/* Numeric observations only. Reuses the interview's existing MediaPipe Face
 * Landmarker output. No new stream, canvas, frame/video retention or upload.
 * gaze_on_screen_pct is a camera-facing geometric proxy, not calibrated gaze
 * tracking and never an attention, interest or emotion measurement.
 */
export function createInterviewObservations() {
  let enabled=false, samples=0, visible=0, gazeSamples=0, facing=0, prior=null, movement=0, moves=0;
  let listeningAt=null, latencyTotal=0, latencyCount=0, previousAt=null;
  return {
    start({consent,cameraUsed}) { enabled=consent===true&&cameraUsed===true; },
    sample(landmarks, {timestamp=performance.now(),cameraFacing=null}={}) {
      if(!enabled)return;
      // Fixed-rate sampling avoids weighting faster devices more heavily.
      if(previousAt!==null&&timestamp-previousAt<900)return;
      previousAt=timestamp;samples++;
      if(!landmarks?.length){prior=null;return;}
      visible++;
      if(typeof cameraFacing==='boolean'){gazeSamples++;if(cameraFacing)facing++;}
      const left=landmarks[33],right=landmarks[263],nose=landmarks[1];
      if(!left||!right||!nose)return;
      const width=Math.hypot(right.x-left.x,right.y-left.y);
      if(width<.01)return;
      const pose=[(nose.x-(left.x+right.x)/2)/width,(nose.y-(left.y+right.y)/2)/width];
      if(prior){movement+=Math.min(1,Math.hypot(pose[0]-prior[0],pose[1]-prior[1]));moves++;}
      prior=pose;
    },
    listening(now=performance.now()) {if(enabled&&listeningAt===null)listeningAt=now;},
    response(now=performance.now()) {if(enabled&&listeningAt!==null){const ms=now-listeningAt;if(ms>=0&&ms<=3600000){latencyTotal+=ms;latencyCount++;}listeningAt=null;}},
    snapshot() {
      if(!enabled||!samples)return null;
      return {consent:true,consent_version:'insights-v1',camera_used:true,
        face_in_frame_pct:100*visible/samples,gaze_on_screen_pct:gazeSamples?100*facing/gazeSamples:null,
        head_pose_stability:moves?1-movement/moves:null,avg_response_latency_ms:latencyCount?latencyTotal/latencyCount:null};
    },
  };
}
