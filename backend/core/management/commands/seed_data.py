"""
Management command: python manage.py seed_data
Seeds the database with demo users, workspaces, and analytics events.
"""
import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify

from core.models import User, Workspace, WorkspaceMembership, Event


PAGES = ['/home', '/pricing', '/about', '/blog', '/contact', '/docs', '/features', '/login', '/signup']
EVENT_NAMES = ['page_view', 'button_click', 'form_submit', 'video_play', 'download', 'sign_up']


class Command(BaseCommand):
    help = 'Seeds the database with sample analytics data for demonstration.'

    def add_arguments(self, parser):
        parser.add_argument('--events', type=int, default=500, help='Number of events to create')

    def handle(self, *args, **options):
        n_events = options['events']
        self.stdout.write(self.style.MIGRATE_HEADING('🌱 Seeding InsightFlow demo data...'))

        # ── Users ─────────────────────────────────────────────────────────────
        demo_user, created = User.objects.get_or_create(
            email='demo@insightflow.io',
            defaults={
                'name': 'Demo User',
                'avatar_url': 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
                'provider': 'google',
                'provider_user_id': 'demo-google-id',
            },
        )
        if created:
            self.stdout.write(f'  ✔ Created user: {demo_user.email}')
        else:
            self.stdout.write(f'  · User already exists: {demo_user.email}')

        # ── Workspaces ────────────────────────────────────────────────────────
        workspaces_data = [
            ('Acme Inc.', 'acme-inc'),
            ('InsightFlow Demo', 'insightflow-demo'),
        ]
        workspaces = []
        for name, slug in workspaces_data:
            ws, ws_created = Workspace.objects.get_or_create(
                slug=slug,
                defaults={'name': name, 'owner': demo_user},
            )
            workspaces.append(ws)
            if ws_created:
                WorkspaceMembership.objects.get_or_create(
                    user=demo_user, workspace=ws,
                    defaults={'role': WorkspaceMembership.ROLE_ADMIN},
                )
                self.stdout.write(f'  ✔ Created workspace: {ws.name}')
            else:
                self.stdout.write(f'  · Workspace already exists: {ws.name}')
                WorkspaceMembership.objects.get_or_create(
                    user=demo_user, workspace=ws,
                    defaults={'role': WorkspaceMembership.ROLE_ADMIN},
                )

        # ── Events ────────────────────────────────────────────────────────────
        visitor_ids = [f'visitor-{i:04d}' for i in range(1, 51)]
        events_to_create = []
        now = timezone.now()

        for ws in workspaces:
            existing_count = Event.objects.filter(workspace=ws).count()
            if existing_count >= n_events:
                self.stdout.write(f'  · Events already seeded for {ws.name}')
                continue

            for _ in range(n_events - existing_count):
                event_name = random.choices(EVENT_NAMES, weights=[60, 15, 10, 5, 5, 5])[0]
                page = random.choice(PAGES)
                days_ago = random.uniform(0, 90)
                events_to_create.append(Event(
                    workspace=ws,
                    event_name=event_name,
                    payload={'page': page, 'referrer': random.choice(['google', 'direct', 'twitter', None])},
                    visitor_id=random.choice(visitor_ids),
                    created_at=now - timedelta(days=days_ago),
                ))

        if events_to_create:
            Event.objects.bulk_create(events_to_create, batch_size=200)
            self.stdout.write(f'  ✔ Created {len(events_to_create)} events')

        self.stdout.write(self.style.SUCCESS('\n✅ Demo data seeded successfully!'))
        self.stdout.write('   Login email: demo@insightflow.io  (OAuth — use "dev login" button in UI)')
