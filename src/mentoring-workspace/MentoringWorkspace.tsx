import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  Eye,
  HelpCircle,
  LayoutDashboard,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  Reply,
  Search,
  Send,
  Smile,
  Star,
  ThumbsUp,
  Users,
  X,
  BarChart3,
  Clock,
} from "lucide-react";
import "./mentoring-workspace.css";
export type TaskStatus = "Completed" | "In Progress" | "Pending";
export type WorkspaceTask = {
  id: string;
  title: string;
  outcome: string;
  status: TaskStatus;
  due: string;
  assignee: string;
  assignedBy: string;
  studentId?: string;
  studentName?: string;
  version?: number;
  legacy?: boolean;
};
export type Attachment = {
  id?: string;
  name: string;
  size: string;
  url?: string;
  downloadPath?: string;
  content?: string;
};
export type WorkspaceAction = {
  action: string;
  studentId: string;
  version?: number;
  id?: string;
  messageId?: string;
  title?: string;
  outcome?: string;
  text?: string;
  due?: string;
  status?: TaskStatus;
  value?: boolean;
  startsAt?: string;
  endsAt?: string;
  files?: { name: string; content: string }[];
};
type Message = {
  id: string;
  author: string;
  role: string;
  time: string;
  text: string;
  attachments: Attachment[];
  likes: number;
  liked?: boolean;
  createdAt?: string;
};
type Discussion = {
  id: string;
  title: string;
  preview: string;
  time: string;
  unread: number;
  resolved: boolean;
  messages: Message[];
  studentId?: string;
  studentName?: string;
  mentorName?: string;
  version?: number;
  starred?: boolean;
};
export type WorkspaceData = {
  mentorName: string;
  studentName: string;
  mentorPhoto?: string;
  studentPhoto?: string;
  versions?: Record<string, number>;
  mentees?: { id: string; name: string; mentorName: string; active: boolean }[];
  canAssign?: boolean;
  canCollaborate?: boolean;
  oversightMode?: boolean;
  menteeCount: number;
  activeDiscussions: number;
  pendingReplies: number;
  notificationCount?: number;
  presentationMode?: boolean;
  tasks: WorkspaceTask[];
  discussions: Discussion[];
  schedule: {
    id: string;
    date: string;
    time: string;
    title: string;
    person: string;
    studentId?: string;
    startsAt?: string;
    endsAt?: string;
    version?: number;
  }[];
  communications?: {
    id: string;
    title: string;
    preview: string;
    time: string;
    discussionId?: string;
  }[];
};
const empty: WorkspaceData = {
  mentorName: "Your mentor",
  studentName: "Student",
  menteeCount: 0,
  activeDiscussions: 0,
  pendingReplies: 0,
  tasks: [],
  discussions: [],
  schedule: [],
};
const dateLabel = (value: string) =>
  value
    ? new Date(value + "T12:00:00").toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No due date";
