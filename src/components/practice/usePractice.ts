"use client";
import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/types";
import type { PracticeData } from "@/lib/practice/types";
import { loadState, saveState, STUDY_EVENT, type StudyState } from "@/lib/practice/store";

const loaders: Record<Locale, () => Promise<{ default: unknown }>> = {
  en: () => import("@/generated/practice-en.json"),
  es: () => import("@/generated/practice-es.json"),
};
const cache: Partial<Record<Locale, PracticeData>> = {};

/** The item bank (lazy chunk) for a locale. */
export function usePracticeData(locale: Locale) {
  const [data, setData] = useState<PracticeData | null>(cache[locale] ?? null);
  useEffect(() => {
    if (cache[locale]) return;
    loaders[locale]().then((m) => { cache[locale] = m.default as PracticeData; setData(cache[locale]!); });
  }, [locale]);
  return data;
}

/** The learner's state, kept in sync across components and tabs. null until mounted (no SSR mismatch). */
export function useStudyState() {
  const [state, setState] = useState<StudyState | null>(null);
  useEffect(() => {
    const sync = () => setState(loadState());
    sync();
    window.addEventListener(STUDY_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(STUDY_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const update = useCallback((fn: (s: StudyState) => void) => {
    const s = loadState();
    fn(s);
    saveState(s);
    setState({ ...s });
  }, []);
  return [state, update] as const;
}
