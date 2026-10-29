import {useEffect,useState} from "react";
import {api,ApiError} from "./api";
import {useAuth} from "./auth";
import {studentDataCache} from "./student-data-cache";
import {evaluatedPlacementScore,meetsPlacementATSThreshold} from "./placement-eligibility";

type PlacementATSResult = {score:number|null;missing:string[];failed:boolean;status:string;checked:boolean};

// Shared, drive-level cache so every card reads the same ATS result instead of
// each card firing its own waterfall request. Populated in parallel once the
// drives list loads, so cards paint immediately and ATS info fills in as it resolves.

function fetchPlacementATS(driveId: string, signal?: AbortSignal): Promise<PlacementATSResult> {
  return api<{ats_status:string; ats_fit_score:number|null; skills?:{skill?:string;requirement?:string;priority?:string;importance?:string;match_status?:string;match_score?:number;evidence_level?:string;evidence_source?:string;evidence_text?:string}[]}>(`/api/student/drives/${encodeURIComponent(driveId)}/ats-fit`, {timeoutMs:120000, signal}).then(result => {
    const score = evaluatedPlacementScore(result.ats_status, result.ats_fit_score);
    const missing = result.ats_status === "evaluated" ? (result.skills||[]).filter(row =>
      ['mandatory','core'].includes((row.priority||row.importance||'').trim().toLowerCase()) &&
      (['NO_EVIDENCE','NO_MATCH','MISSING','WEAK_OR_INFERRED'].includes((row.match_status||'').toUpperCase()))
    ).map(row=>row.skill||row.requirement||'').filter(Boolean) : [];
    return {score, missing, failed:false, status:result.ats_status, checked: result.ats_status === "evaluated" && Array.isArray(result.skills)};
  }).catch((error: unknown) => error instanceof ApiError && error.status === 404
    ? {score:null, missing:[], failed:false, status:"not_assessed", checked:false}
    : {score:null, missing:[], failed:true, status:"failed", checked:false});
}

// Kick off every visible drive's ATS fit in parallel (bounded timeout, no retry
// loop) as soon as the drives list arrives. Individual cards still use
// usePlacementATS below, which reads this cache first for an instant paint.
export function usePlacementATSPrefetch(driveIds: string[]) {
  const {identity} = useAuth();
  const studentId = identity?.student.id;
  const resumeId = identity?.student.current_resume_submission_id || "none";
  const idsKey = JSON.stringify(driveIds);
  useEffect(() => {
    if (!studentId) return;
    const ids = JSON.parse(idsKey) as string[];
    const cacheKey = (id: string) => `${studentId}:${resumeId}:${id}`;
    void Promise.allSettled(ids.map(id=>studentDataCache.get<PlacementATSResult>(cacheKey(id),()=>fetchPlacementATS(id))));
  }, [studentId, resumeId, idsKey]);
}

export function usePlacementATS(driveId?: string | null) {
  const {identity} = useAuth();
  const studentId = identity?.student.id;
  const resumeId = identity?.student.current_resume_submission_id || "none";
  const cacheKey = studentId && driveId ? `${studentId}:${resumeId}:${driveId}` : "";
  const [state, setState] = useState<{key:string; result:PlacementATSResult} | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!cacheKey || !driveId) return;
    let active = true;
    void studentDataCache.get<PlacementATSResult>(cacheKey,()=>fetchPlacementATS(driveId))
      .then(result => { if (active) setState({key:cacheKey,result}); });
    return () => { active = false; };
  }, [cacheKey, driveId, version]);
  const current = state?.key === cacheKey ? state.result : studentDataCache.peek<PlacementATSResult>(cacheKey);
  useEffect(()=>{
    if(current?.status!=="processing")return;
    let timer:number;
    const poll=()=>{timer=window.setTimeout(()=>{if(document.visibilityState==="hidden"){poll();return}studentDataCache.invalidate(cacheKey);setVersion(value=>value+1)},10000)};
    poll();
    return()=>window.clearTimeout(timer);
  },[current,cacheKey]);
  return {eligible:meetsPlacementATSThreshold(current?.score), score:current?.score ?? null, missing:current?.missing || [], failed:current?.failed || false, checked:current?.checked === true, pending:Boolean(cacheKey) && !current,
    retry:()=>{studentDataCache.invalidate(cacheKey);setState(null);setVersion(v=>v+1);}};
}
