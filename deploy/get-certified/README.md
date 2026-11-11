# get-certified patch: levelup sync on the shared login

`levelup-sync.diff` adds per-app state routes to get-certified's progress API, so levelup can sync
with the same Cognito accounts without touching get-certified progress or its leaderboard.
`npm run gate` passed on it (base: get-certified `3df065b`). Not yet deployed or tested live.

What it adds: `GET|PUT /apps/{app}/state` (allowlist `levelup`, 300 KB cap, row `<sub>#app:levelup`,
no `scores`), export/delete coverage, a second app client on the same pool, its JWT audience and
CORS origins, a throttle on the PUT and the `LevelupClientId` output. Cost and worst case are in
the patch's `deploy/README.md` section.

## Apply (owner)

```bash
cd get-certified && git checkout -b feat/levelup-sync main
git apply ../levelup/deploy/get-certified/levelup-sync.diff
npm run gate
git commit -am "feat(lambda): per-app progress state routes for levelup on the shared login"
```

Then: PR → merge → Actions `deploy-infra` → `site` (apply off, read the change set: no replacement
of `UserPoolClient` or `ProgressTable`; then apply on).

## Turn it on in levelup

```bash
./deploy/sync-config.sh   # writes .env.production.local from the stack outputs
npm run build && cd deploy && ./deploy.sh
```
