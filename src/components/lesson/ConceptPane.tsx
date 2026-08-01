"use client";
// One focused concept pane.
//
// ORDER IS THE DESIGN. The first version read: three paragraphs of prose, then an
// analogy, then the diagram, then optional depth, then pitfalls. Measured on a
// 390px phone that meant scrolling 1,510px — nearly two full screens — before the
// first visual, with paragraphs up to 117 words. Correct content, unreadable shape.
//
// The order now front-loads what makes a concept click and defers what only some
// readers want:
//   1. the ONE judgment this trains (the concept's `why`, one line, unmissable)
//   2. the VISUAL: interactive widget, else code, else the schematic. Within the
//      first screen on a phone, always — verified by measurement, not by intent.
//      A long code artifact opens with a capped height rather than collapsing,
//      because a button reading "show 37 lines" is not a visual.
//   3. the analogy, AFTER the figure: it lands as "oh, like X" once there is
//      something to compare, and above the figure it cost 173px of first screen
//   4. the explanation, chunked to a word budget rather than a paragraph count,
//      with the remainder behind "Read the full explanation" — the same words,
//      not fewer, just not all at once
//   5. the worked example, collapsed (concrete, but long)
//   6. pitfalls, sub-cards, mnemonic, source
//
// Nothing was deleted. `depth`, `example` and the tail of `explanation` are all
// still here, one tap away. Less on screen, same material available.
import { useState } from "react";
import Link from "next/link";
import { t, type Locale } from "@/i18n/config";
import { m } from "@/i18n/messages";
import { Schematic } from "../Schematic";
import { FigureZoom } from "../FigureZoom";
import { getWidget } from "../viz";
import { CodeView } from "./CodeView";
import { para, leadAndRest } from "./util";
import { ProseBlocks, blocksFrom, blockWords, type Block } from "./Prose";
import { codexEntriesForConcept } from "@/lib/codex";
import type { Concept, ConceptLesson } from "@/lib/types";

/** Inline per the build contract: new chrome doesn't edit the shared catalog. */
const LOOK_UP = { en: "Look it up in the Codex", es: "Búscalo en el Códice" } as const;

/**
 * Word budget for the visible lead of the explanation.
 *
 * This was "the first 2 paragraphs", which is the wrong unit: measuring the
 * corpus showed 96 of 178 concepts have a single paragraph over 100 words (the
 * longest is 165), so a two-paragraph lead was itself a wall on 96 concepts. A
 * budget adapts — a concept written in short paragraphs shows three, one written
 * in long ones shows one — and the fold lands in the same place for the reader
 * either way. 110 words is roughly one phone screen of prose at this measure.
 *
 * Always at least one paragraph: a fold with nothing above it reads as broken.
 */
const LEAD_WORD_BUDGET = 110;

function splitLead(blocks: Block[]): [Block[], Block[]] {
  // A LABELLED SECTION is atomic: a "## What you buy" label and the list under it
  // are taken together or not at all.
  //
  // Measured on cloud-platform-l5 concept 1: the 110-word budget landed at 117
  // words, midway through "You buy / You do not buy / You pay" — the three bullets
  // that ARE this module's spine. Cutting inside them showed half a comparison;
  // cutting before them left a heading with nothing under it; and deferring the
  // whole section buried the one part the learner came for. So the walk advances a
  // label together with its body, and the budget is allowed to overshoot to finish
  // a section it has already started.
  const units: Block[][] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].kind === "h" && i + 1 < blocks.length && blocks[i + 1].kind !== "h") {
      units.push([blocks[i], blocks[i + 1]]);
      i++;
    } else {
      units.push([blocks[i]]);
    }
  }

  const lead: Block[] = [];
  let words = 0;
  for (const unit of units) {
    const n = unit.reduce((s, b) => s + blockWords(b), 0);
    if (lead.length > 0 && words + n > LEAD_WORD_BUDGET) break;
    lead.push(...unit);
    words += n;
  }
  return [lead, blocks.slice(lead.length)];
}

