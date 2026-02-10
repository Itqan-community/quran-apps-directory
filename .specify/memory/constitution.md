<!--
  SYNC IMPACT REPORT
  ==================
  Version change: N/A → 1.0.0 (initial ratification)

  Added sections:
  - Core Principles (5 principles)
  - Technology Stack Constraints
  - Development Workflow
  - Governance

  Modified principles: N/A (initial version)
  Removed sections: N/A (initial version)

  Templates status:
  - .specify/templates/plan-template.md: ✅ compatible (Constitution Check section present)
  - .specify/templates/spec-template.md: ✅ compatible (mandatory sections align)
  - .specify/templates/tasks-template.md: ✅ compatible (phase structure aligns)

  Deferred items: None
-->

# Quran Apps Directory Constitution

## Core Principles

### I. Bilingual-First

Every feature MUST support both Arabic and English languages with proper RTL/LTR handling.

**Non-negotiable rules:**
- All user-facing text MUST have translations in both `en.json` and `ar.json`
- Components MUST adapt layout direction based on active language
- URL structure MUST follow `/:lang/:page` pattern with language prefix
- Form validation messages MUST be bilingual
- SEO metadata (titles, descriptions) MUST exist in both languages

**Rationale:** The Quran Apps Directory serves the global Muslim community. Arabic is the
language of the Quran; English provides international accessibility.

### II. Performance Excellence

Features MUST be optimized for mobile networks and low-powered devices.

**Non-negotiable rules:**
- Images MUST use lazy loading and WebP format where supported
- New components MUST be standalone with explicit imports (no NgModules)
- Bundle size increase MUST NOT exceed 50KB per feature without justification
- API responses MUST be cached appropriately using the CacheInterceptor pattern
- Initial bundle MUST stay under 1.5MB warning / 2.0MB error thresholds

**Rationale:** Many users access from regions with limited bandwidth. Performance directly
impacts discoverability and user engagement.

### III. SEO & Discoverability

All pages MUST be optimized for search engine visibility and social sharing.

**Non-negotiable rules:**
- Every page MUST have unique meta title and description in both languages
- Schema.org structured data MUST be implemented for: WebSite, SoftwareApplication,
  ItemList, BreadcrumbList, and relevant entity types
- Sitemap MUST be regenerated when adding new routes or apps
- Canonical URLs MUST be set correctly with hreflang tags
- Open Graph and Twitter Card metadata MUST be present

**Rationale:** The directory's purpose is discoverability. If apps cannot be found through
search engines, the directory fails its mission.

### IV. KISS-DRY-SOLID

Code MUST follow Keep It Simple, Don't Repeat Yourself, and SOLID principles.

**Non-negotiable rules:**
- No premature abstractions: three similar lines are better than a premature helper
- Components MUST have single responsibility
- Services MUST be injectable and testable
- Shared logic MUST be extracted to services or pipes, not duplicated
- Dependencies MUST be explicit through constructor injection
- Avoid over-engineering: implement only what is requested

**Rationale:** Maintainable code enables rapid iteration. Complexity without justification
slows development and increases bugs.

### V. Accessibility

User interfaces MUST comply with WCAG 2.1 AA standards.

**Non-negotiable rules:**
- Interactive elements MUST have proper ARIA labels
- Color contrast MUST meet AA ratio requirements
- Keyboard navigation MUST be fully supported
- Focus states MUST be visible
- Screen reader compatibility MUST be verified for new components
- Theme toggle MUST preserve accessibility in both light and dark modes

**Rationale:** Quran apps serve users with diverse abilities. Excluding users with
disabilities contradicts the inclusive nature of Islamic teachings.

## Technology Stack Constraints

**Framework & Version:**
- Angular 20 with standalone components architecture
- TypeScript strict mode enabled
- ng-zorro-antd for UI components

**State Management:**
- RxJS BehaviorSubjects for service-level state
- Angular Signals for component-level reactivity (ThemeService pattern)

**Internationalization:**
- @ngx-translate for translations
- URL-based language detection via LanguageService

**HTTP Layer:**
- TimeoutInterceptor → CacheInterceptor → ErrorInterceptor chain
- Maximum 2-minute timeout on requests

**Build Requirements:**
- Gzip and Brotli compression for staging/production
- Sitemap generation before build

## Development Workflow

All tasks follow a three-phase workflow as defined in CLAUDE.md:

**Phase 1: PM (Requirements)**
- Gather requirements through simple questions
- Define scope boundaries and acceptance criteria
- Identify affected files and dependencies

**Phase 2: Architect (Design)**
- Design solution with clear boundaries and interfaces
- Consider bilingual, performance, and accessibility implications
- Document assumptions and constraints

**Phase 3: Developer (Implementation)**
- Implement clean code following KISS, DRY, SOLID
- Verify against all five constitution principles
- No git operations unless explicitly requested

**Review Requirements:**
- All PRs MUST demonstrate compliance with constitution principles
- Performance impact MUST be documented for bundle-affecting changes
- Bilingual support MUST be verified before merge

## Governance

**Amendment Procedure:**
1. Propose amendment with rationale in a dedicated PR
2. Document impact on existing code and templates
3. Update affected templates and documentation
4. Require maintainer approval before merge

**Versioning Policy:**
- MAJOR: Principle removal or incompatible redefinition
- MINOR: New principle or materially expanded guidance
- PATCH: Clarifications, wording, non-semantic changes

**Compliance Review:**
- Constitution principles MUST be checked during PR review
- Violations require explicit justification in PR description
- Repeated violations warrant team discussion

**Guidance File:** CLAUDE.md serves as the runtime development guidance and MUST remain
consistent with this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-02-07 | **Last Amended**: 2026-02-07
