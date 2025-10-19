# Documentation Consolidation Plan: @docs/general → ./docs

**Status:** Ready for Execution  
**Created:** 2025-10-19  
**Process Model:** BMAD workflow (Planning Phase + Development Phase)

---

## 📋 Executive Summary

This plan consolidates critical documentation from `@docs/general` into the root `./docs` directory without information loss. The consolidation prioritizes:

1. **Strategic and Product documents** (PRD, Strategy, Roadmap)
2. **Technical optimization** (Performance, SEO, Accessibility, i18n)
3. **Infrastructure and Operations** (Environments, Deployment, CI/CD, Runbooks, Security)
4. **Reference and Supporting** (Backend overview, Glossary, ADRs)

**Outcome:** Single canonical documentation source in `./docs`, with `@docs/general` archived after 30 days if no rollback needed.

---

## 🎯 Priority Order

### Phase 1: Strategic & Product (Day 2)
- Product Requirements Document (PRD)
- Product Strategy
- Roadmap with phases and epics
- Release planning

### Phase 2: Technical Optimization (Day 3 AM)
- Performance budgets and Lighthouse workflow
- Frontend architecture and patterns
- SEO strategy (Schema.org, sitemap, hreflang)
- Accessibility and i18n guidelines
- Dark mode and theming

### Phase 3: Infrastructure & Operations (Day 3 PM)
- Environment configuration (.env, variables)
- Deployment workflows and URLs
- CI/CD branching and automation
- Observability and runbooks
- Security policy

### Phase 4: Reference & Supporting (Day 4)
- Backend Phase 2 overview (Django, DRF, API)
- Glossary and contribution guidelines
- ADRs for major architectural decisions

---

## 👥 BMAD Roles

| Role | Responsibilities |
|------|------------------|
| **@bmad-master** | Process gates, approvals, final sign-off |
| **@analyst** | Inventory, classification, gap analysis, PRD/strategy content validation |
| **@pm** | Structure design, consolidation mapping, content curation, timeline |
| **@architect** | Technical content validation, performance budgets, backend architecture |
| **@qa** | Validation framework, link checks, coverage verification, sign-off |
| **@dev** | File operations, content migration, link normalization, git history preservation |

---

## 📁 Target Structure

```
docs/
├── index.md                      # Hub linking all sections
├── ARCHITECTURE.md               # Keep existing (system overview)
├── SYSTEM-ARCHITECTURE.md        # Keep existing (detailed architecture)
├── DEVELOPMENT.md                # Keep existing
├── DEPLOYMENT.md                 # Keep existing
├── BACKLOG.md                    # Keep existing
├── README.md                     # Keep existing
│
├── strategy/                     # NEW: Strategic docs
│   ├── prd.md                    # Product Requirements Document
│   ├── strategy.md               # Product Strategy
│   ├── roadmap.md                # Quarterly roadmap with milestones
│   └── release-plan.md           # Release planning and criteria
│
├── frontend/                     # NEW: Frontend technical guidance
│   ├── performance.md            # Budgets, Lighthouse, optimizations
│   ├── architecture.md           # Component structure, patterns
│   ├── seo.md                    # Meta, structured data, sitemap
│   ├── accessibility.md          # ARIA, WCAG, color contrast
│   ├── theming-dark-mode.md      # ThemeService, CSS custom properties
│   └── i18n.md                   # Translation flow, RTL, localization
│
├── infra/                        # NEW: Infrastructure & Operations
│   ├── environments.md           # .env vars, Angular configs
│   ├── deployment.md             # Branch mappings, build steps
│   ├── ci-cd.md                  # Branching model, automation
│   ├── observability-runbooks.md # Procedures, troubleshooting
│   └── security.md               # Secrets, CORS, HTTPS, rate limiting
│
├── backend/                      # NEW: Backend (Phase 2)
│   ├── overview.md               # Django 5.2, DRF, Celery
│   └── api-roadmap.md            # API phase 2 features
│
├── reference/                    # NEW: Supporting docs
│   ├── glossary.md               # Terminology
│   ├── contributing.md           # Code style, PRs, testing
│   └── adr-index.md              # Architecture Decision Records
│
├── adr/                          # NEW: Individual ADRs
│   ├── adr-0001-frontend-stack.md
│   ├── adr-0002-seo-architecture.md
│   └── ...
│
├── assets/                       # NEW: Images for docs
│   ├── diagrams/
│   └── screenshots/
│
└── _migration/                   # NEW: Migration artifacts
    ├── manifests/
    │   ├── inventory-general.csv
    │   ├── inventory-root.csv
    │   ├── headings-general.txt
    │   ├── headings-root.txt
    │   └── general-topic-hits.txt
    ├── classification.json
    ├── gap-analysis.csv
    ├── consolidation-map.csv
    ├── migration-log.md
    └── archive-list.txt

docs/_archive/                    # Archive: Old @docs/general
└── general/                      # Preserved for 30 days
    └── [archived files]
```

