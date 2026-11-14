import { useMemo } from "react";
import { api, json, request } from "../api";
import { useAuth } from "../auth";
import ConnectedMentoringWorkspace, {
  type WorkspaceTransport,
} from "./ConnectedMentoringWorkspace";
import MentoringWorkspace, { type WorkspaceData } from "./MentoringWorkspace";
export default function StudentMentoringWorkspace({
  activeView,
  onViewChange,
}: {
  activeView?: string;
  onViewChange?: (view: string) => void;
}) {
  const { identity } = useAuth();
  const transport = useMemo<WorkspaceTransport>(
    () => ({
      load: async (signal) => {
        const result = await api<WorkspaceData>(
          "/api/student/mentor/workspace",
          { signal },
        );
        return {
          ...result,
          studentName: identity?.student.full_name || result.studentName,
          studentPhoto: identity?.student.photo_url,
        };
      },
      save: (payload) =>
        api("/api/student/mentor/workspace/actions", json(payload)),
      download: async (file) => {
        if (!file.downloadPath) throw new Error("Attachment unavailable.");
        const response = await request(
          `/api/student/mentor/workspace/${file.downloadPath}`,
        );
        const url = URL.createObjectURL(await response.blob());
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: (error) =>
        error instanceof Error
          ? error.message
          : "Unable to load mentoring records. Please retry.",
    }),
    [identity?.student.full_name, identity?.student.photo_url],
  );
  if (
    import.meta.env.DEV &&
    new URLSearchParams(location.search).get("mentoringDemo") === "1"
  )
    return <MentoringWorkspace demo role="student" />;
  return (
    <ConnectedMentoringWorkspace
      transport={transport}
      role="student"
      activeView={activeView}
      onViewChange={onViewChange}
     
    />
  );
}
