import { expect, test } from "@playwright/test";
import fs from "node:fs";

// Derived from the data, never hardcoded: a new topic must not break the suite.
const DOMAINS: { id: string; concepts: string[] }[] = JSON.parse(fs.readFileSync("content/domains.json", "utf8"));

test("home lists every topic and search opens a concept", async ({ page }) => {
  await page.goto("/es/");
  await expect(page.locator(".domain-card")).toHaveCount(DOMAINS.length);
  await page.locator(".search-hero").click();
  await page.keyboard.type("hnsw");
  await expect(page.locator(".palette-results li").first()).toContainText(/HNSW/);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/es\/c\/ann-indexes\/$/);
  await expect(page.locator("h1")).toContainText("HNSW");
});

test("concept page has every section and a rendered diagram", async ({ page }) => {
  await page.goto("/en/c/reranking/");
  for (const id of ["tldr", "how", "diagram", "check", "code", "example", "tradeoffs", "pitfalls", "interview", "related"]) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  // The long sections start folded: the page shows the essentials first.
  await expect(page.locator(".pitfalls")).toBeHidden();
  // Exactly one variant of the diagram is visible: the one matching the active theme.
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  await expect(page.locator(`.dg-${theme} > svg`)).toBeVisible();
  await expect(page.locator(`.dg-${theme === "dark" ? "light" : "dark"} > svg`)).toBeHidden();
  // Style v2: nodes carry their kind (color) and an emoji sticker.
  await expect(page.locator(`.dg-${theme} svg.dg-v2 .dg-k`).first()).toBeAttached();
  await expect(page.locator(`.dg-${theme} svg .dg-sticker`).first()).toBeAttached();
  await page.locator("#interview > summary").click();
  await page.locator(".qa summary").first().click();
  await expect(page.locator(".qa-a").first()).toBeVisible();
});

test("check yourself grades on the concept page and marks it read", async ({ page }) => {
  await page.goto("/en/c/reranking/");
  const check = page.locator("#check .qc");
  await expect(check.locator(".p-prompt")).toBeVisible();
  await check.locator(".p-opt").first().click();
  await check.getByRole("button", { name: "Check" }).click();
  await expect(check.locator(".p-feedback")).toBeVisible();
  const read = await page.evaluate(() => JSON.parse(localStorage.getItem("fg.study.v1") ?? "{}").read ?? {});
  expect(read.reranking).toBeTruthy();
});

test("a link to a folded section opens it", async ({ page }) => {
  await page.goto("/en/c/reranking/#pitfalls");
  await expect(page.locator(".pitfalls")).toBeVisible();
});

test("theme toggle switches the diagram variant", async ({ page }) => {
  await page.goto("/en/c/reranking/");
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.locator('button[aria-label="Toggle theme"]').click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(after).not.toBe(before);
  await expect(page.locator(after === "light" ? ".dg-light > svg" : ".dg-dark > svg")).toBeVisible();
});

test("diagram walkthrough lights one step at a time, in flow order", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); // manual stepping only: deterministic
  await page.goto("/en/c/reranking/");
  await page.getByRole("button", { name: "Walk through" }).click();
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  const lit = page.locator(`.dg-${theme} > svg .node.wk-on`);
  await expect(lit).toHaveCount(1);
  await expect(page.locator(".wk-cap")).toContainText("User query");
  await expect(page.getByRole("button", { name: "Play" })).toHaveCount(0);
  for (let k = 0; k < 2; k++) await page.getByRole("button", { name: "Next step" }).click();
  // Both inputs come before the step that needs them; the edges that led there light up too.
  await expect(page.locator(".wk-cap")).toContainText("Hybrid retrieval");
  await expect(page.locator(`.dg-${theme} > svg path.wk-on`)).toHaveCount(2);
  await page.getByRole("button", { name: "Exit walkthrough" }).click();
  await expect(page.locator(`.dg-${theme} > svg .wk-on`)).toHaveCount(0);
});

test("language switch keeps the page", async ({ page }) => {
  await page.goto("/es/c/reranking/");
  await page.locator("a.lang").click();
  await expect(page).toHaveURL(/\/en\/c\/reranking\/$/);
});

