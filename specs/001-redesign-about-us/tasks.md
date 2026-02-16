# Tasks: Redesign About Us Page

**Input**: Design documents from `/specs/001-redesign-about-us/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, quickstart.md

**Tests**: No automated tests requested. Manual visual testing per quickstart.md.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1=Desktop, US2=Mobile, US3=RTL, US4=DarkMode
- All paths relative to repository root

---

## Phase 1: Setup

**Purpose**: Prepare the component for redesign

- [x] T001 Backup current about-us.component.scss for reference in src/app/pages/about-us/about-us.component.scss.bak
- [x] T002 Review existing HTML structure in src/app/pages/about-us/about-us.component.html

**Checkpoint**: Ready to begin implementation ✓

---

## Phase 2: Foundational (Base Structure)

**Purpose**: Create the foundational HTML structure and base styles that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Restructure hero section HTML with background container in src/app/pages/about-us/about-us.component.html
- [x] T004 Add hero-background div for ellipses in src/app/pages/about-us/about-us.component.html
- [x] T005 Update content container wrapper structure in src/app/pages/about-us/about-us.component.html
- [x] T006 Create base SCSS variables for colors and spacing in src/app/pages/about-us/about-us.component.scss
- [x] T007 Set up SCSS nesting structure for all sections in src/app/pages/about-us/about-us.component.scss

**Checkpoint**: Foundation ready - user story implementation can now begin ✓

---

## Phase 3: User Story 1 - Desktop View (Priority: P1) 🎯 MVP

**Goal**: Fully styled About Us page on desktop viewport (1024px+)

**Independent Test**: Navigate to http://localhost:4200/en/about-us on 1440px viewport, verify all sections match Figma design

### Implementation for User Story 1 (Group 1 - Teal Ellipses)

- [x] T008 [US1] Implement hero background Group 1 (teal) ellipses using CSS pseudo-elements in src/app/pages/about-us/about-us.component.scss
  - Large ellipse: 990×990px, #12BCAC, blur(165px), left: -686px, top: 156px
  - Medium ellipse: 584×583px, #15A295, opacity: 0.4, left: -428px, top: 466px
  - Small ellipse: 302×301px, #186861, left: -235px, top: 659px
- [x] T009 [US1] Style hero content (logo, title, subtitle, intro) in src/app/pages/about-us/about-us.component.scss
- [x] T010 [US1] Style Mission and Vision card sections in src/app/pages/about-us/about-us.component.scss
- [x] T011 [US1] Create "What We Do" 6-card grid (3 columns desktop) in src/app/pages/about-us/about-us.component.scss
- [x] T012 [US1] Style "Why Choose Us" benefits list with checkmarks in src/app/pages/about-us/about-us.component.scss
- [x] T013 [US1] Create Categories section with pill badges and icons in src/app/pages/about-us/about-us.component.scss
- [x] T014 [P] [US1] Update Categories HTML to use pill badge structure in src/app/pages/about-us/about-us.component.html
- [x] T015 [US1] Style Values section as 3-column card grid in src/app/pages/about-us/about-us.component.scss
- [x] T016 [US1] Style ITQAN Projects section with 4-column logo grid in src/app/pages/about-us/about-us.component.scss
- [x] T017 [P] [US1] Update ITQAN Projects HTML structure in src/app/pages/about-us/about-us.component.html
- [x] T018 [US1] Style Acknowledgments section in src/app/pages/about-us/about-us.component.scss
- [x] T019 [US1] Add hover effects to all card elements in src/app/pages/about-us/about-us.component.scss
- [x] T020 [US1] Add focus states for keyboard navigation in src/app/pages/about-us/about-us.component.scss

### Implementation for User Story 1 (Group 2 - Gold/Beige Ellipses) ✓ COMPLETE

- [x] T045 [P] [US1] Add Group 2 color variables in src/app/pages/about-us/about-us.component.scss:
  ```scss
  // Group 2 - Gold/Beige ellipses (right side)
  $color-ellipse2-large: #F5EEDB;
  $color-ellipse2-medium: #FAAF41;
  $color-ellipse2-small: #FAAF41;
  ```

- [x] T046 [P] [US1] Add hero-background-right container div in src/app/pages/about-us/about-us.component.html:
  ```html
  <div class="hero-background-right">
    <!-- Gold ellipses via CSS pseudo-elements -->
  </div>
  ```

- [x] T047 [US1] Implement Group 2 (gold/beige) ellipses in src/app/pages/about-us/about-us.component.scss:
  - Large ellipse: 990×990px, #F5EEDB, blur(165px), left: 777px, top: -214px, opacity: 0.78, rotate(-135deg)
  - Medium ellipse: 584×583px, #FAAF41, opacity: 0.4, left: 1092px, top: 47px, rotate(-135deg)
  - Small ellipse: 302×301px, #FAAF41, left: 1292px, top: 247px, rotate(-135deg)

- [x] T048 [US1] Remove any page border/outline from about-us-page container in src/app/pages/about-us/about-us.component.scss

- [x] T049 [US1] Set page background to #FFFFFF (no borders) in src/app/pages/about-us/about-us.component.scss

**Checkpoint**: Desktop view complete with both ellipse groups - verify at 1440px viewport

---

## Phase 4: User Story 2 - Mobile View (Priority: P1)

**Goal**: Responsive layout for mobile viewport (<768px)

**Independent Test**: Navigate to http://localhost:4200/en/about-us on 375px viewport, verify single-column layouts and readable content

### Implementation for User Story 2 (Group 1 - Complete)

- [x] T021 [US2] Add mobile breakpoint styles for hero section (<768px) in src/app/pages/about-us/about-us.component.scss
  - Reduce ellipse sizes and reposition
  - Adjust typography sizes
- [x] T022 [US2] Add mobile breakpoint for "What We Do" grid (1 column) in src/app/pages/about-us/about-us.component.scss
- [x] T023 [US2] Add mobile breakpoint for "Why Choose Us" list (1 column) in src/app/pages/about-us/about-us.component.scss
- [x] T024 [US2] Add mobile breakpoint for Categories (2-column grid) in src/app/pages/about-us/about-us.component.scss
- [x] T025 [US2] Add mobile breakpoint for Values section (1 column) in src/app/pages/about-us/about-us.component.scss
- [x] T026 [US2] Add mobile breakpoint for ITQAN Projects (2 columns) in src/app/pages/about-us/about-us.component.scss
- [x] T027 [US2] Add tablet breakpoint styles (768px-1024px) for all sections in src/app/pages/about-us/about-us.component.scss
- [x] T028 [US2] Ensure minimum touch target sizes (44px) for interactive elements in src/app/pages/about-us/about-us.component.scss

### Implementation for User Story 2 (Group 2 - Mobile) ✓ COMPLETE

- [x] T050 [US2] Add mobile breakpoint (<768px) for Group 2 (gold) ellipses in src/app/pages/about-us/about-us.component.scss:
  - Reduce sizes to 60% (594×594px, 350×350px, 181×181px)
  - Adjust positions to stay within viewport bounds
  - Consider hiding smallest ellipse on very small screens

- [x] T051 [US2] Add tablet breakpoint (768px-1024px) for Group 2 ellipses in src/app/pages/about-us/about-us.component.scss

- [x] T052 [US2] Verify no horizontal overflow with both ellipse groups at mobile viewport

**Checkpoint**: Mobile and tablet views complete - verify at 375px, 768px viewports

---

## Phase 5: User Story 3 - Arabic RTL Layout (Priority: P2)

**Goal**: Proper right-to-left layout for Arabic language

**Independent Test**: Navigate to http://localhost:4200/ar/about-us, verify text alignment and mirrored decorations

### Implementation for User Story 3 (Group 1 - Complete)

- [x] T029 [US3] Mirror hero ellipse positions for RTL using [dir="rtl"] selector in src/app/pages/about-us/about-us.component.scss
- [x] T030 [US3] Adjust card borders for RTL (left border → right border) in src/app/pages/about-us/about-us.component.scss
- [x] T031 [US3] Ensure grid content flows RTL in src/app/pages/about-us/about-us.component.scss
- [x] T032 [US3] Verify RTL icon positioning in category pills in src/app/pages/about-us/about-us.component.scss
- [x] T033 [US3] Test RTL with mobile breakpoints in src/app/pages/about-us/about-us.component.scss

### Implementation for User Story 3 (Group 2 - RTL) ✓ COMPLETE

- [x] T053 [US3] Mirror Group 2 (gold) ellipse positions for RTL in src/app/pages/about-us/about-us.component.scss:
  - Swap left positions to right (left: 777px → right: 777px, etc.)
  - Flip rotate angle from -135deg to 135deg

- [x] T054 [US3] Add RTL mobile breakpoint for Group 2 ellipses in src/app/pages/about-us/about-us.component.scss

**Checkpoint**: RTL layout complete with both ellipse groups - verify at /ar/about-us in all viewports

---

## Phase 6: User Story 4 - Dark Mode (Priority: P2)

**Goal**: Dark mode color adaptation with proper contrast

**Independent Test**: Enable dark mode and navigate to About Us page, verify all colors adapt correctly

### Implementation for User Story 4 (Group 1 - Complete)

- [x] T034 [US4] Add dark mode hero ellipse colors (#0D8A7D, #107A6E, #0F4F4A) in src/app/pages/about-us/about-us.component.scss
- [x] T035 [US4] Add dark mode card backgrounds and borders in src/app/pages/about-us/about-us.component.scss
- [x] T036 [US4] Add dark mode text colors (primary: #F0F0F0, secondary: #B3B3B3) in src/app/pages/about-us/about-us.component.scss
- [x] T037 [US4] Add dark mode category pill styling in src/app/pages/about-us/about-us.component.scss
- [x] T038 [US4] Verify dark mode with RTL layout in src/app/pages/about-us/about-us.component.scss
- [x] T039 [US4] Verify WCAG AA contrast ratios (4.5:1) for all text in src/app/pages/about-us/about-us.component.scss

### Implementation for User Story 4 (Group 2 - Dark Mode) ✓ COMPLETE

- [x] T055 [P] [US4] Add dark mode color variables for Group 2 in src/app/pages/about-us/about-us.component.scss:
  ```scss
  // Dark mode Group 2 colors
  $dark-ellipse2-large: #3D3626;   // Darkened #F5EEDB
  $dark-ellipse2-medium: #B87A2E;  // Darkened #FAAF41
  $dark-ellipse2-small: #B87A2E;
  ```

- [x] T056 [US4] Apply dark mode colors to Group 2 ellipses in src/app/pages/about-us/about-us.component.scss

- [x] T057 [US4] Add dark mode page background color in src/app/pages/about-us/about-us.component.scss (use existing $dark-section-bg)

**Checkpoint**: Dark mode complete with both ellipse groups - verify in all viewports and both languages

---

## Phase 7: Page-Level Background Fix ⚠️ CRITICAL

**Purpose**: Move ellipse backgrounds from hero-section to page-level (per Figma design)

**Issue**: Currently ellipses are inside `.hero-section`. In Figma, they span the **entire page** behind all content sections.

### HTML Structure Changes

- [x] T058 [P] [US1] Move background containers from hero-section to page-level in src/app/pages/about-us/about-us.component.html:
  ```html
  <div class="about-us-page">
    <!-- Page-level backgrounds (span entire page) -->
    <div class="page-background-left">
      <!-- Teal ellipses via CSS -->
    </div>
    <div class="page-background-right">
      <!-- Gold ellipses via CSS -->
    </div>

    <!-- Hero Section (content only, no backgrounds) -->
    <section class="hero-section">
      <div class="hero-content">...</div>
    </section>
    ...
  </div>
  ```

### SCSS Structure Changes

- [x] T059 [US1] Create page-level background styles in src/app/pages/about-us/about-us.component.scss:
  - `.page-background-left`: position: fixed, inset: 0, z-index: 0
  - `.page-background-right`: position: fixed, inset: 0, z-index: 0
  - Move ellipse pseudo-elements from `.hero-background` to `.page-background-left`
  - Move ellipse pseudo-elements from `.hero-background-right` to `.page-background-right`

- [x] T060 [US1] Update z-index hierarchy in src/app/pages/about-us/about-us.component.scss:
  - Page backgrounds: z-index: 0
  - Hero section: z-index: 1, position: relative
  - Content container: z-index: 1, position: relative
  - All content should sit above backgrounds

- [x] T061 [US1] Remove old hero-background styles in src/app/pages/about-us/about-us.component.scss:
  - Remove `.hero-background` class
  - Remove `.hero-background-right` class
  - Remove `.hero-section::before` (small teal ellipse)
  - Remove `.hero-section::after` (small gold ellipse)

### Responsive Updates for Page-Level Backgrounds

- [x] T062 [US2] Update mobile breakpoint for page-level backgrounds in src/app/pages/about-us/about-us.component.scss:
  - Adjust `.page-background-left` ellipse sizes/positions for mobile
  - Adjust `.page-background-right` ellipse sizes/positions for mobile

- [x] T063 [US2] Update tablet breakpoint for page-level backgrounds in src/app/pages/about-us/about-us.component.scss

### RTL Updates for Page-Level Backgrounds

- [x] T064 [US3] Update RTL mirroring for page-level backgrounds in src/app/pages/about-us/about-us.component.scss:
  - Mirror `.page-background-left` to right side
  - Mirror `.page-background-right` to left side

- [x] T065 [US3] Update RTL mobile breakpoint for page-level backgrounds in src/app/pages/about-us/about-us.component.scss

### Dark Mode Updates for Page-Level Backgrounds

- [x] T066 [US4] Update dark mode for page-level backgrounds in src/app/pages/about-us/about-us.component.scss:
  - Apply dark ellipse colors to `.page-background-left`
  - Apply dark ellipse colors to `.page-background-right`

**Checkpoint**: Backgrounds now span entire page - verify ellipses visible behind all sections

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [x] T040 Remove backup file src/app/pages/about-us/about-us.component.scss.bak
- [x] T041 Clean up any unused CSS from original design in src/app/pages/about-us/about-us.component.scss
- [x] T042 Verify no TypeScript changes needed in src/app/pages/about-us/about-us.component.ts
- [ ] T043 Run full quickstart.md validation checklist (MANUAL)
- [ ] T044 Run Lighthouse audit and verify scores (Performance 85+, Accessibility 90+) (MANUAL)

---

## Dependencies & Execution Order

### Critical Path for Group 2 Ellipses

```
T045 (color vars) ──┬──→ T047 (desktop styles) ──→ T050 (mobile) ──→ T053 (RTL)
                    │
