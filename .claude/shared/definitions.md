# Definitions & Metrics - Shared Context

## 📊 Coverage Definitions

### Code Coverage
**Definição**: Percentual de linhas/branches de código executadas por testes automatizados.

**Backend (PHP/Laravel)**
- **Target**: 80% (minimum)
- **Measurement**: PHPUnit + phpunit.xml coverage
- **Scope**: app/ directory only
- **Exclusions**: Migrations, seeding code, bootstrap files
- **Branches**: Deve incluir linha E branch coverage
- **Tools**: PHPUNIT_COVERAGE_CLOVER.xml artifact

**Frontend (TypeScript/Vue)**
- **Target**: 70% (minimum)
- **Measurement**: Vitest + coverage reports
- **Scope**: src/ directory (components, stores, composables)
- **Exclusions**: node_modules, dist, .d.ts files
- **Branches**: Line + branch coverage required
- **Tools**: Vitest --coverage with LCOV reporter

**E2E Coverage**
- **Target**: Critical user flows (login, CRUD, search)
- **Measurement**: Playwright test suite count
- **Minimum scenarios**: 7+ distinct user journeys
- **Tools**: Playwright reporter (HTML + JSON)

---

## 🎯 Quality Gates

### What is a Quality Gate?
Gate = Automated check that MUST pass before merge/deploy. Single failure blocks PR.

### Backend Quality Gates

| Gate | Tool | Threshold | Consequence |
|------|------|-----------|-------------|
| **Test Coverage** | PHPUnit | ≥80% | PR blocked |
| **Static Analysis** | PHPStan | Level 8 | PR blocked |
| **Linting** | Pint | 0 errors | PR blocked |
| **Security** | Semgrep | 0 critical | PR blocked |
| **Dependency Audit** | composer audit | 0 known | Warning (continue-on-error) |

### Frontend Quality Gates

| Gate | Tool | Threshold | Consequence |
|------|------|-----------|-------------|
| **Test Coverage** | Vitest | ≥70% | PR blocked |
| **Linting** | ESLint | 0 errors | PR blocked |
| **Type Check** | TypeScript | strict mode | PR blocked |
| **Format Check** | Prettier | match prettier.config.js | PR blocked |
| **Dependency Audit** | npm audit | 0 high | Warning (continue-on-error) |

### E2E Quality Gates

| Gate | Tool | Threshold | Consequence |
|------|------|-----------|-------------|
| **E2E Pass Rate** | Playwright | 100% | PR blocked |
| **Screenshot Diff** | Playwright visual | <5% variation | Review required |

---

## 📈 Performance SLAs (Service Level Agreements)

### Backend Performance
- **API Response Time**: <200ms (p95)
  - Measurement: Response time header + monitoring
  - Includes: DB query + serialization, excludes network latency
  - Target endpoint: GET /api/recipes/search
  
- **Database Query**: <50ms (p95)
  - Measurement: Laravel Telescope or monitoring
  - Includes: Query execution time only
  - Excludes: Network round-trip
  
- **Cache Hit Rate**: ≥80%
  - Measurement: Redis STATS + monitoring
  - Tags cache: 24h TTL, target hit rate 90%
  - Search results: 1h TTL, target hit rate 80%

### Frontend Performance
- **Page Load Time**: <3s (p95)
  - Measurement: Lighthouse + real-world monitoring (RUM)
  - Includes: DOM interactive
  - Excludes: Third-party script delays
  
- **Time to Interactive (TTI)**: <2.5s (p95)
  - Measurement: Lighthouse, WebVitals
  - Components must be interactable
  
- **Cumulative Layout Shift (CLS)**: <0.1
  - Measurement: WebVitals
  - No jarring layout changes after interaction
  
- **Largest Contentful Paint (LCP)**: <1.2s
  - Measurement: WebVitals
  - Hero image/main content loads quickly

### Search Performance
- **Tag Search**: <50ms (p95)
  - Uses: GIN index on recipes.tags
  - Scale: 1M recipes
  - Query: WHERE tags @> '["dessert"]'
  
- **Full-Text Search**: <200ms (p95)
  - Uses: FULLTEXT index on title, instructions
  - Scale: 1M recipes
  - Query: MATCH(title, instructions) AGAINST(...)
  
- **Autocomplete**: <10ms (cache hit)
  - Uses: Redis cached tag list (24h TTL)
  - Must refresh if no cache hit

---

## ✅ Acceptance Criteria Definitions

### What is an Acceptance Criterion?
Acceptance Criterion = Testable condition that proves a User Story meets requirements.

### Format Standard

```
GIVEN [precondition/setup]
WHEN [user action]
THEN [observable result]
AND [additional assertion]
```

### Example: US-01 (Login)

**AC 1.1: Successful Login**
```
GIVEN user has valid account (email: test@example.com)
WHEN user submits login form with correct credentials
THEN receives JWT token with 1h expiration
AND token works for subsequent API calls
AND response includes user info (id, email, name)
```