test("mark as read persists across reloads", async ({ page }) => {
  await page.goto("/en/c/reranking/");
  const btn = page.locator(".rail-right .mastered-btn");
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator(".rail-right .mastered-btn")).toHaveAttribute("aria-pressed", "true");
});

test("cheatsheet filter narrows rows", async ({ page }) => {
  await page.goto("/en/cheatsheet/");
  const all = await page.locator(".sheet-row:visible").count();
  await page.locator(".filter-input input").fill("rerank");
  await expect.poll(() => page.locator(".sheet-row:visible").count()).toBeLessThan(all);
  await expect(page.locator(".sheet-row:visible").first()).toContainText(/rerank/i);
});

test("practice: answer, get feedback, earn XP and schedule the card", async ({ page }) => {
  await page.goto("/en/practice/play/?mode=concept&id=reranking");
  await expect(page.locator(".p-prompt")).toBeVisible();
  await page.locator(".p-opt").first().click();
  await page.keyboard.press("Enter"); // check as "think so"
  await expect(page.locator(".p-feedback")).toBeVisible();
  await expect(page.locator(".p-xp")).toContainText("XP");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("fg.study.v1") || "{}"));
  expect(Object.keys(saved.cards ?? {})).toContain("reranking.def");
  await page.goto("/en/practice/");
  await expect(page.locator(".hub-stat.goal")).toContainText("XP");
});

test("practice: rebuild-the-diagram places components over the real diagram", async ({ page }) => {
  await page.goto("/en/practice/play/?mode=concept&id=reranking");
  // .p-dg-wrap renders at once; its slots appear only after the SVG loads, so wait on the wrapper.
  await expect(page.locator(".p-type")).toBeVisible();
  for (let i = 0; i < 10 && !(await page.locator(".p-dg-wrap").count()); i++) {
    const before = await page.locator(".p-count").textContent();
    await page.locator(".p-actions .link-btn").click(); // skip to the diagram item
    await expect(page.locator(".p-count")).not.toHaveText(before ?? "");
  }
  const slots = page.locator(".p-dg-slot");
  await expect(slots.first()).toBeVisible();
  const n = await slots.count();
  for (let s = 0; s < n; s++) { await page.locator(".p-bank .p-chip:not(.used)").first().click(); await slots.nth(s).click(); }
  await page.keyboard.press("Enter");
  await expect(page.locator(".p-feedback")).toBeVisible();
});

test("study path lists every concept once and links to practice", async ({ page }) => {
  await page.goto("/es/path/");
  const total = DOMAINS.reduce((n, d) => n + d.concepts.length, 0);
  await expect(page.locator(".module-list li")).toHaveCount(total);
  await expect(page.locator(".module-practice").first()).toHaveAttribute("href", /mode=module/);
});

test("architecture map links every box to a concept", async ({ page }) => {
  await page.goto("/en/map/");
  const chips = page.locator(".arch-chip");
  expect(await chips.count()).toBeGreaterThan(40);
  await chips.first().click();
  await expect(page).toHaveURL(/\/en\/c\/[a-z0-9-]+\/$/);
});

test("arrow keys move between concepts in a topic", async ({ page }) => {
  const rag = DOMAINS.find((d) => d.id === "rag")!.concepts;
  const title = (id: string) => JSON.parse(fs.readFileSync(`content/concepts/rag/${id}.json`, "utf8")).title.en;
  await page.goto(`/en/c/${rag[1]}/`, { waitUntil: "networkidle" });
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(new RegExp(`/en/c/${rag[2]}/$`));
  // Wait for the new page to render (its listener mounts with it) before the next key.
  await expect(page.locator("h1")).toHaveText(title(rag[2]));
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(new RegExp(`/en/c/${rag[1]}/$`));
  await expect(page.locator("h1")).toHaveText(title(rag[1]));
});

const LABS: { id: string }[] = JSON.parse(fs.readFileSync("content/labs.json", "utf8"));

test("labs index lists every lab and a lab reacts to its controls", async ({ page }) => {
  await page.goto("/en/labs/");
  await expect(page.locator(".lab-card")).toHaveCount(LABS.length);
  await page.goto("/en/labs/capacity/");
  const writeQps = page.locator(".lab-stat").first().locator(".st-value");
  const before = await writeQps.textContent();
  await page.getByRole("button", { name: "Chat" }).click();
  await expect(writeQps).not.toHaveText(before ?? "");
});

