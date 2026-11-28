import { expect, test } from "@playwright/test";
import fs from "node:fs";

// Derived from the data, never hardcoded: a new topic must not break the suite.
const DOMAINS: { id: string; concepts: string[] }[] = JSON.parse(fs.readFileSync("content/domains.json", "utf8"));
const PATH: string[] = (JSON.parse(fs.readFileSync("content/path.json", "utf8")) as { phases: { modules: { concepts: string[] }[] }[] })
  .phases.flatMap((p) => p.modules.flatMap((m) => m.concepts));

test("today: a new reader gets one mission and one button; search opens a concept", async ({ page }) => {
  await page.goto("/es/");
  await expect(page.locator(".today-tasks .tt")).toHaveCount(3);
  // Brand new: learn first, review locked until there is something to review.
  await expect(page.locator(".tt.next")).toContainText("Aprende un concepto");
  await expect(page.locator(".tt.locked")).toContainText("Repasa");
  await expect(page.locator(".today-go")).toHaveCount(1);
  await page.locator(".search-btn").click();
  await page.keyboard.type("hnsw");
  await expect(page.locator(".palette-results li").first()).toContainText(/HNSW/);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/es\/c\/ann-indexes\/$/);
  await expect(page.locator("h1")).toContainText("HNSW");
});

test("library lists every topic and the reference tools", async ({ page }) => {
  await page.goto("/es/library/");
  await expect(page.locator(".domain-card")).toHaveCount(DOMAINS.length);
  await expect(page.locator(".lib-tool")).toHaveCount(6);
});

test("concept page has every section and a rendered diagram", async ({ page }, info) => {
  await page.goto("/en/c/reranking/");
  for (const id of ["tldr", "how", "diagram", "check", "code", "example", "tradeoffs", "pitfalls", "interview", "related"]) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  // The long sections start folded: the page shows the essentials first.
  await expect(page.locator(".pitfalls")).toBeHidden();
  // Exactly one variant of the diagram is visible: the one matching the active theme, and on a
  // phone its top-to-bottom twin (this diagram is a wide left-to-right flowchart).
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  await expect(page.locator(".dg:visible > svg")).toHaveCount(1);
  await expect(page.locator(`.dg-${theme}:visible > svg`)).toHaveCount(1);
  await expect(page.locator(`.dg-${theme}.${info.project.name === "mobile" ? "dg-n" : "dg-w"}`)).toBeVisible();
  // Style v2: nodes carry their kind (color) and an emoji sticker.
  await expect(page.locator(`.dg-${theme}:visible svg.dg-v2 .dg-k`).first()).toBeAttached();
  await expect(page.locator(`.dg-${theme}:visible svg .dg-sticker`).first()).toBeAttached();
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

test("theme toggle (in You) switches the diagram variant", async ({ page }) => {
  await page.goto("/en/me/");
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.locator('button[aria-label="Toggle theme"]').click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(after).not.toBe(before);
  await page.goto("/en/c/reranking/");
  await expect(page.locator(`.dg-${after}:visible > svg`)).toHaveCount(1);
  await expect(page.locator(".dg:visible > svg")).toHaveCount(1);
});

test("diagram walkthrough lights one step at a time, in flow order", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); // manual stepping only: deterministic
  await page.goto("/en/c/reranking/");
  await page.getByRole("button", { name: "Walk through" }).click();
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  const lit = page.locator(`.dg-${theme}:visible > svg .node.wk-on`);
  await expect(lit).toHaveCount(1);
  await expect(page.locator(".wk-cap")).toContainText("User query");
  await expect(page.getByRole("button", { name: "Play" })).toHaveCount(0);
  for (let k = 0; k < 2; k++) await page.getByRole("button", { name: "Next step" }).click();
  // Both inputs come before the step that needs them; the edges that led there light up too.
  await expect(page.locator(".wk-cap")).toContainText("Hybrid retrieval");
  await expect(page.locator(`.dg-${theme}:visible > svg path.wk-on`)).toHaveCount(2);
  await page.getByRole("button", { name: "Exit walkthrough" }).click();
  await expect(page.locator(`.dg-${theme}:visible > svg .wk-on`)).toHaveCount(0);
});

