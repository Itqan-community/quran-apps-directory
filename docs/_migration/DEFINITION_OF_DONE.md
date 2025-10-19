# Definition of Done: Documentation Consolidation

**Project:** Consolidate @docs/general → ./docs  
**Version:** 1.0  
**Created:** 2025-10-19  
**Status:** Active

---

## ✅ Consolidation is DONE when ALL of the following are true:

### 1. Content Migration Complete
- [ ] PRD, Strategy, Roadmap migrated to `docs/strategy/`
- [ ] Performance, SEO, i18n, Accessibility docs migrated to `docs/frontend/`
- [ ] Environments, Deployment, CI/CD, Runbooks, Security migrated to `docs/infra/`
- [ ] Backend overview migrated to `docs/backend/`
- [ ] Glossary, ADRs migrated to `docs/reference/`
- [ ] All consolidation-map.csv entries executed
- [ ] No critical topics remain unmigrated

### 2. No Information Loss or Duplication
- [ ] gap-analysis.csv shows 100% coverage of critical topics
- [ ] No gap-analysis entry has status "missing" without a migration plan
- [ ] consolidation-map.csv shows all files accounted for
- [ ] Each topic has exactly ONE canonical location (no duplicates)
- [ ] All unique sections from @docs/general are represented in ./docs

### 3. Links and References Work
- [ ] markdown-link-check passes with 0 errors
- [ ] All internal cross-references (`[text](path.md#heading)`) verified
- [ ] All image paths corrected to `docs/assets/`
- [ ] No broken relative links from root docs to new sections
- [ ] All references from CLAUDE.md to docs are valid

### 4. Directory Structure Created
- [ ] `docs/strategy/` with prd.md, strategy.md, roadmap.md, release-plan.md
- [ ] `docs/frontend/` with performance.md, architecture.md, seo.md, accessibility.md, theming-dark-mode.md, i18n.md
- [ ] `docs/infra/` with environments.md, deployment.md, ci-cd.md, observability-runbooks.md, security.md
- [ ] `docs/backend/` with overview.md, api-roadmap.md
- [ ] `docs/reference/` with glossary.md, contributing.md, adr-index.md
- [ ] `docs/adr/` with individual ADR files
- [ ] `docs/assets/` for images and diagrams
- [ ] `docs/_migration/` with manifests and reports

### 5. Formatting and Normalization
- [ ] All heading levels normalized (H1 for titles, H2 for sections, H3 for subsections)
- [ ] Consistent markdown style across all new files
- [ ] Code blocks properly formatted with language identifiers
- [ ] Table formatting consistent
- [ ] No trailing whitespace or inconsistent indentation
- [ ] Line length reasonable (< 120 chars) where applicable

### 6. Quality Assurance Sign-Offs
- [ ] **@pm sign-off**: Strategic docs (PRD, Strategy, Roadmap) are complete, coherent, and accurate
- [ ] **@architect sign-off**: Technical docs (Performance, SEO, i18n, Backend) are accurate and complete
- [ ] **@qa sign-off**: All validation checks passed, link check passed, coverage verified
- [ ] **@bmad-master sign-off**: Process followed correctly, all gates passed, ready to merge

### 7. Migration Artifacts Produced
- [ ] `docs/_migration/manifests/inventory-general.csv` - File list with sizes and checksums
- [ ] `docs/_migration/manifests/inventory-root.csv` - File list of root docs
- [ ] `docs/_migration/manifests/headings-general.txt` - Headings from general docs
- [ ] `docs/_migration/manifests/headings-root.txt` - Headings from root docs
- [ ] `docs/_migration/classification.json` - File classification mapping
- [ ] `docs/_migration/gap-analysis.csv` - Gap analysis with coverage scores
- [ ] `docs/_migration/consolidation-map.csv` - Exact migration mapping
- [ ] `docs/_migration/migration-log.md` - Detailed execution log with commit hashes

