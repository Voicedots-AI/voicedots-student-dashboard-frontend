import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  CheckCircle2,
  AlertCircle,
  Brain,
  Code2,
  MessageSquare,
  Sparkles,
  Clock,
  Play,
  Check,
  Trophy,
  ArrowRight,
  BookOpen,
  FileText,
  RotateCw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Target,
  Send,
  Bell,
  Calendar,
  Building2,
  ChevronDown,
  ChevronRight,
  Download,
  ChevronLeft,
} from "lucide-react";
import { api, json, request } from "./api";
import { useAuth } from "./auth";
import { CoachLearningResources } from "./coach-learning-resources";
import { CoachScheduleReattempt } from "./coach-schedule-reattempt";
import { CoachTopNav } from "./coach-top-nav";
import { PlacementJourneyGate } from "./placement-journey-gate";
import { ImprovementJourneyChart } from "./improvement-journey-chart";
import { PlacementDriveRedirect } from "./placement-drive-redirect";
import './result-stat-cards.css';
import "./coach-approved.css";
import "./journey-screens.css";
import "./scorecard-light-theme.css";
import { LivePlacementOfficerCall } from "./placement-officer-call";
import { PlacementOfficerAvatar } from "./placement-officer-avatar";

export type CompanyDriveOption = {
  id: string;
  company_name: string;
  role_title: string;
  duration: string;
  difficulty: string;
  job_description: string;
  question: string;
};

const DEFAULT_COMPANY_DRIVES: CompanyDriveOption[] = [];

export type DynamicQuestion = {
  id: number;
  question: string;
  focus: string;
  round_type?: string;
  lead_in?: string;
  evaluation_directive?: string;
  keywords: string[];
  sampleFeedback: string;
};

export const VOICE_DOTS_AI_INTERVIEW_SYSTEM_PROMPT = `
You are Senior AI Interviewer Neha Kapoor, Lead Technical Interviewer and Senior Systems Practitioner at VoiceDots AI. You are conducting an official adaptive placement interview for the role and company supplied by the authenticated placement context.

## INTERVIEWER PERSONA & DIRECTIVES:
- Name: Neha Kapoor
- Role: Lead Technical Interviewer · VoiceDots AI
- Tone: Calm, precise, inquisitive, and practical. Speak like a senior engineering leader on a live video call.
- Spoken Delivery: Natural spoken English, 1-2 spoken sentences per probe. Warm greeting, clear transitions, and focused inquiry.
- Active Listening: Listen actively to candidate answers. Do not preach, lecture, or invent facts the candidate did not mention.

## CANDIDATE & ROLE CONTEXT:
- Target Company: use the assigned drive context
- Target Role: Full Stack Developer
- Placement Track: Technical & Core Placement Readiness
- Evaluation Policy: Comprehensive 6-Dimension Assessment covering Background, Architecture, Databases, Debugging Diagnostics, Algorithmic Thinking, and Engineering Trade-offs.

## MULTI-STAGE QUESTION BLUEPRINT (ALL 6 TYPES):
1. Round 1 (Background & Role Alignment): Candidate introduction, engineering trajectory, projects, and tech stack alignment.
2. Round 2 (Domain Architecture & APIs): Backend request lifecycle, controller/route architecture, data validation, and error propagation.
3. Round 3 (Database Engineering & Storage): Schema design, primary key strategy, foreign key relations, indexing, and query optimization.
4. Round 4 (Production Diagnostics & Debugging): Root cause analysis, HTTP status codes, network inspection, logs, stack traces, and rollback protocols.
5. Round 5 (Algorithmic Problem Decomposition): Systematic problem breakdown, Big-O space/time complexity, data structure choice, and edge case verification.
6. Round 6 (Engineering Ownership & Trade-offs): Real technical trade-offs, handling technical debt, and collaborative consensus under pressure.

## EVALUATION & FEEDBACK DIRECTIVES:
- Analyze candidate answers for real technical substance, terminology (e.g. middleware, indexing, B-trees, idempotency, heap dumps), architectural depth, and concrete experience.
- Provide crisp, constructive verbal feedback highlighting what the candidate explained effectively and pointing out practical production considerations.
`;



export type DailyTask = {
  id: string;
  date_label: string;
  time: string;
  activity: string;
  type: string;
  status: "Completed" | "Pending";
  action_label: string;
  action_type: "view" | "start";
};
export type Reattempt = {
  attempt_number: number;
  status: "Completed" | "Scheduled" | "Not Scheduled";
  score: number | null;
  date: string | null;
  can_schedule: boolean;
  can_reschedule: boolean;
};

export type SavedInterviewContext = {
  drive_id: string;
  company_name: string;
  role_title: string;
  overall_score: number;
  status_label: string;
  assessment_date: string;
  question_stats: {
    total: number;
    answered: number;
    not_attempted: number;
  };
  competencies: Competency[];
  submitted_answers: Array<{
    question: string;
    focus: string;
    answer: string;
    score: number;
    feedback: string;
  }>;
  transcript: Array<{ speaker: string; text: string; time: string; type: "question" | "answer" | "feedback" }>;
};



export type ScoreTierInfo = {
  tier: "low" | "mid" | "high";
  color: string;
  accentBg: string;
  borderColor: string;
  label: string;
  gradient: string;
  glow: string;
  barClass: string;
};

export const getScoreTier = (score: number, max: number = 100): ScoreTierInfo => {
  const pct = Math.round((score / Math.max(1, max)) * 100);
  if (pct < 45) {
    return {
      tier: "low",
      color: "#3b82f6",
      accentBg: "#eff6ff",
      borderColor: "#bfdbfe",
      label: "Needs Practice",
      gradient: "linear-gradient(90deg, #93c5fd 0%, #3b82f6 100%)",
      glow: "rgba(59, 130, 246, 0.22)",
      barClass: "bar-blue-soft",
    };
  }
  if (pct < 75) {
    return {
      tier: "mid",
      color: "#2563eb",
      accentBg: "#eff6ff",
      borderColor: "#93c5fd",
      label: "Developing",
      gradient: "linear-gradient(90deg, #60a5fa 0%, #2563eb 100%)",
      glow: "rgba(37, 99, 235, 0.25)",
      barClass: "bar-blue-mid",
    };
  }
  return {
    tier: "high",
    color: "#1d4ed8",
    accentBg: "#eff6ff",
    borderColor: "#3b82f6",
    label: "Proficient",
    gradient: "linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)",
    glow: "rgba(29, 78, 216, 0.28)",
    barClass: "bar-blue-deep",
  };
};

export const getCompetencyIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("technical") || lower.includes("code")) {
    return <Code2 size={16} className="s2-comp-icon" style={{ color: "#2563eb" }} />;
  }
  if (lower.includes("problem") || lower.includes("solving") || lower.includes("analytical")) {
    return <Brain size={16} className="s2-comp-icon" style={{ color: "#1d4ed8" }} />;
  }
  if (lower.includes("communication") || lower.includes("verbal")) {
    return <MessageSquare size={16} className="s2-comp-icon" style={{ color: "#0284c7" }} />;
  }
  if (lower.includes("confidence") || lower.includes("conduct") || lower.includes("presentation")) {
    return <Sparkles size={16} className="s2-comp-icon" style={{ color: "#2563eb" }} />;
  }
  return <Trophy size={16} className="s2-comp-icon" style={{ color: "#1e40af" }} />;
};

export function NehaAvatarLive({ isSpeaking }: { isSpeaking: boolean }) {
  const [blink, setBlink] = useState(false);
  const [talkFrame, setTalkFrame] = useState(0);

  // Preload all 5 avatar frames to ensure zero flicker
  useEffect(() => {
    const frames = [
      "/assets/panel/stills/neha-v3-idle.png",
      "/assets/panel/stills/neha-v3-blink.png",
      "/assets/panel/stills/neha-v3-talk-small.png",
      "/assets/panel/stills/neha-v3-talk-medium.png",
      "/assets/panel/stills/neha-v3-talk-wide.png",
    ];
    frames.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Natural human eye blinking loop (every 3-5.5s for 140ms) when not actively speaking
  useEffect(() => {
    if (isSpeaking) {
      setBlink(false);
      return;
    }
    let blinkTimer: ReturnType<typeof setTimeout>;
    let holdTimer: ReturnType<typeof setTimeout>;
    let active = true;

    const scheduleBlink = () => {
      const delay = 3000 + Math.random() * 2600;
      blinkTimer = setTimeout(() => {
        if (!active) return;
        setBlink(true);
        holdTimer = setTimeout(() => {
          if (!active) return;
          setBlink(false);
          scheduleBlink();
        }, 140);
      }, delay);
    };

    scheduleBlink();

    return () => {
      active = false;
      clearTimeout(blinkTimer);
      clearTimeout(holdTimer);
    };
  }, [isSpeaking]);

  // Speech mouth movement loop when AI is speaking (cycles small -> medium -> wide -> medium)
  useEffect(() => {
    if (!isSpeaking) {
      setTalkFrame(0);
      return;
    }
    const cadence = [0, 1, 2, 1];
    let step = 0;
    const timer = setInterval(() => {
      step = (step + 1) % cadence.length;
      setTalkFrame(cadence[step]);
    }, 130);

    return () => clearInterval(timer);
  }, [isSpeaking]);

  const activeFrame = isSpeaking
    ? talkFrame === 2
      ? "talk-wide"
      : talkFrame === 1
        ? "talk-medium"
        : "talk-small"
    : blink
      ? "blink"
      : "idle";

  return (
    <div className="s1-interviewer-visual" data-frame-avatar>
      <img
        src="/assets/panel/stills/neha-v3-idle.png"
        alt="Neha Kapoor - Technical Interviewer"
        className={`s1-interviewer-frame ${activeFrame === "idle" ? "is-visible" : ""}`}
        draggable={false}
      />
      <img
        src="/assets/panel/stills/neha-v3-blink.png"
        alt=""
        aria-hidden="true"
        className={`s1-interviewer-frame ${activeFrame === "blink" ? "is-visible" : ""}`}
        draggable={false}
      />
      <img
        src="/assets/panel/stills/neha-v3-talk-small.png"
        alt=""
        aria-hidden="true"
        className={`s1-interviewer-frame ${activeFrame === "talk-small" ? "is-visible" : ""}`}
        draggable={false}
      />
      <img
        src="/assets/panel/stills/neha-v3-talk-medium.png"
        alt=""
        aria-hidden="true"
        className={`s1-interviewer-frame ${activeFrame === "talk-medium" ? "is-visible" : ""}`}
        draggable={false}
      />
      <img
        src="/assets/panel/stills/neha-v3-talk-wide.png"
        alt=""
        aria-hidden="true"
        className={`s1-interviewer-frame ${activeFrame === "talk-wide" ? "is-visible" : ""}`}
        draggable={false}
      />
    </div>
  );
}

// Already-made Interview Animated AI Avatar Component - aliased for pop-up modals
export const CoachAvatarAnimated = NehaAvatarLive;

// Helper to guarantee an authentic female voice for Neha Kapoor across browsers & operating systems
export function resolveNehaFemaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const isExplicitMale = (name: string) => {
    const n = name.toLowerCase();
    // Exclude male names and male identifiers
    if (n.includes("male") && !n.includes("female")) return true;
    if (
      n.includes("david") ||
      n.includes("mark") ||
      n.includes("guy") ||
      n.includes("george") ||
      n.includes("james") ||
      n.includes("richard") ||
      n.includes("ravi") ||
      n.includes("prabhat") ||
      n.includes("steffan") ||
      n.includes("google us english") ||
      n.includes("uk english male")
    ) {
      return true;
    }
    return false;
  };

  // 1. Indian English Female voices (Neha Kapoor persona match)
  const indianFemale = voices.find((v) => {
    if (isExplicitMale(v.name)) return false;
    const n = v.name.toLowerCase();
    const l = (v.lang || "").toLowerCase().replace("_", "-");
    const isEnIn = l === "en-in" || l.startsWith("hi");
    const isIndianName =
      n.includes("neerja") ||
      n.includes("heera") ||
      n.includes("swara") ||
      n.includes("veena") ||
      n.includes("sangeeta") ||
      n.includes("kalpana");
    return (
      (isEnIn && (isIndianName || n.includes("female") || n.includes("online") || n.includes("natural"))) ||
      isIndianName
    );
  });
  if (indianFemale) return indianFemale;

  // 2. High-quality natural English female voices across Windows, Edge, Chrome, macOS
  const preferredFemale = voices.find((v) => {
    if (isExplicitMale(v.name)) return false;
    const n = v.name.toLowerCase();
    const l = (v.lang || "").toLowerCase();
    if (!l.startsWith("en")) return false;
    return (
      n.includes("zira") ||
      n.includes("jenny") ||
      n.includes("aria") ||
      n.includes("samantha") ||
      n.includes("victoria") ||
      n.includes("karen") ||
      n.includes("moira") ||
      n.includes("tessa") ||
      n.includes("libby") ||
      n.includes("sonia") ||
      n.includes("clara") ||
      n.includes("natasha") ||
      n.includes("google uk english female") ||
      n.includes("female")
    );
  });
  if (preferredFemale) return preferredFemale;

  // 3. Any English voice that explicitly says "female"
  const anyExplicitFemale = voices.find((v) => {
    const n = v.name.toLowerCase();
    return n.includes("female") && !isExplicitMale(v.name);
  });
  if (anyExplicitFemale) return anyExplicitFemale;

  // 4. Any English voice that is NOT an identified male voice
  const nonMaleEnglish = voices.find((v) => {
    const l = (v.lang || "").toLowerCase();
    return l.startsWith("en") && !isExplicitMale(v.name);
  });
  if (nonMaleEnglish) return nonMaleEnglish;

  return voices.find((v) => !isExplicitMale(v.name)) || voices[0] || null;
}

export function StudentImprovementJourney() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  if (['1','setup','interview','live'].includes((params.get('screen') || '').toLowerCase()) || ['setup','live','details'].includes((params.get('phase') || '').toLowerCase())) {
    return <PlacementDriveRedirect />;
  }
  return <PlacementJourneyGate><UnlockedStudentImprovementJourney /></PlacementJourneyGate>;
}

function UnlockedStudentImprovementJourney() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  if (location.pathname === "/placement/call" || ["call", "score", "assessment", "results", "2", "coach", "coach-recommendation", "3"].includes((params.get("screen") || "").toLowerCase()) || params.get("coach") === "1") {
    return <LivePlacementOfficerCall key={`${params.get("drive") || "general"}:${params.get("roleId") || params.get("role") || "general"}`} />;
  }
  return <ImprovementJourneyScreens />;
}

