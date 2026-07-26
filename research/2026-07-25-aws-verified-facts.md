# AWS platform facts — verified 2026-07-25 (fetch-verified against docs.aws.amazon.com)

Verification pass by a research subagent. Every row was fetched. `UNVERIFIED` marks a claim
whose *existence* is confirmed but whose detail (usually a launch date, or a JS-rendered
price table) could not be extracted from an official page — treat those as "do not assert".

**This file is the source of truth for any AWS claim we publish.** If a lesson or resource
contradicts it, the lesson is wrong.

## Highest-consequence corrections for curriculum content

1. **Graviton5 is current, not Graviton4.** M9g/M9gd GA 2026-06-10, C9g/C9gd GA 2026-06-30
   (+25% vs Graviton4; 192 cores, 5× larger cache, up to 33% lower inter-core latency).
   Any content saying "Graviton4 is the latest" is stale.
2. **Aurora Limitless is NOT deprecated.** Release 16.13.101 shipped 2026-07-13. Zero
   deprecation banners across 3 doc pages incl. release notes. GA was 16.4.103 (2024-10-31).
   Requires I/O-Optimized; no Global Database / Blue-Green / RDS Proxy / zero-ETL.
3. **Security Hub split is real.** The legacy service is now **AWS Security Hub CSPM**; the new
   **Security Hub** is a v2 console with an **Essentials plan + add-ons**, per-resource pricing,
   attack-path visualization. Exact GA date UNVERIFIED. Naming matters in diagrams.
4. **Three new compute billing models are live** (re:Invent 2025 timing UNVERIFIED):
   - **ECS Managed Instances** — per-instance management fee, per-second, 1-min minimum, on top
     of EC2. **RIs/Savings Plans do NOT offset the management fee.** Not covered by GuardDuty
     ECS Runtime Monitoring.
   - **Lambda Managed Instances** — $0.20/M requests + **15% premium on EC2 on-demand** + EC2
     charges (Compute SP/RIs apply). **No per-request duration billing.**
   - **Lambda Durable Functions** — executions up to **1 year**, checkpoint/replay,
     `DurableContext`. $8.00/M operations, $0.25/GB written, $0.15/GB-month retained;
     retention 1–90 days (default 14). Waits incur no duration charge on on-demand.
5. **Route 53 Global Resolver is GA and expensive at baseline** — first 2 Regions bundled at
   **$5.00/hr** ($4.50 without DNS filtering), +$1.50/hr per extra Region, $1.50/M queries
   beyond 1B/mo. Its launch forced the rename **Route 53 Resolver → Route 53 VPC Resolver**.
6. **Use FOCUS 1.2** (not 1.0) for new Data Exports.
7. **DynamoDB global tables MRSC** is an architecture-time decision, not a retrofit: exactly
   3 Regions (3 replicas, or 2 + a **witness**), consistency mode **immutable after creation**,
   source table **must be empty** to convert, region sets cannot be spanned
   (US iad/cmh/pdx · EU dub/lhr/cdg/fra · AP nrt/icn/kix). **No TTL, no LSIs, no transactions,
   no ReplicationLatency metric**; `ReplicatedWriteConflictException` on concurrent cross-Region
   item writes. RPO 0.

## Governance

