import {test,expect} from '@playwright/test';
import {StudentDataCache,cachedStudentResource} from '../src/student-data-cache';
test('returning to placement screens reuses the loaded response',async()=>{
 const cache=new StudentDataCache();cache.session('student:resume');let calls=0;
 const read=()=>{calls++;return Promise.resolve([{id:'drive'}])};
 const first=await cache.get('/api/student/drives',read);
 expect(await cache.get('/api/student/drives',read)).toBe(first);expect(calls).toBe(1);
 expect(cachedStudentResource('/api/student/drives')).toBe(true);
 expect(cachedStudentResource('/api/student/drives/drive/interview-context')).toBe(false);
});
test('concurrent cards share one ATS request',async()=>{
 const cache=new StudentDataCache();let calls=0;
 await Promise.all(Array.from({length:10},()=>cache.get('ats',async()=>{calls++;return 81.6})));
 expect(calls).toBe(1);
});
test('account and main resume changes discard earlier cached data',async()=>{
 const cache=new StudentDataCache();cache.session('student:resume-1');await cache.get('drives',async()=>['private']);
 cache.session('student:resume-2');expect(cache.peek('drives')).toBeUndefined();
 await cache.get('drives',async()=>['updated']);cache.session('other:resume');expect(cache.peek('drives')).toBeUndefined();
});
test('logout or mutation invalidation cannot be undone by a late response',async()=>{
 const cache=new StudentDataCache();let finish!:(v:string)=>void;
 const old=cache.get('drives',()=>new Promise<string>(resolve=>{finish=resolve}));await Promise.resolve();cache.clear();
 await cache.get('drives',async()=>'current');finish('old');await old;expect(cache.peek('drives')).toBe('current');
});
test('explicit refresh reloads only the requested resource',async()=>{
 const cache=new StudentDataCache();await cache.get('drives',async()=>1);await cache.get('reports',async()=>2);
 cache.invalidate('drives');expect(await cache.get('drives',async()=>3)).toBe(3);expect(cache.peek('reports')).toBe(2);
});
test('failed loads remain retryable',async()=>{
 const cache=new StudentDataCache();await expect(cache.get('drives',async()=>{throw new Error('offline')})).rejects.toThrow('offline');
 expect(await cache.get('drives',async()=>1)).toBe(1);
});