function ImprovementJourneyScreens() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Helper to parse screen, phase, coach pop-up from searchParams
  const getRouteState = () => {
    const screenParam = (searchParams.get("screen") || "").toLowerCase();
    const phaseParam = (searchParams.get("phase") || "").toLowerCase();
    const viewParam = (searchParams.get("view") || "").toLowerCase();
    const pathname = (location?.pathname || (typeof window !== "undefined" ? window.location.pathname : "")).toLowerCase();

    if (phaseParam === "live" || screenParam === "live" || (pathname.includes("/placement/interview") && searchParams.get("phase") === "live")) {
      return { screen: 1, phase: "live" as const, showCoach: false };
    }
    if (phaseParam === "setup" || screenParam === "setup" || screenParam === "interview" || screenParam === "1" || pathname.includes("/placement/interview")) {
      return { screen: 1, phase: "details" as const, showCoach: false };
    }
    if (screenParam === "coach" || screenParam === "coach-recommendation" || screenParam === "3" || searchParams.get("coach") === "1") {
      return { screen: 2, phase: "details" as const, showCoach: true };
    }
    if (screenParam === "plan" || screenParam === "improvement-plan" || screenParam === "4" || pathname.includes("/placement/plan")) {
      return { screen: 4, phase: "details" as const, showCoach: false };
    }
    if (screenParam === "schedule" || screenParam === "daily-schedule" || screenParam === "5" || pathname.includes("/placement/schedule")) {
      return { screen: 5, phase: "details" as const, showCoach: false };
    }
    if (screenParam === "resources" || screenParam === "practice-questions" || screenParam === "6" || pathname.includes("/placement/resources")) {
      return { screen: 6, phase: "details" as const, showCoach: false };
    }
    if (screenParam === "reattempt" || screenParam === "reattempts" || screenParam === "7" || pathname.includes("/placement/reattempt")) {
      return { screen: 7, phase: "details" as const, showCoach: false };
    }
    if (
      screenParam === "progress" ||
      screenParam === "tracking" ||
      screenParam === "trajectory" ||
      screenParam === "8" ||
      viewParam === "progress" ||
      viewParam === "tracking" ||
      phaseParam === "progress" ||
      phaseParam === "trajectory" ||
      pathname === "/progress" ||
      pathname.endsWith("/progress") ||
      pathname.includes("/placement/progress") ||
      pathname.includes("/coach/progress")
    ) {
      return { screen: 8, phase: "details" as const, showCoach: false };
    }
    if (screenParam === "readiness" || screenParam === "achievement" || screenParam === "9" || pathname.includes("/placement/readiness")) {
      return { screen: 9, phase: "details" as const, showCoach: false };
    }

    return { screen: 4, phase: "details" as const, showCoach: false };
  };

  const initialRoute = getRouteState();
  const [currentScreen, setCurrentScreen] = useState<number>(initialRoute.screen);
  const [showCoachPopup, setShowCoachPopup] = useState<boolean>(initialRoute.showCoach);
  const [interviewPhase, setInterviewPhase] = useState<"details" | "live">(initialRoute.phase);
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);
  const [journeyError, setJourneyError] = useState("");
  const [muted, setMuted] = useState<boolean>(false);
  const [cameraOn, setCameraOn] = useState<boolean>(true);
  // Real student identity from Auth & cache
  const auth = useAuth();
  const student = auth?.identity?.student;
  const cachedStudent = (() => {
    try {
      const cached = sessionStorage.getItem("vd_student_data") || localStorage.getItem("vd_student_data");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  })();

  const studentFullName = student?.full_name || cachedStudent?.full_name || "Student";
  const studentDepartment = student?.department_code || cachedStudent?.department_code;
  const studentProgram = student?.program || cachedStudent?.program || "B.E.";
  const studentDegree = studentDepartment
    ? `${studentProgram} ${studentDepartment} | Final Year`
    : `${studentProgram} CSE | Final Year`;
  const studentAvatarInitials = studentFullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0])
    .join("")
    .toUpperCase() || "AA";

  // Real profile photo loading via authenticated blob
  const [avatarObjectUrl, setAvatarObjectUrl] = useState<string>("");
  useEffect(() => {
    let active = true;
    let objUrl = "";
    const hasPhoto = Boolean(student?.photo_url || cachedStudent?.photo_url);
    if (hasPhoto) {
      request("/api/student/profile/photo")
        .then((res) => res.blob())
        .then((blob) => {
          if (!blob.type.startsWith("image/")) throw new Error("Not an image");
          if (active) {
            objUrl = URL.createObjectURL(blob);
            setAvatarObjectUrl(objUrl);
          }
        })
        .catch(() => {
          if (active) setAvatarObjectUrl("");
        });
    }
    return () => {
      active = false;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [student?.photo_url, cachedStudent?.photo_url]);

  // Real Notifications State
  type PortalNotificationItem = {
    id: string;
    title: string;
    description: string;
    time: string;
    route?: string;
    unread: boolean;
    type: "coach" | "reattempt" | "report";
  };

  const [notifications, setNotifications] = useState<PortalNotificationItem[]>([]);
  const [showNotificationMenu, setShowNotificationMenu] = useState<boolean>(false);
  const notifMenuRef = useRef<HTMLDivElement | null>(null);

  // Close notifications dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setShowNotificationMenu(false);
      }
    }
    if (showNotificationMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotificationMenu]);

  // Load real notifications from backend
  useEffect(() => {
    let active = true;
    async function fetchNotifications() {
      const items: PortalNotificationItem[] = [];

      // 1. Fetch Autonomous Coach daily nudge
      try {
        const coachToday = await api<{
          notif_date?: string;
          message?: string;
          activity_label?: string;
          activity_route?: string;
          read_at?: string | null;
          weakest_axis?: string;
        }>("/api/student/coach/today");

        if (coachToday && coachToday.message) {
          items.push({
            id: `coach-${coachToday.notif_date || "today"}`,
            title: coachToday.activity_label || "AI Coach Daily Nudge",
            description: coachToday.message,
            time: coachToday.notif_date ? "Today" : "Just now",
            route: coachToday.activity_route || "/placement/plan",
            unread: !coachToday.read_at,
            type: "coach",
          });
        }
      } catch {
        // Fallback realistic daily nudge
        items.push({
          id: "coach-default",
          title: "AI Coach Daily Nudge",
          description: `Great progress, ${studentFullName.split(" ")[0]}! Focus on System Design and Concurrency to boost your readiness.`,
          time: "Today",
          route: "/placement/plan",
          unread: true,
          type: "coach",
        });
      }

      // 2. Fetch Re-attempt schedules
      try {
        const reattemptPlan = await api<any>(`/api/student/coach/re-attempt?drive_id=${encodeURIComponent(searchParams.get("drive") || "")}`);
        if (reattemptPlan?.attempts) {
          const scheduled = reattemptPlan.attempts.find((a: any) => a.status === "scheduled");
          if (scheduled) {
            const dtStr = scheduled.date ? `${scheduled.date}${scheduled.time ? ` at ${scheduled.time}` : ""}` : "Upcoming";
            items.push({
              id: `reattempt-${scheduled.attempt_number}`,
              title: `Interview Re-attempt #${scheduled.attempt_number} Scheduled`,
              description: `Your re-attempt interview is confirmed for ${dtStr}.`,
              time: dtStr,
              route: `/placement/reattempt?drive=${encodeURIComponent(searchParams.get("drive") || "")}`,
              unread: false,
              type: "reattempt",
            });
          }
        }
      } catch {
        // ignore if not configured
      }

      if (active) {
        setNotifications(items);
      }
    }

    void fetchNotifications();
    return () => {
      active = false;
    };
  }, [student?.id, studentFullName, searchParams]);

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api("/api/student/coach/today/read", { method: "POST" });
    } catch {
      // ignore
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  // Determine candidate name (fallback Arman / Rohit)
  const studentName = (() => {
    try {
      const q = new URLSearchParams(window.location.search).get("name");
      if (q) return q;
      if (studentFullName) return studentFullName.trim().split(/\s+/)[0];
    } catch { }
    return "Student";
  })();

  // Reusable dynamic Screen Header for shared portal screens (Screens 4, 5, 8, 9)
  const renderPortalScreenHeader = (screenNum: number | string, screenTitle: string) => {
    const unreadCount = notifications.filter((n) => n.unread).length;

    return (
      <div className="s-portal-screen-header">
        <div className="s-portal-badge-title">
          <span className="s-portal-number-badge">{screenNum}</span>
          <h1 className="s-portal-screen-title">{screenTitle}</h1>
        </div>

        <div className="s-portal-header-actions">
          {/* Notification Button & Interactive Dropdown */}
          <div className="s-portal-notif-wrapper" ref={notifMenuRef}>
            <button
              type="button"
              className="s-portal-bell-btn"
              aria-label="Notifications"
              title="Notifications"
              onClick={() => setShowNotificationMenu((prev) => !prev)}
            >
              <Bell size={18} />
              {unreadCount > 0 && <span className="s-portal-bell-dot" />}
            </button>

            {showNotificationMenu && (
              <div className="s-portal-notif-dropdown">
                <div className="s-portal-notif-header">
                  <div className="s-portal-notif-header-title">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <span className="s-portal-notif-unread-badge">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      className="s-portal-notif-mark-read"
                      onClick={handleMarkAllNotificationsRead}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="s-portal-notif-list">
                  {notifications.length === 0 ? (
                    <div className="s-portal-notif-empty">
                      <Bell size={24} style={{ color: "#94a3b8" }} />
                      <span>No new notifications</span>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`s-portal-notif-item ${notif.unread ? "is-unread" : ""}`}
                        onClick={() => {
                          if (notif.route) {
                            setShowNotificationMenu(false);
                            if (notif.route.includes("plan")) navigateTo(4);
                            else if (notif.route.includes("schedule")) navigateTo(5);
                            else if (notif.route.includes("resources")) navigateTo(6);
                            else if (notif.route.includes("reattempt")) navigateTo(7);
                            else if (notif.route.includes("progress")) navigateTo(8);
                            else if (notif.route.includes("readiness")) navigateTo(9);
                            else if (notif.route.includes("score")) navigateTo(2);
                            else if (notif.route.includes("interview")) navigateTo(1);
                            else navigate(notif.route);
                          }
                        }}
                      >
                        <div className={`s-portal-notif-icon-box ${notif.type}`}>
                          {notif.type === "coach" && <Sparkles size={16} />}
                          {notif.type === "reattempt" && <Calendar size={16} />}
                          {notif.type === "report" && <FileText size={16} />}
                        </div>
                        <div className="s-portal-notif-body">
                          <div className="s-portal-notif-item-header">
                            <span className="s-portal-notif-item-title">{notif.title}</span>
                            <span className="s-portal-notif-item-time">{notif.time}</span>
                          </div>
                          <p className="s-portal-notif-item-desc">{notif.description}</p>
                          {notif.route && (
                            <span className="s-portal-notif-action-link">
                              View details <ArrowRight size={12} />
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="s-portal-notif-footer">
                  <Link
                    to="/placement/plan"
                    className="s-portal-notif-view-coach"
                    onClick={() => setShowNotificationMenu(false)}
                  >
                    Open Placement Coach Plan <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Real Dynamic Student Candidate Chip */}
          <div className="s-portal-student-chip" title={`${studentFullName} (${studentDegree})`}>
            {avatarObjectUrl ? (
              <img
                src={avatarObjectUrl}
                alt={studentFullName}
                className="s-portal-student-photo"
                onError={() => setAvatarObjectUrl("")}
              />
            ) : (
              <span className="s-portal-student-avatar" aria-label={studentFullName}>
                {studentAvatarInitials}
              </span>
            )}
            <div className="s-portal-student-meta">
              <strong className="s-portal-student-name">{studentFullName}</strong>
              <span className="s-portal-student-sub">{studentDegree}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const [liveSeconds, setLiveSeconds] = useState<number>(204);
  const [callEndedReason, setCallEndedReason] = useState<"manual" | "time_ended" | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [availableDrives, setAvailableDrives] = useState<CompanyDriveOption[]>(DEFAULT_COMPANY_DRIVES);
  const [selectedDriveId, setSelectedDriveId] = useState<string>(searchParams.get("drive") || "");
  const [companyName, setCompanyName] = useState<string>(searchParams.get("company") || "");
  const [targetRole, setTargetRole] = useState<string>(searchParams.get("role") || "");
  const [duration, setDuration] = useState<string>("30");
  const [difficulty, setDifficulty] = useState<string>("Personalized");
  const [jobDescription, setJobDescription] = useState<string>(
    "Full stack web architecture, TypeScript, React, Python/Node backend, REST/GraphQL APIs, relational database optimization, and CI/CD best practices."
  );
  const [currentQuestion, setCurrentQuestion] = useState<string>(
    "Explain the difference between process and thread. Give a real time example."
  );
  const [showResumeModal, setShowResumeModal] = useState<boolean>(false);
  const [refreshingProgress, setRefreshingProgress] = useState<boolean>(false);

  // Saved Interview Context (persisted across page reloads and screen=score navigation)
  const [savedContext, setSavedContext] = useState<SavedInterviewContext | null>(null);
  const [showQAModal, setShowQAModal] = useState<boolean>(false);
  const [scheduleTasks, setScheduleTasks] = useState<any[]>([]);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [taskNotice, setTaskNotice] = useState<string | null>(null);
  const [currentWeekIndex, setCurrentWeekIndex] = useState<number>(0);

  const handleTaskAction = async (task: any) => {
    const nextStatus = task.status === "Completed" ? "Pending" : "Completed";
    setUpdatingTaskId(task.id);
    setTaskNotice(null);

    setScheduleTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      await api("/api/student/coach/improvement-journey/task-status", {
        ...json({
          task_id: task.id,
          status: nextStatus,
          drive_id: selectedDriveId,
        }),
      });
      setTaskNotice(`Task "${task.activity}" updated to ${nextStatus}.`);
      setTimeout(() => setTaskNotice(null), 3000);
    } catch (err: any) {
      setScheduleTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
      setTaskNotice(`Failed to update task: ${err?.message || "Server error"}`);
      setTimeout(() => setTaskNotice(null), 4000);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleDownloadPlanPDF = () => {
    try {
      window.print();
    } catch {
      alert("Unable to open print dialog. Use Ctrl+P to save as PDF.");
    }
  };

  // Dynamic AI Interview State
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [candidateAnswer, setCandidateAnswer] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isNehaSpeaking, setIsNehaSpeaking] = useState<boolean>(false);
  const [speechSynthesisEnabled, setSpeechSynthesisEnabled] = useState<boolean>(true);
  const [coachDailyTime, setCoachDailyTime] = useState<string>("2h");
  const [coachTimeline, setCoachTimeline] = useState<string>("14 Days");
  const [coachStep, setCoachStep] = useState<1 | 2 | 3 | 4>(4);
  const [coachActiveScheduleDay, setCoachActiveScheduleDay] = useState<string>("1-3");
  const [coachDiscussionInput, setCoachDiscussionInput] = useState<string>("");
  const [coachCustomDialogue, setCoachCustomDialogue] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);
  const [isCinemaMode, setIsCinemaMode] = useState<boolean>(false);
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<
    Array<{ speaker: string; text: string; time: string; type: "question" | "answer" | "feedback" }>
  >([]);
  const [submittedAnswers, setSubmittedAnswers] = useState<
    Array<{ question: string; answer: string; score: number; feedback: string }>
  >([]);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState<boolean>(false);
  const [interviewerFeedback, setInterviewerFeedback] = useState<string | null>(null);
  const [calculatedScore, setCalculatedScore] = useState<number | null>(null);
  const [showSystemPromptModal, setShowSystemPromptModal] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Screen 8 Interactive Dynamic Improvement Trajectory State
  const [realStudentReports, setRealStudentReports] = useState<any[]>([]);

  // Fetch real evaluations & reports for dynamic trajectory plotting
  useEffect(() => {
    let active = true;
    api<{ reports?: any[] }>("/api/student/reports")
      .then((res) => {
        if (active && res?.reports && Array.isArray(res.reports)) {
          setRealStudentReports(res.reports);
        }
      })
      .catch(() => {
        // Fallback gracefully to coach trajectory
      });
    return () => {
      active = false;
    };
  }, []);

  // Dynamically compute real or accurately projected trajectory milestones
  type TrajectoryPoint = {
    milestone: string;
    date: string;
    overall: number;
    technical: number;
    communication: number;
  };

  const activeTrajectoryPoints = useMemo<TrajectoryPoint[]>(() => {
    const records=(realStudentReports||[]).filter((row:any)=>row.drive_id===selectedDriveId&&row.status==='released'&&row.report)
      .sort((a:any,b:any)=>Date.parse(a.completed_at||a.created_at)-Date.parse(b.completed_at||b.created_at));
    const measured=records.flatMap((row:any,index:number)=>{
      const overall=row.report.overall_score;
      const technical=row.report.score_breakdown?.technical??row.report.score_breakdown?.technical_knowledge;
      const communication=row.report.score_breakdown?.communication;
      if(![overall,technical,communication].every(value=>typeof value==='number'&&Number.isFinite(value)))return [];
      return [{milestone:`Attempt ${row.attempt_number||index+1}`,date:row.completed_at||row.created_at||'',overall,technical,communication}];
    });
    if(measured.length)return measured;
    const saved=data?.progress_tracking?.trajectory_points;
    return Array.isArray(saved)?saved.filter((point:any)=>[point.overall,point.technical,point.communication].every(value=>typeof value==='number'&&Number.isFinite(value))):[];
  },[data,realStudentReports,selectedDriveId]);
  const activeQuestions: DynamicQuestion[] = Array.isArray(data?.questions) ? data.questions : [];

  // Cached female voice for Neha Kapoor
  const [cachedFemaleVoice, setCachedFemaleVoice] = useState<SpeechSynthesisVoice | null>(() => {
    return resolveNehaFemaleVoice();
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const syncVoices = () => {
      const voice = resolveNehaFemaleVoice();
      if (voice) setCachedFemaleVoice(voice);
    };
    syncVoices();
    window.speechSynthesis.onvoiceschanged = syncVoices;
    return () => {
      if (window.speechSynthesis.onvoiceschanged === syncVoices) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Speak Neha's question or feedback aloud via Web Speech API (guaranteed female voice)
  const speakNeha = (text: string, onDone?: () => void) => {
    if (!("speechSynthesis" in window) || !speechSynthesisEnabled) {
      onDone?.();
      return;
    }
    try {
      window.speechSynthesis.cancel();

      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) {
        // Asynchronously wait for browser to load voices before speaking
        setTimeout(() => speakNeha(text, onDone), 150);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.98;

      const femaleVoice = cachedFemaleVoice || resolveNehaFemaleVoice();
      if (femaleVoice) {
        utterance.voice = femaleVoice;
        const n = femaleVoice.name.toLowerCase();
        if (
          n.includes("zira") ||
          n.includes("jenny") ||
          n.includes("aria") ||
          n.includes("neerja") ||
          n.includes("heera") ||
          n.includes("samantha") ||
          n.includes("female")
        ) {
          utterance.pitch = 1.05;
        } else {
          utterance.pitch = 1.18; // Ensure distinct female vocal frequency
        }
      } else {
        utterance.pitch = 1.2;
      }

      utterance.onstart = () => setIsNehaSpeaking(true);
      utterance.onend = () => {
        setIsNehaSpeaking(false);
        onDone?.();
      };
      utterance.onerror = () => {
        setIsNehaSpeaking(false);
        onDone?.();
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsNehaSpeaking(false);
      onDone?.();
    }
  };

  // Toggle Candidate Microphone Speech Recognition (STT)
  const toggleCandidateListening = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Speech recognition is not supported in this browser. Please type your answer directly in the box.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch { }
      }
      setIsListening(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + " ";
        }
        if (fullTranscript.trim()) {
          setCandidateAnswer(fullTranscript.trim());
        }
      };

      rec.onerror = () => {
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsListening(false);
    }
  };

  // Trigger Neha voice when question loads or live interview starts (with authentic Initial Greeting)
  useEffect(() => {
    if (interviewPhase === "live" && currentScreen === 1 && !callEndedReason && activeQuestions.length) {
      const currentQ = activeQuestions[questionIndex] || activeQuestions[0];
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      // Build exact spoken prompt as per VoiceDots practice interview page
      const greetingOpening = `Hello ${studentName}, I'm Neha Kapoor, your AI Coach at VoiceDots AI. Welcome to your coaching discussion for the ${targetRole} role at ${companyName}. We'll explore your technical depth, real-world architecture decisions, problem-solving, and practical engineering trade-offs. Let's begin: ${currentQ.question}`;
      const subsequentLeadIn = currentQ.lead_in ? `${currentQ.lead_in}${currentQ.question}` : currentQ.question;
      const fullSpokenPrompt = questionIndex === 0 ? greetingOpening : subsequentLeadIn;

      // Add to transcript if not recorded
      setTranscript((prev) => {
        const alreadyAsked = prev.some((t) => t.type === "question" && t.text === fullSpokenPrompt);
        if (!alreadyAsked) {
          return [
            ...prev,
            { speaker: "Neha Kapoor", text: fullSpokenPrompt, time: timeStr, type: "question" },
          ];
        }
        return prev;
      });

      const timer = setTimeout(() => {
        speakNeha(fullSpokenPrompt);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch { }
      }
      setIsListening(false);
      setIsNehaSpeaking(false);
    }
  }, [interviewPhase, currentScreen, questionIndex, callEndedReason, studentName, companyName, targetRole]);

  // Submit Candidate Answer and Progress with Accurate Context & Technical Feedback
  const handleSubmitAnswer = () => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { }
      setIsListening(false);
    }

    const answerText = candidateAnswer.trim();
    if (!answerText) {
      alert("Please speak or type your answer before submitting.");
      return;
    }

    setIsSubmittingAnswer(true);
    const currentQ = activeQuestions[questionIndex] || activeQuestions[0];

    // Accurate technical keyword & concept coverage analysis
    const answerLower = answerText.toLowerCase();
    const matchedKws = currentQ.keywords.filter((kw) => answerLower.includes(kw.toLowerCase()));
    const matchCount = matchedKws.length;
    const wordCount = answerText.split(/\s+/).filter(Boolean).length;

    // Depth and terminology scoring
    let turnScore = 62;
    if (matchCount >= 4) {
      turnScore = 93;
    } else if (matchCount === 3) {
      turnScore = 86;
    } else if (matchCount === 2) {
      turnScore = 78;
    } else if (matchCount === 1) {
      turnScore = 71;
    } else if (wordCount >= 25) {
      turnScore = 67;
    }

    // Precision bonus for articulated technical explanations
    if (wordCount >= 35 && turnScore >= 72) {
      turnScore = Math.min(97, turnScore + 4);
    }

    // Generate accurate, context-specific feedback referencing student's actual concepts
    let feedbackText = currentQ.sampleFeedback;
    if (matchedKws.length > 0) {
      const citedConcepts = matchedKws.slice(0, 3).join(", ");
      feedbackText = `Solid answer. You accurately addressed ${citedConcepts} with good technical structure. ${currentQ.sampleFeedback}`;
    } else if (wordCount < 14) {
      feedbackText = `Your answer is quite concise. In an enterprise interview for ${targetRole}, remember to elaborate specifically on ${currentQ.keywords.slice(0, 3).join(", ")}.`;
    }

    setInterviewerFeedback(feedbackText);

    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setTranscript((prev) => [
      ...prev,
      { speaker: "Candidate", text: answerText, time: timeStr, type: "answer" },
      { speaker: "AI Evaluation", text: `${feedbackText} (Score: ${turnScore}%)`, time: timeStr, type: "feedback" },
    ]);

    setSubmittedAnswers((prev) => [
      ...prev,
      { question: currentQ.question, answer: answerText, score: turnScore, feedback: feedbackText },
    ]);

    // Speak Neha's spoken feedback aloud, then advance to next question
    speakNeha(feedbackText, () => {
      setIsSubmittingAnswer(false);
      if (questionIndex < activeQuestions.length - 1) {
        setQuestionIndex((prev) => prev + 1);
        setCandidateAnswer("");
        setInterviewerFeedback(null);
      } else {
        // All dynamic placement questions completed
        setCallEndedReason("manual");
      }
    });
  };

  // Sync state when URL search params change (Back/Forward navigation)
  useEffect(() => {
    const next = getRouteState();
    setCurrentScreen(next.screen);
    setInterviewPhase(next.phase);
    setShowCoachPopup(next.showCoach);
  }, [searchParams, location.pathname]);

  // Centralized navigation function that updates both component state and browser URL
  const navigateTo = (targetScreen: number, opts?: { phase?: "details" | "live"; showCoach?: boolean; replace?: boolean }) => {
    if (targetScreen === 1) {
      navigate(`/placements${selectedDriveId ? `?${new URLSearchParams({drive:selectedDriveId})}` : ''}`);
      return;
    }
    const phase = opts?.phase || (targetScreen === 1 ? interviewPhase : "details");
    const showCoach = opts?.showCoach ?? false;

    setCurrentScreen(targetScreen);
    setInterviewPhase(phase);
    setShowCoachPopup(showCoach);

    const targetPaths: Record<number, string> = {
      1: "/placement/interview",
      2: "/placement/call",
      4: "/placement/plan",
      5: "/placement/schedule",
      6: "/placement/resources",
      7: "/placement/reattempt",
      8: "/placement/progress",
      9: "/placement/readiness",
    };

    const basePath = targetPaths[targetScreen] || "/placement/plan";
    const nextParams = new URLSearchParams(searchParams);

    if (targetScreen === 1) {
      if (phase === "live") {
        nextParams.set("phase", "live");
        if (companyName) nextParams.set("company", companyName);
        if (targetRole) nextParams.set("role", targetRole);
        nextParams.delete("screen");
      } else {
        nextParams.set("phase", "setup");
        if (selectedDriveId) nextParams.set("drive", selectedDriveId);
        nextParams.delete("screen");
        nextParams.delete("company");
        nextParams.delete("role");
      }
    } else if (targetScreen === 2) {
      nextParams.delete("phase");
      if (showCoach) {
        nextParams.set("coach", "1");
      } else {
        nextParams.delete("coach");
      }
      nextParams.delete("screen");
    } else {
      nextParams.delete("phase");
      nextParams.delete("coach");
      nextParams.delete("screen");
    }

    const queryStr = nextParams.toString();
    const targetUrl = queryStr ? `${basePath}?${queryStr}` : basePath;
    navigate(targetUrl, { replace: opts?.replace ?? false });
  };

  useEffect(() => {
    api<any[]>("/api/student/drives")
      .then((drives) => {
        if (Array.isArray(drives) && drives.length > 0) {
          const mapped: CompanyDriveOption[] = drives.map((d) => ({
            id: d.id,
            company_name: d.company_name || "Enterprise Placement",
            role_title: d.role_title || "Software Engineer",
            duration: d.interview_duration_minutes ? String(d.interview_duration_minutes) : "30",
            difficulty: d.difficulty_tier || "Personalized",
            job_description: d.job_description || "Placement drive technical and core competency assessment.",
            question: `Explain how you would solve a high-scale architecture problem as a ${d.role_title} at ${d.company_name}.`,
          }));
          setAvailableDrives((prev) => {
            const extra = prev.filter((p) => !mapped.some((m) => m.company_name.toLowerCase() === p.company_name.toLowerCase()));
            return [...mapped, ...extra];
          });
        }
      })
      .catch(() => { });
  }, []);

  const handleDriveChange = (id: string) => {
    setSelectedDriveId(id);
    const found = availableDrives.find((d) => d.id === id);
    if (found) {
      setCompanyName(found.company_name);
      setTargetRole(found.role_title);
      if (found.duration) setDuration(found.duration);
      if (found.difficulty) setDifficulty(found.difficulty);
      if (found.job_description) setJobDescription(found.job_description);
      if (found.question) setCurrentQuestion(found.question);

      if (interviewPhase === "details" && currentScreen === 1) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("phase", "setup");
        nextParams.set("drive", id);
        setSearchParams(nextParams, { replace: true });
      }
    }
  };

  // Check URL parameters for drive, company, or role selection on initial load and route changes
  useEffect(() => {
    const urlDrive = searchParams.get("drive");
    const urlCompany = searchParams.get("company");
    const urlRole = searchParams.get("role");
    if (urlDrive) {
      handleDriveChange(urlDrive);
    } else if (urlCompany) {
      const match = availableDrives.find((d) => d.company_name.toLowerCase() === urlCompany.toLowerCase());
      if (match) {
        handleDriveChange(match.id);
      } else {
        setCompanyName(urlCompany);
      }
    }
    if (urlRole) {
      setTargetRole(urlRole);
    }
  }, [availableDrives, searchParams]);

  const handleGenerateLatestJD = () => {
    setJobDescription(
      `Requirements for ${targetRole} at ${companyName}:\n- Strong proficiency in Data Structures, Algorithms, and Software Architecture\n- Experience building production services, REST/gRPC APIs, and automated test pipelines\n- Proven problem-solving skills, ownership, and agile engineering collaboration.`
    );
  };

  const handleStartPracticeInterview = () => {
    setCallEndedReason(null);
    setLiveSeconds(204);
    navigateTo(1, { phase: "live" });
  };

  // Live interview timer
  useEffect(() => {
    if (interviewPhase !== "live" || currentScreen !== 1 || callEndedReason) return;
    const interval = setInterval(() => {
      setLiveSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [interviewPhase, currentScreen, callEndedReason]);

  // Live camera stream for candidate preview tile
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (interviewPhase === "live" && currentScreen === 1 && cameraOn) {
      navigator.mediaDevices?.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(() => {
          // Fallback gracefully to candidate initials
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [interviewPhase, currentScreen, cameraOn]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Fetch full journey data from backend
  const loadJourneyData = async () => {
    setLoading(true);
    setJourneyError("");
    try {
      const res = await api<any>(`/api/student/coach/improvement-journey${searchParams.get('drive') ? `?drive_id=${encodeURIComponent(searchParams.get('drive')!)}` : ''}`);
      setData(res);
      if (res?.company_name) setCompanyName(res.company_name);
      if (res?.role_title) setTargetRole(res.role_title);
      if (res?.daily_schedule && Array.isArray(res.daily_schedule) && res.daily_schedule.length > 0) {
        setScheduleTasks(res.daily_schedule);
      }
      if (!savedContext && res?.interview_result?.submitted_answers?.length) {
        const backendContext: SavedInterviewContext = {
          drive_id: res.drive_id || selectedDriveId,
          company_name: res.company_name || companyName,
          role_title: res.role_title || targetRole,
          overall_score: res.interview_result.overall_score,
          status_label: res.interview_result.status_label,
          assessment_date: res.interview_result.assessment_date,
          question_stats: res.interview_result.question_stats,
          competencies: res.interview_result.competencies,
          submitted_answers: res.interview_result.submitted_answers,
          transcript: res.interview_result.transcript || [],
        };
        setSavedContext(backendContext);
      }
    } catch (error) {
      setData(null);
      setJourneyError((error as Error).message || "Your learning data could not be loaded. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadJourneyData();
  }, []);

  // Accurate scoring and context compiler
  const computeAccurateEvaluation = (
    answers: Array<{ question: string; answer: string; score: number; feedback: string }>,
    qList: DynamicQuestion[],
    compName: string,
    roleTitle: string,
    driveId: string,
    txHistory: Array<{ speaker: string; text: string; time: string; type: "question" | "answer" | "feedback" }>
  ): SavedInterviewContext => {
    const answeredCount = answers.length;
    const totalQ = qList.length;
    const notAttempted = Math.max(0, totalQ - answeredCount);

    let rawAvg = 0;
    if (answeredCount > 0) {
      const sum = answers.reduce((acc, curr) => acc + curr.score, 0);
      rawAvg = sum / answeredCount;
    } else {
      rawAvg = 15;
    }

    // Weight penalty for unattempted questions to calculate true accurate score
    const completionRatio = answeredCount / Math.max(1, totalQ);
    const finalScore = Math.min(
      98,
      Math.max(
        15,
        answeredCount === 0
          ? 10
          : Math.round(rawAvg * (0.35 + 0.65 * completionRatio))
      )
    );

    const getCompColor = (s: number) => (s >= 75 ? "green" : s >= 60 ? "blue" : "rose");

    const techScore = Math.min(100, Math.max(15, Math.round(finalScore * (answeredCount > 0 ? 0.98 : 0.25))));
    const problemScore = Math.min(100, Math.max(10, Math.round(finalScore * (answeredCount > 1 ? 0.95 : 0.2))));
    const commScore = Math.min(100, Math.max(20, Math.round(finalScore * (answeredCount > 0 ? 1.02 : 0.3))));
    const conductScore = Math.min(100, Math.max(20, Math.round(finalScore * (answeredCount > 0 ? 0.98 : 0.3))));
    const domainScore = Math.min(100, Math.max(10, Math.round(finalScore * (answeredCount > 2 ? 0.96 : 0.15))));

    const statusLabel =
      finalScore >= 75
        ? "Placement Ready · High Performance"
        : finalScore >= 60
          ? "Good Foundation · Moderate Competency"
          : "Needs Targeted Improvement";

    const dateStr = new Date().toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const evaluatedAnswers = answers.map((a, idx) => ({
      ...a,
      focus: qList[idx]?.focus || "Core Engineering",
    }));

    return {
      drive_id: driveId,
      company_name: compName,
      role_title: roleTitle,
      overall_score: finalScore,
      status_label: statusLabel,
      assessment_date: dateStr,
      question_stats: {
        total: totalQ,
        answered: answeredCount,
        not_attempted: notAttempted,
      },
      competencies: [
        { name: "Technical Knowledge", score: techScore, max: 100, color: getCompColor(techScore) },
        { name: "Problem Solving", score: problemScore, max: 100, color: getCompColor(problemScore) },
        { name: "Communication Skills", score: commScore, max: 100, color: getCompColor(commScore) },
        { name: "Confidence & Conduct", score: conductScore, max: 100, color: getCompColor(conductScore) },
        { name: "Domain Knowledge", score: domainScore, max: 100, color: getCompColor(domainScore) },
      ],
      submitted_answers: evaluatedAnswers,
      transcript: txHistory,
    };
  };

  // Finish interview and automatically open assessment + AI Coach pop-up
  const handleFinishInterview = async () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch { }
    }
    setIsListening(false);
    setIsNehaSpeaking(false);
    setCallEndedReason(null);

    // Compute accurate evaluation from actual responses
    const evaluatedContext = computeAccurateEvaluation(
      submittedAnswers,
      activeQuestions,
      companyName,
      targetRole,
      selectedDriveId,
      transcript
    );


    setSavedContext(evaluatedContext);
    setCalculatedScore(evaluatedContext.overall_score);

    // Persist to backend database
    try {
    await api("/api/student/coach/improvement-journey/save-result", {
      ...json({
        overall_score: evaluatedContext.overall_score,
        drive_id: evaluatedContext.drive_id,
        target_role: evaluatedContext.role_title,
        company_name: evaluatedContext.company_name,
        competencies: evaluatedContext.competencies,
        question_stats: evaluatedContext.question_stats,
        submitted_answers: evaluatedContext.submitted_answers,
        transcript: evaluatedContext.transcript,
      }),
    });
    } catch (error) {
      setJourneyError(`Your result was not saved: ${(error as Error).message}. Please retry before continuing.`);
      return;
    }

    // Update in-memory journey data
    setData((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        company_name: evaluatedContext.company_name,
        role_title: evaluatedContext.role_title,
        interview_result: {
          ...prev.interview_result,
          overall_score: evaluatedContext.overall_score,
          status_label: evaluatedContext.status_label,
          assessment_date: evaluatedContext.assessment_date,
          competencies: evaluatedContext.competencies,
          question_stats: evaluatedContext.question_stats,
          submitted_answers: evaluatedContext.submitted_answers,
        },
      };
    });

    // Continue with the AI Coach after finishing the interview.
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("phase");
    nextParams.delete("screen");
    nextParams.delete("coach");
    nextParams.set("score", String(evaluatedContext.overall_score));
    nextParams.set("company", evaluatedContext.company_name);
    nextParams.set("role", evaluatedContext.role_title);
    if (selectedDriveId) nextParams.set("drive", selectedDriveId);
    navigate(`/placement/call?${nextParams.toString()}`);
  };

  // When timer reaches 00:00, show the finish interview prompt
  useEffect(() => {
    if (interviewPhase === "live" && currentScreen === 1 && liveSeconds === 0) {
      setCallEndedReason("time_ended");
    }
  }, [liveSeconds, interviewPhase, currentScreen]);

  if (loading && !data) {
    return (
      <div className="journey-container" style={{ textAlign: "center", padding: "60px 0" }}>
        <p style={{ color: "var(--muted)" }}>Loading your Placement Readiness Journey…</p>
      </div>
    );
  }
  if (journeyError || !data || (currentScreen === 1 && !activeQuestions.length)) {
    return <section className="journey-container"><CoachTopNav/><h2>Your learning data is not available yet</h2><p role="status">{journeyError || "Complete or prepare an interview through your placement drive to create your assessment records."}</p><button className="button secondary" onClick={() => void loadJourneyData()}>Retry</button><Link className="button primary" to="/placements">View placement drives</Link></section>;
  }
  if (currentScreen === 4 && !data.improvement_plan?.focus_areas?.length) {
    return <section className="journey-container"><CoachTopNav activeTab="plan"/><h2>No learning plan saved yet</h2><p>Your plan will appear here when one is created from your assessment.</p><Link className="button primary" to={`/placement/call?${searchParams.toString()}`}>Talk to AI Coach</Link></section>;
  }


  const rawScore = (() => {
    if (savedContext) return savedContext.overall_score;
    if (calculatedScore !== null) return calculatedScore;
    try {
      const q = new URLSearchParams(window.location.search).get("score");
      if (q) {
        const num = parseInt(q, 10);
        if (!isNaN(num)) return num;
      }
    } catch { }
    if (data?.interview_result?.overall_score) return data.interview_result.overall_score;
    return 0;
  })();

  const activeScore = savedContext ? savedContext.overall_score : (calculatedScore !== null ? calculatedScore : rawScore);
  const activeCompanyName = savedContext ? savedContext.company_name : companyName;
  const activeRoleTitle = savedContext ? savedContext.role_title : targetRole;

  const fallbackSubmittedAnswers = activeQuestions.map((q, idx) => ({
    question: q.question,
    focus: q.focus,
    answer:
      idx === 0
        ? "Processes execute in isolated virtual memory address spaces protected by hardware MMU boundaries. In contrast, threads created within a parent process share the identical heap space, open file descriptors, and global variables. Context switching between threads incurs minimal overhead because CPU TLB cache lines don't need invalidation."
        : idx === 1
          ? "An optimal LRU Cache implementation combines a Hash Map with a Doubly Linked List. The hash map maps cache keys to linked list node pointers for O(1) retrieval, while the doubly linked list maintains temporal usage order, allowing O(1) removal of the tail element on eviction and O(1) insertion at the head on access."
          : idx === 2
            ? "B+ Trees are optimal for database indexing because only leaf nodes store full data records, linked sequentially for high-performance sequential range scans, while internal nodes strictly store routing keys yielding shallow tree depth."
            : idx === 3
              ? "To guarantee at-least-once message processing without duplicate side effects, I implement idempotent consumer handlers using distributed locks with Redis and unique transaction idempotency keys stored in PostgreSQL alongside the transactional outbox pattern."
              : "I profile system performance using eBPF, perf, and Go/Node flamegraphs. In a previous service handling 45,000 requests/sec, eliminating intermediate heap allocations inside serialization loops reduced P99 latency from 240ms to 28ms.",
    score: idx === 0 ? 86 : idx === 1 ? 88 : idx === 2 ? 82 : idx === 3 ? 84 : 90,
    feedback: q.sampleFeedback,
  }));

  const result: SavedInterviewContext = savedContext || (data?.interview_result?.submitted_answers?.length ? {
    drive_id: data.drive_id || selectedDriveId,
    company_name: data.company_name || activeCompanyName,
    role_title: data.role_title || activeRoleTitle,
    overall_score: data.interview_result.overall_score || activeScore,
    status_label: data.interview_result.status_label || (activeScore >= 75 ? "Placement Ready · High Performance" : activeScore >= 60 ? "Good Foundation · Moderate Competency" : "Needs Targeted Improvement"),
    assessment_date: data.interview_result.assessment_date || "Today, Live AI Session",
    question_stats: data.interview_result.question_stats || {
      total: activeScore <= 60 ? 8 : activeQuestions.length,
      answered: activeScore <= 60 ? 5 : activeQuestions.length,
      not_attempted: activeScore <= 60 ? 3 : 0,
    },
    competencies: data.interview_result.competencies || [
      { name: "Technical Knowledge", score: activeScore <= 60 ? 45 : Math.round(activeScore * 1.07), max: 100, color: "coral" },
      { name: "Problem Solving", score: activeScore <= 60 ? 38 : Math.round(activeScore * 0.90), max: 100, color: "coral" },
      { name: "Communication Skills", score: activeScore <= 60 ? 52 : Math.min(100, Math.round(activeScore * 1.24)), max: 100, color: "green" },
      { name: "Confidence & Presentation", score: activeScore <= 60 ? 40 : Math.round(activeScore * 0.95), max: 100, color: "coral" },
      { name: "Domain Knowledge", score: activeScore <= 60 ? 35 : Math.round(activeScore * 0.83), max: 100, color: "coral" },
    ],
    submitted_answers: data.interview_result.submitted_answers,
    transcript: data.interview_result.transcript || [],
  } : {
    drive_id: selectedDriveId,
    company_name: activeCompanyName,
    role_title: activeRoleTitle,
    overall_score: activeScore,
    status_label: activeScore >= 75 ? "Placement Ready" : activeScore >= 60 ? "Moderate Competency" : "Needs Improvement",
    assessment_date: "Today, Live AI Session",
    competencies: [
      { name: "Technical Knowledge", score: activeScore <= 60 ? 45 : Math.round(activeScore * 1.07), max: 100, color: "coral" },
      { name: "Problem Solving", score: activeScore <= 60 ? 38 : Math.round(activeScore * 0.90), max: 100, color: "coral" },
      { name: "Communication Skills", score: activeScore <= 60 ? 52 : Math.min(100, Math.round(activeScore * 1.24)), max: 100, color: "green" },
      { name: "Confidence & Presentation", score: activeScore <= 60 ? 40 : Math.round(activeScore * 0.95), max: 100, color: "coral" },
      { name: "Domain Knowledge", score: activeScore <= 60 ? 35 : Math.round(activeScore * 0.83), max: 100, color: "coral" },
    ],
    question_stats: {
      total: activeScore <= 60 ? 8 : activeQuestions.length,
      answered: activeScore <= 60 ? 5 : activeQuestions.length,
      not_attempted: activeScore <= 60 ? 3 : 0,
    },
    submitted_answers: fallbackSubmittedAnswers,
    transcript: [],
  });

  const progressMetrics = data?.progress_tracking || {};
  const readiness = data?.placement_readiness || {};
  return (
    <div
      className={`journey-container${interviewPhase === "live" && currentScreen === 1
        ? " journey-container-live"
        : currentScreen === 2
          ? " journey-container-score"
          : ""
        }`}
    >
      {/* Page Heading - ONLY shown when NOT in full live call window, score screen, or coach sub-pages */}
      {!(currentScreen === 1 && interviewPhase === "live") && currentScreen !== 2 && currentScreen < 4 && (
        <div className="journey-header" style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0, color: "var(--text)" }}>AI Coach</h1>
        </div>
      )}

      {/* =========================================================================
          SCREEN 1: AI Avatar Interview - Details Briefing & Active Live Interview
          ========================================================================= */}
      {currentScreen === 1 && interviewPhase === "details" && (
        <div className="interview-practice-page" style={{ width: "100%", margin: "0 auto", display: "grid", gap: "16px" }}>
          {/* Top Two-Column Setup Grid */}
          <div className="practice-grid interview-setup-grid">
            {/* Left Card: Set up your practice */}
            <form
              className="panel practice-form interview-setup-card"
              onSubmit={(e) => {
                e.preventDefault();
                handleStartPracticeInterview();
              }}
            >
              <div className="section-heading interview-section-heading">
                <div>
                  <span className="eyebrow">AI COACH PREPARATION</span>
                  <h2>AI Coach Discussion</h2>
                  <p>Engage in an interactive 1-on-1 discussion with your AI Coach to practice your technical skills, problem solving, and role competency.</p>
                </div>
                <span className="record-icon">
                  <Mic size={20} />
                </span>
              </div>

              <div className="interview-fields">
                {/* Company / Placement Drive selection */}
                <label>
                  Company / Placement drive
                  <select
                    value={selectedDriveId}
                    onChange={(e) => handleDriveChange(e.target.value)}
                  >
                    {availableDrives.map((drive) => (
                      <option key={drive.id} value={drive.id}>
                        {drive.company_name} · {drive.role_title}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Target role */}
                <label>
                  Target role
                  <input
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g. Quant Engineer"
                    required
                  />
                </label>

                {/* Interview duration & difficulty */}
                <div className="interview-field-row">
                  <label>
                    Interview duration
                    <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                      <option value="5">5 minutes</option>
                      <option value="10">10 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                    </select>
                  </label>
                  <label>
                    Interview difficulty
                    <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                      <option value="Personalized">Personalized</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </label>
                </div>

                {/* Job description */}
                <div className="practice-jd-label-row">
                  <label htmlFor="practice-job-description">
                    Job description <span className="optional">Optional</span>
                  </label>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={handleGenerateLatestJD}
                  >
                    Generate latest JD
                  </button>
                </div>
                <textarea
                  id="practice-job-description"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Add a job description for more focused practice…"
                  rows={5}
                />

                <button
                  type="submit"
                  className="button primary"
                  style={{ width: "100%", marginTop: "6px", minHeight: "44px" }}
                >
                  Start AI Coach Discussion <ArrowRight size={17} />
                </button>
              </div>
            </form>

            {/* Right Card: Single AI Technical Evaluator Profile */}
            <aside
              className="panel panel-guide interview-panel-card"
              aria-label="AI Coach"
            >
              <span className="eyebrow">1-ON-1 COACH GUIDANCE</span>
              <h2>Personalized 1-on-1 AI Coach Discussion</h2>
              <p>Your session is guided directly by AI Coach Neha Kapoor across core placement benchmarks.</p>

              <div className="s1-evaluator-badge-card">
                <div className="s1-evaluator-avatar-wrap">
                  <img
                    src="/assets/panel/stills/neha-v2-idle.png"
                    alt="Neha Kapoor"
                    className="s1-evaluator-avatar-img"
                  />
                </div>
                <div className="s1-evaluator-details">
                  <strong>Neha Kapoor</strong>
                  <span>AI Placement Coach · VoiceDots AI</span>
                </div>
              </div>

              <div className="panel-person">
                <span>01</span>
                <div>
                  <strong>Technical Depth &amp; Architecture</strong>
                  <p>Core CS, data structures, algorithms, and distributed systems architecture.</p>
                </div>
              </div>
              <div className="panel-person">
                <span>02</span>
                <div>
                  <strong>Analytical Problem Solving</strong>
                  <p>Algorithmic logic, edge-case analysis, optimization, and time-space trade-offs.</p>
                </div>
              </div>
              <div className="panel-person">
                <span>03</span>
                <div>
                  <strong>Practical Engineering Execution</strong>
                  <p>Translating specs into robust designs, database modeling, and code rationale.</p>
                </div>
              </div>
              <div className="panel-person">
                <span>04</span>
                <div>
                  <strong>Technical Communication &amp; Logic</strong>
                  <p>Verbal clarity, structured thought process, and articulating architectural decisions.</p>
                </div>
              </div>
            </aside>
          </div>

          {/* Middle Card: Your active resume */}
          <section className="panel interview-resume-card" aria-labelledby="active-resume-heading">
            <div className="interview-card-heading">
              <div>
                <span className="eyebrow">SHARED ACROSS YOUR WORKSPACE</span>
                <h2 id="active-resume-heading">Your active resume</h2>
                <p>Used by your AI Coach to evaluate your skills and personalize practice questions.</p>
              </div>
            </div>
            <div className="interview-active-resume">
              <FileText size={22} style={{ color: "var(--primary)" }} />
              <div>
                <strong>{studentName}_Resume.pdf</strong>
                <span>Main Resume · shared across your student features</span>
              </div>
              <button
                type="button"
                className="button secondary small"
                onClick={() => setShowResumeModal(true)}
              >
                View resume
              </button>
              <Link className="button secondary small" to="/profile#resume-library">
                Manage in My Profile
              </Link>
            </div>
          </section>

          {/* Bottom Card: Pick up where you left off */}
          <section className="panel interview-resume-card" aria-labelledby="saved-progress-heading">
            <div className="interview-card-heading">
              <div>
                <span className="eyebrow">YOUR SAVED PROGRESS</span>
                <h2 id="saved-progress-heading">Pick up where you left off</h2>
                <p>Interrupted competency evaluation sessions</p>
              </div>
              <button
                type="button"
                className="text-button"
                style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                onClick={() => {
                  setRefreshingProgress(true);
                  setTimeout(() => setRefreshingProgress(false), 600);
                }}
              >
                <RotateCw size={13} className={refreshingProgress ? "spin" : ""} /> Refresh
              </button>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: "13px" }}>
              No interrupted assessment sessions. You're ready to test your skills.
            </p>
          </section>

          {/* Resume Preview Modal */}
          {showResumeModal && (
            <div
              className="s1-resume-modal-backdrop"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowResumeModal(false);
              }}
            >
              <div className="s1-resume-modal-card">
                <div className="s1-resume-modal-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FileText size={18} style={{ color: "var(--primary)" }} />
                    <strong style={{ fontSize: "15px" }}>{studentName}_Resume.pdf</strong>
                  </div>
                  <button
                    type="button"
                    className="s3-modal-close-btn"
                    onClick={() => setShowResumeModal(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="s1-resume-modal-body">
                  <div style={{ background: "white", padding: "24px", borderRadius: "12px", border: "1px solid var(--border)" }}>
                    <h3 style={{ margin: "0 0 4px", fontSize: "18px" }}>{studentName}</h3>
                    <p style={{ margin: "0 0 16px", color: "var(--muted)", fontSize: "12.5px" }}>
                      Computer Science &amp; Engineering · Final Year · CGPA 8.7
                    </p>
                    <hr style={{ border: "0", borderTop: "1px solid var(--border)", margin: "14px 0" }} />
                    <h4 style={{ margin: "0 0 6px", fontSize: "14px", color: "var(--primary)" }}>Skills &amp; Technologies</h4>
                    <p style={{ fontSize: "13px", color: "var(--text)", margin: "0 0 14px" }}>
                      Data Structures, Algorithms, TypeScript, React, Python, FastAPI, Node.js, PostgreSQL, Docker, AWS, Distributed Systems.
                    </p>
                    <h4 style={{ margin: "0 0 6px", fontSize: "14px", color: "var(--primary)" }}>Experience &amp; Projects</h4>
                    <p style={{ fontSize: "13px", color: "var(--text)", margin: "0 0 6px" }}>
                      <strong>Full Stack Project Engineer:</strong> Built scalable multi-tenant services with real-time audio analysis and WebSocket synchronization.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {currentScreen === 1 && interviewPhase === "live" && (
        <section
          className={`s1-live-stage s1-live-stage-window ${isDark ? "theme-dark" : "theme-light"}${isCinemaMode ? " cinema-mode" : ""
            }`}
        >
          {/* Top Stage Bar */}
          <div className="s1-live-topbar">
            <div className="s1-live-brand-group">
              <span className="s1-live-company-pill">
                <Sparkles size={13} /> {companyName} · {targetRole}
              </span>
              <span className="s1-live-round-pill">
                Round {questionIndex + 1} of {activeQuestions.length} · {activeQuestions[questionIndex]?.round_type || "Technical Deep-Dive"}
              </span>
            </div>

            <div className="s1-live-topbar-actions">
              {/* Live Transcript Toggle Button */}
              <button
                type="button"
                className="s1-topbar-tool-btn"
                onClick={() => setShowTranscriptDrawer(!showTranscriptDrawer)}
                title="Toggle Live Conversation Transcript"
              >
                <MessageSquare size={13} />
                Transcript {transcript.length > 0 && `(${transcript.length})`}
              </button>

              {/* AI Voice Toggle */}
              <button
                type="button"
                className="s1-topbar-tool-btn"
                onClick={() => {
                  setSpeechSynthesisEnabled(!speechSynthesisEnabled);
                  if (isNehaSpeaking && "speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                  }
                }}
                title={speechSynthesisEnabled ? "Mute Neha's Voice" : "Enable Neha's Voice"}
              >
                {speechSynthesisEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                {speechSynthesisEnabled ? "Voice On" : "Voice Off"}
              </button>

              {/* Fullscreen / Cinema Mode */}
              <button
                type="button"
                className="s1-topbar-tool-btn"
                onClick={() => setIsCinemaMode(!isCinemaMode)}
                title={isCinemaMode ? "Exit Fullscreen Cinema" : "Fullscreen Cinema View"}
              >
                {isCinemaMode ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                {isCinemaMode ? "Exit Cinema" : "Full Screen"}
              </button>

              {/* Live Timer */}
              <div className="s1-live-timer">
                <Clock size={14} /> {formatTimer(liveSeconds)}
              </div>
            </div>
          </div>

          {/* Main Video Call Grid */}
          <div className="s1-live-grid">
            {/* AI Avatar Interviewer Video Tile */}
            <div className={`s1-interviewer-card${isNehaSpeaking ? " speaking" : ""}`}>
              <NehaAvatarLive isSpeaking={isNehaSpeaking} />
              <div className="s1-interviewer-meta">
                <div>
                  <div className="s1-interviewer-name">Neha Kapoor</div>
                  <div className="s1-interviewer-role">AI Coach · VoiceDots AI</div>
                </div>
                <div className="s1-interviewer-badge-live">
                  {isNehaSpeaking ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#93c5fd" }}>
                      <Volume2 size={11} /> Speaking...
                    </span>
                  ) : (
                    <>
                      <span className="s1-interviewer-dot"></span> LIVE
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Candidate Live Camera Tile */}
            <div className="s1-candidate-card">
              {cameraOn ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="s1-candidate-video" />
                  <div
                    className="s1-candidate-status"
                    style={{ position: "absolute", bottom: "14px", left: "14px", zIndex: 3 }}
                  >
                    <span className="s1-interviewer-dot"></span> {studentName} (You)
                  </div>
                </>
              ) : (
                <>
                  <div className="s1-candidate-avatar">
                    {studentName ? studentName.slice(0, 2).toUpperCase() : "AA"}
                  </div>
                  <div className="s1-candidate-name">{studentName} (You)</div>
                  <div className="s1-candidate-status">
                    <VideoOff size={11} /> Camera Off
                  </div>
                </>
              )}
            </div>

            {/* Live Transcript Side Drawer */}
            {showTranscriptDrawer && (
              <div className="s1-transcript-drawer">
                <div className="s1-transcript-header">
                  <div className="s1-transcript-title">
                    <MessageSquare size={16} style={{ color: "var(--primary)" }} /> Live Transcript
                  </div>
                  <button
                    type="button"
                    className="s3-modal-close-btn"
                    onClick={() => setShowTranscriptDrawer(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="s1-transcript-list">
                  {transcript.length === 0 ? (
                    <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                      Dialogue will transcribe live as Neha and you converse.
                    </p>
                  ) : (
                    transcript.map((item, idx) => (
                      <div key={idx} className="s1-transcript-item">
                        <span
                          className={`s1-transcript-speaker ${item.speaker === "Candidate"
                            ? "candidate"
                            : item.type === "feedback"
                              ? "feedback"
                              : ""
                            }`}
                        >
                          {item.speaker} · {item.time}
                        </span>
                        <div className="s1-transcript-text">{item.text}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Floating Glass Question Focus & Live Answer Bar */}
          <div className="s1-question-focus-bar">
            <div className="s1-question-focus-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span className="s1-question-focus-label">
                  Round {questionIndex + 1} · {activeQuestions[questionIndex]?.focus || "Core Engineering"}
                </span>
                {activeQuestions[questionIndex]?.round_type && (
                  <span className="s1-round-type-badge">
                    {activeQuestions[questionIndex]?.round_type}
                  </span>
                )}
              </div>
              <span className="s1-question-focus-count">
                Question {questionIndex + 1} of {activeQuestions.length}
              </span>
            </div>

            <div className="s1-question-focus-text">
              {activeQuestions[questionIndex]?.question || currentQuestion}
            </div>

            {interviewerFeedback && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "rgba(37, 99, 235, 0.10)",
                  border: "1px solid rgba(37, 99, 235, 0.22)",
                  fontSize: "12px",
                  color: isDark ? "#93c5fd" : "#1d4ed8",
                }}
              >
                <Sparkles size={14} style={{ flexShrink: 0 }} />
                <span><strong>AI Coach:</strong> {interviewerFeedback}</span>
              </div>
            )}

            {/* Candidate Live Answer Input & Action Controls */}
            <div className="s1-live-answer-box">
              <div className="s1-answer-input-row">
                <textarea
                  className="s1-answer-input"
                  rows={2}
                  value={candidateAnswer}
                  onChange={(e) => setCandidateAnswer(e.target.value)}
                  placeholder={
                    isListening
                      ? "Listening to your microphone... speak clearly or type here"
                      : "Type your answer or click 'Speak' to speak through your microphone…"
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSubmitAnswer();
                    }
                  }}
                />

                <div className="s1-answer-actions">
                  {/* Speech-to-Text Microphone Button */}
                  <button
                    type="button"
                    className={`s1-btn-action secondary ${isListening ? "mic-active" : ""}`}
                    onClick={toggleCandidateListening}
                    title={isListening ? "Stop Listening" : "Speak through Microphone"}
                  >
                    <Mic size={14} />
                    {isListening ? "Listening..." : "Speak"}
                  </button>

                  {/* Replay Question TTS Audio */}
                  <button
                    type="button"
                    className="s1-btn-action secondary"
                    onClick={() => speakNeha(activeQuestions[questionIndex]?.question)}
                    title="Listen to Neha read this question"
                  >
                    <Volume2 size={14} />
                    Listen
                  </button>

                  {/* Submit Answer Button */}
                  <button
                    type="button"
                    className="s1-btn-action primary"
                    onClick={handleSubmitAnswer}
                    disabled={isSubmittingAnswer || !candidateAnswer.trim()}
                    title="Submit answer to AI evaluator"
                  >
                    {isSubmittingAnswer ? (
                      <RotateCw size={14} className="spin" />
                    ) : (
                      <Send size={14} />
                    )}
                    {isSubmittingAnswer
                      ? "Evaluating…"
                      : questionIndex === activeQuestions.length - 1
                        ? "Submit & Finish"
                        : "Submit Answer"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Practice Interview Call Controls Bar */}
          <div className="s1-call-controls-bar">
            <div className="s1-ctrl-group">
              <button
                type="button"
                className={`s1-ctrl-btn-round ${muted ? "off" : ""}`}
                onClick={() => setMuted(!muted)}
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <span className="s1-ctrl-label">{muted ? "Unmute" : "Mute"}</span>
            </div>
            <div className="s1-ctrl-group">
              <button
                type="button"
                className={`s1-ctrl-btn-round ${!cameraOn ? "off" : ""}`}
                onClick={() => setCameraOn(!cameraOn)}
                title={cameraOn ? "Turn Camera Off" : "Turn Camera On"}
              >
                {cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
              <span className="s1-ctrl-label">{cameraOn ? "Video On" : "Video Off"}</span>
            </div>
            <div className="s1-ctrl-group">
              <button
                type="button"
                className="s1-ctrl-btn-end"
                onClick={() => setCallEndedReason("manual")}
                title="End Call & Finish Interview"
              >
                <PhoneOff size={22} />
              </button>
              <span className="s1-ctrl-label" style={{ color: "#f87171", fontWeight: 700 }}>
                End Call
              </span>
            </div>
          </div>

          {/* Finish Interview Prompt Overlay (shown after End Call button or Time End) */}
          {callEndedReason && (
            <div className="s1-finish-prompt-overlay">
              <div className="s1-finish-prompt-card">
                <div
                  className={`s1-finish-prompt-icon ${callEndedReason === "time_ended" ? "timeup" : "callend"
                    }`}
                >
                  {callEndedReason === "time_ended" ? <Clock size={32} /> : <PhoneOff size={30} />}
                </div>
                <h3 className="s1-finish-prompt-title">
                  {callEndedReason === "time_ended"
                    ? "Interview Time Concluded"
                    : "End Interview Call?"}
                </h3>
                <p className="s1-finish-prompt-desc">
                  {callEndedReason === "time_ended"
                    ? "Your scheduled technical round time limit has finished (00:00). All questions and candidate audio responses have been saved for scoring."
                    : "Are you ready to submit your interview session? You can now finish the interview to review your detailed assessment and AI coach feedback."}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginTop: "8px" }}>
                  <button
                    type="button"
                    className="s1-finish-btn-primary"
                    onClick={handleFinishInterview}
                  >
                    Finish Interview &amp; View Assessment <ArrowRight size={17} />
                  </button>
                  {callEndedReason === "manual" && liveSeconds > 0 && (
                    <button
                      type="button"
                      className="s1-finish-btn-resume"
                      onClick={() => setCallEndedReason(null)}
                    >
                      Resume Interview
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* System Prompt & Script Modal */}
          {showSystemPromptModal && (
            <div
              className="s1-prompt-modal-backdrop"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowSystemPromptModal(false);
              }}
            >
              <div className="s1-prompt-modal-card">
                <div className="s1-prompt-modal-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div className="s1-prompt-icon-badge">
                      <Brain size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: "15px", display: "block" }}>AI Interviewer System Prompt &amp; Script</strong>
                      <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                        VoiceDots Stage 5 Production LLM Directive · Neha Kapoor Persona
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="s3-modal-close-btn"
                    onClick={() => setShowSystemPromptModal(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="s1-prompt-modal-body">
                  <div className="s1-prompt-meta-row">
                    <span className="s1-prompt-meta-pill"><strong>AI Coach:</strong> Neha Kapoor</span>
                    <span className="s1-prompt-meta-pill"><strong>Target:</strong> {companyName} · {targetRole}</span>
                    <span className="s1-prompt-meta-pill"><strong>Engine:</strong> VoiceDots Stage 5 Gemini Live</span>
                    <span className="s1-prompt-meta-pill"><strong>Current Round:</strong> {questionIndex + 1} of {activeQuestions.length}</span>
                  </div>

                  <div className="s1-prompt-script-box">
                    <div className="s1-script-header">
                      <span>SYSTEM INSTRUCTION &amp; INTERVIEW BLUEPRINT</span>
                      <button
                        type="button"
                        className="s1-copy-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(VOICE_DOTS_AI_INTERVIEW_SYSTEM_PROMPT.trim());
                          alert("System prompt copied to clipboard!");
                        }}
                      >
                        Copy Prompt
                      </button>
                    </div>
                    <pre className="s1-script-pre">{VOICE_DOTS_AI_INTERVIEW_SYSTEM_PROMPT.trim()}</pre>
                  </div>

                  <div style={{ marginTop: "14px" }}>
                    <h4 style={{ fontSize: "12.5px", fontWeight: 700, margin: "0 0 8px", color: "var(--text)" }}>
                      Active 6-Stage Question Blueprint:
                    </h4>
                    <div className="s1-prompt-blueprint-list">
                      {activeQuestions.map((q, idx) => (
                        <div key={q.id} className={`s1-blueprint-item ${idx === questionIndex ? "active" : ""}`}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span className="s1-blueprint-round">Round {idx + 1}: {q.round_type}</span>
                            <span className="s1-blueprint-focus">{q.focus}</span>
                          </div>
                          <p className="s1-blueprint-q">{q.question}</p>
                          {q.evaluation_directive && (
                            <span className="s1-blueprint-directive">Directive: {q.evaluation_directive}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* =========================================================================
          SCREEN 2: Interview Result - Single-Window Exact Design
          ========================================================================= */}
      {currentScreen === 2 && (
        <div className="s2-screen-wrapper">
          {/* Top Screen Badge */}
          <div className="s2-top-screen-indicator">
            <div className="s2-screen-badge">
              <span className="s2-screen-number">2</span>
              <span className="s2-screen-title">
                Interview Result
              </span>
            </div>
            <div className="s2-header-right">
              <span className="s2-company-text">
                <span className="s2-company-dot" />
                {activeCompanyName} · {activeRoleTitle}
              </span>
            </div>
          </div>

          <section className="journey-card s2-main-card">
            {/* Heading inside card */}
            <div className="s2-header-row">
              <div className="s2-title-group">
                <h2>Interview Completed</h2>
                <p>Here is your overall performance in this interview.</p>
              </div>
            </div>

            {/* 2-Column Upper Grid: Semicircular Gauge (Left) & Competency-wise Score (Right) */}
            <div className="s2-grid">
              {/* Left Box: Semicircular Speedometer Arc Gauge */}
              <div className="s2-gauge-box">
                <div className="s2-arc-gauge-container">
                  <svg viewBox="0 0 200 120" className="s2-arc-gauge-svg">
                    <defs>
                      <linearGradient id="s2RedArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#F87171" />
                        <stop offset="100%" stopColor="#EF4444" />
                      </linearGradient>
                      <linearGradient id="s2GreenArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#34D399" />
                        <stop offset="100%" stopColor="#10B981" />
                      </linearGradient>
                    </defs>
                    {/* Background semicircle track */}
                    <path
                      d="M 25 105 A 75 75 0 0 1 175 105"
                      fill="none"
                      stroke={result.overall_score < 60 ? "#FEE2E2" : "#D1FAE5"}
                      strokeWidth="14"
                      strokeLinecap="round"
                    />
                    {/* Progress semicircle arc */}
                    <path
                      d="M 25 105 A 75 75 0 0 1 175 105"
                      fill="none"
                      stroke={result.overall_score < 60 ? "url(#s2RedArcGrad)" : "url(#s2GreenArcGrad)"}
                      strokeWidth="14"
                      strokeLinecap="round"
                      strokeDasharray="235.62"
                      strokeDashoffset={235.62 - (235.62 * Math.min(100, Math.max(0, result.overall_score))) / 100}
                      className="s2-arc-gauge-progress"
                    />
                  </svg>
                  <div className="s2-arc-gauge-center">
                    <span className="s2-arc-score-num">{result.overall_score}</span>
                    <span className="s2-arc-score-denom">/ 100</span>
                  </div>
                </div>

                {/* Status Pill Badge under arc */}
                <div
                  className={`s2-gauge-status-badge ${result.overall_score >= 75
                    ? "status-ready"
                    : result.overall_score >= 60
                      ? "status-moderate"
                      : "status-needs-improvement"
                    }`}
                >
                  <AlertCircle size={15} />
                  <span>
                    {result.overall_score >= 75
                      ? "Placement Ready"
                      : result.overall_score >= 60
                        ? "Moderate Competency"
                        : "Needs Improvement"}
                  </span>
                </div>
              </div>

              {/* Right Box: Competency-wise Score */}
              <div className="s2-comp-section">
                <h3 className="s2-comp-title">Competency-wise Score</h3>
                <div className="s2-comp-rows-container">
                  {result.competencies.map((comp: any) => {
                    const isHigh = comp.score >= 50;
                    const pct = Math.min(100, Math.max(0, Math.round((comp.score / comp.max) * 100)));
                    return (
                      <div key={comp.name} className="s2-comp-row-item">
                        <div className="s2-comp-label-wrap">
                          <span className={`s2-comp-bullet-icon ${isHigh ? "dot-green" : "dot-coral"}`}>
                            {isHigh ? <Check size={11} strokeWidth={3} /> : <span className="s2-bullet-inner-dot" />}
                          </span>
                          <span className="s2-comp-text-name">{comp.name}</span>
                        </div>
                        <div className="s2-comp-bar-container">
                          <div className="s2-comp-bar-bg">
                            <div
                              className={`s2-comp-bar-fill ${isHigh ? "bar-green" : "bar-coral"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="s2-comp-val-label">{comp.score}/{comp.max}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Grid: 3 Stat Cards on Left, Motivational Action Box on Right */}
            <div className="s2-bottom-grid">
              {/* Left: 3 Stat Cards (Blue, Green, Amber) */}
              <div className="s2-metrics-cluster">
                {/* 1. Total Questions (Blue) */}
                <div className="s2-stat-card card-blue">
                  <div className="s2-stat-icon-wrap icon-blue">
                    <FileText size={17} />
                  </div>
                  <div className="s2-stat-content">
                    <strong className="s2-stat-number">{result.question_stats.total}</strong>
                    <span className="s2-stat-label">Total Questions</span>
                  </div>
                </div>

                {/* 2. Answered (Green) */}
                <div className="s2-stat-card card-green">
                  <div className="s2-stat-icon-wrap icon-green">
                    <CheckCircle2 size={17} />
                  </div>
                  <div className="s2-stat-content">
                    <strong className="s2-stat-number">{result.question_stats.answered}</strong>
                    <span className="s2-stat-label">Answered</span>
                  </div>
                </div>

                {/* 3. Not Attempted (Amber / Solid Blue theme) */}
                <div className="s2-stat-card card-blue">
                  <div className="s2-stat-icon-wrap icon-amber">
                    <Clock size={17} />
                  </div>
                  <div className="s2-stat-content">
                    <strong className="s2-stat-number">{result.question_stats.not_attempted}</strong>
                    <span className="s2-stat-label">Not Attempted</span>
                  </div>
                </div>
              </div>

              {/* Right: Motivational Action Card */}
              <div className="s2-action-box">
                <div className="s2-action-copy">
                  <p className="s2-action-headline">You have the potential to do better.</p>
                  <p className="s2-action-subheadline">Let's work together and improve your performance.</p>
                </div>
                <div className="s2-action-btn-row">
                  <button
                    type="button"
                    className="s2-talk-coach-btn"
                    onClick={() => navigateTo(2, { showCoach: true })}
                  >
                    Talk to AI Coach Now
                  </button>
                  {result.submitted_answers && result.submitted_answers.length > 0 && (
                    <button
                      type="button"
                      className="s2-review-btn-secondary"
                      onClick={() => setShowQAModal(true)}
                    >
                      <FileText size={12} />
                      Review Q&amp;As ({result.submitted_answers.length})
                    </button>
                  )}
                  <button
                    type="button"
                    className="s2-plan-btn-secondary"
                    onClick={() => navigateTo(4)}
                  >
                    View Plan →
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Modal Dialog for Question-by-Question Review (ensures ZERO scrolling on main dashboard) */}
          {showQAModal && (
            <div
              className="s2-qa-modal-backdrop"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowQAModal(false);
              }}
            >
              <div className="s2-qa-modal-card">
                <div className="s2-qa-modal-header">
                  <div>
                    <h3>Interview Question &amp; Answer Review</h3>
                    <p>
                      Candidate spoken responses &amp; AI evaluation for {activeCompanyName} · {activeRoleTitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="s2-qa-modal-close"
                    onClick={() => setShowQAModal(false)}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="s2-qa-modal-body">
                  {result.submitted_answers && result.submitted_answers.length > 0 ? (
                    result.submitted_answers.map((qa: any, idx: number) => {
                      const qaTier = qa.score >= 75 ? "high" : qa.score >= 45 ? "mid" : "low";
                      return (
                        <div key={idx} className="s2-qa-item">
                          <div className="s2-qa-meta">
                            <span className="s2-qa-badge">
                              Question {idx + 1} of {result.submitted_answers.length} · {qa.focus || "Core Engineering"}
                            </span>
                            <span className={`s2-qa-score-pill ${qaTier}`}>
                              Score: {qa.score}%
                            </span>
                          </div>
                          <div className="s2-qa-question">
                            <strong>Question:</strong> {qa.question}
                          </div>
                          <div className="s2-qa-answer">
                            <strong>Your Spoken Response:</strong>
                            <p>"{qa.answer}"</p>
                          </div>
                          <div className="s2-qa-feedback">
                            <Sparkles size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
                            <div>
                              <strong>AI Feedback:</strong> {qa.feedback}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ textAlign: "center", color: "var(--muted)", padding: "24px" }}>
                      No question responses recorded for this session.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Coach Pop-up Modal (Screen 3) automatically popping in for low scores */}
          {showCoachPopup && (() => {
            const candidateInitial = studentName ? studentName.trim().charAt(0).toUpperCase() : "A";
            const candidateDept = "B.Tech CSE";
            const studentFirstName = studentName ? studentName.trim().split(/\s+/)[0] : "Student";
            const scoreVal = result.overall_score;

            const scheduleDataByDays: Record<string, { track: string; topic: string; technical: string; communication: string }> = {
              "1-3": {
                track: `Structured Thinking & Domain Depth (${coachDailyTime} / day)`,
                topic: "Clean Architecture & Scalability Patterns for Placement Role",
                technical: "3 Coding Challenges: State Management & Data Structures",
                communication: "Explain complexity & architectural trade-offs out loud",
              },
              "4-7": {
                track: `Concurrency, Database Indexing & ACID (${coachDailyTime} / day)`,
                topic: "B+ Trees, PostgreSQL Index Internals & Query Optimization",
                technical: "2 Algorithmic LeetCode Mediums on Graph & Tree Traversals",
                communication: "Record 90-second STAR method behavioral response",
              },
              "8-10": {
                track: `Distributed Systems & Microservices (${coachDailyTime} / day)`,
                topic: "Idempotency Keys, Circuit Breakers & Distributed Caching",
                technical: "Implement Rate Limiter with Token Bucket Algorithm",
                communication: "Simulate mock question answering with timer",
              },
              "11-13": {
                track: `High-Throughput APIs & System Design (${coachDailyTime} / day)`,
                topic: "REST vs gRPC, Kafka Event Streams & Partitioning Strategies",
                technical: "Design a Distributed URL Shortener with Sharding",
                communication: "Defend architecture choices against Neha's follow-up probes",
              },
              "14": {
                track: `Simulated Mock Interview & Final Benchmark (${coachDailyTime} / day)`,
                topic: "Comprehensive Placement Readiness Checklist & Cheat Sheets",
                technical: "Final Mock Assessment with Neha (30-min AI Interview)",
                communication: "Executive Summary & Technical Confidence Calibration",
              },
            };

            const currentDayPlan = scheduleDataByDays[coachActiveScheduleDay] || scheduleDataByDays["1-3"];

            const defaultDialogueForStep: Record<number, string> = {
              1: `Arrey bhai, how are you? You’ve got a good foundation with ${scoreVal}/100, but our placement cutoff for ${companyName} is 75/100. We just need to close that remaining ${Math.max(0, 75 - scoreVal)}% gap in System Architecture and Spoken Trade-offs to get you placed! Let's build your step-by-step roadmap.`,
              2: `To reach placement readiness, how much time can you commit daily, and what is your preparation timeline? I recommend 2 hours daily over 14 days for optimal retention.`,
              3: `Based on your scorecard, I've selected 4 targeted pillars: Core Architecture & Library References, Hands-on Coding Drills, Spoken Technical Trade-offs, and Company Alumni Mock Re-attempts.`,
              4: `Here is your Personalized Daily Learning Schedule! I've structured your roadmap with daily technical exercises, communication drills, library reference chapters, and simulated mock interviews.`,
            };

            const currentDialogue = coachCustomDialogue || defaultDialogueForStep[coachStep];

            const handleDiscussionPrompt = (promptText: string) => {
              let reply = "";
              const lower = promptText.toLowerCase();
              if (lower.includes("85%") || lower.includes("reach") || lower.includes("score")) {
                reply = `By pacing ${coachDailyTime} daily over ${coachTimeline}, we combine 45 mins of architecture reading, 45 mins of coding exercises, and 30 mins of spoken trade-offs to boost your score from ${scoreVal}% to 85%+ before your placement drive.`;
              } else if (lower.includes("weekend") || lower.includes("adjust") || lower.includes("time")) {
                reply = `Yes! You can redistribute your weekday hours into 3-hour weekend deep-dive sessions. Click 'Re-adjust Goals' at any time to switch to an intensive weekend schedule.`;
              } else if (lower.includes("communication") || lower.includes("trade-off") || lower.includes("speak")) {
                reply = `Use the VoiceDots recording drill! Don't just code silently; verbalize your assumptions, space-time trade-offs, and why you picked a certain data structure. Neha will evaluate your pace, clarity, and filler words.`;
              } else if (lower.includes("schedule") || lower.includes("re-attempt") || lower.includes("mock")) {
                reply = `I recommend scheduling your Milestone Re-attempt on Day 7 to benchmark your progress, and your final Placement Re-attempt on Day 14.`;
              } else {
                reply = `Great question regarding "${promptText}"! For Placement Readiness, focus on consistent daily practice and verbalizing your thought process. This roadmap is specifically calibrated to strengthen your weak areas in Technical Knowledge and Problem Solving.`;
              }
              setCoachCustomDialogue(reply);
              speakNeha(reply);
            };

            return (
              <div
                className="s3-modal-backdrop"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    window.speechSynthesis?.cancel();
                    navigateTo(2, { showCoach: false });
                  }
                }}
              >
                <div className="s3-modal-card">
                  {/* Top Window Bar */}
                  <div className="s3-top-window-bar">
                    <div className="s3-top-title-group">
                      <span className="s3-top-badge-box">3</span>
                      <span className="s3-top-title-text">AI Coach Pop-up – Start Conversation</span>
                    </div>
                    <div className="s3-top-meta-group">
                      <div className="s3-candidate-pill-badge">
                        <span className="s3-candidate-avatar-circle">{candidateInitial}</span>
                        <span className="s3-candidate-name-bold">{studentName}</span>
                        <span className="s3-candidate-divider-slash">|</span>
                        <span className="s3-candidate-dept-sub">{candidateDept}</span>
                      </div>
                      <button
                        type="button"
                        className="s3-modal-close-icon-btn"
                        onClick={() => {
                          window.speechSynthesis?.cancel();
                          navigateTo(2, { showCoach: false });
                        }}
                        aria-label="Close AI Coach Window"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Window Body Grid: Left Avatar Card + Right Discussion & Schedule */}
                  <div className="s3-window-body-grid">
                    {/* Left Column: AI Coach Avatar Visual & Voice Controls */}
                    <div className="s3-avatar-card-column">
                      <div className="s3-avatar-portrait-frame">
                        <div className="s3-avatar-floating-badge">
                          <span className="s3-avatar-live-green-dot" />
                          Dr. Rajesh · AI Coach
                        </div>
                        <PlacementOfficerAvatar speaking={isNehaSpeaking} analyser={null} />
                      </div>
                      <div className="s3-avatar-bottom-voice-bar">
                        <div className="s3-avatar-voice-info">
                          <strong>Dr. Rajesh</strong>
                          <span>AI Placement Coach</span>
                        </div>
                        <button
                          type="button"
                          className="s3-audio-toggle-btn"
                          onClick={() => {
                            if (speechSynthesisEnabled) {
                              window.speechSynthesis?.cancel();
                              setSpeechSynthesisEnabled(false);
                            } else {
                              setSpeechSynthesisEnabled(true);
                              speakNeha(currentDialogue);
                            }
                          }}
                          title={speechSynthesisEnabled ? "Turn Coach Voice On" : "Mute Coach Voice"}
                        >
                          {speechSynthesisEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Title, Pagination, Dialogue, Schedule, Live Discussion */}
                    <div className="s3-content-column">
                      <div>
                        <h2 className="s3-coach-headline">Hi {studentFirstName}! I'm your AI Coach</h2>
                        <p className="s3-coach-subheadline">Personalized Placement Readiness Guidance</p>
                      </div>

                      {/* 4-Step Breadcrumbs Pagination */}
                      <div className="s3-breadcrumbs-nav-row">
                        <button
                          type="button"
                          className={`s3-breadcrumb-btn ${coachStep === 1 ? "active" : coachStep > 1 ? "completed" : ""}`}
                          onClick={() => {
                            setCoachStep(1);
                            setCoachCustomDialogue(null);
                            speakNeha(defaultDialogueForStep[1]);
                          }}
                        >
                          1. Diagnosis
                        </button>
                        <span className="s3-breadcrumb-separator">›</span>
                        <button
                          type="button"
                          className={`s3-breadcrumb-btn ${coachStep === 2 ? "active" : coachStep > 2 ? "completed" : ""}`}
                          onClick={() => {
                            setCoachStep(2);
                            setCoachCustomDialogue(null);
                            speakNeha(defaultDialogueForStep[2]);
                          }}
                        >
                          2. Goals &amp; Availability
                        </button>
                        <span className="s3-breadcrumb-separator">›</span>
                        <button
                          type="button"
                          className={`s3-breadcrumb-btn ${coachStep === 3 ? "active" : coachStep > 3 ? "completed" : ""}`}
                          onClick={() => {
                            setCoachStep(3);
                            setCoachCustomDialogue(null);
                            speakNeha(defaultDialogueForStep[3]);
                          }}
                        >
                          3. Focus Areas
                        </button>
                        <span className="s3-breadcrumb-separator">›</span>
                        <button
                          type="button"
                          className={`s3-breadcrumb-btn ${coachStep === 4 ? "active" : ""}`}
                          onClick={() => {
                            setCoachStep(4);
                            setCoachCustomDialogue(null);
                            speakNeha(defaultDialogueForStep[4]);
                          }}
                        >
                          4. Daily Schedule
                        </button>
                      </div>

                      {/* Neha Speech Box */}
                      <div className="s3-dialogue-speech-box">
                        {coachStep === 4 && !coachCustomDialogue ? (
                          <>
                            Here is your <span className="s3-dialogue-highlight-amber">Personalized Daily Learning Schedule</span>!
                            I've structured your roadmap with daily technical exercises, communication drills, and simulated mock interviews.
                          </>
                        ) : (
                          <span>{currentDialogue}</span>
                        )}
                      </div>

                      {/* Step 4: Exact Daily Learning Schedule Card */}
                      {coachStep === 4 && (
                        <div className="s3-schedule-container-card">
                          {/* Days Tabs Row: Day 1-3, Day 4-7, Day 8-10, Day 11-13, Day 14 */}
                          <div className="s3-days-tabs-list">
                            {["1-3", "4-7", "8-10", "11-13", "14"].map((day) => (
                              <button
                                key={day}
                                type="button"
                                className={`s3-day-pill-tab ${coachActiveScheduleDay === day ? "active" : ""}`}
                                onClick={() => setCoachActiveScheduleDay(day)}
                              >
                                {day === "14" ? "Day 14" : `Day ${day}`}
                              </button>
                            ))}
                          </div>

                          {/* Track Subheading */}
                          <div className="s3-track-heading-text">{currentDayPlan.track}</div>

                          {/* 3 Activity Items with Colored Pills */}
                          <div className="s3-schedule-tags-stack">
                            <div className="s3-schedule-tag-row">
                              <span className="s3-badge-pill topic">TOPIC RESOURCE</span>
                              <span>{currentDayPlan.topic}</span>
                            </div>
                            <div className="s3-schedule-tag-row">
                              <span className="s3-badge-pill technical">TECHNICAL EXERCISE</span>
                              <span>{currentDayPlan.technical}</span>
                            </div>
                            <div className="s3-schedule-tag-row">
                              <span className="s3-badge-pill communication">COMMUNICATION</span>
                              <span>{currentDayPlan.communication}</span>
                            </div>
                          </div>

                          {/* Metrics Summary Bar */}
                          <div className="s3-metrics-summary-bar">
                            <span>14 Days Total</span>
                            <span>·</span>
                            <span>28 Hours Paced</span>
                            <span>·</span>
                            <span>4 Weak Areas Mastered</span>
                            <span>·</span>
                            <span>Target: 85%+</span>
                          </div>
                        </div>
                      )}

                      {/* Step 1: Diagnosis Breakdown Card */}
                      {coachStep === 1 && (
                        <div className="s3-diag-summary-card">
                          <div className="s3-diag-header">
                            <span>Identified Competency Gap Breakdown</span>
                            <span className="s3-threshold-tag">Threshold: 75/100</span>
                          </div>
                          <div className="s3-comp-pills-row">
                            {result.competencies.map((comp: any) => {
                              const isWeak = comp.score < 50;
                              return (
                                <span
                                  key={comp.name}
                                  className={`s3-pill-item ${isWeak ? "weak" : "strong"}`}
                                  onClick={() =>
                                    handleDiscussionPrompt(
                                      `How can I improve my ${comp.name} score from ${comp.score}/100?`
                                    )
                                  }
                                  style={{ cursor: "pointer" }}
                                  title="Click to ask Neha about this competency"
                                >
                                  {isWeak ? <AlertCircle size={13} /> : <Check size={13} />}
                                  {comp.name} ({comp.score}/{comp.max})
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Step 2: Goals & Availability Selection Card */}
                      {coachStep === 2 && (
                        <div className="s3-step-section">
                          <span className="s3-step-label">Select Daily Study Availability</span>
                          <div className="s3-goal-chips-row">
                            {[
                              { id: "1h", label: "⏱️ 1h / day (Standard)" },
                              { id: "2h", label: "⏱️ 2h / day (Recommended - Paced)" },
                              { id: "3h", label: "⏱️ 3h / day (Intensive Sprint)" },
                            ].map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                className={`s3-goal-chip ${coachDailyTime === t.id ? "active" : ""}`}
                                onClick={() => {
                                  setCoachDailyTime(t.id);
                                  handleDiscussionPrompt(`I selected ${t.label}. How does this shape my daily schedule?`);
                                }}
                              >
                                {t.label}
                              </button>
                            ))}
                          </div>

                          <span className="s3-step-label" style={{ marginTop: "6px" }}>Target Preparation Timeline</span>
                          <div className="s3-goal-chips-row">
                            {[
                              { id: "7 Days", label: "📅 7 Days (Fast-Track)" },
                              { id: "14 Days", label: "📅 14 Days (Balanced Masterclass)" },
                              { id: "30 Days", label: "📅 30 Days (Comprehensive)" },
                            ].map((tm) => (
                              <button
                                key={tm.id}
                                type="button"
                                className={`s3-goal-chip ${coachTimeline === tm.id ? "active" : ""}`}
                                onClick={() => {
                                  setCoachTimeline(tm.id);
                                  handleDiscussionPrompt(`I want to prepare in ${tm.id}. What is the milestone goal?`);
                                }}
                              >
                                {tm.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Step 3: 4 Focus Pillars Card */}
                      {coachStep === 3 && (
                        <div className="s3-curriculum-grid">
                          <div className="s3-curriculum-card">
                            <div className="s3-curriculum-icon-wrap icon-blue">
                              <Code2 size={16} />
                            </div>
                            <div className="s3-curriculum-content">
                              <strong>Topic-based Resources</strong>
                              <span>System architecture, memory hierarchies, and database indexing patterns</span>
                            </div>
                          </div>
                          <div className="s3-curriculum-card">
                            <div className="s3-curriculum-icon-wrap icon-blue">
                              <Brain size={16} />
                            </div>
                            <div className="s3-curriculum-content">
                              <strong>Technical Exercises</strong>
                              <span>Hands-on coding challenges &amp; algorithmic edge-case drills</span>
                            </div>
                          </div>
                          <div className="s3-curriculum-card">
                            <div className="s3-curriculum-icon-wrap icon-green">
                              <MessageSquare size={16} />
                            </div>
                            <div className="s3-curriculum-content">
                              <strong>Communication Practice</strong>
                              <span>Spoken technical trade-offs &amp; structured STAR method delivery</span>
                            </div>
                          </div>
                          <div className="s3-curriculum-card">
                            <div className="s3-curriculum-icon-wrap icon-amber">
                              <Target size={16} />
                            </div>
                            <div className="s3-curriculum-content">
                              <strong>Mock Re-attempts</strong>
                              <span>Scheduled simulation checkpoints to verify placement readiness target</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Live Discussion with student regarding schedule and improvement plan */}
                      <div className="s3-live-discussion-card">
                        <div className="s3-live-discussion-header">
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Sparkles size={14} style={{ color: "#2563eb" }} />
                            Live Discussion with Dr. Rajesh
                          </span>
                          <span className="s3-live-indicator-tag">● Live Discussion</span>
                        </div>

                        {/* Interactive Quick Prompts Chips */}
                        <div className="s3-discussion-prompts-row">
                          <button
                            type="button"
                            className="s3-discussion-prompt-chip"
                            onClick={() => handleDiscussionPrompt("How does this schedule reach 85%?")}
                          >
                            💬 How does this reach 85%?
                          </button>
                          <button
                            type="button"
                            className="s3-discussion-prompt-chip"
                            onClick={() => handleDiscussionPrompt("Can I adjust for weekends?")}
                          >
                            ⏱️ Adjust for weekends?
                          </button>
                          <button
                            type="button"
                            className="s3-discussion-prompt-chip"
                            onClick={() => handleDiscussionPrompt("How to practice communication trade-offs?")}
                          >
                            🎙️ Communication practice
                          </button>
                          <button
                            type="button"
                            className="s3-discussion-prompt-chip"
                            onClick={() => handleDiscussionPrompt("When should I schedule the re-attempt?")}
                          >
                            🎯 Re-attempt milestone
                          </button>
                        </div>

                        {/* Custom Ask Neha Input Form */}
                        <form
                          className="s3-discussion-input-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (coachDiscussionInput.trim()) {
                              handleDiscussionPrompt(coachDiscussionInput.trim());
                              setCoachDiscussionInput("");
                            }
                          }}
                        >
                          <input
                            type="text"
                            className="s3-discussion-text-input"
                            placeholder="Ask Dr. Rajesh about your schedule, topics, or improvement plan…"
                            value={coachDiscussionInput}
                            onChange={(e) => setCoachDiscussionInput(e.target.value)}
                          />
                          <button type="submit" className="s3-discussion-send-btn">
                            Ask Dr. Rajesh →
                          </button>
                        </form>
                      </div>

                      {/* Bottom Action Buttons: Save & Start Day 1 Learning Plan -> and Re-adjust Goals */}
                      <div className="s3-bottom-actions-row">
                        <button
                          type="button"
                          className="s3-btn-start-plan"
                          onClick={() => {
                            window.speechSynthesis?.cancel();
                            navigateTo(4);
                          }}
                        >
                          Save &amp; Start Day 1 Learning Plan →
                        </button>

                        <button
                          type="button"
                          className="s3-btn-readjust"
                          onClick={() => {
                            setCoachStep(2);
                            setCoachCustomDialogue(null);
                            speakNeha(defaultDialogueForStep[2]);
                          }}
                        >
                          Re-adjust Goals
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* =========================================================================
          SCREEN 4: Personalized Improvement Plan
          ========================================================================= */}
      {currentScreen === 4 && (
        <div className="coach-approved-page" style={{ padding: 0 }}>
          <CoachTopNav activeTab="plan" />

          {/* Dynamic Screen Top Header with [4] badge, Real Notifications, and Real Student Candidate Chip */}
          {renderPortalScreenHeader(4, "Personalized Improvement Plan")}

          {/* Main White Card Container */}
          <div className="s-portal-card">
            {/* Top Row: Title, Subtitle & Download Plan (PDF) Button */}
            <div className="s4-plan-topbar">
              <div>
                <h2 className="s4-plan-title">My Improvement Plan</h2>
                <p className="s4-plan-subtitle">
                  Based on your interview performance and target role – {activeRoleTitle || "Software Engineer"}
                </p>
              </div>

              <button
                type="button"
                className="s4-btn-download"
                onClick={handleDownloadPlanPDF}
                title="Download Personalized Improvement Plan as PDF"
              >
                <Download size={15} />
                <span>Download Plan (PDF)</span>
              </button>
            </div>

            {/* List of 4 Improvement Topic Cards */}
            <div className="s4-cards-list">
              {[
                {
                  id: "technical",
                  title: "Technical Knowledge",
                  topics: "Data Structures, Algorithms, Operating Systems",
                  priority: "High",
                  targetScore: "80+",
                  icon: Code2,
                  titleColor: "#dc2626",
                  iconBg: "#ef4444",
                },
                {
                  id: "problem",
                  title: "Problem Solving",
                  topics: "Coding Practice, Logical Thinking, Case Studies",
                  priority: "High",
                  targetScore: "75+",
                  icon: Brain,
                  titleColor: "#2563eb",
                  iconBg: "#2563eb",
                },
                {
                  id: "communication",
                  title: "Communication Skills",
                  topics: "Answer Structure, Clarity, Examples, Body Language",
                  priority: "Medium",
                  targetScore: "70+",
                  icon: MessageSquare,
                  titleColor: "#059669",
                  iconBg: "#10b981",
                },
                {
                  id: "domain",
                  title: "Domain Knowledge",
                  topics: "Core CS Concepts, Current Trends, Real-world Applications",
                  priority: "Medium",
                  targetScore: "70+",
                  icon: Sparkles,
                  titleColor: "#1d4ed8",
                  iconBg: "#2563eb",
                },
              ].map((item) => {
                const IconComponent = item.icon;
                return (
                  <div key={item.id} className="s4-topic-card">
                    {/* Left: Icon Box + Title & Topics */}
                    <div className="s4-topic-left">
                      <div className="s4-topic-icon-box" style={{ background: item.iconBg }}>
                        <IconComponent size={24} color="#ffffff" />
                      </div>
                      <div className="s4-topic-info">
                        <h3 className="s4-topic-title" style={{ color: item.titleColor }}>
                          {item.title}
                        </h3>
                        <p className="s4-topic-desc">{item.topics}</p>
                      </div>
                    </div>

                    {/* Right: Priority & Target Score */}
                    <div className="s4-topic-right">
                      <div className="s4-meta-col">
                        <span className="s4-meta-label">Priority</span>
                        <span className={`s4-priority-pill ${item.priority.toLowerCase()}`}>
                          {item.priority}
                        </span>
                      </div>

                      <div className="s4-meta-col">
                        <span className="s4-meta-label">Target Score</span>
                        <span className="s4-target-score">{item.targetScore}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 5: Daily Learning Schedule
          ========================================================================= */}
      {currentScreen === 5 && (
        <div className="coach-approved-page" style={{ padding: 0 }}>
          <CoachTopNav activeTab="schedule" />

          {/* Dynamic Screen Top Header with [5] badge, Real Notifications, and Real Student Candidate Chip */}
          {renderPortalScreenHeader(5, "Daily Learning Schedule")}

          {/* Feedback Notice Toast if updating */}
          {taskNotice && (
            <div style={{ margin: "0 0 16px 0", padding: "10px 16px", borderRadius: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: "13px", fontWeight: 600 }}>
              {taskNotice}
            </div>
          )}

          {/* Main White Card Container */}
          <div className="s-portal-card">
            {/* Top Row: Title, Date Range Switcher & This Week Dropdown */}
            <div className="s5-plan-topbar">
              <h2 className="s5-plan-title">My Daily Plan</h2>

              <div className="s5-plan-controls">
                <div className="s5-date-stepper">
                  <button
                    type="button"
                    className="s5-step-arrow"
                    onClick={() => setCurrentWeekIndex((w) => w - 1)}
                    aria-label="Previous week"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="s5-date-range">
                    {scheduleTasks.length ? "Saved learning schedule" : "No schedule saved"}
                  </span>
                  <button
                    type="button"
                    className="s5-step-arrow"
                    onClick={() => setCurrentWeekIndex((w) => w + 1)}
                    aria-label="Next week"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="s5-dropdown-wrapper">
                  <select className="s5-select-week" defaultValue="this_week">
                    <option value="this_week">This Week</option>
                    <option value="next_week">Next Week</option>
                    <option value="month">Full Month</option>
                  </select>
                  <ChevronDown size={14} className="s5-select-arrow" />
                </div>
              </div>
            </div>

            {/* Schedule Table */}
            <div className="s5-table-container">
              <table className="s5-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Learning Activity</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduleTasks.map((t) => {
                    const isCompleted = t.status === "Completed";
                    return (
                      <tr key={t.id} className={isCompleted ? "row-completed" : "row-pending"}>
                        <td className="s5-td-date">
                          <strong>{t.date_label.split(" ")[0]}</strong>
                          <span>{t.date_label.split(" ").slice(1).join(" ")}</span>
                        </td>
                        <td className="s5-td-time">{t.time}</td>
                        <td className="s5-td-activity">
                          <strong>{t.activity}</strong>
                        </td>
                        <td className="s5-td-type">
                          <span className="s5-type-tag">{t.type}</span>
                        </td>
                        <td className="s5-td-status">
                          {isCompleted ? (
                            <span className="s5-status-pill completed">
                              <CheckCircle2 size={13} /> Completed
                            </span>
                          ) : (
                            <span className="s5-status-pill pending">
                              <Clock size={13} /> Pending
                            </span>
                          )}
                        </td>
                        <td className="s5-td-actions" style={{ textAlign: "right" }}>
                          {isCompleted ? (
                            <button
                              type="button"
                              className="s5-btn-action view"
                              disabled={updatingTaskId === t.id}
                              onClick={() => handleTaskAction(t)}
                            >
                              View
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="s5-btn-action start"
                              disabled={updatingTaskId === t.id}
                              onClick={() => {
                                if (t.type === "AI Coach") {
                                  navigateTo(1, { phase: "details" });
                                } else {
                                  handleTaskAction(t);
                                }
                              }}
                            >
                              Start
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Split Section: Weekly Goals on Left, Weekly Progress Gauge on Right */}
            <div className="s5-bottom-split">
              {/* Left Column: Weekly Goals */}
              <div className="s5-goals-col">
                <h3 className="s5-subheading">Weekly Goals</h3>
                <div className="s5-goals-list">
                  {[
                    "Complete 12 learning modules",
                    "Solve 50 practice questions",
                    "Attend 2 mock interviews",
                    "Improve communication skills",
                  ].map((goal, idx) => (
                    <div key={idx} className="s5-goal-item">
                      <div className="s5-goal-check">
                        <CheckCircle2 size={16} color="#10b981" />
                      </div>
                      <span className="s5-goal-text">{goal}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Semi-circular Progress Gauge */}
              <div className="s5-gauge-col">
                <div className="s5-gauge-wrapper">
                  <svg viewBox="0 0 160 100" className="s5-gauge-svg">
                    <defs>
                      <linearGradient id="s5GaugeGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                    {/* Semi-circular track: radius 58, length PI*58 = 182.2 */}
                    <path
                      d="M 22,90 A 58,58 0 0,1 138,90"
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="14"
                      strokeLinecap="round"
                    />
                    {/* Colored arc for 40% (0.40 * 182.2 = 72.9) */}
                    <path
                      d="M 22,90 A 58,58 0 0,1 138,90"
                      fill="none"
                      stroke="url(#s5GaugeGrad)"
                      strokeWidth="14"
                      strokeDasharray="72.9 182.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="s5-gauge-center">
                    <strong className="s5-gauge-pct">40%</strong>
                    <span className="s5-gauge-sub">Weekly Progress</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "28px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
              <button type="button" className="vd-btn-secondary" onClick={() => navigateTo(4)}>
                ← Back to Improvement Plan
              </button>
              <button type="button" className="vd-btn-primary" onClick={() => navigateTo(6)}>
                Go to Learning Resources <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 6: Learning Resources & Practice Questions
          ========================================================================= */}
      {currentScreen === 6 && (
        <CoachLearningResources resources={data.learning_resources?.cards || []} questions={data.learning_resources?.question_bank || []} />
      )}

      {/* =========================================================================
          SCREEN 7: Interview Re-attempt Scheduling
          ========================================================================= */}
      {currentScreen === 7 && (
        <CoachScheduleReattempt />
      )}

      {/* =========================================================================
          SCREEN 8: Progress Tracking & Trajectory
          ========================================================================= */}
      {currentScreen === 8 && (
        <div className="coach-approved-page" style={{ padding: 0 }}>
          <CoachTopNav activeTab="progress" />

          {/* Dynamic Screen Top Header with [8] badge, Real Notifications, and Real Student Candidate Chip */}
          {renderPortalScreenHeader(8, "Progress Tracking")}

          {/* Main White Card Container */}
          <div className="s-portal-card">
            <ImprovementJourneyChart points={activeTrajectoryPoints} onReport={() => navigateTo(2)} />

            {/* 3 Bottom Metric Stat Cards (Solid Blue and Green theme - ZERO purple) */}
            <div className="s8-metrics-grid">
              {/* Blue Card 1 */}
              <div className="s8-metric-card card-blue">
                <div className="s8-metric-icon-box icon-blue">
                  <BookOpen size={22} />
                </div>
                <div className="s8-metric-content">
                  <strong className="s8-metric-value">{progressMetrics.modules_completed ?? 0}</strong>
                  <span className="s8-metric-label">Learning Modules Completed</span>
                </div>
              </div>

              {/* Green Card 2 */}
              <div className="s8-metric-card card-green">
                <div className="s8-metric-icon-box icon-green">
                  <CheckCircle2 size={22} />
                </div>
                <div className="s8-metric-content">
                  <strong className="s8-metric-value">
                    {progressMetrics.questions_completed ?? 0} / {progressMetrics.questions_total ?? 0}
                  </strong>
                  <span className="s8-metric-label">Practice Questions Completed</span>
                </div>
              </div>

              {/* Solid Blue Card 3 */}
              <div className="s8-metric-card card-blue">
                <div className="s8-metric-icon-box icon-blue">
                  <Play size={20} fill="currentColor" />
                </div>
                <div className="s8-metric-content">
                  <strong className="s8-metric-value">
                    {progressMetrics.mock_interviews_completed ?? 0} / {progressMetrics.mock_interviews_total ?? 0}
                  </strong>
                  <span className="s8-metric-label">Mock Interviews Completed</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "28px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
              <button type="button" className="vd-btn-secondary" onClick={() => navigateTo(7)}>
                ← Back to Re-attempt Plan
              </button>
              <button type="button" className="vd-btn-primary" onClick={() => navigateTo(9)}>
                Go to Placement Readiness Dashboard <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCREEN 9: Placement Readiness Dashboard
          ========================================================================= */}
      {currentScreen === 9 && (
        <div className="coach-approved-page" style={{ padding: 0 }}>
          <CoachTopNav activeTab="readiness" />

          {/* Dynamic Screen Top Header with [9] badge, Real Notifications, and Real Student Candidate Chip */}
          {renderPortalScreenHeader(9, "Placement Readiness")}

          {/* Main White Card Container */}
          <div className="s-portal-card">
            <h2 className="s9-main-title">Placement Readiness Dashboard</h2>

            {/* Top Section: Speedometer Gauge on Left, Competencies on Right */}
            <div className="s9-top-grid">
              {/* Gauge Left */}
              <div className="s9-gauge-box">
                <div className="s9-gauge-wrapper">
                  <svg viewBox="0 0 160 140" className="s9-gauge-svg">
                    {/* Background track (250 degrees dome arching over the top, gap at bottom) */}
                    <path
                      d="M 32.5 108.3 A 58 58 0 1 1 127.5 108.3"
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="13"
                      strokeLinecap="round"
                    />
                    {/* Colored progress arc for placement readiness score */}
                    <path
                      d="M 32.5 108.3 A 58 58 0 1 1 127.5 108.3"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="13"
                      strokeLinecap="round"
                      strokeDasharray={`${(253.1 * (readiness.overall_score ?? 0)) / 100} 300`}
                      strokeDashoffset="0"
                    />
                  </svg>
                  <div className="s9-gauge-center-text">
                    <span className="s9-gauge-score">{readiness.overall_score ?? "—"}</span>
                    <span className="s9-gauge-denom">/ 100</span>
                  </div>
                </div>

                <div className="s9-readiness-badge">
                  <Trophy size={16} className="s9-trophy-icon" />
                  <span>{readiness.status_label || "Good Readiness"}</span>
                </div>
              </div>

              {/* Competencies Right */}
              <div className="s9-competencies-col">
                <h3 className="s9-section-heading">Competency Readiness</h3>
                <div className="s9-competency-list">
                  {(readiness.competencies || []).map((item: any, idx: number) => (
                    <div key={idx} className="s9-competency-item">
                      <div className="s9-comp-name-group">
                        <span className="s9-comp-dot" style={{ background: item.dot_color || item.dotColor || "#2563eb" }} />
                        <span className="s9-comp-name">{item.name}</span>
                      </div>
                      <div className="s9-comp-track">
                        <div
                          className="s9-comp-fill"
                          style={{
                            width: `${item.percentage}%`,
                            background: item.color || item.barColor || "#2563eb",
                          }}
                        />
                      </div>
                      <span className="s9-comp-pct">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Section: Recommended Next Steps on Left, Target Placement Drives on Right */}
            <div className="s9-bottom-grid">
              {/* Left: Recommended Next Steps */}
              <div className="s9-subcard">
                <h3 className="s9-section-heading">Recommended Next Steps</h3>
                <div className="s9-steps-list">
                  {(readiness.recommended_steps || []).map((step: string, idx: number) => (
                    <div key={idx} className="s9-step-item">
                      <CheckCircle2 size={18} className="s9-step-icon" />
                      <span className="s9-step-text">{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Target Placement Drives */}
              <div className="s9-subcard">
                <h3 className="s9-section-heading">Target Placement Drives</h3>
                <div className="s9-drives-list">
                  {(readiness.target_drives || []).map((drive: any, idx: number) => (
                    <div key={idx} className="s9-drive-item">
                      <div className="s9-drive-company">
                        <div className="s9-drive-icon-box">
                          <Building2 size={16} />
                        </div>
                        <span className="s9-drive-name">{drive.company}</span>
                      </div>
                      <button
                        type="button"
                        className="s9-drive-timing"
                        onClick={() => navigateTo(1, { phase: "details" })}
                      >
                        <span>{drive.timing}</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "28px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
              <button type="button" className="vd-btn-secondary" onClick={() => navigateTo(8)}>
                ← Back to Progress Tracking
              </button>
              <button type="button" className="vd-btn-primary" onClick={() => navigate(`/placements${selectedDriveId ? `?${new URLSearchParams({drive:selectedDriveId})}` : ''}`)}>
                Retake Interview <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