**AC 1.2: Invalid Password**
```
GIVEN user account exists
WHEN user submits login with wrong password
THEN receives 401 Unauthorized
AND no token is issued
AND failure is logged (with email, not password)
```

**AC 1.3: Rate Limiting**
```
GIVEN user submits 5+ failed login attempts
WHEN attempts occur within 15 minutes
THEN 6th attempt returns 429 Too Many Requests
AND lockout duration is 15 minutes
```

### Example: US-02 (Create Recipe)

**AC 2.1: Valid Recipe Creation**
```
GIVEN user is authenticated
WHEN user submits form with title, ingredients, instructions
THEN recipe is saved with UUID primary key
AND timestamps are auto-set (created_at, updated_at)
AND response includes recipe object
```

**AC 2.2: Validation - Required Fields**
```
GIVEN user is authenticated
WHEN user submits form missing required field (e.g., title)
THEN receives 422 Unprocessable Entity
AND error message specifies field name
AND recipe is not created
```

**AC 2.3: Data Isolation**
```
GIVEN User A and User B both logged in
WHEN User A creates recipe
THEN User B cannot view/edit/delete that recipe
AND GET /api/recipes returns only User A's recipes
```

---

## 🔍 Metric Definitions

### Test-Related Metrics

**Line Coverage**
- Definition: Count of source code lines executed ÷ total lines × 100
- Calculation: `(executed lines / total lines) * 100`
- Example: 800 lines executed / 1000 total = 80%
- Excludes: Comments, blank lines, else branches not hit

**Branch Coverage**
- Definition: Count of conditional branches (if/else, switch cases) exercised
- Calculation: `(branches executed / total branches) * 100`
- Example: if (condition) has 2 branches (true/false)
- Target: ≥80% on both line + branch

**Coverage Report Artifact**
- Tools: PHPUnit (Clover XML) + Vitest (LCOV)
- Location: `coverage/` directory (committed to PR artifacts)
- Format: HTML report + machine-readable XML/LCOV
- Baseline: Must not decrease from main branch

### Code Quality Metrics

