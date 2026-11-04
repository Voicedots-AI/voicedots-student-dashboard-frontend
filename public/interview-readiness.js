/** Keep server dependency errors intact; a failed schema check is not a network error. */
export function checkInterviewReadiness(url, {makeSocket = value => new WebSocket(value), timeoutMs = 45000} = {}) {
  return new Promise((resolve, reject) => {
    const socket = makeSocket(url);
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.onmessage = socket.onerror = socket.onclose = null;
      socket.close();
      if (error) reject(error); else resolve();
    };
    const timer = setTimeout(() => finish(new Error('The server is taking too long to check interview readiness. Retry shortly; your preparation is preserved.')), timeoutMs);
    socket.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ready') finish();
        else if (data.type === 'error') {
          const detail = data.detail;
          const error = new Error(typeof detail === 'string' ? detail : detail?.message || 'Interview services are unavailable.');
          error.code = detail?.code || data.code;
          finish(error);
        }
      } catch { finish(new Error('The interview service returned an invalid readiness response. Retry shortly.')); }
    };
    // Browsers fire error before close. Let close supply the useful code,
    // or let the bounded deadline handle a connection that never closes.
    socket.onerror = () => {};
    socket.onclose = event => finish(new Error(
      event.code === 4401 ? 'Your sign-in expired. Sign in again to resume this attempt.'
        : event.code === 4403 ? 'Verification or placement access needs attention. Retry verification in this panel.'
        : 'The interview service connection closed before checks completed. Retry; if it continues, check service health and your connection.'
    ));
  });
}
