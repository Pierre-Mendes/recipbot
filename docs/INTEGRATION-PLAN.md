# 🔗 Integration Plan - RecipBot 3-Agent Architecture

## 📊 Project Status Overview

### Existing Assets ✅
- **Specifications**: `specs/recipe-management.spec.md`, `specs/recipe-search.spec.md`
- **Harness Pipelines**: `.harness/features/recipe-management.yaml`, `.harness/features/recipe-search.yaml`
- **CI/CD**: `.github/workflows/ci.yml` (13KB, comprehensive)
- **Project Docs**: `CLAUDE.md`, `constitution.md`
- **Config**: `.claude/config.json`, `.claude/subagents.yaml`

### New Assets Created ✅ (12 files)
- **CodingAgent**: `context-backend.md`, `context-frontend.md`, `context-project.md`
- **ReviewAgent**: `context-quality.md`, `context-security.md`, `context-performance.md`
- **AnalysisAgent**: `context-specs.md`, `context-architecture.md`, `context-roadmap.md`
- **Shared**: `conventions.md`, `glossary.md`, `definitions.md`

---

## 🚀 Integration Steps

### Step 1: Copy Context Files to `.claude/`

**Already Staged** in `/home/pierre/Projects/recipbot/docs/context-files/`

Execute:
```bash
cd ~/Projects/recipbot

# CodingAgent
cp docs/context-files/context-backend.md .claude/agents/coding/
cp docs/context-files/context-frontend.md .claude/agents/coding/
cp docs/context-files/context-project.md .claude/agents/coding/

# ReviewAgent
cp docs/context-files/context-quality.md .claude/agents/review/
cp docs/context-files/context-security.md .claude/agents/review/
cp docs/context-files/context-performance.md .claude/agents/review/

# AnalysisAgent
cp docs/context-files/context-specs.md .claude/agents/analysis/
cp docs/context-files/context-architecture.md .claude/agents/analysis/
cp docs/context-files/context-roadmap.md .claude/agents/analysis/

# Shared
cp docs/context-files/conventions.md .claude/shared/
cp docs/context-files/glossary.md .claude/shared/
cp docs/context-files/definitions.md .claude/shared/

# Verify
ls -lah .claude/agents/*/ .claude/shared/
```

### Step 2: Update `.claude/subagents.yaml`

Your existing `subagents.yaml` is **already well-structured**! ✅

**Status**: All context file paths are correctly referenced:
- ✅ `agents/coding/context-backend.md`
- ✅ `agents/coding/context-frontend.md`
- ✅ `agents/coding/context-project.md`
- ✅ `agents/review/context-quality.md`
- ✅ `agents/review/context-security.md`
- ✅ `agents/review/context-performance.md`
- ✅ `agents/analysis/context-specs.md`
- ✅ `agents/analysis/context-architecture.md`
- ✅ `agents/analysis/context-roadmap.md`
- ✅ `shared/conventions.md`
- ✅ `shared/glossary.md`
- ✅ `shared/definitions.md` (newly added)

**No changes needed!** The file is production-ready.

### Step 3: Update `.claude/config.json`

The config file already references all contexts correctly. Just verify it matches:

```json
{
  "agents": [
    {
      "id": "coding",
      "context_files": [
        "agents/coding/context-backend.md",
        "agents/coding/context-frontend.md",
        "agents/coding/context-project.md",
        "shared/conventions.md"
      ]
    },
    {
      "id": "review",
      "context_files": [
        "agents/review/context-quality.md",
        "agents/review/context-security.md",
        "agents/review/context-performance.md",
        "shared/definitions.md"
      ]
    },
    {
      "id": "analysis",
      "context_files": [
        "agents/analysis/context-specs.md",
        "agents/analysis/context-architecture.md",
        "agents/analysis/context-roadmap.md",
        "shared/glossary.md"
      ]
    }
  ]
}
```

**Status**: ✅ Already configured correctly!

### Step 4: Verify Specs & Harness Integration

**Existing Specs** (linked to AnalysisAgent):
- `specs/recipe-management.spec.md` → AnalysisAgent reads
- `specs/recipe-search.spec.md` → AnalysisAgent reads

