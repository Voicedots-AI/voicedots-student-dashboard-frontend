import { expect, type Page } from "@playwright/test";

export const student = { id: "student-1", full_name: "Asha Kumar", email: "asha@college.edu", roll_number: "CS01", program: "B.Tech", department_code: "CSE", photo_url: "/api/student/profile/photo", current_resume_submission_id: "resume-main", has_readable_resume: true };

const reportView = (score: number, overrides: Record<string, unknown> = {}) => ({
  status: "released", overall_score: score, readiness: "Interview Ready", rubric_version: "rubric-v1",
  core_dimensions: [{ dimension: "communication", percentage: 75 }, { dimension: "structured_thinking", percentage: 68 }],
  domain_dimensions: [{ dimension: "domain_knowledge", percentage: 82 }],
  strengths: [{ text: "Explains decisions with clear evidence." }],
  priority_improvement_areas: [{ focus: "Applied examples", actions: ["Add a measurable result to each example."] }],
  question_reviews: [
    { turn_id: "turn-1", question: "Explain your project architecture", answer: "A layered service.", evidence_status: "answered", competency: "Technical", score: 8 },
    { turn_id: "turn-2", question: "Describe a team challenge", answer: "", evidence_status: "not_answered" },
  ],
  interview_profile: { duration_minutes: 30 }, ...overrides,
});

export const releasedReport = (id: string, score: number, daysAgo: number, overrides: Record<string, unknown> = {}) => ({
  evaluation_id: `evaluation-${id}`, session_id: `session-${id}`, submission_id: `submission-${id}`, status: "released",
  released_to_student_at: new Date(Date.now() - daysAgo * 86400000).toISOString(), created_at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  completed_at: new Date(Date.now() - daysAgo * 86400000).toISOString(), duration_minutes: 30, target_role: "Backend Developer", report: reportView(score), ...overrides,
});

export const reports = [releasedReport("old", 61, 20), releasedReport("latest", 79, 3)];
export const latestEvaluation = reports[1].report as Record<string, unknown>;

export async function mockPerformance(page: Page, options: { reportRows?: Record<string, unknown>[]; evaluation?: Record<string, unknown>; reportsStatus?: number; recording?: Record<string, unknown> } = {}) {
  const rows = options.reportRows ?? reports;
  const evaluation = options.evaluation ?? latestEvaluation;
  const requested: string[] = [];
  await page.route("**/api/**", route => route.fulfill({ json: {} }));
  await page.route("**/api/auth/student-me", route => route.fulfill({ json: { student } }));
  await page.route("**/api/student/reports", route => { requested.push("reports"); return route.fulfill({ status: options.reportsStatus ?? 200, json: options.reportsStatus ? { detail: "down" } : { reports: rows } }); });
  await page.route("**/api/interview/*/evaluation", route => { requested.push("evaluation"); return route.fulfill({ json: evaluation }); });
  await page.route("**/api/student/interview/*/recording", route => route.fulfill({ json: options.recording ?? { status: "unavailable", playback_url: null } }));
  await page.route("**/api/student/scorecard-shares", route => route.fulfill({ json: { items: [] } }));
  return requested;
}

export async function openPerformance(page: Page, options: Parameters<typeof mockPerformance>[1] = {}) {
  const requested = await mockPerformance(page, options);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Student Assessment Intelligence" })).toBeVisible();
  return requested;
}
