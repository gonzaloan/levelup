const c = require('./src/content/data/codex.json');
const slug = process.argv[2];
const mode = process.argv[3] || 'primer';
const cl = c.clusters.find(x => x.slug === slug);
if (!cl) { console.log('NO CLUSTER'); process.exit(1); }
const p = cl.primer;
if (mode === 'primer' || mode === 'both') {
  console.log('=== CLUSTER', cl.slug, '| tagline:', (cl.tagline && cl.tagline.en) || '');
  console.log('\nWHAT EN:', p.whatItIs.en);
  console.log('WHAT ES:', p.whatItIs.es);
  console.log('\nWHY EN:', p.whyItExists.en);
  console.log('WHY ES:', p.whyItExists.es);
  console.log('\nAXIS EN:', p.axisOfChoice.en);
  console.log('AXIS ES:', p.axisOfChoice.es);
  console.log('\nFAMILIES:');
  p.families.forEach(f => {
    console.log('\n  [' + f.label.en + ' / ' + f.label.es + ']');
    console.log('   entries:', f.entries.join(', '));
    console.log('   rule EN:', f.rule.en);
    console.log('   rule ES:', f.rule.es);
  });
  console.log('\nHOW TO CHOOSE:');
  p.howToChoose.forEach((s, i) => console.log('  ' + (i + 1) + '. EN:', s.en, '\n     ES:', s.es));
}
if (mode === 'entries' || mode === 'both') {
  console.log('\n=== ENTRIES ===');
  cl.entries.forEach(e => {
    console.log('\n--', e.slug, '|', (e.title && e.title.en) || '');
    console.log('   DEF:', e.definition && e.definition.en);
    console.log('   WHEN:', e.whenToUse && e.whenToUse.en);
    if (mode === 'entries') console.log('   COST:', e.cost && e.cost.en);
  });
}
