# level-up deploy — levelup.skillrealm.dev

Static Next.js export (`output: "export"`, `trailingSlash: true`) served from a
private S3 bucket via CloudFront (OAC) + ACM + Route53. **No backend** — all
learner progress is localStorage-only. Same secure static pattern as
`skillrealm-hub` and `get-certified`, adapted for a multi-page export.

- **Live:** https://levelup.skillrealm.dev
- **Bucket:** `levelup-skillrealm-201735383261` (all public access blocked)
- **CloudFront:** `EKDH4IJNSZLJQ` (`d35hq3kusnik6q.cloudfront.net`), PriceClass_100, OAC `levelup-oac`
- **ACM cert (us-east-1):** `6756a941-e697-41f3-b2f5-49b6b45c9c4c` (`levelup.skillrealm.dev`, DNS-validated)
- **Route53:** zone `Z0821011BVH39BJ0FRT8` (`skillrealm.dev`), A + AAAA aliases → CloudFront
- **CloudFront Function `levelup-rewrite`** (viewer-request, `cf-rewrite.js`): rewrites
  `/` → `/index.html` and extensionless / trailing-slash URIs → `/…/index.html`, which
  S3+OAC can't resolve on its own for `trailingSlash: true` exports.
- **403 → /404.html** (S3 returns 403 for missing keys under OAC).

## Deploy

```bash
npm run build        # strict content gate, then ./out (~870 static pages) and the offline lists
cd deploy && ./deploy.sh
```

`deploy.sh` is idempotent: it reuses the bucket, OAC, function, and (by matching
the alias) the distribution, so re-running just re-uploads `out/` and invalidates.
Upload uses typed passes — HTML, the service worker (`sw.js`), its file lists
(`offline-*.json`), the manifest and the page payloads (`index.txt`) `no-cache`; hashed
`_next/*` assets `max-age=31536000,immutable`; everything else one day — then a prune-only
`--delete` sync to remove orphans.
`DRYRUN=1 ./deploy.sh` prints planned AWS actions without calling AWS.

## Deploy from CI (automatic on every push to `main`)

`.github/workflows/ci.yml` runs `verify`, then `build` + `e2e`; on a push to `main`, once both are
green, its `deploy` job builds with the login settings, runs `SITE_ONLY=1 deploy/deploy.sh`
(upload + invalidation only) and waits until the live `offline-es.json` reports this build. It uses
a short-lived OIDC role, never stored keys. Until the role is configured the job is skipped and
`main` stays green. One-time setup (≈ 10 minutes):

1. **AWS role** (`deploy/github-oidc.yaml`: can only sync this bucket and invalidate this
   distribution). If get-certified already created the account's GitHub OIDC provider, reuse it:
   ```bash
   aws iam list-open-id-connect-providers
   ```
   ```bash
   aws cloudformation deploy --region us-east-1 --stack-name levelup-github-oidc \
     --template-file deploy/github-oidc.yaml --capabilities CAPABILITY_NAMED_IAM \
     --parameter-overrides ExistingOidcProviderArn=arn:aws:iam::201735383261:oidc-provider/token.actions.githubusercontent.com
   ```
   (If the list was empty, drop the `--parameter-overrides` line: the stack creates the provider.)
   The role trusts the token's `sub`, and this repo uses GitHub's **immutable subject**
   (`repo:gonzaloan@18615019/levelup@1301843917:environment:production`), the template's default.
   If `configure-aws-credentials` says "Not authorized to perform sts:AssumeRoleWithWebIdentity",
   compare `gh api repos/gonzaloan/levelup/actions/oidc/customization/sub` (its `sub_claim_prefix`)
   with the role's trust condition and pass `GitHubRepo=<prefix without "repo:">` if they differ.
   ```bash
   aws cloudformation describe-stacks --region us-east-1 --stack-name levelup-github-oidc \
     --query "Stacks[0].Outputs[?OutputKey=='SiteDeployRoleArn'].OutputValue" --output text
   ```
2. **GitHub environment:** repository Settings → Environments → New environment `production` →
   Deployment branches and tags: *Selected branches*, add `main`. The role trusts only jobs in this
   environment.
