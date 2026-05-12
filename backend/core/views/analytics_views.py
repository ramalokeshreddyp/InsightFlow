"""
Analytics views with Redis caching and multi-tenant isolation.
- POST  /api/w/<slug>/events/
- GET   /api/w/<slug>/dashboard/summary/
- GET   /api/w/<slug>/dashboard/timeseries/
"""
import logging
from datetime import timedelta

from django.core.cache import cache
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Event, Workspace
from core.permissions import IsWorkspaceMember
from core.serializers import EventIngestSerializer, EventSerializer

logger = logging.getLogger(__name__)

CACHE_TTL = 60 * 15  # 15 minutes


def _workspace_cache_key(workspace_id: str, suffix: str) -> str:
    return f'workspaces:{workspace_id}:{suffix}'


class EventIngestView(APIView):
    """
    POST /api/w/<workspace_slug>/events/
    Body: { "event": "page_view", "payload": {"page": "/pricing"}, "visitor_id": "abc" }
    """
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    def post(self, request, workspace_slug):
        workspace = get_object_or_404(Workspace, slug=workspace_slug)
        serializer = EventIngestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        event = Event.objects.create(
            workspace=workspace,
            event_name=serializer.validated_data['event'],
            payload=serializer.validated_data['payload'],
            visitor_id=serializer.validated_data['visitor_id'],
        )

        # Invalidate cached summary so fresh data is shown
        cache.delete(_workspace_cache_key(str(workspace.id), 'dashboard_summary'))
        cache.delete(_workspace_cache_key(str(workspace.id), 'dashboard_timeseries_7d'))
        cache.delete(_workspace_cache_key(str(workspace.id), 'dashboard_timeseries_30d'))
        cache.delete(_workspace_cache_key(str(workspace.id), 'dashboard_timeseries_90d'))

        return Response(EventSerializer(event).data, status=201)


class DashboardSummaryView(APIView):
    """
    GET /api/w/<workspace_slug>/dashboard/summary/
    Returns aggregated KPI metrics. Cached in Redis for 15 minutes.
    """
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    def get(self, request, workspace_slug):
        workspace = get_object_or_404(Workspace, slug=workspace_slug)
        cache_key = _workspace_cache_key(str(workspace.id), 'dashboard_summary')

        cached = cache.get(cache_key)
        if cached is not None:
            logger.info('Cache HIT for %s', cache_key)
            return Response(cached)

        logger.info('Cache MISS for %s — computing summary', cache_key)
        data = self._compute_summary(workspace)
        cache.set(cache_key, data, timeout=CACHE_TTL)
        return Response(data)

    def _compute_summary(self, workspace):
        qs = Event.objects.filter(workspace=workspace)

        total_events = qs.count()
        unique_visitors = qs.exclude(visitor_id='').values('visitor_id').distinct().count()

        page_views = qs.filter(event_name='page_view').count()
        custom_events = qs.exclude(event_name='page_view').count()

        # Top pages by view count (payload->page field)
        top_pages = list(
            qs.filter(event_name='page_view')
            .values('payload__page')
            .annotate(view_count=Count('id'))
            .order_by('-view_count')[:10]
        )

        # Top event names
        top_events = list(
            qs.values('event_name')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        # Last 7 days total
        seven_days_ago = timezone.now() - timedelta(days=7)
        events_last_7d = qs.filter(created_at__gte=seven_days_ago).count()

        # Member count
        member_count = workspace.memberships.count()

        return {
            'total_events': total_events,
            'unique_visitors': unique_visitors,
            'page_views': page_views,
            'custom_events': custom_events,
            'events_last_7d': events_last_7d,
            'top_pages': [
                {'page': row.get('payload__page') or '(unknown)', 'count': row['view_count']}
                for row in top_pages
            ],
            'top_events': [
                {'event': row['event_name'], 'count': row['count']}
                for row in top_events
            ],
            'member_count': member_count,
            'workspace': {
                'id': str(workspace.id),
                'name': workspace.name,
                'slug': workspace.slug,
            },
        }


class DashboardTimeSeriesView(APIView):
    """
    GET /api/w/<workspace_slug>/dashboard/timeseries/?period=7d
    Returns daily event counts. Supported periods: 7d, 30d, 90d.
    Cached in Redis.
    """
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    PERIOD_MAP = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
    }

    def get(self, request, workspace_slug):
        period = request.query_params.get('period', '7d')
        days = self.PERIOD_MAP.get(period, 7)

        workspace = get_object_or_404(Workspace, slug=workspace_slug)
        cache_key = _workspace_cache_key(str(workspace.id), f'dashboard_timeseries_{period}')

        cached = cache.get(cache_key)
        if cached is not None:
            logger.info('Cache HIT for %s', cache_key)
            return Response(cached)

        data = self._compute_timeseries(workspace, days)
        cache.set(cache_key, data, timeout=CACHE_TTL)
        return Response(data)

    def _compute_timeseries(self, workspace, days):
        since = timezone.now() - timedelta(days=days)

        # Aggregate by day
        qs = (
            Event.objects
            .filter(workspace=workspace, created_at__gte=since)
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )

        # Build a complete day-by-day map (fill missing days with 0)
        results_map = {str(row['date']): row['count'] for row in qs}
        today = timezone.now().date()
        output = []
        for i in range(days):
            day = today - timedelta(days=days - 1 - i)
            day_str = str(day)
            output.append({'date': day_str, 'count': results_map.get(day_str, 0)})

        return output
