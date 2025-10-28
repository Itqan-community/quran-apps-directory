# GitHub Actions Deployment and Migration Guide

This guide explains how to set up and use the automated GitHub Actions workflows for deploying code and running Django migrations.

## Quick Start

### 1. Generate SSH Keys

If you don't already have SSH keys for each environment:

```bash
# Development
ssh-keygen -t ed25519 -C "github-dev" -f ~/.ssh/github_dev

# Staging
ssh-keygen -t ed25519 -C "github-staging" -f ~/.ssh/github_staging

# Production
ssh-keygen -t ed25519 -C "github-prod" -f ~/.ssh/github_prod
```

### 2. Add Public Keys to Servers

For each server, add the public key to the deploy user's `~/.ssh/authorized_keys`:

```bash
# Development server
cat ~/.ssh/github_dev.pub | ssh user@dev-server "cat >> ~/.ssh/authorized_keys"

# Staging server
cat ~/.ssh/github_staging.pub | ssh user@staging-server "cat >> ~/.ssh/authorized_keys"

# Production server
cat ~/.ssh/github_prod.pub | ssh user@prod-server "cat >> ~/.ssh/authorized_keys"
```

### 3. Add GitHub Secrets

```bash
# Make sure you're authenticated with GitHub CLI
gh auth login

# Run the setup script (interactive)
.github/workflows/setup-secrets.sh

# Or manually add secrets via GitHub web UI
# Settings → Secrets and variables → Actions → New repository secret
```

**Required Secrets:**

```
Development:
  SSH_HOST_DEV           → your-dev-server.com
  SSH_USER_DEV           → ubuntu
  SSH_PRIVATE_KEY_DEV    → (content of ~/.ssh/github_dev)

Staging:
  SSH_HOST_STAGING       → your-staging-server.com
  SSH_USER_STAGING       → ubuntu
  SSH_PRIVATE_KEY_STAGING→ (content of ~/.ssh/github_staging)

Production:
  SSH_HOST_PROD          → your-prod-server.com
  SSH_USER_PROD          → ubuntu
  SSH_PRIVATE_KEY_PROD   → (content of ~/.ssh/github_prod)
  DB_HOST_PROD           → prod-db.example.com
  DB_USER_PROD           → postgres
```

### 4. Prepare Servers

On each server, ensure the following directory structure exists:

```bash
sudo mkdir -p /var/www/quran-apps-backend
sudo chown $USER:$USER /var/www/quran-apps-backend

cd /var/www/quran-apps-backend

# Clone repository
git clone https://github.com/Itqan-community/quran-apps-directory.git .
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file
cat > ../.env << EOF
SECRET_KEY=your-secret-key-here
DEBUG=False
DATABASE_URL=postgresql://user:password@localhost:5432/quran_apps_db
ALLOWED_HOSTS=your-domain.com
EOF

# Run initial migration
python3 manage.py migrate
```

### 5. Set Up Systemd Service (Optional but Recommended)

Create `/etc/systemd/system/quran-apps-api.service`:

```ini
[Unit]
Description=Quran Apps API Service
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/var/www/quran-apps-backend
ExecStart=/var/www/quran-apps-backend/venv/bin/python manage.py runserver 0.0.0.0:8000
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable quran-apps-api
sudo systemctl start quran-apps-api
```

## Workflows Overview

### 1. `migrate.yml` - Run Migrations

**Triggers:**
- ✅ Automatically when migration files are pushed
- ✅ Manual trigger via GitHub Actions UI
- ✅ Auto-detects environment from branch

**Branch Mapping:**
```
develop  → Development
staging  → Staging
main     → Production
```

**What it does:**
1. Detects which environment to deploy to
2. Pulls latest code
3. Runs `python3 manage.py migrate --noinput`
4. Displays migration status

**Manual Trigger:**
```
GitHub Actions tab → Run Django Migrations → Run workflow
→ Select environment → Click "Run workflow"
```

### 2. `deploy-and-migrate.yml` - Full Deployment

**Triggers:**
- ✅ Automatically on push to develop/staging/main
- ✅ Only when backend files change

**What it does:**
1. Deploys code to the environment
2. Runs migrations
3. Restarts the API service
4. Verifies deployment

**Production notes:**
- Requires manual approval in GitHub
- Creates automated database backup
- Shows confirmation after deployment

## Common Tasks

### Running Migrations After Code Push

1. Make changes to migration files
2. Commit and push to develop/staging/main
3. GitHub Actions automatically runs migrations

