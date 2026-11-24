# get-certified change: levelup sync on the shared login

`levelup-sync.diff` (base: get-certified `32fff48`) lets levelup sign in with get-certified's
accounts and sync study state **without any API or Lambda**: the browser gets one-hour AWS
credentials from an identity pool and reads/writes only its own item in a DynamoDB table.
get-certified's `npm run gate` and `cfn-lint` pass on it. Not yet deployed or tested live.

What it adds to `deploy/template.yaml` (only when `LevelupOrigin` is set, default
`https://levelup.skillrealm.dev`): a levelup app client on the same user pool, an identity pool
(signed-in users only), a role limited to the caller's own item (`dynamodb:LeadingKeys`), and a
**PROVISIONED** table at 5 read + 5 write units. Plus a `check:infra` rule (with self-tests) that
fails the gate if a table a browser can reach becomes on-demand, autoscaled or over 10 units.

## Worst case: under $5/month, by construction

Over capacity, DynamoDB throttles instead of billing. Prices: us-east-1 list, checked 2026-11-11.

| Item | Worst case per month |
|---|---|
| 5 WCU + 5 RCU | $0 inside the always-free 25 WCU + 25 RCU (get-certified's tables are on-demand, so it is unused); **≈ $2.85** without it |
| Storage | ≤ 400 KB per verified account; new accounts are capped by Cognito's daily email limit. Inside the 25 GB always-free |
| Identity pool | No charge |
| API Gateway, Lambda, logs | Not used |
| Hosting | $0 on CloudFront's Free flat-rate plan (no overage charges) |

Under a flood, sync slows (throttled) and each browser keeps its local copy and retries later.

## Apply (owner)

```bash
cd get-certified && git checkout -b feat/levelup-sync main
git apply ../levelup/deploy/get-certified/levelup-sync.diff
npm run gate
git commit -am "feat(infra): levelup sync on the shared login with a fixed cost ceiling"
```

Then: PR → merge → Actions `deploy-infra` → `site` (apply off, read the change set: it only adds
resources; then apply on).

### Fix: the CloudFormation role could not create the identity pool (2026-11-24)

The first apply failed and rolled back with `get-certified-cfn-exec is not authorized to perform:
cognito-identity:CreateIdentityPool`. The service role CloudFormation acts as (in
`github-oidc.yaml`, a separate stack) had no Cognito Identity rights. `cfn-exec-identity-pools.diff`
grants `cognito-identity:*` on this account's identity pools only. It is applied with
`setup-github-oidc.sh` (admin AWS CLI + GitHub CLI), not by `deploy-infra`:

```bash
cd get-certified && git checkout main && git pull
git apply ../levelup/deploy/get-certified/cfn-exec-identity-pools.diff
npm run gate
git commit -am "fix(infra): let the CloudFormation role manage levelup's identity pool"
git push
cd deploy && DRYRUN=1 ./setup-github-oidc.sh && ./setup-github-oidc.sh
```

Then run `deploy-infra` → `site` with apply on again.
