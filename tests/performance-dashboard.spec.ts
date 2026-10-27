import { test, expect } from "@playwright/test";
import { latestEvaluation, mockPerformance, openPerformance, releasedReport, reports, student } from "./performance-fixtures";

test("renders the latest released report without recalculating API values", async ({ page }) => {
  const requested = await openPerformance(page);
  const summary = page.getByRole("region", { name: "Performance summary" });
  await expect(summary.locator(".spi-score strong")).toHaveText("79");
  await expect(summary.getByText("Interview Ready", { exact: true })).toBeVisible();
  await expect(page.getByText("+18 points", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "Comparable score trend across 2 interviews" })).toBeVisible();
  await expect(page.getByRole("meter", { name: "Communication" })).toHaveAttribute("aria-valuenow", "75");
  await expect(page.getByText("Add a measurable result to each example.").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "New interview" })).toHaveAttribute("href", "/practice");
  expect(requested).toContain("reports");
  expect(requested).toContain("evaluation");
});

test("keeps unreleased results behind the empty-state release gate", async ({ page }) => {
  const awaiting = releasedReport("pending", 90, 1, { status: "completed", released_to_student_at: null });
  await openPerformance(page, { reportRows: [awaiting] });
  await expect(page.getByText("Your performance dashboard is waiting for its first result")).toBeVisible();
  await expect(page.getByText("still being reviewed", { exact: false })).toBeVisible();
  await expect(page.locator(".spi-kpis")).toHaveCount(0);
});

test("points a student with no reports to practice", async ({ page }) => {
  await openPerformance(page, { reportRows: [] });
  await expect(page.getByText("Complete a practice interview", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start practicing/ })).toHaveAttribute("href", "/practice");
});

test("shows missing API fields as dashes instead of demo values", async ({ page }) => {
  const sparse = { ...latestEvaluation, readiness: undefined, rubric_version: undefined, core_dimensions: [], domain_dimensions: [], question_reviews: [] };
  await openPerformance(page, { reportRows: [reports[1]], evaluation: sparse });
  await expect(page.locator(".spi-kpis .spi-card").nth(1)).toContainText("—");
  await expect(page.getByText("Rubric version is unavailable", { exact: false })).toBeVisible();
  await expect(page.getByText("Not available for this report").first()).toBeVisible();
});

test("shows a read error instead of made-up numbers", async ({ page }) => {
  await mockPerformance(page, { reportsStatus: 500 });
  await page.goto("/performance");
  await expect(page.getByRole("heading", { name: "Student Assessment Intelligence" })).toBeVisible();
  await expect(page.locator(".spi-kpis")).toHaveCount(0);
  await expect(page.getByRole("alert")).toBeVisible();
});

test("fits phone width and keeps the navigation route", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await openPerformance(page);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole("link", { name: "My performance" })).toHaveAttribute("href", "/performance");
});

test("keeps scorecard sharing connected to the latest real session", async ({ page }) => {
  await mockPerformance(page);
  let saved: unknown;
  let revoked = false;
  await page.route("**/api/student/scorecard-shares", route => {
    if (route.request().method() === "POST") { saved = route.request().postDataJSON(); return route.fulfill({ json: { token: "opaque-share-token" } }); }
    return route.fulfill({ json: { items: [{ id: "share-1", session_id: reports[1].session_id, expires_at: "2099-10-13" }] } });
  });
  await page.route("**/api/student/scorecard-shares/share-1", route => { revoked = true; return route.fulfill({ json: { revoked: true } }); });
  await page.goto("/performance");
  await page.getByRole("button", { name: "Share scorecard", exact: true }).first().click();
  await page.getByRole("button", { name: "Create share link" }).click();
  await expect(page.getByLabel("Share link")).toHaveValue(/shared-scorecard\/opaque-share-token/);
  expect(saved).toEqual({ session_id: reports[1].session_id, days: 7 });
  await page.getByRole("button", { name: "Revoke", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Access revoked");
  expect(revoked).toBe(true);
});

test("public shared scorecard remains available without signing in", async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 401, json: { detail: "Sign-in required" } }));
  await page.route("**/api/scorecard-shares/token", route => route.fulfill({ json: { candidate: student.full_name, role: "Engineer", score: 78, competencies: { communication: 74 }, strengths: ["Clear explanations"], development: ["SQL optimisation"] } }));
  await page.goto("/shared-scorecard/token");
  await expect(page.getByRole("heading", { name: student.full_name })).toBeVisible();
  await expect(page.getByText("Overall score: 78/100")).toBeVisible();
});
