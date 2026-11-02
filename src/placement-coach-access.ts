import type { Drive, Report } from './api';

/** Starting Attempt 1 does not unlock coaching; finishing it does. */
export function canAccessPlacementCoach(drive: Drive | undefined, reports: Report[] = []): boolean {
  if (!drive) return false;
  const completed = Number(drive.interview_completed_attempts);
  if (Number.isFinite(completed) && completed > 0) return true;
  if (drive.interview_assignment_status === 'completed') return true;
  return reports.some(report => report.drive_id === drive.id && Boolean(report.completed_at));
}
