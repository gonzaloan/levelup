export const meta = {
  name: 'levelup-core-polish',
  description: 'Close level-up visual/UX/interactivity gaps to get-certified: 6 disjoint build agents → build gate → 3 PASS/FAIL validators → fix loop until all PASS',
  phases: [
    { title: 'Build', detail: '6 parallel build agents on disjoint files' },
    { title: 'Gate', detail: 'authoritative tsc + lint + build' },
    { title: 'Validate', detail: '3 PASS/FAIL validators (integrity, UX/a11y/i18n, anti-slop)' },
    { title: 'Fix', detail: 'per-area fix agents until all validators PASS' },
  ],
}

const ROOT = 'C:\\\\Projects\\\\Personal\\\\level-up'
const CONTRACT = 'Read docs/DEFINITIVE-BUILD-CONTRACT.md FIRST and obey every HARD BAR. Working dir: ' + ROOT + ' (cd there). Do NOT edit shared files: globals.css, src/i18n/messages.ts, src/i18n/config.ts, src/lib/types.ts, src/app/layout.tsx — all needed keys/types/css-imports are ALREADY added. Do NOT run `npm run build` (it races other agents; writes out/.next). Self-check with `npx tsc --noEmit` only. Add "use client" to any component using hooks/events. Every UI string uses m(key,locale) from @/i18n/messages (keys already exist: code.*, figure.*, schematic.*, rank.*, flash.*, cheat.*, exam.*) or is authored inline {en,es} rendered with t(). Author real Spanish, never machine-translated.'

