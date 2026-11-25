import assert from 'node:assert/strict';
import { verifyIdentityWithNarration } from '../public/verification-narrator.js';
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise,resolve}; };
const identity = deferred(), audio = deferred(), services = deferred();
const events = [];
let finished = false;
const run = verifyIdentityWithNarration({
  verify: () => identity.promise,
  onVerified: () => events.push('identity'),
  onFailed: () => events.push('failure'),
  speak: () => { events.push('voice'); return audio.promise; },
  afterVerified: () => { events.push('readiness'); return services.promise; },
}).then(() => { finished = true; });
assert.deepEqual(events, []);
identity.resolve();
await new Promise(r => setImmediate(r));
assert.deepEqual(events, ['identity','voice','readiness']);
services.resolve();
await new Promise(r => setImmediate(r));
assert.equal(finished, false, 'Interview must wait until confirmation audio finishes');
audio.resolve(); await run;
assert.equal(finished, true);
let started = false;
await assert.rejects(verifyIdentityWithNarration({
  verify: async () => { throw new Error('identity mismatch'); },
  onVerified: () => assert.fail('Must not announce successful identity'), onFailed() {},
  speak: async () => {}, afterVerified: async () => { started = true; },
}), /identity mismatch/);
assert.equal(started, false);
console.log('Verification overlap checks passed: identity first, audio/readiness parallel, no voice overlap, mismatch stays blocked.');
