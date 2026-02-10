# Research: Redesign About Us Page

**Date**: 2026-02-07
**Feature**: 001-redesign-about-us

## Design Analysis

### Figma Design Breakdown

The provided Figma design shows a modern, clean About Us page with the following key characteristics:

#### Hero Section

**Background Gradient Ellipses** (positioned on left side):

| Ellipse | Size | Position | Color | Effects |
|---------|------|----------|-------|---------|
| Large (Ellipse 2) | 990×990px | left: -686px, top: 156px | #12BCAC | blur(165px), rotate(30deg) |
| Medium (Ellipse 1) | 584×583px | left: -428px, top: 466px | #15A295 | opacity: 0.4, rotate(30deg) |
| Small (Ellipse 3) | 302×301px | left: -235px, top: 659px | #186861 | rotate(30deg) |

**Decision**: Implement ellipses using CSS pseudo-elements (::before, ::after) and an additional div to avoid extra DOM nodes while maintaining the visual effect.

**Rationale**: CSS-only approach is more performant and aligns with Constitution Principle II (Performance Excellence).

**Alternative Rejected**: SVG backgrounds - would add complexity and file size without benefit.

#### Content Sections Structure

From the Figma mockups (mobile and desktop), the sections are:

1. **Hero** - Logo, title, subtitle, intro paragraph
2. **Mission (مهمتنا)** - Simple text card
3. **Vision (رؤيتنا)** - Simple text card
4. **What We Do (ماذا نقدم)** - 6 feature cards in grid
5. **Why Choose Us (لماذا دليل التطبيقات القرآنية؟)** - Benefits with checkmarks
6. **Categories (فئات التطبيقات)** - Pills with icons
7. **Values (قيمنا)** - Value cards in grid
8. **ITQAN Projects (مشاريع إتقان الأخرى)** - Project logos
9. **Acknowledgments (شكر وتقدير)** - Simple text
10. **Footer** - Links and copyright

### Responsive Breakpoints

| Viewport | Width | Layout Adjustments |
|----------|-------|-------------------|
| Mobile | <768px | Single column, stacked cards, smaller ellipses |
| Tablet | 768-1024px | 2-column grids, medium spacing |
| Desktop | >1024px | 3+ column grids, full ellipse sizes |

### RTL Considerations

**Decision**: Mirror ellipse positions for RTL (Arabic) layout.

**Implementation**:
```scss
[dir="rtl"] & {
  .hero-background::before {
    left: auto;
    right: -686px; // Mirror the position
  }
}
```

**Rationale**: Maintains visual balance when reading direction changes.

### Dark Mode Adaptation

**Decision**: Darken teal colors by ~25% for dark mode while maintaining visual hierarchy.

| Element | Light | Dark |
|---------|-------|------|
| Large ellipse | #12BCAC | #0D8A7D |
| Medium ellipse | #15A295 | #107A6E |
| Small ellipse | #186861 | #0F4F4A |
| Card background | #FFFFFF | #2A2A2A |
| Text primary | #1A1A1A | #F0F0F0 |
| Text secondary | #666666 | #B3B3B3 |

### Category Icons

The Figma shows category pills with icons. Based on existing app-list implementation, use ng-zorro-antd icons:

| Category | Icon |
|----------|------|
| Mushaf (مصحف) | book |
| Tafsir (تفسير) | file-text |
| Memorize (تحفيظ) | highlight |
| Tajweed (تجويد) | sound |
| Kids (أطفال) | smile |
| Recite (تسميع) | audio |
| Riwayat (روايات) | branches |
| Accessibility (ذوي الإعاقة) | user |
| Translations (ترجمات) | translation |
| Audio (صوتيات) | customer-service |

### ITQAN Projects Section

From the design, 5 ITQAN project logos are displayed:
1. ITQAN Community (مجتمع إتقان)
2. Content Management System (نظام إدارة المحتوى)
3. Developer Resources (موارد المطورين)
4. Developer Resources (موارد المطورين) - duplicate?
5. Mushaf Fonts (خطوط المصحف العثمانية)

**Decision**: Use existing ITQAN logo assets and link to respective project pages.

## Technical Decisions

### CSS Architecture

**Decision**: Keep all styles within `about-us.component.scss` using SCSS nesting.

**Rationale**:
- Follows existing codebase patterns
- Component encapsulation maintained
- No global style pollution

### Animation

**Decision**: Minimal hover effects only (scale, shadow transitions).

**Rationale**: Per spec, "Animation/motion design beyond hover effects" is out of scope.

```scss
.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}
```

### Typography

**Decision**: Use existing "Expo Arabic" font family from the project.

**Rationale**: Maintains consistency with rest of application.

## Unresolved Questions

None - all design specifications provided by Figma mockups and CSS values.

## References

- Figma CSS values provided in user input
- Mobile mockup image (700×3647px)
- Desktop mockup image (1440×2828px)
- Existing app-list.component.scss for hero ellipse patterns
