# 🚀 RecipBot Skills Implementation Guide

**Date**: 2026-08-28  
**Status**: Ready for Implementation  
**Scope**: Tier 1, 2, 3 Skills Integration with 3-Agent Architecture

---

## 📋 Quick Start

This guide shows how to:
1. ✅ Configure agents to use skills
2. ✅ Update GitHub Actions workflows
3. ✅ Update Harness pipelines
4. ✅ Execute workflows with skill outputs

---

## 🤖 Agent Configuration with Skills

### CodingAgent Skills Setup

**Location**: `.claude/agents/coding/skills.md`

```yaml
# CodingAgent Skills Configuration

## Tier 1 Skills (Critical)
- docx: API specifications, architecture decisions
- pptx: Implementation plan presentations
- pdf: Technical documentation

## Tier 2 Skills (High Value)
- tdd: Test-driven development workflows
- artifact-diagramming: System flow diagrams

## Tier 3 Skills (Optional)
- artifact-design: UI/UX mockups (for frontend)
- skill-creator: Advanced skill development

## Usage Pattern
When implementing features:
1. Write failing tests (tdd skill)
2. Implement code (red → green → refactor)
3. Document API (docx skill)
4. Create architecture diagrams (artifact-diagramming)
5. Generate presentation (pptx skill)
```

**Example Commands**:
```bash
# Feature with full documentation
claude-code "feature: implement recipe search with documentation
- Use tdd skill for red-green-refactor
- Use docx skill to document API spec
- Use artifact-diagramming to create flow diagram
- Export presentation with pptx skill"

# Architecture documentation
claude-code "feature: document system architecture
- Use artifact-diagramming for architecture diagram
- Use docx skill for detailed specification
- Use pptx skill for stakeholder presentation"
```

---

### ReviewAgent Skills Setup

**Location**: `.claude/agents/review/skills.md`

```yaml
# ReviewAgent Skills Configuration

## Tier 1 Skills (Critical)
- recipbot-code-reviewer: Automated code quality + security validation
- pdf: Formal audit reports
- xlsx: Export metrics and findings

## Tier 2 Skills (High Value)
- test-reviewer: Test quality validation
- dataviz: Performance/coverage dashboards
- to-issues: Auto-create GitHub issues from findings

## Tier 3 Skills (Optional)
- artifact-capabilities: Interactive dashboards

## Usage Pattern
When reviewing code:
1. Run recipbot-code-reviewer for quality check
2. Run test-reviewer for test validation
3. Generate performance chart (dataviz)
4. Export findings to XLSX (xlsx skill)
5. Create formal report (pdf skill)
6. Auto-create issues (to-issues skill)
```

**Example Commands**:
```bash
# Complete quality gate with exports
claude-code "review: complete quality gate with skill exports
- Use recipbot-code-reviewer for OWASP + performance validation
- Use test-reviewer to validate test coverage
- Use dataviz skill to create performance comparison chart
- Use xlsx skill to export metrics spreadsheet
- Use pdf skill to generate formal audit report
- Use to-issues skill to auto-create critical findings"

# Security audit only
claude-code "review: security audit with formal report
- Use recipbot-code-reviewer for OWASP Top 10 check
- Use pdf skill to generate security report
- Use xlsx skill for vulnerability tracking
- Use to-issues skill to create remediation tasks"
```

---

### AnalysisAgent Skills Setup

**Location**: `.claude/agents/analysis/skills.md`

```yaml
# AnalysisAgent Skills Configuration

## Tier 1 Skills (Critical)
- xlsx: Sprint plans, task breakdown, estimates
- pptx: Stakeholder presentations
- docx: Requirements documentation

## Tier 2 Skills (High Value)
- to-prd: Convert specs to formal PRD format
- artifact-diagramming: Architecture diagrams, dependency graphs
- dataviz: Sprint velocity, burndown charts

## Tier 3 Skills (Optional)
- grillme: Requirement interviews, edge case discovery

## Usage Pattern
When planning sprints:
1. Interview for requirements (grillme skill - optional)
2. Create task breakdown (xlsx skill)
3. Document requirements (docx skill)
4. Generate PRD (to-prd skill)
5. Create architecture diagrams (artifact-diagramming)
6. Build velocity chart (dataviz skill)
7. Create presentation (pptx skill)
```

