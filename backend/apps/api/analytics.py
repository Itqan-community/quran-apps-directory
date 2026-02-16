"""
Analytics API endpoints for app view metrics.

Provides time-series view analytics with breakdowns by device, country, and referrer.
"""

from datetime import datetime, timedelta
from typing import List, Optional, Literal

from django.db.models import Count, F
from django.db.models.functions import TruncHour, TruncDay, TruncWeek, TruncMonth
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router, Query
from pydantic import BaseModel, Field

from ..models import App, AppViewEvent


# Period type for dashboard summary
PeriodType = Literal["today", "7d", "30d", "90d", "all"]


router = Router(tags=["Analytics"])


# Response schemas
class TimeSeriesItem(BaseModel):
    """Single time series data point."""
    date: str
    count: int


class DeviceBreakdownItem(BaseModel):
    """Device type breakdown item."""
    device_type: str
    count: int
    percentage: float


class CountryBreakdownItem(BaseModel):
    """Country breakdown item."""
    country_code: Optional[str]
    count: int
    percentage: float


class ReferrerItem(BaseModel):
    """Top referrer item."""
    referrer: Optional[str]
    count: int


class AnalyticsResponse(BaseModel):
    """Analytics endpoint response schema."""
    app_id: str
    app_name: str
    total_views: int
    unique_sessions: int
    date_start: str
    date_end: str
    time_series: List[TimeSeriesItem]
    device_breakdown: List[DeviceBreakdownItem]
    country_breakdown: List[CountryBreakdownItem]
    top_referrers: List[ReferrerItem]


class TopAppItem(BaseModel):
    """Top app item for dashboard summary."""
    app_id: str
    app_slug: str
    app_name_en: str
    app_name_ar: str
    view_count: int
    unique_sessions: int


class DashboardSummaryResponse(BaseModel):
    """Dashboard summary response schema."""
    total_views: int
    total_unique_sessions: int
    total_apps: int
    period: str
    date_start: str
    date_end: str
    top_apps: List[TopAppItem]
    device_breakdown: List[DeviceBreakdownItem]
    country_breakdown: List[CountryBreakdownItem]
    time_series: List[TimeSeriesItem]


