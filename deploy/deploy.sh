#!/usr/bin/env bash
# ============================================================
# Deploy level-up (Next.js static export) to levelup.skillrealm.dev
#
# Static site, NO backend (localStorage-only progress). Secure pattern:
#   private S3 bucket (all public access blocked) + CloudFront w/ Origin Access
#   Control (OAC) + ACM cert (us-east-1) + Route53 A/AAAA aliases +
#   a viewer-request CloudFront Function that rewrites trailing-slash URIs to
#   /.../index.html (Next `trailingSlash: true` export needs this on S3+OAC).
#
#   Prereqs: aws CLI configured; `npm run build` produces ./out.
#   Usage:   cd deploy && ./deploy.sh
#
#   DRYRUN=1 ./deploy.sh   -> print planned actions, no AWS calls.
# ============================================================
set -euo pipefail

REGION="us-east-1"                      # CloudFront + ACM live in us-east-1
DOMAIN="levelup.skillrealm.dev"
ZONE_ID="Z0821011BVH39BJ0FRT8"          # skillrealm.dev hosted zone
ACCOUNT="201735383261"
BUCKET="levelup-skillrealm-${ACCOUNT}"
CERT_ARN="arn:aws:acm:us-east-1:201735383261:certificate/6756a941-e697-41f3-b2f5-49b6b45c9c4c"
FUNC_NAME="levelup-rewrite"
CALLER_REF="levelup-$(git -C "$(dirname "$0")/.." rev-parse --short HEAD 2>/dev/null || echo init)"

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
OUT="$ROOT/out"

DRYRUN="${DRYRUN:-0}"
aws() {
  if [[ "$DRYRUN" == "1" ]]; then echo "DRYRUN: aws $*" >&2; return 0; fi
  command aws "$@"
}

echo "▶ Domain: $DOMAIN   Bucket: $BUCKET   Region: $REGION"

# 0) Sanity: the static export must exist.
if [[ ! -f "$OUT/index.html" ]]; then
  echo "✗ $OUT/index.html not found — run 'npm run build' first." >&2
  exit 1
fi

# 1) Private S3 bucket (idempotent). Block ALL public access; CloudFront OAC reads it.
if ! aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "▶ Creating bucket $BUCKET"
  # us-east-1 must NOT pass a LocationConstraint.
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION"
fi
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# 2) CloudFront Function to rewrite trailing-slash/clean URIs to index.html.
FUNC_ARN=""
if aws cloudfront describe-function --name "$FUNC_NAME" >/dev/null 2>&1; then
  ETAG=$(aws cloudfront describe-function --name "$FUNC_NAME" --query ETag --output text)
  aws cloudfront update-function --name "$FUNC_NAME" --if-match "$ETAG" \
    --function-config Comment="levelup uri rewrite",Runtime="cloudfront-js-2.0" \
    --function-code "fileb://$HERE/cf-rewrite.js" >/dev/null
  ETAG=$(aws cloudfront describe-function --name "$FUNC_NAME" --query ETag --output text)
else
  aws cloudfront create-function --name "$FUNC_NAME" \
    --function-config Comment="levelup uri rewrite",Runtime="cloudfront-js-2.0" \
    --function-code "fileb://$HERE/cf-rewrite.js" >/dev/null
  ETAG=$(aws cloudfront describe-function --name "$FUNC_NAME" --query ETag --output text)
fi
if [[ "$DRYRUN" != "1" ]]; then
  aws cloudfront publish-function --name "$FUNC_NAME" --if-match "$ETAG" >/dev/null || true
  FUNC_ARN=$(aws cloudfront describe-function --name "$FUNC_NAME" --query "FunctionSummary.FunctionMetadata.FunctionARN" --output text)
  echo "▶ CloudFront Function: $FUNC_ARN"
fi

# 3) Origin Access Control (idempotent by name).
OAC_ID=$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='levelup-oac'].Id | [0]" --output text 2>/dev/null || true)
if [[ -z "$OAC_ID" || "$OAC_ID" == "None" ]]; then
  OAC_ID=$(aws cloudfront create-origin-access-control --origin-access-control-config \
    "Name=levelup-oac,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
    --query "OriginAccessControl.Id" --output text)
fi
echo "▶ OAC: $OAC_ID"

# 4) CloudFront distribution — reuse if one already carries this alias, else create.
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Aliases.Items && contains(Aliases.Items, '$DOMAIN')].Id | [0]" \
  --output text 2>/dev/null || true)

S3_DOMAIN="${BUCKET}.s3.${REGION}.amazonaws.com"

