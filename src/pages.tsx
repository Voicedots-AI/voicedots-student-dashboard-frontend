import {studentDataCache} from "./student-data-cache";
import {usePlacementATS,usePlacementATSPrefetch} from "./placement-ats";
import {meetsPlacementATSThreshold} from "./placement-eligibility";
import { PlacementResult, placementResult } from "./report-result";
import { CareerProfile } from "./career-profile";
import {displayName} from "./display";
import { useEffect, useRef, useState, type FormEvent, type CSSProperties } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  ChevronRight,
  Clock3,
  ExternalLink,
  Download,
  FileText,
  MapPin,
  LayoutGrid,
  Table2,
  Mic,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  api,
  apiUrl,
  ApiError,
  json,
  openInterview,
  request,
  type Attempt,
  type Dashboard,
  type Drive,
  type DriveContext,
  type Readiness,
  type Report,
} from "./api";
import { useAuth } from "./auth";
import { LightBadge, PhotoTips, usePhotoLight } from "./photo-guide";
import {
  date,
  dateTime,
  Dialog,
  Empty,
  ErrorMessage,
  humanize,
  PageHeading,
  ResourceState,
  score,
  useResource,
} from "./ui";

function safeAttemptNumber(value: unknown, fallback = 1, maximum?: unknown): number {
  const parsed = Number(value);
  const cap = Number(maximum);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  const normalized = Math.floor(parsed);
  return Number.isFinite(cap) && cap >= 1 ? Math.min(normalized, Math.floor(cap)) : normalized;
}

function ReportList({ reports, search = "", filter = "all", view = "list" }: { reports: Report[]; search?: string; filter?: string; view?: "list" | "cards" | "table" }) {
  const visible = reports.filter((report) => {
    const category = report.drive_id ? "placement" : "practice";
    const query = `${report.company_name || ""} ${report.target_role || ""} ${report.report?.readiness || ""}`.toLowerCase();
    return (filter === "all" || filter === category) && query.includes(search.trim().toLowerCase());
  });
  return (
    <div className={`student-report-list report-view-${view}`}>
      {view === "table" && visible.length > 0 ? <div className="reports-table-scroll" role="region" aria-label="Interview reports table" tabIndex={0}><table className="reports-table"><thead><tr><th>Company & role</th><th>Interview</th><th>Date</th><th>Score</th><th>Feedback</th><th>Actions</th></tr></thead><tbody>{visible.map(report => {
        const pending=report.report?.status === "awaiting_release" || report.status !== "released";
        return <tr key={report.evaluation_id}><td><span>{report.company_name || "Self practice"}</span><strong>{report.target_role || "Interview report"}</strong></td><td>{report.drive_id ? "Placement" : "Practice"}{report.attempt_number ? ` · Attempt ${report.attempt_number}` : ""}</td><td>{date(report.completed_at || report.created_at)}</td><td>{pending || report.report?.overall_score == null ? "—" : score(report.report.overall_score)}</td><td>{pending ? (report.report?.release_scheduled_for ? `Scheduled · ${date(report.report.release_scheduled_for)}` : "Awaiting release") : "Feedback ready"}</td><td><div className="report-table-actions">{!pending && <><Link className="button secondary small" aria-label={`Open report for ${report.target_role || "interview"}`} to={`/reports/${encodeURIComponent(report.session_id)}`}>View report <ArrowRight size={14}/></Link><a className="button secondary small report-download-icon" aria-label={`Download report for ${report.target_role || "interview"}`} title="Download PDF" href={apiUrl(`/api/interview/${encodeURIComponent(report.session_id)}/evaluation/report.pdf`)}><Download size={16}/></a></>}</div></td></tr>;
      })}</tbody></table></div> : visible.map((report) => {
        const pending = report.report?.status === "awaiting_release" || report.status !== "released";
        const assessed = report.report?.overall_score != null && !pending;
        return <article className="student-report-card" key={report.evaluation_id}>
          <div className="student-report-card__icon"><FileText size={19} /></div>
          <div className="student-report-card__main">
            <div className="student-report-card__topline">
              <span className={`student-report-kind ${report.drive_id ? "is-placement" : "is-practice"}`}>{report.drive_id ? "Placement interview" : "Practice interview"}</span>
              <span className={`student-report-status ${pending ? "is-pending" : assessed ? "is-ready" : "is-neutral"}`}>{pending ? "Awaiting release" : assessed ? "Feedback ready" : humanize(report.status)}</span>
            </div>
            <h2>{report.company_name ? `${report.company_name} · ` : ""}{report.target_role || "Interview report"}</h2>
            <p className="student-report-meta">{date(report.completed_at || report.created_at)}{report.attempt_number ? ` · Attempt ${report.attempt_number}` : ""}</p>


          </div>
          <div className="student-report-card__result">
            {pending ? <><strong className="student-report-pending">{report.report?.release_scheduled_for ? "Release scheduled" : report.drive_id ? "Awaiting release" : "In review"}</strong><span>{report.report?.release_scheduled_for ? `Available ${new Date(report.report.release_scheduled_for).toLocaleString()}` : "Your feedback will appear here when released."}</span></> : <><strong>{report.report?.overall_score == null ? "—" : score(report.report.overall_score)}</strong><span>{report.report?.readiness ? humanize(report.report.readiness) : report.report?.overall_score == null ? "Assessment pending" : "Feedback ready"}</span></>}

            {report.status === "released" && !pending && <div className="report-actions"><Link
              aria-label={`Open report for ${report.target_role || "interview"}`}
              to={`/reports/${encodeURIComponent(report.session_id)}`}
            ><ChevronRight size={17} /> View report</Link><a aria-label={`Download PDF report for ${report.target_role || "interview"}`} href={apiUrl(`/api/interview/${encodeURIComponent(report.session_id)}/evaluation/report.pdf`)}><Download size={15}/> PDF</a></div>}
          </div>
        </article>;
      })}
      {!visible.length && <div className="student-report-filter-empty"><strong>No reports match this view.</strong><span>Try another search or choose a different interview type.</span></div>}
    </div>
  );
}

function improvementLabels(report: Report | undefined) {
  const view = report?.report;
  const values = view?.priority_improvement_areas || view?.weaknesses || view?.improvements || [];
  return values.map((item) => typeof item === "string" ? item : item.focus || ('area' in item ? item.area : '') || "").filter(Boolean).slice(0, 4);
}