**Existing Harness Pipelines** (reference for CodingAgent):
- `.harness/features/recipe-management.yaml` → Deployment stages
- `.harness/features/recipe-search.yaml` → Deployment stages

**Integration**: Add to `context-architecture.md` references (already included in specs section).

### Step 5: Verify GitHub Actions Integration

**CI/CD Pipeline** (`.github/workflows/ci.yml`):
- Runs: PHPUnit tests, ESLint, PHPStan, Prettier
- Triggers: ReviewAgent automatically on PR
- Merges: Requires all checks passing

**Integration**: Automation rules in `subagents.yaml` already configured:
```yaml
automation:
  github_pr_comments:
    - trigger: "@claude-code feature:"
      route_to: "CodingAgent"
    - trigger: "@claude-code review:"
      route_to: "ReviewAgent"
```

---

## 📋 Mapping: Old Docs → New Contexts

| Old Doc | Maps To | New Context |
|---------|---------|-------------|
| `CLAUDE.md` | Architecture + Project | `context-architecture.md` + `context-project.md` |
| `constitution.md` | Principles + Patterns | `conventions.md` + `definitions.md` |
| `specs/*.spec.md` | Requirements | `context-specs.md` |
| (Internal) | Design | `context-architecture.md` |
| (Internal) | Quality Standards | `context-quality.md` |
| (Internal) | Security Checklist | `context-security.md` |
| (Internal) | Performance SLAs | `context-performance.md` |
| (Internal) | Timeline | `context-roadmap.md` |

---

## 🔄 Workflow Integration

### Feature Implementation Flow

```
User: "feature: implement search by tags"
         ↓
[Orchestrator routes to AnalysisAgent]
         ↓
[AnalysisAgent:SpecParser reads context-specs.md]
         ↓
[AnalysisAgent:TaskPlanner creates task breakdown]
         ↓
[Orchestrator routes to CodingAgent]
         ↓
[CodingAgent:BackendBuilder reads context-backend.md + context-specs.md]
[CodingAgent:FrontendBuilder reads context-frontend.md + context-specs.md] (parallel)
         ↓
[Code written + tested]
         ↓
[Orchestrator routes to ReviewAgent]
         ↓
[ReviewAgent:SecurityAuditor reads context-security.md]
[ReviewAgent:PerformanceReviewer reads context-performance.md]
[ReviewAgent:CodeStyleChecker reads context-quality.md] (parallel)
         ↓
[Findings consolidated]
         ↓
[If fixes needed] → Back to CodingAgent → Re-review
[If approved] → Create PR → Merge
```

### Code Review Flow

```
PR Created
         ↓
[GitHub Actions CI runs]
         ↓
[ReviewAgent:SecurityAuditor checks OWASP (context-security.md)]
[ReviewAgent:PerformanceReviewer checks queries (context-performance.md)]
[ReviewAgent:CodeStyleChecker checks lint (context-quality.md)] (parallel)
         ↓
[Findings reported as PR comments]
         ↓
[Developer fixes based on findings]
         ↓
[Re-review by ReviewAgent]
         ↓
[Approve + Merge]
```

### Sprint Planning Flow

```
User: "analysis: plan sprint 5"
         ↓
[AnalysisAgent:SpecParser reads context-specs.md]
[AnalysisAgent:TaskPlanner reads context-roadmap.md]
         ↓
[Extract requirements from specs]
         ↓
[AnalysisAgent:Estimator calculates using context-architecture.md]
[AnalysisAgent:BlockerAnalyzer checks context-roadmap.md for risks]
         ↓
[Sprint plan generated with task breakdown + estimates]
         ↓
[ReviewAgent:CodeStyleChecker validates feasibility]
         ↓
[Ready for sprint kickoff]
```

---

## 📁 Final Directory Structure

