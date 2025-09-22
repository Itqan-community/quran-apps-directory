# 🚀 Deployment Guide - Quran Apps Directory

This guide covers the complete deployment setup for multiple environments using Netlify.

## 🌍 Environment Overview

| Environment | Domain | Purpose | Netlify Site |
|-------------|--------|---------|--------------|
| **Production** | `quran-apps.itqan.dev` | Live site for users | [quran-apps-directory](https://app.netlify.com/projects/quran-apps-directory) |
| **Staging** | `staging.quran-apps.itqan.dev` | Pre-production testing | [quran-apps-staging](https://app.netlify.com/projects/quran-apps-staging) |
| **Development** | `dev.quran-apps.itqan.dev` | Development testing | [quran-apps-dev](https://app.netlify.com/projects/quran-apps-dev) |

## 📂 Configuration Files

### Angular Build Configurations
- **Development**: `ng build --configuration=development`
- **Staging**: `ng build --configuration=staging`
- **Production**: `ng build --configuration=production`

### Netlify Configurations
- **Production**: `netlify.toml`
- **Staging**: `netlify-staging.toml`
- **Development**: `netlify-dev.toml`

### Environment Files
- **Development**: `src/environments/environment.ts`
- **Staging**: `src/environments/environment.staging.ts`
- **Production**: `src/environments/environment.prod.ts`

## 🛠️ Available Scripts

```bash
# Development
npm run dev                    # Start development server
npm run serve:dev             # Serve with development config
npm run build:dev             # Build for development

# Staging
npm run serve:staging         # Serve with staging config
npm run build:staging         # Build for staging
npm run deploy:staging        # Build staging version

# Production
npm run serve:prod            # Serve with production config
npm run build:prod            # Build for production
npm run deploy:prod           # Build production version
```

## 🚀 Deployment Methods

### Method 1: Automated Git Deployments (Recommended)

#### Branch Strategy
```
main/master     → Production (quran-apps.itqan.dev)
staging         → Staging (staging.quran-apps.itqan.dev)
develop         → Development (dev.quran-apps.itqan.dev)
```

#### Workflow
```bash
# 1. Feature development
git checkout -b feature/new-feature
# ... make changes ...
git commit -m "Add new feature"
git push origin feature/new-feature

# 2. Deploy to development
git checkout develop
git merge feature/new-feature
git push origin develop  # Auto-deploys to dev.quran-apps.itqan.dev

# 3. Deploy to staging
git checkout staging
git merge develop
git push origin staging  # Auto-deploys to staging.quran-apps.itqan.dev

# 4. Deploy to production
git checkout main
git merge staging
git push origin main     # Auto-deploys to quran-apps.itqan.dev
```

### Method 2: Manual Deployment Script

Use the provided deployment script:

```bash
# Setup (one-time)
./deploy-netlify.sh setup

# Deploy to specific environments
./deploy-netlify.sh deploy staging
./deploy-netlify.sh deploy production
./deploy-netlify.sh deploy development
```

### Method 3: Netlify CLI Direct

```bash
# Build and deploy staging
npm run build:staging
netlify deploy --prod --dir=dist/browser --site=a5cb2dc3-7a98-4a91-b71e-d9d3d0c67a03

# Build and deploy production
npm run build:prod
netlify deploy --prod --dir=dist/browser --site=7ceb3341-c3a5-49fc-b154-518c6884262a
```

## 🔧 Site IDs and Configuration

```bash
# Site IDs
PROD_SITE_ID="7ceb3341-c3a5-49fc-b154-518c6884262a"
STAGING_SITE_ID="a5cb2dc3-7a98-4a91-b71e-d9d3d0c67a03"
DEV_SITE_ID="a4a10bc3-2550-4369-a944-200ed4c7ee27"

# Netlify URLs
Production:  https://quran-apps-directory.netlify.app
Staging:     https://quran-apps-staging.netlify.app
Development: https://quran-apps-dev.netlify.app
```

## 🌐 DNS Configuration

Add these DNS records at [DNS Management](https://app.netlify.com/teams/itqan/dns/quran-apps.itqan.dev):

```
CNAME staging.quran-apps.itqan.dev → quran-apps-staging.netlify.app
CNAME dev.quran-apps.itqan.dev → quran-apps-dev.netlify.app
```

## 🔐 Authentication

Use the Netlify Personal Access Token:
```bash
export NETLIFY_AUTH_TOKEN="nfp_4MyYc8AM4ctKbSmHYbsft4ejDanFtuSv6f95"
```

## 📋 Pre-Deployment Checklist

### ✅ Before Staging Deployment
- [ ] All features tested locally
- [ ] No console errors
- [ ] All routes work correctly
- [ ] Images load from Cloudflare R2
- [ ] Multi-language switching works
- [ ] Search and filtering functional
- [ ] Mobile responsive

### ✅ Before Production Deployment
- [ ] Staging environment fully tested
- [ ] Performance audit completed
- [ ] SEO meta tags updated
- [ ] Analytics configured
- [ ] SSL certificates active
- [ ] Backup of current production (if needed)

## 🔍 Environment-Specific Features

### Staging Environment
- **Purpose**: Pre-production testing
- **Features**: 
  - Source maps enabled for debugging
  - Staging banner visible
  - No search engine indexing
  - Relaxed caching headers

### Development Environment
- **Purpose**: Development testing
- **Features**:
  - Debug mode enabled
  - Verbose logging
  - No optimization
  - Hot reload capable

### Production Environment
- **Purpose**: Live user-facing site
- **Features**:
  - Full optimization
  - Analytics enabled
  - Search engine indexing
  - Aggressive caching

## 🚨 Troubleshooting

### Common Issues

1. **Build Fails with Angular Dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

2. **Domain Not Resolving**
   - Check DNS propagation (up to 24 hours)
   - Verify CNAME records are correct
   - Check Netlify domain configuration

3. **Assets Not Loading**
   - Verify Cloudflare R2 URLs in `applicationsData.ts`
   - Check browser console for CORS issues

4. **Deployment Fails**
   ```bash
   # Clear Netlify cache
   netlify build --clear-cache
   
   # Or rebuild with fresh dependencies
   ./dev-start.sh --clean
   ```

## 📞 Support

- **Netlify Dashboard**: [https://app.netlify.com/teams/itqan](https://app.netlify.com/teams/itqan)
- **DNS Management**: [https://app.netlify.com/teams/itqan/dns/quran-apps.itqan.dev](https://app.netlify.com/teams/itqan/dns/quran-apps.itqan.dev)
- **Project Repository**: Check the repository settings for webhook configurations

## 🎉 Quick Start

For immediate deployment to staging:

```bash
# 1. Build staging version
npm run build:staging

# 2. Deploy using script
./deploy-netlify.sh deploy staging

# 3. Verify deployment
open https://staging.quran-apps.itqan.dev
```

---

*Last updated: $(date)*