export function AttemptList({ attempts }: { attempts: Attempt[] }) {
  const navigate = useNavigate();
  return (
    <div className="record-list">
      {attempts.map((attempt) => (
        <div className="record" key={`${attempt.drive_id || attempt.submission_id}:${attempt.session_id || "pending"}`}>
          <span className="record-icon">
            <Mic size={20} />
          </span>
          <div className="record-info">
            <strong>{attempt.target_role || "Practice interview"}</strong>
            <span>
              {attempt.company_name ? `${attempt.company_name} · ` : ""}
              {attempt.duration_minutes ? `${attempt.duration_minutes} minute session · ` : ""}
              {date(attempt.submitted_at)}
            </span>
          </div>
          <button
            className="button secondary small"
            onClick={() => attempt.drive_id
              ? navigate(`/practice?drive=${encodeURIComponent(attempt.drive_id)}`)
              : attempt.session_id && openInterview(attempt.submission_id, attempt.session_id)}
          >
            Resume <ArrowRight size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function Overview() {
  const { identity } = useAuth();
  const resource = useResource<Dashboard>("/api/student/dashboard");
  const data = resource.data;
  const resumableAttempts = (data?.attempts || []).filter(attempt => { const drive = data?.drives.find(item => item.id === attempt.drive_id); return !drive || !drive.is_locked && drive.status !== "closed" && drive.interview_action !== "blocked"; });
  const recentDrives = [...(data?.drives || [])].filter(drive => drive.status === "active" && drive.interview_status !== "closed").sort((a, b) => (Date.parse(b.window_start_at || b.drive_date || "") || 0) - (Date.parse(a.window_start_at || a.drive_date || "") || 0)).slice(0, 4);
  const latestReport = data?.reports[0];
  const feedbackPending = latestReport?.report?.status === "awaiting_release" || latestReport?.report?.overall_score == null;
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE BETTER, EVERY DAY"
        title={`Hello, ${displayName(identity!.student.full_name.split(" ")[0])}.`}
      >
        Your next opportunity starts with what you do today.
      </PageHeading>
      <section className="welcome-banner" data-testid="overview-hero">
        <div>
          <span className="pill">
            <Sparkles size={14} /> YOUR SPACE TO GROW
          </span>
          <h2>
            Good interviews
            <br />
            start with <em>great practice.</em>
          </h2>
          <p>
            A personalized AI panel. Meaningful feedback.
            <br />
            Everything you need to show up with confidence.
          </p>
          <Link to="/practice" className="button white">
            Start an interview <ArrowRight size={17} />
          </Link>
          <Link to="/coach" className="overview-coach-link">Prepare with your AI Coach</Link>
        </div>
        <div className="voice-art" aria-hidden="true">
          <div className="voice-orbit orbit-one" />
          <div className="voice-orbit orbit-two" />
          <div className="voice-orbit orbit-three" />
          <div className="voice-core">
            <Mic size={45} />
          </div>
          <div className="floating-label label-one">
            <span />
            Your future is calling
          </div>
          <div className="floating-label label-two">
            <Sparkles size={15} /> Practice. Reflect. Repeat.
          </div>
        </div>
      </section>
      <ResourceState resource={resource}>
        {data && (
          <>
            <section className="stats-grid" data-testid="overview-kpis">
              {[
                {
                  icon: Mic,
                  label: "Completed interviews",
                  value: data.reports.length,
                  detail: "Your practice is adding up",
                },
                {
                  icon: BriefcaseBusiness,
                  label: "Eligible opportunities",
                  value: data.drives.length,
                  detail: "From your placement cell",
                },
                {
                  icon: TrendingUp,
                  label: "Placement readiness",
                  value: data.readiness.overall_score == null ? "—" : score(data.readiness.overall_score),
                  detail:
                    data.readiness.overall_score == null
                      ? "Complete a placement assessment"
                      : "Based on your assessed skills",
                },
                {
                  icon: Target,
                  label: "Interviews to resume",
                  value: resumableAttempts.length,
                  detail: "Pick up where you left off",
                },
              ].map(({ icon: Icon, label, value, detail }) => (
                <article className="stat-card" key={label}>
                  <div className="stat-label">
                    <span>{label}</span>
                    <Icon size={18} />
                  </div>
                  <strong>{value}</strong>
                  <p>{detail}</p>
                </article>
                ))}
            </section>
            {recentDrives.length > 0 && <section className="panel overview-drives" data-testid="overview-latest-drive">
              <div className="section-heading"><div><span className="eyebrow">LATEST PLACEMENT DRIVES</span><h2>Explore your next opportunity</h2></div><Link to="/placements">View all <ArrowRight size={15}/></Link></div>
              <div className="overview-drive-grid">{recentDrives.map(drive => {
                const available = !drive.is_locked && drive.interview_action !== "blocked" && drive.eligibility_status !== "ineligible";
                return <article className="overview-drive" key={drive.id}>
                  <div className="overview-drive-company"><span className="record-icon"><BriefcaseBusiness size={19}/></span><span>{drive.company_name}</span><PlacementATSLabel driveId={drive.id}/><span className="pill">{drive.is_locked ? "Locked" : "Active"}</span></div>
                  <h3>{drive.role_title}</h3>
                  <p><MapPin size={14}/>{drive.location || "Location to be announced"}</p>
                  {drive.window_start_at && <p><CalendarDays size={14}/>{date(drive.window_start_at)}</p>}
                  <div className="overview-drive-actions">{available && <Link to={`/coach?drive=${encodeURIComponent(drive.id)}`}>AI Coach <ArrowRight size={14}/></Link>}{<PlacementOverviewInterviewAction drive={drive}/>}</div>
                </article>;
              })}</div>
            </section>}
            <Growth />
            <div className="overview-columns">
              <section className="panel" data-testid="overview-feedback">
                <div className="section-heading">
                  <div>
                    <h2>Your latest feedback</h2>
                    <p>A clearer picture of your progress.</p>
                  </div>
                  <Link to="/reports">
                    View all <ArrowRight size={15} />
                  </Link>
                </div>
                {data.reports.length ? (
                  <>
                    <div className={`feedback-spotlight ${feedbackPending ? "is-pending" : ""}`}>
                      {feedbackPending ? <div className="feedback-pending-icon"><Clock3 size={28}/></div> : <div className="feedback-score" style={{"--feedback-progress": `${Math.max(0, Math.min(100, latestReport!.report!.overall_score!))}%`} as CSSProperties}><strong>{score(latestReport!.report!.overall_score)}</strong><span>Latest score</span></div>}
                      <div><strong>{feedbackPending ? "Your feedback is on its way" : "Focus before your next attempt"}</strong>{feedbackPending ? <p>{latestReport?.report?.status === "awaiting_release" ? "Your placement team will share your assessment here once it is released." : "Your interview is complete. We’re preparing your assessment."}</p> : <><div className="focus-chips">{improvementLabels(latestReport).map(item => <span className="pill" key={item}>{item}</span>)}</div>{!improvementLabels(latestReport).length && <p>Open your report to review your strengths and next steps.</p>}</>}</div>
                    </div>
                    {!feedbackPending && latestReport?.drive_id && <Link className="button secondary feedback-coach-action" to="/coach">Practice your focus areas <ArrowRight size={16}/></Link>}
                    <ReportList reports={data.reports.slice(0, 1)} />
                  </>
                ) : (
                  <Empty
                    title="Your first insight is one interview away"
                    action
                  >
                    Complete an interview to discover your strengths and what to
                    work on next.
                  </Empty>
                )}
              </section>
              <section className="panel next-steps" data-testid="overview-next-steps">
                <span className="eyebrow">MAKE YOUR NEXT MOVE</span>
                <h2>A simple way forward</h2>
                {[
                  {
                    n: "01",
                    title: "Update your profile",
                    text: "Keep your experience ready to share.",
                    to: "/profile",
                  },
                  {
                    n: "02",
                    title: "Practice an interview",
                    text: "Practice with your AI panel.",
                    to: "/practice",
                  },
                  {
                    n: "03",
                    title: "Prepare with AI Coach",
                    text: "Build a plan for your next opportunity.",
                    to: "/coach",
                  },
                  { n: "04", title: "Polish your resume", text: "Make your skills and experience stand out.", to: "/resume-studio" },
                  { n: "05", title: "Explore your career path", text: "Find roles that fit your strengths and goals.", to: "/career" },
                ].map((step) => (
                  <Link key={step.n} to={step.to}>
                    <span>{step.n}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.text}</p>
                    </div>
                    <ChevronRight size={18} />
                  </Link>
                ))}
              </section>
            </div>
            {resumableAttempts.length > 0 && (
              <section className="panel overview-paused">
                <div className="section-heading">
                  <div><h2>Ready when you are</h2><p>Continue an interview you already started.</p></div>
                  <span className="pill">Saved progress</span>
                </div>
                <AttemptList attempts={resumableAttempts} />
              </section>
            )}
          </>
        )}
      </ResourceState>
    </>
  );
}

const interviewTrackLabels: Record<string, string> = { hr: "Talent Acquisition Specialist", domain: "Senior Domain Specialist", industry: "Practical Interviewer", manager: "Hiring Manager" };
function configuredRoundLabels(drive: Drive) {
  const rounds = drive.agent_selection?.length ? drive.agent_selection : drive.round_configuration || [];
  return rounds.map((round) => {
    if (!round || typeof round !== "object" || !("track" in round)) return "";
    const track = String((round as { track: unknown }).track);
    return interviewTrackLabels[track] || humanize(track);
  }).filter(Boolean);
}

type StudentAttemptState = {
  maximum: number;
  used: number;
  completed: number;
  current: number | null;
  next: number | null;
  remaining: number;
};

function boundedCount(value: unknown, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(maximum, Math.floor(parsed))) : fallback;
}

function studentAttemptState(value: Drive | DriveContext): StudentAttemptState {
  const isContext = "drive_id" in value;
  const maximum = Math.max(1, Math.floor(Number(
    isContext ? value.max_attempts : value.interview_max_attempts ?? value.max_attempts ?? 1
  ) || 1));
  const rawUsed = isContext ? value.attempts_used : value.interview_attempts_used;
  const used = boundedCount(rawUsed, 0, maximum);
  const action = isContext ? value.action : value.interview_action || "";
  const status = isContext ? value.assignment_status || "" : value.interview_assignment_status || "";
  const rawAttempt = isContext ? value.attempt_number : value.interview_attempt_number;
  const attempt = Math.max(1, Math.min(maximum, Math.floor(Number(rawAttempt) || 1)));
  const rawCurrent = isContext ? value.current_attempt_number : value.interview_current_attempt_number;
  const current = rawCurrent != null
    ? Math.max(1, Math.min(maximum, Math.floor(Number(rawCurrent) || attempt)))
    : action === "resume" || status === "in_progress" ? attempt : null;
  const rawCompleted = isContext ? value.completed_attempts : value.interview_completed_attempts;
  const completed = boundedCount(rawCompleted, Math.max(0, used - (current ? 1 : 0)), maximum);
  const rawNext = isContext ? value.next_attempt_number : value.interview_next_attempt_number;
  let next = rawNext == null ? null : Math.max(1, Math.min(maximum, Math.floor(Number(rawNext) || 1)));
  if (next == null) {
    if (current != null) next = current;
    else if (["start", "retry_preparation"].includes(action))
      next = Math.min(maximum, status === "completed" ? used + 1 : attempt);
    else if (status === "completed" && maximum > used) next = Math.min(maximum, used + 1);
    else if (action === "not_assigned") next = attempt;
  }
  return { maximum, used, completed, current, next, remaining: Math.max(0, maximum - used) };
}

function interviewWindowEnded(end?: string, now = Date.now()) {
  const deadline = end ? Date.parse(end) : NaN;
  return Number.isFinite(deadline) && now >= deadline;
}

function currentDriveState(drive: Drive, now: number): Drive {
  const expired = drive.status === "expired" || drive.interview_status === "expired" || drive.interview_assignment_status === "expired";
  if (!expired && drive.status !== "closed" && !interviewWindowEnded(drive.window_end_at, now)) return drive;
  return {...drive, interview_status: expired ? "expired" : "closed", interview_action: "closed"};
}

function placementGroup(drive: Drive) {
  const status = drive.interview_status || (drive.status === "active" ? "open" : "upcoming");
  const action = drive.interview_action || "";
  if (drive.is_locked || ["closed", "expired"].includes(status) || status === "completed" || drive.status === "closed") return "closed";
  if (["resume", "start", "retry_preparation"].includes(action) && status !== "upcoming") return "active";
  if (["upcoming", "awaiting_assignment"].includes(status) || drive.status === "scheduled") return "upcoming";
  return "closed";
}

function safeExternalUrl(value?: string) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

function attemptSummaryText(state: StudentAttemptState) {
  return `${state.completed} completed${state.current != null ? ` · Attempt ${state.current} in progress` : ""} · ${state.remaining} remaining`;
}

function compensationLabel(drive: Drive) {
  const minimum = drive.salary_min_amount ?? drive.package_min_lpa;
  const maximum = drive.salary_max_amount ?? drive.package_max_lpa;
  if (minimum == null && maximum == null) return "Not specified";
  const currency = drive.salary_currency || drive.package_currency || "INR";
  const format = (value: number) => {
    try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value); }
    catch { return `${currency} ${value.toLocaleString("en-IN")}`; }
  };
  const legacyLpa = drive.salary_min_amount == null && drive.salary_max_amount == null;
  const lower = minimum == null ? null : `${format(minimum)}${legacyLpa ? " LPA" : ""}`;
  const upper = maximum == null ? null : `${format(maximum)}${legacyLpa ? " LPA" : ""}`;
  const amount = drive.salary_type === "fixed" || !upper || lower === upper ? lower || upper : `${lower || upper} – ${upper}`;
  return `${amount} · ${humanize(drive.salary_period || "annual")}`;
}