const AGENTS = [
  {
    key: 'A', label: 'A:reader-visuals',
    prompt: CONTRACT + `

YOU ARE AGENT A — reader visual polish. Files you may create/modify (NOTHING else):
- src/components/FigureZoom.tsx (NEW)
- src/components/lesson/ConceptPane.tsx (MODIFY)
- src/components/Schematic.tsx (MODIFY)
- src/app/styles/14-figure.css (FILL — currently a placeholder)
- src/app/styles/18-schematic-anim.css (FILL)

Deliver THREE features:
1. FIGURE ZOOM: an accessible lightbox component FigureZoom that wraps any figure (diagram/widget) with a click/tap/keyboard "enlarge" affordance (button labelled via m("figure.zoom",locale)). Opens a role="dialog" aria-modal overlay showing the same SVG/figure scaled up (up to ~92vw x 88vh), focus-trapped, closes on ✕ (m("figure.close")) / scrim click / Esc, restores focus to the trigger, locks body scroll while open. Reduced-motion gated. Study get-certified/src/figure-zoom.js for the proven UX (reinterpret in React/TSX; do not copy vanilla DOM code). In ConceptPane, wrap the diagram/widget block (the Schematic or Widget around line 37-45) so learners can enlarge it. Show a subtle "click to enlarge" hint (m("figure.zoomHint")).
2. ANIMATED STAGED SCHEMATIC: enhance Schematic.tsx so flow/stack diagrams reveal their nodes in sequence (staged fade/slide via CSS using the existing --i index custom prop the components already set), and flow diagrams show a token/pulse traveling along the arrows. All motion transform/opacity only, double-gated on prefers-reduced-motion (static fallback: everything visible, no motion). Add a small "replay" control (m("schematic.replay")) that re-triggers the animation; use IntersectionObserver to play once on scroll-into-view. Put the CSS in 18-schematic-anim.css. Content MUST be visible by default (never opacity:0 as the base state — arm animation only after JS/IO fires, e.g. via a data-armed attribute).
3. SUB-CARDS + MNEMONIC: ConceptLesson now has optional children?: {label,detail}[] and mnemonic?: I18nText (see src/lib/types.ts). In ConceptPane, render children as a scannable grid of small sub-concept cards (label + detail) after the pitfalls, and render mnemonic as a distinct "remember this" callout. Feature-detect (only render if present). Style with existing tokens/classes; add minimal CSS to an existing owned file if needed (14 or 18) — keep it tasteful.

Match the observatory/instrument aesthetic (tokens in 01-tokens.css). Test that unenriched concepts (no children/mnemonic) render unchanged. Run npx tsc --noEmit clean before reporting. Report files touched + any shared-file REQUESTS + tsc result.`,
  },
  {
    key: 'B', label: 'B:codeview',
    prompt: CONTRACT + `

YOU ARE AGENT B — interactive code view. Files you may create/modify (NOTHING else):
- src/components/lesson/CodeView.tsx (NEW)
- src/components/ContextRail.tsx (MODIFY — swap the "code" tab to render <CodeView>)
- src/app/styles/13-codeview.css (FILL)

Build a React CodeView component that renders a ConceptCode ({lang, snippet, caption?, annotations?:{line,note}[]}) with the polish of get-certified/src/code-view.js (STUDY IT, reinterpret in TSX — do not copy vanilla DOM):
1. RAINBOW BRACKETS: depth-colored ()[]{} via a string/comment-aware tokenizer (escape/skip strings and comments per language family: # for py/bash/yaml, // and /* */ for js/ts/go/etc). HTML-safe. 6 depth colors mapped to house tokens (use --gen/--ai-signal/--amber/--star and DawnBringer accents; provide pixel-theme [data-theme="pixel"] variants).
2. HOVER-TO-EXPLAIN: annotations[].line/note become interactive — hovering OR keyboard-focusing the annotated line/token shows a role="tooltip" popover with the note (bilingual via t(note,locale)). Opens on hover/focus, closes on Esc/blur/tap-away, one at a time. This is the flagship "pon el mouse arriba y explica qué pasa" feature — make it delightful and fully keyboard+screenreader accessible (aria-describedby wiring). Show m("code.annotationsHint",locale) when annotations exist.
3. REVEAL/COLLAPSE: snippets > 12 lines collapse behind a toggle (m("code.show")/m("code.hide"), with line count + m("code.lines")); ≤12 open.
4. COPY button (m("code.copy") → m("code.copied")) using navigator.clipboard, with a non-throwing fallback.
All motion reduced-motion gated. Then in ContextRail.tsx replace the current plain <pre> + footnote-list code tab (lines ~65-77) with <CodeView code={concept.code!} locale={locale} track={track} />. Keep the other tabs untouched. Determinism: no Date.now/Math.random at render (seed any id counters from an incrementing ref or useId). Run npx tsc --noEmit clean. Report files + REQUESTS + tsc result.`,
  },
  {
    key: 'C', label: 'C:toggle-pixel',
    prompt: CONTRACT + `

YOU ARE AGENT C — signature theme toggle + pixel typography. Files you may create/modify (NOTHING else):
- src/components/ThemeToggle.tsx (MODIFY)
- src/app/styles/15-toggle.css (FILL)
- src/app/styles/05-pixel-theme.css (MODIFY — pixel typography only)

1. SIGNATURE TOGGLE: get-certified's flagship control is a two-segment sliding-thumb pill (role="switch") with a Sun glyph = studio and a space-invader glyph = pixel, animated thumb, full ARIA (aria-checked, destination-based aria-label), keyboard operable (Enter/Space/Arrows). STUDY get-certified/src/mode-switch.js + its .mode-switch CSS in get-certified/styles.css, then rebuild ThemeToggle as this segmented pill in TSX. Keep the existing behavior contract: persists to localStorage['levelup.theme'], toggles document.documentElement [data-theme="pixel"], no-flash boot already handled in layout.tsx. Use inline SVG for the sun + invader glyphs (hand-authored, crisp). Labels via m("theme.studio")/m("theme.pixel"). Put all styling in 15-toggle.css with both studio (default) and [data-theme="pixel"] variants (in pixel mode the pill should adopt the zero-radius chunky DawnBringer frame language). Motion transform/opacity only, reduced-motion gated.
2. RESTORE PIXEL TYPOGRAPHY: currently pixel mode retired Pixelify Sans from copy (uses Inter) so it reads insufficiently "16-bit". In 05-pixel-theme.css, bring back Pixelify Sans (--f-pixelify) for pixel-mode structural chrome (headings, labels, buttons, eyebrows, nav) while keeping long-form body prose in a readable face and exam-critical NUMERALS in mono (--f-mono) for legibility. Press Start 2P (--f-press) stays for large pixel titles only. Ensure contrast/legibility (WCAG AA) — Pixelify at small sizes can hurt; tune sizes/line-height. Do not break studio mode.
Run npx tsc --noEmit clean. Report files + REQUESTS + tsc result.`,
  },
  {
    key: 'D', label: 'D:rank-ladder',
    prompt: CONTRACT + `

YOU ARE AGENT D — named XP rank ladder. Files you may create/modify (NOTHING else):
- src/lib/ranks.ts (NEW)
- src/components/RankLadder.tsx (NEW)
- src/components/MeView.tsx (MODIFY — add the rank ladder near the top of progress)
- src/app/styles/16-ranks.css (FILL)

get-certified maps XP to named ranks (see get-certified/content/shared/ranks.json for the shape/flavor). level-up already awards "signal" points (see how MeView.tsx + src/lib/store.ts / badges.ts compute the player's signal/score — READ them, reuse the existing number; do NOT invent a new scoring system).
1. lib/ranks.ts: a pure, React-free module exporting an ordered array of ~8-10 named ranks (bilingual I18nText names fitting the observatory/engineering theme, e.g. Apprentice→…→Principal Navigator — author good EN+ES), each with a signal threshold, and a function rankFor(signal) -> { current, next, toNext, index, pct }. Deterministic, no Date.now/Math.random. Add a tiny vitest-friendly pure function (no test file required, but keep it testable).
2. RankLadder.tsx ("use client" only if it uses hooks; otherwise a server component is fine): renders the current rank prominently with an instrument-style progress meter (reuse the .meter token class from 01-tokens.css) toward the next rank, showing m("rank.current"), m("rank.next"), and "<n> {m('rank.toNext')}", or m("rank.max") at top rank. Optionally a compact horizontal ladder of all ranks with the current one highlighted.
3. Integrate into MeView.tsx: read the existing signal value already shown there and render <RankLadder signal={...} locale={locale} /> prominently (near the signal stat). Do not remove existing MeView content.
Style in 16-ranks.css with house tokens. Run npx tsc --noEmit clean. Report files + REQUESTS + tsc result.`,
  },
  {
    key: 'E', label: 'E:lesson-flow',
    prompt: CONTRACT + `

YOU ARE AGENT E — lesson-flow features (flashcards, cheat sheet, timed exam). Files you may create/modify (NOTHING else):
- src/components/lesson/FlashcardDeck.tsx (NEW)
- src/components/lesson/CheatSheet.tsx (NEW)
- src/components/lesson/ExamRunner.tsx (NEW)
- src/components/LessonView.tsx (MODIFY — integrate the three into the flow)
- src/app/styles/17-flashcards.css (FILL)
- src/app/styles/19-cheatsheet.css (FILL)

READ LessonView.tsx fully first to understand its staged flow (overview → concept panes → mid-quiz → practice → done) and the Lesson type (src/lib/types.ts — now has optional cheatSheet?: CheatSection[]; ConceptLesson has optional flashcards?: {front,back}[]).
1. FLASHCARD RECALL (FlashcardDeck.tsx, "use client"): a flip-card self-graded recall step. Given flashcards (front/back I18nText), show the front, "flip" (m("flash.flip")/m("flash.tapToFlip")) reveals the back with a transform:rotateY flip (reduced-motion → cross-fade), learner self-grades m("flash.gotIt")/m("flash.missed"), advance m("flash.next") to next card, ends on m("flash.done"). No scoring gate — purely formative (m("flash.intro")). Tap + keyboard operable. If a concept has flashcards, offer this as an optional recall step; if a lesson has no flashcards anywhere, this simply doesn't appear.
2. CHEAT SHEET (CheatSheet.tsx): renders lesson.cheatSheet (CheatSection[] = {heading, rows:{term,note}[]}) as a clean quick-reference table/accordion. Title m("cheat.title"), intro m("cheat.intro"), a print button (m("cheat.print"), window.print). Feature-detect: only offer when lesson.cheatSheet exists (m("cheat.empty") otherwise if opened). Surface an "open quick reference" (m("cheat.open")) affordance in the lesson (e.g. in the done/summary stage or a persistent lesson action).
3. TIMED EXAM (ExamRunner.tsx, "use client"): an optional timed run over the lesson's midQuiz items (reuse the existing QuizItem shape + the same option rendering pattern LessonView/MidQuiz already use — READ MidQuiz.tsx). A visible countdown (m("exam.timeLeft"), format mm:ss) that does not stop; auto-submits at 0 (m("exam.timeUp")); shows m("exam.score")/m("exam.passed")/m("exam.failed"). Entry via m("exam.begin"). DETERMINISM: the countdown MUST be driven by elapsed time captured at mount via a ref set inside useEffect (client-only) — never call Date.now() during render; render 0/initial on SSR and start ticking after mount. No Math.random.
Integrate all three into LessonView.tsx without breaking its existing stages or progress logic. Style in the two owned CSS files. Run npx tsc --noEmit clean. Report files + REQUESTS + tsc result.`,
  },
  {
    key: 'F', label: 'F:nav-landing',
    prompt: CONTRACT + `

YOU ARE AGENT F — nav + landing visual polish. Files you may create/modify (NOTHING else):
- src/components/Nav.tsx (MODIFY)
- src/components/LandingChart.tsx (MODIFY)
- src/app/[locale]/page.tsx (MODIFY — the landing page)

Goal: raise nav + landing to get-certified's finished, premium feel while staying in the dark observatory identity (tokens in 01-tokens.css). READ get-certified/index.html + the top of get-certified/styles.css for the reference chrome quality, and READ the current Nav.tsx / page.tsx / LandingChart.tsx first.
1. NAV: keep the sextant/star-reticle brand mark but tighten the lockup + spacing to feel deliberate; ensure the active-link treatment, language toggle, primary CTA and mobile sheet are all crisp and consistent. Do not change nav routes or i18n keys.
2. LANDING: strengthen the hero (the 7/5 asymmetric grid already in tokens), section rhythm, and the LandingChart star-chart viz so the first screen is striking and clearly communicates the value prop (bilingual, already in messages).
3. HERO/WORLD ART SLOTS (graceful): a background art agent is generating decorative WebP art to public/hero/ascent.webp, public/worlds/<domain>.webp, public/brand/emblem.webp. Wire an OPTIONAL hero art layer into the landing: reference /hero/ascent.webp behind/beside the hero with a tasteful mask/gradient AND a CSS/SVG fallback so that if the file is absent the layout still looks intentional (do NOT hard-depend on the image existing — use it as an <img> with onError hide, or a CSS background with the existing star-chart as the visible fallback). Same graceful approach if you reference the emblem in the brand mark. The build MUST pass whether or not the art files exist yet.
All motion transform/opacity, reduced-motion gated, content visible by default. Keep bundle lean. Run npx tsc --noEmit clean. Report files + REQUESTS + tsc result.`,
  },
]

const GATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['tsc', 'lint', 'build', 'errors'],
  properties: {
    tsc: { type: 'string', enum: ['pass', 'fail'] },
    lint: { type: 'string', enum: ['pass', 'fail'] },
    build: { type: 'string', enum: ['pass', 'fail'] },
    errors: { type: 'array', items: { type: 'string' }, description: 'exact error lines, empty if all pass' },
  },
}

const VALIDATOR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'blockers', 'notes'],
  properties: {
    verdict: { type: 'string', enum: ['PASS', 'FAIL'] },
    blockers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['area', 'file', 'issue'],
        properties: {
          area: { type: 'string', enum: ['A', 'B', 'C', 'D', 'E', 'F', 'shared'], description: 'which build-agent area owns the fix' },
          file: { type: 'string' },
          issue: { type: 'string', description: 'concrete defect + how to fix' },
        },
      },
    },
    notes: { type: 'string' },
  },
}

const GATE_PROMPT = `Working dir: ${ROOT} (cd there). You are the BUILD GATEKEEPER. Run these three commands and report results EXACTLY:
1) npx tsc --noEmit
2) npx next lint --dir src
3) npm run build
Capture the last ~40 lines of each. Set tsc/lint/build to "pass" only if the command exits 0 (build must reach "Compiled successfully" / export complete with no error). Put every real ERROR line (type errors, lint errors, build failures) into errors[] verbatim — ignore warnings unless they fail the build. Do not edit any files.`

