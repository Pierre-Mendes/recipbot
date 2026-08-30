# 🤖 Agent Usage Guide - RecipBot MVP

## Quick Reference: How to Use Each Agent

### 1️⃣ CodingAgent - Code Implementation

**Purpose**: Write code, fix bugs, refactor, manage Git

**When to use**:
- Implementing new features
- Fixing bugs
- Refactoring existing code
- Creating migrations

**Command formats**:

```bash
# Feature implementation
claude-code "feature: implement recipe search by tags"

# Bug fix with auto-review
claude-code "fix: recipe list pagination not working"

# Refactoring
claude-code "refactor: extract RecipeService into smaller classes"

# Database work
claude-code "migration: add prep_time and cook_time to recipes table"

# Git operations
claude-code "git: commit with message for feature X"
```

**Subagents that spawn**:
- `BackendBuilder` → Laravel code
- `FrontendBuilder` → Vue components
- `DatabaseBuilder` → Migrations + seeds
- `GitManager` → Git operations

**Context loaded**:
- `context-backend.md` (Laravel patterns, 12KB)
- `context-frontend.md` (Vue patterns, 17KB)
- `context-project.md` (Project structure, 9KB)
- `conventions.md` (Naming + formatting, 8.4KB)

**Example output**: 
```
✅ BackendBuilder created RecipeSearchService.php
✅ FrontendBuilder created SearchResults.vue
✅ Tests passing (86% coverage)
✅ Ready for review
```

---

### 2️⃣ ReviewAgent - Quality & Security

**Purpose**: Review code, audit security, check performance, validate coverage

**When to use**:
- Before merging PRs
- Security auditing
- Performance optimization
- Test coverage validation

**Command formats**:

```bash
# Security audit
claude-code "review: security check on new endpoints"

# Performance analysis
claude-code "review: optimize recipe search queries"

# Code quality
claude-code "review: lint and format check"

# Coverage validation
claude-code "review: ensure >80% test coverage"

# Combined review
claude-code "review: full quality gate assessment"
```

**Subagents that spawn**:
- `SecurityAuditor` → OWASP validation, auth/authz
- `PerformanceReviewer` → Query optimization, caching
- `CodeStyleChecker` → PHPStan, ESLint, Prettier
- `TestCoverageAnalyzer` → Coverage metrics

**Context loaded**:
- `context-quality.md` (Code standards, 8KB)
- `context-security.md` (OWASP checklist, 12KB)
- `context-performance.md` (SLAs + optimization, 8.2KB)
- `definitions.md` (Quality gates, 13KB)

**Example output**:
```
🔒 Security: 0 critical findings
⚡ Performance: All queries <50ms
✅ Quality: PHPStan level 8 passing
📊 Coverage: 82% (target: 80%)
Status: ✅ APPROVED FOR MERGE
```

---

### 3️⃣ AnalysisAgent - Planning & Requirements

**Purpose**: Parse specs, plan sprints, estimate tasks, identify blockers

**When to use**:
- Sprint planning
- Feature estimation
- Requirement analysis
- Dependency mapping
- Risk assessment

**Command formats**:

```bash
# Parse specifications
claude-code "analysis: extract requirements from recipe-management.spec.md"

# Sprint planning
claude-code "analysis: plan sprint 5 with task breakdown"

# Task estimation
claude-code "estimate: complexity and time for search feature"

# Identify blockers
claude-code "analysis: check dependencies and blockers for Phase 6"

# Feasibility check
claude-code "analysis: validate feasibility of proposed architecture"
```

**Subagents that spawn**:
- `SpecParser` → Extract requirements
- `TaskPlanner` → Break features into micro-tasks
- `Estimator` → Time + complexity + resources
- `BlockerAnalyzer` → Dependencies + risks

**Context loaded**:
- `context-specs.md` (User stories, 9.4KB)
- `context-architecture.md` (System design, 13KB)
- `context-roadmap.md` (Timeline, 9.7KB)
- `glossary.md` (Terminology, 9.9KB)

**Example output**:
```
📋 Requirements extracted: 7 acceptance criteria
🎯 Tasks: 12 micro-tasks (sorted by dependency)
⏱️  Estimation: 18 hours total (±2 hours)
⚠️  Blockers: 2 identified (PR review pending)
✅ Feasibility: Go/No-Go
```

---

## 🔄 Workflow: Feature Implementation

**Complete workflow using all 3 agents**:

### Phase 1: Analysis (AnalysisAgent - 15 min)
```bash
# Parse spec
claude-code "analysis: extract requirements for US-05 (search)"
# Output: requirements_list.md, acceptance_criteria.md
```

### Phase 2: Backend Implementation (CodingAgent - 45 min)
```bash
# Build backend
claude-code "feature: implement recipe search by tags in Laravel"
# Output: RecipeSearchService.php, SearchController.php, tests
```

### Phase 3: Frontend Implementation (CodingAgent - 40 min, parallel)
```bash
# Build frontend
claude-code "feature: implement search UI in Vue 3"
# Output: SearchPage.vue, SearchBar.vue, composables, tests
```

### Phase 4: Security Review (ReviewAgent - 20 min)
```bash
# Security audit
claude-code "review: security check on search endpoints"
# Output: security_findings.md (0 critical issues)
```

### Phase 5: Quality Review (ReviewAgent - 15 min)
```bash
# Code quality
claude-code "review: quality gate on search feature"
# Output: quality_findings.md (PHPStan + ESLint passed)
```

