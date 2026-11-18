import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, ApiError, type Drive, type Report } from './api';
import { useAuth } from './auth';
import { canAccessPlacementCoach } from './placement-coach-access';
import { InterviewAccessState } from './interview-access-state';
import { Loader2 } from 'lucide-react';
import './coach-approved.css';

const ReleasedJourneyReport = createContext<Report | undefined>(undefined);
export const useReleasedJourneyReport = () => useContext(ReleasedJourneyReport);
const JourneyDrive = createContext<Drive | undefined>(undefined);
export const useJourneyDrive = () => useContext(JourneyDrive);
const JourneyReports = createContext<Report[]>([]);
export const useJourneyReports = () => useContext(JourneyReports);

/** Never mount journey screens (or their requests) before checking this student's drive. */
export function PlacementJourneyGate({ children }: { children: ReactNode }) {
  const { identity } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const driveId = params.get('drive') || '';
  const requestedSession = params.get('report_session_id');
  const key = `${identity?.student.id || ''}:${driveId}:${requestedSession || ''}`;
  const [result, setResult] = useState<{ key: string; eligible: Drive[]; selected?: Drive; unlocked?: boolean; report?: Report; reports?: Report[]; error?: string } | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    Promise.all([
      api<Drive[]>('/api/student/drives', { signal: controller.signal, cache: 'no-store' }),
      api<{ reports: Report[] }>('/api/student/reports', { signal: controller.signal, cache: 'no-store' }).catch(() => ({ reports: [] })),
      driveId ? api<{ unlocked: boolean }>(`/api/student/coach/journey-access?drive_id=${encodeURIComponent(driveId)}`, { signal: controller.signal, cache: 'no-store' }) : Promise.resolve({ unlocked: false }),
    ]).then(([drives, data, access]) => {
      const selected = drives.find(drive => drive.id === driveId);
      const conflict = driveId && selected && !access.unlocked && canAccessPlacementCoach(selected, data.reports);
      const reports = data.reports.filter(item => item.drive_id === driveId && item.status === 'released' && item.session_id && item.report)
        .sort((a, b) => Date.parse(b.completed_at || b.created_at) - Date.parse(a.completed_at || a.created_at));
      const report = requestedSession ? reports.find(item => item.session_id === requestedSession) : reports[0];
      if (!controller.signal.aborted) setResult({ key, selected,
        unlocked: access.unlocked, report, reports, eligible: drives.filter(drive => canAccessPlacementCoach(drive, data.reports)),
        error: requestedSession && !report ? 'The selected interview result is unavailable for this placement drive. Open My Reports to select a released result.'
          : conflict ? 'Your drive shows a finished interview, but the coaching service could not match its history. Please contact support with this drive ID: ' + driveId + '. You do not need to repeat the interview to fix this mismatch.' : undefined });
    }).catch((cause: unknown) => {
      const message = cause instanceof ApiError && [404,405].includes(cause.status)
        ? 'The coaching service is not available on this server yet. This does not mean your interview is incomplete. Your report remains available in My Reports. Please contact support to enable the improvement journey.'
        : cause instanceof ApiError && cause.status === 401 ? 'Your session has expired. Please sign in again to view your progress.'
        : 'We couldn’t load your interview history. Please check your connection and try again. This does not change your interview status.';
      if (!controller.signal.aborted) setResult({ key, eligible: [], error: message });
    });
    return () => controller.abort();
  }, [key, revision]);
  const retry = () => setRevision(value => value + 1);
  if (!result || result.key !== key) return (
    <div className="journey-loading" role="status" aria-label="Loading interview progress" aria-busy="true">
      <Loader2 className="coach-loading-spinner" size={32} aria-hidden="true" />
    </div>
  );
  if (result.error) return <InterviewAccessState title="Your improvement journey is temporarily unavailable" retry={retry}><p>{result.error}</p><p><Link to="/reports">View My Reports</Link></p></InterviewAccessState>;
  if (driveId && result.selected && result.unlocked) return (
    <JourneyDrive.Provider value={result.selected}>
      <JourneyReports.Provider value={result.reports || []}>
        <ReleasedJourneyReport.Provider value={result.report}>{children}</ReleasedJourneyReport.Provider>
      </JourneyReports.Provider>
    </JourneyDrive.Provider>
  );
  if (!driveId && result.eligible.length) return <InterviewAccessState title="Choose your placement drive"><p>Your coaching journey belongs to an individual drive. Choose a completed interview to continue.</p>
    {result.eligible.map(drive => { const params = new URLSearchParams(location.search); params.set('drive', drive.id); params.set('company', drive.company_name); params.set('role', drive.role_title);
      return <p key={drive.id}><Link to={`${location.pathname}?${params}`}>{drive.company_name} · {drive.role_title}</Link></p>; })}
  </InterviewAccessState>;
  return <InterviewAccessState title={driveId && !result.selected ? 'Placement drive unavailable' : 'Your improvement journey starts with an interview'} retry={retry}>
    <p>{driveId && !result.selected ? 'This drive is unavailable or isn’t assigned to you. Choose one of your placement drives to continue.' : `Complete your first interview${result.selected ? ` for ${result.selected.company_name}` : ' for a placement drive'} to unlock your AI Coach, learning plan, practice resources and progress dashboard.`}</p>
    <p>Starting an interview alone doesn’t unlock coaching. Once completed, your journey stays available for later attempts and after the drive ends.</p>
  </InterviewAccessState>;
}