function Avatar({ name, photo }: { name: string; photo?: string }) {
  return (
    <span className="mw-avatar" aria-hidden="true">
      {name
        .replace(/^Dr\.\s*/, "")
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")}
      {photo && (
        <img
          src={photo}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </span>
  );
}
const timeLabel = (value: string) =>
  /^\d{4}-\d{2}-\d{2}T/.test(value)
    ? new Date(value).toLocaleString("en-IN", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      })
    : value;
function Status({ value }: { value: TaskStatus }) {
  return (
    <span className={`mw-status ${value.toLowerCase().replace(" ", "-")}`}>
      {value === "Completed" ? <CheckCircle2 size={13} /> : <Clock size={12} />}{" "}
      {value}
    </span>
  );
}
function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mw-card">
      <header>
        <h3>{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}
export default function MentoringWorkspace({
  role = "mentor",
  data = empty,
  onMentees,
  onProfile,
  onReports,
  demo = false,
  onAction,
  onDownload,
  onRefresh,
  busy = false,
  embedded = false,
  activeView,
  onViewChange,
}: {
  role?: "mentor" | "student";
  data?: WorkspaceData;
  onMentees?: () => void;
  onProfile?: () => void;
  onReports?: () => void;
  demo?: boolean;
  onAction?: (action: WorkspaceAction) => Promise<{ id: string }>;
  onDownload?: (file: Attachment) => Promise<void>;
  onRefresh?: () => void;
  busy?: boolean;
  embedded?: boolean;
  activeView?: string;
  onViewChange?: (view: string) => void;
}) {
  const [sample, setSample] = useState<WorkspaceData | null>(null),
    [loadError, setLoadError] = useState(""),
    [retry, setRetry] = useState(0);
  const [view, setView] = useState(activeView || "Dashboard"),
    [threadId, setThreadId] = useState<string | null>(null),
    [taskTab, setTaskTab] = useState("My Tasks"),
    [search, setSearch] = useState(""),
    [reply, setReply] = useState(""),
    [attachments, setAttachments] = useState<Attachment[]>([]),
    [starred, setStarred] = useState<string[]>([]),
    [notice, setNotice] = useState(""),
    [newTask, setNewTask] = useState(false),
    [newDiscussion, setNewDiscussion] = useState(false),
    [newSession, setNewSession] = useState(false),
    [fileReading, setFileReading] = useState(false),
    [calendarDate, setCalendarDate] = useState(() =>
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
    );
  useEffect(() => {
    if (activeView && activeView !== view) {
      setView(activeView);
      setThreadId(null);
      setSearch("");
    }
  }, [activeView]);
  const objectUrls = useRef<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null),
    composer = useRef<HTMLTextAreaElement>(null),
    messageEnd = useRef<HTMLDivElement>(null),
    dialogTitle = useRef<HTMLInputElement>(null);
  const isStudent = role === "student",
    localDemo = import.meta.env.DEV && demo,
    current = localDemo ? sample || empty : data;
  const oversight = Boolean(current.oversightMode);
  const writable = !oversight && (localDemo || Boolean(onAction && current.canCollaborate));
  async function persist(action: WorkspaceAction) {
    if (!onAction || busy) return null;
    try {
      return await onAction({
        ...action,
        version: current.versions?.[action.studentId] ?? 0,
      });
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to save. Your draft has been kept.",
      );
      return null;
    }
  }
  function selectedStudent(form: FormData) {
    return String(form.get("studentId") || current.mentees?.[0]?.id || "");
  }
  function taskStatus(task: WorkspaceTask, status: TaskStatus) {
    if (localDemo)
      update((v) => ({
        ...v,
        tasks: v.tasks.map((t) => (t.id === task.id ? { ...t, status } : t)),
      }));
    else
      void persist({
        action: "update_task",
        studentId: task.studentId || "",
        id: task.id,
        status,
      });
  }
  async function chooseFiles(files: File[]) {
    if (
      files.some((f) => f.size > 2 * 1024 * 1024) ||
      attachments.length + files.length > 3
    ) {
      setNotice("Choose up to three attachments, each no larger than 2 MB.");
      return;
    }
    setFileReading(true);
    try {
      const prepared = await Promise.all(
        files.map(async (f) => {
          const content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1]);
            reader.onerror = () =>
              reject(new Error("Unable to read the attachment."));
            reader.readAsDataURL(f);
          });
          const url = URL.createObjectURL(f);
          objectUrls.current.push(url);
          return {
            name: f.name,
            size: `${(f.size / 1024).toFixed(1)} KB`,
            content,
            url,
          };
        }),
      );
      setAttachments((v) => [...v, ...prepared]);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Unable to read files.");
    } finally {
      setFileReading(false);
    }
  }
  const downloadFile = async (file: Attachment) => {
    if (file.downloadPath && onDownload) {
      try {
        await onDownload(file);
      } catch (e) {
        setNotice(
          e instanceof Error ? e.message : "Unable to download the file.",
        );
      }
      return;
    }
    if (file.url) {
      const a = document.createElement("a");
      a.href = file.url;
      a.download = file.name;
      a.click();
    } else
      setNotice(
        "This is a sample attachment. Upload a file in your reply to try a real local download.",
      );
  };
  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );
  useEffect(() => {
    if (!localDemo) return;
    const controller = new AbortController();
    setLoadError("");
    fetch("/__mentoring-demo.json", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error("Local demo fixture could not be loaded.");
        return r.json();
      })
      .then((v: WorkspaceData) =>
        setSample(
          role === "student"
            ? {
                ...v,
                tasks: v.tasks.filter((t) => t.assignee === v.studentName),
                discussions: v.discussions.filter((d) => d.id === "project"),
                schedule: v.schedule.filter((s) => s.person === v.studentName),
              }
            : v,
        ),
      )
      .catch((e) => {
        if (!controller.signal.aborted) setLoadError(String(e.message));
      });
    return () => controller.abort();
  }, [localDemo, retry, role]);
  useEffect(() => {
    if (newTask || newDiscussion || newSession) dialogTitle.current?.focus();
  }, [newTask, newDiscussion, newSession]);
  useEffect(() => {
    messageEnd.current?.parentElement?.scrollTo({
      top: messageEnd.current.parentElement.scrollHeight,
    });
  }, [
    threadId,
    current.discussions.find((d) => d.id === threadId)?.messages.length,
  ]);
  const personPhoto = (person: string) =>
    person === current.mentorName
      ? current.mentorPhoto
      : person === current.studentName
        ? current.studentPhoto
        : undefined;
  const thread = current.discussions.find((d) => d.id === threadId),
    name = isStudent ? current.studentName : current.mentorName;
  const complete = current.tasks.filter((t) => t.status === "Completed").length;
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const overdue = current.tasks.filter(
    (t) => t.status !== "Completed" && t.due && t.due < today,
  ).length;
  const counts = {
    completed: complete,
    inProgress: current.tasks.length - complete - overdue,
    overdue,
  };
  const total = current.tasks.length;
  const percent = total ? Math.round((counts.completed / total) * 100) : 0;
  // Match the existing reminder window: today plus two calendar days in India.
  const attentionEnd = new Date(today + "T00:00:00Z");
  attentionEnd.setUTCDate(attentionEnd.getUTCDate() + 2);
  const attentionThrough = attentionEnd.toISOString().slice(0, 10);
  const needsAttention = (task: WorkspaceTask) =>
    task.status !== "Completed" && !!task.due && task.due <= attentionThrough;
  const attentionCount = current.tasks.filter(needsAttention).length;
  const filtered = current.tasks.filter(
    (t) =>
      (taskTab !== "Completed" || t.status === "Completed") &&
      (taskTab !== "Needs Attention" || needsAttention(t)) &&
      (!search ||
        `${t.title} ${t.assignee}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  if (taskTab === "Needs Attention") {
    filtered.sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title));
  }
  const update = (fn: (value: WorkspaceData) => WorkspaceData) => {
    if (!localDemo) {
      setNotice(
        "This workspace is read-only until discussion and task services are connected.",
      );
      return;
    }
    setSample((v) => fn(v || empty));
  };
  const openView = (next: string) => {
    onViewChange?.(next);
    setView(next);
    setThreadId(null);
    setSearch("");
    setNotice("");
  };
  const openThread = (id: string) => {
    onViewChange?.("Discussions");
    setView("Discussions");
    setThreadId(id);
    setReply("");
    setAttachments([]);
    const d = current.discussions.find((item) => item.id === id);
    if (!localDemo && writable && d?.unread)
      void persist({ action: "read", studentId: d.studentId || "", id });
    if (localDemo)
      setSample((v) =>
        v
          ? {
              ...v,
              discussions: v.discussions.map((d) =>
                d.id === id ? { ...d, unread: 0 } : d,
              ),
            }
          : v,
      );
  };
  const link = (label: string, fn: () => void) => (
    <button className="mw-text-button" onClick={fn}>
      {label}
      <ArrowRight size={15} />
    </button>
  );
  const showTaskCalendar = () => {
    openView("Tasks & Schedule");
    setTaskTab("Schedule (Calendar)");
  };
  const menu = [
    { label: "Dashboard", icon: LayoutDashboard },
    { label: "Discussions", icon: MessageCircle },
    { label: "Tasks & Schedule", icon: CalendarDays },
    { label: isStudent ? "My Mentor" : "Mentees", icon: Users },
    { label: "Resources", icon: BookOpen },
    ...(!isStudent ? [{ label: "Reports", icon: BarChart3 }] : []),
  ];
  async function submitReply(e: FormEvent) {
    e.preventDefault();
    if (!thread || (!reply.trim() && !attachments.length)) return;
    if (!localDemo) {
      const saved = await persist({
        action: "reply",
        studentId: thread.studentId || "",
        id: thread.id,
        text: reply.trim(),
        files: attachments.map((f) => ({
          name: f.name,
          content: f.content || "",
        })),
      });
      if (saved) {
        setReply("");
        setAttachments([]);
      }
      return;
    }
    update((v) => ({
      ...v,
      discussions: v.discussions.map((d) =>
        d.id === thread.id
          ? {
              ...d,
              preview: `${name}: ${reply.trim() || "Shared an attachment"}`,
              messages: [
                ...d.messages,
                {
                  id: crypto.randomUUID(),
                  author: name,
                  role: isStudent ? "Mentee" : "Mentor",
                  time: new Date().toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  text: reply.trim(),
                  attachments,
                  likes: 0,
                },
              ],
            }
          : d,
      ),
    }));
    setReply("");
    setAttachments([]);
  }
  async function createTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!localDemo) {
      const saved = await persist({
        action: "create_task",
        studentId: selectedStudent(f),
        title: String(f.get("title")).trim(),
        outcome: String(f.get("outcome")).trim(),
        due: String(f.get("due")),
      });
      if (saved) {
        setNewTask(false);
        setTaskTab("My Tasks");
        setNotice("Task assigned and saved.");
      }
      return;
    }
    update((v) => ({
      ...v,
      tasks: [
        ...v.tasks,
        {
          id: crypto.randomUUID(),
          title: String(f.get("title")).trim(),
          outcome: String(f.get("outcome")).trim(),
          due: String(f.get("due")),
          status: "Pending",
          assignee: String(f.get("assignee") || v.studentName),
          assignedBy: name,
        },
      ],
    }));
    setNewTask(false);
    setNotice("Task added to this local demo session.");
    setTaskTab("My Tasks");
  }
  async function createDiscussion(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!localDemo) {
      const saved = await persist({
        action: "create_discussion",
        studentId: selectedStudent(f),
        title: String(f.get("title")).trim(),
        text: String(f.get("message")).trim(),
      });
      if (saved) {
        setNewDiscussion(false);
        setView("Discussions");
        setThreadId(saved.id);
      }
      return;
    }
    const id = crypto.randomUUID();
    update((v) => ({
      ...v,
      discussions: [
        {
          id,
          title: String(f.get("title")).trim(),
          preview: String(f.get("message")).trim(),
          time: "Now",
          unread: 0,
          resolved: false,
          messages: [
            {
              id: crypto.randomUUID(),
              author: name,
              role: isStudent ? "Mentee" : "Mentor",
              time: "Now",
              text: String(f.get("message")).trim(),
              attachments: [],
              likes: 0,
            },
          ],
        },
        ...v.discussions,
      ],
    }));
    setNewDiscussion(false);
    setView("Discussions");
    setThreadId(id);
  }
  async function createSession(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      startsAt = new Date(String(f.get("startsAt"))).toISOString(),
      endsAt = new Date(String(f.get("endsAt"))).toISOString();
    if (new Date(endsAt) <= new Date(startsAt)) {
      setNotice("Session end must be after its start.");
      return;
    }
    if (localDemo) {
      update((v) => ({
        ...v,
        schedule: [
          ...v.schedule,
          {
            id: crypto.randomUUID(),
            title: String(f.get("title")),
            date: startsAt.slice(0, 10),
            time: timeLabel(startsAt),
            person: current.studentName,
            startsAt,
            endsAt,
          },
        ],
      }));
      setNewSession(false);
      return;
    }
    const saved = await persist({
      action: "create_event",
      studentId: selectedStudent(f),
      title: String(f.get("title")),
      startsAt,
      endsAt,
    });
    if (saved) {
      setNewSession(false);
      setNotice("Session scheduled and saved.");
    }
  }
  const calendarMonth = new Date(calendarDate + "T12:00:00");
  const monthDays = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0,
  ).getDate();
  const monthPrefix = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`;
  const moveMonth = (amount: number) => {
    const date = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + amount,
      1,
    );
    setCalendarDate(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`,
    );
  };
  const timeline = (
    <div className="mw-timeline">
      {current.schedule.length ? (
        current.schedule
          .filter((s) =>
            s.endsAt
              ? new Date(s.endsAt).getTime() >= Date.now()
              : s.date >= today,
          )
          .slice(0, 3)
          .map((s) => (
            <button key={s.id} onClick={showTaskCalendar}>
              <span>
                <b>{s.time}</b>
                <small>{dateLabel(s.date)}</small>
              </span>
              <span>
                <strong>{s.title}</strong>
                <small>with {s.person}</small>
              </span>
            </button>
          ))
      ) : (
        <p className="mw-empty">No mentoring sessions scheduled yet.</p>
      )}
    </div>
  );
  const communicationList = current.communications?.length ? (
    <div className="mw-recent">
      {current.communications.map((c) => (
        <button
          key={c.id}
          onClick={() =>
            c.discussionId
              ? openThread(c.discussionId)
              : openView("Tasks & Schedule")
          }
        >
          <span className="mw-icon">
            {c.discussionId ? (
              <MessageCircle size={20} />
            ) : (
              <CalendarDays size={20} />
            )}
          </span>
          <span>
            <strong>{c.title}</strong>
            <small>{c.preview}</small>
          </span>
          <span>
            <small>{timeLabel(c.time)}</small>
          </span>
        </button>
      ))}
    </div>
  ) : null;
  const discussionList = (
    <div className="mw-recent">
      {current.discussions.length ? (
        current.discussions.slice(0, 3).map((d) => (
          <button key={d.id} onClick={() => openThread(d.id)}>
            <span className="mw-icon">
              <MessageCircle size={20} />
            </span>
            <span>
              <strong>{d.title}</strong>
              <small>{d.preview}</small>
            </span>
            <span>
              <small>{timeLabel(d.time)}</small>
              {d.unread > 0 && <b className="mw-unread">{d.unread}</b>}
            </span>
          </button>
        ))
      ) : (
        <p className="mw-empty">
          Your mentor–mentee conversations will appear here.
        </p>
      )}
    </div>
  );
  return (
    <section
      className={`mw-shell ${embedded ? "mw-integrated" : ""}`}
      onChange={(event) => event.stopPropagation()}
      aria-busy={busy || fileReading}
      aria-label={`${isStudent ? "Mentee" : "Mentor"} collaboration workspace`}
    >
      {!embedded && <aside className="mw-sidebar">
        <div className="mw-brand">
          <span>V</span>VoiceDots
        </div>
        <nav aria-label="Mentoring navigation">
          {menu.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={view === label ? "active" : ""}
              onClick={() => {
                if (label === "Mentees" && onMentees) {
                  onMentees();
                  return;
                }
                if (label === "My Mentor" && onProfile) {
                  onProfile();
                  return;
                }
                if (label === "Reports" && onReports) {
                  onReports();
                  return;
                }
                openView(label);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="mw-user">
          <Avatar name={name} photo={personPhoto(name)} />
          <span>
            <strong>{name}</strong>
            <small>{isStudent ? "Mentee" : "Mentor"}</small>
          </span>
          <ChevronDown size={15} />
        </div>
      </aside>}
      <main className="mw-main">
        {!localDemo && (
          <div className={embedded ? "mw-context-bar" : "mw-demo"}>
            <span>{current.presentationMode ? <b className="mw-presentation-label">Presentation preview</b> : "MENTORING WORKSPACE"}</span>
            {onRefresh && <button onClick={onRefresh} disabled={busy}>Refresh</button>}
          </div>
        )}
        {oversight && <aside className="mw-oversight-note" aria-label="Read-only placement oversight">
          <Eye size={19}/><div><strong>Placement oversight · Read only</strong>
          <p>Review mentoring progress and conversations. Replies, task updates and session changes belong to the assigned mentor and student.</p></div>
        </aside>}
        {localDemo && (
          <div className="mw-demo">
            <span>
              <i />
              Local demo · Sample data · Changes last for this session
            </span>
            <button
              onClick={() => {
                setSample(null);
                setRetry((v) => v + 1);
                setThreadId(null);
                setView("Dashboard");
              }}
            >
              Reset demo
            </button>
          </div>
        )}
        {loadError && (
          <div role="alert" className="mw-banner">
            {loadError}
            <button onClick={() => setRetry((v) => v + 1)}>Retry</button>
          </div>
        )}
        {notice && (
          <div role="status" className="mw-banner">
            {notice}
            <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {view === "Dashboard" && (
          <>
            <header className="mw-heading">
              <div>
                <h2>{oversight ? "Mentoring Overview" : isStudent ? "Mentee Dashboard" : "Mentor Dashboard"}</h2>
                <p>
                  {oversight ? "Review mentoring across your authorised students." : isStudent
                    ? "Connect with your mentor · Track tasks · Stay on schedule"
                    : "Guide, connect and help your mentees move forward."}
                </p>
              </div>
              <div className="mw-header-actions">
                <button
                  aria-label="Notifications"
                  onClick={() => openView("Discussions")}
                >
                  <Bell size={23} />
                  {(current.notificationCount ?? current.pendingReplies) >
                    0 && <i />}
                </button>
                <button
                  aria-label="Workspace help"
                  onClick={() =>
                    setNotice(
                      "Use Discussions for feedback, Tasks & Schedule to track work, and your mentor profile or mentee list for detailed progress.",
                    )
                  }
                >
                  <HelpCircle size={23} />
                </button>
              </div>
            </header>
            <div className="mw-metrics">
              {(isStudent
                ? [
                    {
                      label: "My Mentor",
                      value: current.mentorName,
                      icon: Users,
                      tone: "purple",
                      person: true,
                    },
                    {
                      label: "Active Discussions",
                      value: current.discussions.filter((d) => !d.resolved)
                        .length,
                      icon: MessageCircle,
                      tone: "purple",
                    },
                    {
                      label: "Tasks Assigned",
                      value: current.tasks.length,
                      icon: CalendarDays,
                      tone: "orange",
                    },
                    {
                      label: "Completed",
                      value: `${complete} (${current.tasks.length ? Math.round((complete / current.tasks.length) * 100) : 0}%)`,
                      icon: CheckCircle2,
                      tone: "green",
                    },
                  ]
                : [
                    {
                      label: oversight ? "Mentees in Scope" : "My Mentees",
                      value: current.menteeCount,
                      icon: Users,
                      tone: "purple",
                    },
                    {
                      label: "Active Discussions",
                      value: localDemo
                        ? current.discussions.filter((d) => !d.resolved).length
                        : current.activeDiscussions,
                      icon: MessageCircle,
                      tone: "blue",
                    },
                    {
                      label: oversight ? "Awaiting Mentor Review" : "Pending Replies",
                      value: current.pendingReplies,
                      icon: MessageCircle,
                      tone: "orange",
                    },
                    {
                      label: "Tasks Due (All)",
                      value: current.tasks.filter(
                        (t) => t.status !== "Completed",
                      ).length,
                      icon: CalendarDays,
                      tone: "purple",
                    },
                  ]
              ).map(({ label, value, icon: Icon, tone, ...metric }) => (
                <button
                  key={label}
                  className="mw-metric"
                  onClick={() => {
                    if (label === "My Mentor") {
                      onProfile?.();
                      return;
                    }
                    if (label === "My Mentees") {
                      onMentees?.();
                      return;
                    }
                    openView(
                      label.includes("Discussion") || label.includes("Replies")
                        ? "Discussions"
                        : "Tasks & Schedule",
                    );
                    if (label === "Completed") setTaskTab("Completed");
                  }}
                >
                  <span className={`mw-icon ${tone}`}>
                    {"person" in metric ? (
                      <Avatar
                        name={current.mentorName}
                        photo={personPhoto(current.mentorName)}
                      />
                    ) : (
                      <Icon size={25} />
                    )}
                  </span>
                  <span>
                    <small>{label}</small>
                    <strong
                      className={
                        typeof value === "string" && value.length > 12
                          ? "mw-name-value"
                          : ""
                      }
                    >
                      {value}
                    </strong>
                  </span>
                </button>
              ))}
            </div>
            <div className="mw-dashboard-grid">
              <Card title={isStudent ? "My Task Progress" : "Mentee Progress"}>
                <div className="mw-progress">
                  <div
                    className="mw-ring"
                    style={{
                      background: total
                        ? `conic-gradient(#1ca547 0 ${percent}%,#ffce45 ${percent}% ${Math.min(100, percent + Math.round((counts.inProgress / total) * 100))}%,#ff666a 0)`
                        : "#e7e4f1",
                    }}
                    role="img"
                    aria-label={`${percent}% tasks completed`}
                  >
                    <div>
                      <strong>{percent}%</strong>
                      <small>
                        {isStudent ? "Completed" : "Tasks Completed"}
                      </small>
                    </div>
                  </div>
                  <dl>
                    {[
                      ["Completed", counts.completed, "green"],
                      ["In Progress", counts.inProgress, "yellow"],
                      ["Overdue", counts.overdue, "red"],
                    ].map(([label, value, tone]) => (
                      <div key={label}>
                        <dt>
                          <i className={String(tone)} />
                          {label}
                        </dt>
                        <dd>
                          {isStudent
                            ? value
                            : `${total ? Math.round((Number(value) / total) * 100) : 0}%`}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
                {!total && <p className="mw-empty">No tasks recorded yet.</p>}
              </Card>
              <Card
                title={"Upcoming Schedule"}
                action={link("View Calendar", showTaskCalendar)}
              >
                {timeline}
              </Card>
              <Card
                title={
                  isStudent ? "Recent Updates" : "Recent Discussions"
                }
                action={link("View All", () =>
                  openView("Discussions"),
                )}
              >
                {isStudent
                  ? communicationList || discussionList
                  : discussionList}
              </Card>
              <Card
                title={isStudent ? "My Tasks" : "Task Overview (All Mentees)"}
                action={link("View Tasks", () => {
                  openView("Tasks & Schedule");
                  setTaskTab("My Tasks");
                })}
              >
                {isStudent ? (
                  <div className="mw-mini-tasks">
                    {current.tasks.slice(0, 4).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => openView("Tasks & Schedule")}
                      >
                        <CheckCircle2
                          size={16}
                          className={t.status === "Completed" ? "mw-green" : ""}
                        />
                        <strong>{t.title}</strong>
                        <Status value={t.status} />
                      </button>
                    ))}
                    {!current.tasks.length && (
                      <p className="mw-empty">No tasks assigned yet.</p>
                    )}
                  </div>
                ) : (
                  <div className="mw-task-overview">
                    {[
                      ["Completed", counts.completed, "green"],
                      ["In Progress", counts.inProgress, "yellow"],
                      ["Overdue", counts.overdue, "red"],
                    ].map(([label, value, tone]) => (
                      <div key={label}>
                        <CheckCircle2 className={`mw-${tone}`} size={18} />
                        <strong>{label}</strong>
                        <b>{value}</b>
                        <progress
                          className={String(tone)}
                          value={Number(value)}
                          max={total || 1}
                        />
                        <span>
                          {total
                            ? Math.round((Number(value) / total) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
        {(view === "Discussions" || view === "Communications") && !thread && (
          <>
            <header className="mw-heading">
              <div>
                <h2>{view}</h2>
                <p>
                  {view === "Discussions"
                    ? "Share updates, ask questions and keep feedback together."
                    : "Mentoring updates and conversations in one place."}
                </p>
              </div>
              {writable && (
                <button
                  className="mw-primary"
                  disabled={busy}
                  onClick={() => setNewDiscussion(true)}
                >
                  <Plus size={17} />
                  New Discussion
                </button>
              )}
            </header>
            <label className="mw-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search discussions"
              />
            </label>
            <div className="mw-discussion-list">
              {current.discussions
                .filter((d) =>
                  `${d.title} ${d.preview}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((d) => (
                  <button key={d.id} onClick={() => openThread(d.id)}>
                    <span className="mw-icon">
                      <Users size={24} />
                    </span>
                    <span>
                      <strong>{d.title}</strong>
                      <small>{d.preview}</small>
                    </span>
                    <span>
                      {d.resolved ? (
                        <Status value="Completed" />
                      ) : (
                        <small>{timeLabel(d.time)}</small>
                      )}
                      {d.unread > 0 && <b className="mw-unread">{d.unread}</b>}
                    </span>
                    <ArrowRight size={18} />
                  </button>
                ))}
              {!current.discussions.length && (
                <div className="mw-empty-state">
                  <MessageCircle />
                  <h3>No conversations yet</h3>
                  <p>
                    Start a discussion with your mentor or an assigned mentee to
                    share updates and feedback.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
        {thread && ["Discussions", "Communications"].includes(view) && (
          <div className="mw-thread">
            <button className="mw-back" onClick={() => setThreadId(null)}>
              <ArrowLeft size={18} /> Discussions <span>›</span>
              <b>{thread.title}</b>
            </button>
            <header className="mw-thread-heading">
              <span className="mw-icon">
                <Users size={27} />
              </span>
              <div>
                <h2>{thread.title}</h2>
                <span className="mw-category">Mentor–Mentee Discussion</span>
                <p>
                  {thread.studentName || current.studentName} (Mentee){" "}
                  <span>·</span> {thread.mentorName || current.mentorName}{" "}
                  (Mentor)
                </p>
              </div>
              {writable && <button
                className={
                  (localDemo ? starred.includes(thread.id) : thread.starred)
                    ? "mw-starred"
                    : ""
                }
                aria-label={
                  (localDemo ? starred.includes(thread.id) : thread.starred)
                    ? "Unstar discussion"
                    : "Star discussion"
                }
                aria-pressed={
                  localDemo
                    ? starred.includes(thread.id)
                    : Boolean(thread.starred)
                }
                disabled={busy || !writable}
                onClick={() =>
                  localDemo
                    ? setStarred((v) =>
                        v.includes(thread.id)
                          ? v.filter((id) => id !== thread.id)
                          : [...v, thread.id],
                      )
                    : void persist({
                        action: "star",
                        studentId: thread.studentId || "",
                        id: thread.id,
                        value: !thread.starred,
                      })
                }
              >
                <Star size={18} />
              </button>}
              <button
                aria-label="Discussion information"
                onClick={() =>
                  setNotice(
                    `This conversation is ${thread.resolved ? "resolved" : "open"}. ${thread.messages.length} messages in this session.`,
                  )
                }
              >
                <MoreHorizontal size={18} />
              </button>
              {writable && <button
                className="mw-resolve"
                disabled={busy || !writable}
                onClick={() =>
                  localDemo
                    ? update((v) => ({
                        ...v,
                        discussions: v.discussions.map((d) =>
                          d.id === thread.id
                            ? { ...d, resolved: !d.resolved }
                            : d,
                        ),
                      }))
                    : void persist({
                        action: "resolve",
                        studentId: thread.studentId || "",
                        id: thread.id,
                        value: !thread.resolved,
                      })
                }
              >
                <Check size={17} />
                {thread.resolved ? "Reopen Discussion" : "Mark as Resolved"}
              </button>}
              {!writable && <span className="mw-thread-status">{thread.resolved ? "Resolved" : "Open"}</span>}
            </header>
            <p className="mw-visibility-note"><Eye size={14}/>Authorised placement staff can review this conversation.</p>
            <div className="mw-messages">
              {thread.messages.map((m) => (
                <article
                  className={`mw-message ${m.role === "Mentor" ? "from-mentor" : ""}`}
                  key={m.id}
                >
                  <Avatar name={m.author} photo={personPhoto(m.author)} />
                  <div>
                    <div className="mw-bubble">
                      <header>
                        <strong>
                          {m.author} ({m.role})
                        </strong>
                        <small>{timeLabel(m.time)}</small>
                      </header>
                      <p>{m.text}</p>
                      {m.attachments.length > 0 && (
                        <div className="mw-attachments">
                          <p>
                            <Paperclip size={13} />
                            Attachments ({m.attachments.length})
                          </p>
                          <div>
                            {m.attachments.map((a, i) => (
                              <button
                                key={i}
                                onClick={() => void downloadFile(a)}
                              >
                                <span
                                  className={`mw-file ${a.name.endsWith(".pptx") ? "ppt" : ""}`}
                                >
                                  <FileText size={18} />
                                  <small>
                                    {a.name.split(".").pop()?.toUpperCase()}
                                  </small>
                                </span>
                                <span>
                                  <strong>{a.name}</strong>
                                  <small>{a.size}</small>
                                </span>
                                <Download size={16} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {writable && <div className="mw-message-actions">
                      <button
                        aria-label={`Like message from ${m.author}`}
                        disabled={busy || !writable}
                        onClick={() =>
                          localDemo
                            ? update((v) => ({
                                ...v,
                                discussions: v.discussions.map((d) =>
                                  d.id === thread.id
                                    ? {
                                        ...d,
                                        messages: d.messages.map((item) =>
                                          item.id === m.id
                                            ? {
                                                ...item,
                                                likes: item.likes ? 0 : 1,
                                              }
                                            : item,
                                        ),
                                      }
                                    : d,
                                ),
                              }))
                            : void persist({
                                action: "react",
                                studentId: thread.studentId || "",
                                id: thread.id,
                                messageId: m.id,
                                value: !m.liked,
                              })
                        }
                      >
                        <ThumbsUp size={14} />
                        {m.likes || ""}
                      </button>
                      <button
                        onClick={() => {
                          setReply(`@${m.author} `);
                          composer.current?.focus();
                        }}
                      >
                        <Reply size={16} />
                        Reply
                      </button>
                    </div>}
                    {!writable && m.likes > 0 && <span className="mw-read-reactions"><ThumbsUp size={14}/>{m.likes}</span>}
                  </div>
                </article>
              ))}
              {!thread.messages.length && (
                <p className="mw-empty">
                  Start the conversation with an update or question.
                </p>
              )}
              <div ref={messageEnd} />
            </div>
            {!writable ? <div className="mw-read-only-footer"><Eye size={17}/>
              {oversight ? "Read-only review. Only the assigned mentor and mentee can participate in this discussion." : "This conversation is view-only for your account."}
            </div> : thread.resolved ? (
              <div className="mw-resolved-note">
                <CheckCircle2 size={18} />
                This discussion is resolved. Reopen it to continue the
                conversation.
              </div>
            ) : (
              <form className="mw-composer" onSubmit={submitReply}>
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => {
                    void chooseFiles(Array.from(e.target.files || []));
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  aria-label="Attach files"
                  disabled={!writable || busy || fileReading}
                  onClick={() => fileInput.current?.click()}
                >
                  <Paperclip size={21} />
                </button>
                <div>
                  <textarea
                    ref={composer}
                    rows={1}
                    value={reply}
                    disabled={!writable || busy || fileReading}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type a reply…"
                    aria-label="Reply message"
                  />
                  {attachments.length > 0 && (
                    <div className="mw-file-chips">
                      {attachments.map((a, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() =>
                            setAttachments((v) => v.filter((_, j) => j !== i))
                          }
                        >
                          {a.name}
                          <X size={13} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Add smile emoji"
                  disabled={!writable || busy || fileReading}
                  onClick={() => {
                    setReply((v) => v + " 🙂");
                    composer.current?.focus();
                  }}
                >
                  <Smile size={20} />
                </button>
                <button
                  className="mw-primary"
                  disabled={
                    !writable ||
                    busy ||
                    fileReading ||
                    (!reply.trim() && !attachments.length)
                  }
                >
                  <Send size={17} />
                  Send
                </button>
              </form>
            )}
          </div>
        )}
        {view === "Tasks & Schedule" && (
          <>
            <header className="mw-heading">
              <div className="mw-title-icon">
                <span className="mw-icon">
                  <CalendarDays />
                </span>
                <h2>Tasks & Schedule</h2>
              </div>
              {(localDemo ||
                current.canAssign ||
                (isStudent && taskTab !== "Schedule (Calendar)")) &&
                writable && (
                  <button
                    className="mw-primary"
                    disabled={busy}
                    onClick={() =>
                      taskTab === "Schedule (Calendar)"
                        ? setNewSession(true)
                        : setNewTask(true)
                    }
                  >
                    <Plus size={17} />
                    {taskTab === "Schedule (Calendar)"
                      ? "New Session"
                      : isStudent
                        ? "New Personal Task"
                        : "New Task"}
                  </button>
                )}
            </header>
            <div
              className="mw-task-tabs"
              role="tablist"
              aria-label="Task views"
            >
              {["My Tasks", "Needs Attention", "Schedule (Calendar)", "Completed"].map(
                (t) => (
                  <button
                    role="tab"
                    aria-selected={taskTab === t}
                    key={t}
                    onClick={() => setTaskTab(t)}
                  >
                    {t}{t === "Needs Attention" && <span className="mw-attention-count">{attentionCount}</span>}
                  </button>
                ),
              )}
            </div>
            {taskTab === "Needs Attention" && <p className="mw-attention-help">
              Unfinished tasks due within the next two days, including today. Overdue tasks appear first.
            </p>}
            {taskTab === "Schedule (Calendar)" ? (
              <div className="mw-calendar-view">
                <label>
                  Choose a date
                  <input
                    aria-label="Schedule date"
                    type="date"
                    value={calendarDate}
                    onChange={(e) => {
                      if (e.target.value) setCalendarDate(e.target.value);
                    }}
                  />
                </label>
                <div className="mw-month-heading">
                  <button
                    aria-label="Previous month"
                    onClick={() => moveMonth(-1)}
                  >
                    <ArrowLeft size={17} />
                  </button>
                  <h3>
                    {calendarMonth.toLocaleDateString("en-IN", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <button aria-label="Next month" onClick={() => moveMonth(1)}>
                    <ArrowRight size={17} />
                  </button>
                </div>
                <div className="mw-month-grid" aria-label="Mentoring calendar">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <b key={day}>{day}</b>
                    ),
                  )}
                  {Array.from(
                    {
                      length: new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth(),
                        1,
                      ).getDay(),
                    },
                    (_, i) => (
                      <span key={`pad-${i}`} />
                    ),
                  )}
                  {Array.from({ length: monthDays }, (_, i) => {
                    const date = `${monthPrefix}-${String(i + 1).padStart(2, "0")}`,
                      hasEvents =
                        current.schedule.some((s) => s.date === date) ||
                        current.tasks.some((t) => t.due === date);
                    return (
                      <button
                        key={date}
                        aria-label={
                          dateLabel(date) + (hasEvents ? " · Has events" : "")
                        }
                        aria-pressed={calendarDate === date}
                        onClick={() => setCalendarDate(date)}
                      >
                        {i + 1}
                        {hasEvents && <i />}
                      </button>
                    );
                  })}
                </div>
                <h3>{dateLabel(calendarDate)}</h3>
                {current.schedule
                  .filter((s) => s.date === calendarDate)
                  .map((s) => (
                    <article key={s.id}>
                      <span className="mw-icon">
                        <CalendarDays />
                      </span>
                      <div>
                        <strong>{s.title}</strong>
                        <p>
                          {s.time} · with {s.person}
                        </p>
                      </div>
                      {writable && current.canAssign && onAction && (
                        <button
                          disabled={busy}
                          aria-label={`Cancel ${s.title}`}
                          onClick={() =>
                            void persist({
                              action: "cancel_event",
                              studentId: s.studentId || "",
                              id: s.id,
                            })
                          }
                        >
                          <X size={17} />
                          Cancel
                        </button>
                      )}
                    </article>
                  ))}
                {current.schedule.filter((s) => s.date === calendarDate)
                  .length === 0 && (
                  <p className="mw-empty">
                    No mentoring sessions on this date.
                  </p>
                )}
                {current.tasks
                  .filter((t) => t.due === calendarDate)
                  .map((t) => (
                    <article key={t.id}>
                      <CheckCircle2 />
                      <strong>{t.title}</strong>
                      <Status value={t.status} />
                    </article>
                  ))}
              </div>
            ) : (
              <>
                <label className="mw-search">
                  <Search size={16} />
                  <input
                    aria-label="Search tasks"
                    placeholder="Search tasks or mentees"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <div className="mw-table-scroll">
                  <table className="mw-table">
                    <thead>
                      <tr>
                        <th>
                          <Check size={14} />
                        </th>
                        <th>Task / Expected Outcome</th>
                        <th>{isStudent ? "Assigned By" : "Assigned To"}</th>
                        <th>Expected Completion</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((t) => (
                        <tr key={t.id}>
                          <td>
                            {writable ? <input
                              type="checkbox"
                              aria-label={`Complete ${t.title}`}
                              checked={t.status === "Completed"}
                              disabled={!writable || busy || fileReading}
                              onChange={() =>
                                taskStatus(
                                  t,
                                  t.status === "Completed"
                                    ? "Pending"
                                    : "Completed",
                                )
                              }
                            /> : <span className="mw-static-task-state" aria-label={`${t.title}: ${t.status}`}>{t.status === "Completed" ? <CheckCircle2 size={17}/> : <Clock size={17}/>}</span>}
                          </td>
                          <td>
                            <strong>{t.title}</strong>
                            <small>{t.outcome}</small>
                          </td>
                          <td>
                            <span className="mw-table-person">
                              <Avatar
                                name={isStudent ? t.assignedBy : t.assignee}
                                photo={personPhoto(
                                  isStudent ? t.assignedBy : t.assignee,
                                )}
                              />
                              {isStudent ? t.assignedBy : t.assignee}
                            </span>
                          </td>
                          <td>{dateLabel(t.due)}
                            {taskTab === "Needs Attention" && <small className={t.due < today ? "mw-due-overdue" : "mw-due-soon"}>
                              {t.due < today ? "Overdue" : t.due === today ? "Due today" : "Due soon"}
                            </small>}
                          </td>
                          <td>
                            {writable ? (
                              <select
                                disabled={busy}
                                className={`mw-task-select ${t.status.toLowerCase().replace(" ", "-")}`}
                                aria-label={`Status for ${t.title}`}
                                value={t.status}
                                onChange={(e) =>
                                  taskStatus(t, e.target.value as TaskStatus)
                                }
                              >
                                {["Completed", "In Progress", "Pending"].map(
                                  (s) => (
                                    <option key={s}>{s}</option>
                                  ),
                                )}
                              </select>
                            ) : (
                              <Status value={t.status} />
                            )}
                          </td>
                          <td>
                            <button
                              aria-label={`${oversight ? "View discussion for" : "Discuss"} ${t.title}`}
                              onClick={() => {
                                const matching = current.discussions.find(
                                  (d) =>
                                    !d.resolved &&
                                    (localDemo || d.studentId === t.studentId),
                                );
                                if (matching) {
                                  openThread(matching.id);
                                  setReply(`Regarding “${t.title}”: `);
                                } else
                                  setNotice(
                                    "No discussion is available for this task yet.",
                                  );
                              }}
                            >
                              {oversight ? <Eye size={17}/> : <Reply size={17} />}
                            </button>
                            <button
                              aria-label={`Details for ${t.title}`}
                              onClick={() =>
                                setNotice(
                                  `${t.title} — ${t.outcome || "No additional outcome recorded."} Assigned by ${t.assignedBy}. Due: ${dateLabel(t.due)}.`,
                                )
                              }
                            >
                              <MoreHorizontal size={19} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filtered.length && (
                    <p className="mw-empty">
                      {search ? "No tasks match your search."
                        : taskTab === "Needs Attention"
                          ? "You're up to date. No overdue tasks or tasks due in the next two days."
                          : current.tasks.length
                            ? "No tasks match this view."
                            : "No mentoring tasks recorded yet."}
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}
        {["Resources", "Mentees", "Reports", "My Mentor"].includes(view) && (
          <>
            <header className="mw-heading">
              <div>
                <h2>{view}</h2>
                <p>Your mentoring information, together.</p>
              </div>
            </header>
            <div className="mw-empty-state">
              <BookOpen />
              <h3>{view === "Resources" ? "Shared resources" : view}</h3>
              <p>
                {view === "Resources"
                  ? "Files shared in conversations appear below."
                  : localDemo
                    ? "This standalone preview demonstrates the collaboration workspace. Open the portal to access existing profiles and reports."
                    : "Use the portal’s existing profiles and reports to see saved records."}
              </p>
              {view === "Resources" &&
                current.discussions.flatMap((d) =>
                  d.messages.flatMap((m) =>
                    m.attachments.map((a) => (
                      <button
                        key={`${d.id}-${m.id}-${a.name}`}
                        onClick={() => openThread(d.id)}
                      >
                        <FileText size={18} />
                        {a.name}
                        <ArrowRight size={16} />
                      </button>
                    )),
                  ),
                )}
            </div>
          </>
        )}
        {(newTask || newDiscussion || newSession) && (
          <div
            className="mw-modal-backdrop"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setNewTask(false);
                setNewDiscussion(false);
                setNewSession(false);
              }
              if (e.key === "Tab") {
                const list = e.currentTarget.querySelectorAll<HTMLElement>(
                  "input,textarea,select,button:not(:disabled)",
                );
                const first = list[0],
                  last = list[list.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <section
              className="mw-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mw-dialog-title"
            >
              <header>
                <h2 id="mw-dialog-title">
                  {newSession
                    ? "Schedule a session"
                    : newTask
                      ? "Create a task"
                      : "Start a discussion"}
                </h2>
                <button
                  aria-label="Close dialog"
                  onClick={() => {
                    setNewTask(false);
                    setNewDiscussion(false);
                    setNewSession(false);
                  }}
                >
                  <X size={20} />
                </button>
              </header>
              <form
                onSubmit={
                  newSession
                    ? createSession
                    : newTask
                      ? createTask
                      : createDiscussion
                }
              >
                {!localDemo && !isStudent && (
                  <label>
                    Assigned mentee
                    <select name="studentId" required>
                      {current.mentees
                        ?.filter((m) => m.active)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} · {m.mentorName}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                <label>
                  {newSession
                    ? "Session title"
                    : newTask
                      ? "Task"
                      : "Discussion title"}
                  <input
                    ref={dialogTitle}
                    name="title"
                    required
                    maxLength={160}
                    pattern=".*\S.*"
                    placeholder={
                      newTask
                        ? "What needs to be done?"
                        : "What would you like to discuss?"
                    }
                  />
                </label>
                {newSession ? (
                  <>
                    <label>
                      Starts at
                      <input name="startsAt" type="datetime-local" required />
                    </label>
                    <label>
                      Ends at
                      <input name="endsAt" type="datetime-local" required />
                    </label>
                    <small>
                      Times use your device’s timezone and are shared with both
                      participants.
                    </small>
                  </>
                ) : newTask ? (
                  <>
                    <label>
                      Expected outcome
                      <textarea
                        name="outcome"
                        placeholder="Describe what success looks like"
                        maxLength={1000}
                      />
                    </label>
                    {localDemo && !isStudent && (
                      <label>
                        Assign to
                        <input
                          name="assignee"
                          defaultValue={current.studentName}
                          required
                        />
                      </label>
                    )}
                    <label>
                      Expected completion
                      <input name="due" type="date" required />
                    </label>
                  </>
                ) : (
                  <label>
                    Message
                    <textarea name="message" required maxLength={5000} />
                  </label>
                )}
                <footer>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTask(false);
                      setNewDiscussion(false);
                      setNewSession(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button className="mw-primary" disabled={busy}>
                    {busy
                      ? "Saving…"
                      : newSession
                        ? "Schedule Session"
                        : newTask
                          ? "Create Task"
                          : "Start Discussion"}
                  </button>
                </footer>
              </form>
            </section>
          </div>
        )}
      </main>
    </section>
  );
}
