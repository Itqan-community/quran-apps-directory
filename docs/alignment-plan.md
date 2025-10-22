# Quran Apps Directory - CMS Backend Alignment Plan

**Date:** October 20, 2025
**Purpose:** Standardize quran-apps-directory backend to match cms-backend architecture
**Status:** Approved - Ready for Implementation

## Executive Summary

This document outlines the plan to align the quran-apps-directory backend with the standardized architecture used in the [cms-backend](https://github.com/Itqan-community/cms-backend) project. The goal is to create consistency across ITQAN's Django projects, improve maintainability, and adopt modern best practices.

## Current State Analysis

### Quran Apps Directory (Current)
- **API Framework:** Django REST Framework (DRF) with drf-spectacular
- **Settings Location:** `quran_apps/settings/`
- **Dependencies:** Single `requirements.txt`
- **Documentation:** Swagger UI
- **Project Structure:** Traditional Django layout

### CMS Backend (Target Standard)
- **API Framework:** Django Ninja with Scalar docs
- **Settings Location:** `config/settings/`
- **Dependencies:** `pyproject.toml` + `requirements/` directory
- **Documentation:** Scalar (modern alternative to Swagger)
- **Project Structure:** Modular apps-based design
- **Development Tools:** Comprehensive tooling (black, isort, pytest, etc.)

## Detailed Alignment Plan

### Phase 1: Project Structure Reorganization

**Objective:** Match cms-backend directory structure

**Tasks:**
1. **Rename Django Settings Directory**
   - Move `quran_apps/` → `config/`
   - Update `manage.py` DJANGO_SETTINGS_MODULE reference
   - Update all imports in Python files
   - Update Docker and deployment configurations

2. **Standardize Settings Structure**
   ```
   config/
   ├── settings/
   │   ├── __init__.py
   │   ├── base.py      # Base settings (merge from current base.py)
   │   ├── local.py     # Development settings (merge from local.py)
   │   ├── testing.py   # New: Test-specific settings
   │   ├── staging.py   # New: Staging settings
   │   └── production.py
   ├── urls.py          # Main URL configuration
   └── ninja_urls.py    # New: API endpoints (if migrating to Ninja)
   ```

3. **Apps Directory Structure** (Already matches)
   ```
   apps/
   ├── core/           # Base functionality
   ├── apps/           # Applications (already exists)
   ├── categories/     # Categories (already exists)
   ├── developers/     # Developers (already exists)
   └── users/          # User management (new)
   ```

**Impact:** Low to Medium (requires file moves and import updates)
**Timeline:** 1-2 hours

### Phase 2: Dependencies Management Standardization

**Objective:** Adopt cms-backend's dependency management approach

**Tasks:**
1. **Create pyproject.toml**
   ```toml
   [build-system]
   requires = ["setuptools>=61.0", "wheel"]
   build-backend = "setuptools.build_meta"

   [project]
   name = "quran-apps-directory"
   version = "1.0.0"
   description = "A comprehensive bilingual directory of Islamic applications"

   [tool.pytest.ini_options]
   minversion = "6.0"
   addopts = "--ds=config.settings.development --reuse-db"
   python_files = ["tests.py", "test_*.py"]
   ```

2. **Split Requirements**
   - `requirements/base.txt` - Production dependencies
   - `requirements/local.txt` - Development dependencies
   - `requirements/testing.txt` - Testing dependencies
   - `requirements/production.txt` - Production-only dependencies

3. **Update Dependencies**
   - Add development tools from cms-backend:
     - `black==23.7.*` (code formatting)
     - `isort==5.12.*` (import sorting)
     - `flake8==6.0.*` (linting)
     - `ruff==0.12.12` (fast linting)
     - `pytest==8.4.2` (testing framework)
     - `pytest-django==4.11.1`
     - `mypy==1.17.1` (type checking)
     - `pre-commit==4.3.0` (git hooks)

**Impact:** Low (no code changes, only file organization)
**Timeline:** 1 hour

### Phase 3: API Framework Decision & Migration

**Option A: Keep DRF with Improvements**
- Keep current DRF implementation
- Add Scalar UI as alternative to Swagger
- Benefits: No major refactoring required
- Drawbacks: Not aligned with cms-backend

**Option B: Migrate to Django Ninja (Recommended)**
- Migrate all DRF ViewSets to Ninja endpoints
- Benefits: Modern, simpler syntax, auto-generated docs
- Drawbacks: Significant refactoring required

**Tasks for Option B:**
1. Install Django Ninja
2. Create `config/ninja_urls.py`
3. Convert each app's serializers and views:
   - `apps/views.py` → `apps/api.py`
   - Serializers → Pydantic models
   - ViewSets → Ninja endpoints
4. Update URL routing
5. Test all endpoints

**Impact:** High (requires complete API rewrite)
**Timeline:** 1-2 days

**Recommendation:** Start with Option A, plan migration to Option B for Phase 2

### Phase 4: Development Tooling Setup

**Objective:** Match cms-backend's development workflow

**Tasks:**
1. **Pre-commit Hooks**
   ```yaml
   .pre-commit-config.yaml:
   - repo: https://github.com/psf/black
     rev: 23.7.0
     hooks:
       - id: black
   - repo: https://github.com/pycqa/isort
     rev: 5.12.0
     hooks:
       - id: isort
   - repo: https://github.com/pycqa/flake8
     rev: 6.0.0
     hooks:
       - id: flake8
   ```

2. **Code Quality Configuration**
   - `.flake8` - Linting rules
   - `pyproject.toml` - Black and isort configuration
   - `.mypy.ini` - Type checking configuration

3. **Testing Setup**
   - Convert existing tests to pytest
   - Add test utilities and factories
   - Set up test database configuration

**Impact:** Low (new files only)
**Timeline:** 2-3 hours

### Phase 5: Docker & Deployment Improvements

**Objective:** Adopt cms-backend's Docker patterns

**Tasks:**
1. **Update Docker Configuration**
   - Multi-stage builds
   - Separate development and production Dockerfiles
   - Health checks
   - Proper signal handling

2. **Add Caddy Reverse Proxy** (Optional)
   ```yaml
   services:
     web:
       image: ${IMAGE_REPO}:${IMAGE_TAG}
       depends_on:
         - caddy
     caddy:
       image: caddy:2-alpine
       ports:
         - "80:80"
         - "443:443"
   ```

3. **Improve Docker Compose**
   - Named volumes for persistence
   - Environment-specific compose files
   - Better networking configuration

**Impact:** Medium
**Timeline:** 2-4 hours

### Phase 6: Additional Features & Best Practices

**Tasks:**
1. **Add Celery Support**
   - Task queue setup
   - Redis configuration
   - Background task examples

2. **File Storage Improvements**
   - MinIO/S3 configuration
   - Local development fallback
   - CDN integration ready

3. **Monitoring & Debugging**
   - Add django-silk for profiling
   - Structured logging
   - Health check endpoints

4. **Bilingual Support Enhancement**
   - Translation workflow
   - RTL/LTR middleware improvements
   - Language detection

**Impact:** Variable
**Timeline:** 1-2 days

## Implementation Priority

### Immediate (This Week)
1. ✅ Phase 1: Project structure reorganization
2. ✅ Phase 2: Dependencies management
3. ✅ Phase 4: Development tooling setup

### Short Term (Next Sprint)
4. Phase 3: API framework evaluation
5. Phase 5: Docker improvements

### Medium Term (Next Month)
6. Phase 6: Additional features
7. Complete Django Ninja migration (if chosen)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes during restructuring | High | Test thoroughly in development branch |
| API migration complexity | High | Incremental migration, maintain backward compatibility |
| Learning curve for new tools | Low | Document patterns, provide team training |
| Deployment downtime | Medium | Blue-green deployment strategy |

## Success Criteria

1. **Structure Alignment**: ✅ Directory structure matches cms-backend
2. **Tooling Parity**: ✅ Same development tools and workflows
3. **Code Quality**: ✅ Consistent formatting and linting
4. **Documentation**: ✅ Comprehensive project documentation
5. **Maintainability**: ✅ Easier onboarding for developers

## Migration Checklist

### Before Migration
- [ ] Create feature branch from develop
- [ ] Backup current code
- [ ] Document current API endpoints
- [ ] Update deployment scripts

### During Migration
- [ ] Update Phase 1 changes
- [ ] Run full test suite
- [ ] Fix any import errors
- [ ] Update Docker configurations
- [ ] Test API endpoints

### After Migration
- [ ] Update documentation
- [ ] Train team on new tools
- [ ] Update CI/CD pipelines
- [ ] Deploy to staging for testing
- [ ] Deploy to production with monitoring

## Conclusion

This alignment plan will bring the quran-apps-directory backend in line with the standardized architecture used across ITQAN projects. The modular approach allows for incremental implementation, minimizing risk while maximizing benefits.

**Next Steps:**
1. Review and approve this plan
2. Create detailed tasks for Phase 1
3. Set up development environment
4. Begin implementation

---

**Document Owner:** Development Team
**Review Date:** October 20, 2025
**Next Review:** After Phase 1 completion