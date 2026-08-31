# Deployment Runbook

## Promotion flow

1. Merge to main after required quality gate passes.
2. Run **Promote Release** workflow targeting `staging`.
3. Validate staging:
   - `GET /health`
   - auth/login flow
   - recipe CRUD flow
   - search + tag suggestions
4. Promote the same ref to `production` with manual approval.

## Rollback

1. Select previous known-good ref.
2. Re-run **Promote Release** with that ref.
3. If schema is backward-compatible, deploy directly.
4. If schema is not backward-compatible, run manual rollback migration plan.

## Operational checklist

- Application health endpoint responds OK.
- Queue worker running and processing jobs.
- Scheduler running successfully.
- Database migration status verified.
- Cache and Redis connectivity verified.
- Error rate and latency monitored for at least 15 minutes after deploy.
