import { useCallback, useEffect, useRef, useState } from "react";
import MentoringWorkspace, {
  type Attachment,
  type WorkspaceAction,
  type WorkspaceData,
} from "./MentoringWorkspace";
export type WorkspaceTransport = {
  load: (signal: AbortSignal) => Promise<WorkspaceData>;
  save: (payload: WorkspaceAction) => Promise<{ id: string }>;
  download: (file: Attachment) => Promise<void>;
  error: (error: unknown) => string;
};
const timeZone = "Asia/Kolkata";
function present(data: WorkspaceData): WorkspaceData {
  return {
    ...data,
    schedule: data.schedule.map((event) => {
      if (!event.startsAt) return event;
      const start = new Date(event.startsAt),
        end = event.endsAt ? new Date(event.endsAt) : null;
      return {
        ...event,
        date: start.toLocaleDateString("en-CA", { timeZone }),
        time:
          start.toLocaleTimeString("en-IN", {
            hour: "numeric",
            minute: "2-digit",
            timeZone,
          }) +
          (end
            ? " – " +
              end.toLocaleTimeString("en-IN", {
                hour: "numeric",
                minute: "2-digit",
                timeZone,
              })
            : ""),
      };
    }),
  };
}
export default function ConnectedMentoringWorkspace({
  transport,
  role = "mentor",
  onMentees,
  onProfile,
  onReports,
  activeView,
  onViewChange,
}: {
  transport: WorkspaceTransport;
  role?: "mentor" | "student";
  onMentees?: () => void;
  onProfile?: () => void;
  onReports?: () => void;
  activeView?: string;
  onViewChange?: (view: string) => void;
}) {
  const [data, setData] = useState<WorkspaceData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0);
  const request = useRef(0),
    mutating = useRef(false),
    mounted = useRef(true),
    active = useRef<AbortController | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
    };
  }, []);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const id = ++request.current;
      try {
        const result = await transport.load(signal);
        if (!signal.aborted && id === request.current && mounted.current) {
          setData(present(result));
          setError("");
        }
      } catch (e) {
        if (!signal.aborted && id === request.current && mounted.current)
          setError(transport.error(e));
      }
    },
    [transport],
  );
  useEffect(() => {
    const controller = new AbortController();
    active.current = controller;
    void load(controller.signal);
    return () => controller.abort();
  }, [load, refresh]);
  useEffect(() => {
    const update = () => {
      if (document.hidden || mutating.current) return;
      active.current?.abort();
      const controller = new AbortController();
      active.current = controller;
      void load(controller.signal);
    };
    const timer = setInterval(update, 30000);
    window.addEventListener("focus", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, [load]);
  async function save(payload: WorkspaceAction) {
    if (mutating.current)
      throw new Error("A change is already saving. Please wait.");
    mutating.current = true;
    setBusy(true);
    active.current?.abort();
    ++request.current;
    try {
      const result = await transport.save(payload);
      const controller = new AbortController();
      active.current = controller;
      await load(controller.signal);
      return result;
    } catch (e) {
      throw new Error(transport.error(e));
    } finally {
      mutating.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <div className="mw-banner" role="alert">
          {error}
          <button onClick={() => setRefresh((v) => v + 1)}>Retry</button>
        </div>
      )}
      {!data && !error && <p role="status">Loading mentoring workspace…</p>}
      {data && (
        <MentoringWorkspace
          role={role}
          embedded
          activeView={activeView}
          onViewChange={onViewChange}
          data={data}
          onAction={save}
          onDownload={transport.download}
          onRefresh={() => setRefresh((v) => v + 1)}
          busy={busy}
          onMentees={onMentees}
          onProfile={onProfile}
          onReports={onReports}
        />
      )}
    </>
  );
}