@router.get("/{app_id}/analytics", response=AnalyticsResponse)
def get_app_analytics(
    request,
    app_id: str,
    date_start: Optional[str] = Query(None, description="Start date (ISO format, default: 30 days ago)"),
    date_end: Optional[str] = Query(None, description="End date (ISO format, default: today)"),
    group_by: Literal["hour", "day", "week", "month"] = Query("day", description="Time series grouping"),
):
    """
    Get analytics for an app's view events.

    Returns time-series data, device breakdown, country breakdown, and top referrers.

    Args:
        app_id: App ID or slug
        date_start: Start date for analytics (ISO format, default: 30 days ago)
        date_end: End date for analytics (ISO format, default: today)
        group_by: Grouping for time series (hour, day, week, month)

    Returns:
        AnalyticsResponse with comprehensive view analytics
    """
    # Get app by ID or slug
    try:
        app_obj = App.objects.get(id=app_id)
    except (App.DoesNotExist, ValueError):
        app_obj = get_object_or_404(App, slug=app_id)

    # Parse date range (use timezone-aware datetimes)
    now = timezone.now()
    if date_end:
        try:
            end_date = datetime.fromisoformat(date_end.replace('Z', '+00:00'))
            if timezone.is_naive(end_date):
                end_date = timezone.make_aware(end_date)
        except ValueError:
            end_date = datetime.strptime(date_end, "%Y-%m-%d")
            end_date = timezone.make_aware(end_date)
        end_date = end_date.replace(hour=23, minute=59, second=59)
    else:
        end_date = now.replace(hour=23, minute=59, second=59)

    if date_start:
        try:
            start_date = datetime.fromisoformat(date_start.replace('Z', '+00:00'))
            if timezone.is_naive(start_date):
                start_date = timezone.make_aware(start_date)
        except ValueError:
            start_date = datetime.strptime(date_start, "%Y-%m-%d")
            start_date = timezone.make_aware(start_date)
        start_date = start_date.replace(hour=0, minute=0, second=0)
    else:
        start_date = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0)

    # Base queryset filtered by date range
    events = AppViewEvent.objects.filter(
        app=app_obj,
        viewed_at__gte=start_date,
        viewed_at__lte=end_date,
    )

    # Total views
    total_views = events.count()

    # Unique sessions (excluding null session_ids)
    unique_sessions = events.exclude(
        session_id__isnull=True
    ).exclude(
        session_id=''
    ).values('session_id').distinct().count()

    # Time series aggregation
    trunc_func = {
        "hour": TruncHour,
        "day": TruncDay,
        "week": TruncWeek,
        "month": TruncMonth,
    }[group_by]

    time_series_data = (
        events
        .annotate(period=trunc_func('viewed_at'))
        .values('period')
        .annotate(count=Count('id'))
        .order_by('period')
    )

    time_series = [
        TimeSeriesItem(
            date=item['period'].isoformat() if item['period'] else '',
            count=item['count']
        )
        for item in time_series_data
        if item['period']
    ]

    # Device breakdown
    device_data = (
        events
        .values('device_type')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    device_breakdown = [
        DeviceBreakdownItem(
            device_type=item['device_type'] or 'unknown',
            count=item['count'],
            percentage=round((item['count'] / total_views * 100), 1) if total_views > 0 else 0
        )
        for item in device_data
    ]

    # Country breakdown (top 10)
    country_data = (
        events
        .values('country_code')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    country_breakdown = [
        CountryBreakdownItem(
            country_code=item['country_code'],
            count=item['count'],
            percentage=round((item['count'] / total_views * 100), 1) if total_views > 0 else 0
        )
        for item in country_data
    ]

    # Top referrers (top 10, excluding null/empty)
    referrer_data = (
        events
        .exclude(referrer__isnull=True)
        .exclude(referrer='')
        .values('referrer')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    top_referrers = [
        ReferrerItem(
            referrer=item['referrer'],
            count=item['count']
        )
        for item in referrer_data
    ]

    return AnalyticsResponse(
        app_id=str(app_obj.id),
        app_name=app_obj.name_en,
        total_views=total_views,
        unique_sessions=unique_sessions,
        date_start=start_date.strftime("%Y-%m-%d"),
        date_end=end_date.strftime("%Y-%m-%d"),
        time_series=time_series,
        device_breakdown=device_breakdown,
        country_breakdown=country_breakdown,
        top_referrers=top_referrers,
    )


def resolve_date_range(
    period: Optional[PeriodType],
    date_start: Optional[str],
    date_end: Optional[str]
) -> tuple[datetime, datetime, str]:
    """
    Resolve date range from period preset or custom dates.

    Custom dates take precedence over period presets.

    Returns:
        Tuple of (start_date, end_date, period_label)
    """
    now = timezone.now()

    # Custom dates override period
    if date_start or date_end:
        if date_end:
            try:
                end_dt = datetime.fromisoformat(date_end.replace('Z', '+00:00'))
                if timezone.is_naive(end_dt):
                    end_dt = timezone.make_aware(end_dt)
            except ValueError:
                end_dt = datetime.strptime(date_end, "%Y-%m-%d")
                end_dt = timezone.make_aware(end_dt)
            end_dt = end_dt.replace(hour=23, minute=59, second=59)
        else:
            end_dt = now.replace(hour=23, minute=59, second=59)

        if date_start:
            try:
                start_dt = datetime.fromisoformat(date_start.replace('Z', '+00:00'))
                if timezone.is_naive(start_dt):
                    start_dt = timezone.make_aware(start_dt)
            except ValueError:
                start_dt = datetime.strptime(date_start, "%Y-%m-%d")
                start_dt = timezone.make_aware(start_dt)
            start_dt = start_dt.replace(hour=0, minute=0, second=0)
        else:
            start_dt = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0)

        return start_dt, end_dt, "custom"

    # Period presets
    period = period or "30d"
    end_dt = now.replace(hour=23, minute=59, second=59)

    if period == "today":
        start_dt = now.replace(hour=0, minute=0, second=0)
    elif period == "7d":
        start_dt = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0)
    elif period == "30d":
        start_dt = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0)
    elif period == "90d":
        start_dt = (now - timedelta(days=90)).replace(hour=0, minute=0, second=0)
    elif period == "all":
        # Get earliest event or fallback to 1 year ago
        earliest = AppViewEvent.objects.order_by('viewed_at').first()
        if earliest:
            start_dt = earliest.viewed_at.replace(hour=0, minute=0, second=0)
        else:
            start_dt = (now - timedelta(days=365)).replace(hour=0, minute=0, second=0)
    else:
        start_dt = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0)

    return start_dt, end_dt, period


