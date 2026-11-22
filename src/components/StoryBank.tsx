"use client";
// Your behavioral stories (STAR), tagged with the competencies they prove, kept only in this
// browser (they are personal: never synced). Coverage shows the gaps; drill mode asks a random
// question and times your two-minute answer.
import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/types";
import { COMPETENCIES, type Competency } from "@/lib/stories";

interface Story { id: string; title: string; s: string; t: string; a: string; r: string; l: string; tags: string[]; updatedAt: number }
const KEY = "fg.stories.v1";
const load = (): Story[] => { try { const x = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(x) ? x : []; } catch { return []; } };
const persist = (x: Story[]) => { try { localStorage.setItem(KEY, JSON.stringify(x)); } catch { /* ignore */ } };
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const WPM = 130; // a typical speaking pace; the estimate is only a guide

const T = {
  en: { mine: "My stories", coverage: "Coverage", drill: "Drill", add: "New story", title: "Title (for you)", s: "Situation", t: "Task", a: "Action (what you did)", r: "Result (with numbers)", l: "What you learned",
    tags: "What this story proves", save: "Save", del: "Delete", empty: "No stories yet. Write 6–8 strong ones and tag each with several competencies.", spoken: (w: number, m: string) => `${w} words · ~${m} spoken`,
    hint: { s: "One or two sentences of context.", t: "Your goal or responsibility.", a: "The steps you took and why. Say \"I\", not \"we\".", r: "What changed: metrics, time, money, people.", l: "What you would repeat or change." },
    gap: "no story yet", stories: "stories", ask: "Next question", pick: "Which story would you use?", none: "— none fits —", start: "Start 2:00", show: "Show my story", export: "Export JSON", import: "Import JSON",
    privacy: "Stored only in this browser; not synced. Export a copy if it matters.", groups: { staff: "Staff themes", amazon: "Amazon Leadership Principles" } },
  es: { mine: "Mis historias", coverage: "Cobertura", drill: "Práctica", add: "Nueva historia", title: "Título (para ti)", s: "Situación", t: "Tarea", a: "Acción (lo que hiciste tú)", r: "Resultado (con números)", l: "Lo que aprendiste",
    tags: "Qué demuestra esta historia", save: "Guardar", del: "Borrar", empty: "Aún no tienes historias. Escribe 6–8 buenas y etiqueta cada una con varias competencias.", spoken: (w: number, m: string) => `${w} palabras · ~${m} hablado`,
    hint: { s: "Una o dos frases de contexto.", t: "Tu objetivo o responsabilidad.", a: "Los pasos que diste y por qué. Di \"yo\", no \"nosotros\".", r: "Qué cambió: métricas, tiempo, dinero, personas.", l: "Qué repetirías o cambiarías." },
    gap: "sin historia", stories: "historias", ask: "Siguiente pregunta", pick: "¿Qué historia usarías?", none: "— ninguna calza —", start: "Empezar 2:00", show: "Ver mi historia", export: "Exportar JSON", import: "Importar JSON",
    privacy: "Se guardan solo en este navegador; no se sincronizan. Exporta una copia si te importan.", groups: { staff: "Temas Staff", amazon: "Leadership Principles de Amazon" } },
};

const blank = (): Story => ({ id: `s${Date.now().toString(36)}`, title: "", s: "", t: "", a: "", r: "", l: "", tags: [], updatedAt: Date.now() });