### Phase 6: Coverage Review (ReviewAgent - 10 min)
```bash
# Coverage validation
claude-code "review: ensure test coverage >80%"
# Output: coverage_report.md (82% achieved)
```

### Phase 7: Git & Merge (CodingAgent - 10 min)
```bash
# Create commit and push
claude-code "git: commit and push feature-search branch"
# Output: PR created, CI running
```

**Total time**: ~2 hours (with parallelism)

---

## 🎯 Common Patterns

### Pattern 1: Quick Bug Fix
```bash
# Identify bug
claude-code "analysis: identify issue in recipe edit form"

# Fix it
claude-code "fix: update recipe form to pre-populate data"

# Review
claude-code "review: quality check on bugfix"
```
**Time**: 15-20 minutes

### Pattern 2: Security Audit
```bash
# Full OWASP check
claude-code "review: OWASP Top 10 audit of search endpoints"

# Get recommendations
# Output includes: findings + remediation + priority
```
**Time**: 20-30 minutes

### Pattern 3: Performance Optimization
```bash
# Analyze current performance
claude-code "review: analyze database queries for recipe list"

# Implement optimizations
claude-code "feature: add GIN index for tags and optimize queries"

# Verify improvements
claude-code "review: benchmark optimized queries"
```
**Time**: 30-45 minutes

### Pattern 4: Spec Analysis
```bash
# Extract requirements
claude-code "analysis: parse recipe-search.spec.md completely"

# Get structured output: requirements, AC, estimates, blockers
```
**Time**: 10-15 minutes

---

## 🔍 Monitoring Agent Output

### CodingAgent Output Indicators

✅ **Success signs**:
- Tests passing
- Coverage ≥80% (backend) / ≥70% (frontend)
- Code follows conventions
- Git commit created

⚠️ **Warning signs**:
- Tests failing
- Coverage below target
- PHPStan/ESLint errors
- Timeout exceeded

### ReviewAgent Output Indicators

✅ **Success signs**:
- 0 critical findings
- All gates passed
- Approved for merge
- Structured findings JSON

⚠️ **Warning signs**:
- Security vulnerabilities found
- Performance degradation >10%
- Coverage gap
- Multiple findings

### AnalysisAgent Output Indicators

✅ **Success signs**:
- Requirements extracted cleanly
- Task breakdown clear
- Estimation provided
- Dependencies mapped
- Blockers identified

⚠️ **Warning signs**:
- Ambiguous requirements
- Missing acceptance criteria
- High uncertainty estimate
- Critical blockers

---

## 📊 Agent Capacity & Timeouts

| Agent | Max Context | Timeout | Best For |
|-------|-------------|---------|----------|
| **CodingAgent** | 200KB | 60 min | Complex features, backend work |
| **ReviewAgent** | 150KB | 30 min | PR reviews, security audits |
| **AnalysisAgent** | 150KB | 20 min | Planning, estimation, analysis |

**Context usage tips**:
- CodingAgent: Works on large features (multiple files)
- ReviewAgent: Fast turnaround (many PRs)
- AnalysisAgent: Focused analysis (fewer files needed)

---

## 🚨 Troubleshooting

### Agent times out
**Cause**: Task too complex for one agent
**Fix**: Break into smaller subtasks
```bash
# Instead of:
claude-code "feature: implement entire search system"

# Do:
claude-code "feature: implement recipe search service backend"
# (then) claude-code "feature: implement search UI components"
```

### Context window exceeded
**Cause**: Too many files loaded
**Fix**: Narrow scope or use specific subagent
```bash
# Instead of:
claude-code "feature: refactor entire app"

# Do:
claude-code "feature:backend" # Uses BackendBuilder subagent
```

### Low test coverage
**Cause**: Insufficient tests written
**Fix**: ReviewAgent identifies gaps
```bash
# After implementation:
claude-code "review: analyze test coverage gaps"
# Get list of untested code paths
# Add tests for identified gaps
```

---

## 📞 Integration with GitHub

### Auto-routing via Comments

```bash
# In PR comment:
@claude-code feature: add dark mode to app

# Agent: CodingAgent routes to FrontendBuilder
# Automatically reads context-frontend.md + context-project.md
```

```bash
# In PR comment:
@claude-code review: security check this PR

# Agent: ReviewAgent routes to SecurityAuditor
# Automatically reads context-security.md
```

```bash
# In PR comment:
@claude-code analysis: estimate remaining work

# Agent: AnalysisAgent routes to Estimator
# Automatically reads context-roadmap.md
```

---

## 💡 Best Practices

### ✅ Do

- **Be specific**: "feature: implement search by tags" vs "add search"
- **Use context**: Reference specs, docs, existing patterns
- **Test first**: Write tests alongside code
- **Review before merge**: Always use ReviewAgent
- **Plan before coding**: Use AnalysisAgent for complex features

### ❌ Don't

- **Overload agents**: Break huge tasks into subtasks
- **Skip reviews**: Never merge without ReviewAgent approval
- **Ignore coverage**: Maintain >80% (backend) / >70% (frontend)
- **Hardcode values**: Extract to config/constants
- **Bypass security checks**: Always audit with ReviewAgent

---

## 📚 Reference

### Command Formats

```
# Most general
claude-code "<agent-specific-command>"

# With subagent preference
claude-code "feature:backend: implement search service"

# With options
claude-code "review: quality check --verbose --detailed"
```

### Exit Status Codes

- `0` - Success ✅
- `1` - Failed (review findings)
- `2` - Timeout (retry or simplify task)
- `3` - Invalid input
- `4` - Missing context

---

**Last Updated**: 2026-08-28  
**Status**: Production Ready ✅
