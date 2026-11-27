/** Feature detection, not user-agent guessing; never bypass required sharing. */
export function interviewAccessIssue(devices: Pick<MediaDevices,'getDisplayMedia'|'getUserMedia'> | undefined = typeof navigator==='undefined'?undefined:navigator.mediaDevices):string {
 if(typeof devices?.getDisplayMedia!=='function')return 'This browser cannot share your entire screen, which this interview requires. Open the same interview link on a laptop or desktop using Chrome or Edge. Access has not been granted.';
 if(typeof devices.getUserMedia!=='function')return 'Camera and microphone access is unavailable. Open this link in a supported browser using HTTPS, then retry.';
 return '';
}
