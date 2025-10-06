# US2.1: Database Server Setup

**Epic:** Epic 2 - Backend Infrastructure Setup  
**Sprint:** Week 1, Day 1-2  
**Story Points:** 5  
**Priority:** P1 (Critical)  
**Assigned To:** DevOps Engineer + Backend Lead  
**Status:** Not Started

---

## 📋 User Story

**As a** DevOps Engineer  
**I want to** provision and configure PostgreSQL database servers for development, staging, and production environments  
**So that** the team has reliable database infrastructure with proper security, backups, and monitoring

---

## 🎯 Acceptance Criteria

### AC1: Railway PostgreSQL Provisioned
- [ ] Railway account created and configured
- [ ] PostgreSQL 16+ database provisioned for each environment:
  - Development: Shared instance (free tier or $5/month)
  - Staging: Dedicated instance ($15/month, 1GB RAM)
  - Production: Dedicated instance ($25/month, 2GB RAM)
- [ ] Database credentials securely stored in environment variables
- [ ] Connection strings documented for each environment

### AC2: Database Configuration Optimized
- [ ] PostgreSQL conf files configured:
  - max_connections: 100
  - shared_buffers: 256MB (production), 128MB (staging/dev)
  - effective_cache_size: 1GB
  - work_mem: 4MB
  - maintenance_work_mem: 64MB
- [ ] Connection pooling enabled (PgBouncer or built-in)
- [ ] Statement timeout set (30 seconds default)
- [ ] Idle connection timeout configured (5 minutes)

### AC3: Security Hardened
- [ ] SSL/TLS encryption enabled for all connections
- [ ] Firewall rules configured (whitelist IP addresses):
  - Development machines
  - CI/CD pipeline
  - Staging/production backend servers
- [ ] Strong passwords generated (32+ characters)
- [ ] Database user roles created:
  - `app_user`: Read/write access to application schema
  - `readonly_user`: Read-only access for analytics
  - `admin_user`: Full access for migrations
- [ ] Password rotation policy documented (every 90 days)

### AC4: Backup Strategy Implemented
- [ ] Automated daily backups configured (Railway automatic backups)
- [ ] Backup retention policy: 30 days
- [ ] Backup restore procedure tested successfully
- [ ] Point-in-time recovery (PITR) enabled for production
- [ ] Backup storage location documented
- [ ] Disaster recovery runbook created

### AC5: Monitoring and Alerts Setup
- [ ] Basic monitoring enabled:
  - Database size growth
  - Connection count
  - Query performance (slow queries >100ms)
  - Disk usage
  - CPU and memory usage
- [ ] Alert thresholds configured:
  - Disk usage >80%: Warning
  - Disk usage >90%: Critical
  - Connection count >80: Warning
  - Failed connections: Alert immediately
- [ ] Alert destinations configured (email/Slack)

### AC6: Database Schema Initialization
- [ ] Empty databases created for each environment
- [ ] Database extensions installed:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy search
  CREATE EXTENSION IF NOT EXISTS "unaccent"; -- For accent-insensitive search
  ```
- [ ] Application schema created
- [ ] Migration tracking table created (for EF Core)

### AC7: Connection Testing
- [ ] Connection tested from local development machines
- [ ] Connection tested from .NET 9 application
- [ ] Connection latency measured (<50ms acceptable)
- [ ] Load testing performed (100 concurrent connections)
- [ ] Connection pooling verified working

---

## 📝 Technical Notes

### Railway Deployment
```bash
# Railway CLI installation
npm i -g @railway/cli

# Login and link project
railway login
railway link

# Create PostgreSQL service
railway add --database postgres

# Get connection string
railway variables
```

### Connection String Format
```
# Development
Host=containers-us-west-xxx.railway.app;Port=5432;Database=railway;Username=postgres;Password=***;SSL Mode=Require;Trust Server Certificate=true

# Environment Variables (.env)
DATABASE_URL=postgresql://postgres:***@containers-us-west-xxx.railway.app:5432/railway?sslmode=require
```

### Initial Database Setup Script
```sql
-- Create application user
CREATE USER app_user WITH PASSWORD 'strong_password_here';

-- Create database
CREATE DATABASE quran_apps_dev OWNER app_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE quran_apps_dev TO app_user;

-- Connect to database
\c quran_apps_dev

-- Install extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Create schema
CREATE SCHEMA IF NOT EXISTS public;
GRANT ALL ON SCHEMA public TO app_user;
```

### Environment-Specific Configuration

| Environment | Instance Size | Connections | Backups | Cost |
|-------------|---------------|-------------|---------|------|
| Development | Shared | 20 | Manual | $5/mo |
| Staging | 1GB RAM | 50 | Daily | $15/mo |
| Production | 2GB RAM | 100 | Hourly | $25/mo |

---

## 🔗 Dependencies
- US1.1: Database Technology Selection (must be complete)

---

## 🚫 Blockers
- Railway account approval (if required)
- Payment method setup for paid tiers

---

## 📊 Definition of Done
- [ ] PostgreSQL 16+ running on Railway for all environments
- [ ] Security configuration complete and tested
- [ ] Backup strategy implemented and tested
- [ ] Monitoring and alerts configured
- [ ] Connection tested from .NET 9 application
- [ ] Documentation complete (connection guides, runbooks)
- [ ] Team trained on accessing databases
- [ ] Credentials securely distributed to team

---

## 📚 Resources
- [Railway PostgreSQL Documentation](https://docs.railway.app/databases/postgresql)
- [PostgreSQL Security Best Practices](https://www.postgresql.org/docs/16/security.html)
- [Npgsql Connection Strings](https://www.npgsql.org/doc/connection-string-parameters.html)

---

**Created:** October 6, 2025  
**Owner:** Abubakr Abduraghman, a.abduraghman@itqan.dev  
**Epic:** [Epic 2: Backend Infrastructure Setup](../epics/epic-2-backend-infrastructure-setup.md)

