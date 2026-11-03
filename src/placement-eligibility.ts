export function evaluatedPlacementScore(status: string, value: unknown): number | null {
  return status === "evaluated" && typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
}

export function meetsPlacementATSThreshold(score: unknown, minimum:number|null=null): boolean {
  if(minimum===null)return true;
  return typeof score === "number" && Number.isFinite(score) && score >= minimum && score <= 100;
}
