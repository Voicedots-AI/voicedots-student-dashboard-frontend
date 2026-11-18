import { Link, useLocation, useNavigate } from 'react-router-dom';
import { TrendingUp, Calendar, BookOpen, CalendarDays, LineChart, Award, PhoneCall, Video, FileText } from 'lucide-react';
import './coach-approved.css';
import { coachCallPath } from './coach-call-link';
import { useReleasedJourneyReport, useJourneyReports } from './placement-journey-gate';
import type { Report } from './api';

type JourneyTab = 'interview' | 'result' | 'coach' | 'call' | 'plan' | 'schedule' | 'resources' | 'reattempt' | 'progress' | 'readiness';

const learningTabs = [
  { id: 'plan', label: 'Improvement Plan', icon: TrendingUp },
  { id: 'schedule', label: 'Learning Schedule', icon: Calendar },
  { id: 'resources', label: 'Resources & Questions', icon: BookOpen },
  { id: 'reattempt', label: 'Schedule Re-attempt', icon: CalendarDays },
  { id: 'progress', label: 'Progress Tracking', icon: LineChart },
  { id: 'readiness', label: 'Placement Readiness', icon: Award },
] as const;

export function CoachTopNav({ activeTab, driveId, sessionId, attemptReports }: { activeTab?: JourneyTab; driveId?: string; sessionId?: string; attemptReports?: Report[] }) {
  const location = useLocation();
  const input = new URLSearchParams(location.search);
  const report = useReleasedJourneyReport();
  const savedReports = useJourneyReports();
  const navigate = useNavigate();
  const drive = driveId || input.get('drive');
  const reports = (attemptReports || savedReports).filter(item => item.drive_id === drive && item.status === 'released' && item.report);
  const session = sessionId || report?.session_id;
  const context = new URLSearchParams();
  if (drive) context.set('drive', drive);
  for (const key of ['company', 'role', 'plan']) {
    const value = input.get(key);
    if (value) context.set(key, value);
  }
  if (session) context.set('report_session_id', session);
  const query = context.size ? `?${context}` : '';
  const reportPath = session ? `/reports/${encodeURIComponent(session)}` : '/reports';
  const reportTab = (view?: 'details' | 'coach') => {
    const params = new URLSearchParams(context);
    if (view) params.set('view', view);
    return `${reportPath}${params.size ? `?${params}` : ''}`;
  };
  const selected = activeTab === 'call' ? 'coach' : activeTab || location.pathname.split('/').pop();
  const tabs = [
    ...(drive ? [
      { id: 'interview', label: 'Interview Review', icon: Video, to: session ? reportTab('details') : `/placements?drive=${encodeURIComponent(drive)}` },
      { id: 'result', label: 'Interview Result', icon: FileText, to: session ? reportTab() : '/reports' },
    ] : []),
    { id: 'coach', label: 'AI Coach', icon: PhoneCall,
      to: session && drive ? reportTab('coach') : drive ? `/placement/call${query}` : coachCallPath(location.search, location.pathname) },
    ...learningTabs.map(tab => ({ ...tab, to: `/placement/${tab.id}${query}` })),
  ];
  return <nav className="coach-top-navbar" aria-label="Placement journey">
    {reports.length > 1 && <label className="journey-attempt-selector">Interview result
      <select value={session || ''} onChange={event => {
        const next = new URLSearchParams(context);
        next.set('report_session_id', event.target.value);
        navigate(`/reports/${encodeURIComponent(event.target.value)}?${next}`);
      }}>
        {reports.map((item, index) => <option key={item.session_id} value={item.session_id}>
          Attempt {item.attempt_number || reports.length - index}{item.report?.overall_score != null ? ` · ${item.report.overall_score}/100` : ''}
        </option>)}
      </select>
    </label>}
    {tabs.map(({ id, label, icon: Icon, to }) => <Link
      key={id} to={to} className={`coach-nav-btn${selected === id ? ' active' : ''}`}
      aria-current={selected === id ? 'page' : false}
    ><Icon size={16} /><span>{label}</span></Link>)}
  </nav>;
}
