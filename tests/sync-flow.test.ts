// The signed-in sync path against a fake AWS: identity pool → signed DynamoDB calls on the
// caller's own item. Pins the request shapes the IAM policy in deploy/get-certified relies on.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyState, review, toRating, STUDY_KEY } from "@/lib/practice/store";

const POOL = "us-east-1_TestPool";
const IDENTITY = "us-east-1:0000-identity";
const TABLE = "aws-study-guide-levelup-sync";

type Call = { url: string; target: string; body: Record<string, unknown>; auth: string; token: string };

function fakeAws(opts: { throttleGet?: boolean } = {}) {
  const calls: Call[] = [];
  let stored: Record<string, unknown> | undefined;
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(String(input), init);
    const call: Call = {
      url: req.url, target: req.headers.get("x-amz-target") ?? "", body: JSON.parse((await req.text()) || "{}"),
      auth: req.headers.get("authorization") ?? "", token: req.headers.get("x-amz-security-token") ?? "",
    };
    calls.push(call);
    switch (call.target) {
      case "AWSCognitoIdentityService.GetId": return json({ IdentityId: IDENTITY });
      case "AWSCognitoIdentityService.GetCredentialsForIdentity":
        return json({ IdentityId: IDENTITY, Credentials: { AccessKeyId: "ASIATEST", SecretKey: "secret", SessionToken: "session", Expiration: Date.now() / 1000 + 3600 } });
      case "DynamoDB_20120810.GetItem":
        if (opts.throttleGet) return json({ __type: "com.amazonaws.dynamodb.v20120810#ProvisionedThroughputExceededException" }, 400);
        return json(stored ? { Item: stored } : {});
      case "DynamoDB_20120810.PutItem": stored = call.body.Item as Record<string, unknown>; return json({});
      case "DynamoDB_20120810.DeleteItem": stored = undefined; return json({});
    }
    return json({}, 404);
  });
  return { calls, fetchMock, ddb: () => calls.filter((c) => c.target.startsWith("DynamoDB")) };
}

const jwt = (claims: Record<string, unknown>) => `e30.${btoa(JSON.stringify(claims)).replace(/=+$/, "")}.sig`;

async function loadSync() {
  vi.resetModules();
  return import("@/lib/sync");
}

beforeEach(() => {
  const mem = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k),
  });
  vi.stubEnv("NEXT_PUBLIC_COGNITO_DOMAIN", "https://auth.example.test");
  vi.stubEnv("NEXT_PUBLIC_COGNITO_CLIENT_ID", "client");
  vi.stubEnv("NEXT_PUBLIC_COGNITO_USER_POOL_ID", POOL);
  vi.stubEnv("NEXT_PUBLIC_IDENTITY_POOL_ID", "us-east-1:pool");
  vi.stubEnv("NEXT_PUBLIC_SYNC_TABLE", TABLE);
  localStorage.setItem("fg.auth.v1", JSON.stringify({ id_token: jwt({ exp: Date.now() / 1000 + 3600, email: "a@b.c" }) }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("signed-in sync", () => {
  it("reads and writes only the caller's own item, signed, with the allowed attributes", async () => {
    const aws = fakeAws();
    vi.stubGlobal("fetch", aws.fetchMock);
    const s = emptyState();
    review(s, "rag.a1", toRating(1, 1), new Date("2026-11-09T10:00:00Z"));
    localStorage.setItem(STUDY_KEY, JSON.stringify(s));

    const sync = await loadSync();
    expect(sync.syncEnabled()).toBe(true);
    expect(await sync.syncNow()).toBe(true);

    const logins = aws.calls[0].body.Logins as Record<string, string>;
    expect(Object.keys(logins)).toEqual([`cognito-idp.us-east-1.amazonaws.com/${POOL}`]);
    const [get, put] = aws.ddb();
    expect(get.target).toBe("DynamoDB_20120810.GetItem");
    expect(get.body).toMatchObject({ TableName: TABLE, Key: { id: { S: IDENTITY } } });
    expect(get.auth).toMatch(/^AWS4-HMAC-SHA256 Credential=ASIATEST\/\d{8}\/us-east-1\/dynamodb\/aws4_request/);
    expect(get.token).toBe("session");
    expect(put.target).toBe("DynamoDB_20120810.PutItem");
    const item = put.body.Item as Record<string, Record<string, string>>;
    expect(item.id.S).toBe(IDENTITY);
    expect(Object.keys(item).every((k) => ["id", "s", "j", "u"].includes(k))).toBe(true);
    const back = await sync.decode(item);
    expect(back.cards["rag.a1"].reps).toBe(1);
  });

  it("does not write again when nothing changed (saves the fixed write capacity)", async () => {
    const aws = fakeAws();
    vi.stubGlobal("fetch", aws.fetchMock);
    const s = emptyState();
    s.read.rag = 1;
    localStorage.setItem(STUDY_KEY, JSON.stringify(s));
    const sync = await loadSync();
    await sync.syncNow();
    await sync.syncNow();
    expect(aws.ddb().map((c) => c.target.split(".")[1])).toEqual(["GetItem", "PutItem", "GetItem"]);
  });

  it("over capacity it gives up quietly and keeps the local copy", async () => {
    const aws = fakeAws({ throttleGet: true });
    vi.stubGlobal("fetch", aws.fetchMock);
    const s = emptyState();
    s.read.rag = 1;
    localStorage.setItem(STUDY_KEY, JSON.stringify(s));
    const sync = await loadSync();
    expect(await sync.syncNow()).toBe(false);
    expect(aws.ddb().map((c) => c.target)).toEqual(["DynamoDB_20120810.GetItem"]);
    expect(JSON.parse(localStorage.getItem(STUDY_KEY)!).read).toEqual({ rag: 1 });
  });

  it("delete removes only the caller's item", async () => {
    const aws = fakeAws();
    vi.stubGlobal("fetch", aws.fetchMock);
    const sync = await loadSync();
    expect(await sync.deleteSynced()).toBe(true);
    const [del] = aws.ddb();
    expect(del.body).toMatchObject({ TableName: TABLE, Key: { id: { S: IDENTITY } } });
  });

  it("a heavy learner's compressed state fits a small item", async () => {
    const sync = await loadSync();
    const s = emptyState();
    const now = new Date("2026-11-09T10:00:00Z");
    for (let i = 0; i < 1600; i++) review(s, `concept-number-${i}.a${i % 4}`, toRating(1, 1), now);
    const enc = await sync.encode(s);
    expect(enc.s?.B && atob(enc.s.B).length).toBeLessThan(40_000);
    expect((await sync.decode(enc)).cards["concept-number-7.a3"].reps).toBe(1);
  });
});
