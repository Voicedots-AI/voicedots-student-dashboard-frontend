import fs from 'node:fs';import {fileURLToPath} from 'node:url';import path from 'node:path';import {createRequire} from 'node:module';import assert from 'node:assert/strict';
{const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const require=createRequire(path.resolve(root,'package.json'));const {build}=require('esbuild');
 const output=await build({stdin:{contents:"export {streamCoachSpeech,unlockCoachAudio} from './src/coach-stream-audio';export {interviewAccessIssue} from './src/interview-capabilities';",resolveDir:path.resolve(root)},bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'mock-auth-api',setup(b){b.onResolve({filter:/^\.\/api$/},()=>({path:'api',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const json=body=>({body:JSON.stringify(body)});export const request=(...args)=>globalThis.__request(...args);'}));}}]});
 const mod={exports:{}};new Function('module','exports',output.outputFiles[0].text)(mod,mod.exports);const api=mod.exports;
 let clock=0,captured=[],stops=0;
 class Context{state='running';destination={};get currentTime(){clock+=.1;return clock}async resume(){}createBuffer(_channels,count,rate){const data=new Float32Array(count);captured.push(data);return {duration:count/rate,getChannelData:()=>data}}createBufferSource(){return {playbackRate:{value:1},connect(){},disconnect(){},start(){},stop(){stops++}}}}
 globalThis.window={AudioContext:Context};
 assert.match(api.interviewAccessIssue({getUserMedia(){}}),/laptop or desktop/);assert.equal(api.interviewAccessIssue({getDisplayMedia(){},getUserMedia(){}}),'');
 let streamController;const encoder=new TextEncoder();let playing;const started=new Promise(resolve=>playing=resolve);
 globalThis.__request=async()=>new Response(new ReadableStream({start(c){streamController=c;c.enqueue(encoder.encode('{"sample_rate":24000}\n{"audio":"AID/fw=="}\n'));}}),{headers:{'content-type':'application/x-ndjson'}});
 const playback=api.streamCoachSpeech('saved reply',new AbortController().signal,()=>playing());await started;
 assert.equal(captured[0][0],-1);assert.ok(captured[0][1]>.99);streamController.enqueue(encoder.encode('{"done":true}\n'));streamController.close();await playback;
 globalThis.__request=async()=>new Response('{"error":"Please retry voice"}\n',{headers:{'content-type':'application/x-ndjson'}});
 await assert.rejects(()=>api.streamCoachSpeech('reply',new AbortController().signal,()=>{}),/Please retry voice/);
 assert.ok(stops>0);console.log(root+': capability guard, progressive playback, PCM decoding and stream error checks passed');
}
