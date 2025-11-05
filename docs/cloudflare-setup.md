# Cloudflare Pages Setup Guide

This guide provides step-by-step instructions for setting up Cloudflare Pages deployment for the Quran Apps Directory frontend.

## Prerequisites

- Cloudflare account (free tier sufficient)
- GitHub account with access to `Itqan-community/quran-apps-directory`
- Repository admin access to configure GitHub Secrets

## Task Group 3: GitHub Secrets Configuration

### 3.1 Create Cloudflare API Token

1. Visit: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Use template: **"Edit Cloudflare Workers"** or create custom token
4. Required permissions:
   - **Account** > **Cloudflare Pages** > **Edit**
5. Optional: Restrict to specific zone if needed
6. Click **"Continue to summary"** then **"Create Token"**
7. **IMPORTANT:** Copy the token value immediately (shown only once)
8. Store securely - you'll need it for GitHub Secrets

**Token Format:** 40-character alphanumeric string

### 3.2 Get Cloudflare Account ID

1. Visit: https://dash.cloudflare.com/
2. Select any domain or navigate to Workers & Pages
3. Your Account ID is displayed in:
   - URL: `https://dash.cloudflare.com/ACCOUNT_ID/...`
   - Dashboard sidebar under "Account ID"
4. Copy the Account ID (32-character hexadecimal string)

