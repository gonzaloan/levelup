// Optional login + cross-device sync, reusing get-certified's Cognito user pool (same accounts).
// INERT without config: with no NEXT_PUBLIC_* values the site is exactly local-first, no network.
//
// Flow: OAuth 2 Authorization Code + PKCE (S256) against the Cognito Hosted UI → tokens in
// localStorage → GET/PUT `${api}/apps/levelup/state` with the id_token. The server stores one
// opaque blob per user; the browser owns the merge (union: nothing studied on any device is lost).
import { emptyState, loadState, merge, saveState, type CardRec, type StudyState } from "./practice/store";

export const SYNC_CONFIG = {
  domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "",
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
  api: process.env.NEXT_PUBLIC_SYNC_API ?? "",
};
export const syncEnabled = () => !!(SYNC_CONFIG.domain && SYNC_CONFIG.clientId && SYNC_CONFIG.api);

const TOK = "fg.auth.v1";
const PKCE = "fg.pkce";
const CSRF = "fg.oauth-state";
const RETURN = "fg.return-to";
export const AUTH_EVENT = "fg-auth";

interface Tokens { id_token: string; access_token?: string; refresh_token?: string }

const redirectUri = () => `${location.origin}/auth/`;

/* ------------------------------------------------------------------ helpers */
const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const randStr = (n: number) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return b64url(a.buffer); };
const sha256 = (s: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));

export function decodeJwt(t: string): Record<string, unknown> {
  try { return JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch { return {}; }
}
function getTokens(): Tokens | null {
  try { const t = JSON.parse(localStorage.getItem(TOK) ?? "null"); return t?.id_token ? t : null; } catch { return null; }
}
function setTokens(t: Tokens | null) {
  try { if (t) localStorage.setItem(TOK, JSON.stringify(t)); else localStorage.removeItem(TOK); } catch { /* ignore */ }
  try { window.dispatchEvent(new Event(AUTH_EVENT)); } catch { /* ignore */ }
}
export const isLoggedIn = () => !!getTokens();
export function accountEmail(): string | null {
  const t = getTokens();
  const e = t ? decodeJwt(t.id_token).email : null;
  return typeof e === "string" ? e : null;
}

/* ------------------------------------------------------------------ OAuth */
export async function login() {
  if (!syncEnabled()) return;
  const verifier = randStr(48), state = randStr(16);
  const challenge = b64url(await sha256(verifier));
  try {
    sessionStorage.setItem(PKCE, verifier);
    sessionStorage.setItem(CSRF, state);
    sessionStorage.setItem(RETURN, location.pathname + location.search);
  } catch { /* ignore */ }
  const q = new URLSearchParams({
    client_id: SYNC_CONFIG.clientId, response_type: "code", scope: "openid email",
    redirect_uri: redirectUri(), state, code_challenge_method: "S256", code_challenge: challenge,
  });
  location.assign(`${SYNC_CONFIG.domain}/oauth2/authorize?${q}`);
}

export function logout() {
  setTokens(null);
  if (!syncEnabled()) return;
  const q = new URLSearchParams({ client_id: SYNC_CONFIG.clientId, logout_uri: `${location.origin}/` });
  location.assign(`${SYNC_CONFIG.domain}/logout?${q}`);
}

/** Called on /auth/: trade the code for tokens, then pull+merge. Returns where to go next. */
export async function completeLogin(params: URLSearchParams): Promise<string> {
  const back = (() => { try { return sessionStorage.getItem(RETURN) || "/"; } catch { return "/"; } })();
  const code = params.get("code"), state = params.get("state");
  let verifier = "", expected = "";
  try { verifier = sessionStorage.getItem(PKCE) ?? ""; expected = sessionStorage.getItem(CSRF) ?? ""; } catch { /* ignore */ }
  if (!code || !verifier || !state || state !== expected) throw new Error("invalid login response");
  const r = await fetch(`${SYNC_CONFIG.domain}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: SYNC_CONFIG.clientId, code, redirect_uri: redirectUri(), code_verifier: verifier }),
  });
  if (!r.ok) throw new Error(`token exchange failed: ${r.status}`);
  setTokens(await r.json());
  try { sessionStorage.removeItem(PKCE); sessionStorage.removeItem(CSRF); } catch { /* ignore */ }
  await syncNow();
  return back.startsWith("/") ? back : "/";
}

async function freshIdToken(): Promise<string | null> {
  const t = getTokens();
  if (!t) return null;
  const exp = Number(decodeJwt(t.id_token).exp ?? 0) * 1000;
  if (exp > Date.now() + 60_000) return t.id_token;
  if (!t.refresh_token) { setTokens(null); return null; }
  const r = await fetch(`${SYNC_CONFIG.domain}/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: SYNC_CONFIG.clientId, refresh_token: t.refresh_token }),
  }).catch(() => null);
  if (!r || !r.ok) { setTokens(null); return null; }
  const nt = (await r.json()) as Tokens;
  nt.refresh_token = t.refresh_token; // Cognito does not re-issue it
  setTokens(nt);
  return nt.id_token;
}