**Example Commands**:
```bash
# Complete sprint planning
claude-code "analysis: plan sprint 6 with full documentation
- Use grillme skill to interview about edge cases and risks
- Use xlsx skill to create task breakdown with estimates
- Use docx skill to document requirements and acceptance criteria
- Use to-prd skill to generate formal PRD
- Use artifact-diagramming to create architecture diagrams
- Use dataviz skill to create sprint velocity chart
- Use pptx skill to create stakeholder presentation"

# Quick sprint plan
claude-code "analysis: quick sprint plan for sprint 7
- Use xlsx skill for task breakdown
- Use pptx skill for presentation
- Use dataviz skill for velocity chart"
```

---

## 📁 Updated Configuration Files

### 1. .claude/subagents.yaml (Enhanced with Skills)

```yaml
version: "1.0"
agents:
  - name: CodingAgent
    model: claude-opus-4-1
    role: "Code Implementation & Development"
    context_size: 200000
    
    # Skills this agent can use
    skills:
      tier_1:
        - docx          # API specs, documentation
        - pptx          # Presentations
        - pdf           # Technical docs
      tier_2:
        - tdd           # Test-driven development
        - artifact-diagramming  # System diagrams
      tier_3:
        - artifact-design       # UI/UX mockups
        - skill-creator        # Advanced skills
    
    # Instructions for using skills
    instructions: |
      When implementing features:
      1. Use tdd skill for red-green-refactor cycle
      2. Write clear, testable code
      3. Use docx skill to document APIs
      4. Use artifact-diagramming for architecture
      5. Use pptx skill to present solution
      
      Always export deliverables with skills.
    
    subagents:
      - name: BackendBuilder
        role: "Laravel backend implementation"
        context: context-backend.md
      
      - name: FrontendBuilder
        role: "Vue 3 frontend implementation"
        context: context-frontend.md
      
      - name: DatabaseBuilder
        role: "PostgreSQL migrations & queries"
        context: context-backend.md
      
      - name: GitManager
        role: "Git operations and commits"
        context: context-project.md

  - name: ReviewAgent
    model: claude-sonnet-4
    role: "Quality & Security Assurance"
    context_size: 150000
    
    skills:
      tier_1:
        - recipbot-code-reviewer  # Code quality & security
        - pdf                     # Formal reports
        - xlsx                    # Metrics export
      tier_2:
        - test-reviewer          # Test quality
        - dataviz                # Performance charts
        - to-issues              # Auto-create issues
      tier_3:
        - artifact-capabilities  # Interactive dashboards
    
    instructions: |
      When reviewing code:
      1. Use recipbot-code-reviewer for quality check
      2. Use test-reviewer for test validation
      3. Use dataviz to visualize metrics
      4. Use xlsx to export findings
      5. Use pdf to create formal report
      6. Use to-issues to auto-create tasks
      
      Always provide comprehensive exports.
    
    subagents:
      - name: SecurityAuditor
        role: "OWASP Top 10 validation"
        context: context-security.md
      
      - name: PerformanceReviewer
        role: "Performance optimization"
        context: context-performance.md
      
      - name: CodeStyleChecker
        role: "Lint and style validation"
        context: context-quality.md
      
      - name: TestCoverageAnalyzer
        role: "Test coverage validation"
        context: definitions.md

  - name: AnalysisAgent
    model: claude-sonnet-4
    role: "Planning & Requirements Analysis"
    context_size: 150000
    
    skills:
      tier_1:
        - xlsx               # Sprint plans
        - pptx               # Presentations
        - docx               # Documentation
      tier_2:
        - to-prd             # Formal PRD
        - artifact-diagramming  # Architecture diagrams
        - dataviz            # Velocity charts
      tier_3:
        - grillme            # Requirement interviews
    
    instructions: |
      When planning sprints:
      1. Use grillme for requirement discovery (optional)
      2. Use xlsx to create task breakdown
      3. Use docx to document requirements
      4. Use to-prd to generate formal PRD
      5. Use artifact-diagramming for diagrams
      6. Use dataviz to visualize metrics
      7. Use pptx to create presentations
      
      Always provide exportable artifacts.
    
    subagents:
      - name: SpecParser
        role: "Extract requirements from specs"
        context: context-specs.md
      
      - name: TaskPlanner
        role: "Decompose features into tasks"
        context: context-roadmap.md
      
      - name: Estimator
        role: "Time and complexity estimation"
        context: definitions.md
      
      - name: BlockerAnalyzer
        role: "Identify risks and dependencies"
        context: context-architecture.md

# Shared contexts
shared_contexts:
  - conventions.md     # Code style, naming, Git
  - glossary.md        # Terminology
  - definitions.md     # Quality gates, metrics

# Workflows with skills
workflows:
  - name: feature_implementation
    trigger: "feature:"
    steps:
      - agent: AnalysisAgent
        task: "Extract and plan requirements"
        skills: [xlsx, docx]
      
      - agent: CodingAgent
        task: "Implement with TDD"
        skills: [tdd, docx, artifact-diagramming, pptx]
      
      - agent: ReviewAgent
        task: "Complete quality gate"
        skills: [recipbot-code-reviewer, test-reviewer, dataviz, pdf, xlsx, to-issues]

  - name: code_review
    trigger: "review:"
    steps:
      - agent: ReviewAgent
        task: "Automated quality review"
        skills: [recipbot-code-reviewer, test-reviewer, dataviz, pdf, xlsx, to-issues]

  - name: sprint_planning
    trigger: "analysis:"
    steps:
      - agent: AnalysisAgent
        task: "Complete sprint planning"
        skills: [grillme, xlsx, docx, to-prd, artifact-diagramming, dataviz, pptx]

# GitHub automation
github_automation:
  - trigger: pull_request.opened
    agent: ReviewAgent
    task: "Automated quality check"
    skills: [recipbot-code-reviewer, dataviz, pdf, to-issues]
    
  - trigger: pull_request.synchronize
    agent: ReviewAgent
    task: "Re-run quality check"
    skills: [recipbot-code-reviewer, test-reviewer]

# Harness automation
harness_automation:
  - pipeline: quality-gates
    agent: ReviewAgent
    task: "Quality validation"
    skills: [recipbot-code-reviewer, test-reviewer, pdf, xlsx]
  
  - pipeline: sprint-planning
    agent: AnalysisAgent
    task: "Sprint metrics"
    skills: [xlsx, dataviz, pptx]
```