```bash
# Example
git add backend/apps/migrations/
git commit -m "feat: add new app fields migration"
git push origin develop

# Migrations run automatically! ✅
```

### Manual Migration Trigger

If you need to run migrations without pushing code:

1. Go to GitHub → Actions tab
2. Click "Run Django Migrations"
3. Click "Run workflow"
4. Select environment (development/staging/production)

### Checking Migration Status

After deployment, view the logs in GitHub Actions:

```
Actions → Recent workflow runs → Click run → Review logs
```

Or SSH to the server:

```bash
ssh user@your-server
cd /var/www/quran-apps-backend
source venv/bin/activate
python3 manage.py showmigrations
```

### Rolling Back a Migration

If something goes wrong:

```bash
ssh user@your-server
cd /var/www/quran-apps-backend
source venv/bin/activate

# See migration history
python3 manage.py showmigrations

# Rollback one migration
python3 manage.py migrate apps 0001_initial

# Or restore from backup (production)
psql -h localhost -U postgres -d quran_apps_db < backups/db_backup_20251028_120000.sql
```

## Troubleshooting

### SSH Connection Fails

**Error:** `Permission denied (publickey)`

**Solution:**
1. Verify public key is in server's `~/.ssh/authorized_keys`
2. Check SSH private key permissions: `chmod 600 ~/.ssh/github_*`
3. Test connection locally: `ssh -i ~/.ssh/github_dev user@dev-server`

### Database Connection Fails

**Error:** `psycopg2.OperationalError: could not translate host name`

**Solution:**
1. Check `DATABASE_URL` in `.env`
2. Verify PostgreSQL is running: `systemctl status postgresql`
3. Test connection: `psql -h localhost -U postgres -d quran_apps_db`

### Migrations Don't Run

**Error:** `No migrations to apply` (but migrations exist)

**Solution:**
1. Check if migrations are already applied: `python3 manage.py showmigrations`
2. Ensure migration files are in git: `git ls-files backend/*/migrations/`
3. Check workflow logs for errors

### Service Restart Fails

**Error:** `Unit quran-apps-api.service not found`

**Solution:**
1. Create the systemd service file (see Setup section above)
2. Or comment out service restart in workflow if not using systemd
3. Use alternative startup method (supervisor, docker, etc.)

## Security Best Practices

1. **SSH Keys**: Rotate SSH keys every 90 days
2. **Database Backups**: Store in secure, encrypted backup location
3. **Secrets Management**:
   - Never commit secrets to repository
   - Rotate secrets regularly
   - Use different keys for each environment
4. **Code Review**: Require PR review before merge to production
5. **Testing**: Run tests before deploying
6. **Monitoring**: Watch logs after deployment for errors

## File Structure

```
.github/
├── workflows/
│   ├── migrate.yml                 # Run migrations workflow
│   ├── deploy-and-migrate.yml      # Full deployment workflow
│   ├── setup-secrets.sh            # Setup script for secrets
│   └── README.md                   # Workflow documentation
└── DEPLOYMENT.md                   # This file
```

## Environment Variables

### Development (`.env`)
```env
SECRET_KEY=dev-secret-key
DEBUG=True
DATABASE_URL=postgresql://user:password@localhost:5432/quran_apps_db_dev
ALLOWED_HOSTS=localhost,127.0.0.1
```

### Staging (`.env`)
```env
SECRET_KEY=staging-secret-key
DEBUG=False
DATABASE_URL=postgresql://user:password@staging-db:5432/quran_apps_db
ALLOWED_HOSTS=staging.quran-apps.itqan.dev
```

### Production (`.env`)
```env
SECRET_KEY=production-secret-key-change-this
DEBUG=False
DATABASE_URL=postgresql://user:password@prod-db:5432/quran_apps_db
ALLOWED_HOSTS=quran-apps.itqan.dev
```

## Useful Commands

```bash
# View workflow runs
gh run list --repo Itqan-community/quran-apps-directory

# View specific run details
gh run view <run-id>

# View logs for a run
gh run view <run-id> --log

# Cancel a workflow run
gh run cancel <run-id>

# Re-run failed jobs
gh run rerun <run-id>

# List secrets
gh secret list --repo Itqan-community/quran-apps-directory

# Remove a secret
gh secret delete SECRET_NAME
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review workflow logs in GitHub Actions
3. Check Django logs on the server: `sudo journalctl -u quran-apps-api -f`
4. Consult Django migrations documentation: https://docs.djangoproject.com/en/5.2/topics/migrations/

## References

- [Django Migrations](https://docs.djangoproject.com/en/5.2/topics/migrations/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [SSH Key Management](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
