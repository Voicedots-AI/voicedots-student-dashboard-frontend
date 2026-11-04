export const MIN_PLACEMENT_ATS_SCORE = 50;

export function placementATSMinimum(configured?: number | null, assessment?: number | null): number {
  return configured !== undefined ? configured ?? MIN_PLACEMENT_ATS_SCORE : assessment ?? MIN_PLACEMENT_ATS_SCORE;
}

export function evaluatedPlacementScore(status: string, value: unknown): number | null {
  return status === "evaluated" && typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

export function meetsPlacementATSThreshold(score: unknown, minimum:number=MIN_PLACEMENT_ATS_SCORE): score is number {
  return typeof minimum === "number" && Number.isFinite(minimum) && minimum >= 0 && minimum <= 100
    && typeof score === "number" && Number.isFinite(score) && score >= minimum && score <= 100;
}