| Item | Status | Detail |
|---|---|---|
| Organizations **RCPs** | VERIFIED | re:Invent 2024. Deny-only guardrail on **resources** (SCPs act on principals). ~44 services incl. S3, KMS, STS, SQS, DynamoDB, Secrets Manager. No effect on management-account resources or service-linked roles. |
| **Declarative policies** | VERIFIED (existence) | re:Invent 2024. `DECLARATIVE_POLICY_EC2` — EC2/EBS/VPC config enforced at the **control plane**. Launch What's-New URL 404s. |
| Control Tower | VERIFIED current | **No deprecation notice.** Doc explicitly references SCPs **and RCPs**. |
| Landing Zone Accelerator | VERIFIED | **v1.15.5, released 6/2026.** 35+ services, GovCloud/non-standard partitions, works with or without Control Tower. |
| Account Factory for Terraform | VERIFIED | Not deprecated. Now supports HCP Terraform/Enterprise/Community + CodeConnections (not just CodeCommit). |
| IAM Access Analyzer | VERIFIED | Six capabilities: external access, **internal access**, **unused access**, policy validation, custom policy checks, policy generation. Internal-access resources: S3 (incl. directory buckets), RDS snapshots, DynamoDB tables/streams. Unused priced per role/user; internal per resource. |
| GuardDuty **Extended Threat Detection** | VERIFIED | **On by default, no extra cost.** Attack-sequence findings (always Critical), 24h rolling window: `AttackSequence:S3/…`, `:EKS/CompromisedCluster`, `:ECS/CompromisedCluster`, `:EC2/CompromisedInstanceGroup`. |

## Cost

| Item | Status | Detail |
|---|---|---|
| Data Exports **FOCUS** | VERIFIED | **FOCUS 1.2 and 1.0** both selectable. Standard export tables: CUR 2.0, Cost Optimization Hub recommendations, FOCUS 1.2, FOCUS 1.0, carbon emissions. |
| Cost Optimization Hub | VERIFIED | 25+ resource types incl. RDS/Aurora storage, ElastiCache, MemoryDB, DynamoDB, DocumentDB, OpenSearch/Redshift RIs, SageMaker, WorkSpaces, **NAT Gateway**. Adds a cost-efficiency metric. |
| Compute Optimizer | VERIFIED | Feeds rightsizing/idle recs **into** Cost Optimization Hub; savings estimates now consistent across both. |
| Savings Plans vs RIs | VERIFIED | SP types: **Compute** (EC2+Fargate+Lambda, any family/size/OS/tenancy/Region), **EC2 Instance**, **SageMaker AI**. 1yr/3yr; All/Partial/No upfront; up to 72%. RIs persist for RDS/ElastiCache/MemoryDB/OpenSearch/Redshift/DynamoDB. |
| S3 Intelligent-Tiering | VERIFIED | Monthly monitoring+automation charge; **no retrieval charges, no inter-tier transition charges**; 3 low-latency tiers + optional async archive tiers. AWS-recommended default for unknown patterns, "independent of object size or retention period". |
| Public IPv4 charge | VERIFIED | **$0.005/IP/hour since 2024-02-01**, identical in-use and idle. BYOIP exempt. EC2 free tier: 750 h/mo for 12 months. |
| Cross-AZ transfer rate | **UNVERIFIED** | Rate table is JS-rendered. Do not quote a per-GB figure. Related verified fact: **VPC Lattice has no inter-AZ data transfer charges**. |

## Network

| Item | Status | Detail |
|---|---|---|
| VPC Lattice | VERIFIED | Service networks; services (target group/listener/rule); auth policies; **resource gateways + resource configurations** (RDS/IP/domain targets); service-network VPC endpoint reaches on-prem via DX/VPN; AZ affinity; **no inter-AZ charges**. Auth policies do **not** apply to resource configurations. |
| PrivateLink | VERIFIED | Powers Lattice service-network endpoints; also an S3 Intelligent-Tiering supported feature. |
| Transit Gateway | VERIFIED | TGW route-table attachments are a Cloud WAN attachment type; TGW traffic reaches Lattice via endpoints. |
| Cloud WAN | VERIFIED (existence) | Managed via Network Manager (`networkmanager` API). Core network + versioned policy, global segments, attachment policies, network function groups. Doc body rendered title-only → concept detail UNVERIFIED. |
| VPC IPAM | VERIFIED | Routing/security domains, org-wide tracking, auto-CIDR allocation by business rules, BYOIP cross-Region/cross-account sharing, **Amazon-provided contiguous IPv6 CIDRs**. |
| Network Firewall | UNVERIFIED depth | Referenced by LZA/Lattice defense-in-depth; dedicated page not fetched. |
| **Route 53 Global Resolver** | VERIFIED GA | See correction #5. Confirmed by the rename note: "Route 53 VPC Resolver was previously called Route 53 Resolver, but was renamed when Route 53 Global Resolver was introduced." 30-day free trial (first 2 Regions, filtering included), pro-rated. |

