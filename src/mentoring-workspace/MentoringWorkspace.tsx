import ConversationBubble from "./ConversationBubble";
import DiscussionParticipants, {
  ParticipantStack,
  type DiscussionParticipant,
} from "./DiscussionParticipants";
import TaskDetail from "./TaskDetail";
import MessageEditor, {
  type MessageDocument,
} from "./MessageEditor";
import type { Editor } from "@tiptap/react";
import {
  useEffect,
  useLayoutEffect,
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
  Trash2,
  Check,
  CheckCircle2,
  ChevronDown,
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
  Star,
  ThumbsUp,
  Users,
  X,
  BarChart3,
  Clock,
} from "lucide-react";
import "./mentoring-workspace.css";
export type TaskStatus =
  | "Completed"
  | "In Progress"
  | "Submitted"
  | "Needs Revision"
  | "Pending";
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
  personal?: boolean;
  requiresReview?: boolean;
  messages?: Message[];
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
  audience?: "mentee" | "group";
  mentorId?: string;
  allMentees?: boolean;
  memberIds?: string[];
  studentId: string;
  version?: number;
  id?: string;
  messageId?: string;
  title?: string;
  outcome?: string;
  text?: string;
  document?: MessageDocument | null;
  due?: string;
  status?: TaskStatus;
  value?: boolean;
  startsAt?: string;
  endsAt?: string;
  files?: { name: string; content: string }[];
};
export type Message = {
  id: string;
  author: string;
  authorPhoto?: string;
  role: string;
  time: string;
  text: string;
  document?: MessageDocument | null;
  attachments: Attachment[];
  likes: number;
  liked?: boolean;
  createdAt?: string;
  studentId?: string;
  kind?: string;
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
  audience?: "mentee" | "group";
  mentorId?: string;
  mentorPhoto?: string;
  memberCount?: number;
  participants?: DiscussionParticipant[];
  version?: number;
  starred?: boolean;
};
export type WorkspaceData = {
  mentorName: string;
  studentName: string;
  mentorPhoto?: string;
  studentPhoto?: string;
  versions?: Record<string, number>;
  groupVersions?: Record<string, number>;
  groups?: {
    mentorId: string;
    name: string;
    studentId: string;
    memberCount: number;
    active: boolean;
    mentorName?: string;
    mentorPhoto?: string;
    members?: { id: string; name: string; isSelf?: boolean; photo?: string }[];
  }[];
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
      {value === "Needs Revision" ? "Changes requested" : value}
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
  renderStudentPhoto,
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
  renderStudentPhoto?: (studentId: string, name: string) => ReactNode;
}) {
  const [sample, setSample] = useState<WorkspaceData | null>(null),
    [loadError, setLoadError] = useState(""),
    [retry, setRetry] = useState(0);
  const [view, setView] = useState(activeView || "Dashboard"),
    [threadId, setThreadId] = useState<string | null>(null),
    [taskTab, setTaskTab] = useState("My Tasks"),
    [taskId, setTaskId] = useState<string | null>(null),
    [participantsFor, setParticipantsFor] = useState<string | null>(null),
    [discussionMentorId, setDiscussionMentorId] = useState(""),
    [allDiscussionMentees, setAllDiscussionMentees] = useState(true),
    [discussionMemberIds, setDiscussionMemberIds] = useState<string[]>([]),
    [memberSearch, setMemberSearch] = useState(""),
    [search, setSearch] = useState(""),
    [reply, setReply] = useState(""),
    [replyDocument, setReplyDocument] = useState<MessageDocument | null>(null),
    [firstMessage, setFirstMessage] = useState(""),
    [firstDocument, setFirstDocument] = useState<MessageDocument | null>(null),
    [firstAttachments, setFirstAttachments] = useState<Attachment[]>([]),
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
      setTaskId(null);
      setSearch("");
    }
  }, [activeView]);
  // Creation and participant dialogs belong to the current section/tab only.
  // Close before paint when using the workspace's internal navigation as well.
  useLayoutEffect(() => {
    setNewDiscussion(false);
    setNewTask(false);
    setNewSession(false);
    setParticipantsFor(null);
  }, [activeView, view, taskTab]);
  const workspaceElement = useRef<HTMLElement>(null);
  const objectUrls = useRef<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null),
    composer = useRef<Editor | null>(null),
    replyForm = useRef<HTMLFormElement>(null),
    firstFileInput = useRef<HTMLInputElement>(null),
    messageEnd = useRef<HTMLDivElement>(null),
    dialogTitle = useRef<HTMLInputElement>(null);
  const isStudent = role === "student",
    localDemo = import.meta.env.DEV && demo,
    current = localDemo ? sample || empty : data;
  const oversight = Boolean(current.oversightMode);
  const writable =
    !oversight && (localDemo || Boolean(onAction && current.canCollaborate));
  async function persist(action: WorkspaceAction) {
    if (!onAction || busy) return null;
    try {
      const topic = current.discussions.find(
        (d) => d.id === action.id && d.audience === "group",
      );
      const audience = action.audience || topic?.audience;
      const mentorId = action.mentorId || topic?.mentorId;
      const saved = await onAction({
        ...action,
        audience,
        mentorId,
        version:
          audience === "group"
            ? (current.groupVersions?.[mentorId || ""] ?? 0)
            : (current.versions?.[action.studentId] ?? 0),
      });
      setNotice("");
      return saved;
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
    return String(form.get("studentId") || (isStudent ? current.mentees?.[0]?.id : "") || "");
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
  async function chooseFiles(files: File[], first = false) {
    if (
      files.some((f) => f.size > 2 * 1024 * 1024) ||
      (first ? firstAttachments : attachments).length + files.length > 3
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
      (first ? setFirstAttachments : setAttachments)((v) => [
        ...v,
        ...prepared,
      ]);
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
    if (newDiscussion || newTask) {
      setFirstMessage("");
      setFirstDocument(null);
      setFirstAttachments([]);
    }
  }, [newDiscussion, newTask]);
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
  const selectedGroup =
    current.groups?.find((g) => g.mentorId === discussionMentorId) ||
    current.groups?.find((g) => g.active);
  useEffect(() => {
    if (!newDiscussion) return;
    const group = current.groups?.find((g) => g.active);
    setDiscussionMentorId(group?.mentorId || "");
    setAllDiscussionMentees(true);
    setDiscussionMemberIds(
      group?.members?.filter((m) => m.isSelf).map((m) => m.id) || [],
    );
    setMemberSearch("");
  }, [newDiscussion]);
  function toggleDiscussionMember(id: string) {
    const own =
      selectedGroup?.members?.filter((m) => m.isSelf).map((m) => m.id) || [];
    if (allDiscussionMentees) {
      setAllDiscussionMentees(false);
      setDiscussionMemberIds([...new Set([...own, id])]);
      return;
    }
    if (own.includes(id)) return;
    setDiscussionMemberIds((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
    );
  }
  const participantTopic = current.discussions.find(
    (d) => d.id === participantsFor,
  );
  const selectedTask = current.tasks.find((t) => t.id === taskId);
  const thread = current.discussions.find((d) => d.id === threadId),
    name = isStudent ? current.studentName : current.mentorName;
  const threadWritable = writable && thread?.audience === "group";
  const complete = current.tasks.filter((t) => t.status === "Completed").length;
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  const overdue = current.tasks.filter(
    (t) =>
      t.status !== "Completed" &&
      t.status !== "Submitted" &&
      t.due &&
      t.due < today,
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
    task.status === "Submitted"
      ? !isStudent
      : task.status !== "Completed" &&
        !!task.due &&
        task.due <= attentionThrough;
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
    filtered.sort(
      (a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title),
    );
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
    setReplyDocument(null);
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
    if (
      !thread ||
      (!reply.trim() && !attachments.length) ||
      reply.length > 10000
    )
      return;
    if (!localDemo) {
      const saved = await persist({
        action: "reply",
        studentId: thread.studentId || "",
        id: thread.id,
        text: reply.trim(),
        document: replyDocument,
        files: attachments.map((f) => ({
          name: f.name,
          content: f.content || "",
        })),
      });
      if (saved) {
        setReply("");
        setReplyDocument(null);
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
                  document: replyDocument,
                  attachments,
                  likes: 0,
                },
              ],
            }
          : d,
      ),
    }));
    setReply("");
    setReplyDocument(null);
    setAttachments([]);
  }
  async function createTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const recipientId = selectedStudent(f);
    const recipient = current.mentees?.find((mentee) => mentee.id === recipientId && mentee.active);
    if (!localDemo && !isStudent && !recipient) {
      setNotice("Choose the mentee who should receive this task.");
      return;
    }
    if (!isStudent && !firstMessage.trim() && !firstAttachments.length) {
      setNotice("Add task instructions or a reference file before assigning.");
      return;
    }
    if (!localDemo) {
      const saved = await persist({
        action: "create_task",
        studentId: selectedStudent(f),
        title: String(f.get("title")).trim(),
        outcome: "",
        due: String(f.get("due")),
        text: firstMessage,
        document: firstDocument,
        files: firstAttachments.map((a) => ({
          name: a.name,
          content: a.content || "",
        })),
      });
      if (saved) {
        setNewTask(false);
        setTaskTab("My Tasks");
        setTaskId(saved.id);
        setNotice(
          isStudent
            ? "Personal task saved. Only you can see it."
            : `Task assigned to ${recipient?.name || "the selected mentee"}.`,
        );
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
          outcome: "",
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
    if (
      (!firstMessage.trim() && !firstAttachments.length) ||
      firstMessage.length > 10000 ||
      fileReading
    )
      return;
    if (!localDemo) {
      const saved = await persist({
        action: "create_discussion",
        audience: "group",
        mentorId: selectedGroup?.mentorId || "",
        studentId: selectedGroup?.studentId || selectedStudent(f),
        allMentees: allDiscussionMentees,
        memberIds: allDiscussionMentees ? [] : discussionMemberIds,
        title: String(f.get("title")).trim(),
        text: firstMessage.trim(),
        document: firstDocument,
        files: firstAttachments.map((a) => ({
          name: a.name,
          content: a.content || "",
        })),
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
          preview: firstMessage.trim(),
          time: "Now",
          unread: 0,
          resolved: false,
          messages: [
            {
              id: crypto.randomUUID(),
              author: name,
              role: isStudent ? "Mentee" : "Mentor",
              time: "Now",
              text: firstMessage.trim(),
              document: firstDocument,
              attachments: firstAttachments,
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
      {current.discussions.filter((d) => d.audience === "group").length ? (
        current.discussions
          .filter((d) => d.audience === "group")
          .slice(0, 3)
          .map((d) => (
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
          Group topics from your mentoring cohort will appear here.
        </p>
      )}
    </div>
  );
  useLayoutEffect(() => {
    const element = workspaceElement.current;
    if (
      !element ||
      !(selectedTask && view === "Tasks & Schedule") &&
      !(thread && ["Discussions", "Communications"].includes(view))
    )
      return;
    const parent = element.closest(".dashboard-content");
    if (parent) parent.scrollTop = 0;
    const fit = () => {
      const top = element.getBoundingClientRect().top;
      const height = window.visualViewport?.height || window.innerHeight;
      let reserve = 12;
      for (
        let ancestor = element.parentElement;
        ancestor && ancestor !== document.body;
        ancestor = ancestor.parentElement
      ) {
        const style = getComputedStyle(ancestor);
        reserve +=
          (parseFloat(style.paddingBottom) || 0) +
          (parseFloat(style.marginBottom) || 0);
      }
      element.style.setProperty(
        "--mw-thread-space",
        `${Math.max(120, height - top - reserve)}px`,
      );
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (element.parentElement) observer.observe(element.parentElement);
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
      element.style.removeProperty("--mw-thread-space");
    };
  }, [thread?.id, selectedTask?.id, view]);
  return (
    <section
      ref={workspaceElement}
      className={`mw-shell ${embedded ? "mw-integrated" : ""} ${(thread && ["Discussions", "Communications"].includes(view)) || (selectedTask && view === "Tasks & Schedule") ? "mw-thread-active" : ""}`}
      onChange={(event) => event.stopPropagation()}
      aria-busy={busy || fileReading}
      aria-label={`${isStudent ? "Mentee" : "Mentor"} collaboration workspace`}
    >
      {!embedded && (
        <aside className="mw-sidebar">
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
        </aside>
      )}
      <main className="mw-main">
        {!localDemo && (
          <div className={embedded ? "mw-context-bar" : "mw-demo"}>
            <span>
              {current.presentationMode ? (
                <b className="mw-presentation-label">Presentation preview</b>
              ) : (
                "MENTORING WORKSPACE"
              )}
            </span>
            {onRefresh && (
              <button onClick={onRefresh} disabled={busy}>
                Refresh
              </button>
            )}
          </div>
        )}
        {oversight && (
          <aside
            className="mw-oversight-note"
            aria-label="Read-only placement oversight"
          >
            <Eye size={19} />
            <div>
              <strong>Placement oversight · Read only</strong>
              <p>
                Review mentoring progress and conversations. Replies, task
                updates and session changes belong to the assigned mentor and
                student.
              </p>
            </div>
          </aside>
        )}
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
                <h2>
                  {oversight
                    ? "Mentoring Overview"
                    : isStudent
                      ? "Mentee Dashboard"
                      : "Mentor Dashboard"}
                </h2>
                <p>
                  {oversight
                    ? "Review mentoring across your authorised students."
                    : isStudent
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
                      label: oversight
                        ? "Awaiting Mentor Review"
                        : "Pending Replies",
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
                title={isStudent ? "Recent Updates" : "Recent Discussions"}
                action={link("View All", () => openView("Discussions"))}
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
                    ? "Group topics for your mentor and fellow mentees: placement drives, AI news and career ideas."
                    : "Mentoring updates and conversations in one place."}
                </p>
              </div>
              {writable && Boolean(current.groups?.length) && (
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
                      {d.audience === "group" && (
                        <span className="mw-discussion-summary-people">
                          <ParticipantStack
                            participants={d.participants || []}
                          />
                          <small>
                            {d.participants?.length || d.memberCount}{" "}
                            participants · {d.mentorName}
                          </small>
                        </span>
                      )}
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
                    Start a discussion with your mentor and selected mentees.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
        {thread && ["Discussions", "Communications"].includes(view) && (
          <div className="mw-thread">
            <button className="mw-back" onClick={() => setThreadId(null)}>
              <ArrowLeft size={18} /> Back to discussions
            </button>
            <header className="mw-thread-heading">
              <span className="mw-icon">
                <Users size={27} />
              </span>
              <div>
                <h2>{thread.title}</h2>
                <div className="mw-thread-meta">
                <span className="mw-category">
                  {thread.audience === "group"
                    ? "Mentoring Group"
                    : "Private conversation history"}
                </span>
                {thread.audience === "group" ? (
                  <button
                    type="button"
                    className="mw-thread-people"
                    disabled={!thread.participants?.length}
                    aria-label={`View ${thread.participants?.length || thread.memberCount} discussion participants`}
                    aria-haspopup="dialog"
                    onClick={() => setParticipantsFor(thread.id)}
                  >
                    <ParticipantStack
                      participants={thread.participants || []}
                    />
                    <span>
                      {thread.participants?.length || thread.memberCount}{" "}
                      participants
                    </span>
                    <ChevronDown size={14} />
                  </button>
                ) : (
                  <p>
                    {thread.studentName || current.studentName} (Mentee) ·{" "}
                    {thread.mentorName || current.mentorName} (Mentor)
                  </p>
                )}
                </div>
              </div>
              {threadWritable && (
                <button
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
                  disabled={busy || !threadWritable}
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
                </button>
              )}
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
              {threadWritable && !isStudent && (
                <button
                  className="mw-resolve"
                  disabled={busy || !threadWritable}
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
                </button>
              )}
              {!threadWritable && (
                <span className="mw-thread-status">
                  {thread.resolved ? "Resolved" : "Open"}
                </span>
              )}
            </header>
            <p className="mw-visibility-note">
              <Eye size={14} />
              Authorised placement staff can review this conversation.
            </p>
            <div className="mw-messages">
              {thread.messages.map((m) => (
                <article
                  className={`mw-message ${m.role === "Mentor" ? "from-mentor" : ""}`}
                  key={m.id}
                  id={`mw-msg-${m.id}`}
                >
                  {m.role === "Mentee" &&
                  (m.studentId || thread.studentId) &&
                  renderStudentPhoto ? (
                    renderStudentPhoto(
                      m.studentId || thread.studentId!,
                      m.author,
                    )
                  ) : (
                    <Avatar
                      name={m.author}
                      photo={
                        m.authorPhoto ||
                        (m.role === "Mentee" &&
                        isStudent &&
                        (!m.studentId || m.author === current.studentName)
                          ? current.studentPhoto
                          : m.role === "Mentor"
                            ? thread.mentorPhoto || current.mentorPhoto
                            : undefined)
                      }
                    />
                  )}

                  <div>
                    <ConversationBubble message={m} onDownload={downloadFile} />
                    {threadWritable && (
                      <div className="mw-message-actions">
                        <button
                          aria-label={`Like message from ${m.author}`}
                          disabled={busy || !threadWritable}
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
                            setReplyDocument(null);
                            setReply(`@${m.author} `);
                            composer.current?.commands.focus();
                          }}
                        >
                          <Reply size={16} />
                          Reply
                        </button>
                      </div>
                    )}
                    {!threadWritable && m.likes > 0 && (
                      <span className="mw-read-reactions">
                        <ThumbsUp size={14} />
                        {m.likes}
                      </span>
                    )}
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
            {!threadWritable ? (
              <div className="mw-read-only-footer">
                <Eye size={17} />
                {oversight
                  ? "Read-only review. Only the selected participants can participate in this discussion."
                  : "This previous one-to-one conversation remains private and view-only."}
              </div>
            ) : thread.resolved ? (
              <div className="mw-resolved-note">
                <CheckCircle2 size={18} />
                {isStudent
                  ? "This topic is resolved. Your mentor can reopen it."
                  : "This topic is resolved. Reopen it to continue the conversation."}
              </div>
            ) : (
              <form ref={replyForm} className="mw-composer" onSubmit={submitReply}>
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
                  disabled={!threadWritable || busy || fileReading}
                  onClick={() => {
                    if (fileInput.current) {
                      fileInput.current.accept =
                        ".pdf,.txt,.py,.java,.cpp,.c,.js,.ts,.png,.jpg,.jpeg,.docx,.pptx,.xlsx";
                      fileInput.current.click();
                    }
                  }}
                >
                  <Paperclip size={21} />
                </button>
                <div>
                  <MessageEditor
                    text={reply}
                    document={replyDocument}
                    editorRef={composer}
                    label="Reply message"
                    onSend={()=>replyForm.current?.requestSubmit()}
                    disabled={!threadWritable || busy || fileReading}
                    onChange={(text, doc) => {
                      setReply(text);
                      setReplyDocument(doc);
                    }}
                    onImage={() => {
                      if (fileInput.current) {
                        fileInput.current.accept = "image/png,image/jpeg";
                        fileInput.current.click();
                      }
                    }}
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
                  className="mw-primary"
                  disabled={
                    !threadWritable ||
                    busy ||
                    fileReading ||
                    (!reply.trim() && !attachments.length) ||
                    reply.length > 10000
                  }
                >
                  <Send size={17} />
                  Send
                </button>
              </form>
            )}
          </div>
        )}
        {view === "Tasks & Schedule" && selectedTask && (
          <TaskDetail
            task={selectedTask}
            renderMessagePhoto={(message) =>
              message.role === "Mentee" && (message.studentId || selectedTask.studentId) && renderStudentPhoto
                ? renderStudentPhoto(message.studentId || selectedTask.studentId!, message.author)
                : <Avatar name={message.author} photo={message.authorPhoto || (message.role === "Mentor" ? current.mentorPhoto : isStudent ? current.studentPhoto : undefined)} />
            }
            isStudent={isStudent}
            writable={writable}
            busy={busy}
            onBack={() => setTaskId(null)}
            onAction={persist}
            onDownload={downloadFile}
          />
        )}
        {view === "Tasks & Schedule" && !selectedTask && (
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
              {[
                "My Tasks",
                "Needs Attention",
                "Schedule (Calendar)",
                "Completed",
              ].map((t) => (
                <button
                  role="tab"
                  aria-selected={taskTab === t}
                  key={t}
                  onClick={() => setTaskTab(t)}
                >
                  {t}
                  {t === "Needs Attention" && (
                    <span className="mw-attention-count">{attentionCount}</span>
                  )}
                </button>
              ))}
            </div>
            {taskTab === "Needs Attention" && (
              <p className="mw-attention-help">
                {isStudent
                  ? "Unfinished assignments due within the next two days. Submitted work stays with your mentor for review."
                  : "Assignments due soon and student submissions awaiting your review."}
              </p>
            )}
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
                        <th>Task</th>
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
                            {writable && !t.requiresReview ? (
                              <input
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
                              />
                            ) : (
                              <input type="checkbox" checked={t.status === "Completed"} disabled aria-label={`${t.title}: ${t.status}`} />
                            )}
                          </td>
                          <td>
                            <button
                              className="mw-open-task"
                              onClick={() => setTaskId(t.id)}
                            >
                              {t.title}
                            </button>
                            {t.personal && (
                              <span className="mw-private-task">
                                Private · Only you
                              </span>
                            )}
                            <small>{t.messages?.find((message) => message.kind === "reference")?.text}</small>
                          </td>
                          <td>
                            <span className="mw-table-person">
                              {!isStudent &&
                              t.studentId &&
                              renderStudentPhoto ? (
                                renderStudentPhoto(t.studentId, t.assignee)
                              ) : (
                                <Avatar
                                  name={isStudent ? t.assignedBy : t.assignee}
                                  photo={personPhoto(
                                    isStudent ? t.assignedBy : t.assignee,
                                  )}
                                />
                              )}

                              {isStudent ? t.assignedBy : t.assignee}
                            </span>
                          </td>
                          <td>
                            {dateLabel(t.due)}
                            {taskTab === "Needs Attention" && (
                              <small
                                className={
                                  t.due < today
                                    ? "mw-due-overdue"
                                    : "mw-due-soon"
                                }
                              >
                                {t.due < today
                                  ? "Overdue"
                                  : t.due === today
                                    ? "Due today"
                                    : "Due soon"}
                              </small>
                            )}
                          </td>
                          <td>
                            {writable && !t.requiresReview ? (
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
                              aria-label={`Open task ${t.title}`}
                              onClick={() => setTaskId(t.id)}
                            >
                              <Reply size={17} />
                            </button>
                            {writable && !t.legacy && (!isStudent || t.personal) && <>
                            <button
                              aria-label={`Actions for ${t.title}`}
                              {...{ popovertarget: `task-actions-${t.id}` }}
                              onClick={(event) => {
                                const rect = event.currentTarget.getBoundingClientRect();
                                const menu = document.getElementById(`task-actions-${t.id}`);
                                if (menu) {
                                  menu.style.left = `${Math.max(8, Math.min(rect.right - 210, window.innerWidth - 218))}px`;
                                  menu.style.top = `${Math.min(rect.bottom + 5, window.innerHeight - 160)}px`;
                                }
                              }}
                            >
                              <MoreHorizontal size={19} />
                            </button>
                            <div id={`task-actions-${t.id}`} {...{ popover: "auto" }} className="mw-task-action-menu" aria-label={`Task actions for ${t.title}`}>
                              {writable && !t.legacy && (!isStudent || t.personal) ? (
                                <button className="mw-delete-task" disabled={busy} onClick={async (event) => {
                                  event.currentTarget.parentElement?.hidePopover();
                                  if (!window.confirm(`Delete “${t.title}”? This removes the task and its conversation from both portals. This cannot be undone from the portal.`)) return;
                                  if (localDemo) {
                                    update((value) => ({ ...value, tasks: value.tasks.filter((task) => task.id !== t.id) }));
                                  } else {
                                    const saved = await persist({ action: "delete_task", studentId: t.studentId || "", id: t.id });
                                    if (!saved) return;
                                  }
                                  if (taskId === t.id) setTaskId(null);
                                  setNotice("Task deleted.");
                                }}>
                                  <Trash2 size={15} /> Delete task
                                </button>
                              ) : <p className="mw-task-menu-note">{t.personal ? "Only you manage this task." : "The assigned mentor manages this task."}</p>}
                            </div>
                            </>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filtered.length && (
                    <p className="mw-empty">
                      {search
                        ? "No tasks match your search."
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
        {participantTopic?.participants && (
          <DiscussionParticipants
            title={participantTopic.title}
            participants={participantTopic.participants}
            onClose={() => setParticipantsFor(null)}
          />
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
                  "input:not([hidden]),textarea,select,button:not(:disabled),[contenteditable=true]",
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
              className={`mw-modal ${newDiscussion ? "mw-discussion-modal" : newTask ? "mw-task-modal" : ""}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mw-dialog-title"
            >
              <header>
                <h2 id="mw-dialog-title">
                  {newSession
                    ? "Schedule a session"
                    : newTask
                      ? isStudent
                        ? "Create a personal task"
                        : "Create a task"
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
                {!localDemo && newDiscussion && (
                  <div className="mw-audience-picker">
                    <div className="mw-audience-label mw-members-label">
                      Mentees{" "}
                      <small>
                        {allDiscussionMentees
                          ? `All ${selectedGroup?.members?.length || 0} mentees`
                          : `${discussionMemberIds.length} selected`}
                      </small>
                    </div>
                    {(selectedGroup?.members?.length || 0) > 6 && (
                      <label className="mw-member-search">
                        <Search size={15} />
                        <input
                          aria-label="Search mentees"
                          placeholder="Search mentees"
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                        />
                      </label>
                    )}
                    <div
                      className="mw-people-chips mw-member-chips"
                      role="group"
                      aria-label="Choose discussion mentees"
                    >
                      <button
                        type="button"
                        className={
                          allDiscussionMentees
                            ? "selected mw-all-mentees"
                            : "mw-all-mentees"
                        }
                        aria-pressed={allDiscussionMentees}
                        onClick={() => setAllDiscussionMentees(true)}
                      >
                        <span className="mw-audience-all-icon">
                          <Users size={18} />
                        </span>
                        <span>All mentees</span>
                        <span
                          className={`mw-chip-check ${allDiscussionMentees ? "is-selected" : ""}`}
                          aria-hidden="true"
                        >
                          <Check size={14} />
                        </span>
                      </button>
                      {selectedGroup?.members
                        ?.filter((member) =>
                          member.name
                            .toLowerCase()
                            .includes(memberSearch.toLowerCase()),
                        )
                        .map((member) => (
                          <button
                            type="button"
                            key={member.id}
                            className={
                              allDiscussionMentees ||
                              discussionMemberIds.includes(member.id)
                                ? "selected"
                                : ""
                            }
                            aria-pressed={
                              allDiscussionMentees ||
                              discussionMemberIds.includes(member.id)
                            }
                            disabled={
                              Boolean(member.isSelf) && !allDiscussionMentees
                            }
                            onClick={() => toggleDiscussionMember(member.id)}
                          >
                            {renderStudentPhoto ? (
                              renderStudentPhoto(member.id, member.name)
                            ) : (
                              <Avatar
                                name={member.name}
                                photo={
                                  member.photo ||
                                  (member.isSelf
                                    ? current.studentPhoto
                                    : undefined)
                                }
                              />
                            )}
                            <span className="mw-chip-name" title={member.name}>
                              {member.name}
                              {member.isSelf ? " (You)" : ""}
                            </span>
                            <span
                              className={`mw-chip-check ${allDiscussionMentees || discussionMemberIds.includes(member.id) ? "is-selected" : ""}`}
                              aria-hidden="true"
                            >
                              <Check size={14} />
                            </span>
                          </button>
                        ))}
                      {selectedGroup?.members?.length === 0 && (
                        <small className="mw-no-members">
                          No assigned mentees available.
                        </small>
                      )}
                    </div>
                    <input
                      type="hidden"
                      name="mentorId"
                      value={selectedGroup?.mentorId || ""}
                    />
                  </div>
                )}
                {!newDiscussion && !localDemo && !isStudent && (
                  <label>
                    Assigned mentee
                    <select name="studentId" required defaultValue="">
                      <option value="" disabled>Choose a mentee</option>
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
                    {isStudent && (
                      <p className="mw-personal-task-note">
                        Only you can see this task. It is not shared with your
                        mentor or placement team.
                      </p>
                    )}
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
                    <label className="mw-task-due-field">
                      Due date
                      <input name="due" type="date" required />
                    </label>
                    <div className="mw-task-create-files">
                      <span>
                        {isStudent
                          ? "Private notes & files"
                          : "Instructions & references"}
                      </span>
                      <MessageEditor
                        text={firstMessage}
                        document={firstDocument}
                        label="Task instructions"
                        onSend={() =>
                          dialogTitle.current?.form?.requestSubmit()
                        }
                        disabled={busy || fileReading}
                        onChange={(text, doc) => {
                          setFirstMessage(text);
                          setFirstDocument(doc);
                        }}
                        onImage={() => {
                          if (firstFileInput.current) {
                            firstFileInput.current.accept =
                              "image/png,image/jpeg";
                            firstFileInput.current.click();
                          }
                        }}
                      />
                      <input
                        ref={firstFileInput}
                        type="file"
                        hidden
                        multiple
                        onChange={(e) => {
                          void chooseFiles(
                            Array.from(e.target.files || []),
                            true,
                          );
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        className="mw-discussion-attach"
                        disabled={busy || fileReading}
                        onClick={() => {
                          if (firstFileInput.current) {
                            firstFileInput.current.accept =
                              ".pdf,.txt,.py,.java,.cpp,.c,.js,.ts,.png,.jpg,.jpeg,.docx,.pptx,.xlsx";
                            firstFileInput.current.click();
                          }
                        }}
                      >
                        <Paperclip size={15} />
                        Attach references
                      </button>
                      <div className="mw-file-chips">
                        {firstAttachments.map((a, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() =>
                              setFirstAttachments((v) =>
                                v.filter((_, j) => j !== i),
                              )
                            }
                          >
                            {a.name}
                            <X size={13} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mw-discussion-message">
                    <span>Message</span>
                    <MessageEditor
                      text={firstMessage}
                      document={firstDocument}
                      label="Discussion message"
                      onSend={() => dialogTitle.current?.form?.requestSubmit()}
                      disabled={busy || fileReading}
                      onChange={(text, doc) => {
                        setFirstMessage(text);
                        setFirstDocument(doc);
                      }}
                      onImage={() => {
                        if (firstFileInput.current) {
                          firstFileInput.current.accept =
                            "image/png,image/jpeg";
                          firstFileInput.current.click();
                        }
                      }}
                    />
                    <input
                      ref={firstFileInput}
                      type="file"
                      hidden
                      multiple
                      onChange={(e) => {
                        void chooseFiles(
                          Array.from(e.target.files || []),
                          true,
                        );
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      className="mw-discussion-attach"
                      disabled={busy || fileReading}
                      onClick={() => {
                        if (firstFileInput.current) {
                          firstFileInput.current.accept =
                            ".pdf,.txt,.py,.java,.cpp,.c,.js,.ts,.png,.jpg,.jpeg,.docx,.pptx,.xlsx";
                          firstFileInput.current.click();
                        }
                      }}
                    >
                      <Paperclip size={15} /> Attach files
                    </button>
                    <div className="mw-file-chips">
                      {firstAttachments.map((a, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() =>
                            setFirstAttachments((v) =>
                              v.filter((_, j) => i !== j),
                            )
                          }
                        >
                          {a.name}
                          <X size={13} />
                        </button>
                      ))}
                    </div>
                  </div>
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
                  <button
                    className="mw-primary"
                    disabled={
                      busy ||
                      fileReading ||
                      (newTask && !isStudent && !firstMessage.trim() && !firstAttachments.length) ||
                      (newDiscussion &&
                        ((!firstMessage.trim() && !firstAttachments.length) ||
                          firstMessage.length > 10000 ||
                          !selectedGroup ||
                          (!allDiscussionMentees &&
                            !discussionMemberIds.length)))
                    }
                  >
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