/* ------------------------------------------------------------------ compact wire format
 * A DynamoDB item is capped at 400 KB. Cards as arrays of numbers (minutes, 3-decimal floats) keep
 * ~1,000 reviewed items around 60 KB instead of ~200 KB. */
type Packed = { v: 1; c: Record<string, number[]>; d: Record<string, number[]>; r: Record<string, number>; g: number; u: number };
const min = (iso?: string) => (iso ? Math.round(Date.parse(iso) / 60000) : 0);
const iso = (m: number) => (m ? new Date(m * 60000).toISOString() : undefined);
const r3 = (x: number) => Math.round(x * 1000) / 1000;

export function pack(s: StudyState): Packed {
  const c: Packed["c"] = {};
  for (const [k, v] of Object.entries(s.cards)) c[k] = [min(v.due), r3(v.stability), r3(v.difficulty), v.scheduled_days, v.reps, v.lapses, v.learning_steps, v.state, min(v.last_review)];
  const d: Packed["d"] = {};
  for (const [k, v] of Object.entries(s.days)) d[k] = [v.xp, v.n, v.ok];
  return { v: 1, c, d, r: s.read, g: s.goal, u: s.updatedAt };
}

export function unpack(p: Partial<Packed> | null | undefined): StudyState {
  const s = emptyState();
  if (!p || p.v !== 1) return s;
  for (const [k, a] of Object.entries(p.c ?? {})) {
    const card: CardRec = { due: iso(a[0])!, stability: a[1], difficulty: a[2], scheduled_days: a[3], reps: a[4], lapses: a[5], learning_steps: a[6], state: a[7], last_review: iso(a[8]) };
    s.cards[k] = card;
  }
  for (const [k, a] of Object.entries(p.d ?? {})) s.days[k] = { xp: a[0], n: a[1], ok: a[2] };
  s.read = { ...(p.r ?? {}) };
  s.goal = p.g ?? s.goal;
  s.updatedAt = p.u ?? 0;
  return s;
}

/* ------------------------------------------------------------------ sync */
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let lastSynced = 0;
export const lastSyncedAt = () => lastSynced;

/** Pull the server copy, merge it into this device, and push the union back. */
export async function syncNow(): Promise<boolean> {
  if (!syncEnabled()) return false;
  const tok = await freshIdToken();
  if (!tok) return false;
  const url = `${SYNC_CONFIG.api}/apps/levelup/state`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } }).catch(() => null);
  if (!res || !res.ok) return false;
  const remote = unpack((await res.json()) as Packed);
  const merged = merge(loadState(), remote);
  saveState(merged, { silent: true });
  const put = await fetch(url, { method: "PUT", headers: { Authorization: `Bearer ${tok}`, "content-type": "application/json" }, body: JSON.stringify(pack(merged)) }).catch(() => null);
  if (put?.ok) lastSynced = Date.now();
  try { window.dispatchEvent(new Event(AUTH_EVENT)); } catch { /* ignore */ }
  return !!put?.ok;
}

/** Debounced push after local study activity. */
export function schedulePush(delay = 4000) {
  if (!syncEnabled() || !isLoggedIn()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { void syncNow(); }, delay);
}