if [[ -z "$DIST_ID" || "$DIST_ID" == "None" ]]; then
  echo "▶ Creating CloudFront distribution"
  cat > "$HERE/.dist-config.json" <<JSON
{
  "CallerReference": "$CALLER_REF-$(date +%s 2>/dev/null || echo 0)",
  "Aliases": { "Quantity": 1, "Items": ["$DOMAIN"] },
  "DefaultRootObject": "index.html",
  "Origins": { "Quantity": 1, "Items": [{
    "Id": "s3-$BUCKET",
    "DomainName": "$S3_DOMAIN",
    "OriginAccessControlId": "$OAC_ID",
    "S3OriginConfig": { "OriginAccessIdentity": "" }
  }]},
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-$BUCKET",
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true,
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "FunctionAssociations": { "Quantity": 1, "Items": [{
      "EventType": "viewer-request", "FunctionARN": "$FUNC_ARN"
    }]}
  },
  "CustomErrorResponses": { "Quantity": 1, "Items": [{
    "ErrorCode": 403, "ResponsePagePath": "/404.html",
    "ResponseCode": "404", "ErrorCachingMinTTL": 10
  }]},
  "Comment": "level-up (levelup.skillrealm.dev)",
  "ViewerCertificate": {
    "ACMCertificateArn": "$CERT_ARN",
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021"
  },
  "PriceClass": "PriceClass_100",
  "Enabled": true,
  "HttpVersion": "http2and3"
}
JSON
  if [[ "$DRYRUN" == "1" ]]; then
    echo "DRYRUN: would create-distribution with $HERE/.dist-config.json"
    DIST_ID="DRYRUN_DIST"
    DIST_DOMAIN="dryrun.cloudfront.net"
  else
    read -r DIST_ID DIST_DOMAIN < <(aws cloudfront create-distribution \
      --distribution-config "file://$HERE/.dist-config.json" \
      --query "[Distribution.Id, Distribution.DomainName]" --output text)
  fi
else
  echo "▶ Reusing distribution $DIST_ID"
  DIST_DOMAIN=$(aws cloudfront get-distribution --id "$DIST_ID" --query "Distribution.DomainName" --output text)
fi
echo "▶ Distribution: $DIST_ID ($DIST_DOMAIN)"

# 5) Bucket policy: allow ONLY this CloudFront distribution (OAC + SourceArn).
if [[ "$DRYRUN" != "1" ]]; then
  cat > "$HERE/.bucket-policy.json" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontServicePrincipal",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET/*",
    "Condition": { "StringEquals": {
      "AWS:SourceArn": "arn:aws:cloudfront::$ACCOUNT:distribution/$DIST_ID"
    }}
  }]
}
JSON
  aws s3api put-bucket-policy --bucket "$BUCKET" --policy "file://$HERE/.bucket-policy.json"
fi

# 6) Upload the out/ tree with correct content-types + cache headers.
#    HTML no-cache (so redeploys show immediately); hashed _next assets long-cache.
if [[ "$DRYRUN" != "1" ]]; then
  echo "▶ Syncing $OUT -> s3://$BUCKET"
  # Pass 1: immutable hashed assets (Next puts content hashes in _next/) long cache.
  aws s3 sync "$OUT" "s3://$BUCKET" --region "$REGION" \
    --exclude "*.html" --cache-control "public,max-age=31536000,immutable"
  # Pass 2: HTML no-cache.
  aws s3 sync "$OUT" "s3://$BUCKET" --region "$REGION" \
    --exclude "*" --include "*.html" --content-type "text/html" --cache-control "no-cache"
  # Pass 3: prune orphans (everything else already matches, only deletes removed files).
  aws s3 sync "$OUT" "s3://$BUCKET" --region "$REGION" --delete
fi

# 7) Route53 A + AAAA alias records -> CloudFront (Z2FDTNDATAQYW2 = CloudFront hosted zone).
if [[ "$DRYRUN" != "1" ]]; then
  cat > "$HERE/.dns.json" <<JSON
{
  "Comment": "levelup.skillrealm.dev -> CloudFront $DIST_ID",
  "Changes": [
    { "Action": "UPSERT", "ResourceRecordSet": {
      "Name": "$DOMAIN", "Type": "A",
      "AliasTarget": { "HostedZoneId": "Z2FDTNDATAQYW2", "DNSName": "$DIST_DOMAIN", "EvaluateTargetHealth": false }
    }},
    { "Action": "UPSERT", "ResourceRecordSet": {
      "Name": "$DOMAIN", "Type": "AAAA",
      "AliasTarget": { "HostedZoneId": "Z2FDTNDATAQYW2", "DNSName": "$DIST_DOMAIN", "EvaluateTargetHealth": false }
    }}
  ]
}
JSON
  aws route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" --change-batch "file://$HERE/.dns.json" \
    --query "ChangeInfo.Status" --output text
fi

# 8) Invalidate CDN.
if [[ "$DRYRUN" != "1" ]]; then
  aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" >/dev/null
fi

echo ""
echo "✅ Deploy submitted."
echo "   Distribution: $DIST_ID  ($DIST_DOMAIN)"
echo "   URL:          https://$DOMAIN"
echo "   (New distributions take ~5-15 min to fully deploy.)"