---

## 🔄 11-Step Execution Process

### Step 1: Define Scope & Setup (30 min)
- [x] Create feature branch: `feature/docs-consolidation-general-to-root`
- [ ] Create `docs/_migration/` directory structure
- [ ] Define Definition of Done

**Owner:** @bmad-master, @pm

---

### Step 2: Inventory & Classify (1-2 hours)
Generate manifests for both directories:
```bash
# Inventory with sizes and checksums
find @docs/general -type f | sort | xargs -I {} sh -c 'echo -n "{},"; wc -c "{}" | awk "{print \$1}"; shasum "{}" | awk "{print \$1}"' > docs/_migration/manifests/inventory-general.csv

find docs -type f -not -path "docs/_migration/*" | sort | xargs -I {} sh -c 'echo -n "{},"; wc -c "{}" | awk "{print \$1}"; shasum "{}" | awk "{print \$1}"' > docs/_migration/manifests/inventory-root.csv

# Extract headings for classification
rg -n "^#+\ " @docs/general | sed 's/:/ | /' > docs/_migration/manifests/headings-general.txt
rg -n "^#+\ " docs | sed 's/:/ | /' > docs/_migration/manifests/headings-root.txt
```

**Deliverable:** `inventory-general.csv`, `inventory-root.csv`, headings files  
**Owner:** @analyst

---

### Step 3: Gap Analysis (2-3 hours)
Find topics in @docs/general missing from ./docs:
```bash
# Topic search
rg -n -i "(prd|product requirements|strategy|roadmap|kpi|persona|performance|lighthouse|seo|deployment|ci|runbook|security|adr)" @docs/general > docs/_migration/manifests/general-topic-hits.txt

rg -n -i "(prd|product requirements|strategy|roadmap|kpi|persona|performance|lighthouse|seo|deployment|ci|runbook|security|adr)" docs > docs/_migration/manifests/root-topic-hits.txt
```

Produce: `docs/_migration/gap-analysis.csv` with:
- source_path
- topic
- category (Strategic, Technical, Infra, Reference)
- closest_root_path
- coverage_score (0.0-1.0)
- status (missing, partial, duplicate)
- notes

**Owner:** @analyst; validate with @pm

---

### Step 4: Exact Content Mapping (2-3 hours)
Create `docs/_migration/consolidation-map.csv`:

| source_path | target_path | action | sections_to_migrate | notes | owner |
|-------------|-------------|--------|---------------------|-------|-------|
| @docs/general/product-requirements-document.md | docs/strategy/prd.md | merge | Vision; Scope; Non-goals; Personas; KPIs; Success Metrics; Acceptance Criteria | Adopt latest KPIs as canonical | @analyst |
| @docs/general/comprehensive-performance-optimization.md | docs/frontend/performance.md | append | Performance Budgets; Lighthouse Commands; Bundle Analysis; Angular Optimizations | Keep project targets (Mobile 70+, Desktop 85+) | @architect |
| @docs/general/seo-setup-guide.md + schema-org-implementation.md | docs/frontend/seo.md | merge | Meta Strategy; Structured Data; Sitemap Process; Canonical/hreflang | Consolidate into single reference | @architect |
| @docs/general/environment-setup.md | docs/infra/environments.md | merge | Environment Variables; Angular Config Mapping; .env Examples | Ensure all vars documented | @pm |
| @docs/general/deployment.md | docs/infra/deployment.md | merge | Branch Mappings; Build Commands; Artifact Paths; Compression | Keep existing DEPLOYMENT.md and supplement | @pm |
| @docs/general/django-architecture-supplement.md | docs/backend/overview.md | append | Django Setup; Models; Serializers; Admin Config; ViewSets Examples | Code examples valuable for developers | @architect |

**Owner:** @pm drafts; @pm + @architect approve

---

