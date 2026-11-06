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
npm run build        # strict content gate, then ./out (~380 static pages)
cd deploy && ./deploy.sh
```

`deploy.sh` is idempotent: it reuses the bucket, OAC, function, and (by matching
the alias) the distribution, so re-running just re-uploads `out/` and invalidates.
Upload uses typed passes — HTML `no-cache`, hashed `_next/*` assets
`max-age=31536000,immutable` — then a prune-only `--delete` sync to remove orphans.
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