# Create a separate router for dashboard summary (mounted at /api/analytics)
dashboard_router = Router(tags=["Analytics"])


@dashboard_router.get("/summary", response=DashboardSummaryResponse)
def get_dashboard_summary(
    request,
    period: Optional[PeriodType] = Query("30d", description="Preset period: today, 7d, 30d, 90d, all"),
    date_start: Optional[str] = Query(None, description="Custom start date (ISO format, overrides period)"),
    date_end: Optional[str] = Query(None, description="Custom end date (ISO format, overrides period)"),
    group_by: Literal["hour", "day", "week", "month"] = Query("day", description="Time series grouping"),
):
    """
    Get aggregate analytics across all apps.

    Returns dashboard summary with total views, top apps, device/country breakdowns,
    and time series data.

    Args:
        period: Preset period (today, 7d, 30d, 90d, all). Default: 30d
        date_start: Custom start date (ISO format). Overrides period.
        date_end: Custom end date (ISO format). Overrides period.
        group_by: Time series grouping (hour, day, week, month)

    Returns:
        DashboardSummaryResponse with aggregate analytics
    """
    # Resolve date range
    start_date, end_date, period_label = resolve_date_range(period, date_start, date_end)

    # Base queryset filtered by date range
    events = AppViewEvent.objects.filter(
        viewed_at__gte=start_date,
        viewed_at__lte=end_date,
    )

    # Total views
    total_views = events.count()

    # Unique sessions (excluding null session_ids)
    total_unique_sessions = events.exclude(
        session_id__isnull=True
    ).exclude(
        session_id=''
    ).values('session_id').distinct().count()

    # Total apps with views in this period
    total_apps = events.values('app').distinct().count()

    # Top apps by view count (top 10)
    top_apps_data = (
        events
        .values('app')
        .annotate(view_count=Count('id'))
        .order_by('-view_count')[:10]
    )

    top_apps = []
    for item in top_apps_data:
        app = App.objects.filter(id=item['app']).first()
        if app:
            # Count unique sessions for this app
            app_sessions = events.filter(app=app).exclude(
                session_id__isnull=True
            ).exclude(
                session_id=''
            ).values('session_id').distinct().count()

            top_apps.append(TopAppItem(
                app_id=str(app.id),
                app_slug=app.slug,
                app_name_en=app.name_en,
                app_name_ar=app.name_ar or '',
                view_count=item['view_count'],
                unique_sessions=app_sessions,
            ))

    # Time series aggregation
    trunc_func = {
        "hour": TruncHour,
        "day": TruncDay,
        "week": TruncWeek,
        "month": TruncMonth,
    }[group_by]

    time_series_data = (
        events
        .annotate(period=trunc_func('viewed_at'))
        .values('period')
        .annotate(count=Count('id'))
        .order_by('period')
    )

    time_series = [
        TimeSeriesItem(
            date=item['period'].isoformat() if item['period'] else '',
            count=item['count']
        )
        for item in time_series_data
        if item['period']
    ]

    # Device breakdown
    device_data = (
        events
        .values('device_type')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    device_breakdown = [
        DeviceBreakdownItem(
            device_type=item['device_type'] or 'unknown',
            count=item['count'],
            percentage=round((item['count'] / total_views * 100), 1) if total_views > 0 else 0
        )
        for item in device_data
    ]

    # Country breakdown (top 10)
    country_data = (
        events
        .values('country_code')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    country_breakdown = [
        CountryBreakdownItem(
            country_code=item['country_code'],
            count=item['count'],
            percentage=round((item['count'] / total_views * 100), 1) if total_views > 0 else 0
        )
        for item in country_data
    ]

    return DashboardSummaryResponse(
        total_views=total_views,
        total_unique_sessions=total_unique_sessions,
        total_apps=total_apps,
        period=period_label,
        date_start=start_date.strftime("%Y-%m-%d"),
        date_end=end_date.strftime("%Y-%m-%d"),
        top_apps=top_apps,
        device_breakdown=device_breakdown,
        country_breakdown=country_breakdown,
        time_series=time_series,
    )
