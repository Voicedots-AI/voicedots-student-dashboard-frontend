import { Link } from "react-router-dom";
import {
  Award,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  ListChecks,
  LockKeyhole,
  Play,
  Plus,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { apiUrl, type InterviewReportView, type QuestionReview, type Report } from "./api";
import { useAuth } from "./auth";
import { Empty, ResourceState, date, useResource } from "./ui";
import { PerformanceSharing } from "./performance-sharing";
import "./performance-reference.css";

type DashboardQuestion = QuestionReview & {
  competency?: string;
  score?: number | null;
};

type DashboardReportView = Omit<InterviewReportView, "question_reviews"> & {
  rubric_version?: string;
  ai_assessment?: boolean;
  question_reviews?: DashboardQuestion[];
};

type ReleasedReport = Report & { released_to_student_at?: string | null };

type Recording = {
  status: string;
  playback_url: string | null;
  started_at?: string;
  duration_seconds?: number;
  segment_count?: number;
};

type Competency = { key: string; name: string; score: number | null };
type TrendPoint = { sessionId: string; at: string; score: number };

const numeric = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const rounded = (value: number | null | undefined) => numeric(value) ? Math.round(value) : "—";
const normalized = (value?: string | null) => (value || "").trim().toLocaleLowerCase();

function reportView(report?: Report): DashboardReportView | null {
  return (report?.report as DashboardReportView | null | undefined) ?? null;
}

function isReleased(report: ReleasedReport) {
  const view = reportView(report);
  // Older report responses omit the release timestamp; their existing status
  // and awaiting-release projection remain the authoritative publication gate.
  return report.status === "released" && report.released_to_student_at !== null
    && Boolean(view) && view?.status !== "awaiting_release" && numeric(view?.overall_score);
}

function reportTime(report: Report) {
  return report.completed_at || report.created_at;
}

function competencyRows(view: DashboardReportView): Competency[] {
  return [...(view.core_dimensions || []), ...(view.domain_dimensions || [])].map((item) => ({
    key: item.dimension,
    name: item.dimension.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()),
    score: numeric(item.percentage) ? item.percentage : numeric(item.band) ? item.band * 25 : null,
  }));
}

function itemText(item: unknown): string | null {
  if (typeof item === "string") return item.trim() ? item : null;
  if (!item || typeof item !== "object") return null;
  const value = item as Record<string, unknown>;
  for (const key of ["text", "focus", "problem", "area"]) {
    if (typeof value[key] === "string" && value[key].trim()) return value[key];
  }
  return null;
}

function strengths(view: DashboardReportView) {
  return (view.strengths || []).map(itemText).filter((item): item is string => Boolean(item));
}

function developmentItems(view: DashboardReportView) {
  const priority = (view.priority_improvement_areas || []).flatMap(area => {
    const actions = (area.actions || []).filter(action => typeof action === "string" && action.trim());
    return actions.length ? actions : [itemText(area)].filter((item): item is string => Boolean(item));
  });
  if (priority.length) return priority;
  return [...(view.improvements || []), ...(view.weaknesses || [])]
    .map(itemText)
    .filter((item): item is string => Boolean(item));
}

function questionOffset(question: DashboardQuestion, recording: Recording | null) {
  if (recording?.status !== "ready" || !recording.playback_url || Number(recording.segment_count || 0) > 1) return null;
  const startedAt = Date.parse(recording.started_at || "");
  const questionAt = Date.parse(question.answer_started_at || question.asked_at || "");
  const offset = (questionAt - startedAt) / 1000;
  const duration = Number(recording.duration_seconds || 0);
  return Number.isFinite(offset) && offset >= 0 && (!duration || offset <= duration) ? offset : null;
}

function timestamp(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function CompactTrend({ points }: { points: TrendPoint[] }) {
  const width = 360, height = 150, left = 28, right = 10, top = 18, bottom = 30;
  const x = (index: number) => points.length === 1 ? (left + width - right) / 2 : left + index * ((width - left - right) / (points.length - 1));
  const y = (score: number) => top + (100 - score) / 100 * (height - top - bottom);
  const line = points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.score)}`).join(" ");
  const area = points.length > 1 ? `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z` : "";
  return <figure className="spi-trend">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Comparable score trend across ${points.length} ${points.length === 1 ? "interview" : "interviews"}`}>
      <defs><linearGradient id="spi-trend-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2086eb" stopOpacity=".22"/><stop offset="1" stopColor="#2086eb" stopOpacity="0"/></linearGradient></defs>
      {[0, 50, 100].map(mark => <g className="spi-chart-grid" key={mark}><line x1={left} x2={width - right} y1={y(mark)} y2={y(mark)}/><text x={left - 7} y={y(mark) + 4} textAnchor="end">{mark}</text></g>)}
      {area && <path d={area} fill="url(#spi-trend-fill)"/>}
      {points.length > 1 && <path className="spi-chart-line" d={line}/>}
      {points.map((point, index) => <g className="spi-chart-point" key={point.sessionId}>
        <circle cx={x(index)} cy={y(point.score)} r="5"/>
        <text className="spi-chart-score" x={x(index)} y={y(point.score) - 10} textAnchor="middle">{Math.round(point.score)}</text>
        <text className="spi-chart-date" x={x(index)} y={height - 8} textAnchor={points.length > 1 && index === 0 ? "start" : points.length > 1 && index === points.length - 1 ? "end" : "middle"}>{new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(point.at))}</text>
      </g>)}
    </svg>
  </figure>;
}