---

## 🔄 Workflow Examples with Skills

### Workflow 1: Feature Implementation (Complete)

```yaml
# .claude/workflows/feature-implementation.yaml

name: Feature Implementation with Skills
description: "Implement feature with TDD, documentation, and reviews"

steps:
  # Phase 1: Analysis & Planning
  - phase: planning
    agent: AnalysisAgent
    task: |
      Extract requirements and create implementation plan
      
      Skills to use:
      - Use grillme skill to interview for edge cases
      - Use xlsx skill to create task breakdown
      - Use docx skill to document requirements
      - Use to-prd skill to generate formal PRD
      - Use artifact-diagramming to create architecture diagram
    
    outputs:
      - Sprint plan (XLSX)
      - Requirements doc (DOCX)
      - Architecture diagram (SVG/Mermaid)
      - PRD (DOCX)
      - Risk analysis (DOCX)

  # Phase 2: Implementation with TDD
  - phase: coding
    agent: CodingAgent
    task: |
      Implement feature using test-driven development
      
      Skills to use:
      - Use tdd skill for red-green-refactor cycle
      - Use docx skill to document API specification
      - Use artifact-diagramming to create flow diagrams
      - Use pptx skill to create implementation presentation
    
    outputs:
      - Code (GitHub PR)
      - Tests (Pest/Vitest)
      - API Spec (DOCX)
      - Flow diagrams (SVG/Mermaid)
      - Presentation (PPTX)

  # Phase 3: Comprehensive Review
  - phase: review
    agent: ReviewAgent
    task: |
      Complete quality assurance and create formal reports
      
      Skills to use:
      - Use recipbot-code-reviewer for OWASP + Laravel patterns
      - Use test-reviewer to validate test quality
      - Use dataviz skill to create performance chart
      - Use xlsx skill to export metrics spreadsheet
      - Use pdf skill to generate audit report
      - Use to-issues skill to auto-create issues for findings
    
    outputs:
      - Code review comment (GitHub)
      - Audit report (PDF)
      - Metrics spreadsheet (XLSX)
      - Performance chart (PNG/SVG)
      - GitHub issues (auto-created)
      - Test quality report (PDF)

# Success criteria
success_criteria:
  - All tests passing (>80% coverage)
  - Security audit passed (0 critical findings)
  - Performance within SLA (<200ms)
  - Formal documentation complete
  - All artifacts exported
  - Issues created for any findings
```

