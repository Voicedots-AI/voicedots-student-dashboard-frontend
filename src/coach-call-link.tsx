import { Navigate, useLocation } from 'react-router-dom';

/** Keep context identifiers, never send resume text or scores in a URL. */
export function coachCallPath(search = '', source = 'portal', extra: Record<string, string> = {}) {
  const input = new URLSearchParams(search);
  const params = new URLSearchParams({mode: 'guidance', source});
  for (const key of ['drive', 'plan', 'report_session_id']) {
    const value = extra[key] || input.get(key);
    if (value) params.set(key, value);
  }
  if (source.startsWith('/') && !source.startsWith('//')) params.set('returnTo', source + (search ? `?${new URLSearchParams(search)}` : ''));
  return `/placement/call?${params}`;
}

export function CoachCallEntry() {
  const location = useLocation();
  return <Navigate replace to={coachCallPath(location.search, new URLSearchParams(location.search).get('source') || 'portal')} />;
}

export function useCoachCallPath() {
  const location = useLocation();
  return coachCallPath(location.search, location.pathname);
}