test("a concept links to its lab", async ({ page }) => {
  await page.goto("/en/c/back-of-envelope/");
  await page.locator(".lab-promo-card").first().click();
  await expect(page).toHaveURL(/\/en\/labs\/[a-z-]+\/$/);
});

test("a 'which concept is this?' item never shows the concept's name", async ({ page }) => {
  await page.goto("/en/practice/play/?mode=concept&id=reranking");
  for (let i = 0; i < 10; i++) {
    await expect(page.locator(".p-prompt")).toBeVisible();
    if ((await page.locator(".p-prompt").innerText()).startsWith("Which concept is this?")) {
      await expect(page.locator(".p-meta .chip")).toHaveCount(0);
      return;
    }
    const before = await page.locator(".p-count").textContent();
    await page.locator(".p-actions .link-btn").click();
    await expect(page.locator(".p-count")).not.toHaveText(before ?? "");
  }
  throw new Error("no 'which concept' item in the session");
});

test("knowledge map has one linked dot per concept", async ({ page }) => {
  await page.goto("/en/graph/");
  const total = DOMAINS.reduce((n, d) => n + d.concepts.length, 0);
  await expect(page.locator("a.gn")).toHaveCount(total);
  await expect(page.locator("a.gn").first()).toHaveAttribute("href", /\/en\/c\/[a-z0-9-]+\/$/);
});

test("python coding: a correct solution passes every test in the browser", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/en/practice/code/longest-run-without-repeats/");
  await page.locator(".code-runner textarea").fill("def longest_unique(s):\n    last, left, best = {}, 0, 0\n    for r, ch in enumerate(s):\n        if ch in last and last[ch] >= left:\n            left = last[ch] + 1\n        last[ch] = r\n        best = max(best, r - left + 1)\n    return best\n");
  await page.getByRole("button", { name: "Run tests" }).click();
  await expect(page.locator(".cr-summary")).toHaveText(/All tests pass/, { timeout: 60_000 });
});

test("system design round: phases, rubric and a saved attempt", async ({ page }) => {
  await page.goto("/en/practice/design/case-url-shortener/");
  await page.getByRole("button", { name: "Start the round" }).click();
  for (let i = 0; i < 5; i++) await page.getByRole("button", { name: /Next phase/ }).click();
  await page.getByRole("button", { name: "Finish and assess" }).click();
  for (const fs of await page.locator(".dr-rubric fieldset").all()) await fs.locator("button").nth(2).click();
  await page.getByRole("button", { name: "Save attempt" }).click();
  await expect(page.locator(".dr-history tbody tr")).toHaveCount(1);
});