---

### Workflow 2: Security & Performance Audit

```yaml
name: Comprehensive Security & Performance Audit
description: "Full audit with formal reports and automated issue creation"

steps:
  - phase: security_audit
    agent: ReviewAgent
    task: |
      Execute comprehensive security and performance audit
      
      Skills to use:
      - Use recipbot-code-reviewer for OWASP Top 10 validation
      - Use test-reviewer to verify security test coverage
      - Use dataviz skill to create threat/vulnerability visualization
      - Use xlsx skill to create vulnerability tracking sheet
      - Use pdf skill to generate formal security report
      - Use to-issues skill to auto-create remediation issues
    
    outputs:
      - Security report (PDF)
      - Vulnerability tracker (XLSX)
      - Threat visualization (PNG/SVG)
      - GitHub issues (auto-created for remediations)
      - Remediation timeline (XLSX)
      - Risk assessment (PDF)

  - phase: performance_analysis
    agent: ReviewAgent
    task: |
      Analyze and optimize performance
      
      Skills to use:
      - Use recipbot-code-reviewer for performance issues
      - Use dataviz skill to create performance baseline chart
      - Use xlsx skill to export performance metrics
      - Use pdf skill to generate performance report
    
    outputs:
      - Performance report (PDF)
      - Metrics export (XLSX)
      - Baseline chart (PNG/SVG)
      - Optimization recommendations (PDF)
```

---

### Workflow 3: Sprint Planning with Complete Documentation

```yaml
name: Sprint Planning with Full Exports
description: "Plan sprint with all documentation and visualizations"

steps:
  - phase: requirements_analysis
    agent: AnalysisAgent
    task: |
      Analyze requirements and extract specs
      
      Skills to use:
      - Use grillme skill to interview for hidden requirements
      - Use docx skill to document all requirements
      - Use artifact-diagramming to create dependency diagram
    
    outputs:
      - Requirements doc (DOCX)
      - Dependency diagram (SVG/Mermaid)
      - Hidden requirements document (DOCX)

  - phase: sprint_planning
    agent: AnalysisAgent
    task: |
      Create comprehensive sprint plan with exports
      
      Skills to use:
      - Use xlsx skill to create task breakdown with estimates
      - Use docx skill to document acceptance criteria
      - Use to-prd skill to generate formal PRD
      - Use artifact-diagramming to create architecture diagram
      - Use dataviz skill to create velocity and burndown chart
      - Use pptx skill to create stakeholder presentation
    
    outputs:
      - Sprint plan (XLSX)
      - Acceptance criteria (DOCX)
      - Formal PRD (DOCX)
      - Architecture diagram (SVG/Mermaid)
      - Velocity chart (PNG/SVG)
      - Burndown projection (PNG/SVG)
      - Stakeholder presentation (PPTX)

  - phase: delivery
    deliverables:
      - Sprint backlog (XLSX) - ready for Jira import
      - Documentation package (DOCX x 3)
      - Presentations (PPTX)
      - Diagrams (SVG/Mermaid)
      - Charts (PNG)
```

---

## 📊 GitHub Actions Integration

**File**: `.github/workflows/recipbot-skills.yml`

```yaml
name: RecipBot Skills Automation

on:
  pull_request:
    types: [opened, synchronize, reopened]
  push:
    branches: [main, develop]
    paths:
      - 'app/**'
      - 'resources/**'
      - 'tests/**'

jobs:
  quality-gate-with-skills:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Run ReviewAgent Quality Gate
        run: |
          cat > /tmp/quality_gate.txt << 'EOF'
          review: complete quality gate with skill exports
          
          Use Tier 1 skills:
          - recipbot-code-reviewer: OWASP Top 10 + Laravel patterns
          - test-reviewer: Test coverage and quality validation
          - dataviz: Performance comparison chart
          - xlsx: Export metrics spreadsheet
          - pdf: Generate formal audit report
          
          Use Tier 2 skills:
          - to-issues: Auto-create GitHub issues for critical findings
          
          Deliverables:
          - Code review comment on PR
          - PDF audit report
          - XLSX metrics export
          - PNG/SVG performance chart
          - GitHub issues (if critical findings)
          EOF
          
          claude-code @/tmp/quality_gate.txt
      
      - name: Upload Artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: review-artifacts
          path: |
            *.pdf
            *.xlsx
            *.png
            *.svg
          retention-days: 30
      
      - name: Comment PR with Report
        if: github.event_name == 'pull_request'
        run: |
          # Claude will auto-comment with findings
          echo "✅ Quality gate complete - see artifacts above"

  sprint-metrics:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate Sprint Metrics
        run: |
          claude-code "analysis: generate sprint metrics
          
          Use Tier 1 skills:
          - xlsx: Export sprint metrics
          - dataviz: Create performance charts
          
          Use Tier 2 skills:
          - artifact-diagramming: Architecture update diagram
          
          Artifacts:
          - Metrics spreadsheet (XLSX)
          - Performance chart (PNG/SVG)
          - Architecture diagram (SVG/Mermaid)"
      
      - name: Archive Reports
        run: |
          mkdir -p .github/reports/$(date +%Y-%m-%d)
          mv *.xlsx *.png *.svg .github/reports/$(date +%Y-%m-%d)/ 2>/dev/null || true
      
      - name: Commit Reports
        run: |
          git config --local user.email "bot@recipbot.local"
          git config --local user.name "RecipBot"
          git add .github/reports/
          git commit -m "chore: update sprint metrics and charts" || true
          git push
```