**Format:** 32-character hex string (e.g., `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

### 3.3 Add Secrets to GitHub Repository

1. Navigate to: https://github.com/Itqan-community/quran-apps-directory/settings/secrets/actions
2. Click **"New repository secret"**
3. Add the following secrets one by one:

**Secret 1: CLOUDFLARE_API_TOKEN**
- Name: `CLOUDFLARE_API_TOKEN`
- Value: [Token from step 3.1]
- Click **"Add secret"**

**Secret 2: CLOUDFLARE_ACCOUNT_ID**
- Name: `CLOUDFLARE_ACCOUNT_ID`
- Value: [Account ID from step 3.2]
- Click **"Add secret"**

**Secret 3: CLOUDFLARE_PROJECT_NAME**
- Name: `CLOUDFLARE_PROJECT_NAME`
- Value: `quran-apps-directory`
- Click **"Add secret"**

### 3.4 Security Best Practices

- **Never commit secrets to code** or GitHub Actions workflow files
- Store all sensitive values in GitHub Secrets (not Cloudflare Pages env vars)
- **Rotate tokens every 90 days** - set calendar reminders
- Use **least-privilege access** - API tokens with minimal required permissions
- Document all required secrets in project README (names only, not values)

---

## Task Group 4: Cloudflare Pages Project Setup

### 4.1 Create Cloudflare Pages Project

1. Login to Cloudflare dashboard: https://dash.cloudflare.com/
2. Navigate to: **Workers & Pages**
3. Click: **"Create application"**
4. Select: **"Pages"** tab
5. Click: **"Connect to Git"**
6. Select repository: `Itqan-community/quran-apps-directory`
7. Authorize **Cloudflare GitHub App** if prompted
8. Project name: `quran-apps-directory`
9. Click **"Begin setup"**

### 4.2 Configure Build Settings

**Framework Preset:**
- Select **"Angular"** from dropdown

**Production Branch:**
- Leave as `main` (will be overridden by GitHub Actions)

**Build Command:**
```bash
npm run build:dev
```

**Build Output Directory:**
```
dist/browser
```

**Root Directory:**
- Leave empty (repository root: `/`)

**Environment Variables:**
- **Skip this section** - No environment variables needed
- All configuration is committed in `src/environments/environment*.ts` files

**Node.js Version:**
- Auto-detected from `.nvmrc` or specify: `20.x`

### 4.3 Disable Automatic Deployments

**Option 1: During Setup**
- Skip the initial deployment during project creation

**Option 2: After Project Creation**
1. Go to project settings
2. Navigate to: **Settings** > **Builds & deployments**
3. Under **Build configuration**:
   - Pause automatic deployments
   - We're using GitHub Actions for deployment control instead

**Rationale:**
- GitHub Actions provides better control over deployment triggers
- Allows for pre-deployment checks and validations
- Enables manual approval workflows for production

### 4.4 Note Auto-Generated Pages URL

After project creation, Cloudflare will generate a URL:

**Format:**
```
https://quran-apps-directory.pages.dev
```

**Or similar variant:**
```
https://quran-apps-directory-abc.pages.dev
```

**Actions:**
1. Find the generated URL in Cloudflare dashboard
2. Copy the URL
3. Document in project README
4. This becomes your development environment URL
5. Test URL (will show placeholder until first deployment)

**Custom Domains (Future):**
- `dev.quran-apps.itqan.dev` → develop branch
- `staging.quran-apps.itqan.dev` → staging branch (Phase 2)
- `quran-apps.itqan.dev` → main branch (Phase 2)

---

## Deployment URLs

### Current (Phase 1)

| Environment | Branch   | URL                                      | Status      |
|-------------|----------|------------------------------------------|-------------|
| Development | develop  | https://quran-apps-directory.pages.dev   | Active      |

### Future (Phase 2)

| Environment | Branch   | URL                                      | Custom Domain                   |
|-------------|----------|------------------------------------------|---------------------------------|
| Development | develop  | https://quran-apps-directory.pages.dev   | dev.quran-apps.itqan.dev       |
| Staging     | staging  | https://quran-apps-staging.pages.dev     | staging.quran-apps.itqan.dev   |
| Production  | main     | https://quran-apps-prod.pages.dev        | quran-apps.itqan.dev           |

---

## Build Configuration Details

### Build Commands per Environment

**Development:**
```bash
npm run build:dev
```
- Configuration: `development`
- Source maps: Enabled
- Optimization: Minimal
- Build time: ~3-5 minutes

**Staging:**
```bash
npm run build:staging
```
- Configuration: `staging`
- Source maps: Enabled
- Optimization: Moderate
- Compression: Gzip/Brotli
- Build time: ~4-6 minutes

**Production:**
```bash
npm run build:prod
```
- Configuration: `production`
- Source maps: Disabled
- Optimization: Full
- Compression: Gzip/Brotli
- Sitemap: Auto-generated
- Build time: ~5-7 minutes

### Build Output Structure

```
dist/
└── browser/
    ├── index.html           # Entry point
    ├── main.js              # Main application bundle
    ├── polyfills.js         # Browser polyfills
    ├── styles.css           # Global styles
    ├── _redirects           # SPA routing configuration
    ├── _headers             # Security headers
    ├── sitemap.xml          # SEO sitemap
    ├── robots.txt           # Search engine directives
    ├── favicon.ico          # Site icon
    ├── manifest.webmanifest # PWA manifest
    └── assets/              # Images, i18n files, etc.
```

---

## Troubleshooting

### Build Fails with "Module not found"

**Cause:** Missing dependencies or stale node_modules

**Solution:**
```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install

# Test build locally
npm run build:dev
```

### 404 Errors on Angular Routes

**Cause:** `_redirects` file missing or incorrectly configured

**Solution:**
1. Verify `_redirects` exists in `dist/browser/_redirects`
2. Content should be: `/* /index.html 200`
3. Rebuild and redeploy

### Build Output Directory Not Found

**Cause:** Incorrect build output directory configured

**Solution:**
- Verify in Cloudflare Pages settings: Build output directory = `dist/browser`
- Angular 19 uses `dist/browser` (not `dist` alone)

### Deployment Succeeds but Site Doesn't Load

**Cause:** index.html not found in build output root

**Solution:**
```bash
# Verify index.html exists
ls -la dist/browser/index.html

# If missing, check Angular build configuration
cat angular.json | grep outputPath
```

---

## Next Steps

After completing Cloudflare Pages setup:

1. **Task Group 5:** Create GitHub Actions workflow for automatic deployment
2. **Task Group 6:** Trigger initial deployment and validate
3. **Task Group 7-8:** Set up Railway infrastructure for backend (Phase 2 prep)

---

## References

- **Cloudflare Pages Documentation:** https://developers.cloudflare.com/pages/
- **Angular Build Documentation:** https://angular.io/guide/build
- **SPA Routing on Cloudflare Pages:** https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering

---

**Last Updated:** November 5, 2025
**Phase:** 1 (Frontend Deployment)