T046 (HTML div) ────┘
                    │
                    └──→ T055 (dark vars) ──→ T056 (dark styles)
```

### Parallel Opportunities

**Step 1** - Can run in parallel:
- T045 [P] Add Group 2 color variables (SCSS)
- T046 [P] Add hero-background-right div (HTML)

**Step 2** - After T045 + T046 complete:
- T047 Group 2 desktop ellipse styles
- T055 [P] Dark mode color variables

**Step 3** - After T047 complete, can run in parallel:
- T050 Mobile breakpoint for Group 2
- T053 RTL mirroring for Group 2
- T056 Dark mode styles for Group 2

**Step 4** - After respective parent tasks:
- T051 Tablet breakpoint (after T050)
- T054 RTL mobile (after T053)

---

## Implementation Summary

**Completed**: 64/66 tasks (97%)
**Remaining**: 2 tasks (manual validation)

| Category | Completed | Remaining | Total |
|----------|-----------|-----------|-------|
| Setup | 2 | 0 | 2 |
| Foundational | 5 | 0 | 5 |
| US1 - Desktop | 22 | 0 | 22 |
| US2 - Mobile | 13 | 0 | 13 |
| US3 - RTL | 9 | 0 | 9 |
| US4 - Dark Mode | 10 | 0 | 10 |
| Polish | 3 | 2 | 5 |
| **TOTAL** | **64** | **2** | **66** |

### Key Remaining Work

1. ✅ **Group 2 Ellipses (Gold/Beige)** - COMPLETE
2. ✅ **Page-Level Backgrounds** - COMPLETE (T058-T066)
   - Backgrounds now use `position: fixed` and span entire page
   - Ellipses visible behind all content sections during scroll
3. ⏳ **Final Validation** - 2 tasks pending:
   - T043: Run quickstart.md validation checklist (MANUAL)
   - T044: Run Lighthouse audit (MANUAL)

### Files to Modify

| File | Changes |
|------|---------|
| about-us.component.html | Add hero-background-right div for Group 2 ellipses |
| about-us.component.scss | Add Group 2 ellipse styles, responsive, RTL, dark mode |

---

## Group 2 Ellipse Specifications (from Figma)

### Desktop (1440px viewport)

| Ellipse | Size | Position | Color | Effects |
|---------|------|----------|-------|---------|
| Large | 990×990px | left: 777px, top: -214px | #F5EEDB | blur(165px), rotate(-135deg), opacity: 0.78 |
| Medium | 584×583px | left: 1092px, top: 47px | #FAAF41 | opacity: 0.4, rotate(-135deg) |
| Small | 302×301px | left: 1292px, top: 247px | #FAAF41 | rotate(-135deg) |

### Page Container

- Background: #FFFFFF
- No borders or outline
- Full viewport width (no max-width on background container)
- **CRITICAL**: Ellipse backgrounds should span the ENTIRE PAGE, not just hero section
- Background containers should use `position: fixed` to stay visible while scrolling

### Page-Level Background Architecture (from Figma)

```
┌─────────────────────────────────────────────────────────────┐
│ .about-us-page                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ .page-background-left (fixed, z-index: 0)               ││
│  │   - Teal ellipses (left side, visible entire scroll)    ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ .page-background-right (fixed, z-index: 0)              ││
│  │   - Gold ellipses (right side, visible entire scroll)   ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ .hero-section (relative, z-index: 1)                    ││
│  │   - Logo, title, subtitle, intro (no backgrounds here)  ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ .content-container (relative, z-index: 1)               ││
│  │   - Mission, Vision, What We Do, etc.                   ││
│  │   - All sections sit ABOVE the page backgrounds         ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Next Steps

### Phase 7: Page-Level Background Fix ✅ COMPLETE

All 9 tasks (T058-T066) completed:
- Background containers moved to page-level with `position: fixed`
- Z-index hierarchy properly set (backgrounds: 0, content: 1)
- Mobile/tablet breakpoints updated
- RTL mirroring updated
- Dark mode colors applied

### Phase 8: Final Validation (CURRENT)

1. **T043**: Run quickstart.md validation checklist (MANUAL)
2. **T044**: Run Lighthouse audit (MANUAL)
