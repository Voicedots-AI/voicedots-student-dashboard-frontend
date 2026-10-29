export const MIN_PLACEMENT_ATS_SCORE = 50;

export function evaluatedPlacementScore(status: string, value: unknown): number | null {
  return status === "evaluated" && typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

export function meetsPlacementATSThreshold(score: unknown): score is number {
  return typeof score === "number" && Number.isFinite(score) && score >= MIN_PLACEMENT_ATS_SCORE && score <= 100;
}