export function StoryBank({ locale }: { locale: Locale }) {
  const t = T[locale];
  const name = (c: Competency) => c.name[locale];
  const [tab, setTab] = useState<"mine" | "coverage" | "drill">("mine");
  const [stories, setStories] = useState<Story[]>([]);
  const [edit, setEdit] = useState<Story | null>(null);
  useEffect(() => { setStories(load()); }, []);

  const save = (s: Story) => {
    const next = [...stories.filter((x) => x.id !== s.id), { ...s, updatedAt: Date.now() }].sort((a, b) => b.updatedAt - a.updatedAt);
    setStories(next); persist(next); setEdit(null);
  };
  const remove = (id: string) => { const next = stories.filter((x) => x.id !== id); setStories(next); persist(next); setEdit(null); };
  const count = useMemo(() => Object.fromEntries(COMPETENCIES.map((c) => [c.id, stories.filter((s) => s.tags.includes(c.id)).length])), [stories]);

  const doExport = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(stories, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "levelup-stories.json"; a.click(); URL.revokeObjectURL(url);
  };
  const doImport = (f: File) => f.text().then((txt) => {
    const incoming = JSON.parse(txt) as Story[];
    if (!Array.isArray(incoming)) return;
    const byId = new Map(stories.map((s) => [s.id, s]));
    for (const s of incoming) if (s?.id && typeof s.a === "string") byId.set(s.id, { ...blank(), ...s, tags: Array.isArray(s.tags) ? s.tags : [] });
    const next = [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    setStories(next); persist(next);
  }).catch(() => undefined);

  return (
    <div className="sb">
      <div className="sb-tabs" role="tablist">
        {(["mine", "coverage", "drill"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "on" : undefined} onClick={() => setTab(k)}>{t[k]}</button>
        ))}
      </div>

      {tab === "mine" && (edit ? <Editor story={edit} onSave={save} onDelete={remove} onCancel={() => setEdit(null)} t={t} name={name} /> : (
        <>
          <div className="sb-bar">
            <button type="button" className="btn btn-primary" onClick={() => setEdit(blank())}>+ {t.add}</button>
            <button type="button" className="btn" onClick={doExport} disabled={!stories.length}>{t.export}</button>
            <label className="btn">{t.import}<input type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && void doImport(e.target.files[0])} /></label>
          </div>
          <p className="lab-note">{t.privacy}</p>
          {!stories.length && <p className="sb-empty">{t.empty}</p>}
          <ul className="sb-list">
            {stories.map((s) => (
              <li key={s.id}><button type="button" onClick={() => setEdit(s)}>
                <strong>{s.title || s.s.slice(0, 60) || "—"}</strong>
                <span>{s.tags.map((id) => COMPETENCIES.find((c) => c.id === id)).filter(Boolean).map((c) => name(c!)).join(" · ")}</span>
              </button></li>
            ))}
          </ul>
        </>
      ))}

      {tab === "coverage" && (
        <div className="sb-cov">
          {(["staff", "amazon"] as const).map((g) => (
            <section key={g}>
              <h3 className="section-label">{t.groups[g]}</h3>
              <ul>
                {COMPETENCIES.filter((c) => c.group === g).map((c) => (
                  <li key={c.id} className={count[c.id] ? "ok" : "gap"}><span>{name(c)}</span><b>{count[c.id] ? `${count[c.id]} ${t.stories}` : t.gap}</b></li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {tab === "drill" && <Drill stories={stories} t={t} locale={locale} name={name} />}
    </div>
  );
}

function Editor({ story, onSave, onDelete, onCancel, t, name }: { story: Story; onSave: (s: Story) => void; onDelete: (id: string) => void; onCancel: () => void; t: (typeof T)["en"]; name: (c: Competency) => string }) {
  const [s, setS] = useState(story);
  const total = words(s.s) + words(s.t) + words(s.a) + words(s.r) + words(s.l);
  const field = (k: "s" | "t" | "a" | "r" | "l", rows: number) => (
    <label className="sb-field"><span>{t[k]} <small>{t.hint[k]}</small></span>
      <textarea rows={rows} value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></label>
  );
  const toggle = (id: string) => setS({ ...s, tags: s.tags.includes(id) ? s.tags.filter((x) => x !== id) : [...s.tags, id] });
  const mins = total / WPM;
  return (
    <div className="sb-editor">
      <label className="sb-field"><span>{t.title}</span><input value={s.title} onChange={(e) => setS({ ...s, title: e.target.value })} /></label>
      {field("s", 2)}{field("t", 2)}{field("a", 6)}{field("r", 3)}{field("l", 2)}
      <p className={`sb-len${mins > 3 ? " long" : ""}`}>{t.spoken(total, `${Math.floor(mins)}:${String(Math.round((mins % 1) * 60)).padStart(2, "0")}`)}</p>
      <fieldset className="sb-tags"><legend>{t.tags}</legend>
        {COMPETENCIES.map((c) => <button key={c.id} type="button" className={s.tags.includes(c.id) ? "on" : undefined} aria-pressed={s.tags.includes(c.id)} onClick={() => toggle(c.id)}>{name(c)}</button>)}
      </fieldset>
      <div className="sb-bar">
        <button type="button" className="btn btn-primary" onClick={() => onSave(s)} disabled={!s.a.trim()}>{t.save}</button>
        <button type="button" className="btn" onClick={onCancel}>←</button>
        <button type="button" className="link-btn" onClick={() => onDelete(s.id)}>{t.del}</button>
      </div>
    </div>
  );
}

function Drill({ stories, t, locale, name }: { stories: Story[]; t: (typeof T)["en"]; locale: Locale; name: (c: Competency) => string }) {
  const all = useMemo(() => COMPETENCIES.flatMap((c) => c.questions.map((q) => ({ c, q: q[locale] }))), [locale]);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState("");
  const [left, setLeft] = useState<number | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => { setI(Math.floor(Math.random() * all.length)); }, [all.length]);
  useEffect(() => {
    if (left === null || left <= 0) return;
    const h = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(h);
  }, [left]);
  const cur = all[i];
  const story = stories.find((s) => s.id === pick);
  const next = () => { setI(Math.floor(Math.random() * all.length)); setPick(""); setLeft(null); setShown(false); };
  return (
    <div className="sb-drill">
      <p className="eyebrow">{name(cur.c)}</p>
      <p className="sb-q">“{cur.q}”</p>
      <label className="sb-field"><span>{t.pick}</span>
        <select value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">{t.none}</option>
          {stories.map((s) => <option key={s.id} value={s.id}>{(s.tags.includes(cur.c.id) ? "★ " : "") + (s.title || s.s.slice(0, 50))}</option>)}
        </select>
      </label>
      <div className="sb-bar">
        <button type="button" className="btn btn-primary" onClick={() => setLeft(120)}>{left === null ? t.start : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`}</button>
        {story && <button type="button" className="btn" onClick={() => setShown(!shown)}>{t.show}</button>}
        <button type="button" className="btn" onClick={next}>{t.ask} →</button>
      </div>
      {shown && story && (
        <dl className="sb-star">{(["s", "t", "a", "r", "l"] as const).map((k) => story[k] && <div key={k}><dt>{t[k]}</dt><dd>{story[k]}</dd></div>)}</dl>
      )}
    </div>
  );
}
