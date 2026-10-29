export const MIN_PLACEMENT_ATS_SCORE = 50;

export function evaluatedPlacementScore(status: string, value: unknown): number | null {
  return status === "evaluated" && typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

export function meetsPlacementATSThreshold(score: unknown): score is number {
  return typeof score === "number" && Number.isFinite(score) && score >= MIN_PLACEMENT_ATS_SCORE && score <= 100;
}

type PlacementEvidenceRow = {priority?:string;importance?:string;match_status?:string;evidence_level?:string;evidence_source?:string;evidence_text?:string};

// Match the backend's weighted applied-evidence floor. A declaration, course,
// raw keyword hit or bare project title cannot count as demonstrated work.
export function hasAppliedPlacementEvidence(rows: PlacementEvidenceRow[] | undefined): boolean {
  if (!Array.isArray(rows) || !rows.length) return false;
  let total=0,applied=0;
  const action=/\b(?:built|build|developed|develop|implemented|implement|designed|design|created|create|deployed|deploy|trained|train|evaluated|evaluate|tested|test|automated|automate|integrated|integrate|used|use|using|configured|configure|managed|manage|analyzed|analyse|analyze|optimized|optimize|led|delivered|maintained|maintain|wrote|write|migrated|migrate|fine[- ]tuned|fine[- ]tune)\b/i;
  for (const row of rows) {
    const priority=(row.priority||row.importance||"core").toLowerCase();
    const weight=priority==="mandatory"?3:priority==="preferred"?1:2;
    total+=weight;
    if (row.evidence_level==="applied" && row.evidence_source==="entries" && ["FULL_MATCH","RELATED_EVIDENCE"].includes(row.match_status||"") && (row.evidence_text||"").trim().split(/\s+/).length>=3 && action.test(row.evidence_text||"")) applied+=weight;
  }
  return total>0 && applied/total>=.5;
}
