# Quickstart: Testing the About Us Page Redesign

**Feature**: 001-redesign-about-us
**Date**: 2026-02-07

## Prerequisites

- Node.js 18+
- npm 9+
- Project dependencies installed (`npm install`)

## Running the Application

```bash
# Start development server
npm start

# The app will be available at http://localhost:4200
```

## Test URLs

| Language | URL |
|----------|-----|
| English | http://localhost:4200/en/about-us |
| Arabic (RTL) | http://localhost:4200/ar/about-us |

## Visual Testing Checklist

### Desktop (1440px+)

1. **Hero Section**
   - [ ] Logo centered and properly sized
   - [ ] Title and subtitle visible
   - [ ] Teal gradient ellipses visible on left side
   - [ ] Intro paragraph readable

2. **Content Sections**
   - [ ] Mission card displays correctly
   - [ ] Vision card displays correctly
   - [ ] "What We Do" shows 6 cards in 3-column grid
   - [ ] "Why Choose Us" shows benefits in 3-column grid
   - [ ] Categories display as inline pills with icons
   - [ ] Values show in 3-column grid
   - [ ] ITQAN Projects show 5 logos in row
   - [ ] Acknowledgments section visible

3. **Interactions**
   - [ ] Cards have hover effects (lift + shadow)
   - [ ] Links are clickable and styled correctly

### Tablet (768px - 1024px)

1. **Layout**
   - [ ] Grids collapse to 2 columns
   - [ ] Hero section adapts appropriately
   - [ ] All content remains readable

### Mobile (375px)

1. **Layout**
   - [ ] All grids collapse to single column
   - [ ] Hero ellipses reduced/simplified
   - [ ] Text remains readable (minimum 16px)
   - [ ] Touch targets are at least 44px

2. **Navigation**
   - [ ] Page scrolls smoothly
   - [ ] No horizontal overflow

### Dark Mode

Toggle dark mode using the theme switch in the header.

1. **Colors**
   - [ ] Background adapts to dark
   - [ ] Text has proper contrast
   - [ ] Ellipse colors darken appropriately
   - [ ] Cards have dark backgrounds

### RTL (Arabic)

Navigate to http://localhost:4200/ar/about-us

1. **Layout**
   - [ ] Text aligns right-to-left
   - [ ] Ellipses mirror to right side
   - [ ] Card borders mirror correctly
   - [ ] Grid content flows RTL

### Accessibility

1. **Keyboard Navigation**
   - [ ] Tab through all interactive elements
   - [ ] Focus states visible on all focusable items
   - [ ] Skip to content available

2. **Screen Reader**
   - [ ] Section headings announced (h1, h2)
   - [ ] Images have alt text
   - [ ] Links have descriptive text

## Browser Testing

Test in the following browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

## Performance Check

```bash
# Run Lighthouse audit
npm run lighthouse

# Expected scores:
# - Performance: 85+
# - Accessibility: 90+
# - Best Practices: 90+
# - SEO: 90+
```

## Common Issues

### Ellipses not visible
- Check that `overflow: hidden` is set on hero background
- Verify z-index values

### RTL layout broken
- Ensure `[dir="rtl"]` selectors are properly scoped
- Check that `left`/`right` properties are mirrored

### Dark mode colors incorrect
- Verify `:host-context(.dark-theme)` selector is used
- Check CSS specificity

## Reporting Issues

If you find issues during testing:
1. Note the viewport size and browser
2. Take a screenshot
3. Document steps to reproduce
4. Check if issue exists in both languages
