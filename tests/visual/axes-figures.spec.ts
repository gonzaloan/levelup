import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

// The `axes` diagrams that shipped with no nodes must now plot points AND list them
// in the numbered legend.
//
// Two of the original seven have since changed shape, for reasons worth keeping:
//   • `toil-reduction-program` became a `flow`. Its four nodes are a programme
//     TIMELINE, and the axes renderer places nodes on a monotonic diagonal — so it
//     drew "root cause fixed" as the HIGHEST operational load, inverting the 58% to
//     ~34% decline the concept asserts. No relabel fixes that: the ordering
//     dimension was programme maturity, which is neither axis.
//   • `capacity-estimation` dropped its disk-seek rung, which made one step 6x
//     rather than the "orders of magnitude" the caption claims, and put a local disk
//     farther along a near-to-far axis than another host.
//
// Checked in a BROWSER, not in the static HTML. Lesson concept panes hydrate
// client-side, so NO schematic appears in the exported markup for ANY lesson —
// a grep of out/*.html proves nothing about whether the figure renders, which is
// worth stating because that is exactly the check that first "confirmed" the bug.
// [lessonId, slug, expected node count]. The pane index is resolved from the
// shipped content at run time rather than hardcoded, so reordering a lesson
// cannot silently make this test check the wrong concept.
const CASES = [
  ["technical-depth-l6", "consistency-model-spectrum", 4],
  ["systems-architecture-l3", "capacity-estimation", 4],
  ["execution-delivery-l5", "dora-as-team-signal", 4],
  ["systems-architecture-l7", "managing-technical-quality-at-scale", 4],
  ["systems-architecture-l7", "driving-irreversible-bets-with-consensus", 4],
  ["direction-influence-l7", "borrowed-authority-alignment", 4],
] as const;

const LESSONS = JSON.parse(readFileSync("src/content/data/lessons.json", "utf8")).lessons as
  { lessonId: string; concepts: { slug: string }[] }[];
const paneIndex = (lessonId: string, slug: string) => {
  const l = LESSONS.find((x) => x.lessonId === lessonId);
  if (!l) throw new Error(`no lesson ${lessonId}`);
  const i = l.concepts.findIndex((c) => c.slug === slug);
  if (i < 0) throw new Error(`${slug} is not in ${lessonId}`);
  return i;
};

for (const [lessonId, slug, nodes] of CASES) {
  test(`${slug}: axes diagram plots ${nodes} nodes`, async ({ page }) => {
    const index = paneIndex(lessonId, slug);
    await page.goto(`/en/lesson/${lessonId}/`);
    await page.waitForTimeout(600);
    await page.getByRole("button", { name: /^Begin/ }).click();
    await page.waitForTimeout(300);

    // Advance one pane at a time, stopping as soon as an axes figure with the
    // right node count is on screen. Walking a fixed number of panes overshoots
    // into the recall deck, whose CTA is "Flip" — which is how the first version
    // of this test ended up asserting against a flashcard.
    // The lesson shows ONE concept pane at a time, with a numbered
    // `nav.concept-nav` sidebar for jumping straight to one. Clicking through
    // "Got it — continue" also works but walks past the target and into the
    // recall deck, whose CTA is "Flip" — which is how an earlier version of this
    // test ended up asserting against a flashcard.
    // Button 0 in concept-nav is the lesson OVERVIEW (ConceptNav.tsx uses idx -1
    // for it), so concept i is button i+1. Off-by-one here silently checks the
    // neighbouring concept, which is worse than failing.
    const navItem = page.locator("nav.concept-nav button").nth(index + 1);
    await navItem.click();
    await page.waitForTimeout(400);

    // ConceptPane gives the figure slot to widget > code > schematic, and when a
    // widget or code sample wins, the schematic is offered FOLDED behind a
    // <details class="cp-fold">. 5 of these 7 concepts carry a widget or code, so
    // the axes figure is only reachable by opening that fold — correct product
    // behaviour, and the reason a plain visibility assertion failed on all 7.
    for (const fold of await page.locator("details.cp-fold").all()) {
      if (!(await fold.evaluate((el) => (el as HTMLDetailsElement).open))) {
        await fold.locator("summary").click().catch(() => {});
        await page.waitForTimeout(160);
      }
    }
    const axesAll = page.locator("svg.schematic-axes");
    let found = false;
    for (let k = 0; k < (await axesAll.count()); k++) {
      if ((await axesAll.nth(k).locator("text.schematic-quad-n").count()) === nodes) { found = true; break; }
    }

    expect(found, `no .schematic-axes with ${nodes} plotted nodes was reachable in ${lessonId}`).toBe(true);

    const all = page.locator("svg.schematic-axes");
    let axes = all.first();
    for (let k = 0; k < (await all.count()); k++) {
      if ((await all.nth(k).locator("text.schematic-quad-n").count()) === nodes) { axes = all.nth(k); break; }
    }
    await expect(axes).toBeVisible();
    // The svg must carry an accessible name (the caption), per the visual contract.
    await expect(axes).toHaveAttribute("role", "img");
    const label = await axes.getAttribute("aria-label");
    expect(label && label.length > 20, "axes svg has no meaningful aria-label").toBe(true);
    // And the legend must list every node, so the labels are readable rather than
    // depending on position alone.
    // The legend sits beside its own svg, inside the same .schematic-quad wrapper.
    const legend = axes.locator("xpath=..").locator("ol.schematic-quad-items");
    await expect(legend.locator("li")).toHaveCount(nodes);
    await page.screenshot({ path: `test-results/axes-${slug}.png` });
  });
}
