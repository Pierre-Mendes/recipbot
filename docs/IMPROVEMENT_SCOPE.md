# RecipBot Improvement Scope & Targets

## Scope Tracks

1. Reliability
2. UX
3. Security
4. Delivery speed

## Measurable Targets

| Track | Metric | Target |
|---|---|---|
| Reliability | API latency (p95) | <= 200ms |
| Reliability | Frontend unhandled error rate | < 1% sessions |
| UX | Search feedback | <= 500ms (p95) |
| Security | High/Critical open vulnerabilities | 0 |
| Security | Secret leaks in CI scans | 0 |
| Delivery speed | Required CI lane duration (p95) | <= 15 minutes |
| Delivery speed | Release cadence | >= 1 release/week |

## Phase Order

- Phase A: Contract/doc alignment + backend envelope standardization
- Phase B: Frontend async/error UX + API adapters
- Phase C: Contract and edge-case test expansion
- Phase D: CI lane split, advisory scanning, promotion flow, runbooks
- Phase E: Final hardening and release checks

## Canonical API Envelope

- Success responses return:
  - `data`
  - optional `message`
  - optional `meta` (including `pagination` where relevant)
- Error responses keep Laravel defaults for:
  - `422` validation errors with `errors`
  - `401/403/404/429` semantic HTTP errors
