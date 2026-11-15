import { Download, FileText, Paperclip } from "lucide-react";
import { MessageBody } from "./MessageEditor";
import type { Attachment, Message } from "./MentoringWorkspace";

/** Shared by group discussions and private assignment conversations. */
export default function ConversationBubble({ message, onDownload }: {
  message: Message;
  onDownload: (file: Attachment) => Promise<void>;
}) {
  const date = message.time ? new Date(message.time) : null;
  const event = ({ submission: "Work submitted", approved: "Completed", changes_requested: "Changes requested" } as Record<string, string>)[message.kind || ""];
  return <div className="mw-bubble">
    <header>
      <strong>{message.author} ({message.role})</strong>
      {date && !Number.isNaN(date.getTime()) && <small>{date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</small>}
    </header>
    {event && <span className="mw-task-chat-event">{event}</span>}
    <MessageBody document={message.document} text={message.text} />
    {message.attachments.length > 0 && <div className="mw-attachments">
      <p><Paperclip size={13} />Attachments ({message.attachments.length})</p>
      <div>{message.attachments.map((file, index) => <button key={file.id || index} onClick={() => void onDownload(file)}>
        <span className={`mw-file ${file.name.endsWith(".pptx") ? "ppt" : ""}`}><FileText size={18} /><small>{file.name.split(".").pop()?.toUpperCase()}</small></span>
        <span><strong>{file.name}</strong><small>{file.size}</small></span>
        <Download size={16} />
      </button>)}</div>
    </div>}
  </div>;
}
