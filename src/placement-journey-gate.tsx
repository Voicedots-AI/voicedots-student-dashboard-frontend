import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, type Drive, type Report } from './api';
import { useAuth } from './auth';
import { canAccessPlacementCoach } from './placement-coach-access';
import { InterviewAccessState } from './interview-access-state';

/** Never mount journey screens (or their requests) before checking this student's drive. */
export function PlacementJourneyGate({ children }: { children: ReactNode }) {
  const { identity } = useAuth();
  const location = useLocation();
  const driveId = new URLSearchParams(location.search).get('drive') || '';
  const key = `${identity?.student.id || ''}:${driveId}`;
  const [result, setResult] = useState<{ key: string; eligible: Drive[]; selected?: Drive; unlocked?: boolean; error?: string } | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    Promise.all([
      api<Drive[]>('/api/student/drives', { signal: controller.signal, cache: 'no-store' }),
      api<{ reports: Report[] }>('/api/student/reports', { signal: controller.signal, cache: 'no-store' }),
      driveId ? api<{ unlocked: boolean }>(`/api/student/coach/journey-access?drive_id=${encodeURIComponent(driveId)}`, { signal: controller.signal, cache: 'no-store' }) : Promise.resolve({ unlocked: false }),
    ]).then(([drives, data, access]) => {
      if (!controller.signal.aborted) setResult({ key, selected: drives.find(drive => drive.id === driveId),
        unlocked: access.unlocked, eligible: drives.filter(drive => canAccessPlacementCoach(drive, data.reports)) });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ key, eligible: [], error: 'We couldn’t verify your interview history. Please try again. Your existing progress is safe.' });
    });
    return () => controller.abort();
  }, [key, revision]);
  const retry = () => setRevision(value => value + 1);
  if (!result || result.key !== key) return <InterviewAccessState title="Checking your interview progress"><p>Please wait while we check your placement drive history.</p></InterviewAccessState>;
  if (result.error) return <InterviewAccessState title="Unable to check your progress" retry={retry}><p>{result.error}</p></InterviewAccessState>;
  if (driveId && result.selected && result.unlocked) return <>{children}</>;
  if (!driveId && result.eligible.length) return <InterviewAccessState title="Choose your placement drive"><p>Your coaching journey belongs to an individual drive. Choose a completed interview to continue.</p>
    {result.eligible.map(drive => { const params = new URLSearchParams(location.search); params.set('drive', drive.id); params.set('company', drive.company_name); params.set('role', drive.role_title);
      return <p key={drive.id}><Link to={`${location.pathname}?${params}`}>{drive.company_name} · {drive.role_title}</Link></p>; })}
  </InterviewAccessState>;
  return <InterviewAccessState title={driveId && !result.selected ? 'Placement drive unavailable' : 'Your improvement journey starts with an interview'} retry={retry}>
    <p>{driveId && !result.selected ? 'This drive is unavailable or isn’t assigned to you. Choose one of your placement drives to continue.' : `Complete your first interview${result.selected ? ` for ${result.selected.company_name}` : ' for a placement drive'} to unlock your AI Coach, learning plan, practice resources and progress dashboard.`}</p>
    <p>Starting an interview alone doesn’t unlock coaching. Once completed, your journey stays available for later attempts and after the drive ends.</p>
  </InterviewAccessState>;
}