test("story bank: a tagged story fills its competency in coverage", async ({ page }) => {
  await page.goto("/en/interview/stories/");
  await page.getByRole("button", { name: "+ New story" }).click();
  await page.getByLabel(/Action/).fill("I split the migration into reversible steps and ran it with two teams.");
  await page.getByRole("button", { name: "Influence without authority" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("tab", { name: "Coverage" }).click();
  await expect(page.locator(".sb-cov li.ok")).toHaveCount(1);
});

test("phones get a bottom tab bar with names, and the rest under More", async ({ page, isMobile }) => {
  await page.goto("/en/");
  if (!isMobile) {
    await expect(page.locator(".tabbar")).toBeHidden();
    await expect(page.locator(".main-nav a").first()).toBeVisible();
    return;
  }
  await expect(page.locator(".main-nav")).toBeHidden();
  const tabs = page.locator(".tabbar .tab");
  // Path, Practice, Gym, Labs, Interview + More.
  await expect(tabs).toHaveCount(6);
  for (const tab of await tabs.all()) await expect(tab.locator("span")).not.toBeEmpty();
  await page.locator(".tabbar a.tab", { hasText: "Practice" }).click();
  await expect(page).toHaveURL(/\/en\/practice\/$/);
  await expect(page.locator('.tabbar a.tab[aria-current="page"]')).toHaveText("Practice");
  await page.locator(".tabbar button.tab").click();
  await page.locator(".tab-sheet a", { hasText: "Interview plan" }).click();
  await expect(page).toHaveURL(/\/en\/plan\/$/);
  await expect(page.locator(".tab-sheet")).toHaveCount(0);
});

test("interview plan: a date gives a pace, today's concepts and the weeks ahead", async ({ page }) => {
  await page.goto("/en/plan/");
  await expect(page.locator(".plan-msg")).toBeVisible();
  const d = new Date(Date.now() + 30 * 86_400_000);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  await page.locator(".plan-date input").fill(iso);
  await expect(page.locator(".plan-verdict strong")).toHaveText("30 days left");
  await expect(page.locator(".plan-list li").first()).toBeVisible();
  // 30 days → 6 for rehearsal; weeks of 7 days from today.
  await expect(page.locator(".plan-weeks ol > li")).toHaveCount(5);
  await expect(page.locator(".plan-weeks li.rehearsal")).toHaveCount(1);
  // More time per day never covers less.
  const reach = async () => page.locator(".plan-list li").count();
  const before = await reach();
  await page.getByRole("group", { name: "Minutes per day" }).getByRole("button", { name: "120" }).click();
  expect(await reach()).toBeGreaterThanOrEqual(before);
  await page.reload();
  await expect(page.locator(".plan-date input")).toHaveValue(iso);
});

test("mock coding interview: two problems, a clock, and results that survive a reload", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/en/practice/code/mock/");
  await page.getByRole("button", { name: "Start the mock" }).click();
  await expect(page.getByRole("tab")).toHaveCount(2);
  await expect(page.locator(".dr-clock")).toHaveText(/^4[45]:\d\d$/);
  // The mock gives no hints: the starter has no approach comment.
  await expect(page.locator(".problem-grid:not([hidden]) textarea")).not.toHaveValue(/^\s*#(?! ---)/m);
  await page.locator(".problem-grid:not([hidden])").getByRole("button", { name: "Run tests" }).click();
  await expect(page.locator(".problem-grid:not([hidden]) .cr-summary")).toBeVisible({ timeout: 90_000 });
  await page.reload();
  await expect(page.getByRole("tab")).toHaveCount(2);
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.locator(".cm-results li")).toHaveCount(3);
  await expect(page.locator(".cm-results li").first()).toContainText(/\d+\/\d+ tests|solved/);
});

test("a shared link carries a preview: Open Graph and Twitter tags", async ({ page }) => {
  await page.goto("/es/c/reranking/");
  const meta = (p: string) => page.locator(`meta[property="${p}"], meta[name="${p}"]`).first();
  await expect(meta("og:title")).toHaveAttribute("content", /Reranking/i);
  await expect(meta("og:description")).toHaveAttribute("content", /.{40,}/);
  await expect(meta("og:image")).toHaveAttribute("content", /\/og\.png$/);
  await expect(meta("og:url")).toHaveAttribute("content", /\/es\/c\/reranking\/$/);
  await expect(meta("twitter:card")).toHaveAttribute("content", "summary_large_image");
  const img = await page.request.get("/og.png");
  expect(img.status()).toBe(200);
});

test("offline: visited pages keep working, and Save for offline brings the rest", async ({ page, context }) => {
  test.setTimeout(180_000);
  // The worker is off on localhost unless asked for (it would cache a dev server).
  await page.addInitScript(() => { try { localStorage.setItem("fg.sw", "on"); } catch { /* ignore */ } });
  await page.goto("/en/c/reranking/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("h1")).toContainText("Reranking");
  await expect(page.locator(".dg svg").first()).toBeAttached();
  // Not visited and not saved: an honest offline page instead of a browser error.
  await page.goto("/en/c/consistent-hashing/");
  await expect(page.locator("h1")).toContainText("Offline");
  await context.setOffline(false);
  await page.goto("/en/");
  await page.getByRole("button", { name: "Save for offline" }).click();
  await expect(page.locator(".offline")).toContainText("Available offline", { timeout: 150_000 });
  await context.setOffline(true);
  await page.goto("/en/c/consistent-hashing/");
  await expect(page.locator("h1")).toContainText("Consistent hashing");
  await page.goto("/en/path/");
  await expect(page.locator(".next-step")).toBeVisible();
  await context.setOffline(false);
});

test("loops lab: each step adds one square, and the finished shape has exactly the counted steps", async ({ page }) => {
  await page.goto("/en/labs/loops/");
  await page.getByRole("button", { name: "Nested loops" }).click();
  const squares = page.locator(".mo-grid span.on");
  await expect(squares).toHaveCount(0);
  for (let k = 0; k < 5; k++) await page.getByRole("button", { name: "Step", exact: true }).click();
  // Snapshot 0 is the setup line; each step after it is one counted operation.
  await expect(squares).toHaveCount(5);
  await expect(page.locator(".mo-ptr")).toHaveCount(2);
  // Scrub to the end: n(n−1)/2 squares for the default n = 8.
  const scrub = page.getByRole("slider", { name: "Step" });
  await scrub.fill(await scrub.getAttribute("max") ?? "0");
  await expect(squares).toHaveCount(28);
  await expect(page.locator(".lab-stat").nth(1).locator(".st-value")).toHaveText("28");
});

test("reduced motion: labs open on the finished picture and a race ends at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/labs/loops/");
  // Opens finished (n = 8 nested loops: 28 squares); switching to a shorter run must not crash.
  await expect(page.locator(".mo-grid span.on")).toHaveCount(28);
  await page.getByRole("button", { name: "Merge levels" }).click();
  // n = 8 → 3 levels × 8 writes, shown immediately, no autoplay.
  await expect(page.locator(".mo-grid span.on")).toHaveCount(24);
  await page.goto("/en/labs/big-o/");
  await page.getByRole("button", { name: /Race them/ }).click();
  await expect(page.locator(".race-clock strong")).toHaveText("30 years");
  await expect(page.locator(".race-lane.done")).not.toHaveCount(0);
});

