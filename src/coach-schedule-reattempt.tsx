import { useState, useEffect } from 'react';
import {
  Calendar,
  Check,
  Plus,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Bell,
  AlertCircle,
  Loader2,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from './auth';
import { api, json } from './api';
import { useSearchParams } from 'react-router-dom';
import { CoachTopNav } from './coach-top-nav';
import './coach-approved.css';

type Attempt = {
  attempt_number: number;
  status: 'completed' | 'scheduled' | 'not_scheduled';
  score?: number | null;
  max_score?: number | null;
  date?: string | null;
  time?: string | null;
  scheduled_for?: string | null;
  completed_at?: string | null;
};

type InterviewSettings = {
  role_title: string;
  interview_type: string;
  mode: string;
};

type ReattemptPlan = {
  student_id: string;
  max_attempts: number;
  attempts: Attempt[];
  settings: InterviewSettings;
  options: {
    roles: string[];
    interview_types: string[];
    modes: string[];
  };
};

/**
 * Embedded Custom Calendar Picker (No browser default input[type=date])
 */
function CustomCalendarPicker({
  selectedDate,
  onSelectDate,
  minDate,
}: {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  minDate: string;
}) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      if (!Number.isNaN(y) && !Number.isNaN(m)) {
        return new Date(y, m - 1, 1);
      }
    }
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const monthTitle = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  function prevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1));
  }

  function selectShortcut(daysFromNow: number) {
    const target = new Date();
    target.setDate(target.getDate() + daysFromNow);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    const str = `${yyyy}-${mm}-${dd}`;
    setCurrentMonth(new Date(yyyy, target.getMonth(), 1));
    onSelectDate(str);
  }

  // Generate grid cells
  const cells: {
    day: number;
    dateStr: string;
    isCurrentMonth: boolean;
    isDisabled: boolean;
    isToday: boolean;
    isSelected: boolean;
  }[] = [];

  // Leading days from prev month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const prevM = month === 0 ? 12 : month;
    const prevY = month === 0 ? year - 1 : year;
    const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      day,
      dateStr,
      isCurrentMonth: false,
      isDisabled: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
    });
  }

  // Days of current month
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cellDate = new Date(year, month, d);
    const minD = new Date(minDate);
    minD.setHours(0, 0, 0, 0);
    const isDisabled = cellDate < minD;

    cells.push({
      day: d,
      dateStr,
      isCurrentMonth: true,
      isDisabled,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
    });
  }

  // Trailing days from next month
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextM = month + 2 > 12 ? 1 : month + 2;
    const nextY = month + 2 > 12 ? year + 1 : year;
    const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({
      day: d,
      dateStr,
      isCurrentMonth: false,
      isDisabled: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
    });
  }

  return (
    <div className="custom-calendar-picker">
      {/* Quick shortcuts */}
      <div className="cal-shortcuts">
        <button type="button" onClick={() => selectShortcut(1)}>Tomorrow</button>
        <button type="button" onClick={() => selectShortcut(3)}>In 3 Days</button>
        <button type="button" onClick={() => selectShortcut(7)}>In 1 Week</button>
        <button type="button" onClick={() => selectShortcut(14)}>In 2 Weeks</button>
      </div>

      {/* Month Header Navigation */}
      <div className="custom-calendar-header">
        <button type="button" className="cal-nav-btn" onClick={prevMonth} aria-label="Previous Month">
          <ChevronLeft size={16} />
        </button>
        <span className="cal-month-title">{monthTitle}</span>
        <button type="button" className="cal-nav-btn" onClick={nextMonth} aria-label="Next Month">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="custom-calendar-weekdays">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(w => (
          <span key={w}>{w}</span>
        ))}
      </div>

      {/* Days grid */}
      <div className="custom-calendar-days-grid">
        {cells.map((cell, idx) => (
          <button
            key={idx}
            type="button"
            disabled={cell.isDisabled || !cell.isCurrentMonth}
            className={`cal-day-cell ${cell.isCurrentMonth ? 'current-month' : 'other-month'} ${cell.isToday ? 'is-today' : ''} ${cell.isSelected ? 'is-selected' : ''}`}
            onClick={() => cell.isCurrentMonth && !cell.isDisabled && onSelectDate(cell.dateStr)}
          >
            <span>{cell.day}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function CoachScheduleReattempt() {
  const [params] = useSearchParams();
  const driveId = params.get('drive') || '';
  const auth = useAuth();
  const student = auth.identity?.student;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [plan, setPlan] = useState<ReattemptPlan | null>(null);

  // Settings State
  const [settings, setSettings] = useState<InterviewSettings>({
    role_title: 'Software Engineer',
    interview_type: 'Full Technical + HR',
    mode: 'AI Avatar Interview',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Modal State for Date & Time selection
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAttemptNumber, setModalAttemptNumber] = useState<number>(2);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [scheduling, setScheduling] = useState(false);
  const [modalError, setModalError] = useState('');

  // Default display name and course
  const studentName = student?.full_name || 'Student';
  const studentDegree = student?.department_code
    ? `B.E. ${student.department_code} | Final Year`
    : student?.program
      ? `${student.program} | Final Year`
      : 'B.E. CSE | Final Year';
  const studentAvatarInitials = studentName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase() || 'AA';

  // Load Re-attempt Plan
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    api<ReattemptPlan>(`/api/student/coach/re-attempt?drive_id=${encodeURIComponent(driveId)}`)
      .then(data => {
        if (!active) return;
        setPlan(data);
        if (data.settings) {
          setSettings(data.settings);
        }
      })
      .catch((_err: unknown) => {
        if (!active) return;
        setPlan(null);
        setError(_err instanceof Error ? _err.message : 'Your interview schedule could not be loaded. Please retry.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [student?.id, driveId]);

  // Open Schedule / Reschedule Dialog
  function openScheduleModal(attemptNum: number) {
    setModalAttemptNumber(attemptNum);
    setModalError('');

    const target = plan?.attempts.find(a => a.attempt_number === attemptNum);
    if (target?.scheduled_for) {
      try {
        const d = new Date(target.scheduled_for);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setSelectedDate(`${yyyy}-${mm}-${dd}`);
        setSelectedTime(d.toTimeString().slice(0, 5));
      } catch {
        initDefaultDate();
      }
    } else {
      initDefaultDate();
    }
    setModalOpen(true);
  }

  function initDefaultDate() {
    const next = new Date();
    next.setDate(next.getDate() + 2);
    const yyyy = next.getFullYear();
    const mm = String(next.getMonth() + 1).padStart(2, '0');
    const dd = String(next.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
    setSelectedTime('10:00');
  }

  // Submit Schedule / Reschedule
  async function handleConfirmSchedule() {
    if (!selectedDate) {
      setModalError('Please pick a date for your re-attempt.');
      return;
    }
    if (!selectedTime) {
      setModalError('Please pick a time for your re-attempt.');
      return;
    }

    const isoString = `${selectedDate}T${selectedTime}:00+05:30`;
    const selectedDt = new Date(isoString);
    if (Number.isNaN(selectedDt.getTime())) {
      setModalError('Invalid date or time chosen.');
      return;
    }

    setScheduling(true);
    setModalError('');

    try {
      const res = await api<{ success: boolean; message: string; plan?: ReattemptPlan; updated_attempt?: Attempt }>(
        '/api/student/coach/re-attempt/schedule',
        {
          method: 'POST',
          ...json({
            drive_id: driveId,
            attempt_number: modalAttemptNumber,
            scheduled_for: isoString,
          }),
        }
      );

      if (res.plan) {
        setPlan(res.plan);
      } else {
        setPlan(prev => {
          if (!prev) return prev;
          const dt = new Date(isoString);
          const dateStr = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
          return {
            ...prev,
            attempts: prev.attempts.map(att =>
              att.attempt_number === modalAttemptNumber
                ? {
                    ...att,
                    status: 'scheduled',
                    date: dateStr,
                    time: timeStr,
                    scheduled_for: isoString,
                  }
                : att
            ),
          };
        });
      }

      setSuccessNotice(res.message);
      setModalOpen(false);
      setTimeout(() => setSuccessNotice(''), 5000);
    } catch (err: any) {
      setModalError(err.message || 'Could not schedule interview. Please choose a future time.');
    } finally {
      setScheduling(false);
    }
  }

  // Update Interview Settings
  async function handleSettingChange(field: keyof InterviewSettings, value: string) {
    const updated = { ...settings, [field]: value };
    setSettings(updated);
    setSavingSettings(true);
    setError('');

    try {
      const res = await api<{ success: boolean; message: string; settings: InterviewSettings; plan?: ReattemptPlan }>(
        '/api/student/coach/re-attempt/settings',
        {
          ...json({ [field]: value, drive_id: driveId }),
          method: 'PUT',
        }
      );
      if (res.settings) {
        setSettings(res.settings);
      }
      setSuccessNotice('Interview settings updated.');
      setTimeout(() => setSuccessNotice(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Could not save interview settings.');
    } finally {
      setSavingSettings(false);
    }
  }

  const attempt1 = plan?.attempts.find(a => a.attempt_number === 1) || {
    attempt_number: 1,
    status: 'not_scheduled',
    score: null,
    max_score: 100,
    date: null,
  };

  const attempt2 = plan?.attempts.find(a => a.attempt_number === 2) || {
    attempt_number: 2,
    status: 'not_scheduled',
    date: null,
    time: null,
  };

  const attempt3 = plan?.attempts.find(a => a.attempt_number === 3) || {
    attempt_number: 3,
    status: 'not_scheduled',
  };

  const roles = plan?.options?.roles || ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Analyst'];
  const interviewTypes = plan?.options?.interview_types || ['Full Technical + HR', 'Technical Only', 'HR & Cultural Fit', 'System Design + Coding'];
  const modes = plan?.options?.modes || ['AI Avatar Interview', 'Audio Interview', 'Text & Code Interview'];

  const minDateString = (() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  })();

  return (
    <div className="coach-approved-page coach-reattempt-page">
      <CoachTopNav activeTab="reattempt" />


      {/* Top Header Bar with solid blue badge */}
      <header className="reattempt-top-header">
        <div className="reattempt-title-area">
          <span className="reattempt-number-badge">7</span>
          <h1 className="reattempt-page-title">Schedule Re-attempt Interviews</h1>
        </div>

        <div className="reattempt-user-meta">
          <div className="reattempt-notification-btn" title="Notifications">
            <Bell size={18} />
            <span className="reattempt-notification-dot" />
          </div>
          <div className="reattempt-user-badge">
            <span className="reattempt-user-avatar">{studentAvatarInitials}</span>
            <div className="reattempt-user-info">
              <strong className="reattempt-user-name">{studentName}</strong>
              <span className="reattempt-user-sub">{studentDegree}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Feedback Messages */}
      {error && (
        <div className="coach-stage-error" role="alert" style={{ marginBottom: '16px' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}
      {successNotice && (
        <div className="coach-stage-notice" role="status" style={{ marginBottom: '16px' }}>
          <Check size={16} />
          <span>{successNotice}</span>
          <button type="button" onClick={() => setSuccessNotice('')} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Main Content White Card */}
      <main className="reattempt-main-container">
        <div className="reattempt-plan-header">
          <h2 className="reattempt-plan-title">Re-attempt Interview Plan</h2>
          <p className="reattempt-plan-subtitle">
            You can re-attempt the AI interview up to 3 times as per your plan.
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '10px', color: '#64748b' }}>
            <Loader2 size={24} className="coach-loading-spinner" />
            <span>Loading your re-attempt plan…</span>
          </div>
        ) : !plan?.attempts.length ? (
          <div role="status"><h3>No interview schedule available</h3><p>{error || 'Your saved attempts will appear here when available from your placement drive.'}</p><button className="coach-secondary" onClick={() => window.location.reload()}>Retry</button></div>
        ) : (
          <div className="reattempt-content-grid">
            {/* Left Column: 3 Attempt Cards + Bottom Banner */}
            <div className="reattempt-left-col">
              <div className="reattempt-cards-row">
                {/* Attempt 1 Card: Completed */}
                <div className="reattempt-card attempt-completed">
                  <div className="reattempt-card-header">
                    <span className="reattempt-card-title">Attempt 1</span>
                    <span className={`reattempt-status-chip ${attempt1.status === 'completed' ? 'completed' : 'not-scheduled'}`}>{attempt1.status === 'completed' ? 'Completed' : 'Not completed'}</span>
                  </div>

                  <div className="reattempt-card-body">
                    <div className="reattempt-icon-circle green-circle">
                      <Check size={28} strokeWidth={3} />
                    </div>

                    <div className="reattempt-score-box">
                      <span className="score-value">{attempt1.score ?? '—'}</span>
                      <span className="score-max"> / {attempt1.max_score ?? 100}</span>
                    </div>

                    <div className="reattempt-date-label">
                      {attempt1.date || 'No completion date'}
                    </div>
                  </div>
                </div>

                {/* Attempt 2 Card: Scheduled (Solid Blue Theme) */}
                <div className="reattempt-card attempt-scheduled">
                  <div className="reattempt-card-header">
                    <span className="reattempt-card-title">Attempt 2</span>
                    <span className="reattempt-status-chip scheduled">{attempt2.status === 'scheduled' ? 'Scheduled' : 'Not scheduled'}</span>
                  </div>

                  <div className="reattempt-card-body">
                    <div className="reattempt-icon-circle blue-circle purple-circle">
                      <Calendar size={26} strokeWidth={2.2} />
                    </div>

                    <div className="reattempt-datetime-box">
                      <span className="datetime-date">{attempt2.date || 'Choose a date'}</span>
                      <span className="datetime-time">{attempt2.time || 'Time not set'}</span>
                    </div>

                    <button
                      type="button"
                      className="reattempt-action-btn reschedule-btn"
                      onClick={() => openScheduleModal(2)}
                    >
                      Reschedule
                    </button>
                  </div>
                </div>

                {/* Attempt 3 Card: Not Scheduled (Solid Blue Theme) */}
                <div className="reattempt-card attempt-not-scheduled">
                  <div className="reattempt-card-header">
                    <span className="reattempt-card-title">Attempt 3</span>
                    <span className={`reattempt-status-chip ${attempt3.status === 'scheduled' ? 'scheduled' : 'not-scheduled'}`}>
                      {attempt3.status === 'scheduled' ? 'Scheduled' : 'Not Scheduled'}
                    </span>
                  </div>

                  <div className="reattempt-card-body">
                    <div className="reattempt-icon-circle blue-soft-circle purple-soft-circle">
                      {attempt3.status === 'scheduled' ? (
                        <Calendar size={26} strokeWidth={2.2} />
                      ) : (
                        <Plus size={28} strokeWidth={2.6} />
                      )}
                    </div>

                    {attempt3.status === 'scheduled' ? (
                      <>
                        <div className="reattempt-datetime-box">
                          <span className="datetime-date">{attempt3.date}</span>
                          <span className="datetime-time">{attempt3.time}</span>
                        </div>
                        <button
                          type="button"
                          className="reattempt-action-btn reschedule-btn"
                          onClick={() => openScheduleModal(3)}
                        >
                          Reschedule
                        </button>
                      </>
                    ) : (
                      <div className="reattempt-schedule-now-box">
                        <button
                          type="button"
                          className="reattempt-schedule-now-btn"
                          onClick={() => openScheduleModal(3)}
                        >
                          Schedule Now
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Coach Prep Notice Banner */}
              <div className="reattempt-coach-tip-banner">
                <span className="reattempt-tip-icon">
                  <Check size={14} strokeWidth={3} />
                </span>
                <span className="reattempt-tip-text">
                  You can prepare using AI Coach and practice questions before your next attempt.
                </span>
              </div>
            </div>

            {/* Interview settings stay separate from the attempt cards. */}
            <aside className="reattempt-settings-col" aria-labelledby="reattempt-settings-heading">
              <div className="reattempt-settings-panel">
                <div className="settings-panel-top">
                  <div>
                    <h3 id="reattempt-settings-heading" className="reattempt-settings-title">Interview Settings</h3>
                  </div>
                  <span className="settings-save-status" role="status">
                    {savingSettings ? (
                      <>
                        <Loader2 size={12} className="coach-loading-spinner" />
                        Saving…
                      </>
                    ) : (
                      null
                    )}
                  </span>
                </div>

                {/* Role / Job Profile */}
                <div className="reattempt-setting-group">
                  <label htmlFor="role-select" className="reattempt-setting-label">
                    Role / Job Profile
                  </label>
                  <div className="reattempt-select-wrapper">
                    <select
                      id="role-select"
                      className="reattempt-select"
                      value={settings.role_title}
                      disabled={savingSettings}
                      onChange={e => handleSettingChange('role_title', e.target.value)}
                    >
                      {roles.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="reattempt-select-icon" />
                  </div>
                </div>

                {/* Interview Type */}
                <div className="reattempt-setting-group">
                  <label htmlFor="interview-type-select" className="reattempt-setting-label">
                    Interview Type
                  </label>
                  <div className="reattempt-select-wrapper">
                    <select
                      id="interview-type-select"
                      className="reattempt-select"
                      value={settings.interview_type}
                      disabled={savingSettings}
                      onChange={e => handleSettingChange('interview_type', e.target.value)}
                    >
                      {interviewTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="reattempt-select-icon" />
                  </div>
                </div>

                {/* Mode */}
                <div className="reattempt-setting-group">
                  <label htmlFor="mode-select" className="reattempt-setting-label">
                    Mode
                  </label>
                  <div className="reattempt-select-wrapper">
                    <select
                      id="mode-select"
                      className="reattempt-select"
                      value={settings.mode}
                      disabled={savingSettings}
                      onChange={e => handleSettingChange('mode', e.target.value)}
                    >
                      {modes.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="reattempt-select-icon" />
                  </div>
                </div>

              </div>
            </aside>
          </div>
        )}
      </main>

      {/* Embedded Custom Calendar Date & Time Selection Modal */}
      {modalOpen && (
        <div className="reattempt-modal-backdrop" onClick={() => !scheduling && setModalOpen(false)}>
          <div className="reattempt-modal-box" onClick={e => e.stopPropagation()}>
            <div className="reattempt-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="modal-title-dot" />
                <h3>
                  {modalAttemptNumber === 2 && attempt2.status === 'scheduled'
                    ? 'Reschedule Attempt 2'
                    : `Schedule Attempt ${modalAttemptNumber}`}
                </h3>
              </div>
              <button
                type="button"
                className="reattempt-modal-close"
                disabled={scheduling}
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="reattempt-modal-body">
              {modalError && (
                <div className="coach-stage-error" role="alert" style={{ marginBottom: '14px' }}>
                  <AlertCircle size={15} />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Custom Interactive Calendar Picker (No browser default input) */}
              <div className="reattempt-modal-field">
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Choose Interview Date</span>
                  <span style={{ fontSize: '11px', color: '#6250d8', fontWeight: 600 }}>Interactive Calendar</span>
                </label>
                <CustomCalendarPicker
                  selectedDate={selectedDate}
                  onSelectDate={dateStr => setSelectedDate(dateStr)}
                  minDate={minDateString}
                />
              </div>

              {/* Time Slot Selection */}
              <div className="reattempt-modal-field">
                <label>Select Time Slot (India Standard Time)</label>
                <div className="reattempt-time-chips">
                  {[
                    { label: '09:30 AM', val: '09:30' },
                    { label: '10:00 AM', val: '10:00' },
                    { label: '11:30 AM', val: '11:30' },
                    { label: '02:00 PM', val: '14:00' },
                    { label: '03:30 PM', val: '15:30' },
                    { label: '05:00 PM', val: '17:00' },
                  ].map(slot => (
                    <button
                      key={slot.val}
                      type="button"
                      className={`time-chip ${selectedTime === slot.val ? 'active' : ''}`}
                      onClick={() => setSelectedTime(slot.val)}
                    >
                      <Clock size={12} />
                      {slot.label}
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Or enter custom time:</span>
                  <input
                    type="time"
                    value={selectedTime}
                    onChange={e => setSelectedTime(e.target.value)}
                    className="reattempt-modal-time-input"
                  />
                </div>
              </div>

              {/* Selected Summary Preview */}
              {selectedDate && selectedTime && (
                <div className="reattempt-modal-summary">
                  <CalendarDays size={18} style={{ color: '#6250d8', flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '13px', color: '#1e293b' }}>
                      {new Date(`${selectedDate}T${selectedTime}:00`).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      at {selectedTime} IST · {settings.role_title} ({settings.mode})
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="reattempt-modal-footer">
              <button
                type="button"
                className="coach-secondary"
                disabled={scheduling}
                onClick={() => setModalOpen(false)}
                style={{ borderRadius: '9999px', padding: '8px 18px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="coach-primary"
                disabled={scheduling || !selectedDate || !selectedTime}
                onClick={handleConfirmSchedule}
                style={{ borderRadius: '9999px', background: '#6250d8', padding: '8px 22px' }}
              >
                {scheduling ? (
                  <>
                    <Loader2 size={16} className="coach-loading-spinner" />
                    <span>Confirming Schedule…</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Confirm Schedule</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