test("language switch keeps the page", async ({ page }) => {
  await page.goto("/es/c/reranking/");
  await page.locator("a.lang").click();
  await expect(page).toHaveURL(/\/en\/c\/reranking\/$/);
});

test("done reading persists across reloads", async ({ page }) => {
  await page.goto("/en/c/reranking/");
  await page.locator(".concept-end .ce-mark").click();
  await expect(page.locator(".concept-end .ce-done")).toBeVisible();
  await page.reload();
  await expect(page.locator(".concept-end .ce-done")).toBeVisible();
  await expect(page.locator(".concept-end .ce-mark")).toHaveCount(0);
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
  // The XP shows up in Today's level line and in You.
  await page.goto("/en/me/");
  await expect(page.locator(".me-level")).toContainText("XP");
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

test("study path lists every concept once; a started module offers practice", async ({ page }) => {
  await page.goto("/es/path/");
  const total = DOMAINS.reduce((n, d) => n + d.concepts.length, 0);
  await expect(page.locator(".module-list li")).toHaveCount(total);
  // Untouched modules stay quiet: no zero bars, no practice button.
  await expect(page.locator(".mr-bar")).toHaveCount(0);
  await expect(page.locator(".module-practice")).toHaveCount(0);
  const first = PATH[0];
  await page.evaluate((id) => localStorage.setItem("fg.study.v1", JSON.stringify({ v: 1, cards: {}, days: {}, read: { [id]: Date.now() }, goal: 60, updatedAt: 0 })), first);
  await page.reload();
  await expect(page.locator(".module-row[open] .ml-n.ok")).toHaveCount(1);
  await expect(page.locator(".module-practice").first()).toHaveAttribute("href", /mode=module/);
});

test("architecture map links every box to a concept", async ({ page }) => {
  await page.goto("/en/map/");
  const chips = page.locator(".arch-chip");
  expect(await chips.count()).toBeGreaterThan(40);
  await chips.first().click();
  await expect(page).toHaveURL(/\/en\/c\/[a-z0-9-]+\/$/);
});

test("arrow keys move along the study path", async ({ page }) => {
  const domainOf = (id: string) => DOMAINS.find((d) => d.concepts.includes(id))!.id;
  const title = (id: string) => JSON.parse(fs.readFileSync(`content/concepts/${domainOf(id)}/${id}.json`, "utf8")).title.en;
  await page.goto(`/en/c/${PATH[1]}/`, { waitUntil: "networkidle" });
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(new RegExp(`/en/c/${PATH[2]}/$`));
  // Wait for the new page to render (its listener mounts with it) before the next key.
  await expect(page.locator("h1")).toHaveText(title(PATH[2]));
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("ArrowLeft");
  await expect(page).toHaveURL(new RegExp(`/en/c/${PATH[1]}/$`));
  await expect(page.locator("h1")).toHaveText(title(PATH[1]));
});

test("day one: Today → learn a concept → back to Today at 1/3, review unlocked, XP and a streak", async ({ page }) => {
  await page.goto("/en/");
  await expect(page.locator(".today-count")).toHaveText("0/3");
  await page.locator(".today-go").click();
  await expect(page).toHaveURL(new RegExp(`/en/c/${PATH[0]}/$`));
  // "Check yourself" comes before everything folded.
  const order = await page.evaluate(() => [...document.querySelectorAll("#how, #check, #deeper")].map((e) => e.id));
  expect(order).toEqual(["how", "check", "deeper"]);
  // Reading to the end: one primary button marks it learned and shows the reward right there.
  await page.locator(".concept-end .ce-mark").click();
  await expect(page.locator(".concept-end .ce-done")).toContainText("XP");
  await expect(page.locator(".concept-end .ce-next")).toHaveAttribute("href", `/en/c/${PATH[1]}/`);
  await page.locator(".concept-end a.ce-go").click();
  await expect(page).toHaveURL(/\/en\/$/);
  await expect(page.locator(".today-count")).toHaveText("1/3");
  const first = DOMAINS.find((d) => d.concepts.includes(PATH[0]))!.id;
  await expect(page.locator(".tt.done")).toContainText(JSON.parse(fs.readFileSync(`content/concepts/${first}/${PATH[0]}.json`, "utf8")).title.en);
  await expect(page.locator(".tt.next")).toContainText("Review");
  await expect(page.locator(".tt.locked")).toHaveCount(0);
  await expect(page.locator(".today-meta")).toContainText("1-day streak");
});

test("finishing today's review session ticks the review task, and it stays ticked", async ({ page }) => {
  await page.addInitScript((id) => { if (!localStorage.getItem("fg.study.v1")) localStorage.setItem("fg.study.v1", JSON.stringify({ v: 1, cards: {}, days: {}, read: { [id]: Date.now() }, goal: 60, updatedAt: 0 })); }, PATH[0]);
  await page.goto("/en/practice/play/?mode=daily");
  await page.locator(".p-opt").first().click();
  await page.keyboard.press("Enter"); // check
  await expect(page.locator(".p-feedback")).toBeVisible();
  await page.keyboard.press("Enter"); // next
  while (await page.locator(".p-skip").count()) await page.locator(".p-skip").first().click();
  await expect(page.getByRole("heading", { name: "Session complete" })).toBeVisible();
  await expect(page.locator(".p-summary .btn-primary")).toHaveAttribute("href", "/en/");
  await page.goto("/en/");
  // Learn + review done; the card just answered comes due again within minutes, the tick stays.
  await expect(page.locator(".today-count")).toHaveText("2/3");
  await expect(page.locator(".tt.next")).toContainText("Gym");
});

test("a concept read on an earlier day ends with the next one on the path", async ({ page }) => {
  await page.addInitScript((id) => localStorage.setItem("fg.study.v1", JSON.stringify({ v: 1, cards: {}, days: {}, read: { [id]: Date.now() - 3 * 86_400_000 }, goal: 60, updatedAt: 0 })), PATH[0]);
  await page.goto(`/en/c/${PATH[0]}/`);
  await expect(page.locator(".concept-end .ce-mark")).toHaveCount(0);
  await expect(page.locator(".concept-end .ce-go")).toHaveAttribute("href", `/en/c/${PATH[1]}/`);
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
  await page.locator(".deeper a.fold-link").first().click();
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
  await expect(page.locator(".cr-perf.ok")).toContainText("Large input");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("fg.code.v1") ?? "{}").solved?.["longest-run-without-repeats"])).toBeTruthy();
});