/**
 * Split the lead again, at the first labelled section.
 *
 * Why this exists: the rewrite pass changed the shape of every explanation, and
 * that broke a bar the project had already won. Before it, an explanation was
 * running prose, so a 110-word lead was one paragraph and the figure landed ~425px
 * down on a 390px phone. After it, the lead is a definition PLUS the whole
 * `## What you buy, and what you pay` triple — five blocks — and the figure fell
 * to 1,103px, past the fold. `tests/visual/artifacts.spec.ts` caught it.
 *
 * The fix is ordering, not budget. The DEFINITION goes above the figure, because a
 * visual illustrates a concept and cannot introduce one. The labelled sections go
 * BELOW it, because they are what the reader consults after they know what the
 * thing is, and because the figure is the artifact this whole layout exists to
 * show. Raising the threshold instead would have hidden the regression rather
 * than fixed it.
 *
 * Returns [before-the-figure, after-the-figure]. On an explanation with no labels
 * in the lead — which happens whenever the opening paragraph alone spends the
 * 110-word budget — everything stays above, and the definition trim below is what
 * keeps the figure on screen.
 */
function splitAtFirstLabel(lead: Block[]): [Block[], Block[]] {
  const at = lead.findIndex((b) => b.kind === "h");
  if (at <= 0) return [lead, []];
  return [lead.slice(0, at), lead.slice(at)];
}

/**
 * Words of definition allowed above the figure.
 *
 * The contract asks for a first sentence of ≤30 words, and most concepts deliver
 * one. But the opening PARAGRAPH is often three sentences — measured on
 * cloud-platform-l7 concept 1 it is 59 words, which renders 238px tall on a 390px
 * phone and, on top of the 124px `why`, pushed the code artifact to 829px with a
 * viewport of 844. One line of code visible is not a visible artifact.
 *
 * So the definition above the figure is capped at a sentence boundary and the
 * remainder rejoins the prose below it. 34 words matches `leadAndRest`'s own
 * default, which the lesson overview already uses for the same reason.
 */
const DEF_WORD_BUDGET = 34;

/**
 * Trim the definition paragraph to its opening sentence(s), returning the tail so
 * nothing is lost — it renders below the figure with the labelled sections.
 *
 * Only ever splits a single leading paragraph. Bullets and labels are never cut
 * mid-structure, because half a list above a figure is worse than a long sentence.
 */
function trimDefinition(def: Block[]): [Block[], Block[]] {
  if (def.length !== 1 || def[0].kind !== "p") return [def, []];
  const [head, tail] = leadAndRest(def[0].text, DEF_WORD_BUDGET);
  if (!tail) return [def, []];
  return [[{ kind: "p", text: head }], [{ kind: "p", text: tail }]];
}