---

## 🔧 Harness Pipeline Integration

**File**: `.harness/pipelines/recipbot-quality-gates.yaml`

```yaml
pipeline:
  name: RecipBot Quality Gates with Skills
  identifier: recipbot_quality_gates
  projectIdentifier: recipbot
  
  stages:
    - stage:
        name: Code Review with Skills
        identifier: code_review_skills
        type: Custom
        spec:
          execution:
            steps:
              - step:
                  name: ReviewAgent Quality Check
                  identifier: review_quality_check
                  type: ShellScript
                  spec:
                    shell: Bash
                    command: |
                      set -e
                      
                      echo "🔍 Starting ReviewAgent Quality Check"
                      
                      claude-code "review: execute quality gate with all skill exports
                      
                      Tier 1 Skills (CRITICAL):
                      - recipbot-code-reviewer: Code quality + security validation
                      - test-reviewer: Test quality and coverage
                      - dataviz: Performance baseline chart
                      - xlsx: Metrics spreadsheet
                      - pdf: Formal audit report
                      
                      Tier 2 Skills (HIGH VALUE):
                      - to-issues: Auto-create GitHub issues
                      
                      Output Requirements:
                      1. PDF audit report with findings
                      2. XLSX metrics export
                      3. PNG/SVG performance chart
                      4. GitHub issues for critical findings
                      
                      Report to: Harness + GitHub"
                      
                      echo "✅ ReviewAgent Quality Check Complete"
              
              - step:
                  name: Store Artifacts
                  identifier: store_artifacts
                  type: ShellScript
                  spec:
                    shell: Bash
                    command: |
                      mkdir -p /tmp/harness-artifacts
                      cp *.pdf /tmp/harness-artifacts/ 2>/dev/null || true
                      cp *.xlsx /tmp/harness-artifacts/ 2>/dev/null || true
                      cp *.png /tmp/harness-artifacts/ 2>/dev/null || true
                      cp *.svg /tmp/harness-artifacts/ 2>/dev/null || true
                      
                      echo "✅ Artifacts stored"

    - stage:
        name: Sprint Metrics Export
        identifier: sprint_metrics_export
        type: Custom
        spec:
          execution:
            steps:
              - step:
                  name: Generate Sprint Reports
                  identifier: generate_sprint_reports
                  type: ShellScript
                  spec:
                    shell: Bash
                    command: |
                      claude-code "analysis: generate sprint metrics and reports
                      
                      Tier 1 Skills:
                      - xlsx: Sprint velocity and burndown
                      - pptx: Stakeholder presentation
                      
                      Tier 2 Skills:
                      - dataviz: Velocity chart and trend analysis
                      - artifact-diagramming: Architecture update
                      
                      Deliverables:
                      - Sprint metrics (XLSX)
                      - Velocity chart (PNG/SVG)
                      - Stakeholder deck (PPTX)
                      - Architecture diagram (SVG)"

    - stage:
        name: Documentation Export
        identifier: documentation_export
        type: Custom
        spec:
          execution:
            steps:
              - step:
                  name: Generate Documentation
                  identifier: generate_docs
                  type: ShellScript
                  spec:
                    shell: Bash
                    command: |
                      claude-code "analysis: export all documentation
                      
                      Tier 1 Skills:
                      - docx: Requirements and specs
                      - pdf: Formal reports
                      
                      Tier 2 Skills:
                      - to-prd: Formal PRD generation
                      - artifact-diagramming: Architecture docs
                      
                      Export:
                      - Requirements (DOCX)
                      - PRD (DOCX)
                      - Specs (PDF)
                      - Diagrams (SVG)"
```

