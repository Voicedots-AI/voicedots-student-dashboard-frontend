import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Users, X } from "lucide-react";
import "./discussion-participants.css";
export type DiscussionParticipant = {
  id: string;
  name: string;
  role: "Mentor" | "Mentee";
  photo?: string | null;
  isSelf?: boolean;
};
function Portrait({ person }: { person: DiscussionParticipant }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [person.photo]);
  return (
    <span className="mw-person-portrait" aria-hidden="true">
      {person.photo && !failed ? (
        <img src={person.photo} alt="" onError={() => setFailed(true)} />
      ) : (
        <span>
          {person.name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((n) => n[0])
            .join("")
            .toUpperCase()}
        </span>
      )}
    </span>
  );
}
export function ParticipantStack({
  participants,
  limit = 3,
}: {
  participants: DiscussionParticipant[];
  limit?: number;
}) {
  if (!participants.length) return null;
  return (
    <span
      className="mw-participant-stack"
      role="img"
      aria-label={participants.map((p) => p.name).join(", ")}
      title={participants.map((p) => p.name).join(", ")}
    >
      {participants.slice(0, limit).map((person) => (
        <Portrait key={person.id} person={person} />
      ))}
      {participants.length > limit && (
        <span className="mw-participant-more">
          +{participants.length - limit}
        </span>
      )}
    </span>
  );
}
export default function DiscussionParticipants({
  title,
  participants,
  onClose,
}: {
  title: string;
  participants: DiscussionParticipant[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const dialog = useRef<HTMLElement>(null),
    input = useRef<HTMLInputElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const origin = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    input.current?.focus();
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close.current();
      }
      if (e.key === "Tab") {
        const list = dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input",
        );
        if (!list?.length) return;
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
    };
    document.addEventListener("keydown", keyboard, true);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keyboard, true);
      if (origin?.isConnected) origin.focus();
    };
  }, []);
  const visible = participants.filter((p) =>
    `${p.name} ${p.role}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return createPortal(
    <div
      className="mw-participant-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={dialog}
        className="mw-participant-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mw-participant-title"
      >
        <header>
          <span className="mw-participant-dialog-icon">
            <Users size={21} />
          </span>
          <div>
            <h2 id="mw-participant-title">
              Participants <span>{participants.length}</span>
            </h2>
            <p title={title}>{title}</p>
          </div>
          <button
            type="button"
            aria-label="Close participants"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <label className="mw-participant-search">
          <Search size={16} />
          <input
            ref={input}
            aria-label="Search participants"
            placeholder="Search participants"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="mw-participant-roster">
          {(["Mentor", "Mentee"] as const).map((role) => {
            const people = visible.filter((p) => p.role === role);
            return people.length ? (
              <section key={role}>
                <h3>
                  {role === "Mentor" ? "Mentor" : "Mentees"}{" "}
                  <span>{people.length}</span>
                </h3>
                <ul>
                  {people.map((person) => (
                    <li key={person.id}>
                      <Portrait person={person} />
                      <div>
                        <strong>
                          {person.name}
                          {person.isSelf && <small>You</small>}
                        </strong>
                        <span>{person.role}</span>
                      </div>
                      {person.role === "Mentor" && (
                        <span className="mw-mentor-role">Mentor</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null;
          })}
          {!visible.length && (
            <p className="mw-participant-empty">
              No participants match your search.
            </p>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
