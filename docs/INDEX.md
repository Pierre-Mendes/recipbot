# 📑 RecipBot MVP - Complete Documentation Index

## Quick Navigation

### 🤖 Getting Started with Agents

**I'm a developer and want to implement a feature**
→ Read: [`AGENT-USAGE-GUIDE.md`](#agent-usage-guide)  
→ Then: `claude-code "feature: implement [feature name]"`

**I need to review a PR**
→ Read: [`AGENT-USAGE-GUIDE.md`](#agent-usage-guide) - Pattern: Code Review Workflow  
→ Then: `claude-code "review: quality check this PR"`

**I need to plan a sprint**
→ Read: [`AGENT-USAGE-GUIDE.md`](#agent-usage-guide) - Workflow: Feature Implementation  
→ Then: `claude-code "analysis: plan sprint 6"`

---

## 📚 Documentation Files

### Core Configuration
| File | Purpose | Size | Location |
|------|---------|------|----------|
| `.claude/config.json` | Master agent configuration | 3.4KB | `.claude/` |
| `.claude/subagents.yaml` | Agent definitions + workflows | 13.8KB | `.claude/` |

### Agent Context Files (Total: 127KB)

#### CodingAgent Contexts (38KB)
| File | Purpose | Size |
|------|---------|------|
| `agents/coding/context-backend.md` | Laravel patterns, Services, Models | 12KB |
| `agents/coding/context-frontend.md` | Vue 3 patterns, Pinia, Components | 17KB |
| `agents/coding/context-project.md` | Project structure, Git workflow | 9KB |

#### ReviewAgent Contexts (33KB)
| File | Purpose | Size |
|------|---------|------|
| `agents/review/context-quality.md` | PHPStan, ESLint, Code standards | 8KB |
| `agents/review/context-security.md` | OWASP, Auth, Injection prevention | 12KB |
| `agents/review/context-performance.md` | Performance SLAs, Caching, Indices | 8.2KB |

#### AnalysisAgent Contexts (32KB)
| File | Purpose | Size |
|------|---------|------|
| `agents/analysis/context-specs.md` | User stories, Acceptance criteria | 9.4KB |
| `agents/analysis/context-architecture.md` | System design, Data flows | 13KB |
| `agents/analysis/context-roadmap.md` | Timeline, Phases, Blockers | 9.7KB |

#### Shared Contexts (31KB)
| File | Purpose | Size |
|------|---------|------|
| `shared/conventions.md` | Naming, Git, Code style | 8.4KB |
| `shared/glossary.md` | 40+ term definitions | 9.9KB |
| `shared/definitions.md` | Quality gates, Metrics, DoD | 13KB |

### Integration & Usage Guides
| File | Purpose | Size | Location |
|------|---------|------|----------|
| `INTEGRATION-PLAN.md` | Step-by-step integration guide | 13KB | `docs/` |
| `AGENT-USAGE-GUIDE.md` | How to use each agent | 13KB | `docs/` |
| `PROJECT-STATUS-SUMMARY.md` | Executive summary | 15KB | `docs/` |

### Existing Project Docs
| File | Purpose | Size |
|------|---------|------|
| `CLAUDE.md` | Project overview & setup | 8.8KB |
| `constitution.md` | Principles & patterns | 12KB |
| `QUICK_START.md` | 5-minute setup guide | 1.6KB |
| `SETUP_INSTRUCTIONS.md` | Detailed setup | 6KB |
| `HARNESS-GUIDE.md` | Harness pipeline guide | 11KB |
| `OWASP_CHECKLIST.md` | Security validation | 15KB |

### Specifications
| File | Purpose | Size |
|------|---------|------|
| `specs/recipe-management.spec.md` | US-01, US-02, US-03 specs | 10.4KB |
| `specs/recipe-search.spec.md` | US-04, US-05 specs | 14.2KB |

### Pipelines & Automation
| File | Purpose | Size |
|------|---------|------|
| `.harness/features/recipe-management.yaml` | Management pipeline | 2.5KB |
| `.harness/features/recipe-search.yaml` | Search pipeline | 3.3KB |
| `.github/workflows/ci.yml` | CI/CD automation | 13.8KB |

---

## 🎯 Use Cases & Where to Go

### Use Case: "I want to implement feature X"

**Step 1: Understand Requirements**
- File: `specs/recipe-*.spec.md`
- Command: `claude-code "analysis: extract requirements from specs"`

**Step 2: Plan Implementation**
- File: `context-roadmap.md`, `context-architecture.md`
- Command: `claude-code "analysis: plan feature X"`

**Step 3: Write Code**
- Files: `context-backend.md`, `context-frontend.md`
- Command: `claude-code "feature: implement feature X"`

**Step 4: Review & Validate**
- Files: `context-quality.md`, `context-security.md`, `context-performance.md`
- Command: `claude-code "review: full quality gate on feature X"`

**Reference**: `AGENT-USAGE-GUIDE.md` → Workflow: Feature Implementation

---

### Use Case: "I need to fix a bug"

**Step 1: Identify Issue**
- Command: `claude-code "analysis: identify root cause of bug Y"`

**Step 2: Fix It**
- Command: `claude-code "fix: resolve bug Y in component/service Z"`

**Step 3: Validate**
- Command: `claude-code "review: quality check on bugfix"`

**Reference**: `AGENT-USAGE-GUIDE.md` → Pattern: Quick Bug Fix

---

### Use Case: "Security audit needed"

**Step 1: Run Full Audit**
- Files: `context-security.md`, `OWASP_CHECKLIST.md`
- Command: `claude-code "review: OWASP Top 10 audit"`

**Step 2: Address Findings**
- Command: `claude-code "fix: remediate security findings"`

**Step 3: Re-validate**
- Command: `claude-code "review: re-audit post-remediation"`

**Reference**: `AGENT-USAGE-GUIDE.md` → Pattern: Security Audit

---

### Use Case: "Performance is slow"

**Step 1: Analyze**
- Files: `context-performance.md`, `context-architecture.md`
- Command: `claude-code "review: analyze performance bottlenecks"`

**Step 2: Optimize**
- Command: `claude-code "feature: implement performance optimizations based on findings"`

**Step 3: Benchmark**
- Command: `claude-code "review: benchmark before/after performance"`

**Reference**: `AGENT-USAGE-GUIDE.md` → Pattern: Performance Optimization

---

### Use Case: "Plan next sprint"

**Step 1: Parse Specs**
- Files: `specs/*.spec.md`, `context-specs.md`
- Command: `claude-code "analysis: extract all requirements from specs"`

**Step 2: Create Plan**
- Files: `context-roadmap.md`, `context-architecture.md`
- Command: `claude-code "analysis: plan sprint 6 with task breakdown"`

**Step 3: Estimate**
- Command: `claude-code "estimate: complexity and time for all tasks"`

**Step 4: Validate**
- Command: `claude-code "review: feasibility check on sprint plan"`

**Reference**: `AGENT-USAGE-GUIDE.md` → Workflow: Sprint Planning

---

## 📊 File Statistics

```
Total Documentation: 510KB
├── Context Files: 127KB (25%)
├── Guides: 41KB (8%)
├── Existing Docs: 75KB (15%)
├── Specs: 25KB (5%)
├── Pipelines: 20KB (4%)
└── Code: ~186KB (36%)

Total Project Context Allocation: 190KB (of 450KB available)
├── CodingAgent: 60KB
├── ReviewAgent: 50KB
└── AnalysisAgent: 40KB
```

---

## 🔍 Quick Reference by Role

### For Developers
**Essential Reading**:
1. `QUICK_START.md` (5 min)
2. `AGENT-USAGE-GUIDE.md` (15 min)
3. `context-backend.md` or `context-frontend.md` (20 min)
4. `conventions.md` (10 min)

**Quick Commands**:
```bash
# Test agent
claude-code "feature: implement test feature"

# Review code
claude-code "review: quality check"

# Fix bug
claude-code "fix: bug description"
```

### For Architects
**Essential Reading**:
1. `PROJECT-STATUS-SUMMARY.md` (15 min)
2. `context-architecture.md` (20 min)
3. `INTEGRATION-PLAN.md` (15 min)
4. `.claude/config.json` (5 min)

**Key Files**:
- `context-architecture.md` - System design
- `.harness/features/*.yaml` - Deployment pipelines
- `CLAUDE.md` - Project overview

### For QA/Product
**Essential Reading**:
1. `QUICK_START.md` (5 min)
2. `specs/recipe-*.spec.md` (20 min)
3. `AGENT-USAGE-GUIDE.md` (15 min)
4. `PROJECT-STATUS-SUMMARY.md` (10 min)

**Quick Commands**:
```bash
# Plan sprint
claude-code "analysis: plan sprint X"

# Validate specs
claude-code "analysis: extract requirements from specs"
```

### For DevOps/Ops
**Essential Reading**:
1. `SETUP_INSTRUCTIONS.md` (10 min)
2. `context-performance.md` (15 min)
3. `.github/workflows/ci.yml` (10 min)
4. `HARNESS-GUIDE.md` (15 min)

**Key Files**:
- `.github/workflows/ci.yml` - CI/CD pipeline
- `docker-compose.yml` - Local development
- `.harness/` - Deployment pipelines

---

## 🚀 Quick Start Paths

### Path 1: "Just Give Me Code"
```bash
# 5 minutes
1. Read QUICK_START.md
2. Read AGENT-USAGE-GUIDE.md (Pattern: Feature Implementation)
3. Run: claude-code "feature: implement [your feature]"
```

### Path 2: "I Want Full Understanding"
```bash
# 1 hour
1. Read CLAUDE.md (20 min)
2. Read AGENT-USAGE-GUIDE.md (20 min)
3. Read context-architecture.md (15 min)
4. Read PROJECT-STATUS-SUMMARY.md (5 min)
```

### Path 3: "Security First"
```bash
# 45 minutes
1. Read OWASP_CHECKLIST.md (15 min)
2. Read context-security.md (15 min)
3. Read AGENT-USAGE-GUIDE.md (15 min)
4. Run: claude-code "review: OWASP audit"
```

### Path 4: "Performance"
```bash
# 30 minutes
1. Read context-performance.md (15 min)
2. Read context-architecture.md (10 min)
3. Run: claude-code "review: performance analysis"
```

---

## ✅ Integration Checklist

- [ ] Copy 12 context files to `.claude/`
- [ ] Verify all files are in place
- [ ] Run `git add .claude/`
- [ ] Create commit (use template from `INTEGRATION-PLAN.md`)
- [ ] Push to repository
- [ ] Test agents with sample tasks

**Detailed instructions**: `INTEGRATION-PLAN.md`

---

## 📞 Need Help?

### "Agent timed out"
→ `AGENT-USAGE-GUIDE.md` → Troubleshooting section

### "I don't know which agent to use"
→ `AGENT-USAGE-GUIDE.md` → Quick Reference section

### "Context file not found"
→ `INTEGRATION-PLAN.md` → Step 1: Copy Files

### "Security audit failed"
→ `OWASP_CHECKLIST.md` + `context-security.md`

### "Performance is slow"
→ `context-performance.md` + `AGENT-USAGE-GUIDE.md` → Pattern: Performance

### "Merge conflict in .claude/"
→ `INTEGRATION-PLAN.md` → Git section

---

## 🎓 Learning Resources

### For Agent Architecture Understanding
1. `PROJECT-STATUS-SUMMARY.md` (executive overview)
2. `.claude/config.json` (technical config)
3. `.claude/subagents.yaml` (detailed agent definitions)
4. `INTEGRATION-PLAN.md` (how it all fits together)

### For Code Quality
1. `context-quality.md` (standards)
2. `conventions.md` (code style)
3. `OWASP_CHECKLIST.md` (security)
4. `context-performance.md` (optimization)

### For Project Management
1. `context-roadmap.md` (timeline)
2. `specs/recipe-*.spec.md` (requirements)
3. `context-architecture.md` (design)
4. `PROJECT-STATUS-SUMMARY.md` (progress)

---

## 📈 Staying Current

### Weekly Updates
- Check `context-roadmap.md` for timeline updates
- Review `OWASP_CHECKLIST.md` for security reminders
- Monitor coverage in CI/CD output

### Monthly Reviews
- Update `context-roadmap.md` with new blockers
- Add new patterns to `conventions.md`
- Expand `context-specs.md` with new features
- Update `context-architecture.md` if design changes

### Quarterly Rebalancing
- Analyze agent context usage
- Redistribute if any agent exceeds 70% capacity
- Add new specialized contexts if needed

---

## 🎉 You're Ready!

**All documentation is in place. You have:**
- ✅ 12 specialized context files (127KB)
- ✅ 3 agent configurations (CodingAgent, ReviewAgent, AnalysisAgent)
- ✅ 3 comprehensive workflow guides
- ✅ Integration plan with verification checklist
- ✅ Agent usage guide with patterns & examples
- ✅ Project status summary with metrics

**Next Step**: Follow `INTEGRATION-PLAN.md` to integrate into `.claude/`

**Time to First Agent**: 30 minutes (integration) + 5 minutes (first command)

---

**Generated**: 2026-08-28  
**Status**: ✅ Complete  
**Ready for**: Production use
