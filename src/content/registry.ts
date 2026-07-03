// Content registry. The content fleet writes into data/general-l5.json (which
// always exists — seeded with a small hand-authored fallback so the app builds
// and the full flow is demonstrable before the fleet lands).
import type { Item, Module, Sjt, FieldWork } from "@/lib/types";
import data from "./data/general-l5.json";

const gen = data as unknown as {
  items: Item[];
  modules: Module[];
  rooms: Sjt[];
  fieldwork: FieldWork[];
};

export const ITEMS: Item[] = gen.items ?? [];
export const MODULES: Module[] = gen.modules ?? [];
export const ROOMS: Sjt[] = gen.rooms ?? [];
export const FIELDWORK: FieldWork[] = gen.fieldwork ?? [];

export const ITEMS_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
export const MODULES_BY_ID = new Map(MODULES.map((m) => [m.id, m]));
export const ROOMS_BY_ID = new Map(ROOMS.map((r) => [r.id, r]));
export const FIELDWORK_BY_ID = new Map(FIELDWORK.map((f) => [f.id, f]));
