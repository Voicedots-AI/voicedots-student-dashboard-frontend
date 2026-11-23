import assert from 'node:assert/strict';
import {createInterviewObservations} from '../public/interview-observations.js';
const sample=Array.from({length:478},()=>({x:.5,y:.5}));
sample[33]={x:.3,y:.4};sample[263]={x:.7,y:.4};
for(const settings of [{consent:false,cameraUsed:true},{consent:true,cameraUsed:false}]) {
  const obs=createInterviewObservations();obs.start(settings);obs.sample(sample);assert.equal(obs.snapshot(),null);
}
const obs=createInterviewObservations();obs.start({consent:true,cameraUsed:true});
obs.sample(sample,{timestamp:0,cameraFacing:true});obs.sample(null,{timestamp:1000});
obs.sample(sample,{timestamp:2000,cameraFacing:false});
obs.listening(2000);obs.response(2500);
const result=obs.snapshot();
assert.equal(result.face_in_frame_pct,200/3);assert.equal(result.gaze_on_screen_pct,50);
assert.equal(result.avg_response_latency_ms,500);
assert.deepEqual(Object.keys(result).sort(),['consent','consent_version','camera_used','face_in_frame_pct','gaze_on_screen_pct','head_pose_stability','avg_response_latency_ms'].sort());
console.log('Observation consent, numeric-only payload and latency checks passed');
