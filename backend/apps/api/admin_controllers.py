"""
Admin API controllers for Quranic Applications.

Admin-only endpoints for managing apps and search indexing.
Requires staff/superuser authentication via API key.
"""
import threading
import time
import logging
from typing import Optional
from ninja import Router, Schema
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

from apps.models import App
from core.services.search import AISearchService

logger = logging.getLogger(__name__)

router = Router(tags=["Admin"])


# Simple API key authentication for admin endpoints
def admin_auth(request):
    """
    Authenticate admin requests via API key header.

    Expects header: X-Admin-Key: <key>
    The key should match ADMIN_API_KEY environment variable.
    """
    admin_key = getattr(settings, 'ADMIN_API_KEY', None)
    if not admin_key:
        logger.error("ADMIN_API_KEY not configured in settings")
        return None

    provided_key = request.headers.get('X-Admin-Key')
    if not provided_key or provided_key != admin_key:
        return None

    return True


# --- Schemas ---

class ReindexRequestSchema(Schema):
    """Request schema for reindex endpoint."""
    app_id: Optional[int] = None
    crawl: bool = False
    refresh_crawl: bool = False
    quick: bool = False
    batch_size: int = 10
    stale_crawl_days: int = 30


class ReindexResponseSchema(Schema):
    """Response schema for reindex endpoint."""
    status: str
    message: str
    job_id: Optional[str] = None
    app_count: Optional[int] = None


class ReindexStatusSchema(Schema):
    """Response schema for reindex status."""
    job_id: str
    status: str
    progress: int
    total: int
    processed: int
    errors: int
    message: str


# In-memory job tracking (for simplicity - could use Redis/Celery for production)
_reindex_jobs = {}


def _run_reindex_job(job_id: str, options: dict):
    """
    Background task to run reindexing.
    Updates _reindex_jobs with progress.
    """
    try:
        _reindex_jobs[job_id]['status'] = 'running'
        _reindex_jobs[job_id]['message'] = 'Reindexing in progress...'

        app_id = options.get('app_id')
        crawl_enabled = options.get('crawl', False)
        refresh_crawl = options.get('refresh_crawl', False)
        quick_mode = options.get('quick', False)
        batch_size = options.get('batch_size', 10)
        stale_days = options.get('stale_crawl_days', 30)

        if quick_mode:
            crawl_enabled = False

        search_service = AISearchService()
        if not search_service.provider:
            _reindex_jobs[job_id]['status'] = 'failed'
            _reindex_jobs[job_id]['message'] = 'AI Search Provider not initialized'
            return

        # Get apps to process
        if app_id:
            apps = App.objects.filter(id=app_id)
        else:
            apps = App.objects.all().select_related('developer').prefetch_related('categories')

        apps = apps.order_by('id')
        total = apps.count()

        _reindex_jobs[job_id]['total'] = total

        processed = 0
        errors = 0
        crawl_count = 0

        for i, app in enumerate(apps):
            try:
                # Check if we should crawl
                should_crawl = crawl_enabled
                if crawl_enabled and not refresh_crawl:
                    if app.crawled_content and app.crawled_at:
                        cache_age = timezone.now() - app.crawled_at
                        if cache_age < timedelta(days=stale_days):
                            should_crawl = False

                if should_crawl:
                    crawl_count += 1

                # Prepare text
                text = search_service.prepare_app_text(
                    app,
                    crawl_links=should_crawl,
                    use_cached_crawl=not refresh_crawl,
                    include_full_descriptions=not quick_mode
                )

                # Generate embedding
                embedding = search_service.get_embedding(text)

                if embedding:
                    app.embedding = embedding
                    app.save(update_fields=['embedding'])
                    processed += 1
                else:
                    errors += 1

                # Update progress
                _reindex_jobs[job_id]['processed'] = processed
                _reindex_jobs[job_id]['errors'] = errors
                _reindex_jobs[job_id]['progress'] = int((i + 1) / total * 100)
                _reindex_jobs[job_id]['message'] = f'Processing {i + 1}/{total}: {app.name_en}'

                # Rate limiting
                time.sleep(0.5)

                if (i + 1) % batch_size == 0:
                    time.sleep(2)

            except Exception as e:
                errors += 1
                logger.error(f"Error processing {app.name_en}: {e}", exc_info=True)
                _reindex_jobs[job_id]['errors'] = errors

        _reindex_jobs[job_id]['status'] = 'completed'
        _reindex_jobs[job_id]['progress'] = 100
        _reindex_jobs[job_id]['message'] = f'Completed! Processed: {processed}, Errors: {errors}, Crawled: {crawl_count}'

    except Exception as e:
        logger.error(f"Reindex job {job_id} failed: {e}", exc_info=True)
        _reindex_jobs[job_id]['status'] = 'failed'
        _reindex_jobs[job_id]['message'] = str(e)


@router.post("/reindex/", response=ReindexResponseSchema, auth=admin_auth)
def trigger_reindex(request, payload: ReindexRequestSchema):
    """
    Trigger reindexing of app embeddings.

    Runs in background thread and returns job ID for status tracking.

    Options:
    - app_id: Reindex single app by ID (optional)
    - crawl: Enable crawling external store links (default: false)
    - refresh_crawl: Force re-crawl even if cached (default: false)
    - quick: Quick mode - skip external content (default: false)
    - batch_size: Apps per batch before pause (default: 10)
    - stale_crawl_days: Re-crawl if cache older than N days (default: 30)
    """
    import uuid

    job_id = str(uuid.uuid4())[:8]

    # Get app count
    if payload.app_id:
        app_count = App.objects.filter(id=payload.app_id).count()
        if app_count == 0:
            return {
                'status': 'error',
                'message': f'App with ID {payload.app_id} not found',
                'job_id': None,
                'app_count': 0
            }
    else:
        app_count = App.objects.count()

    # Initialize job tracking
    _reindex_jobs[job_id] = {
        'status': 'pending',
        'progress': 0,
        'total': app_count,
        'processed': 0,
        'errors': 0,
        'message': 'Starting reindex...'
    }

    # Start background thread
    options = payload.dict()
    thread = threading.Thread(
        target=_run_reindex_job,
        args=(job_id, options),
        daemon=True
    )
    thread.start()

    return {
        'status': 'started',
        'message': f'Reindex job started. Track progress at /api/admin/reindex/{job_id}/',
        'job_id': job_id,
        'app_count': app_count
    }


@router.get("/reindex/{job_id}/", response=ReindexStatusSchema, auth=admin_auth)
def get_reindex_status(request, job_id: str):
    """
    Get status of a reindex job.
    """
    if job_id not in _reindex_jobs:
        return {
            'job_id': job_id,
            'status': 'not_found',
            'progress': 0,
            'total': 0,
            'processed': 0,
            'errors': 0,
            'message': 'Job not found'
        }

    job = _reindex_jobs[job_id]
    return {
        'job_id': job_id,
        'status': job['status'],
        'progress': job['progress'],
        'total': job['total'],
        'processed': job['processed'],
        'errors': job['errors'],
        'message': job['message']
    }
