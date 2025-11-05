# GitHub Actions Workflows

This directory contains automated workflows for deploying the Quran Apps backend and running Django migrations.

## Workflows

### 1. `migrate.yml` - Run Django Migrations 

Automatically runs Django migrations when migration files are modified in any branch.

**Triggers:**
- Automatically when migration files are pushed (on develop, staging, or main branches)
- Manual trigger via GitHub Actions → Run workflow

**Features:**
- Auto-detects environment based on branch:
  - `develop` → Development
  - `staging` → Staging
  - `main` → Production
- Pulls latest code before running migrations
- Shows migration status after completion
- Supports manual dispatch with environment selection

### 2. `deploy-and-migrate.yml` - Full Deployment + Migrations

Complete deployment workflow that includes code deployment, migrations, and service restart.

**Triggers:**
- Push to develop/staging/main branches
- Only runs when backend files change

**Features:**
- Deploys code to the respective environment
- Runs all pending migrations
- Restarts the API service
- Verifies migration status
- Production environment requires manual approval

## Required GitHub Secrets

You need to configure these secrets in your GitHub repository settings (Settings → Secrets and variables → Actions):

### For Development Environment
- `SSH_PRIVATE_KEY_DEV` - Private SSH key for development server
- `SSH_HOST_DEV` - Development server hostname/IP
- `SSH_USER_DEV` - SSH user for development server

### For Staging Environment
- `SSH_PRIVATE_KEY_STAGING` - Private SSH key for staging server
- `SSH_HOST_STAGING` - Staging server hostname/IP
- `SSH_USER_STAGING` - SSH user for staging server

### For Production Environment
- `SSH_PRIVATE_KEY_PROD` - Private SSH key for production server
- `SSH_HOST_PROD` - Production server hostname/IP
- `SSH_USER_PROD` - SSH user for production server
- `DB_HOST_PROD` - Production database host
- `DB_USER_PROD` - Production database user

## Setting Up Secrets

### 1. Generate SSH Keys (if you don't have them)

```bash
# Generate a new SSH key for each environment
ssh-keygen -t ed25519 -C "github-actions-dev@example.com" -f ~/.ssh/github_actions_dev
ssh-keygen -t ed25519 -C "github-actions-staging@example.com" -f ~/.ssh/github_actions_staging
ssh-keygen -t ed25519 -C "github-actions-prod@example.com" -f ~/.ssh/github_actions_prod

# Copy public keys to your servers
ssh-copy-id -i ~/.ssh/github_actions_dev.pub user@dev-host
ssh-copy-id -i ~/.ssh/github_actions_staging.pub user@staging-host
ssh-copy-id -i ~/.ssh/github_actions_prod.pub user@prod-host
```

### 2. Add Secrets to GitHub

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:

```
SSH_PRIVATE_KEY_DEV = (content of ~/.ssh/github_actions_dev)
SSH_HOST_DEV = your-dev-server.com
SSH_USER_DEV = ubuntu

SSH_PRIVATE_KEY_STAGING = (content of ~/.ssh/github_actions_staging)
SSH_HOST_STAGING = your-staging-server.com
SSH_USER_STAGING = ubuntu

SSH_PRIVATE_KEY_PROD = (content of ~/.ssh/github_actions_prod)
SSH_HOST_PROD = your-prod-server.com
SSH_USER_PROD = ubuntu
DB_HOST_PROD = prod-db.example.com
DB_USER_PROD = postgres
```

## Server Setup Requirements

Each server must have:

1. **Git repository** at `/var/www/quran-apps-backend`
2. **Python virtual environment** at `/var/www/quran-apps-backend/venv`
3. **PostgreSQL** database with credentials matching environment variables
4. **Systemd service** named `quran-apps-api` (for service restart)

Example setup:

```bash
# SSH into server
ssh user@dev-server

# Create directory structure
sudo mkdir -p /var/www/quran-apps-backend
sudo chown $USER:$USER /var/www/quran-apps-backend

# Clone repository
cd /var/www/quran-apps-backend
git clone https://github.com/Itqan-community/quran-apps-directory.git .

# Create virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# Create .env file with database credentials
cat > .env << EOF
DEBUG=False
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:password@localhost:5432/quran_apps_db
EOF

# Run initial migrations
python3 manage.py migrate
```

## Running Migrations Manually

### Via GitHub Actions (Web UI)

1. Go to **Actions** tab
2. Select **Run Django Migrations** workflow
3. Click **Run workflow**
4. Select the environment (development, staging, or production)

### Via Command Line (Local)

```bash
# SSH into server
ssh user@your-server

# Navigate to backend
cd /var/www/quran-apps-backend
source venv/bin/activate

# Run migrations
python3 manage.py migrate

# Check status
python3 manage.py showmigrations
```

## Troubleshooting

### Migrations Not Running

1. Check if SSH keys are properly configured in secrets
2. Verify server paths match what's in the workflow
3. Ensure virtual environment exists on server
4. Check Django settings for database configuration

### Connection Refused

1. Verify SSH host and user in secrets
2. Test SSH connection locally: `ssh -i key user@host`
3. Ensure SSH key permissions are correct: `chmod 600 ~/.ssh/key`

### Database Migration Errors

1. SSH into server and check database connection:
   ```bash
   psql -h localhost -U postgres -d quran_apps_db -c "\dt"
   ```

2. View migration history:
   ```bash
   python3 manage.py showmigrations
   ```

3. Check Django logs for detailed errors

## Best Practices

- Always test migrations on development first
- Keep SSH keys secure and rotate regularly
- Review migration changes before production
- Take backups before production migrations
- Monitor API logs after running migrations
- Document any custom migration steps

## References

- [Django Migrations Documentation](https://docs.djangoproject.com/en/5.2/topics/migrations/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [SSH Key Management](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
