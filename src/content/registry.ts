// Content registry. Merges the General track (data/general-l5.json) and the
// flagship AI track (data/ai-l5.json). Both always exist so the app builds and
// the full flow is demonstrable.
import type { Item, Module, Sjt, FieldWork } from "@/lib/types";
import general from "./data/general-l5.json";
import ai from "./data/ai-l5.json";

type Bundle = {
  items?: Item[];
  modules?: Module[];
  rooms?: Sjt[];
  fieldwork?: FieldWork[];
};

const gen = general as unknown as Bundle;
const aiTrack = ai as unknown as Bundle;

export const ITEMS: Item[] = [...(gen.items ?? []), ...(aiTrack.items ?? [])];
export const MODULES: Module[] = [...(gen.modules ?? []), ...(aiTrack.modules ?? [])];
export const ROOMS: Sjt[] = [...(gen.rooms ?? []), ...(aiTrack.rooms ?? [])];
export const FIELDWORK: FieldWork[] = [...(gen.fieldwork ?? []), ...(aiTrack.fieldwork ?? [])];

export const ITEMS_BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
export const MODULES_BY_ID = new Map(MODULES.map((m) => [m.id, m]));
export const ROOMS_BY_ID = new Map(ROOMS.map((r) => [r.id, r]));
export const FIELDWORK_BY_ID = new Map(FIELDWORK.map((f) => [f.id, f]));