function validatorPrompt(lens, checklist) {
  return `Working dir: ${ROOT} (cd there). READ-ONLY validation — do NOT edit files. You are a strict PASS/FAIL validator with the ${lens} lens for the level-up polish work (6 features just landed: A reader-visuals/figure-zoom/animated-schematics/sub-cards, B interactive CodeView with hover tooltips, C signature theme-toggle+pixel-typography, D rank ladder, E flashcards/cheatsheet/timed-exam, F nav/landing polish).

Check the following. ${checklist}

Be rigorous and skeptical — this must reach "the definitive platform" quality. Return verdict FAIL if ANY blocker exists; list each blocker with the owning area (A-F or shared) and a concrete fix. Return PASS only if the lens is genuinely satisfied. Inspect the actual source files and, where useful, run read-only commands (grep, npx tsc --noEmit, cat) to verify claims. Do not rubber-stamp.`
}

const VALIDATORS = [
  { key: 'integrity', phase: 'Validate', prompt: validatorPrompt('BUILD-INTEGRITY & DETERMINISM',
    'tsc/lint/build clean (run them). No Date.now()/Math.random() at render time in any new/changed component (grep for them and confirm any use is inside useEffect/refs/event handlers, client-only). "use client" present on every component using hooks/events. No new npm dependencies added (check package.json unchanged deps). No edits to the forbidden shared files (globals.css/messages.ts/config.ts/types.ts/layout.tsx) beyond what the orchestrator pre-added — actually types.ts/messages.ts were pre-edited by orchestrator so they are allowed to already contain the new keys; flag only if a build agent ADDED to them. Static export produces out/ with no runtime errors.') },
  { key: 'ux-a11y-i18n', phase: 'Validate', prompt: validatorPrompt('UX / ACCESSIBILITY / BILINGUAL',
    'Every new learner/UI string is bilingual and rendered via m()/t() (grep for hardcoded English literals in JSX of the changed files — flag any). Spanish is authored quality (no obvious machine-translation/calques). Keyboard operability + visible focus + role/aria correctness on: CodeView tooltips (role=tooltip, aria-describedby, Esc/blur close), FigureZoom (role=dialog aria-modal, focus trap, Esc/scrim close, focus restore), ThemeToggle (role=switch, aria-checked, arrow/enter keys), FlashcardDeck + ExamRunner (tap+keyboard). All motion is transform/opacity and double-gated on prefers-reduced-motion with a static fallback; content is visible by default (grep changed CSS for opacity:0 defaults not armed by JS/data-attr). Tap targets >=40px. Both studio AND pixel themes handled by new CSS.') },
  { key: 'anti-slop-parity', phase: 'Validate', prompt: validatorPrompt('ANTI-SLOP, DESIGN PARITY & FEATURE COMPLETENESS',
    'All explanatory visuals (code overlays, schematics, sub-cards, tooltips) are hand-authored SVG/CSS/TSX — NO diffusion/raster used as a diagram. New CSS uses the design tokens from 01-tokens.css (grep for stray hardcoded hex that duplicates a token; DawnBringer --db-* usage in pixel variants). The features actually deliver their intent vs get-certified: CodeView has real hover/focus token tooltips (not a static footnote list), FigureZoom actually enlarges in a modal, Schematic animation exists + replay + IO play-once, ThemeToggle is a real segmented sliding pill (not a plain button), pixel mode uses Pixelify chrome, RankLadder shows named rank + progress-to-next off the existing signal, FlashcardDeck flips + self-grades, CheatSheet renders sections + print, ExamRunner has a live countdown. Verify each by reading the component. Flag any feature that is stubbed, TODO, or not wired into its host (ConceptPane/ContextRail/MeView/LessonView/Nav/landing).') },
]