test("python coding: brute force passes the tests but misses the large input's time limit", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/en/practice/code/pair-indices-for-target/");
  await expect(page.locator(".problem-perf")).toContainText("brute force won't pass");
  await page.locator(".code-runner textarea").fill("def pair_indices(nums, target):\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return []\n");
  await page.getByRole("button", { name: "Run tests" }).click();
  await expect(page.locator(".cr-perf.bad")).toContainText("too slow at scale", { timeout: 60_000 });
  await expect(page.locator(".cr-summary")).toHaveText("All tests pass, but too slow on the large input");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("fg.code.v1") ?? "{}").solved?.["pair-indices-for-target"])).toBeFalsy();
});

test("re-solve from memory: a problem solved days ago comes back, blank, and climbs the ladder", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/en/practice/code/");
  const old = Date.now() - 4 * 86_400_000;
  await page.evaluate((old) => localStorage.setItem("fg.code.v1", JSON.stringify({
    solved: { "longest-run-without-repeats": old, "pair-indices-for-target": old },
    drafts: { "longest-run-without-repeats": "def longest_unique(s):\n    return 'my old solution'\n" }, reviews: {},
  })), old);
  await page.reload();
  await expect(page.locator(".resolve-promo")).toContainText("2 problems to re-solve from memory");
  await page.locator(".resolve-promo").click();
  await expect(page.getByText("1 of 2 due")).toBeVisible();
  // Recall, not copy: the old draft is not pre-filled.
  await expect(page.locator(".code-runner textarea")).not.toHaveValue(/my old solution/);
  const first = (await page.locator(".cm-title").textContent()) ?? "";
  if (/repeat/i.test(first)) {
    await page.locator(".code-runner textarea").fill("def longest_unique(s):\n    last, left, best = {}, 0, 0\n    for r, ch in enumerate(s):\n        if ch in last and last[ch] >= left:\n            left = last[ch] + 1\n        last[ch] = r\n        best = max(best, r - left + 1)\n    return best\n");
  } else {
    await page.locator(".code-runner textarea").fill("def pair_indices(nums, target):\n    seen = {}\n    for j, x in enumerate(nums):\n        if target - x in seen:\n            return [seen[target - x], j]\n        seen[x] = j\n    return []\n");
  }
  await page.getByRole("button", { name: "Run tests" }).click();
  await expect(page.locator(".cr-review.ok")).toContainText("back in 7 days", { timeout: 60_000 });
  await page.getByRole("button", { name: /Next problem/ }).click();
  await page.getByRole("button", { name: "I don't remember it" }).click();
  await expect(page.locator(".cr-review.bad")).toContainText("comes back tomorrow");
  const reviews = await page.evaluate(() => JSON.parse(localStorage.getItem("fg.code.v1") ?? "{}").reviews);
  expect(Object.values(reviews as Record<string, { n: number }>).map((r) => r.n).sort()).toEqual([0, 1]);
});