### Step 5: Create Target Structure (30 min)
```bash
# Create directories
mkdir -p docs/{strategy,frontend,infra,backend,reference,adr,assets}

# Create stub files with headings (to be filled)
touch docs/{strategy,frontend,infra,backend,reference}/{prd,strategy,roadmap,release-plan,performance,architecture,seo,accessibility,theming-dark-mode,i18n,environments,deployment,ci-cd,observability-runbooks,security,overview,api-roadmap,glossary,contributing,adr-index}.md
```

**Owner:** @dev

---

### Step 6: Execute Migration (4-6 hours)

**Order:** Strategic & Product → Technical → Infra → Reference

For each consolidation-map entry:

**If action = "move":**
```bash
git mv @docs/general/source.md docs/target/source.md
# Then split if needed into multiple files
```

**If action = "merge" or "append":**
```bash
# Copy sections from source into target under matching headings
# Resolve duplicates, prefer newer content
# Normalize formatting and links
```

**Normalization checks:**
- [ ] Heading levels consistent with existing ./docs style
- [ ] Relative links updated (e.g., `@docs/general/file.md` → `../other.md`)
- [ ] Image paths corrected to `docs/assets/`
- [ ] Cross-references added (e.g., "See also:" links)
- [ ] CLAUDE.md referenced where applicable

**Owner:** @dev; review by @pm

---

### Step 7: Validate & Link Check (2-3 hours)

Automated checks:
```bash
# Check all Markdown links
markdown-link-check docs/**/*.md

# Verify all referenced headings exist
rg -o "\[.*\]\(.*#.*\)" docs | xargs -I {} echo "Check: {}"

# Find broken image paths
rg -o "!\[.*\]\(.*\)" docs | grep -v "^https://" | xargs -I {} test -f "docs/{}" || echo "Missing: {}"
```

Manual reviews:
- [ ] @pm: Strategic docs complete and coherent
- [ ] @architect: Technical accuracy of performance, SEO, backend sections
- [ ] @qa: Completeness checklist
- [ ] @bmad-master: Process compliance

**Owner:** @qa coordinates

---

### Step 8: Create Migration Log (1 hour)
Document `docs/_migration/migration-log.md`:
```markdown
## Migration Log

### Moved/Merged Files
- [x] PRD: @docs/general/product-requirements-document.md → docs/strategy/prd.md (Commit: abc123)
- [x] Performance: @docs/general/comprehensive-performance-optimization.md → docs/frontend/performance.md (Commit: def456)
- ...

### Content Reconciliation
- PRD: Merged personas section from general/product-strategy.md
- Performance: Appended Lighthouse commands from general/performance-optimization-plan.md
- ...

### Artifacts Generated
- Total files migrated: 12
- New docs created: 8
- Modified docs: 5
- Total lines added: 2,847
```

**Owner:** @dev

---

### Step 9: Archive Old Docs (1 hour)

Criteria for archival:
- Gap-analysis shows coverage ≥ 0.9 AND status = duplicate
- All unique sections migrated and validated
- No references remain from active docs

Actions:
```bash
# Create archive structure
mkdir -p docs/_archive/general

# Move archivable files
git mv @docs/general/file1.md docs/_archive/general/
git mv @docs/general/file2.md docs/_archive/general/

# Create stub redirect in @docs/general/README.md
echo "# Archived - See ./docs

All documentation has been consolidated into the root \`./docs\` directory.
Please refer there for current guidance.

For historical reference, archived documents are in \`docs/_archive/general/\`." > @docs/general/README.md
```

Create `docs/_migration/archive-list.txt`:
```
Archived from @docs/general (date: 2025-10-19):
- product-requirements-document.md → docs/_archive/general/
- comprehensive-performance-optimization.md → docs/_archive/general/
- seo-setup-guide.md → docs/_archive/general/
... (total N files)

Final deletion scheduled: 2025-11-19 (30 days)
Rollback procedure: git checkout @docs/general/
```

**Owner:** @pm proposes; @bmad-master approves; @dev executes

---

### Step 10: Update Entry Points (1 hour)