// ── Build phase: 6 disjoint build agents in parallel ──────────────────────
phase('Build')
log('Launching 6 disjoint build agents (A-F) in parallel')
const builds = await parallel(AGENTS.map(a => () =>
  agent(a.prompt, { label: a.label, phase: 'Build', agentType: 'general-purpose' })
    .then(r => ({ key: a.key, report: r }))
))
const builtKeys = builds.filter(Boolean).map(b => b.key)
log('Build agents returned: ' + builtKeys.join(', '))

// ── Gate + Validate + Fix loop ────────────────────────────────────────────
const briefByKey = Object.fromEntries(AGENTS.map(a => [a.key, a.prompt]))
let round = 0
const MAX_ROUNDS = 4
let gate = null
let verdicts = []
let allPass = false

while (round <= MAX_ROUNDS) {
  phase('Gate')
  log('Gate round ' + round + ': authoritative tsc + lint + build')
  gate = await agent(GATE_PROMPT, { label: 'gate:build-r' + round, phase: 'Gate', schema: GATE_SCHEMA, agentType: 'Explore' })
  const buildGreen = gate && gate.tsc === 'pass' && gate.lint === 'pass' && gate.build === 'pass'

  // If the build itself is broken, fix build errors before spending validators.
  if (!buildGreen) {
    log('Gate FAILED (round ' + round + '): ' + (gate ? gate.errors.slice(0, 6).join(' | ') : 'no gate result'))
    if (round === MAX_ROUNDS) break
    round++
    phase('Fix')
    const errText = (gate ? gate.errors : []).join('\\n')
    // One repair agent fixes compile/lint/build errors across the tree (serial, safe).
    await agent(CONTRACT + `\n\nYOU ARE THE BUILD-REPAIR AGENT. The authoritative gate failed. Fix ALL of these tsc/lint/build errors with minimal, correct edits in the files that own them (you MAY edit any src component/css to fix a real error, but do NOT change the forbidden shared files' meaning). After fixing, run npx tsc --noEmit AND npx next lint --dir src AND npm run build and confirm all three are clean. Errors to fix:\n\n` + errText,
      { label: 'fix:build-r' + round, phase: 'Fix', agentType: 'general-purpose' })
    continue
  }

  log('Gate PASSED (round ' + round + '). Running 3 validators.')
  phase('Validate')
  verdicts = await parallel(VALIDATORS.map(v => () =>
    agent(v.prompt, { label: 'validate:' + v.key + '-r' + round, phase: 'Validate', schema: VALIDATOR_SCHEMA, agentType: 'Explore' })
      .then(r => ({ key: v.key, ...(r || { verdict: 'FAIL', blockers: [], notes: 'validator returned null' }) }))
  ))
  const passes = verdicts.filter(Boolean).filter(v => v.verdict === 'PASS').map(v => v.key)
  const fails = verdicts.filter(Boolean).filter(v => v.verdict !== 'PASS')
  log('Validators PASS: [' + passes.join(', ') + '] FAIL: [' + fails.map(f => f.key).join(', ') + ']')

  if (fails.length === 0) { allPass = true; break }
  if (round === MAX_ROUNDS) break

  // Group all blockers by owning area, spawn one disjoint fix agent per area.
  round++
  phase('Fix')
  const blockers = fails.flatMap(f => (f.blockers || []).map(b => ({ ...b, lens: f.key })))
  const byArea = {}
  for (const b of blockers) { (byArea[b.area] = byArea[b.area] || []).push(b) }
  const areas = Object.keys(byArea)
  log('Fix round ' + round + ': ' + blockers.length + ' blockers across areas [' + areas.join(', ') + ']')
  await parallel(areas.map(area => () => {
    const list = byArea[area].map(b => `- [${b.lens}] ${b.file}: ${b.issue}`).join('\\n')
    const brief = briefByKey[area]
      ? 'You previously built AREA ' + area + '. Here was your original brief (for file-ownership + rules):\\n\\n' + briefByKey[area]
      : CONTRACT + '\\n\\nYou are fixing SHARED-area blockers. Make minimal correct edits; if a fix needs a forbidden shared file, note it instead.'
    return agent(brief + `\n\n=== VALIDATOR BLOCKERS YOU MUST FIX (stay within your owned files) ===\n` + list + `\n\nFix every blocker above with correct, in-style edits. Do not regress other features. Run npx tsc --noEmit clean before reporting. Report exactly what you changed.`,
      { label: 'fix:' + area + '-r' + round, phase: 'Fix', agentType: 'general-purpose' })
  }))
}

return {
  allPass,
  rounds: round,
  finalGate: gate,
  finalVerdicts: verdicts.map(v => ({ lens: v.key, verdict: v.verdict, openBlockers: (v.blockers || []).length, notes: v.notes })),
  buildAgentsCompleted: builtKeys,
}
