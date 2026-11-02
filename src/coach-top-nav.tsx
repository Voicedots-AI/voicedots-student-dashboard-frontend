import { Link, useLocation } from 'react-router-dom';
import { TrendingUp, Calendar, BookOpen, CalendarDays, LineChart, Award, PhoneCall } from 'lucide-react';
import './coach-approved.css';

export function CoachTopNav({ activeTab }: { activeTab?: 'call' | 'coach' | 'plan' | 'schedule' | 'resources' | 'reattempt' | 'progress' | 'readiness' }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const pathSegment = location.pathname.split('/').pop() || '';
  const screen = (searchParams.get('screen') || pathSegment || '').toLowerCase();

  const buildPath = (screenName: string) => {
    const params = new URLSearchParams(location.search);
    params.delete('screen');
    params.delete('phase');
    params.delete('view');
    params.delete('coach');
    const qs = params.toString() ? `?${params.toString()}` : '';
    return `/placement/${screenName}${qs}`;
  };

  const currentTab = activeTab || (
    screen === 'call' ? 'call' : screen === 'progress' || screen === 'tracking' || screen === '8'
      ? 'progress'
      : screen === 'readiness' || screen === 'placement' || screen === '9'
        ? 'readiness'
        : screen === 'plan' || screen === 'daily-progress' || screen === '4'
          ? 'plan'
          : screen === 'schedule' || screen === 'calendar' || screen === '5'
            ? 'schedule'
            : screen === 'resources' || screen === 'practice-questions' || screen === '6'
              ? 'resources'
              : screen === 'reattempt' || screen === 're-attempt' || screen === '7'
                ? 'reattempt'
                : 'coach'
  );

  return (
    <nav className="coach-top-navbar" aria-label="Placement AI Coach Quick Navigation">
      <Link to={buildPath('call')} className={`coach-nav-btn ${currentTab === 'call' || screen === 'call' ? 'active' : ''}`} aria-current={currentTab === 'call' || screen === 'call' ? 'page' : undefined}>
        <PhoneCall size={16} /><span>AI Coach</span>
      </Link>
      <Link
        to={buildPath('plan')}
        className={`coach-nav-btn ${currentTab === 'plan' ? 'active' : ''}`}
      >
        <TrendingUp size={16} />
        <span>Daily Progress & Plan</span>
      </Link>
      <Link
        to={buildPath('schedule')}
        className={`coach-nav-btn ${currentTab === 'schedule' ? 'active' : ''}`}
      >
        <Calendar size={16} />
        <span>Learning Schedule</span>
      </Link>
      <Link
        to={buildPath('resources')}
        className={`coach-nav-btn ${currentTab === 'resources' ? 'active' : ''}`}
      >
        <BookOpen size={16} />
        <span>Resources & Questions</span>
      </Link>
      <Link
        to={buildPath('reattempt')}
        className={`coach-nav-btn ${currentTab === 'reattempt' ? 'active' : ''}`}
      >
        <CalendarDays size={16} />
        <span>Schedule Re-attempt</span>
      </Link>
      <Link
        to={buildPath('progress')}
        className={`coach-nav-btn ${currentTab === 'progress' ? 'active' : ''}`}
      >
        <LineChart size={16} />
        <span>Progress Tracking</span>
      </Link>
      <Link
        to={buildPath('readiness')}
        className={`coach-nav-btn ${currentTab === 'readiness' ? 'active' : ''}`}
      >
        <Award size={16} />
        <span>Placement Readiness</span>
      </Link>
    </nav>
  );
}
