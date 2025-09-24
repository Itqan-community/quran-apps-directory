# 🤝 Contributing to Quran Apps Directory

Thank you for your interest in contributing to the Quran Apps Directory! This document provides guidelines and information for contributors.

## 🌟 How to Contribute

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/quran-apps-directory.git
cd quran-apps-directory

# Add upstream remote
git remote add upstream https://github.com/Itqan-community/quran-apps-directory.git
```

### 2. Environment Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

### 3. Create Feature Branch

```bash
# Create and switch to feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

## 📋 Development Guidelines

### Code Standards

- **TypeScript**: Use strict typing, avoid `any`
- **Angular**: Follow [Angular Style Guide](https://angular.io/guide/styleguide)
- **SCSS**: Use BEM methodology for CSS classes
- **Accessibility**: Ensure WCAG 2.1 AA compliance
- **Performance**: Consider mobile-first and Core Web Vitals

### File Structure

```
src/app/
├── components/     # Reusable UI components
├── pages/         # Route components
├── services/      # Business logic and data services
├── pipes/         # Custom pipes
└── interfaces/    # TypeScript interfaces
```

### Naming Conventions

- **Components**: PascalCase (`AppListComponent`)
- **Files**: kebab-case (`app-list.component.ts`)
- **Variables**: camelCase (`currentLanguage`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)
- **CSS Classes**: kebab-case (`app-card`, `rating-number`)

## 🎨 UI/UX Guidelines

### Design System

- **Colors**: Use CSS custom properties for theming
- **Typography**: IBM Plex Sans Arabic for consistency
- **Spacing**: Use consistent spacing scale (8px base)
- **Components**: Extend Ant Design components when possible

### Dark Mode Support

Ensure all new components support dark mode:

```scss
// Use CSS custom properties
.my-component {
  background-color: var(--bg-color);
  color: var(--text-color);
  border-color: var(--border-color);
}

// Test both themes
.dark-theme .my-component {
  // Dark theme specific styles if needed
}
```

### Responsive Design

Follow mobile-first approach:

```scss
.component {
  // Mobile styles (default)
  
  @media (min-width: 768px) {
    // Tablet styles
  }
  
  @media (min-width: 1024px) {
    // Desktop styles
  }
}
```

## 🌍 Internationalization

### Adding New Translations

1. Add keys to both language files:

```json
// src/assets/i18n/en.json
{
  "category.newCategory": "New Category"
}

// src/assets/i18n/ar.json
{
  "category.newCategory": "فئة جديدة"
}
```

2. Use in templates:

```html
{{ 'category.newCategory' | translate }}
```

3. Test both languages and RTL/LTR layouts

### Bilingual Content

For app data, use the established pattern:

```typescript
interface QuranApp {
  Name_En: string;
  Name_Ar: string;
  Description_En: string;
  Description_Ar: string;
  // ...
}
```

## 📱 Adding New Apps

### Data Structure

Add new apps to `src/app/services/applicationsData.ts`:

```typescript
{
  id: 'unique-app-id',
  Name_En: 'App Name',
  Name_Ar: 'اسم التطبيق',
  Short_Description_En: 'Brief description',
  Short_Description_Ar: 'وصف مختصر',
  Long_Description_En: 'Detailed description',
  Long_Description_Ar: 'وصف مفصل',
  Apps_Avg_Rating: 4.5,
  applicationIcon: 'path/to/icon.png',
  mainImage_en: 'path/to/screenshot_en.png',
  mainImage_ar: 'path/to/screenshot_ar.png',
  Platform: ['iOS', 'Android', 'Web'],
  Developer_Name_En: 'Developer Name',
  Developer_Name_Ar: 'اسم المطور',
  // ... other required fields
}
```

### Image Guidelines

- **App Icons**: 512x512px, PNG format
- **Screenshots**: 1200x800px minimum, WebP preferred
- **Optimize**: Compress images for web
- **Bilingual**: Provide both English and Arabic screenshots

### Quality Checklist

- [ ] App information is accurate and up-to-date
- [ ] Both English and Arabic content provided
- [ ] Images are optimized and properly sized
- [ ] Links and references work correctly
- [ ] Categories are appropriate

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run e2e

# Coverage report
npm run test:coverage
```

### Writing Tests

Create tests for new components:

```typescript
describe('ComponentName', () => {
  let component: ComponentName;
  let fixture: ComponentFixture<ComponentName>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ComponentName]
    });
    fixture = TestBed.createComponent(ComponentName);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Add more specific tests
});
```

## 🔍 SEO and Performance

### SEO Best Practices

- Add structured data for new pages
- Update sitemap generation if needed
- Include proper meta tags
- Test with Google Rich Results Test

### Performance Considerations

- Use lazy loading for images
- Implement OnPush change detection when possible
- Minimize bundle size
- Test Core Web Vitals

## 📝 Documentation

### Code Documentation

Use JSDoc for functions and classes:

```typescript
/**
 * Calculates the rating class based on numeric rating
 * @param rating - The numeric rating (0-5)
 * @returns CSS class name for styling
 */
