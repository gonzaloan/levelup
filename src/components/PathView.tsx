"use client";
// The study path, built to answer one question first: "what do I do now?". One big next step,
// then the three phases, modules folded except the one you are in; progress shows once started.
import Link from "next/link";
import type { Locale } from "@/lib/types";
import { useStudyState } from "./practice/usePractice";
import { statusOf } from "./Mastered";
import { Icon } from "./Icon";
import { Ill } from "./Ill";

export interface PathConcept { id: string; t: string; h: number }
export interface PathModuleView { id: string; t: string; concepts: PathConcept[] }
export interface PathPhaseView { id: string; t: string; goal: string; modules: PathModuleView[] }

/** "Fase 1 · Fundamentos" → "Fundamentos": the number is already drawn next to it. */
const shortName = (title: string) => title.split(" · ").pop() ?? title;

export function PathView({ phases, locale }: { phases: PathPhaseView[]; locale: Locale }) {
  const [s] = useStudyState();
  const es = locale === "es";
  const studied = (id: string) => statusOf(s, id) !== "none";
  const all = phases.flatMap((p) => p.modules.flatMap((m) => m.concepts.map((c) => ({ ...c, module: m, phase: p }))));
  const next = all.find((c) => !studied(c.id));
  const done = all.filter((c) => studied(c.id)).length;
  const started = done > 0;
  // Before the state loads (and on the server), the first module is "current", so a newcomer
  // sees exactly where to start.
  const currentModule = (s ? next?.module.id : undefined) ?? all[0]?.module.id;
  let n = 0;

  return (
    <>
      <section className="next-step">
        {next ? (
          <>
            <span className="hub-label">{started ? (es ? `Tu siguiente paso · ${done}/${all.length} estudiados` : `Your next step · ${done}/${all.length} studied`) : (es ? "Empieza aquí" : "Start here")}</span>
            <strong className="ns-title"><Ill id={next.id} size={44} className="ns-ill" />{next.t}</strong>
            <span className="hub-sub">{next.phase.t} · {next.module.t}</span>
            <div className="ns-actions">
              <Link className="btn btn-primary" href={`/${locale}/c/${next.id}/`}><Icon name="book" size={16} /> {started ? (es ? "Continuar" : "Continue") : (es ? "Empezar" : "Start")}</Link>
            </div>
          </>
        ) : (
          <>
            <span className="hub-label">{all.length}/{all.length}</span>
            <strong className="ns-title">{es ? "¡Ruta completa! Ahora, a mantenerla." : "Path complete! Now keep it fresh."}</strong>
            <div className="ns-actions"><Link className="btn btn-primary" href={`/${locale}/practice/play/?mode=daily`}><Icon name="cycle" size={16} /> {es ? "Repaso de hoy" : "Today's review"}</Link></div>
          </>
        )}
        <p className="ns-how">{es ? "Un concepto a la vez: léelo, pruébate y vuelve mañana al repaso." : "One concept at a time: read it, check yourself, come back tomorrow to review."}</p>
      </section>

      {phases.map((p, i) => (
        <section key={p.id} id={p.id} className="path-phase">
          <div className="phase-head">
            <h2><span className="ps-n">{i + 1}</span>{shortName(p.t)}</h2>
            <p>{p.goal}</p>
          </div>
          {p.modules.map((mod) => {
            const k = mod.concepts.filter((c) => studied(c.id)).length;
            const complete = k === mod.concepts.length;
            return (
              <details key={mod.id} className={`module-row${complete ? " complete" : ""}`} open={mod.id === currentModule}>
                <summary>
                  <span className="mr-t">{complete && <span className="mr-ok">✓</span>}{mod.t}</span>
                  {/* Progress only once a module has started: untouched ones stay quiet, not a wall of zeros. */}
                  {k > 0
                    ? <><span className="mr-count">{k}/{mod.concepts.length}</span><span className="mr-bar"><span style={{ width: `${Math.round((100 * k) / mod.concepts.length)}%` }} /></span></>
                    : <span className="mr-count mr-quiet">{mod.concepts.length}</span>}
                  <Icon name="right" size={16} className="mr-chev" />
                </summary>
                <ol className="module-list">
                  {mod.concepts.map((c) => {
                    n++;
                    const st = statusOf(s, c.id);
                    return (
                      <li key={c.id} style={{ ["--h" as string]: c.h }} className={c.id === next?.id ? "is-next" : st !== "none" ? "done" : undefined}>
                        <Link href={`/${locale}/c/${c.id}/`}>
                          <span className={`ml-n${st !== "none" ? " ok" : ""}`}>{st !== "none" ? "✓" : n}</span>
                          <Ill id={c.id} size={20} />
                          <span className="ml-t">{c.t}</span>
                          {c.id === next?.id && <span className="ml-next">{es ? "siguiente" : "next"}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
                {k > 0 && <Link className="btn module-practice" href={`/${locale}/practice/play/?mode=module&id=${mod.id}`}><Icon name="cards" size={15} /> {es ? "Practicar módulo" : "Practice module"}</Link>}
              </details>
            );
          })}
        </section>
      ))}
    </>
  );
}
