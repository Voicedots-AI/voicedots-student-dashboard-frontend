import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../public/interview.js', import.meta.url), 'utf8');
const start = source.indexOf('async function checkReadiness(');
const code = source.slice(start, source.indexOf('async function verifyPreflightIdentity', start));
async function run(errors) {
  let readiness = 0, requests = 0;
  const context = vm.createContext({
    preflightId: 'verified-face-token', currentSubmissionId: 'submission',
    _HTTP_BASE: '', WS_BASE: '', servicesCheckedAt: 0, Date, Error, AbortSignal, URLSearchParams,
    location: {search: '?drive=drive'}, rndStatus: {}, panelDiagnostics: {log() {},traceId: 'trace'},
    preflightChecks: {identity: 'verified'},
    checkInterviewReadiness: async () => { const error = errors[readiness++]; if (error) throw Object.assign(new Error('mock'), {code:error}); },
    studentFetch: async () => { requests++; return {ok:true,json:async()=>({status:'ready',submission_id:'submission'})}; },
  });
  vm.runInContext(code, context);
  let failure;
  try { await context.checkReadiness(); } catch (error) { failure = error; }
  return {context,readiness,requests,failure};
}
const repaired = await run(['INTERVIEW_QUESTIONS_NOT_READY']);
assert.equal(repaired.failure, undefined);
assert.equal(repaired.readiness, 2);
assert.equal(repaired.requests, 1);
assert.equal(repaired.context.preflightId, 'verified-face-token');
assert.equal(repaired.context.preflightChecks.identity, 'verified');
const bounded = await run(['INTERVIEW_QUESTIONS_NOT_READY','INTERVIEW_QUESTIONS_NOT_READY']);
assert.equal(bounded.requests, 1);
assert.equal(bounded.failure.code, 'INTERVIEW_QUESTIONS_NOT_READY');
const provider = await run(['INTERVIEW_VOICE_AUTH_FAILED']);
assert.equal(provider.requests, 0);
assert.equal(provider.failure.code, 'INTERVIEW_VOICE_AUTH_FAILED');
console.log('Automatic question preparation: recovery, identity preservation, bounded retry and provider error checks passed.');