export function ConceptPane({ locale, lessonConcept, meta, index, total, track, onNext }: {
  locale: Locale; lessonConcept: ConceptLesson; meta?: Concept; index: number; total: number; track: string; onNext: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const Widget = lessonConcept.visual ? getWidget(lessonConcept.visual.widgetId) : null;

  // Blocks, not paragraphs: an author can now write bullets and bold, and a
  // bullet RUN counts as one unit against the lead budget rather than as N items.
  const blocks = blocksFrom(para(t(lessonConcept.explanation, locale)));
  const [lead, rest] = splitLead(blocks);
  // Above the figure: the definition, and only the definition.
  //
  // Order matters here, and getting it wrong is how the first attempt at this
  // failed. TRIM FIRST, then split at the label. Splitting first meant that a
  // concept whose opening paragraph alone spends the 110-word budget (so the lead
  // holds no label at all) never reached the trim, and its 59-word definition
  // still rendered 238px tall — which was the whole defect.
  const [defOnly, defTail] = trimDefinition(lead.slice(0, 1));
  const [, leadRest] = splitAtFirstLabel(lead);
  const leadDef = defOnly;
  // Everything the definition displaced, in reading order: the rest of the opening
  // paragraph, then any blocks between it and the first label, then the labelled
  // sections themselves.
  const belowFigure = [...defTail, ...lead.slice(1, lead.length - leadRest.length), ...leadRest];
  const depthBlocks = lessonConcept.depth ? blocksFrom(para(t(lessonConcept.depth, locale))) : [];
  // One control reveals both the rest of the explanation and the deeper read —
  // two separate "read more" buttons on one pane is noise.
  const hasMore = rest.length > 0 || depthBlocks.length > 0;
  const hasDiagram = !!lessonConcept.diagram && lessonConcept.diagram.kind !== "none";
  // Capped at 3: this is a pointer, not a second table of contents, and a concept
  // with eight Codex entries would bury the pane's own "next" button.
  const codexEntries = codexEntriesForConcept(lessonConcept.slug).slice(0, 3);

  return (
    <section className="card lesson-content">
      <div className="cp-head">
        <span className="eyebrow">{m("lesson.step", locale)} {index + 1} {m("lesson.of", locale)} {total}</span>
      </div>
      <h2 className="cp-title">{meta ? t(meta.title, locale) : lessonConcept.slug}</h2>

      {/* 1. The judgment this concept trains — one line, above everything. */}
      {meta?.why && <p className="cp-why">{t(meta.why, locale)}</p>}

      {/* 2. THE DEFINITION, before any visual.
             The owner's walkthrough of this lesson landed on one point: the pane
             opened with a judgment ("Trains the judgment of deciding whether
             bounded per-cell impact is worth the routing layer") and then a code
             artifact, so a reader who did not already know what a cell IS never
             found out. A visual illustrates a concept; it cannot introduce one.
             The lead prose now opens with a plain-words definition, and it goes
             first.

             Only the DEFINITION, though — see `splitAtFirstLabel`. Once every
             concept was rewritten to open with a definition plus a labelled
             buy/pay triple, putting the whole lead here pushed the figure to
             1,103px on a 390px phone (it had been ~425px). The labelled sections
             now render below the figure instead. */}
      <ProseBlocks blocks={leadDef} keyBase="lead" className="cp-def" />

      {/* 3. The visual, right after the definition it illustrates.
             Widget > code > schematic: something you can manipulate teaches more
             than something you read, and real code more than a boxes-and-labels
             drawing. Code is omitted entirely on concepts where a snippet was
             decoration — see docs/curriculum/cloud-platform-l5.txt. */}
      {Widget ? (
        <div className="cp-figure">
          <FigureZoom locale={locale} label={meta ? meta.title : undefined}>
            <Widget locale={locale} track={track as "general" | "ai"} params={lessonConcept.visual!.params} />
          </FigureZoom>
        </div>
      ) : lessonConcept.code ? (
        <div className="cp-figure">
          {/* lead: this snippet is the pane's figure, so it opens with a capped
              height instead of collapsing behind a "show N lines" button. */}
          <CodeView code={lessonConcept.code} locale={locale} track={track as "general" | "ai"} lead />
        </div>
      ) : hasDiagram ? (
        <div className="cp-figure">
          <FigureZoom locale={locale} label={lessonConcept.diagram.caption ?? (meta ? meta.title : undefined)}>
            <Schematic spec={lessonConcept.diagram} locale={locale} />
          </FigureZoom>
        </div>
      ) : null}

      {/* 4. The labelled sections — "What you buy, and what you pay", "When it
             makes sense", "What it requires". These are what the reader consults
             once they know what the thing IS, so they read better after the
             figure than before it, and keeping them here is what holds the figure
             above the fold on a phone. */}
      {belowFigure.length > 0 && <ProseBlocks blocks={belowFigure} keyBase="leadsec" />}

      {/* 5. The analogy LAST of the opening sequence: it settles a concept the
             reader now has, rather than being a metaphor for something unseen. */}
      {lessonConcept.analogy && (
        <p className="lesson-analogy">
          <span className="eyebrow">{m("lesson.analogy", locale)}</span> {t(lessonConcept.analogy, locale)}
        </p>
      )}

      {hasMore && (
        <div className="cp-more">
          <button className="btn btn-sm" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
            {expanded ? m("lesson.readLess", locale) : m("lesson.readFull", locale)}
          </button>
          {expanded && (
            <div className="cp-morebody">
              <ProseBlocks blocks={rest} keyBase="rest" />
              {depthBlocks.length > 0 && (
                <>
                  <p className="eyebrow cp-deeplabel">{m("lesson.readMore", locale)}</p>
                  <ProseBlocks blocks={depthBlocks} keyBase="depth" />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* If a widget or code took the figure slot, the schematic is still worth
          offering — but folded, so it never becomes a second wall. */}
      {(Widget || lessonConcept.code) && hasDiagram && (
        <details className="cp-fold">
          <summary>{m("lesson.showDiagram", locale)}</summary>
          <div className="cp-figure">
            <FigureZoom locale={locale} label={lessonConcept.diagram.caption ?? undefined}>
              <Schematic spec={lessonConcept.diagram} locale={locale} />
            </FigureZoom>
          </div>
        </details>
      )}

      {/* Code stays available even when a widget won the figure slot. */}
      {Widget && lessonConcept.code && (
        <details className="cp-fold">
          <summary>{m("lesson.showCode", locale)}</summary>
          <div className="cp-figure">
            <CodeView code={lessonConcept.code} locale={locale} track={track as "general" | "ai"} />
          </div>
        </details>
      )}

      {/* 5. The worked example: concrete and long, so collapsed by default. */}
      {lessonConcept.example && (
        <div className="cp-example">
          <button className="btn btn-sm" aria-expanded={showExample} onClick={() => setShowExample((v) => !v)}>
            {showExample ? m("lesson.hideExample", locale) : m("lesson.showExample", locale)}
          </button>
          {showExample && (
            <div className="cp-examplebody">
              <p className="cp-scenario">{t(lessonConcept.example.scenario, locale)}</p>
              {para(t(lessonConcept.example.walkthrough, locale)).map((p, i) => (
                <p key={i} className="prose cp-para">{p}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Pitfalls — short, scannable, high-value. Stays open. */}
      {lessonConcept.pitfalls?.length ? (
        <div className="lesson-pitfalls">
          <p className="eyebrow">{m("lesson.pitfalls", locale)}</p>
          <ul className="lesson-keypoints">
            {lessonConcept.pitfalls.map((p, i) => <li key={i}>{t(p, locale)}</li>)}
          </ul>
        </div>
      ) : null}

      {lessonConcept.children?.length ? (
        <div className="subcards">
          {lessonConcept.children.map((c, i) => (
            <div key={i} className="subcard">
              <p className="subcard-label">{t(c.label, locale)}</p>
              <p className="subcard-detail">{t(c.detail, locale)}</p>
            </div>
          ))}
        </div>
      ) : null}

      {lessonConcept.mnemonic && (
        <div className="mnemonic-callout">
          <span className="eyebrow">{t({ en: "Remember this", es: "Recuerda esto" }, locale)}</span>
          <p className="mnemonic-text">{t(lessonConcept.mnemonic, locale)}</p>
        </div>
      )}

      {/* 7. Look it up in the Codex.
             The reverse of the Codex's own "taught in the ladder" link, and the
             reason the two surfaces reinforce instead of duplicating: the lesson
             teaches the judgment, the Codex holds the vocabulary and the numbers.
             Rendered only where a Codex entry actually names this concept, so it
             never becomes a link to a page that has nothing to add. */}
      {codexEntries.length > 0 && (
        <p className="cp-codex">
          <span className="eyebrow">{t(LOOK_UP, locale)}</span>
          {codexEntries.map((e) => (
            <Link key={e.slug} href={`/${locale}/codex#e-${e.slug}`} className="cp-codex-link">
              {t(e.term, locale)}
            </Link>
          ))}
        </p>
      )}

      {(lessonConcept.source || meta?.source) && (
        <p className="cp-source eyebrow">
          {m("lesson.source", locale)}: {lessonConcept.source ?? meta?.source}
        </p>
      )}

      <button className={`btn btn-primary${track === "ai" ? " btn-ai" : ""} cp-next`} onClick={onNext}>
        {index + 1 < total ? m("lesson.markReadNext", locale) : m("lesson.startCheck", locale)} →
      </button>
    </section>
  );
}
