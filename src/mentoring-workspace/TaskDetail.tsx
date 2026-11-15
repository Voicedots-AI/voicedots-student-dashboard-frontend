import type { Editor } from "@tiptap/react";
import ConversationBubble from "./ConversationBubble";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Paperclip,
  Send,
  CheckCircle2,
  RotateCcw,
  X,
  CalendarDays,
  LockKeyhole,
  Clock,
  Reply,
} from "lucide-react";
import MessageEditor, {
  type MessageDocument,
} from "./MessageEditor";
import type {
  WorkspaceAction,
  WorkspaceTask,
  Attachment,
  Message,
} from "./MentoringWorkspace";
import "./task-detail.css";
export default function TaskDetail({
  task,
  renderMessagePhoto,
  isStudent,
  writable,
  busy,
  onBack,
  onAction,
  onDownload,
}: {
  task: WorkspaceTask;
  renderMessagePhoto: (message: Message) => ReactNode;
  isStudent: boolean;
  writable: boolean;
  busy: boolean;
  onBack: () => void;
  onAction: (action: WorkspaceAction) => Promise<{ id: string } | null>;
  onDownload: (file: Attachment) => Promise<void>;
}) {
  const [text, setText] = useState(""),
    [document, setDocument] = useState<MessageDocument | null>(null),
    [files, setFiles] = useState<Attachment[]>([]),
    [reading, setReading] = useState(false),
    [error, setError] = useState("");
  const composer = useRef<Editor | null>(null);
  const input = useRef<HTMLInputElement>(null),
    end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setText("");
    setDocument(null);
    setFiles([]);
    setError("");
  }, [task.id]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [task.messages?.length]);
  async function choose(selected: File[]) {
    if (
      files.length + selected.length > 3 ||
      selected.some((f) => f.size > 2 * 1024 * 1024)
    ) {
      setError("Choose up to three files, each no larger than 2 MB.");
      return;
    }
    setReading(true);
    setError("");
    try {
      const prepared = await Promise.all(
        selected.map(async (f) => ({
          name: f.name,
          size: `${(f.size / 1024).toFixed(1)} KB`,
          content: await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1]);
            reader.onerror = () =>
              reject(new Error("Unable to read the file."));
            reader.readAsDataURL(f);
          }),
        })),
      );
      setFiles((v) => [...v, ...prepared]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to read files.");
    } finally {
      setReading(false);
    }
  }
  async function send(
    action: "task_message" | "submit_task" | "review_task",
    status?: "Completed" | "Needs Revision",
  ) {
    if (busy || reading) return;
    setError("");
    if (action !== "review_task" && !text.trim() && !files.length) {
      setError("Add a message or attach your work.");
      return;
    }
    if (status === "Needs Revision" && !text.trim()) {
      setError("Explain what the student should change.");
      return;
    }
    const saved = await onAction({
      action,
      id: task.id,
      studentId: task.studentId || "",
      text,
      document,
      status,
      files: files.map((f) => ({ name: f.name, content: f.content || "" })),
    });
    if (saved) {
      setText("");
      setDocument(null);
      setFiles([]);
    }
  }
  const privateTask = Boolean(task.personal),
    submitted = task.status === "Submitted",
    done = task.status === "Completed";
  // Both Enter and the single Send button use the same submission decision.
  const sendAction = isStudent && !privateTask && !submitted && !done
    ? "submit_task" : "task_message";
  const messages: Message[] = [...(task.messages || [])];
  // Older assignments store their opening message separately. Present that saved
  // text as the mentor's message, without inventing a timestamp or new record.
  if (task.outcome && !messages.some((message) => message.kind === "reference")) {
    messages.unshift({ id: `opening:${task.id}`, author: privateTask ? task.assignee : task.assignedBy,
      role: privateTask ? "Mentee" : "Mentor", studentId: privateTask ? task.studentId : undefined,
      text: task.outcome, time: "", attachments: [], likes: 0 });
  }
  return (
    <section className="mw-task-detail" aria-label="Assignment workspace">
      <button className="mw-back" onClick={onBack}>
        <ArrowLeft size={17} />
        Back to tasks
      </button>
      <header className="mw-task-header mw-thread-heading">
        <span className="mw-icon"><CalendarDays size={25} /></span>
        <div>
          <h2>{task.title}</h2>
          <p>
            {privateTask
              ? "Private · Only you"
              : `${task.assignedBy} → ${task.assignee}`}{" "}
            · Due{" "}
            {task.due
              ? new Date(task.due + "T12:00:00").toLocaleDateString("en-IN", {
                  dateStyle: "medium",
                })
              : "Not recorded"}
          </p>
        </div>
        <span
          className={`mw-status ${task.status.toLowerCase().replaceAll(" ", "-")}`}
        >
          {task.status === "Completed" ? (
            <CheckCircle2 size={15} />
          ) : (
            <Clock size={15} />
          )}{" "}
          {task.status === "Needs Revision" ? "Changes requested" : task.status}
        </span>
      </header>
      {privateTask ? (
        <p className="mw-task-privacy">
          <LockKeyhole size={14} />
          Only you can see this task, its notes and attachments.
        </p>
      ) : null}
      <div className="mw-task-activity mw-messages" aria-label="Task activity">
        {messages.length ? messages.map((message) => (
          <article className={`mw-message ${message.role === "Mentor" ? "from-mentor" : ""}`} key={message.id} id={`mw-msg-${message.id}`}>
            {renderMessagePhoto(message)}
            <div>
              <ConversationBubble message={message} onDownload={onDownload} />
              {writable && !message.id.startsWith("opening:") && <div className="mw-message-actions"><button type="button" onClick={() => {
                setDocument(null); setText(`@${message.author} `); composer.current?.commands.focus();
              }}><Reply size={16} /> Reply</button></div>}
            </div>
          </article>
        )) : <p className="mw-empty">No messages yet.</p>}
        <div ref={end} />
      </div>
      {!writable ? (
        <p className="mw-read-only-note">
          Read-only oversight. The assigned mentor and student manage this task.
        </p>
      ) : (
        <form
          className="mw-task-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send(sendAction);
          }}
        >
          {submitted && isStudent && (
            <p className="mw-task-waiting">
              Your work is with your mentor for review. You can still add an
              update below.
            </p>
          )}
          {task.status === "Needs Revision" && isStudent && (
            <p className="mw-task-waiting">
              Update your work and send it to your mentor for review.
            </p>
          )}
          {isStudent && !privateTask && !submitted && !done && task.status !== "Needs Revision" && (
            <p className="mw-task-waiting">
              Send your message or upload to your mentor for review.
            </p>
          )}
          <div className="mw-composer mw-task-chat-composer">
            <input ref={input} type="file" hidden multiple onChange={(event) => {
              void choose(Array.from(event.target.files || [])); event.target.value = "";
            }} />
            <button type="button" aria-label="Attach files" disabled={busy || reading} onClick={() => {
              if (input.current) { input.current.accept = ".pdf,.txt,.py,.java,.cpp,.c,.js,.ts,.png,.jpg,.jpeg,.docx,.pptx,.xlsx"; input.current.click(); }
            }}><Paperclip size={21} /></button>
            <div>
              <MessageEditor text={text} document={document} editorRef={composer}
                onChange={(value, doc) => { setText(value); setDocument(doc); }}
                label="Reply message" disabled={busy || reading}
                onImage={() => { if (input.current) { input.current.accept = "image/png,image/jpeg"; input.current.click(); } }}
                onSend={() => void send(sendAction)} />
              <div className="mw-file-chips">{files.map((file, index) => <button key={index} type="button" onClick={() => setFiles((value) => value.filter((_, at) => at !== index))}>{file.name}<X size={13} /></button>)}</div>
              {error && <p className="mw-task-error" role="alert">{error}</p>}
            </div>
            <button className="mw-primary" disabled={busy || reading || (!text.trim() && !files.length)}><Send size={17} />{privateTask ? "Save note" : "Send"}</button>
          </div>

          {!privateTask && writable && !isStudent && submitted && <footer className="mw-task-review-actions">
            <span className="mw-review-caption">Review student’s work</span>
            <div className="mw-task-actions">
              <button type="button" disabled={busy || reading} onClick={() => void send("review_task", "Needs Revision")}><RotateCcw size={16} /> Request changes</button>
              <button type="button" className="mw-primary" disabled={busy || reading} onClick={() => void send("review_task", "Completed")}><CheckCircle2 size={16} /> Mark completed</button>
            </div>
          </footer>}
        </form>
      )}
    </section>
  );
}
