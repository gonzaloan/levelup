import { test } from "@playwright/test";
test("capture /me with a placement", async ({ page }) => {
  // seed a fake assessment into localStorage, then load /me
  await page.goto("/en/");
  await page.evaluate(() => {
    const axes = [1,2,3,4,5].map((axis) => ({
      axis, theta: 0.4, sem: 0.6, band: axis % 2 ? "solid" : "developing",
      composite: 0.5, provisional: axis === 3, topMisconceptions: [],
    }));
    localStorage.setItem("levelup.v1", JSON.stringify({
      assessment: { axes, weakest: [3,1], completedAt: 1 },
      responseLog: [], mastered: ["gen-l5-m1"], moduleScores: { "gen-l5-m1": 0.95 },
      fieldWork: {}, roomsCleared: ["gen-l5-room-01"], signal: 75,
      cadence: { enabled: false, weeks: [] },
    }));
  });
  await page.goto("/en/me/");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/review-13-me.png", fullPage: true });
});
