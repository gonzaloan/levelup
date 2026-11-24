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