**Update `docs/index.md` (or README.md):**
```markdown
# Quran Apps Directory - Documentation

Welcome to the complete documentation for the Quran Apps Directory project.

## 🎯 Quick Navigation

### Strategy & Planning
- [Product Requirements (PRD)](./strategy/prd.md) - Vision, scope, personas, success metrics
- [Product Strategy](./strategy/strategy.md) - Positioning, competitive landscape, key bets
- [Roadmap](./strategy/roadmap.md) - Quarterly milestones and epics
- [Release Planning](./strategy/release-plan.md) - Release criteria and checklist

### Frontend Development
- [Performance Optimization](./frontend/performance.md) - Budgets, Lighthouse, optimizations
- [Architecture](./frontend/architecture.md) - Component structure, patterns, best practices
- [SEO Strategy](./frontend/seo.md) - Meta, structured data, sitemap, canonical
- [Accessibility](./frontend/accessibility.md) - ARIA, WCAG, color contrast
- [Theming & Dark Mode](./frontend/theming-dark-mode.md) - ThemeService, CSS custom properties
- [Internationalization](./frontend/i18n.md) - Translation flow, RTL, localization

### Infrastructure & Operations
- [Environment Configuration](./infra/environments.md) - Variables, .env, Angular configs
- [Deployment](./infra/deployment.md) - Build steps, branch mappings, artifact paths
- [CI/CD & Automation](./infra/ci-cd.md) - Branching model, triggers, workflows
- [Observability & Runbooks](./infra/observability-runbooks.md) - Procedures, troubleshooting
- [Security](./infra/security.md) - Secrets, CORS, HTTPS, rate limiting

### Backend (Phase 2)
- [Backend Overview](./backend/overview.md) - Django 5.2, DRF, API architecture
- [API Roadmap](./backend/api-roadmap.md) - Phase 2+ features

### Reference
- [Architecture Decisions](./reference/adr-index.md) - ADRs for major design decisions
- [Glossary](./reference/glossary.md) - Project terminology
- [Contributing](./reference/contributing.md) - Code style, testing, PR process

## 📊 Existing Architecture Docs
- [Architecture Overview](./ARCHITECTURE.md) - System design
- [System Architecture](./SYSTEM-ARCHITECTURE.md) - Detailed architecture
- [Development Guide](./DEVELOPMENT.md) - Setup and dev workflow
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Development Backlog](./BACKLOG.md) - User stories and tasks
```

**Update `CLAUDE.md`:**
Add under relevant sections:
```markdown
## Documentation Structure

All project documentation is consolidated in `docs/` with the following hierarchy:

### Strategic Guidance
For project vision, planning, and business metrics, see:
- `docs/strategy/prd.md` - Product requirements and personas
- `docs/strategy/strategy.md` - Product strategy and positioning
- `docs/strategy/roadmap.md` - Development roadmap and milestones

### Technical Specifications
For development guidance, see:
- `docs/frontend/performance.md` - Performance targets and optimization techniques
- `docs/frontend/seo.md` - SEO and structured data implementation
- `docs/infra/environments.md` - Environment variables and configuration
- `docs/backend/overview.md` - Backend architecture (Phase 2)

### Operations Reference
For deployment and troubleshooting, see:
- `docs/infra/deployment.md` - Deployment process and URLs
- `docs/infra/ci-cd.md` - CI/CD branching and automation
- `docs/infra/observability-runbooks.md` - Operational procedures
```

**Add CODEOWNERS entry:**
```
# Strategy and Planning
docs/strategy/ @pm @analyst

# Frontend Development
docs/frontend/ @architect @dev

# Infrastructure
docs/infra/ @architect @dev
docs/adr/ @architect

# Backend
docs/backend/ @architect

# Reference and Supporting
docs/reference/ @pm
```

**Owner:** @pm with @bmad-master approval

---

### Step 11: Final PR & Merge (2 hours)

**PR Checklist:**
```markdown
## Documentation Consolidation: @docs/general → ./docs

### Overview
Consolidates critical documentation from `@docs/general` into root `./docs` without information loss.

### Changes
- [x] Strategic docs migrated (PRD, Strategy, Roadmap) → `docs/strategy/`
- [x] Technical optimization docs (Performance, SEO, i18n) → `docs/frontend/`
- [x] Infrastructure docs (Environments, Deployment, CI/CD) → `docs/infra/`
- [x] Backend Phase 2 overview → `docs/backend/`
- [x] Reference docs (Glossary, ADRs) → `docs/reference/`
- [x] All links validated and corrected
- [x] Entry points updated (docs/index.md, CLAUDE.md)
- [x] CODEOWNERS updated
- [x] Old docs archived in `docs/_archive/general/`

### Validation
- [x] Link check: All references valid
- [x] Coverage check: All topics from gap-analysis.csv migrated
- [x] Completeness: @pm, @architect, @qa sign-off

### Artifacts Included
- `docs/_migration/gap-analysis.csv`
- `docs/_migration/consolidation-map.csv`
- `docs/_migration/migration-log.md`
- `docs/_migration/archive-list.txt`
- Updated `docs/index.md` and `CLAUDE.md`

### Post-Merge
- [ ] 30-day archive period: `docs/_archive/general/` available for rollback
- [ ] Scheduled cleanup: 2025-11-19 (remove archives if no issues)
- [ ] Team notification: Update Slack/Email with new docs structure

### Reviewers
- [ ] @pm: Strategic docs quality and completeness
- [ ] @architect: Technical accuracy of performance, SEO, backend sections
- [ ] @qa: Validation and link checking
- [ ] @bmad-master: Process compliance and final approval
```

