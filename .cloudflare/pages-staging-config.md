# Cloudflare Pages Staging Deployment Setup

## Configuration Summary

**Project Name:** quran-apps-directory-staging
**Domain:** https://staging.quran-apps-directory-frontend.pages.dev
**GitHub Branch:** staging
**Backend API:** https://qad-backend-api-staging.up.railway.app/api

## Dashboard Setup Steps

Follow these steps in the Cloudflare Dashboard: https://dash.cloudflare.com/71be39fa76ea6261ea925d02b6ee15e6/workers-and-pages

### 1. Create Pages Project
1. Go to **Workers & Pages**
2. Click **Create** → **Pages** → **Connect to Git**
3. Select your GitHub organization/account
4. Find and select the `quran-apps-directory` repository
5. Click **Begin setup**

### 2. Configure Build Settings
- **Project name:** `quran-apps-directory-staging`
- **Production branch:** `staging` (NOT main)
- **Build command:** `npm run build:staging`
- **Build output directory:** `dist/demo/browser`
- **Node.js version:** 20 (or auto-detect)

### 3. Set Environment Variables
Add the following environment variables in Pages → Settings → Environment variables:

```
NG_APP_BACKEND_URL=https://qad-backend-api-staging.up.railway.app/api
NG_APP_ENVIRONMENT=staging
NG_APP_STAGING_MODE=true
```

### 4. Custom Domain (Optional)
If you want a custom domain instead of the default `.pages.dev`:
1. Go to Pages → Custom domains
2. Add domain and configure DNS

### 5. Deploy
Click **Save and Deploy** - Pages will automatically:
- Clone the `staging` branch
- Run the build command
- Deploy the output directory to Cloudflare's edge

## Automatic Deployments

Once set up, every push to the `staging` branch will automatically:
1. Trigger a new build
2. Run `npm run build:staging`
3. Deploy the built files to production

## Build Configuration Files

The following files are already configured:

- **wrangler.toml** - Cloudflare Workers configuration
- **_routes.json** - Route handling for SPA (single-page app)
- **environment.staging.ts** - Angular staging environment with Railway backend URL

## Monitoring Deployments

1. Go to **Pages** → **quran-apps-directory-staging** → **Deployments**
2. View build logs, deployment status, and rollback if needed

## Backend Connection

The staging environment is pre-configured to use the Railway staging backend:
- API Endpoint: `https://qad-backend-api-staging.up.railway.app/api`
- Configured in: `src/environments/environment.staging.ts`

## Troubleshooting

### Build Fails
- Check **Build logs** in the Pages dashboard
- Verify `npm run build:staging` works locally: `npm run build:staging`
- Ensure Node.js dependencies are correct

### API Calls Fail (CORS)
- Verify the backend API is accessible
- Check CORS headers on the Railway backend
- Backend URL in environment.staging.ts should match Railway URL

### Wrong Branch Deploying
- Verify in Pages → Settings that the production branch is `staging`
- Note: Preview deployments work for PRs from the staging branch

## Notes

- This is a **static site** hosted on Cloudflare Pages (no backend)
- Backend API calls will be proxied through the browser to the Railway backend
- For backend CORS issues, configure CORS on the Railway Django server
- Logs are available in the Cloudflare dashboard under **Pages** → **Deployments**