---

## 📈 Monitoring Skills Usage

### Tracking Metrics

```bash
# Create skill usage dashboard
cat > .github/scripts/track-skills.sh << 'EOF'
#!/bin/bash

# Log skill usage
log_skill_usage() {
  local skill=$1
  local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  local agent=$2
  
  echo "{
    \"timestamp\": \"$timestamp\",
    \"skill\": \"$skill\",
    \"agent\": \"$agent\",
    \"run_id\": \"$GITHUB_RUN_ID\"
  }" >> .github/metrics/skill-usage.jsonl
}

# Track exports
log_skill_usage "xlsx" "AnalysisAgent"
log_skill_usage "pdf" "ReviewAgent"
log_skill_usage "pptx" "AnalysisAgent"
EOF

chmod +x .github/scripts/track-skills.sh
```

---

## ✅ Implementation Checklist

### Week 1: Tier 1 Skills
- [ ] Enable recipbot-code-reviewer in ReviewAgent
- [ ] Configure xlsx exports for AnalysisAgent
- [ ] Configure pdf exports for ReviewAgent
- [ ] Configure docx exports for CodingAgent
- [ ] Configure pptx exports for AnalysisAgent
- [ ] Test feature workflow with Tier 1 skills
- [ ] Test review workflow with Tier 1 skills
- [ ] Test planning workflow with Tier 1 skills

### Week 2: Tier 2 Skills
- [ ] Enable test-reviewer for ReviewAgent
- [ ] Enable tdd/tdd-refactor for CodingAgent
- [ ] Enable dataviz for ReviewAgent & AnalysisAgent
- [ ] Enable to-issues for ReviewAgent
- [ ] Enable to-prd for AnalysisAgent
- [ ] Enable artifact-diagramming for CodingAgent & AnalysisAgent
- [ ] Test workflows with Tier 2 skills
- [ ] Measure productivity gains

### Week 3: Tier 3 Skills (Optional)
- [ ] Enable grillme for AnalysisAgent (optional)
- [ ] Enable artifact-design for CodingAgent (optional)
- [ ] Enable skill-creator for advanced use (optional)
- [ ] Fine-tune based on feedback

### Week 4: Pipeline Integration
- [ ] Update GitHub Actions workflows
- [ ] Update Harness pipelines
- [ ] Set up artifact archiving
- [ ] Configure metrics tracking
- [ ] Document team workflows
- [ ] Train team on new workflows

---

## 🎯 Success Metrics

Track these after implementation:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Code review time | -40% | Time from PR to review comment |
| Documentation completeness | 100% | All artifacts exported |
| Audit report generation | -70% | Time to generate PDF report |
| Issue creation | 100% automation | Critical findings → GitHub issues |
| Test coverage | ≥80% | PHPUnit + Vitest results |
| Security findings | Automated | OWASP validation automated |
| Sprint planning time | -50% | Time to create sprint plan |
| Export quality | 100% | All exports generated |

---

## 🚀 Next Steps

1. **Copy updated files to your project**
   ```bash
   cp subagents-with-skills.yaml .claude/subagents.yaml
   cp github-actions-skills.yml .github/workflows/recipbot-skills.yml
   cp harness-pipelines-skills.yaml .harness/pipelines/recipbot-quality-gates.yaml
   ```

2. **Verify configuration**
   ```bash
   # Check YAML syntax
   yamllint .claude/subagents.yaml
   yamllint .github/workflows/recipbot-skills.yml
   ```

3. **Test workflows**
   ```bash
   # Test feature implementation
   claude-code "feature: test skill integration"
   
   # Test review
   claude-code "review: test skill exports"
   
   # Test planning
   claude-code "analysis: test sprint planning skills"
   ```

4. **Monitor and refine**
   - Collect feedback from team
   - Adjust skill usage based on efficiency
   - Optimize workflows
   - Scale to full team usage

---

**Status**: 🟢 Ready for Implementation  
**Recommendation**: Start with Tier 1 this week, add Tier 2 next week