**Owner:** @dev creates PR; all roles sign off; @bmad-master merges

---

## 📅 Timeline Summary

| Day | Phase | Duration | Owner | Deliverables |
|-----|-------|----------|-------|--------------|
| 1 | Setup & Inventory | 2-3 hrs | @analyst | Inventories, manifests, classification |
| 1 | Gap Analysis | 2-3 hrs | @analyst | gap-analysis.csv |
| 2 | Content Mapping | 2-3 hrs | @pm | consolidation-map.csv |
| 2 | Structure & Strategic Docs | 4-5 hrs | @pm, @dev | docs/strategy/*, directory structure |
| 3 | Technical Docs | 4-5 hrs | @architect, @dev | docs/frontend/*, docs/backend/* |
| 3 | Infra Docs | 3-4 hrs | @pm, @dev | docs/infra/* |
| 4 | Validation & Links | 2-3 hrs | @qa, @dev | migration-log.md, validation report |
| 4 | Archival & Entry Points | 2 hrs | @pm, @dev | archive-list.txt, updated CLAUDE.md |
| 5 | PR & Merge | 2 hrs | @dev, all | Approved PR, merged to develop |

**Total Effort:** ~30-35 hours (5 days with 1 person per role)

---

## ✅ Definition of Done

A consolidation is complete when:

1. **All critical topics from @docs/general are in ./docs**
   - [ ] PRD, Strategy, Roadmap migrated → `docs/strategy/`
   - [ ] Performance, SEO, i18n docs migrated → `docs/frontend/`
   - [ ] Environments, Deployment, CI/CD docs migrated → `docs/infra/`
   - [ ] Backend overview migrated → `docs/backend/`
   - [ ] Glossary, ADRs migrated → `docs/reference/`

2. **No duplicates or conflicts**
   - [ ] gap-analysis.csv shows no unresolved duplicates
   - [ ] Canonical source identified for each topic
   - [ ] consolidation-map.csv fully executed

3. **All references work**
   - [ ] Link check passes (markdown-link-check)
   - [ ] All headings referenced exist
   - [ ] All image paths valid and updated
   - [ ] No broken relative links

4. **Quality and accuracy verified**
   - [ ] @pm approves Strategic docs
   - [ ] @architect approves Technical docs
   - [ ] @qa sign-off on validation report
   - [ ] @bmad-master approves process compliance

5. **Entry points updated**
   - [ ] `docs/index.md` created/updated with navigation hub
   - [ ] `CLAUDE.md` updated to reference new structure
   - [ ] `CODEOWNERS` updated for docs sections
   - [ ] PR merged to develop branch

6. **Archive prepared**
   - [ ] Old @docs/general files moved to `docs/_archive/general/`
   - [ ] archive-list.txt documenting all archived files
   - [ ] 30-day rollback window documented

---

## 🚀 Success Criteria

- ✅ **No information loss**: Every critical topic from @docs/general is present in ./docs
- ✅ **Single source of truth**: Each topic has one canonical location
- ✅ **Complete navigation**: docs/index.md and CLAUDE.md link to all sections
- ✅ **Team alignment**: All roles understand new structure
- ✅ **Safe archival**: Old docs preserved for 30 days
- ✅ **Quality gates passed**: Link check, coverage check, stakeholder approvals

---

## 🔗 Related Documents

- Inventory: `docs/_migration/manifests/inventory-general.csv`
- Gap Analysis: `docs/_migration/gap-analysis.csv`
- Consolidation Map: `docs/_migration/consolidation-map.csv`
- Migration Log: `docs/_migration/migration-log.md`
- Archive List: `docs/_migration/archive-list.txt`

---

**Plan Status:** ✅ Ready for Execution  
**Approval Gate:** Pending @bmad-master sign-off  
**Next Step:** Begin Step 1 (Define Scope & Setup)