function placementPresentation(drive: Drive) {
  const status = drive.interview_status || (drive.status === "active" ? "open" : "upcoming");
  const rounds = drive.agent_selection?.length || drive.round_configuration?.length;
  const labels: Record<string, string> = {awaiting_assignment: "Awaiting assignment", open: "Open now", upcoming: "Scheduled", in_progress: "In progress", completed: "Completed", expired: "Expired", closed: "Closed"};
  return {
    status: ["closed", "expired"].includes(status) ? labels[status] : drive.is_locked ? "Locked" : labels[status] || (drive.interview_action === "blocked" ? "Action required" : "Closed"),
    attempts: ["closed", "expired"].includes(status) ? "Interview closed" : attemptSummaryText(studentAttemptState(drive)),
    window: drive.window_start_at ? `${date(drive.window_start_at)} – ${drive.window_end_at ? date(drive.window_end_at) : "To be announced"}` : date(drive.drive_date),
    interview: `${drive.interview_duration_minutes || "—"} minutes · ${drive.difficulty_tier === "dynamic" ? "Personalized" : humanize(drive.difficulty_tier || "Difficulty not set")} · ${rounds || "—"} ${rounds === 1 ? "round" : "rounds"}`,
    compensation: compensationLabel(drive),
  };
}

function PlacementATSBadge({driveId,ats}: {driveId:string;ats:ReturnType<typeof usePlacementATS>}) {
  const {score}=ats;
  return <div className="placement-ats-entry"><Link className="placement-ats-label" to={`/ats-fit?drive=${encodeURIComponent(driveId)}`} title="View ATS Fit assessment" aria-label={`View ATS Fit assessment${score===null?"":`, ${score}%`}`} data-ats-tone={score === null ? "neutral" : score >= 50 ? "green" : "red"}>
    <FileText size={16} aria-hidden="true"/><strong>{score === null ? ats.pending ? "ATS checking…" : ats.failed ? "ATS unavailable" : "ATS not assessed" : `ATS Fit ${score}%`}</strong><ChevronRight size={15} aria-hidden="true"/></Link>
    {ats.failed && <button type="button" className="text-button" aria-label="Retry ATS assessment" onClick={ats.retry}>Retry</button>}
  </div>;
}

function PlacementOverviewInterviewAction({drive}:{drive:Drive}) {
  const ats = usePlacementATS(drive.id);
  const available = ats.eligible && !drive.is_locked && drive.eligibility_status !== "ineligible" && drive.main_resume_available === true && !["closed","expired"].includes(drive.interview_status || "") && ["resume","start","retry_preparation"].includes(drive.interview_action || "");
  return available ? <Link className="button secondary small" to={`/practice?drive=${encodeURIComponent(drive.id)}`}>Start Interview<ArrowRight size={14}/></Link> : <Link className="button secondary small" to={`/placements?drive=${encodeURIComponent(drive.id)}`}>View opportunity<ArrowRight size={14}/></Link>;
}

function PlacementATSLabel({driveId}: {driveId:string}) {
  const ats=usePlacementATS(driveId);
  return <PlacementATSBadge driveId={driveId} ats={ats}/>;
}

function PlacementDriveActions({drive,reports,eligibilityCheck,atsScore}: {drive:Drive;reports:Report[];eligibilityCheck?:string;atsScore?:number|null}) {
  const driveId=drive.id;

    const report=reports.filter(row=>row.drive_id===driveId&&row.status==='released'&&(row as Report & {released_to_student_at?:string|null}).released_to_student_at!==null&&row.report?.status!=='awaiting_release'&&typeof row.report?.overall_score==='number').sort((a,b)=>Date.parse(b.completed_at||b.created_at)-Date.parse(a.completed_at||a.created_at))[0];
    const interviewScore=report?.report?.overall_score;
    const availableScore=typeof interviewScore==='number'&&Number.isFinite(interviewScore)&&interviewScore>=0&&interviewScore<=100;
    const canInterview=meetsPlacementATSThreshold(atsScore)&&!eligibilityCheck&&drive.eligibility_status!=='ineligible'&&!drive.is_locked&&drive.status!=='closed'&&drive.main_resume_available===true&&!['closed','expired'].includes(drive.interview_status||'')&&['start','retry_preparation','resume'].includes(drive.interview_action||'');
    const eligibleForStart = canInterview && meetsPlacementATSThreshold(atsScore);
    const id=encodeURIComponent(driveId);
    const interviewLabel='Start Interview';
    const unavailableReason=['closed','expired'].includes(drive.interview_status||'') || drive.status==='closed' ? 'Interview closed'
      : !meetsPlacementATSThreshold(atsScore) ? atsScore == null ? 'ATS assessment required' : 'ATS Fit below 50%'
      : drive.eligibility_status==='ineligible' ? 'Not eligible for this drive'
      : eligibilityCheck ? eligibilityCheck
      : drive.is_locked ? 'Locked by placement team'
      : drive.main_resume_available===false ? 'Main Resume required'
      : drive.interview_status==='upcoming' || drive.status==='scheduled' ? 'Opens with interview window'
      : drive.interview_status==='completed' || drive.interview_action==='completed' ? 'Attempts completed'
      : drive.interview_action==='not_assigned' || drive.interview_status==='awaiting_assignment' ? 'Not assigned yet'
      : 'Check opportunity details';
    const interviewContent=<><span className="placement-feature-icon"><Mic size={17}/></span><span className="placement-feature-copy"><b>{interviewLabel}</b>{eligibleForStart ? <span className="placement-eligible-chip">Eligible</span> : null}<small>{canInterview ? drive.interview_action==='resume'?'Continue your attempt':'Begin your assessment' : unavailableReason}</small>{canInterview&&<ArrowRight size={15}/>}</span></>;
    return <footer className="placement-drive-footer"><nav aria-label={`Actions for ${drive.company_name} ${drive.role_title}`}>
      {canInterview?<Link className={`placement-feature placement-feature-interview${eligibleForStart ? " placement-feature-interview-eligible" : ""}`} aria-label={interviewLabel} to={`/practice?drive=${id}`}>{interviewContent}</Link>:<span className="placement-feature placement-feature-unavailable" aria-disabled="true" title={drive.eligibility_reason||unavailableReason}>{interviewContent}</span>}
      {report?.session_id&&availableScore?<Link className="placement-feature placement-feature-score" aria-label={`Score Card ${interviewScore}%`} to={`/reports/${encodeURIComponent(report.session_id)}`}><span className="placement-feature-icon"><FileText size={17}/></span><span className="placement-feature-copy"><b>Score Card</b><small>View your results</small><strong>{interviewScore}%</strong></span></Link>:<span className="placement-feature placement-feature-unavailable" aria-disabled="true"><span className="placement-feature-icon"><FileText size={17}/></span><span className="placement-feature-copy"><b>Score Card</b><small>{drive.interview_status==='completed'?'Awaiting result release':'After your interview'}</small></span></span>}
      <Link className="placement-feature placement-feature-coach" aria-label="AI Coach Advice & Progress" to={`/coach?drive=${id}&view=progress`}><span className="placement-feature-icon"><Sparkles size={18}/></span><span className="placement-feature-copy"><b>AI Coach</b><small>Advice &amp; progress</small></span><ArrowRight size={16}/></Link>
    </nav></footer>;

}

