#!/usr/bin/env bash
# ============================================================
# Weekly usage, with no tracking: how many accounts sync progress, and how many synced in the last
# 7 and 30 days. It reads only the last-sync time (`u`) of each item in the levelup sync table, with
# the table's fixed read capacity (no extra cost), and prints counts. Nothing personal is read or
# kept. Owner-run, with AWS credentials:
#
#   STACK=aws-study-guide REGION=us-east-1 ./deploy/usage.sh
#
# Only logged-in readers sync, so this undercounts everyone else: pair it with the waitlist form's
# count and Google Search Console (docs/business/stage-1.md).
# ============================================================
set -euo pipefail
STACK="${STACK:-aws-study-guide}"
REGION="${REGION:-us-east-1}"
TABLE="${TABLE:-$(aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='LevelupSyncTableName'].OutputValue | [0]" --output text | tr -d '\r')}"
[[ -z "$TABLE" || "$TABLE" == "None" ]] && { echo "✗ no LevelupSyncTableName output on $STACK" >&2; exit 1; }

# A small page size spreads the scan over the provisioned reads instead of bursting past them.
aws dynamodb scan --region "$REGION" --table-name "$TABLE" --projection-expression "u" \
  --page-size 25 --output json \
| node -e '
  let raw = ""; process.stdin.on("data", (d) => (raw += d)).on("end", () => {
    const items = JSON.parse(raw).Items ?? [], now = Date.now(), day = 86_400_000;
    const ts = items.map((i) => Number(i.u?.N ?? 0)).filter(Boolean);
    const since = (d) => ts.filter((t) => now - t <= d * day).length;
    console.log(`accounts syncing: ${ts.length} · active 7d: ${since(7)} · active 30d: ${since(30)} · ${new Date().toISOString().slice(0, 10)}`);
  });'
