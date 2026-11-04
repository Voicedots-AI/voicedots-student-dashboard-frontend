import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

// Execute the production cache code without a browser or UI automation.
const source=readFileSync(new URL('../src/student-data-cache.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {StudentDataCache,liveStudentResource}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('an admin 30-to-5 edit replaces the cached student drive on refresh',async()=>{
 const cache=new StudentDataCache();let duration=30;
 const load=async()=>[{id:'drive',interview_duration_minutes:duration}];
 await cache.get('drives',load);duration=5;
 assert.equal((await cache.refresh('drives',load))[0].interview_duration_minutes,5);
 assert.equal(cache.peek('drives')[0].interview_duration_minutes,5);
});

test('focus and periodic refreshes share one in-flight request',async()=>{
 const cache=new StudentDataCache();await cache.get('drives',async()=>30);
 let calls=0,finish;
 const load=()=>{calls++;return new Promise(resolve=>{finish=resolve})};
 const first=cache.refresh('drives',load),second=cache.refresh('drives',load);
 await Promise.resolve();assert.equal(calls,1);finish(5);
 assert.equal(await first,5);assert.equal(await second,5);
});

test('refresh failure keeps the last data available and remains retryable',async()=>{
 const cache=new StudentDataCache();await cache.get('drives',async()=>30);
 await assert.rejects(cache.refresh('drives',async()=>{throw new Error('offline')}));
 assert.equal(cache.peek('drives'),30);
 assert.equal(await cache.refresh('drives',async()=>5),5);
});

test('a refresh from the previous account cannot overwrite current account data',async()=>{
 const cache=new StudentDataCache();cache.session('student-1');
 let finish;
 const pending=cache.refresh('drives',()=>new Promise(resolve=>{finish=resolve}));
 await Promise.resolve();cache.session('student-2');
 await cache.refresh('drives',async()=>5);finish(30);await pending;
 assert.equal(cache.peek('drives'),5);
});

test('live refresh is limited to drive metadata and its dashboard summary',()=>{
 assert.equal(liveStudentResource('/api/student/drives'),true);
 assert.equal(liveStudentResource('/api/student/dashboard'),true);
 assert.equal(liveStudentResource('/api/student/drives/drive/ats-fit'),false);
 assert.equal(liveStudentResource('/api/student/reports'),false);
});
