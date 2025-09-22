# 🔄 Git Workflow & Branch Strategy

This document outlines the complete Git workflow and branch strategy for the Quran Apps Directory project with automated deployments.

## 🌳 Branch Structure

```
main (Production)     →  https://quran-apps.itqan.dev
 ↑
staging (Staging)     →  https://staging.quran-apps.itqan.dev
 ↑
develop (Development) →  https://dev.quran-apps.itqan.dev
 ↑
feature/* (Features)  →  Local development
```

## 🚀 Deployment Strategy

### Automated Deployments
Each branch is configured for **automatic deployment** when merged:

| Branch | Environment | URL | Trigger |
|--------|-------------|-----|---------|
| `main` | Production | `https://quran-apps.itqan.dev` | ✅ **Merge from staging** |
| `staging` | Staging | `https://staging.quran-apps.itqan.dev` | ✅ **Merge from develop** |
| `develop` | Development | `https://dev.quran-apps.itqan.dev` | ✅ **Direct commits/merges** |

## 📋 Development Workflow

### 1. **Feature Development**
```bash
# Start new feature from develop
git checkout develop
git pull origin develop
git checkout -b feature/amazing-new-feature

# Make your changes
# ... code, code, code ...

# Commit your changes
git add .
git commit -m "feat: add amazing new feature"
git push origin feature/amazing-new-feature
```

### 2. **Deploy to Development**
```bash
# Merge feature to develop branch
git checkout develop
git pull origin develop
git merge feature/amazing-new-feature
git push origin develop

# 🚀 Auto-deploys to: https://dev.quran-apps.itqan.dev
```

### 3. **Deploy to Staging** 
```bash
# After testing in development, promote to staging
git checkout staging
git pull origin staging
git merge develop
git push origin staging

# 🚀 Auto-deploys to: https://staging.quran-apps.itqan.dev
```

### 4. **Deploy to Production**
```bash
# After testing in staging, promote to production
git checkout main
git pull origin main
git merge staging
git push origin main

# 🚀 Auto-deploys to: https://quran-apps.itqan.dev
```

## 🔧 Local Testing

Test different environment configurations locally before deployment:

```bash
# Test different configurations locally
npm run serve:dev       # Test development config
npm run serve:staging   # Test staging config  
npm run serve:prod      # Test production config
```

## 🧪 Testing Strategy

### Development Environment (`develop` branch)
- **Purpose**: Integration testing of new features
- **Testing**: 
  - Feature integration
  - Basic functionality
  - Quick validation
- **Audience**: Developers

### Staging Environment (`staging` branch)
- **Purpose**: Pre-production testing
- **Testing**:
  - Full functionality testing
  - Performance testing
  - User acceptance testing
  - Cross-browser testing
- **Audience**: QA team, stakeholders

### Production Environment (`main` branch)
- **Purpose**: Live user-facing application
- **Testing**: 
  - Smoke testing post-deployment
  - Monitor analytics and errors
- **Audience**: End users

## 📊 Branch Management Rules

### Protected Branches
Consider protecting these branches in GitHub:
- `main` - Requires PR approval
- `staging` - Requires PR approval  
- `develop` - Optional protection

### Merge Strategy
- **Feature → Develop**: Direct merge or PR
- **Develop → Staging**: Merge commit (preserves history)
- **Staging → Main**: Merge commit (preserves history)

### Naming Conventions
```bash
feature/description         # New features
bugfix/issue-number        # Bug fixes  
hotfix/critical-fix        # Critical production fixes
chore/maintenance-task     # Maintenance tasks
```

## 🚨 Hotfix Workflow

For critical production issues:

```bash
# Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-issue

# Fix the issue
# ... make changes ...
git add .
git commit -m "hotfix: fix critical issue"

# Deploy hotfix to staging first for testing
git checkout staging
git merge hotfix/critical-issue
git push origin staging
# Test on staging environment

# Deploy to production
git checkout main
git merge hotfix/critical-issue
git push origin main

# Backport to develop
git checkout develop
git merge hotfix/critical-issue
git push origin develop

# Clean up
git branch -d hotfix/critical-issue
git push origin --delete hotfix/critical-issue
```

## 📈 Monitoring & Rollback

### Monitoring Deployments
- **Netlify Deploy Status**: Check [Netlify Dashboard](https://app.netlify.com/teams/itqan)
- **Build Logs**: Available in each site's deploy section
- **Error Tracking**: Monitor browser console and Netlify function logs

### Rollback Strategy
```bash
# Rollback using Git (recommended)
git checkout main
git revert HEAD~1  # Revert last commit
git push origin main

# Or rollback to specific commit
git reset --hard PREVIOUS_COMMIT_HASH
git push --force origin main  # ⚠️ Use with caution
```

### Netlify Rollback
```bash
# Using Netlify CLI
netlify rollback --site=SITE_ID
```

## 🔄 Release Process

### Version Tagging
```bash
# Create release tag
git checkout main
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0
```

### Release Notes
Update `CHANGELOG.md` with:
- New features
- Bug fixes  
- Breaking changes
- Migration notes

## 🛠️ Local Development

### Environment Setup
```bash
# Clone and setup
git clone https://github.com/Itqan-community/quran-apps-directory.git
cd quran-apps-directory
./dev-start.sh

# Switch to development workflow
git checkout develop
```

### Testing Different Configurations
```bash
# Test development build
npm run serve:dev

# Test staging build  
npm run serve:staging

# Test production build
npm run serve:prod
```

## 📋 Checklists

### ✅ Before Merging to Staging
- [ ] All features work in development environment
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Cross-browser compatibility
- [ ] Performance acceptable
- [ ] Search and filtering work
- [ ] Multi-language support functional

### ✅ Before Merging to Production  
- [ ] Full testing completed in staging
- [ ] Stakeholder approval received
- [ ] Performance benchmarks met
- [ ] SEO meta tags updated
- [ ] Analytics tracking verified
- [ ] Backup strategy confirmed
- [ ] Rollback plan prepared

## 🎯 Quick Reference

### Common Commands
```bash
# Switch branches
git checkout develop|staging|main

# Deploy environments
./deploy-netlify.sh deploy development|staging|production

# Check deployment status
git status
git log --oneline -5

# Emergency rollback
netlify rollback --site=SITE_ID
```

### Environment URLs
- **Development**: https://dev.quran-apps.itqan.dev
- **Staging**: https://staging.quran-apps.itqan.dev  
- **Production**: https://quran-apps.itqan.dev

---

*This workflow ensures safe, tested deployments while maintaining development velocity and production stability.*