// ATS eligibility uses the total evaluated score; individual skill gaps remain guidance.
function placementDriveEligibility(drive:Drive,ats:ReturnType<typeof usePlacementATS>):Drive {
  if (ats.score !== null && !ats.eligible) return {...drive,eligibility_status:"ineligible",eligibility_reason:"ATS Fit below 50%"};
  return drive;
}

function DriveHeader({drive}: {drive:Drive}) {
  return <div className="drive-card-top"><div className="company-identity"><span className="company-avatar" aria-hidden="true">{(drive.company_name || "C").slice(0,2).toUpperCase()}</span><span className="drive-company-name" title={drive.company_name}>{drive.company_name}</span></div></div>;
}

function PlacementEligibilitySummary({drive,ats,compact=false}:{drive:Drive;ats:ReturnType<typeof usePlacementATS>;compact?:boolean}) {
  const ineligible = placementDriveEligibility(drive,ats).eligibility_status === "ineligible";
  const qualified = ats.eligible && !ineligible;
  const label = ineligible ? "Not eligible" : qualified ? "Eligible" : ats.pending ? "Checking…" : "Not assessed";
  const reason = ats.missing.length ? ineligible ? "Required skills missing" : "Some skill evidence is missing" : ineligible && ats.score !== null && ats.score < 50 ? "ATS Fit below 50%" : "";
  return <div className={`placement-eligibility-summary${compact?" compact":""}`}><PlacementATSBadge driveId={drive.id} ats={ats}/><div className="placement-eligibility-line"><span className={`pill ${ineligible?"placement-ineligible-badge":qualified?"placement-summary-eligible":"placement-eligibility-pending"}`}>{label}</span>{reason&&<span className={`placement-eligibility-reason${ineligible?" is-ineligible":""}`}>– {reason}</span>}</div>{ats.missing.length>0&&<div className="placement-missing-skills"><strong>Missing skills:</strong><ul>{ats.missing.slice(0,3).map(skill=><li key={skill}>{skill}</li>)}</ul>{ats.missing.length>3&&<Link to={`/ats-fit?drive=${encodeURIComponent(drive.id)}`}>+{ats.missing.length-3} more · View assessment <ArrowRight size={12}/></Link>}</div>}{drive.is_locked&&<span className="pill placement-locked-badge">Locked</span>}</div>;
}

function PlacementTableStatus({drive}:{drive:Drive}) {
 const ats=usePlacementATS(drive.id);
 return <><PlacementEligibilitySummary drive={drive} ats={ats} compact/>{drive.placement_decision&&<PlacementResult value={drive.placement_decision} compact/>}</>;
}

function PlacementProgress({drive, status}: {drive:Drive; status:string}) {
  const attempts = studentAttemptState(drive);
  const percent = attempts.maximum ? attempts.completed / attempts.maximum * 100 : 0;
  return <div className="placement-progress"><div className="placement-progress-heading"><strong>Progress</strong><span>{status}</span></div><div className="placement-progress-body"><div className="placement-progress-ring" style={{"--progress": `${percent}%`} as CSSProperties} role="img" aria-label={`${attempts.completed} of ${attempts.maximum} attempts completed`}><strong>{attempts.completed}</strong></div><div><b>{attempts.completed} completed</b><span>{attempts.current != null ? 1 : 0} in progress</span><span>{attempts.remaining} remaining</span></div></div></div>;
}

export function PlacementDriveHistoryItem({drive:record}:{drive:Drive}) {
  const drive=currentDriveState(record,Date.now());
  const ats=usePlacementATS(drive.id);
  const qualified=ats.eligible && drive.eligibility_status!=="ineligible";
  const closed=drive.status==="closed" || ["closed","expired"].includes(drive.interview_status||"");
  const canInterview=qualified && !closed && !drive.is_locked && drive.main_resume_available===true && ["start","resume","retry_preparation"].includes(drive.interview_action||"");
  const label=drive.main_resume_available===false?"Resume required":qualified?"Eligible":ats.pending?"Checking…":ats.score===null?"Not assessed":"Not eligible";
  const reason=closed?"Interview closed":drive.is_locked?"Drive locked":ats.pending?"Checking ATS Fit":ats.score===null?"Assessment required":!qualified?ats.score<50?"ATS Fit below 50%":"Eligibility requirements unmet":drive.main_resume_available!==true?"Main Resume required":drive.interview_status==="upcoming"||drive.status==="scheduled"?"Not open yet":drive.interview_action==="completed"?"Attempts completed":"Awaiting assignment";
  const actionLabel=drive.interview_action==="resume"?"Continue Interview":"Start Interview";
  return <article className="placement-history-item" data-drive-id={drive.id}>
    <div className="placement-history-company"><span className="company-avatar" aria-hidden="true">{(drive.company_name||"C").slice(0,2).toUpperCase()}</span><div><span className="placement-history-label">Company</span><strong>{drive.company_name}</strong></div></div>
    <div className="placement-history-drive"><span className="placement-history-label">Drive / role</span><h3>{drive.role_title}</h3></div>
    <div className="placement-history-ats"><PlacementATSBadge driveId={drive.id} ats={ats}/></div>
    <div className="placement-history-eligibility"><span className={`pill ${qualified&&drive.main_resume_available!==false?"placement-summary-eligible":ats.score!==null?"placement-history-ineligible":"placement-eligibility-pending"}`}>{label}</span></div>
    <div className="placement-history-action">{canInterview?<Link className="button primary small" to={`/practice?drive=${encodeURIComponent(drive.id)}`} aria-label={`${actionLabel} for ${drive.role_title} at ${drive.company_name}`}>{actionLabel}<ArrowRight size={14}/></Link>:<><button type="button" className="button secondary small" disabled title={reason} aria-label={`${actionLabel} unavailable: ${reason}`}>{actionLabel}<ArrowRight size={14}/></button><small>{reason}</small></>}</div>
  </article>;
}

export function PlacementDriveCard({drive,reports=[],select}: {drive:Drive;reports?:Report[];select?:(drive:Drive)=>Promise<void>}) {
  const ats=usePlacementATS(drive.id);
  const hasPlacementDecision=["success","rejected","hold"].includes(placementResult(drive.placement_decision).tone);
  const eligibilityCheck=ats.score !== null ? undefined : ats.failed ? "Not verified" : ats.pending ? "Checking…" : "Pending assessment";
  const cardDrive = placementDriveEligibility(drive, ats);
  const navigate = useNavigate();
  const onSelect = select || (async() => { void navigate(`/placements?drive=${encodeURIComponent(drive.id)}`); });
  return (
              <article className="panel drive-card" data-drive-id={drive.id} data-eligibility={cardDrive.eligibility_status === "ineligible" ? "ineligible" : eligibilityCheck || drive.main_resume_available === false ? "pending" : "eligible"}>
                {(() => {
                  const info = placementPresentation(drive);
                  return <>
                <DriveHeader drive={drive} />

                <h2>{drive.role_title}</h2>
                <PlacementEligibilitySummary drive={drive} ats={ats}/>
                {hasPlacementDecision&&<PlacementResult value={drive.placement_decision} compact/>}
                {cardDrive.eligibility_status === "ineligible" && !ats.missing.length && !hasPlacementDecision && <p className="placement-eligibility-notice">{cardDrive.eligibility_reason || "You do not meet this drive’s eligibility requirements."}</p>}

                <p>
                  <MapPin size={15} />
                  {drive.location || "Location to be announced"}
                </p>
                <p>
                  <CalendarDays size={15} />
                  {info.window}
                </p>
                <PlacementProgress drive={drive} status={info.status} />
                <p className="drive-interview-summary">{info.interview}</p>
                {drive.placement_decision && !hasPlacementDecision && <PlacementResult value={drive.placement_decision} compact/>}
                <div className="drive-card-meta"><span>{humanize(drive.job_type || "Job type not set")}</span><span>{info.compensation}</span></div>
                {drive.main_resume_available === false && <p className="drive-resume-prompt">Upload your Main Resume in <Link to="/profile">My Profile</Link> before starting an interview.</p>}
                <PlacementDriveActions drive={cardDrive} reports={reports} eligibilityCheck={eligibilityCheck} atsScore={ats.score} />
                <button type="button" className="button secondary small placement-opportunity-button" onClick={()=>void onSelect(drive)}>View opportunity <ArrowRight size={14}/></button>
                  </>;
                })()}
              </article>
  );
}