export function Performance() {
  const { identity } = useAuth();
  const reports = useResource<{ reports: ReleasedReport[] }>("/api/student/reports");
  const released = (reports.data?.reports || []).filter(isReleased).sort((a, b) => Date.parse(reportTime(b)) - Date.parse(reportTime(a)));
  const latest = released[0];
  const evaluation = useResource<DashboardReportView>(latest ? `/api/interview/${encodeURIComponent(latest.session_id)}/evaluation` : null);
  const latestView = evaluation.data?.status === "awaiting_release" ? null : evaluation.data;
  const recording = useResource<Recording>(latest?.drive_id && latestView ? `/api/student/interview/${encodeURIComponent(latest.session_id)}/recording` : null);
  const student = identity?.student;
  const degree = [student?.program, student?.department_code].filter(Boolean).join(" · ");

  if (!latest || !latestView) {
    return <div className="spi-page">
      <header className="spi-header"><div><span className="eyebrow">MY PERFORMANCE</span><h1>Student Assessment Intelligence</h1><p><strong>{student?.full_name}</strong>{degree && ` · ${degree}`}</p></div></header>
      <ResourceState resource={reports}>{latest ? <ResourceState resource={evaluation}>{evaluation.data && <section className="panel spi-empty-state"><Empty title="Your performance dashboard is waiting for its first result" action>Your completed interviews are still being reviewed. Results appear here once they are released.</Empty></section>}</ResourceState> : reports.data && <section className="panel spi-empty-state"><Empty title="Your performance dashboard is waiting for its first result" action>{reports.data.reports.length ? "Your completed interviews are still being reviewed. Results appear here once they are released." : "Complete a practice interview to see your scores, skills and progress here."}</Empty></section>}</ResourceState>
    </div>;
  }

  const competencies = competencyRows(latestView);
  const questions = latestView.question_reviews || [];
  const strengthItems = strengths(latestView);
  const gapItems = developmentItems(latestView);
  const rubric = latestView.rubric_version;
  const comparableReports = rubric && normalized(latest.target_role)
    ? released.filter(report => normalized(report.target_role) === normalized(latest.target_role) && reportView(report)?.rubric_version === rubric)
    : [latest];
  const comparable = [...comparableReports].reverse().filter(report => Number.isFinite(Date.parse(reportTime(report)))).map(report => ({
    sessionId: report.session_id,
    at: reportTime(report),
    score: reportView(report)!.overall_score!,
  }));
  const comparableChange = comparable.length > 1 ? comparable.at(-1)!.score - comparable.at(-2)!.score : null;
  const answered = questions.filter(question => Boolean(question.answer?.trim()) || question.evidence_status === "answered" || question.evidence_status === "limited_answer").length;
  const assessedCount = competencies.filter(item => item.score !== null).length;
  const duration = latest.duration_minutes ?? latestView.interview_profile?.duration_minutes;

  return <div className="spi-page">
    <header className="spi-header">
      <div><span className="eyebrow">MY PERFORMANCE</span><h1>Student Assessment Intelligence</h1><p><strong>{student?.full_name}</strong>{degree && ` · ${degree}`}</p></div>
      <div className="spi-buttons"><a className="button secondary" href={apiUrl(`/api/interview/${encodeURIComponent(latest.session_id)}/evaluation/report.pdf`)}><Download size={16}/> Download report</a><Link className="button primary" to="/practice"><Plus size={16}/> New interview</Link></div>
    </header>

    <div className="spi-context">
      {latest.target_role && <span><Award size={16}/>{latest.target_role}</span>}
      <span><CalendarDays size={16}/>Latest assessment: {date(reportTime(latest))}</span>
      {rubric && <span><FileText size={16}/>Rubric {rubric}</span>}
    </div>

    <section className="spi-kpis" aria-label="Performance summary">
      <article className="spi-card spi-score"><div className="spi-ring" style={{ background: `conic-gradient(#2086eb ${(numeric(latestView.overall_score) ? latestView.overall_score : 0) * 3.6}deg, #e8eef6 0deg)` }}><div><strong>{rounded(latestView.overall_score)}</strong><small>/100</small></div></div><div><h2>Interview Score</h2><p>Overall performance across assessed competencies</p></div></article>
      <article className="spi-card"><span className="spi-icon amber"><ChartNoAxesColumnIncreasing/></span><div><h2>Role Readiness</h2><strong className="spi-value">{latestView.readiness || "—"}</strong><p>Latest released assessment</p></div></article>
      <article className="spi-card"><span className="spi-icon green"><TrendingUp/></span><div><h2>Comparable Progress</h2><strong className="spi-value">{comparableChange == null ? "—" : `${comparableChange > 0 ? "+" : ""}${Math.round(comparableChange)} points`}</strong><p>Previous interview with the same role and rubric</p></div></article>
      {latest.evaluation_id && <article className="spi-card spi-scorecard"><span className="spi-icon purple"><FileText/></span><div><h2>Scorecard</h2><Link className="spi-scorecard-id" to={`/reports/${encodeURIComponent(latest.session_id)}`} title={`Evaluation ID: ${latest.evaluation_id}`}>{latest.evaluation_id}</Link><p>Evaluation ID · {date(reportTime(latest))}</p><PerformanceSharing sessionId={latest.session_id}/></div></article>}
    </section>

    <div className="spi-analysis">
      <section className="spi-card spi-panel"><h2><ChartNoAxesColumnIncreasing size={17}/> Competency vs Role Target</h2><div className="spi-table-wrap"><table className="spi-competencies"><thead><tr><th>Competency</th><th>Score</th><th>Target</th></tr></thead><tbody>{competencies.map(item => <tr key={item.key}><td><div className="spi-competency-cell"><span>{item.name}</span><div className="spi-track" role="meter" aria-label={item.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.score ?? undefined}><span style={{ width: `${Math.max(0, Math.min(100, item.score ?? 0))}%` }}/></div></div></td><td>{rounded(item.score)}</td><td>—</td></tr>)}</tbody></table></div>{!competencies.length && <p className="spi-unavailable">Not available for this report</p>}<p className="spi-note">— means the report does not provide a rubric target.</p></section>
      <section className="spi-card spi-panel"><h2><TrendingUp size={17}/> Comparable Interview Progress</h2><p className="spi-note">Same role and rubric only</p><CompactTrend points={comparable}/>{!rubric && <p className="spi-note">Rubric version is unavailable, so earlier interviews are not compared.</p>}</section>
      <section className="spi-card spi-panel"><h2><Sparkles size={17}/> Evidence-Based Insights</h2><div className="spi-insight green"><h3><CheckCircle2 size={16}/> Key Strengths</h3>{strengthItems.length ? strengthItems.map((item, index) => <p key={index}>{item}</p>) : <p>Not available for this report</p>}</div><div className="spi-insight amber"><h3><TriangleAlert size={16}/> Development Gaps</h3>{gapItems.length ? gapItems.map((item, index) => <p key={index}>{item}</p>) : <p>Not available for this report</p>}</div><p className="spi-note">Based on released answer evidence.</p></section>
    </div>

    <section className="spi-card spi-panel spi-evidence-card"><h2><FileText size={17}/> Question-Level Assessment &amp; Evidence</h2><div className="spi-table-wrap"><table className="spi-evidence"><thead><tr><th>#</th><th>Question</th><th>Competency</th><th>Score</th><th>Review</th></tr></thead><tbody>{questions.map((question, index) => { const offset = questionOffset(question, recording.data); return <tr key={question.turn_id || question.answer_id || index}><td>{index + 1}</td><td>{question.question || "—"}</td><td>{question.competency || "—"}</td><td>{numeric(question.score) ? question.score : "—"}</td><td>{offset == null ? "" : <Link className="spi-play" to={`/reports/${encodeURIComponent(latest.session_id)}?question=${index + 1}`}><Play size={13}/> Play {timestamp(offset)}</Link>}</td></tr>; })}</tbody></table></div>{!questions.length && <p className="spi-unavailable">Not available for this report</p>}</section>

    <div className="spi-bottom">
      <section className="spi-card spi-panel"><h2><Target size={17}/> Priority Development Plan</h2>{gapItems.length ? <ol className="spi-plan">{gapItems.slice(0, 3).map((item, index) => <li key={index}><span>{index + 1}</span><p>{item}</p></li>)}</ol> : <p className="spi-unavailable">Not available for this report</p>}</section>
      <section className="spi-card spi-panel"><h2><ListChecks size={17}/> Assessment Context</h2><dl className="spi-facts"><div><dt><Clock3 size={15}/> Interview duration</dt><dd>{numeric(duration) ? `${duration} minutes` : "—"}</dd></div><div><dt><CheckCircle2 size={15}/> Questions answered</dt><dd>{questions.length ? answered : "—"}</dd></div><div><dt><ChartNoAxesColumnIncreasing size={15}/> Competencies assessed</dt><dd>{competencies.length ? assessedCount : "—"}</dd></div>{latestView.ai_assessment === true && <div><dt><Sparkles size={15}/> Assessment method</dt><dd>AI assessment</dd></div>}</dl></section>
      <section className="spi-card spi-panel"><h2><Share2 size={17}/> Sharing &amp; Employer Access</h2><p className="spi-privacy"><LockKeyhole size={19}/> Private until you share</p><p>Create an expiring link and revoke access at any time. Your recording and answers stay private.</p><PerformanceSharing sessionId={latest.session_id}/></section>
    </div>

    <footer className="spi-note">Scores describe this released assessment and support human review. They do not guarantee placement or selection.</footer>
  </div>;
}
