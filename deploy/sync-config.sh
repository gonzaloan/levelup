#!/usr/bin/env bash
# ============================================================
# Write .env.production.local with the login/sync settings read from the get-certified stack
# (same Cognito user pool → same accounts). Run it before `npm run build`.
#
#   STACK=aws-study-guide REGION=us-east-1 ./deploy/sync-config.sh
#
# Needs the get-certified stack deployed WITH the levelup patch (deploy/get-certified/*.patch),
# which adds the LevelupClientId output and the /apps/{app}/state routes. Without that output the
# script writes nothing and the site builds local-only (login hidden), exactly as before.
# ============================================================
set -euo pipefail
STACK="${STACK:-aws-study-guide}"
REGION="${REGION:-us-east-1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

out() { aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue | [0]" --output text 2>/dev/null | tr -d '\r'; }

CLIENT="$(out LevelupClientId)"
DOMAIN="$(out CognitoHostedUiDomain)"
API="$(out ApiBaseUrl)"

if [[ -z "$CLIENT" || "$CLIENT" == "None" ]]; then
  echo "✗ $STACK has no LevelupClientId output: apply deploy/get-certified/*.patch and deploy that stack first." >&2
  echo "  Building without login (local-only progress) is still fine." >&2
  exit 1
fi

cat > "$ROOT/.env.production.local" <<ENV
NEXT_PUBLIC_COGNITO_DOMAIN=$DOMAIN
NEXT_PUBLIC_COGNITO_CLIENT_ID=$CLIENT
NEXT_PUBLIC_SYNC_API=$API
ENV
echo "✓ wrote .env.production.local (client $CLIENT, api $API). Now: npm run build && cd deploy && ./deploy.sh"