export function Placements() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    return () => {window.clearInterval(timer); window.removeEventListener("focus", tick);};
  }, []);
  const resource = useResource<Drive[]>("/api/student/drives");
  const reports = useResource<{reports:Report[]}>("/api/student/reports");
  // Prefetch every drive's ATS fit in parallel the moment the drives list loads,
  // so cards show their ATS score without a per-card waterfall.
  usePlacementATSPrefetch(resource.data?.map(drive => drive.id) || []);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const openedDriveId = useRef("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("soonest");
  const [view, setView] = useState<"cards" | "table">("cards");
  const selectionRequest = useRef(0);
  const [context, setContext] = useState<DriveContext | null>(null);
  const [selected, setSelected] = useState<Drive | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function closeOpportunity() { selectionRequest.current += 1; setSelected(null); setContext(null); setBusy(false); }
  async function select(drive: Drive) {
    const requestId = ++selectionRequest.current;
    setSelected(drive);
    setContext(null);
    setError("");
    setBusy(true);
    try {
      const result = await api<DriveContext>(`/api/student/drives/${encodeURIComponent(drive.id)}/interview-context`);
      if (selectionRequest.current === requestId) setContext(result);
    } catch (e) {
      if (selectionRequest.current !== requestId) return;
      setError(
        e instanceof ApiError && e.status === 404
          ? "This opportunity is no longer available. Refresh the placements list to see current opportunities."
          : (e as Error).message,
      );
    } finally {
      if (selectionRequest.current === requestId) setBusy(false);
    }
  }
  useEffect(() => {
    const driveId = searchParams.get("drive");
    const drive = resource.data?.find((item) => item.id === driveId);
    if (drive && openedDriveId.current !== drive.id) {
      openedDriveId.current = drive.id;
      void select(drive);
    }
  }, [resource.data, searchParams]);
  const items = (resource.data || []).map(drive => currentDriveState(drive, now))
    .filter((drive) => {
      const matchesSearch = `${drive.company_name} ${drive.role_title}`
        .toLowerCase().includes(search.toLowerCase());
      const status = drive.interview_status || (drive.status === "active" ? "open" : "upcoming");
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((left, right) => {
      const groupOrder = { active: 0, upcoming: 1, closed: 2 };
      const groupDifference = groupOrder[placementGroup(left)] - groupOrder[placementGroup(right)];
      if (groupDifference) return groupDifference;
      if (sortOrder === "company") return left.company_name.localeCompare(right.company_name);
      const actionRank = (drive: Drive) => drive.interview_action === "resume" ? 0 : ["start", "retry_preparation"].includes(drive.interview_action || "") ? 1 : 2;
      const actionDifference = actionRank(left) - actionRank(right);
      if (actionDifference) return actionDifference;
      const leftDate = new Date(left.window_start_at || left.drive_date || "9999-12-31").getTime();
      const rightDate = new Date(right.window_start_at || right.drive_date || "9999-12-31").getTime();
      return leftDate - rightDate;
    });
  const hasFilters = Boolean(search.trim()) || statusFilter !== "all";
  const groups = [
    { key: "active", title: "Active now", description: "Interviews you can resume or start while the window is open." },
    { key: "upcoming", title: "Scheduled & upcoming", description: "Eligible opportunities that are not ready to start yet." },
    { key: "closed", title: "Closed & past", description: "Completed, closed, or otherwise no longer actionable." },
  ].map((group) => ({ ...group, drives: items.filter((drive) => placementGroup(drive) === group.key) }));
  const attemptState = context ? studentAttemptState(context) : null;
  const companyWebsite = safeExternalUrl(context?.company_website || selected?.company_website);
  const companyLinkedIn = safeExternalUrl(context?.company_linkedin || selected?.company_linkedin);
  const eligibilityDetails = selected ? [
    selected.criteria_min_cgpa != null ? `Minimum CGPA ${selected.criteria_min_cgpa}` : null,
    selected.criteria_department_codes?.length ? `Departments: ${selected.criteria_department_codes.join(", ")}` : null,
    selected.criteria_graduation_years?.length ? `Graduation years: ${selected.criteria_graduation_years.join(", ")}` : null,
    selected.criteria_required_skills?.length
      ? `Skills considered: ${selected.criteria_required_skills.join(", ")}${selected.criteria_min_skill_matches ? ` · Match at least ${selected.criteria_min_skill_matches}` : ""}`
      : null,
    "Main Resume required",
  ].filter((item): item is string => Boolean(item)) : [];
  const deadlineEnded = interviewWindowEnded(context?.interview_window_end_at || selected?.window_end_at, now);
  const assignmentExpired = context?.assignment_status === "expired" || selected?.interview_status === "expired" || selected?.interview_assignment_status === "expired";
  const interviewWindow = deadlineEnded || assignmentExpired || selected?.status === "closed" || selected?.interview_status === "closed" ? "closed" : context?.interview_window || "";
  const selectedATS = usePlacementATS(selected?.id);
  const selectedATSQualified = selectedATS.eligible;
  const mainResumeAvailable = context?.main_resume_available === true;
  const canResume = Boolean(selectedATSQualified && context && selected?.eligibility_status !== "ineligible" && context.eligibility?.status !== "ineligible" && !context.is_locked && !selected?.is_locked && mainResumeAvailable && interviewWindow === "open" && (context.can_resume ?? context.action === "resume"));
  const canStart = Boolean(!canResume && selectedATSQualified && context && selected?.eligibility_status !== "ineligible" && context.eligibility?.status !== "ineligible" && !context.is_locked && !selected?.is_locked && mainResumeAvailable && interviewWindow === "open" && !context.coach_gate_locked && (
    context.can_start ?? (["start", "retry_preparation"].includes(context.action) || Boolean(context.can_start_next_attempt))
  ));
  const startInterview = () => canStart && context && navigate(`/practice?drive=${encodeURIComponent(context.drive_id)}`);
  const resumeInterview = () => {
    if (!context || !canResume) return;
    navigate(`/practice?drive=${encodeURIComponent(context.drive_id)}`);
  };
  const statusText = context
    ? !selectedATSQualified ? selectedATS.pending ? "Checking ATS Fit" : selectedATS.score === null ? "ATS not assessed" : "Not eligible" : selected?.eligibility_status === "ineligible" || context.eligibility?.status === "ineligible" ? "Not eligible" : assignmentExpired ? "Expired" : interviewWindow === "closed" ? "Closed" : context.is_locked || selected?.is_locked ? "Locked" : canResume ? "In progress"
      : context.main_resume_available === false ? "Main Resume required"
      : interviewWindow === "closed" ? "Closed"
      : interviewWindow === "not_open" ? "Scheduled"
      : context.assignment_status === "expired" ? "Expired"
      : context.action === "not_assigned" ? "Awaiting assignment"
      : context.action === "completed" ? "Completed"
      : context.action === "blocked" ? "Action required"
      : canStart ? "Open now" : humanize(context.action)
    : "Checking status";
  let nextStep = "Your placement interview details are being checked.";
  if (context && attemptState) {
    if (!selectedATSQualified) nextStep = selectedATS.pending ? "Checking ATS Fit…" : selectedATS.score === null ? "An evaluated ATS Fit of at least 50% with relevant project/work evidence is required to interview." : "ATS Fit must be at least 50% with relevant project/work evidence to start an interview.";
    else if (selected?.eligibility_status === "ineligible" || context.eligibility?.status === "ineligible")
      nextStep = selected?.eligibility_reason || context.eligibility?.reason || "You do not meet this drive’s eligibility requirements.";
    else if (context.is_locked || selected?.is_locked)
      nextStep = "This placement is locked. Contact your placement cell to reopen interview access.";
    else if (context.main_resume_available === false)
      nextStep = "Upload or select your Main Resume in My Profile before starting or resuming this placement interview.";
    else if (interviewWindow === "closed" || selected?.status === "closed")
      nextStep = attemptState.remaining === 0 ? "You have completed all available attempts." : "This placement drive is closed. No further interview action is available.";
    else if (context.action === "not_assigned")
      nextStep = interviewWindow === "not_open" && context.interview_window_start_at
        ? `This interview opens on ${dateTime(context.interview_window_start_at)}.`
        : "You’re eligible, but your placement cell hasn’t assigned an interview attempt yet. You can begin once they assign one.";
    else if (interviewWindow === "not_open")
      nextStep = context.interview_window_start_at ? `This interview opens on ${dateTime(context.interview_window_start_at)}.` : "This interview has been scheduled and is not open yet.";
    else if (context.coach_gate_locked)
      nextStep = "Complete the required AI Coach preparation to unlock your next attempt.";
    else if (canResume) nextStep = "Your interview is in progress. Continue from where you left off.";
    else if (attemptState.next != null && attemptState.remaining > 0 && canStart)
      nextStep = attemptState.completed > 0
        ? `You completed Attempt ${attemptState.completed}. Review any released result, then start Attempt ${attemptState.next} while the interview window is open.`
        : `Your interview is open. Start Attempt ${attemptState.next} before the interview window closes.`;
    else if (attemptState.remaining === 0) nextStep = "You have completed all available attempts.";
    else if (context.publication_status === "scheduled") nextStep = "Your interview is complete. The result will be available after the placement team releases it.";
    else if (context.publication_status === "hidden") nextStep = "Your interview is complete. The placement team has not released the result yet.";
    else nextStep = "Your placement team will update this interview assignment. Refresh to check for changes.";
  }
  return (
    <>
      <PageHeading
        eyebrow="YOUR NEXT OPPORTUNITY"
        title="Campus placements"
        action={
          <button className="button secondary" onClick={()=>{studentDataCache.clear();resource.reload();reports.reload()}}>
            <RefreshCw size={16} />
            Refresh
          </button>
        }
      >
        Explore opportunities that match your placement eligibility criteria.
      </PageHeading>
      <section className="placement-career-banner" aria-label="Placement overview"><div><span className="placement-banner-eyebrow">YOUR NEXT CHAPTER</span><h2>Your dream career starts here</h2><p>Explore opportunities, prepare with confidence, and take your next step.</p><div className="placement-banner-benefits"><span><BriefcaseBusiness size={15}/>Apply faster</span><span><TrendingUp size={15}/>Track progress</span><span><Sparkles size={15}/>Build your career</span></div></div><dl>{[{label:"Opportunities",value:resource.data?.length},{label:"Active now",value:resource.data?.filter(d=>placementGroup(currentDriveState(d,now))==="active").length},{label:"In progress",value:resource.data?.filter(d=>currentDriveState(d,now).interview_status==="in_progress").length}].map(item=><div key={item.label}><BriefcaseBusiness size={22}/><dd>{item.value ?? "—"}</dd><dt>{item.label}</dt></div>)}</dl></section>
      <section className="panel placement-filter-panel" aria-label="Filter placement opportunities">
        <div className="placement-filter-grid">
          <label className="search-field">
            <span>Search opportunities</span>
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Company or role" />
          </label>
          <label><span>Interview status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option><option value="awaiting_assignment">Awaiting assignment</option><option value="open">Open now</option><option value="upcoming">Upcoming</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="expired">Expired</option><option value="closed">Closed</option>
            </select>
          </label>
          <label><span>Sort by</span>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="soonest">Soonest interview</option><option value="company">Company name</option>
            </select>
          </label>
        </div>
        <div className="placement-view-controls"><span className="placement-result-count">{items.length} {items.length === 1 ? "opportunity" : "opportunities"}</span><div className="placement-view-switcher" role="group" aria-label="Placement view"><button type="button" aria-pressed={view === "cards"} onClick={() => setView("cards")}><LayoutGrid size={15}/>Cards</button><button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}><Table2 size={15}/>Table</button></div></div>
      </section>
      <ResourceState resource={resource}>
        {items.length ? (
          <div className="placement-groups">
          {groups.filter((group) => group.drives.length > 0).map((group) => <section className="placement-group" key={group.key} aria-labelledby={`placement-group-${group.key}`}>
            <div className="placement-group-heading"><div><h2 id={`placement-group-${group.key}`}>{group.title}</h2><p>{group.description}</p></div><span>{group.drives.length}</span></div>
            {view === "table" ? <div className="placement-table-scroll" role="region" aria-label={`${group.title} opportunities`} tabIndex={0}><table className="placement-table"><caption className="sr-only">{group.title} placement opportunities</caption><thead><tr><th scope="col">Company & role</th><th scope="col">Location & window</th><th scope="col">Interview</th><th scope="col">Attempts</th><th scope="col">Compensation</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{group.drives.map(drive => {
              const info = placementPresentation(drive);
              return <tr key={drive.id} data-drive-id={drive.id}><td><div className="placement-table-company"><span className="placement-table-identity"><span className="company-avatar" aria-hidden="true">{(drive.company_name || "C").slice(0,2).toUpperCase()}</span>{drive.company_name}</span><strong>{drive.role_title}</strong></div><PlacementTableStatus drive={drive}/></td><td><span>{drive.location || "Location to be announced"}</span><small>{info.window}</small></td><td><span className={`pill ${info.status === "Locked" ? "placement-locked-badge" : ""}`}>{info.status}</span><small>{info.interview}</small>{drive.placement_decision && <PlacementResult value={drive.placement_decision} compact/>}</td><td><span>{info.attempts}</span></td><td><span>{info.compensation}</span><small>{humanize(drive.job_type || "Job type not set")}</small></td><td><button className="button secondary small" aria-label={`View opportunity at ${drive.company_name} for ${drive.role_title}`} onClick={() => void select(drive)}>View opportunity <ArrowRight size={14}/></button><Link className="button secondary small" to={`/ats-fit?drive=${encodeURIComponent(drive.id)}`}>Assessment Intelligence</Link></td></tr>;
            })}</tbody></table></div> : <div className="drive-grid">
            {group.drives.map((drive) => (
              <PlacementDriveCard key={drive.id} drive={drive} reports={reports.data?.reports||[]} select={select}/>
            ))}
            </div>}
          </section>)}
          </div>
        ) : (
          <Empty
            title={
              hasFilters
                ? "No matching opportunities"
                : "Your next opportunity is on its way"
            }
          >
            {hasFilters
              ? <>Adjust your filters or <button className="text-button" onClick={() => { setSearch(""); setStatusFilter("all"); }}>clear them</button>.</>
              : "Eligible placement drives will appear here when your placement cell publishes them."}
          </Empty>
        )}
      </ResourceState>
      {selected && <Dialog labelledBy="drive-title" close={closeOpportunity} className="opportunity-dialog">
        <div className="opportunity-shell">
          <header className="opportunity-header">
            <div className="opportunity-identity">
              <span className="company-avatar" aria-hidden="true">{(selected.company_name || "C").slice(0, 2).toUpperCase()}</span>
              <div className="opportunity-title"><span className="eyebrow">PLACEMENT OPPORTUNITY</span><h2 id="drive-title">{selected.company_name}</h2><p>{selected.role_title}</p>
                <div className="opportunity-badges"><PlacementEligibilitySummary drive={selected} ats={selectedATS}/>{!["Eligible","Not eligible","ATS not assessed","Checking ATS Fit"].includes(statusText)&&<span className="pill opportunity-lifecycle">{statusText}</span>}</div>
              </div>
            </div>
            <div className="opportunity-header-actions">
              {canResume && <button className="button primary" onClick={resumeInterview}>Start Interview <ArrowRight size={16}/></button>}
              {canStart && <button className="button primary" onClick={startInterview}>Start Interview <ArrowRight size={16}/></button>}
              {context && context.main_resume_available === false && <Link className="button primary" to="/profile">Upload Main Resume <ArrowRight size={16}/></Link>}
              <button className="opportunity-close" aria-label="Close opportunity details" onClick={closeOpportunity}><X size={19}/></button>
            </div>
            <div className="opportunity-header-metadata">
              <span><MapPin size={15}/>{context?.location || selected.location || "Location not specified"}</span>
              <span><BriefcaseBusiness size={15}/>{humanize(selected.job_type || "Job type not specified")}</span>
              <span><Target size={15}/>{compensationLabel(selected)}</span>
              <span><CalendarDays size={15}/>{context?.interview_window_start_at ? dateTime(context.interview_window_start_at) : selected.window_start_at ? dateTime(selected.window_start_at) : date(selected.drive_date)}</span>
            </div>
          </header>
          {busy && <p className="opportunity-loading" role="status">Checking your interview assignment…</p>}
          {error && <div className="opportunity-error"><ErrorMessage message={error}/></div>}
          {context?.main_resume_available === false && <div className="placement-resume-callout" role="status"><strong>A Main Resume is required for every placement interview.</strong><span>Upload or select your Main Resume in My Profile. You can return here afterward and continue with the same resume.</span><Link className="button secondary" to="/profile">Go to My Profile</Link></div>}
          {selected.placement_decision && <div className="opportunity-outcome"><PlacementResult value={selected.placement_decision}/></div>}
          <div className="opportunity-layout">
            <main className="opportunity-main">
              <section className="opportunity-section opportunity-fit-section" aria-labelledby="opportunity-fit-heading"><div className="opportunity-fit-heading"><div><span className="eyebrow">YOUR MATCH</span><h3 id="opportunity-fit-heading">Resume fit &amp; eligibility</h3></div><Link className="button secondary small" to={`/ats-fit?drive=${encodeURIComponent(selected.id)}`}>View ATS assessment <ArrowRight size={14}/></Link></div><PlacementEligibilitySummary drive={selected} ats={selectedATS}/><p className="opportunity-evidence-note">Interview access requires ATS Fit of at least 50% with relevant project or work evidence. Listing a skill alone does not demonstrate role readiness.</p></section>
              {(context?.company_description || selected.company_description || companyWebsite || companyLinkedIn) && <section className="opportunity-section" aria-labelledby="company-about-heading">
                <div className="opportunity-section-heading"><span className="company-avatar" aria-hidden="true">{(selected.company_name || "C").slice(0, 2).toUpperCase()}</span><div><span className="eyebrow">COMPANY</span><h3 id="company-about-heading">About {selected.company_name}</h3></div></div>
                {(context?.company_description || selected.company_description) && <p className="opportunity-prose">{context?.company_description || selected.company_description}</p>}
                {(companyWebsite || companyLinkedIn) && <div className="opportunity-links">
                  {companyWebsite && <a href={companyWebsite} target="_blank" rel="noopener noreferrer">Visit company website <ExternalLink size={15}/></a>}
                  {companyLinkedIn && <a href={companyLinkedIn} target="_blank" rel="noopener noreferrer">Company on LinkedIn <ExternalLink size={15}/></a>}
                </div>}
              </section>}
              {(context?.job_description || selected.job_description) && <section className="opportunity-section" aria-labelledby="role-description-heading"><span className="eyebrow">THE ROLE</span><h3 id="role-description-heading">Job description</h3><p className="opportunity-prose opportunity-jd">{context?.job_description || selected.job_description}</p></section>}
              {eligibilityDetails.length > 0 && <section className="opportunity-section" aria-labelledby="eligibility-criteria-heading"><span className="eyebrow">PLACEMENT CRITERIA</span><h3 id="eligibility-criteria-heading">Eligibility criteria</h3><ul className="opportunity-round-list">{eligibilityDetails.map((detail) => <li key={detail}><span aria-hidden="true">•</span><strong>{detail}</strong></li>)}</ul></section>}
              <section className="opportunity-section" aria-labelledby="interview-process-heading">
                <span className="eyebrow">WHAT TO EXPECT</span><h3 id="interview-process-heading">Interview process</h3>
                <div className="opportunity-process-meta"><span><Clock3 size={16}/>{context?.duration_minutes || selected.interview_duration_minutes || "—"} minutes</span><span><Target size={16}/>{(context?.difficulty_tier || selected.difficulty_tier) === "dynamic" ? "Personalized" : humanize(context?.difficulty_tier || selected.difficulty_tier || "Difficulty not set")}</span><span><BriefcaseBusiness size={16}/>{context?.round_count ?? configuredRoundLabels(selected).length} {(context?.round_count ?? configuredRoundLabels(selected).length) === 1 ? "round" : "rounds"}</span></div>
                {configuredRoundLabels(selected).length > 0 ? <ol className="opportunity-round-list">{configuredRoundLabels(selected).map((round, index) => <li key={`${round}-${index}`}><span>{index + 1}</span><strong>{round}</strong></li>)}</ol> : <p className="opportunity-muted">Round details have not been provided yet.</p>}
              </section>
              {context && <section className="opportunity-section" aria-labelledby="attempts-heading">
                <span className="eyebrow">YOUR INTERVIEW PROGRESS</span><h3 id="attempts-heading">Attempts</h3>
                {attemptState && <p className="attempt-summary-line">{attemptSummaryText(attemptState)}{context.action === "not_assigned" ? " · Awaiting assignment" : ""}</p>}
                {context.action !== "not_assigned" && <ol className="attempt-timeline">
                  {(context.attempt_history || []).filter((attempt, index, rows) => rows.findIndex((item) => Number(item.attempt_number) === Number(attempt.attempt_number)) === index).sort((a, b) => a.attempt_number - b.attempt_number).map((attempt) => {
                    const number = safeAttemptNumber(attempt.attempt_number, 1, attemptState?.maximum);
                    const resultReady = Boolean(attempt.completed_at && attempt.submission_id && attempt.result_available);
                    return <li key={`attempt-${number}`} className="attempt-timeline-item completed"><div className="attempt-timeline-number">{number}</div><div className="attempt-timeline-content"><strong>Attempt {number}</strong><span>{attempt.completed_at ? `Completed${attempt.completed_at ? ` · ${dateTime(attempt.completed_at)}` : ""}` : "Completed"}</span>{attempt.completed_at && !resultReady && <small>{attempt.evaluation_status === "held_for_review" ? "Result under review" : "Result processing"}</small>}</div>{resultReady && <Link className="button secondary" to={`/reports?submission=${encodeURIComponent(attempt.submission_id!)}`}>View result</Link>}</li>;
                  })}
                  {attemptState?.current != null && !(context.attempt_history || []).some((attempt) => Number(attempt.attempt_number) === attemptState.current) && <li className="attempt-timeline-item current"><div className="attempt-timeline-number">{attemptState.current}</div><div className="attempt-timeline-content"><strong>Attempt {attemptState.current}</strong><span>{interviewWindow === "closed" ? "Interview closed" : "In progress"}</span></div>{canResume && <button className="button secondary" onClick={resumeInterview}>Start Interview</button>}</li>}
                  {attemptState?.next != null && attemptState.remaining > 0 && <li className="attempt-timeline-item next"><div className="attempt-timeline-number">{attemptState.next}</div><div className="attempt-timeline-content"><strong>Attempt {attemptState.next}</strong><span>{interviewWindow === "closed" ? "Interview closed" : canStart ? "Ready to start" : context.coach_gate_locked ? "Locked · preparation required" : interviewWindow === "not_open" ? "Scheduled" : context.action === "not_assigned" ? "Awaiting assignment" : "Not available yet"}</span></div></li>}
                  {attemptState?.next != null && attemptState.maximum > attemptState.next && <li className="attempt-timeline-item locked"><div className="attempt-timeline-number">···</div><div className="attempt-timeline-content"><strong>{attemptState.maximum - attemptState.next} more attempt{attemptState.maximum - attemptState.next === 1 ? "" : "s"}</strong><span>Unlock one at a time after the preceding attempt.</span></div></li>}
                  {!attemptState?.current && attemptState?.remaining === 0 && (context.attempt_history || []).length === 0 && <li className="attempt-timeline-item completed"><div className="attempt-timeline-number">✓</div><div className="attempt-timeline-content"><strong>No attempts remaining</strong><span>This assignment has reached its attempt limit.</span></div></li>}
                </ol>}
                {context.coach_gate_locked && <div className="opportunity-coach-gate"><strong>Complete the required AI Coach preparation</strong><p>Your next attempt unlocks when the required preparation and validation are complete.</p><Link className="button secondary" to={`/coach?drive=${encodeURIComponent(context.drive_id)}`}>Continue with AI Coach <ArrowRight size={16}/></Link></div>}
                <div className="opportunity-next-step"><span className="eyebrow">YOUR NEXT STEP</span><p>{nextStep}</p></div>
              </section>}
            </main>
            <aside className="opportunity-snapshot" aria-label="Opportunity snapshot"><span className="eyebrow">OPPORTUNITY SNAPSHOT</span><h3>{selected.role_title}</h3><dl>
              <div><dt>Company</dt><dd>{selected.company_name}</dd></div><div><dt>Role</dt><dd>{selected.role_title}</dd></div><div><dt>Location</dt><dd>{context?.location || selected.location || "Not specified"}</dd></div><div><dt>Job type</dt><dd>{humanize(selected.job_type || "Not specified")}</dd></div><div><dt>Compensation</dt><dd>{compensationLabel(selected)}</dd></div><div><dt>Interview window</dt><dd>{selected.window_start_at ? `${dateTime(selected.window_start_at)}${selected.window_end_at ? ` – ${dateTime(selected.window_end_at)}` : ""}` : date(selected.drive_date)}</dd></div><div><dt>Status</dt><dd>{statusText}</dd></div><div><dt>ATS eligibility</dt><dd>{context?.main_resume_available === false ? "Resume required" : !selectedATSQualified ? selectedATS.pending ? "Checking…" : selectedATS.score === null ? "Not assessed" : "Not eligible" : selected.eligibility_status === "ineligible" || context?.eligibility?.status === "ineligible" ? "Not eligible" : "Eligible"}</dd></div>
            </dl>{selected.application_deadline && <p className="opportunity-deadline"><strong>Application deadline</strong><span>{dateTime(selected.application_deadline)}</span></p>}</aside>
          </div>
          <footer className="opportunity-footer"><span>Your placement information is provided by your placement cell.</span><button className="button secondary" onClick={closeOpportunity}>Close details</button></footer>
        </div>
      </Dialog>}
    </>
  );
}

export function Reports() {
  const resource = useResource<{ reports: Report[] }>("/api/student/reports");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const reports = resource.data?.reports || [];
  const ready = reports.filter((report) => report.report?.status !== "awaiting_release" && report.report?.overall_score != null);
  const pending = reports.filter((report) => report.report?.status === "awaiting_release");
  const latestScore = ready.reduce<number | null>((best, report) => best == null || report.report!.overall_score! > best ? report.report!.overall_score! : best, null);
  return (
    <div className="student-reports-page">
      <PageHeading
        eyebrow="YOUR INTERVIEW PROGRESS"
        title="Reports & feedback"
        action={
          <button className="button secondary" onClick={resource.reload}>
            <RefreshCw size={16} />
            Refresh
          </button>
        }
      >
        Review what went well, see what to practice next, and keep track of feedback shared by your placement team.
      </PageHeading>
      <ResourceState resource={resource}>
        {resource.data && <>
          <section className="student-reports-overview" aria-label="Report overview">
            <article><span>INTERVIEWS</span><strong>{reports.length}</strong><small>Practice and placement</small></article>
            <article><span>FEEDBACK READY</span><strong>{ready.length}</strong><small>Reports you can review</small></article>
            <article><span>IN REVIEW</span><strong>{pending.length}</strong><small>Waiting for placement team</small></article>
            <article><span>TOP SCORE</span><strong>{latestScore == null ? "—" : score(latestScore)}</strong><small>Across released reports</small></article>
          </section>
          <section className="student-reports-toolbar" aria-label="Find a report">
            <label className="student-reports-search"><Search size={17}/><input aria-label="Search reports" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company or role" /></label>
            <label className="student-reports-filter"><select aria-label="Interview type" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All interviews</option><option value="placement">Placement interviews</option><option value="practice">Practice interviews</option></select></label>
            <div className="placement-view-switcher" role="group" aria-label="Reports view"><button aria-pressed={view === "cards"} onClick={() => setView("cards")}><LayoutGrid size={15}/>Cards</button><button aria-pressed={view === "table"} onClick={() => setView("table")}><Table2 size={15}/>Table</button></div>
          </section>
          {reports.length ? <ReportList reports={reports} search={search} filter={filter} view={view}/> : <section className="panel"><Empty title="Your feedback starts here" action>Your interview reports will appear here when an interview has been reviewed and the report is ready.</Empty></section>}
        </>}
      </ResourceState>
    </div>
  );
}

export function Growth() {
  const resource = useResource<Readiness>("/api/student/readiness");
  const metrics = [{key: "overall", label: "Placement readiness", value: resource.data?.overall_score, icon: Target, text: "Your overall preparation for placement opportunities."}, {key: "interview", label: "Interview readiness", value: resource.data?.axis_scores?.interview_readiness, icon: Mic, text: "How confidently you demonstrate your skills."}, {key: "resume", label: "Resume readiness", value: resource.data?.axis_scores?.resume_readiness, icon: FileText, text: "How clearly your resume presents your experience."}];
  return <section className="panel overview-growth"><div className="section-heading"><div><span className="eyebrow">SEE HOW FAR YOU’VE COME</span><h2>My growth</h2><p>A clearer view of your preparation, one step at a time.</p></div><button className="button secondary small" onClick={resource.reload}><RefreshCw size={15}/> Refresh</button></div><ResourceState resource={resource}>{resource.data && <div className="growth-summary">{metrics.map(({key,label,value,icon:Icon,text}) => <div key={key}><div className="growth-metric-heading"><span className="record-icon"><Icon size={18}/></span><span>{label}</span></div><strong>{value == null ? "—" : score(value)}</strong><p>{text}</p><progress max={100} value={value ?? 0} aria-label={label}/><small>{value == null ? "Complete an assessment to see your progress" : "Based on your latest assessment"}</small></div>)}</div>}</ResourceState></section>;
}

export function Profile() {
  const { identity, refresh } = useAuth();
  const student = identity!.student;
  useEffect(() => { void refresh(); }, [refresh]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoLoadError, setPhotoLoadError] = useState(false);
  const [photoLoadAttempt, setPhotoLoadAttempt] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [capturedUrl, setCapturedUrl] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoLight = usePhotoLight(videoRef, cameraOpen);
  const cameraStream = useRef<MediaStream | null>(null);
  useEffect(() => {
    let live = true;
    let objectUrl = "";
    setPhotoUrl("");
    setPhotoLoadError(false);
    if (student.photo_url) {
      void request("/api/student/profile/photo").then(response => response.blob()).then(blob => {
        if (!blob.type.startsWith("image/")) throw new Error("Photo could not be loaded.");
        if (live) { objectUrl = URL.createObjectURL(blob); setPhotoUrl(objectUrl); }
      }).catch(() => { if (live) setPhotoLoadError(true); });
    }
    return () => { live = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [student.photo_url, photoLoadAttempt]);
  useEffect(() => () => {
    cameraStream.current?.getTracks().forEach(track => track.stop());
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
  }, [capturedUrl]);
  useEffect(() => {
    if (cameraOpen && videoRef.current && cameraStream.current) videoRef.current.srcObject = cameraStream.current;
  }, [cameraOpen]);
  function stopCamera() {
    cameraStream.current?.getTracks().forEach(track => track.stop());
    cameraStream.current = null;
    setCameraOpen(false);
  }
  async function startCamera() {
    setError(""); setMessage("");
    if (!navigator.mediaDevices?.getUserMedia) { setError("Camera is unavailable in this browser. Upload a photo instead."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      cameraStream.current = stream;
      setCameraOpen(true);
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : "";
      setError(name === "NotAllowedError" || name === "PermissionDeniedError"
        ? "Camera permission denied. Allow camera access or upload a photo."
        : "Camera is unavailable. Check that it is connected and not being used by another app.");
    }
  }
  function clearCapture() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(""); setCapturedPhoto(null);
  }
  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) { setError("Camera preview is not ready yet. Try again in a moment."); return; }
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) { setError("Could not capture a photo. Please try again."); return; }
    context.translate(canvas.width, 0); context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) { setError("Could not capture a photo. Please try again."); return; }
      const file = new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
      clearCapture(); setCapturedPhoto(file); setCapturedUrl(URL.createObjectURL(file)); stopCamera();
    }, "image/jpeg", 0.92);
  }
  async function uploadPhoto(file: File) {
    if (file.size > 10 * 1024 * 1024) { setError("Choose an image smaller than 10 MB."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const form = new FormData(); form.append("photo", file, file.name || "profile-photo.jpg");
      await request("/api/student/profile/photo", { method: "POST", body: form });
      stopCamera(); clearCapture();
      await refresh();
      setMessage("Profile photo saved and locked.");
    } catch (e) { setError((e as Error).message || "Upload failed, try again."); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const changes: { date_of_birth?: string | null } = {};
    if (form.has("date_of_birth")) changes.date_of_birth = String(form.get("date_of_birth") || "") || null;
    try { await api("/api/student/profile", { ...json(changes), method: "PATCH" }); setMessage("Your profile details have been saved."); await refresh(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <>
    <PageHeading eyebrow="THE PERSON BEHIND THE POTENTIAL" title="My profile">Your student identity and profile details, in one place.</PageHeading>
    <section id="profile-photo" className="panel profile-panel">
      <div className="profile-heading">
        <div className="profile-avatar-wrap">
          <span className="avatar large">{photoUrl ? <img src={photoUrl} alt="Your verified profile"/> : student.full_name.split(/\s+/).slice(0, 2).map(n => n[0]).join("")}</span>
        </div>
        <div className="profile-heading-identity"><h2>{displayName(student.full_name)}</h2><p>{displayName(student.college_name) || "Student"}</p></div>
        <div className="profile-heading-actions">
          <span className="pill">Student account</span>
          {!student.photo_url && student.allow_student_photo_upload && !cameraOpen && !capturedPhoto && <div className="profile-photo-actions">
            <button type="button" className="button secondary profile-upload-button" disabled={busy} onClick={() => photoInput.current?.click()}><Upload size={15}/>Upload photo</button>
            <button type="button" className="button secondary profile-upload-button" disabled={busy} onClick={() => void startCamera()}><Camera size={15}/>Use webcam</button>
          </div>}
          {!student.photo_url && student.allow_student_photo_upload && cameraOpen && <div className="profile-photo-actions"><button type="button" className="button primary profile-upload-button" onClick={capturePhoto}><Camera size={15}/>Capture</button><button type="button" className="button secondary profile-upload-button" onClick={stopCamera}>Cancel</button></div>}
          {!student.photo_url && student.allow_student_photo_upload && capturedPhoto && <div className="profile-photo-actions"><button type="button" className="button secondary profile-upload-button" disabled={busy} onClick={() => { clearCapture(); void startCamera(); }}>Retake</button><button type="button" className="button primary profile-upload-button" disabled={busy} onClick={() => void uploadPhoto(capturedPhoto)}>{busy ? "Saving…" : "Use this photo"}</button></div>}
          <input ref={photoInput} className="profile-photo-input" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || Boolean(student.photo_url) || !student.allow_student_photo_upload} aria-label="Choose profile photo" onChange={e => { const file = e.currentTarget.files?.[0]; if (file) void uploadPhoto(file); e.currentTarget.value = ""; }}/>
        </div>
      </div>
      {cameraOpen && <div className="profile-capture"><PhotoTips/><div className="profile-camera-preview"><div className="profile-camera-frame"><video ref={videoRef} autoPlay playsInline muted aria-label="Webcam preview"/><span className="profile-face-outline" aria-hidden="true"/></div><LightBadge light={photoLight}/><p>The photo is checked for light, sharpness and position before it is saved.</p></div></div>}
      {capturedPhoto && <div className="profile-camera-preview"><img src={capturedUrl} alt="Captured profile photo preview"/><p>Review the photo before saving. You can retake it if needed.</p></div>}
      {!student.photo_url && !student.allow_student_photo_upload && <p className="muted">Your profile photo is managed by the placement team.</p>}
      {photoLoadError && <p className="profile-photo-load-error" role="alert">Photo could not be loaded. It is still locked. <button type="button" onClick={() => setPhotoLoadAttempt(value => value + 1)}>Retry</button></p>}
      {error && <ErrorMessage message={error}/>} {message && <p role="status">{message}</p>}
      <dl className="profile-details">{[["Email", student.email], ["Roll number", student.roll_number], ["Program", student.program], ["Department", student.department_code], ["Graduation year", student.graduation_year], ["CGPA", student.cgpa]].map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value ?? "Not provided"}</dd></div>)}</dl>
      <form className="profile-date-form" onSubmit={save}><label htmlFor="profile-date-of-birth">Date of birth</label><div><input id="profile-date-of-birth" name="date_of_birth" type="date" max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)} defaultValue={student.date_of_birth?.slice(0, 10) || ""}/><button className="button primary" disabled={busy}>{busy ? "Saving…" : "Save date of birth"}</button></div></form>
      <p className="muted">Your placement team manages academic details. Contact your placement cell to request corrections.</p>
    </section>
    <CareerProfile />
  </>;
}
