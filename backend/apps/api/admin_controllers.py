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


# --- R2 Sync for Cloudflare AI Search ---

class SyncR2RequestSchema(Schema):
    """Request schema for R2 sync endpoint."""
    app_id: Optional[int] = None


class SyncR2ResponseSchema(Schema):
    """Response schema for R2 sync endpoint."""
    status: str
    message: str
    synced: int = 0
    errors: int = 0


@router.post("/sync-r2/", response=SyncR2ResponseSchema, auth=admin_auth)
def sync_apps_to_r2(request, payload: SyncR2RequestSchema = None):
    """
    Sync apps to Cloudflare R2 for AI Search indexing.

    This exports app data (including crawled content) as JSON files
    to the R2 bucket, which CF AI Search will automatically index.

    Options:
    - app_id: Sync single app by ID (optional, syncs all if not provided)
    """
    import json
    import boto3
    from botocore.config import Config

    # Check R2 configuration
    r2_account_id = getattr(settings, 'R2_ACCOUNT_ID', '')
    r2_access_key = getattr(settings, 'R2_ACCESS_KEY_ID', '')
    r2_secret_key = getattr(settings, 'R2_SECRET_ACCESS_KEY', '')
    r2_bucket = getattr(settings, 'R2_BUCKET_NAME', 'quran-apps-directory')

    if not all([r2_account_id, r2_access_key, r2_secret_key]):
        return {
            'status': 'error',
            'message': 'R2 credentials not configured',
            'synced': 0,
            'errors': 0
        }

    try:
        # Initialize S3 client for R2
        s3_client = boto3.client(
            's3',
            endpoint_url=f'https://{r2_account_id}.r2.cloudflarestorage.com',
            aws_access_key_id=r2_access_key,
            aws_secret_access_key=r2_secret_key,
            config=Config(signature_version='s3v4'),
            region_name='auto'
        )
    except Exception as e:
        logger.error(f"Failed to initialize R2 client: {e}")
        return {
            'status': 'error',
            'message': f'Failed to initialize R2 client: {str(e)}',
            'synced': 0,
            'errors': 0
        }

    # Get apps to sync
    apps_qs = App.objects.filter(status='published').select_related('developer').prefetch_related('categories')

    if payload and payload.app_id:
        apps_qs = apps_qs.filter(id=payload.app_id)

    apps = list(apps_qs)

    if not apps:
        return {
            'status': 'warning',
            'message': 'No apps found to sync',
            'synced': 0,
            'errors': 0
        }

    synced = 0
    errors = 0

    for app in apps:
        try:
            # Build JSON document for AI Search
            app_json = _build_app_document(app)
            json_content = json.dumps(app_json, ensure_ascii=False, indent=2)

            # Upload path: apps/{app_id}.json
            key = f'apps/{app.id}.json'

            s3_client.put_object(
                Bucket=r2_bucket,
                Key=key,
                Body=json_content.encode('utf-8'),
                ContentType='application/json'
            )

            synced += 1
            logger.info(f"Synced app {app.id} ({app.name_en}) to R2")

        except Exception as e:
            errors += 1
            logger.error(f"Error syncing app {app.id}: {e}")

    return {
        'status': 'success' if errors == 0 else 'partial',
        'message': f'Synced {synced} apps to R2' + (f', {errors} errors' if errors else ''),
        'synced': synced,
        'errors': errors
    }


def _build_app_document(app: App) -> dict:
    """Build a searchable JSON document for an app."""
    categories = list(app.categories.values_list('name_en', flat=True))
    categories_ar = list(app.categories.values_list('name_ar', flat=True))

    # Get crawled data from AppCrawledData table
    crawled_texts = []
    try:
        from apps.models import AppCrawledData
        crawled_data = AppCrawledData.objects.filter(app=app, status='success')
        for cd in crawled_data:
            if cd.content:
                crawled_texts.append(f"[{cd.get_source_display()}]: {cd.content}")
    except Exception as e:
        logger.warning(f"Could not fetch crawled data for app {app.id}: {e}")

    # Combine all crawled content
    all_crawled_content = '\n\n'.join(crawled_texts) if crawled_texts else (app.crawled_content or '')

    return {
        'id': app.id,
        'slug': app.slug,
        'name_en': app.name_en,
        'name_ar': app.name_ar,
        'short_description_en': app.short_description_en,
        'short_description_ar': app.short_description_ar,
        'description_en': app.description_en,
        'description_ar': app.description_ar,
        'developer_name_en': app.developer.name_en if app.developer else '',
        'developer_name_ar': app.developer.name_ar if app.developer else '',
        'categories_en': categories,
        'categories_ar': categories_ar,
        'platform': app.platform,
        'avg_rating': float(app.avg_rating),
        'featured': app.featured,
        'application_icon': app.application_icon or '',
        'google_play_link': app.google_play_link or '',
        'app_store_link': app.app_store_link or '',
        'app_gallery_link': app.app_gallery_link or '',
        'crawled_content': all_crawled_content,
        # Combined searchable text for better relevance
        'searchable_text': _build_searchable_text(app, categories, categories_ar, all_crawled_content),
    }


def _build_searchable_text(app: App, categories_en: list, categories_ar: list, crawled_content: str) -> str:
    """Build combined text for search indexing."""
    parts = [
        app.name_en,
        app.name_ar,
        app.short_description_en,
        app.short_description_ar,
        app.description_en,
        app.description_ar,
        app.developer.name_en if app.developer else '',
        app.developer.name_ar if app.developer else '',
        ' '.join(categories_en),
        ' '.join(categories_ar),
    ]

    if crawled_content:
        parts.append(crawled_content)

    return ' '.join(filter(None, parts))