getRatingClass(rating: number): string {
  // Implementation
}
```

### README Updates

Update relevant documentation when adding features:

- Update feature list
- Add configuration examples
- Include usage instructions

## 🚀 Pull Request Process

### Before Submitting

1. **Test Thoroughly**
   - Test on mobile and desktop
   - Test both light and dark themes
   - Test both Arabic and English
   - Run all tests and ensure they pass

2. **Code Quality**
   - Run linting: `npm run lint`
   - Check TypeScript errors
   - Ensure proper formatting

3. **Performance**
   - Check bundle size impact
   - Test loading performance
   - Validate accessibility

### PR Checklist

- [ ] Code follows project standards
- [ ] Tests added for new functionality
- [ ] Documentation updated
- [ ] Both languages tested
- [ ] Dark mode support verified
- [ ] Mobile responsive
- [ ] Accessibility compliance
- [ ] No console errors
- [ ] Performance impact assessed

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed
- [ ] Cross-browser testing

## Screenshots
Include screenshots for UI changes

## Additional Notes
Any additional information
```

## 🎯 Areas for Contribution

### High Priority

- 🌐 **Internationalization**: Add more languages
- 📱 **Mobile UX**: Improve mobile experience
- ⚡ **Performance**: SSR implementation
- ♿ **Accessibility**: WCAG compliance improvements

### Medium Priority

- 🔍 **Search**: Advanced filtering and search
- 📊 **Analytics**: User behavior insights
- 🎨 **Design**: UI/UX enhancements
- 🧪 **Testing**: Increase test coverage

### Low Priority

- 🤖 **Automation**: CI/CD improvements
- 📱 **PWA**: Progressive Web App features
- 🔔 **Notifications**: Update notifications
- 📈 **Monitoring**: Performance monitoring

## 🐛 Bug Reports

### Before Reporting

1. Check existing issues
2. Test on latest version
3. Reproduce consistently

### Bug Report Template

```markdown
**Description**
Clear description of the bug

**To Reproduce**
Steps to reproduce the behavior

**Expected Behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment**
- OS: [e.g., iOS, Windows]
- Browser: [e.g., Chrome, Safari]
- Version: [e.g., 22]
- Device: [e.g., iPhone 12, Desktop]

**Additional Context**
Any other context about the problem
```

## 💡 Feature Requests

Use the feature request template:

```markdown
**Is your feature request related to a problem?**
Clear description of the problem

**Describe the solution you'd like**
Clear description of desired solution

**Describe alternatives you've considered**
Alternative solutions considered

**Additional context**
Any other context or screenshots
```

## 📞 Getting Help

- **GitHub Issues**: Technical questions and bugs
- **Discussions**: General questions and ideas
- **Discord**: https://discord.gg/24CskUbuuB
- **Email**: connect@itqan.dev

## 🙏 Recognition

Contributors will be:

- Listed in the project README
- Credited in release notes
- Invited to the contributors team
- Recognized in the community

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to the Quran Apps Directory! 🚀