### 8. Entry Points Updated
- [ ] `docs/index.md` created with navigation hub linking all sections
- [ ] `docs/index.md` includes Quick Navigation, Existing Docs, and Search index
- [ ] `CLAUDE.md` updated to reference new docs structure as canonical source
- [ ] `CLAUDE.md` includes links to strategy, frontend, infra, backend sections
- [ ] `.github/CODEOWNERS` updated with doc section owners
- [ ] `README.md` points to `docs/index.md` for documentation

### 9. Archive Prepared
- [ ] `docs/_archive/general/` directory created with structure preserved
- [ ] All archivable files from @docs/general moved to archive
- [ ] `docs/_migration/archive-list.txt` documents all archived files and rationale
- [ ] `@docs/general/README.md` redirects readers to `./docs` (stub left for 30 days)
- [ ] Git history preserved (no force deletes, clean moves with `git mv`)
- [ ] Rollback procedure documented (reachable via git log)

### 10. PR Review Completed
- [ ] PR title: "docs: consolidate @docs/general into root ./docs"
- [ ] PR description includes:
  - Overview of consolidation
  - Changes summary (files migrated, new docs created, etc.)
  - Validation checklist results
  - Artifacts attached (manifests, gap-analysis, consolidation-map, migration-log, archive-list)
- [ ] PR includes link to this Definition of Done
- [ ] All CI checks pass (linting, link checking, etc.)
- [ ] No merge conflicts
- [ ] PR approved by @pm, @architect, @qa, @bmad-master (in that order)

### 11. Merge and Post-Merge
- [ ] PR merged to develop branch (not main)
- [ ] All commits preserved with meaningful messages (e.g., "docs: migrate PRD to strategy/prd.md")
- [ ] Feature branch cleaned up (deleted locally and on origin)
- [ ] Notification sent to team with link to docs/index.md
- [ ] 30-day archive rollback window begins (expires 2025-11-19)

---

## 🚨 Exit Criteria (STOP if ANY of these are true)

- [ ] ❌ Critical topic from @docs/general missing from ./docs
- [ ] ❌ Information loss detected (unique content not migrated)
- [ ] ❌ Duplicate canonical sources for same topic (e.g., performance guidance in both docs/frontend/performance.md and docs/DEVELOPMENT.md)
- [ ] ❌ Link check fails with broken references
- [ ] ❌ Image assets missing or paths incorrect
- [ ] ❌ Stakeholder (pm, architect, qa, bmad-master) unable to sign off
- [ ] ❌ Process deviations not documented and approved

---

## 📋 Sign-Off Template

Use this template when all criteria are met:

```markdown
## Definition of Done Sign-Off

**Date:** [DATE]  
**Consolidation Branch:** feature/docs-consolidation-general-to-root  
**PR Number:** #[PR_NUMBER]

### Approvals
- [ ] @pm (Strategic docs completeness)
- [ ] @architect (Technical docs accuracy)
- [ ] @qa (Validation and link checking)
- [ ] @bmad-master (Process compliance)

### Artifacts Verified
- [x] manifests/ directory complete
- [x] gap-analysis.csv generated and reviewed
- [x] consolidation-map.csv executed
- [x] migration-log.md created
- [x] archive-list.txt generated

### Result
✅ **APPROVED FOR MERGE**

Signed: [ROLE] on [DATE]
```

---

## 📊 Tracking Checklist

Use this during execution to track progress:

- [ ] **Step 1**: Scope, setup, manifests created ✓
- [ ] **Step 2**: Inventory completed
- [ ] **Step 3**: Gap analysis completed
- [ ] **Step 4**: Consolidation map created
- [ ] **Step 5**: Target structure in place
- [ ] **Step 6**: Migration executed
- [ ] **Step 7**: Validation passed
- [ ] **Step 8**: Migration log created
- [ ] **Step 9**: Archive prepared
- [ ] **Step 10**: Entry points updated
- [ ] **Step 11**: PR ready for review

---

**This Definition of Done is the single source of truth for consolidation completion.**

Any deviations or exceptions must be documented and approved by @bmad-master.