test("gym: today's workout, by hand, end to end", async ({ page }) => {
  await page.goto("/en/gym/");
  await page.getByRole("button", { name: /^Start/ }).click();
  for (let k = 0; k < 8; k++) {
    const head = (await page.locator('[class*="repHead"]').textContent()) ?? "";
    if (/Estimate|Trace/.test(head)) {
      const input = page.locator("form input");
      // Manual mode: pasting does nothing.
      await input.focus();
      await page.evaluate(() => {
        const el = document.activeElement as HTMLInputElement;
        const dt = new DataTransfer(); dt.setData("text/plain", "999");
        el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
      });
      await expect(input).toHaveValue("");
      await input.fill(/Estimate/.test(head) ? "5k" : "0");
      await page.locator("form button[type=submit]").click();
    } else if (/bug/.test(head)) {
      await page.locator("pre button").first().click();
      if (await page.locator("pre button").count()) await page.locator("pre button").nth(1).click();
    } else if (/Big-O/.test(head)) {
      await page.getByRole("group").locator("button").first().click();
    } else {
      await page.locator("textarea").fill("It measures how the work of an algorithm grows with the input size, dropping constants and lower terms.");
      await page.getByRole("button", { name: /Compare/ }).click();
      await page.locator("input[type=checkbox]").first().check();
    }
    await page.getByRole("button", { name: /Next|Done/ }).click();
  }
  await expect(page.getByText("Workout done")).toBeVisible();
  await expect(page.locator('[class*="recap"] li')).toHaveCount(8);
  await page.getByRole("button", { name: /Back to the gym/ }).click();
  await expect(page.getByText(/Done today/)).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("fg.gym.v1") ?? "{}"));
  expect(Object.values(state.days as Record<string, { done: boolean; reps: number }>)[0]).toMatchObject({ done: true, reps: 8 });
});

test("gym: a reload mid-workout resumes at the same rep", async ({ page }) => {
  await page.goto("/en/gym/");
  await page.getByRole("button", { name: /^Start/ }).click();
  const first = await page.locator('[class*="repHead"]').textContent();
  expect(first).toMatch(/Estimate/);
  await page.locator("form input").fill("1M");
  await page.locator("form button[type=submit]").click();
  await page.getByRole("button", { name: /Next/ }).click();
  await page.reload();
  await page.getByRole("button", { name: /Resume \(1\/8\)/ }).click();
  await expect(page.locator('[class*="repHead"]')).toContainText("Trace code");
});
