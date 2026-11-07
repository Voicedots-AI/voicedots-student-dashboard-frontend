/** Allowlisted metadata only: never pass URLs, response bodies, or transcripts. */
export function createInterviewDiagnostics(sink = console) {
  const traceId = globalThis.crypto?.randomUUID?.() || `panel-${Date.now().toString(36)}`;
  const started = Date.now();
  let stage = 'initialization';
  const allowed = new Set(['code', 'httpStatus', 'closeCode', 'wasClean', 'errorName', 'readyState', 'attempt', 'route', 'serverTraceId']);
  function log(level, event, details = {}) {
    const record = {traceId, stage, event, elapsedMs: Date.now() - started,
      online: globalThis.navigator?.onLine ?? null};
    for (const [key, value] of Object.entries(details)) {
      if (allowed.has(key) && ['string', 'number', 'boolean'].includes(typeof value)) record[key] = value;
    }
    try { (sink[level] || sink.log).call(sink, `[InterviewPanel] ${JSON.stringify(record)}`, record); } catch { /* Logging must not block an interview. */ }
  }
  return {traceId, log, setStage(value) {stage = value; log('info', 'stage_started');}};
}