test("pro page: what stays free, what Pro would add, and a waitlist that is honest when it isn't open", async ({ page }) => {
  await page.goto("/es/pro/");
  await expect(page.getByRole("heading", { name: "levelup Pro" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gratis, siempre" })).toBeVisible();
  await expect(page.locator(".pro-plus li")).toHaveCount(4);
  // Built without NEXT_PUBLIC_PRO_FORM_URL: no dead link, just "opens soon".
  await expect(page.locator(".pro-cta [aria-disabled='true']")).toHaveText("La lista de espera abre pronto");
  await expect(page.locator(".pro-cta a")).toHaveCount(0);
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

test("peer mock: the interviewer sheet runs the round and writes feedback for the candidate", async ({ page }) => {
  await page.goto("/en/practice/design/case-url-shortener/");
  await expect(page.locator(".dr-peer code")).toHaveText(/\/en\/practice\/design\/case-url-shortener\/interviewer\/$/);
  await page.goto("/en/practice/design/case-url-shortener/interviewer/");
  await expect(page.locator(".dr-peer code")).toHaveText(/\/en\/practice\/design\/case-url-shortener\/$/);
  await page.getByRole("button", { name: "Start the round" }).click();
  await page.locator(".dr-notes textarea").fill("Asked about custom aliases\nand expiry");
  for (let i = 0; i < 5; i++) {
    // The interviewer sees the reference without unfolding anything.
    await expect(page.locator(".dr-ref > div")).toBeVisible();
    await page.getByRole("button", { name: /Next phase/ }).click();
  }
  await page.getByRole("button", { name: "Finish and assess" }).click();
  await expect(page.getByRole("heading", { name: "Score the candidate" })).toBeVisible();
  const dims = await page.locator(".dr-rubric fieldset").all();
  for (const [k, fs] of dims.entries()) await fs.locator("button").nth(k === 1 ? 1 : 3).click();
  await page.getByRole("button", { name: "Write the feedback" }).click();
  const fb = page.locator(".dr-feedback");
  await expect(fb).toContainText("System design mock:");
  await expect(fb).toContainText("To work on: Estimation");
  await expect(fb).toContainText("/en/c/back-of-envelope/");
  await expect(fb).toContainText("Asked about custom aliases / and expiry");
  // The candidate's scores are theirs: nothing lands in the interviewer's own attempt history.
  expect(await page.evaluate(() => localStorage.getItem("fg.design.v1"))).toBeNull();
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

test("four places: Today, Path, Practice, You — tabs on phones, links on desktop", async ({ page, isMobile }) => {
  await page.goto("/en/");
  const nav = isMobile ? page.locator(".tabbar a.tab") : page.locator(".main-nav a");
  await expect(isMobile ? page.locator(".main-nav") : page.locator(".tabbar")).toBeHidden();
  await expect(nav).toHaveText(["Today", "Path", "Practice", "You"]);
  await nav.filter({ hasText: "Practice" }).click();
  await expect(page).toHaveURL(/\/en\/practice\/$/);
  // Practice owns the Gym and the mocks, so its tab stays lit there.
  await page.goto("/en/gym/");
  await expect(nav.filter({ hasText: "Practice" })).toHaveAttribute("aria-current", "page");
  await page.goto("/en/library/");
  await expect(nav.filter({ hasText: "You" })).toHaveAttribute("aria-current", "page");
});

test("no screen scrolls sideways (phones first)", async ({ page }) => {
  for (const url of ["/es/", "/es/path/", "/es/practice/", "/es/me/", "/es/interview/", "/es/library/", `/es/c/${PATH[0]}/`]) {
    await page.goto(url, { waitUntil: "networkidle" });
    // A phone widens its layout viewport to fit wide content, so measure against the screen too.
    const over = await page.evaluate(() => document.documentElement.scrollWidth - Math.min(window.innerWidth, screen.width));
    expect(over, url).toBeLessThanOrEqual(0);
  }
});

test("practice is four cards; mocks are three", async ({ page }) => {
  await page.goto("/en/practice/");
  await expect(page.locator(".hub .pc")).toHaveCount(4);
  await expect(page.locator(".hub .btn-primary")).toHaveCount(1);
  await page.goto("/en/interview/");
  await expect(page.locator(".hub .pc")).toHaveCount(3);
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
  // The reminder is a calendar file: a daily block until the day before, plus the interview day.
  await page.getByLabel("Daily reminder").fill("07:15");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Add to calendar" }).click()]);
  expect(dl.suggestedFilename()).toBe("levelup-plan.ics");
  const ics = (await (await import("node:fs/promises")).readFile(await dl.path())).toString().replace(/\r\n /g, "");
  const eve = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  const ymd = (x: Date) => `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, "0")}${String(x.getDate()).padStart(2, "0")}`;
  expect(ics).toMatch(/DTSTART:\d{8}T071500/);
  expect(ics).toContain("DURATION:PT120M");
  expect(ics).toContain(`RRULE:FREQ=DAILY;UNTIL=${ymd(eve)}T235959`);
  expect(ics).toContain(`DTSTART;VALUE=DATE:${ymd(d)}`);
  await page.reload();
  await expect(page.locator(".plan-date input")).toHaveValue(iso);
  await expect(page.getByLabel("Daily reminder")).toHaveValue("07:15");
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
  await page.goto("/en/me/");
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

test("gym: today's workout, by hand, end to end", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  // Opened from a friend's challenge link: the dare shows before starting.
  const d = new Date(), ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  await page.goto(`/en/gym/?vs=${ymd}.101.60`);
  await expect(page.getByText(/A friend scored/)).toHaveCount(0); // a forged score (101%) is ignored
  await page.goto(`/en/gym/?vs=${ymd}.40.600`);
  await expect(page.getByText("A friend scored 40% in 10:00 on today's workout. Beat it.")).toBeVisible();
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
  await expect(page.getByText(/You \d+% · \d+:\d\d — Friend 40% · 10:00/)).toBeVisible();
  // Sharing gives squares and a challenge link, never the answers.
  await page.evaluate(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); });
  await page.getByRole("button", { name: "Share" }).click();
  await expect(page.getByRole("button", { name: /Copied/ })).toBeVisible();
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  expect(shared).toMatch(/^levelup Gym #\d+ · \d+% · \d+:\d\d\n[🟩🟨🟥]{8}\n/u);
  expect(shared).toMatch(new RegExp(`/en/gym/\\?vs=${ymd}\\.\\d+\\.\\d+$`));
  // The same result as a picture: a 1200×630 PNG (downloaded where the share sheet can't take files).
  const [png] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Image" }).click()]);
  expect(png.suggestedFilename()).toMatch(/^levelup-gym-\d+\.png$/);
  const bytes = await (await import("node:fs/promises")).readFile(await png.path());
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1200, 630]);
  // Today's workout is a mission task: its primary goes back to Today.
  await expect(page.getByRole("link", { name: /Continue your day/ })).toHaveAttribute("href", "/en/");
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
