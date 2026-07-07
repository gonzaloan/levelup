export const meta = {
  name: 'levelup-ux-research',
  description: 'Fetch current official docs + best practices for the level-up iteration: gamification/badges, Open Badges standard, OG/LinkedIn sharing, learning-content clarity, and dual-theme UX. Returns a synthesized, cited findings pack.',
  phases: [{ title: 'Research' }, { title: 'Synthesize' }],
};

const TOPICS = [
  { key: 'open-badges', q: 'Open Badges 3.0 standard (1EdTech) — what a badge credential contains (issuer, criteria, evidence, verifiable credential). How lightweight web apps mint shareable achievement badges. Give the concrete data fields and a minimal JSON shape.' },
  { key: 'linkedin-share', q: 'How to share an achievement/certification to LinkedIn from a web app in 2025: the "Add to Profile / Certifications" URL scheme AND the generic sharing URL (share-offsite / feed share). Exact URL formats + required params. Also Open Graph meta tags needed so a shared link renders a rich card (og:title, og:description, og:image sizes).' },
  { key: 'gamification', q: 'Evidence-based gamification for learning platforms (2024-2025): what actually drives engagement and retention without being manipulative — streaks, XP, levels, badges, progress, mastery. Self-Determination Theory (autonomy/competence/relatedness). Pitfalls of extrinsic rewards. Concrete, tasteful patterns for an engineering-education app.' },
  { key: 'content-clarity', q: 'Best practices for technical learning content that sticks: worked examples effect, concrete-before-abstract, dual coding (text+visual), retrieval practice, cognitive load. How senior/staff engineering concepts should be explained with real-world examples, architecture diagrams, and code. Keep it about instructional design principles.' },
  { key: 'dual-theme-ux', q: 'Modern web UX/UI best practices 2025 for a dual-theme app (a polished "studio" theme and a retro pixel/16-bit game theme): avoiding layout overlap, spacing scales, responsive grids, accessible color contrast (WCAG 2.2), motion/reduced-motion, and making a learning app feel like a game without hurting readability.' },
];

const found = await parallel(TOPICS.map((topic) => async () => {
  // Ask the agent to actually search + fetch official/authoritative sources.
  const r = await agent(
    `Research this for the "level-up" engineering-learning web app (Next.js static export, localStorage progress, dual theme). Use WebSearch + WebFetch to pull CURRENT, AUTHORITATIVE sources (official standards, official docs, reputable 2024-2025 references). Do NOT rely on memory — fetch and cite real URLs.

TOPIC (${topic.key}): ${topic.q}

Return a tight findings brief: the key facts we can act on, any exact formats/URLs/JSON shapes, concrete do/don't for our app, and a short "sources" list of the real URLs you fetched. Be concrete and implementation-ready, not generic.`,
    { label: `research:${topic.key}`, phase: 'Research', effort: 'high' }
  );
  return { key: topic.key, brief: r };
}));

const clean = found.filter(Boolean);
log(`researched ${clean.length}/${TOPICS.length} topics`);

// Synthesize into one actionable pack for the design spec.
const synthesis = await agent(
  `You are the lead designer/engineer for "level-up". Synthesize these research briefs into ONE implementation-ready findings pack that will drive a design spec. For each area give: (1) the decisions we should make, (2) concrete specs (data shapes, URL formats, spacing/contrast rules), (3) pitfalls to avoid. Keep it sharp and cited (keep the real source URLs). Cover: badges (Open Badges-aligned but pragmatic for a no-backend app), LinkedIn sharing (exact URL + OG tags), tasteful gamification (SDT-grounded), content-clarity rules, and dual-theme UX/anti-overlap rules.

BRIEFS:
${clean.map((c) => `\n### ${c.key}\n${c.brief}`).join('\n')}`,
  { label: 'synthesize', phase: 'Synthesize', effort: 'high' }
);

return { synthesis, briefs: clean };