3. **GitHub variables** (Settings → Secrets and variables → Actions → *Variables*, not secrets: all
   of these are public, they end up in the browser bundle):
   - `AWS_DEPLOY_ROLE_ARN` — the output of step 1.
   - `NEXT_PUBLIC_COGNITO_DOMAIN`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_COGNITO_USER_POOL_ID`,
     `NEXT_PUBLIC_IDENTITY_POOL_ID`, `NEXT_PUBLIC_SYNC_TABLE` — copy them from your
     `.env.production.local` (`deploy/sync-config.sh` writes it), or with the GitHub CLI:
     ```bash
     gh variable set --env-file .env.production.local --repo gonzaloan/levelup
     ```
   - `NEXT_PUBLIC_PRO_FORM_URL` — leave it unset until the waitlist form exists (`/pro` then says
     the list opens soon).
4. Push to `main` (or re-run the last workflow): Actions shows `gate`, `site` and `deploy`.

Manual deploys keep working (`npm run build` then `cd deploy && ./deploy.sh`), and are still
the way to change infrastructure; CI never creates or changes it.

## Notes / gotchas

- Run on Windows git-bash: `HERE_W` (`pwd -W`) supplies native `C:\…` paths for
  `file://`/`fileb://` args, and CloudFront `--output text` values are stripped of
  `\r` before use (a trailing CR corrupts the Route53 change-batch JSON otherwise).
- The root `/` redirects client-side to `/es/` (or `/en/` for English browsers); `<html lang>`
  and the theme are set by an inline boot script in `src/app/layout.tsx` before first paint.
- Canonical/OG URLs are baked from `metadataBase` in `src/app/layout.tsx`
  (`https://levelup.skillrealm.dev`). If the domain changes, update it and rebuild.
- **2026-11 rewrite:** the old routes (`/path`, `/lesson/*`, `/codex`, `/assess`, …) no longer
  exist. The prune-only `--delete` sync removes them from the bucket; old links land on `404.html`.

## Offline mode and its kill switch

`public/sw.js` is a service worker: pages a reader has visited keep working offline, and
"Save for offline" (footer) downloads the whole guide in one language (~20 MB, about 800
requests, once). It only handles same-origin GETs; sign-in and sync never pass through it. Pages are
network-first, so a deploy shows up on the next online visit. It costs nothing in AWS: the files
are the same static objects, served by the same CloudFront plan.

A bug in a service worker outlives the deploy that fixes it, because browsers keep running the
old one until they fetch a new `sw.js`. If it ever misbehaves:

```bash
cp deploy/sw-kill.js public/sw.js
```

```bash
npm run build && cd deploy && ./deploy.sh
```

Every browser that checks for an update then drops its caches, unregisters the worker and reloads
from the network. Restore the real worker with `git checkout public/sw.js` once the fix is ready.
On localhost the worker is off; `localStorage.setItem("fg.sw", "on")` turns it on.

`npm run brand` re-renders `public/og.png` (the link preview image) and the app icons; run it only
when the brand changes (needs Chromium) and commit the result.

## Login and progress sync (optional)

Signed out, progress stays in the browser. Sign-in reuses **get-certified's Cognito user pool**
(same accounts). The browser then gets one-hour AWS credentials from an identity pool and reads
and writes only its own item in a small DynamoDB table: no API, no Lambda, no logs.

**Cost ceiling: $5/month, never more.** The table is provisioned at a fixed 5 read + 5 write
units with no autoscaling, so traffic over that is throttled, not billed: $0 inside DynamoDB's
always-free tier, about $2.85/month without it (us-east-1, checked 2026-11-11). get-certified's
`check:infra` fails if that table ever becomes on-demand, autoscaled or bigger. Full math:
`deploy/get-certified/README.md`. Hosting: put this site's CloudFront distribution on the
**Free flat-rate plan** (CloudFront console → the distribution → pricing plan): $0, no overage
charges (1M requests / 100 GB a month allowance; past it delivery may slow, never bill). Its
CloudFront Function (`cf-rewrite.js`) must not be shared with another distribution.

1. In the get-certified repo, apply `deploy/get-certified/levelup-sync.diff` and deploy that
   stack's infrastructure (steps in that folder's README).
2. Here, write the build config from that stack's outputs, then build and deploy as usual:

   ```bash
   ./deploy/sync-config.sh && npm run build && cd deploy && ./deploy.sh
   ```

Without step 1 the script refuses and the site keeps working local-only (no login button).
