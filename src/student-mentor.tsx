import { useCallback, useEffect, useState } from "react";
import {
  Mail,
  Phone,
  Users,
  Target,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { api } from "./api";
type Milestone = {
  id: string;
  title: string;
  due: string | null;
  done: boolean;
};
type MentorResponse = {
  mentor: {
    id: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    designation: string;
    expertise: string;
    active: boolean;
    plan: string | null;
    notes: string | null;
    milestones: Milestone[] | null;
    updated_at: string | null;
  } | null;
  progress: {
    readiness: number | null;
    competency: number | null;
    dimensions: { name: string; value: number }[];
    assessmentAt: string | null;
  } | null;
};
export function StudentMentor() {
  const [data, setData] = useState<MentorResponse | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await api<MentorResponse>("/api/student/mentor", {
        signal,
      });
      if (signal?.aborted) return;
      setData(result);
      setError("");
    } catch (e) {
      if (!signal?.aborted)
        setError(
          e instanceof Error ? e.message : "Unable to load your mentor.",
        );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const refresh = () => {
      if (!document.hidden) void load(controller.signal);
    };
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 30000);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);
  const mentor = data?.mentor,
    progress = data?.progress;
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div className="page-heading">
        <p className="eyebrow">YOUR INSTITUTION</p>
        <h1>My Mentor</h1>
        <p>Your faculty mentor, career goals and feedback.</p>
      </div>
      <button className="button" onClick={() => void load()}>
        <RefreshCw size={15} /> Refresh
      </button>
      {loading && <p role="status">Loading your mentor…</p>}
      {error && (
        <div className="panel" role="alert">
          <p>{error}</p>
          <button onClick={() => void load()}>Retry</button>
        </div>
      )}
      {!loading && !error && !mentor && (
        <div className="panel">
          <Users size={28} />
          <h2>No mentor assigned yet</h2>
          <p>
            Your institute will assign a faculty mentor. Their contact details
            and guidance will appear here.
          </p>
        </div>
      )}
      {mentor && !error && (
        <>
          <section className="panel" style={{ marginTop: 18 }}>
            <span className="badge">Faculty · Mentor</span>
            <h2>{mentor.name}</h2>
            <p>
              {[mentor.designation, mentor.department]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {!mentor.active && (
              <p>
                Your mentor is currently inactive. Contact your institute about
                reassignment.
              </p>
            )}
            <p>
              <Mail size={15} style={{ display: "inline", marginRight: 8 }} />
              <a href={`mailto:${mentor.email}`}>{mentor.email}</a>
            </p>
            {mentor.phone && (
              <p>
                <Phone
                  size={15}
                  style={{ display: "inline", marginRight: 8 }}
                />
                <a href={`tel:${mentor.phone.replace(/[^+\d]/g, "")}`}>
                  {mentor.phone}
                </a>
              </p>
            )}
            {mentor.expertise && <p>Mentoring areas: {mentor.expertise}</p>}
          </section>
          <div className="career-grid" style={{ marginTop: 18 }}>
            <section className="panel">
              <h2>
                <Target size={18} style={{ display: "inline" }} /> My Career
                Plan
              </h2>
              <p style={{ whiteSpace: "pre-wrap" }}>
                {mentor.plan || "Your mentor has not added a plan yet."}
              </p>
              <h3>Mentor Feedback</h3>
              <p style={{ whiteSpace: "pre-wrap" }}>
                {mentor.notes || "No feedback has been recorded yet."}
              </p>
              {mentor.updated_at && (
                <small>
                  Updated {new Date(mentor.updated_at).toLocaleString()}
                </small>
              )}
            </section>
            <section className="panel">
              <h2>Milestones</h2>
              {mentor.milestones?.length ? (
                mentor.milestones.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: "12px 0",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    <CheckCircle2
                      size={16}
                      style={{
                        display: "inline",
                        marginRight: 8,
                        color: m.done ? "#16a34a" : "#94a3b8",
                      }}
                    />
                    <strong>{m.title}</strong>
                    <p>
                      {m.done ? "Completed" : "In progress"}
                      {m.due ? ` · Due ${m.due}` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <p>Your mentor has not assigned milestones yet.</p>
              )}
            </section>
          </div>
          <section className="panel" style={{ marginTop: 18 }}>
            <h2>Released Assessment Progress</h2>
            <p>
              Placement readiness:{" "}
              <b>
                {progress?.readiness == null
                  ? "Not assessed"
                  : `${progress.readiness}%`}
              </b>{" "}
              · Overall competency:{" "}
              <b>
                {progress?.competency == null
                  ? "Not assessed"
                  : `${progress.competency}%`}
              </b>
            </p>
            {progress?.dimensions?.map((d) => (
              <p key={d.name}>
                {d.name}: <b>{d.value}%</b>
              </p>
            ))}
            <small>
              Uses the same released placement assessment record as your mentor
              and institute. Unreleased or missing results are not estimated.
            </small>
          </section>
        </>
      )}
    </div>
  );
}