**Cyclomatic Complexity**
- Definition: Number of independent paths through code
- Target: ≤10 per function (McCabe's metric)
- Tools: PHPStan (backend), ESLint (frontend)
- High complexity = hard to test, maintain

**Cognitive Complexity**
- Definition: How difficult is code to understand
- Nest depth, boolean logic, loops = higher score
- Target: ≤15 per function
- Tools: SonarQube (or manual review)

**Code Duplication**
- Definition: Percentage of duplicated code
- Target: <5% (DRY principle)
- Tools: Semgrep, PHPStan duplicated code detection

**Maintainability Index**
- Definition: Formula combining LOC, cyclomatic complexity, Halstead volume
- Range: 0-100 (higher = more maintainable)
- Target: ≥75
- Green: >75, Yellow: 50-75, Red: <50

### Performance Metrics

**Response Time (p95)**
- Definition: 95th percentile of response times (95% of requests faster)
- Calculation: Sort all response times, take 95th percentile value
- Example: 100 requests, 95th fastest = p95
- Target: <200ms (backend API)

**Throughput**
- Definition: Requests per second the system handles
- Calculation: `total_requests / total_seconds`
- Target: ≥100 req/s (backend), ≥500 req/s (frontend static)

**Database Query Time**
- Definition: Time from query submission to result return
- Excludes: Network latency, application processing
- Target: <50ms (p95) for indexed queries
- Measurement: EXPLAIN ANALYZE or Telescope logs

**Cache Hit Rate**
- Definition: `(cache hits / total cache requests) * 100`
- Calculation: Redis.get() success ÷ Redis.get() attempts
- Target: ≥80% (tags), ≥90% (autocomplete)

---

## 🚨 Quality Audit Checklist

### Pre-Merge Checklist (Developer)

**Code Quality**
- [ ] All tests passing (green CI)
- [ ] Coverage ≥80% (backend) / ≥70% (frontend)
- [ ] PHPStan level 8 passing
- [ ] ESLint + Prettier passing
- [ ] No hardcoded values, secrets, or DEBUG code
- [ ] Type hints on all methods (PHP 8.2 style)
- [ ] No TODO/FIXME comments (must create issues)

**Security**
- [ ] No SQL injection (always use Eloquent ORM)
- [ ] XSS prevention (Vue templates safe by default)
- [ ] Authentication enforced (auth middleware on routes)
- [ ] Authorization checked (policy on resource access)
- [ ] Input validation (FormRequest + validation rules)
- [ ] Error messages don't leak sensitive info
- [ ] Passwords never logged or displayed
- [ ] Dependencies audited (no high-severity vulns)

**Documentation**
- [ ] README/SETUP updated if needed
- [ ] API endpoint documented (params, responses)
- [ ] Complex logic commented (WHY, not WHAT)
- [ ] Commit messages follow format (type(scope): desc)
- [ ] PR description includes: what, why, how to test

**Testing**
- [ ] Unit tests for business logic
- [ ] Feature/integration tests for API endpoints
- [ ] Edge cases covered (empty input, invalid data)
- [ ] Mocks used for external services (not real API calls)
- [ ] E2E scenarios updated if user flow changed

### Code Review Checklist (Reviewer)

**Correctness**
- [ ] Logic is correct (not just syntactically valid)
- [ ] Edge cases handled
- [ ] Error handling present (no silent failures)
- [ ] Off-by-one errors checked
- [ ] SQL N+1 problem addressed (use with(), select())

**Performance**
- [ ] No new O(n²) algorithms
- [ ] Queries are optimized (indices used)
- [ ] Loops are efficient (cache values, avoid re-queries)
- [ ] Response times acceptable (<200ms)
- [ ] Frontend render performance OK (no jank)

**Security**
- [ ] OWASP Top 10 controls applied
- [ ] Auth/authz enforced
- [ ] Input validated
- [ ] Error messages safe
- [ ] No hardcoded credentials

**Maintainability**
- [ ] Code is readable (clear variable names)
- [ ] Complexity is low (cyclomatic <10)
- [ ] DRY principle followed (no duplication)
- [ ] Patterns consistent with codebase
- [ ] Documentation is clear

---

## 🎪 Definition of Done (Feature Complete)

A feature is "DONE" when ALL of the following are true:

### 1. Code Implementation ✅
- [ ] Feature fully implemented (backend + frontend)
- [ ] Code follows naming conventions + style guide
- [ ] No debug code (console.log, dd(), dump())
- [ ] No commented-out code
- [ ] Type hints everywhere (PHP + TypeScript)

### 2. Testing ✅
- [ ] Unit tests written (logic in isolation)
- [ ] Integration tests written (API endpoints)
- [ ] E2E test scenarios added (if user flow impacted)
- [ ] Coverage ≥80% (backend) / ≥70% (frontend)
- [ ] All tests passing (CI green)
- [ ] Edge cases covered (empty, null, invalid)

### 3. Code Review ✅
- [ ] PR created with clear description
- [ ] Approved by ≥1 team member
- [ ] All comments addressed (resolved or changed)
- [ ] PHPStan, ESLint, Prettier all passing
- [ ] No merge conflicts

### 4. Security ✅
- [ ] Security audit passed (OWASP checklist)
- [ ] Input validation present
- [ ] Auth/authz enforced
- [ ] No hardcoded secrets
- [ ] Dependencies audited (composer/npm audit passing)

### 5. Performance ✅
- [ ] Response times <200ms (backend)
- [ ] Page load <3s (frontend)
- [ ] Database queries <50ms (p95)
- [ ] Cache strategy implemented (if applicable)
- [ ] Performance regression tests added (if applicable)

### 6. Documentation ✅
- [ ] Code comments explain WHY (not WHAT)
- [ ] API endpoint documented (request/response formats)
- [ ] README updated (if user-facing change)
- [ ] Changelog entry added
- [ ] Commit messages follow format

### 7. Merge & Deploy ✅
- [ ] Merged to main branch
- [ ] GitHub Actions pipeline passes
- [ ] Staged deployment successful
- [ ] Smoke tests pass on staging
- [ ] Ready for production deployment

---

## 📋 Defect Severity Levels

### Critical (P0) - Fix Immediately
- Security vulnerability (SQL injection, XSS, auth bypass)
- Data loss or corruption
- System unavailable
- Example: "SSRF allows accessing localhost:8000"

### High (P1) - Fix This Sprint
- Major feature broken (auth, search, CRUD)
- Significant performance degradation
- Example: "Search endpoint times out with >1000 recipes"

### Medium (P2) - Fix Next Sprint
- Minor feature bug (button text wrong)
- Small performance issue (<50% regression)
- Example: "Dark mode button doesn't persist on refresh"

### Low (P3) - Fix When Possible
- Typos or cosmetic issues
- Nice-to-have features
- Example: "Spelling error in help text"

---

## 🏆 Success Criteria (MVP Launch)

Project is "launch ready" when:

```
✅ All PRs merged to main
✅ CI/CD pipeline 100% passing
✅ Code coverage ≥80% (backend) / ≥70% (frontend)
✅ Security audit passed (OWASP Top 10)
✅ Performance targets met (<200ms backend, <3s frontend)
✅ E2E test suite 100% passing
✅ Responsiveness validated (mobile, tablet, desktop)
✅ Documentation complete (API, setup, deployment)
✅ Staging deployment successful
✅ Team sign-off (no blockers)
```

**Estimated Launch Date**: Week 6 (end of sprint)

