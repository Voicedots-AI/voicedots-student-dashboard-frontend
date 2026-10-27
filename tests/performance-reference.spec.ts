import { test, expect } from "@playwright/test";
import { latestEvaluation, mockPerformance, releasedReport, reports } from "./performance-fixtures";

test.beforeEach(async ({ page }) => { await mockPerformance(page); });

test("reference layout uses released scores, real evidence and existing actions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("+18 points", { exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Explain your project architecture" })).toBeVisible();
  await expect(page.getByRole("meter", { name: "Communication" })).toHaveAttribute("aria-valuenow", "75");
  await expect(page.getByRole("link", { name: "Download report" })).toHaveAttribute("href", `/api/interview/${reports[1].session_id}/evaluation/report.pdf`);
  await page.getByRole("button", { name: "Share scorecard" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Link expiry")).toHaveValue("7");
});

test("only same-role same-rubric released reports form the comparison line", async ({ page }) => {
  const otherRole = releasedReport("other-role", 99, 10, { target_role: "Designer" });
  const otherRubric = releasedReport("other-rubric", 95, 8, { report: { ...latestEvaluation, overall_score: 95, rubric_version: "rubric-v2" } });
  await mockPerformance(page, { reportRows: [reports[0], otherRole, otherRubric, reports[1]] });
  await page.goto("/");
  await expect(page.getByText("+18 points", { exact: true })).toBeVisible();
  await expect(page.locator(".spi-chart-point")).toHaveCount(2);
  await expect(page.locator(".spi-chart-line")).toHaveCount(1);
});

test("one comparable report renders one real dot and no invented line", async ({ page }) => {
  await mockPerformance(page, { reportRows: [reports[1]] });
  await page.goto("/");
  await expect(page.getByText("—", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".spi-chart-point")).toHaveCount(1);
  await expect(page.locator(".spi-chart-line")).toHaveCount(0);
});

test("desktop and mobile layouts stay within the viewport", async ({ page }, testInfo) => {
  for (const width of [1600, 1366, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Competency vs Role Target" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    const ring = await page.locator(".spi-ring").boundingBox();
    const center = await page.locator(".spi-ring > div").boundingBox();
    expect(Math.abs(ring!.x + ring!.width / 2 - center!.x - center!.width / 2)).toBeLessThan(1);
    if (width === 1600 || width === 390) await page.screenshot({ path: testInfo.outputPath(`performance-${width}.png`), fullPage: true });
  }
});

test("long real API content stays readable without horizontal page overflow", async ({ page }) => {
  const dimensions = Array.from({ length: 13 }, (_, index) => ({ dimension: `assessment_competency_${index + 1}`, percentage: index * 7 }));
  const evaluation = { ...latestEvaluation, core_dimensions: dimensions, domain_dimensions: [], priority_improvement_areas: [{ focus: "Structured thinking", actions: ["Use a Situation, Action and Result structure. ".repeat(8), "Outline two or three points before answering."] }] };
  await mockPerformance(page, { evaluation });
  await page.goto("/");
  await expect(page.locator(".spi-competencies tbody tr")).toHaveCount(13);
  await expect(page.locator(".spi-plan > li")).toHaveCount(2);
  for (const width of [1920, 1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  }
});

test("desktop reference data fits one viewport at the validated sizes", async ({ page }) => {
  for (const [width, height] of [[1440, 920], [1915, 987]]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.locator(".spi-kpis")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBeTruthy();
  }
});
