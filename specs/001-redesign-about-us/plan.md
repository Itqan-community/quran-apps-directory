# Implementation Plan: Redesign About Us Page

**Branch**: `001-redesign-about-us` | **Date**: 2026-02-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-redesign-about-us/spec.md`

## Summary

Redesign the About Us page to match the app listing page style with teal gradient ellipse decorations, modern card-based layout, and category pill badges. The design uses specific Figma-provided ellipse values for the hero background and maintains all 8 existing content sections with updated visual styling.

## Technical Context

**Language/Version**: TypeScript 5.x with Angular 20
**Primary Dependencies**: Angular 20, ng-zorro-antd, @ngx-translate/core, SCSS
**Storage**: N/A (static page, no data persistence)
**Testing**: Manual visual testing across viewports
**Target Platform**: Web (Desktop 1024px+, Tablet 768-1024px, Mobile <768px)
**Project Type**: Web application (Angular frontend)
**Performance Goals**: Page load <2s on 3G, Lighthouse 90+
**Constraints**: Bundle increase <50KB, WCAG AA compliance
**Scale/Scope**: Single page redesign affecting 3 files (HTML, SCSS, TS)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Notes |
|-----------|------------|-------|
| I. Bilingual-First | ✅ PASS | Reuses existing translation keys, RTL support included |
| II. Performance Excellence | ✅ PASS | CSS-only changes, no new dependencies, <50KB impact |
| III. SEO & Discoverability | ✅ PASS | No route changes, existing meta tags preserved |
| IV. KISS-DRY-SOLID | ✅ PASS | Single component modification, no new abstractions |
| V. Accessibility | ✅ PASS | Focus states, color contrast, keyboard nav preserved |

**Gate Status**: PASSED - All constitution principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/001-redesign-about-us/
├── plan.md              # This file
├── research.md          # Design analysis and decisions
├── data-model.md        # N/A (no data entities)
├── quickstart.md        # Testing guide
└── contracts/           # N/A (no API changes)
```

### Source Code (repository root)

```text
src/app/pages/about-us/
├── about-us.component.html    # Template restructure
├── about-us.component.scss    # Complete style rewrite
└── about-us.component.ts      # Minor updates if needed
```

**Structure Decision**: Frontend-only changes in existing Angular component. No new files required.

## Design Specifications

### Hero Background Ellipses (from Figma)

```scss
// Ellipse 2 - Large teal blur (primary)
.hero-ellipse-large {
  position: absolute;
  width: 990px;
  height: 990px;
  left: -686px;
  top: 156px;
  background: #12BCAC;
  filter: blur(165px);
  transform: rotate(30deg);
}

// Ellipse 1 - Medium teal
.hero-ellipse-medium {
  position: absolute;
  width: 584px;
  height: 583px;
  left: -428px;
  top: 466px;
  background: #15A295;
  opacity: 0.4;
  filter: blur(0px);
  transform: rotate(30deg);
}

// Ellipse 3 - Small dark teal
.hero-ellipse-small {
  position: absolute;
  width: 302px;
  height: 301px;
  left: -235px;
  top: 659px;
  background: #186861;
  filter: blur(0px);
  transform: rotate(30deg);
}
```

### Color Palette

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Hero ellipse large | #12BCAC | #0D8A7D |
| Hero ellipse medium | #15A295 | #107A6E |
| Hero ellipse small | #186861 | #0F4F4A |
| Card background | #FFFFFF | #2A2A2A |
| Card border | #E8E8E8 | #3A3A3A |
| Section title | #1A1A1A | #F0F0F0 |
| Body text | #666666 | #B3B3B3 |
| Category pill bg | #F5F5F5 | #333333 |
| Category pill border | #E0E0E0 | #444444 |

### Section Layout

| Section | Desktop Columns | Tablet Columns | Mobile Columns |
|---------|-----------------|----------------|----------------|
| What We Do | 3 | 2 | 1 |
| Why Choose Us | 3 | 2 | 1 |
| Categories | Inline pills | Inline pills | 2-column grid |
| Values | 3 | 2 | 1 |
| ITQAN Projects | 5 | 3 | 2 |

### Component Structure

```html
<div class="about-us-page">
  <!-- Hero Section -->
  <section class="hero-section">
    <div class="hero-background">
      <!-- Ellipses via CSS pseudo-elements -->
    </div>
    <div class="hero-content">
      <img class="logo" />
      <h1>{{ title }}</h1>
      <p class="subtitle">{{ subtitle }}</p>
      <p class="intro">{{ intro }}</p>
    </div>
  </section>

  <!-- Content Sections -->
  <div class="content-container">
    <section class="mission-section card-section">...</section>
    <section class="vision-section card-section">...</section>
    <section class="features-section"><!-- 6 cards grid --></section>
    <section class="benefits-section"><!-- checkmark list --></section>
    <section class="categories-section"><!-- pills with icons --></section>
    <section class="values-section"><!-- value cards --></section>
    <section class="projects-section"><!-- ITQAN logos --></section>
    <section class="acknowledgments-section">...</section>
  </div>
</div>
```

## Complexity Tracking

> No violations requiring justification.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| No new component | Reuse existing | Single responsibility maintained |
| CSS-only background | Pseudo-elements | Avoids extra DOM, better performance |
| Existing translations | Reuse keys | No content changes per spec |

## Implementation Phases

### Phase 1: Hero Section (P1)
- Implement hero background with teal ellipses
- Style logo, title, subtitle, intro
- Add responsive adjustments

### Phase 2: Content Sections (P1)
- Mission and Vision card styling
- What We Do 6-card grid
- Why Choose Us benefits list
- Categories pill badges with icons

### Phase 3: Additional Sections (P2)
- Values card grid
- ITQAN Projects with logos
- Acknowledgments section
- Footer adjustments if needed

### Phase 4: Theme & RTL (P2)
- Dark mode color adjustments
- RTL layout mirroring
- Final responsive polish

## Testing Checklist

- [ ] Desktop (1440px) - All sections visible, proper grid layouts
- [ ] Tablet (768px) - Grids collapse to 2 columns
- [ ] Mobile (375px) - Single column, readable text
- [ ] Dark mode - All colors adapt correctly
- [ ] RTL (Arabic) - Ellipses mirror, text aligns right
- [ ] Keyboard navigation - Focus visible on all interactive elements
- [ ] Screen reader - Section headings announced correctly
