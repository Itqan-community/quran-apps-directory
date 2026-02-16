[![Netlify Status](https://api.netlify.com/api/v1/badges/7ceb3341-c3a5-49fc-b154-518c6884262a/deploy-status?branch=main)](https://app.netlify.com/projects/quran-apps-directory/deploys)

# 🕌 Quran Apps Directory

A comprehensive directory of Islamic applications featuring the best Quran apps for reading, memorization, translation, tafsir, and recitation.

## ✨ Features

- 🌍 **Bilingual Support**: Arabic and English with RTL/LTR support
- 🌓 **Dark Mode**: Toggle between light/dark themes with system preference detection
- ⭐ **Precision Ratings**: Custom star system showing exact rating differences
- 📱 **Responsive Design**: Optimized for mobile, tablet, and desktop
- 🚀 **Performance Optimized**: Lazy loading, compression, and caching
- 🔍 **SEO Optimized**: Schema.org structured data, comprehensive sitemap
- ♿ **Accessible**: WCAG compliant with proper ARIA labels

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm 9+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Itqan-community/quran-apps-directory.git
   cd quran-apps-directory
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   # or
   npm start
   ```

5. **Visit** `http://localhost:4200`

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm start                # Start development server (alternative)

# Building
npm run build            # Build for development
npm run build:staging    # Build for staging
npm run build:prod       # Build for production

# Utilities
npm run generate-sitemap # Generate sitemap.xml
npm run sitemap          # Generate sitemap.xml (alias)
```

### Environment Configuration

The project uses environment variables for configuration. Copy `.env.example` to `.env` and configure:

```bash
# Development
NG_DEV_PORT=4200
NODE_ENV=development

# Features
NG_APP_ENABLE_DARK_MODE=true
NG_APP_ENABLE_ANALYTICS=false

# SEO
NG_APP_SITE_DOMAIN=https://quran-apps.itqan.dev
NG_APP_CONTACT_EMAIL=connect@itqan.dev
```

## 🎨 Dark Mode

The application includes a comprehensive dark mode implementation:

- **Auto Detection**: Respects system preference by default
- **Manual Toggle**: Users can override with light/dark/auto modes
- **Persistent**: Remembers user preference across sessions
- **Smooth Transitions**: Animated theme switching
- **Component Support**: All components adapt to theme changes

### Using Dark Mode

```typescript
// In your component
constructor(private themeService: ThemeService) {}

// Toggle theme
this.themeService.toggleTheme();

// Set specific theme
this.themeService.setTheme('dark');

// Check current theme
const isDark = this.themeService.isDark();
```

## 📊 Performance

Current performance scores:
- **Desktop**: 85/100
- **Mobile**: 68/100 (improved from 48/100)

### Optimizations Implemented

- ✅ **Image Optimization**: Lazy loading, WebP format, compression
- ✅ **Bundle Optimization**: Code splitting, tree shaking, minification
- ✅ **Caching**: Service worker, CDN headers, browser caching
- ✅ **Compression**: Gzip and Brotli compression
- ✅ **Critical CSS**: Inlined critical styles
- 🔄 **SSR**: Angular Universal (in progress)

## 🔍 SEO Features

### Structured Data

The application implements comprehensive Schema.org markup:

- `WebSite` - Main site information
- `Organization` - ITQAN Community details
- `SoftwareApplication` - Individual app listings
- `ItemList` - App collections and categories
- `BreadcrumbList` - Navigation breadcrumbs
- `FAQPage` - Frequently asked questions
- `CollectionPage` - Category pages
- `Developer` - Developer profiles

### Sitemap

Dynamic sitemap generation with:
- 186+ URLs covering all pages
- Bilingual support (Arabic/English)
- Priority-based ranking
- Change frequency optimization
- Proper hreflang tags

## 🌐 Internationalization

### Supported Languages

- **English** (`en`) - Default
- **Arabic** (`ar`) - RTL support

### Adding Translations

1. Add keys to translation files:
   ```json
   // src/assets/i18n/en.json
   {
     "newKey": "English Text"
   }
   
   // src/assets/i18n/ar.json
   {
     "newKey": "النص العربي"
   }
   ```

2. Use in templates:
   ```html
   {{ 'newKey' | translate }}
   ```

## 🏗️ Architecture

### Project Structure

```
src/
├── app/
│   ├── components/          # Reusable components
│   │   └── theme-toggle/    # Dark mode toggle
│   ├── pages/              # Page components
│   │   ├── app-list/       # Main directory
│   │   ├── app-detail/     # Individual app pages
│   │   ├── developer/      # Developer profiles
│   │   └── ...
│   ├── services/           # Business logic
│   │   ├── theme.service.ts # Theme management
│   │   ├── seo.service.ts   # SEO optimization
│   │   └── ...
│   └── pipes/              # Custom pipes
├── assets/                 # Static assets
│   ├── i18n/              # Translation files
│   └── images/            # Images and icons
├── environments/          # Environment configs
└── themes.scss            # Theme definitions
```

### Key Services

- **ThemeService**: Manages dark/light mode switching
- **SeoService**: Handles meta tags and structured data
- **LanguageService**: Manages internationalization
- **AppService**: App data management

## 📱 Mobile Support

- **Responsive Design**: Mobile-first approach
- **Touch Optimization**: Proper touch targets
- **Performance**: Optimized for mobile networks
- **PWA Ready**: Service worker implementation

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run e2e

# Generate coverage report
npm run test:coverage
```

## 🚀 Deployment

### Staging

```bash
npm run build:staging
```

Deploys to: `https://staging.quran-apps.itqan.dev`

### Production

```bash
npm run build:prod
```

Deploys to: `https://quran-apps.itqan.dev`

### Environment Setup

The project supports multiple deployment environments:

- **Development**: `develop` branch → `dev.quran-apps.itqan.dev`
- **Staging**: `staging` branch → `staging.quran-apps.itqan.dev`
- **Production**: `main` branch → `quran-apps.itqan.dev`

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Follow the coding standards
4. Add tests for new functionality
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a pull request

### Coding Standards

- **TypeScript**: Strict mode enabled
- **Angular**: Follow Angular style guide
- **SCSS**: BEM methodology preferred
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Consider mobile-first

### Adding New Apps

1. Update `src/app/services/applicationsData.ts`
2. Add app images to appropriate directories
3. Test bilingual support
4. Verify SEO metadata

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ITQAN Community** - Project maintainers
- **Contributors** - All amazing contributors
- **Islamic Apps Developers** - For creating amazing Quran applications

## 📞 Support

- **Email**: connect@itqan.dev
- **Website**: https://itqan.dev
- **GitHub**: https://github.com/Itqan-community
- **Discord**: https://discord.gg/24CskUbuuB

---

Made with ❤️ by [ITQAN Community](https://itqan.dev) for the global Muslim community.Forcing new build
# Force rebuild Sun Oct 26 15:46:19 SAST 2025
# Force Docker build Sun Oct 26 15:47:58 SAST 2025
# Added Caddyfile with CSP Sun Oct 26 15:49:12 SAST 2025

## 🚀 Deployment Status

### GitHub Actions
- ✅ Development deployment workflow configured
- ✅ GitHub secrets added successfully
- ✅ Ready to deploy to Digital Ocean development environment

### Secrets Configured
- ✅ DO_HOST: dev.api.quran-apps.itqan.dev  
- ✅ DO_PORT: 22
- ✅ DO_USERNAME: itqan_deploy_user
- ✅ DO_SSH_KEY: SSH key configured

### Expected Deployment Process
1. SSH to DO development server
2. Clean database (apps & categories)
3. Pull latest code from develop branch
4. Run migrations to populate 44 apps with screenshots
5. Restart services (gunicorn + nginx)
6. Verify API endpoints

### API Endpoints to Verify After Deployment
- https://dev.api.quran-apps.itqan.dev/api/categories/
- https://dev.api.quran-apps.itqan.dev/api/apps/

Last updated: Tue Oct 28 12:21:29 SAST 2025


## 🚀 Deployment Status Update

### SSH Configuration Fixed ✅
- ✅ Deploy user created: `itqan_deploy_user`
- ✅ SSH key configured successfully
- ✅ Sudo access configured without password
- ✅ SSH connection verified working
- ✅ Backend directory confirmed: `/var/www/quran-apps-backend/backend`
- ✅ Python 3.10.12 confirmed on server

### Current Status
- GitHub Action ready to deploy
- All secrets configured correctly
- Server access verified
- Ready for automated deployment

### Expected Outcome
After this deployment completes:
- Database will be cleaned (apps & categories)
- 44 apps with 563 screenshots will be populated
- API endpoints will return data: 
  - https://dev.api.quran-apps.itqan.dev/api/categories/
  - https://dev.api.quran-apps.itqan.dev/api/apps/

Last updated: Tue Oct 28 12:32:51 SAST 2025 - SSH authentication fixed

