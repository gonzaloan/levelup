// Optional login + cross-device sync, reusing get-certified's Cognito user pool (same accounts).
// INERT without config: with no NEXT_PUBLIC_* values the site is exactly local-first, no network.
//
// Flow: OAuth 2 Authorization Code + PKCE (S256) against the Cognito Hosted UI → id_token →
// one-hour AWS credentials from an identity pool → the browser reads/writes ITS OWN item in a
// DynamoDB table (the IAM role allows only the caller's identity id as key).
//
// Why no API: the table is PROVISIONED with fixed capacity, so the monthly cost has a ceiling set
// by the template, whatever anyone sends (over capacity = throttled, not billed). An API Gateway +
// Lambda in front would bill every request. Budget: deploy/get-certified/README.md.
import { emptyState, loadState, merge, saveState, type CardRec, type StudyState } from "./practice/store";

export const SYNC_CONFIG = {
  domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "",
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID ?? "",
  identityPoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID ?? "",
  table: process.env.NEXT_PUBLIC_SYNC_TABLE ?? "",
};
export const syncEnabled = () => Object.values(SYNC_CONFIG).every(Boolean);
const region = () => SYNC_CONFIG.userPoolId.split("_")[0];

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
  if (!t) creds = null;
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

/* ------------------------------------------------------------------ AWS credentials
 * Kept in memory only: a page reload asks the identity pool again (free), so no AWS secret ever
 * sits in localStorage. */
interface Creds { accessKeyId: string; secretAccessKey: string; sessionToken: string; expiration: number; identityId: string }
let creds: Creds | null = null;

class AwsError extends Error { constructor(public status: number, public type: string) { super(`${status} ${type}`); } }

async function cognitoIdentity<T>(target: string, body: unknown): Promise<T> {
  const r = await fetch(`https://cognito-identity.${region()}.amazonaws.com/`, {
    method: "POST",
    headers: { "content-type": "application/x-amz-json-1.1", "x-amz-target": `AWSCognitoIdentityService.${target}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new AwsError(r.status, String((await r.json().catch(() => ({})))?.__type ?? ""));
  return r.json() as Promise<T>;
}

async function awsCreds(idToken: string): Promise<Creds> {
  if (creds && creds.expiration > Date.now() + 120_000) return creds;
  const Logins = { [`cognito-idp.${region()}.amazonaws.com/${SYNC_CONFIG.userPoolId}`]: idToken };
  const { IdentityId } = await cognitoIdentity<{ IdentityId: string }>("GetId", { IdentityPoolId: SYNC_CONFIG.identityPoolId, Logins });
  const { Credentials: c } = await cognitoIdentity<{ Credentials: { AccessKeyId: string; SecretKey: string; SessionToken: string; Expiration: number } }>(
    "GetCredentialsForIdentity", { IdentityId, Logins });
  creds = { accessKeyId: c.AccessKeyId, secretAccessKey: c.SecretKey, sessionToken: c.SessionToken, expiration: c.Expiration * 1000, identityId: IdentityId };
  return creds;
}

type Op = "GetItem" | "PutItem" | "DeleteItem";
async function ddb<T = Record<string, unknown>>(op: Op, body: Record<string, unknown>, c: Creds): Promise<T> {
  const { AwsClient } = await import("aws4fetch"); // signing code loads only for signed-in users
  const aws = new AwsClient({ accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey, sessionToken: c.sessionToken, service: "dynamodb", region: region() });
  const r = await aws.fetch(`https://dynamodb.${region()}.amazonaws.com/`, {
    method: "POST",
    headers: { "content-type": "application/x-amz-json-1.0", "x-amz-target": `DynamoDB_20120810.${op}` },
    body: JSON.stringify({ TableName: SYNC_CONFIG.table, ...body }),
  });
  if (!r.ok) throw new AwsError(r.status, String((await r.json().catch(() => ({})))?.__type ?? ""));
  return r.json() as Promise<T>;
}

/* ------------------------------------------------------------------ compact wire format
 * Cards as arrays of numbers (minutes, 3-decimal floats), then gzip: every write costs capacity by
 * the KB, so smaller items mean more syncs inside the fixed budget. */
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

/** What two states hold, ignoring when they were saved: equal content means no write is needed. */
const contentOf = (s: StudyState) => { const p = pack(s); return JSON.stringify([p.c, p.d, p.r, p.g]); };

const toB64 = (bytes: Uint8Array) => { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (b: string) => Uint8Array.from(atob(b), (ch) => ch.charCodeAt(0));

type Attr = { S?: string; B?: string; N?: string };
export async function encode(s: StudyState): Promise<Record<string, Attr>> {
  const json = JSON.stringify(pack(s));
  if (typeof CompressionStream === "undefined") return { j: { S: json } };
  const gz = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
  return { s: { B: toB64(new Uint8Array(await new Response(gz).arrayBuffer())) } };
}
export async function decode(item: Record<string, Attr> | undefined): Promise<StudyState> {
  if (item?.s?.B) {
    const raw = new Blob([fromB64(item.s.B)]).stream().pipeThrough(new DecompressionStream("gzip"));
    return unpack(JSON.parse(await new Response(raw).text()));
  }
  if (item?.j?.S) return unpack(JSON.parse(item.j.S));
  return emptyState();
}

/* ------------------------------------------------------------------ sync */
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let lastSynced = 0;
export const lastSyncedAt = () => lastSynced;

/** Pull this account's copy, merge it into this device, and write the union back if it changed. */
export async function syncNow(retry = true): Promise<boolean> {
  if (!syncEnabled()) return false;
  const tok = await freshIdToken();
  if (!tok) return false;
  try {
    const c = await awsCreds(tok);
    const Key = { id: { S: c.identityId } };
    const got = await ddb<{ Item?: Record<string, Attr> }>("GetItem", { Key }, c);
    const remote = await decode(got.Item);
    const merged = merge(loadState(), remote);
    saveState(merged, { silent: true });
    if (!got.Item || contentOf(merged) !== contentOf(remote)) {
      await ddb("PutItem", { Item: { ...Key, ...(await encode(merged)), u: { N: String(Date.now()) } } }, c);
    }
    lastSynced = Date.now();
    try { window.dispatchEvent(new Event(AUTH_EVENT)); } catch { /* ignore */ }
    return true;
  } catch (e) {
    if (e instanceof AwsError) {
      // Over the table's fixed capacity: that is the cost ceiling working. Try again later.
      if (e.type.endsWith("ProvisionedThroughputExceededException") || e.type.endsWith("ThrottlingException")) schedulePush(120_000);
      else if (retry && (e.type.endsWith("ExpiredTokenException") || e.status === 403)) { creds = null; return syncNow(false); }
    }
    return false;
  }
}

/** Delete this account's synced copy (this device keeps its local progress). */
export async function deleteSynced(): Promise<boolean> {
  const tok = syncEnabled() ? await freshIdToken() : null;
  if (!tok) return false;
  try {
    const c = await awsCreds(tok);
    await ddb("DeleteItem", { Key: { id: { S: c.identityId } } }, c);
    lastSynced = 0;
    return true;
  } catch { return false; }
}

/** Debounced push after local study activity: one write per burst of answers, not per answer. */
export function schedulePush(delay = 30_000) {
  if (!syncEnabled() || !isLoggedIn()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { void syncNow(); }, delay);
}