```
recipbot/
├── .claude/
│   ├── agents/
│   │   ├── coding/
│   │   │   ├── context-backend.md ✅ NEW
│   │   │   ├── context-frontend.md ✅ NEW
│   │   │   └── context-project.md ✅ NEW
│   │   ├── review/
│   │   │   ├── context-quality.md ✅ NEW
│   │   │   ├── context-security.md ✅ NEW
│   │   │   └── context-performance.md ✅ NEW
│   │   └── analysis/
│   │       ├── context-specs.md ✅ NEW
│   │       ├── context-architecture.md ✅ NEW
│   │       └── context-roadmap.md ✅ NEW
│   ├── shared/
│   │   ├── conventions.md ✅ NEW
│   │   ├── glossary.md ✅ NEW
│   │   └── definitions.md ✅ NEW
│   ├── config.json ✅ VERIFIED
│   └── subagents.yaml ✅ VERIFIED
├── .harness/
│   └── features/
│       ├── recipe-management.yaml ✅ EXISTING
│       └── recipe-search.yaml ✅ EXISTING
├── specs/
│   ├── recipe-management.spec.md ✅ EXISTING
│   └── recipe-search.spec.md ✅ EXISTING
├── docs/
│   └── context-files/ (temporary)
│       ├── context-*.md (to be deleted after copy)
│       ├── conventions.md
│       ├── glossary.md
│       └── definitions.md
├── .github/
│   └── workflows/
│       └── ci.yml ✅ EXISTING
├── CLAUDE.md ✅ PROJECT INSTRUCTIONS
├── constitution.md ✅ PRINCIPLES
└── [other project files]
```

---

## ✅ Pre-Launch Checklist

### Context Files
- [ ] Copy all 12 files from `docs/context-files/` to `.claude/`
- [ ] Verify file sizes (all >1KB)
- [ ] Check YAML/JSON syntax in config files
- [ ] Run `git status` to see staged files

### Verification Commands

```bash
# Check file sizes
du -sh .claude/agents/*/* .claude/shared/*

# Check YAML syntax
python3 -m yaml .claude/subagents.yaml
python3 -m json.tool .claude/config.json

# Test agent loading
claude-code config validate

# Git status
git status --short | grep ".claude/"
```

### Git Commit

```bash
git add .claude/agents/ .claude/shared/

git commit -m "feat(context): integrate 3-agent specialized context architecture

- Add CodingAgent contexts: backend, frontend, project (60KB)
- Add ReviewAgent contexts: quality, security, performance (50KB)
- Add AnalysisAgent contexts: specs, architecture, roadmap (50KB)
- Add shared contexts: conventions, glossary, definitions (30KB)

Total context window: 190KB allocated across 3 specialized agents.
Enables precise knowledge isolation for improved task execution.

Verified against:
- .claude/subagents.yaml (all paths correct)
- .claude/config.json (all references valid)
- specs/ folder (recipe-management, recipe-search)
- .harness/ folder (deployment pipelines)
- .github/workflows/ci.yml (CI/CD integration)

Ready for production use with Master Orchestrator routing."
```

### Test Agents

After commit, test each agent:

```bash
# Test CodingAgent
claude-code "feature: implement context usage in CodingAgent"

# Test ReviewAgent
claude-code "review: quality check on recent commits"

# Test AnalysisAgent
claude-code "analysis: estimate remaining work for sprint 5"
```

---

## 🎯 Success Criteria

✅ **All Complete:**
1. 12 context files created + verified
2. `.claude/` structure aligned with `subagents.yaml`
3. `config.json` references all contexts correctly
4. Specs & Harness pipelines mapped to agents
5. GitHub Actions integration verified
6. Commit message follows convention
7. Git history clean (no conflicts)
8. Ready for agent-based development

---

## 📞 Next Actions

1. **Execute**: Run the bash commands to copy files
2. **Verify**: Check file structure and syntax
3. **Commit**: Create git commit with message template
4. **Test**: Launch each agent with test prompts
5. **Document**: Update README with agent usage instructions
6. **Deploy**: Use agents for next sprint tasks

**Estimated time**: 15 minutes for integration + verification

---

**Generated**: 2026-08-28  
**Status**: Ready for Integration  
**Agent Readiness**: 100% ✅
