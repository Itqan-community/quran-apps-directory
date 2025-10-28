# GitHub Actions Migration - Quick Start

## TL;DR - 5 Minute Setup

### 1. Generate SSH Keys (1 minute)

```bash
ssh-keygen -t ed25519 -C "github-dev" -f ~/.ssh/github_dev -N ""
ssh-keygen -t ed25519 -C "github-staging" -f ~/.ssh/github_staging -N ""
ssh-keygen -t ed25519 -C "github-prod" -f ~/.ssh/github_prod -N ""
```

### 2. Add Keys to Servers (2 minutes)

```bash
# Development
cat ~/.ssh/github_dev.pub | ssh user@your-dev-server "cat >> ~/.ssh/authorized_keys"

# Staging
cat ~/.ssh/github_staging.pub | ssh user@your-staging-server "cat >> ~/.ssh/authorized_keys"

# Production
cat ~/.ssh/github_prod.pub | ssh user@your-prod-server "cat >> ~/.ssh/authorized_keys"
```

### 3. Add GitHub Secrets (2 minutes)

**Option A: Interactive Setup**
```bash
.github/workflows/setup-secrets.sh
```

**Option B: Manual Add**
Go to: GitHub → Your Repo → Settings → Secrets and variables → Actions

Add these secrets:

| Secret | Value |
|--------|-------|
| SSH_HOST_DEV | your-dev-server.com |
| SSH_USER_DEV | ubuntu |
| SSH_PRIVATE_KEY_DEV | (paste `cat ~/.ssh/github_dev`) |
| SSH_HOST_STAGING | your-staging-server.com |
| SSH_USER_STAGING | ubuntu |
| SSH_PRIVATE_KEY_STAGING | (paste `cat ~/.ssh/github_staging`) |
| SSH_HOST_PROD | your-prod-server.com |
| SSH_USER_PROD | ubuntu |
| SSH_PRIVATE_KEY_PROD | (paste `cat ~/.ssh/github_prod`) |
| DB_HOST_PROD | your-db-host.com |
| DB_USER_PROD | postgres |

### 4. Test It

```bash
# Push migration changes
git add backend/*/migrations/
git commit -m "feat: add migration"
git push origin develop

# Watch GitHub Actions
# → Actions tab → Recent runs → Check for green checkmark ✅
```

That's it! Migrations now run automatically. 🎉

---

## How It Works

```
You push code to GitHub
        ↓
GitHub Actions detects migration files
        ↓
Workflow auto-detects environment:
  develop  → Development server
  staging  → Staging server
  main     → Production server
        ↓
Workflow SSHs into server
        ↓
Runs: python3 manage.py migrate --noinput
        ↓
Shows results in GitHub Actions UI
```

---

## Common Tasks

### Check Migration Status

In GitHub UI:
```
Actions tab → Recent workflow run → Scroll down for logs
```

On server:
```bash
ssh user@your-server
cd /var/www/quran-apps-backend
source venv/bin/activate
python3 manage.py showmigrations
```

### Manually Trigger Migration

1. Go to GitHub Actions tab
2. Click "Run Django Migrations"
3. Click "Run workflow"
4. Select environment

Or via command line:
```bash
gh workflow run migrate.yml --ref develop
```

### View Workflow Logs

```bash
gh run list --repo your-repo/quran-apps-directory
gh run view <run-id> --log
```

### Rollback a Migration

```bash
ssh user@your-server
cd /var/www/quran-apps-backend
source venv/bin/activate
python3 manage.py migrate apps 0001_initial
```

---

## Troubleshooting

### "Permission denied" Error

```bash
# Fix: Add your public key to server
cat ~/.ssh/github_dev.pub | ssh user@dev-server \
  "cat >> ~/.ssh/authorized_keys"

# Test connection
ssh -i ~/.ssh/github_dev user@dev-server
```

### "No migrations to apply"

This is OK! It means migrations are already applied.

### Workflow Stuck

1. Click "Actions" tab
2. Find stuck run
3. Click "Cancel workflow run"

### Database Connection Error

1. SSH into server
2. Check `.env` file: `cat /var/www/quran-apps-backend/.env`
3. Test DB: `psql -h localhost -U postgres -d quran_apps_db`

---

## Key Files

- `.github/workflows/migrate.yml` - Main workflow (auto-triggered)
- `.github/workflows/setup-secrets.sh` - Setup script
- `.github/DEPLOYMENT.md` - Full documentation
- `.github/workflows/README.md` - Detailed guide

---

## What Gets Automated

✅ Migration detection
✅ Server connection
✅ Code pull
✅ Migration execution
✅ Status reporting
✅ Error notifications

---

## What You Need to Do

✅ Generate SSH keys (once)
✅ Add keys to servers (once)
✅ Add GitHub Secrets (once)
✅ Push code normally (as usual)

Then everything else is automatic!

---

## Need Help?

- Read `.github/DEPLOYMENT.md` for detailed setup
- Check workflow logs in GitHub Actions
- SSH to server and check Django logs:
  ```bash
  python3 manage.py showmigrations
  ```

---

**You're all set!** 🚀 Migrations will now run automatically when you push.
