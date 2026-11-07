/** Keep server dependency errors intact; a failed schema check is not a network error. */
export function readinessHealthError(health) {
  const checks = health?.checks;
  if (!checks || typeof checks !== 'object') return null;
  for (const [provider, label] of [['deepgram', 'Deepgram'], ['gemini_live', 'Gemini']]) {
    if (checks[provider] !== false) continue;
    const code = health.provider_status?.[provider]?.error_code;
    const authentication = code === 'authentication_failed';
    const error = new Error(authentication
      ? `The interview voice provider (${label}) rejected the server credentials. Your administrator must correct the voice-service configuration before you retry. Your interview has not started.`
      : `The interview voice service (${label}) is unavailable. Ask your administrator to check its configuration and allowance. Your interview has not started.`);
    error.code = authentication ? 'INTERVIEW_VOICE_AUTH_FAILED' : 'INTERVIEW_VOICE_UNAVAILABLE';
    return error;
  }
  if (Object.values(checks).some(value => value === false)) {
    const error = new Error('The interview server is not ready. Ask your administrator to check service health; your interview has not started.');
    error.code = 'INTERVIEW_SERVICES_UNAVAILABLE';
    return error;
  }
  return null;
}

export function checkInterviewReadiness(url, {makeSocket = value => new WebSocket(value), timeoutMs = 45000, fetchHealth = null, log = () => {}} = {}) {
  return new Promise((resolve, reject) => {
    log('info', 'readiness_socket_connecting');
    const socket = makeSocket(url);
    let settled = false;
    const finish = (error, inspectHealth = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.onmessage = socket.onerror = socket.onclose = null;
      socket.close();
      if (!error) { log('info', 'readiness_passed'); resolve(); return; }
      const fail = failure => {
        log('error', 'readiness_failed', {code:failure.code || 'INTERVIEW_READINESS_FAILED', closeCode:failure.closeCode, serverTraceId:failure.serverTraceId});
        reject(failure);
      };
      if (inspectHealth && fetchHealth) {
        // One bounded, read-only health lookup. Never retry voice generation.
        Promise.resolve().then(fetchHealth).then(health => {
          const dependency = readinessHealthError(health);
          if (dependency) { dependency.closeCode = error.closeCode; fail(dependency); }
          else fail(error);
        }, () => fail(error));
      } else fail(error);
    };
    const timer = setTimeout(() => {
      const error = new Error('The server is taking too long to check interview readiness. Retry shortly; your preparation is preserved.');
      error.code = 'INTERVIEW_READINESS_TIMEOUT';
      finish(error, true);
    }, timeoutMs);
    socket.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ready') finish();
        else if (data.type === 'error') {
          const detail = data.detail;
          const error = new Error(typeof detail === 'string' ? detail : detail?.message || 'Interview services are unavailable.');
          error.code = detail?.code || data.code;
          error.serverTraceId = data.trace_id;
          finish(error);
        }
      } catch { finish(new Error('The interview service returned an invalid readiness response. Retry shortly.')); }
    };
    // Browsers fire error before close. Let close supply the useful code,
    // or let the bounded deadline handle a connection that never closes.
    socket.onerror = () => log('warn', 'readiness_socket_error', {readyState:socket.readyState});
    socket.onclose = event => {
      log('warn', 'readiness_socket_closed', {closeCode:event.code, wasClean:event.wasClean});
      const error = new Error(
      event.code === 4401 ? 'Your sign-in expired. Sign in again to resume this attempt.'
        : event.code === 4403 ? 'Verification or placement access needs attention. Retry verification in this panel.'
        : 'The interview service connection closed before checks completed. Retry; if it continues, check service health and your connection.'
      );
      error.code = event.code === 4401 ? 'INTERVIEW_AUTH_REQUIRED' : event.code === 4403 ? 'INTERVIEW_ACCESS_DENIED' : 'INTERVIEW_READINESS_CONNECTION_CLOSED';
      error.closeCode = event.code;
      finish(error, ![4401,4403].includes(event.code));
    };
  });
}
