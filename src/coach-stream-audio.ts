import {json,request} from './api';
let audioContext:AudioContext|null=null;
function context(){
 if(!audioContext||audioContext.state==='closed'){
  const Type=window.AudioContext||(window as Window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!Type)throw new Error('Audio playback is unavailable. Continue using the conversation text.');
  audioContext=new Type();
 }
 return audioContext;
}
/** Called directly from Start so iOS receives a real playback gesture. */
export async function unlockCoachAudio(){await context().resume();}
export async function streamCoachSpeech(text:string,signal:AbortSignal,onPlaying:()=>void){
 const ctx=context();await ctx.resume();signal.throwIfAborted();
 const sources=new Set<AudioBufferSourceNode>();let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
 const stop=()=>{for(const source of sources){try{source.stop()}catch{}}sources.clear();};
 signal.addEventListener('abort',stop,{once:true});
 let rate=0,next=ctx.currentTime+.04,started=false,complete=false,spare:number|undefined;
 try{
  const response=await request('/api/student/coach/officer/speech',{...json({text,stream:true}),signal,timeoutMs:65000});
  if(!response.headers.get('content-type')?.includes('application/x-ndjson'))throw new Error('Streaming voice is not available yet. Retry shortly or continue using text.');
  if(!response.body)throw new Error('Coach audio could not be opened. Select Start to retry.');
  reader=response.body.getReader();const decoder=new TextDecoder();let pending='';
  async function consume(line:string){
   if(!line.trim())return;const item=JSON.parse(line) as {sample_rate?:number;audio?:string;done?:boolean;error?:string};
   if(item.error)throw new Error(item.error);
   if(item.sample_rate){if(!Number.isInteger(item.sample_rate)||item.sample_rate<8000||item.sample_rate>48000)throw new Error('Unsupported coach audio format.');rate=item.sample_rate;}
   if(item.done)complete=true;
   if(item.audio){
    if(!rate)throw new Error('Coach audio format is missing.');
    const binary=atob(item.audio),bytes=new Uint8Array(binary.length+(spare===undefined?0:1));let offset=0;
    if(spare!==undefined){bytes[0]=spare;offset=1;spare=undefined;}
    for(let i=0;i<binary.length;i++)bytes[i+offset]=binary.charCodeAt(i);
    if(bytes.length%2)spare=bytes[bytes.length-1];const count=Math.floor(bytes.length/2);if(!count)return;
    const buffer=ctx.createBuffer(1,count,rate),samples=buffer.getChannelData(0),view=new DataView(bytes.buffer);
    for(let i=0;i<count;i++)samples[i]=view.getInt16(i*2,true)/32768;
    const source=ctx.createBufferSource();source.buffer=buffer;source.playbackRate.value=1.08;source.connect(ctx.destination);sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();};
    next=Math.max(next,ctx.currentTime+.025);source.start(next);next+=buffer.duration/1.08;
    if(!started){started=true;onPlaying();}
    while(next-ctx.currentTime>3){signal.throwIfAborted();await new Promise(resolve=>setTimeout(resolve,100));}
   }
  }
  while(true){signal.throwIfAborted();const chunk=await reader.read();pending+=decoder.decode(chunk.value,{stream:!chunk.done});let end;
   while((end=pending.indexOf('\n'))>=0){await consume(pending.slice(0,end));pending=pending.slice(end+1);}
   if(pending.length>2000000)throw new Error('Coach audio response exceeded its limit.');if(chunk.done)break;
  }
  if(pending.trim())await consume(pending);
  if(!complete||!started||spare!==undefined)throw new Error('Coach audio was interrupted. Select Start to retry.');
  while(ctx.currentTime<next){signal.throwIfAborted();await new Promise(resolve=>setTimeout(resolve,25));}
 }finally{signal.removeEventListener('abort',stop);stop();await reader?.cancel().catch(()=>{});}
}