## Compute

| Item | Status | Detail |
|---|---|---|
| EKS **Auto Mode** | VERIFIED | re:Invent 2024 (exact date UNVERIFIED). Karpenter autoscaling, Bottlerocket immutable AMIs, **21-day max node lifetime**, no SSH/SSM, built-in LB/EBS/DNS/GPU/Pod Identity. Runs on **EC2 managed instances**; since **2026-04-22** these are hidden by default from EC2 console/API list ops. |
| ECS Managed Instances | VERIFIED | See correction #4. AWS-operated EC2 in your VPC via capacity provider. Example: us-west-2 c6a.2xlarge $0.306 EC2 + $0.037 fee. |
| Lambda Managed Instances | VERIFIED | See correction #4. |
| Lambda Durable Functions | VERIFIED | See correction #4. SDKs: JS/TS, Python, Java (separate AWS Durable Execution SDK guide). |
| Lambda SnapStart | VERIFIED | **Java 11+, Python 3.12+, .NET 8+ only** — Node.js/Ruby/OS-only/container images NOT supported. Published versions/aliases only; incompatible with provisioned concurrency, EFS, >512MB ephemeral. **Free for Java**; caching+restore charges otherwise. All commercial Regions except AP (New Zealand) and AP (Taipei). |
| Karpenter | VERIFIED | The autoscaler underlying EKS Auto Mode (NodePools/NodeClasses; consolidation). |
| EKS Hybrid Nodes | VERIFIED GA | On-prem/edge nodes on an AWS-hosted control plane; **per-vCPU-hour** while attached. All Regions except GovCloud + China. Up to 15 remote-node and 15 remote-pod CIDRs. **Not for DDIL** (use EKS Anywhere); not supported on EC2/Outposts/Local Zones/other clouds. |

## Data

| Item | Status | Detail |
|---|---|---|
| S3 Tables | VERIFIED | re:Invent 2024. New **table bucket** type storing **Apache Iceberg** tables; auto compaction / snapshot mgmt / unreferenced-file removal; `s3tables` namespace; Glue Data Catalog integration. Added since launch: **Iceberg V3**, **table replication**, **Intelligent-Tiering for tables**, IPv6. |
| S3 Metadata | VERIFIED | Read-only managed Iceberg tables in an AWS-managed `aws-s3` table bucket. **Three** tables: **journal** (required, retention ≥7 days), **live inventory** (optional, backfill ≥15 min, monthly fee >1B objects), **annotation** (optional). |
| S3 Vectors | VERIFIED | Vector buckets / vector indexes / vectors; `s3vectors` namespace; **strongly consistent writes**; sub-second (as low as 100 ms) queries; metadata filtering; Block Public Access always on and non-disableable. Integrates with OpenSearch (incl. snapshot export to Serverless) and Bedrock Knowledge Bases. |
| SageMaker Lakehouse | VERIFIED | Unifies S3 data lakes + Redshift via Iceberg and a shared catalog (Glue Data Catalog + Lake Formation); the query path for S3 Tables / S3 Metadata. |
| DynamoDB global tables **MRSC** | VERIFIED | See correction #7. |
| Aurora Limitless | VERIFIED alive | See correction #2. Available in all Regions except AP (Taipei); standard Aurora PostgreSQL lifecycle. |
| Aurora DSQL | VERIFIED GA | PostgreSQL-compatible, active-active, 99.99% single-Region / 99.999% multi-Region. **GA date UNVERIFIED** (May 2025 widely cited but not confirmed on an AWS page — do not assert it). |
