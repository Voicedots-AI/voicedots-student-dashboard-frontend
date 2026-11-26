import { Link, useLocation } from 'react-router-dom';
import { TrendingUp, Calendar, BookOpen, CalendarDays, LineChart, Award, PhoneCall, Video, FileText } from 'lucide-react';
import './coach-approved.css';
import './journey-attempts.css';
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
  const drive = driveId || input.get('drive');
  const reports = (attemptReports || savedReports).filter(item => item.drive_id === drive && item.status === 'released' && item.report && item.session_id).sort((a,b)=>Date.parse(a.completed_at || a.created_at)-Date.parse(b.completed_at || b.created_at));
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
  return <>
    {reports.length > 1 && <section className="journey-results-switcher" aria-label="Interview attempt results">
      <header className="journey-results-heading"><div><strong>Interview results</strong><span>Select an attempt to view its score and feedback.</span></div><span className="journey-results-count">{reports.length} released results</span></header>
      <div className="journey-results-options">
        {reports.map((item,index) => {
          const next = new URLSearchParams(context);
          next.set('report_session_id',item.session_id);
          const score=item.report?.overall_score;
          const hasScore=typeof score==='number' && Number.isFinite(score);
          const date=new Date(item.completed_at || item.created_at);
          const dateLabel=Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
          const current=item.session_id===session;
          return <Link key={item.session_id} className={`journey-result-option${current?' is-selected':''}`} to={`/reports/${encodeURIComponent(item.session_id)}?${next}`} aria-current={current?'page':undefined}>
            <span className="journey-result-option-top"><strong>{item.attempt_number ? `Attempt ${item.attempt_number}` : 'Interview result'}</strong><span className="journey-result-state">{current?'Viewing':index===reports.length-1?'Latest':'View result'}</span></span>
            <span className="journey-result-score">{hasScore?score:'—'}{hasScore&&<small>/100</small>}</span>
            {dateLabel&&<span className="journey-result-date">{dateLabel}</span>}
          </Link>;
        })}
      </div>
    </section>}
    <nav className="coach-top-navbar" aria-label="Placement journey">
    {tabs.map(({ id, label, icon: Icon, to }) => <Link
      key={id} to={to} className={`coach-nav-btn${selected === id ? ' active' : ''}`}
      aria-current={selected === id ? 'page' : false}
    ><Icon size={16} /><span>{label}</span></Link>)}
  </nav></>;
}
