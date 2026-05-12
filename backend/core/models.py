from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
import uuid


class UserManager(BaseUserManager):
    def create_user(self, email, name='', **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, name=name, **extra_fields)
        user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user


class User(AbstractBaseUser, PermissionsMixin):
    """Custom user model — identity comes from OAuth providers."""
    PROVIDER_GOOGLE = 'google'
    PROVIDER_GITHUB = 'github'
    PROVIDER_CHOICES = [
        (PROVIDER_GOOGLE, 'Google'),
        (PROVIDER_GITHUB, 'GitHub'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255, blank=True)
    avatar_url = models.URLField(blank=True)
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, blank=True)
    provider_user_id = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['provider', 'provider_user_id'], name='idx_user_provider'),
        ]

    def __str__(self):
        return self.email


class Workspace(models.Model):
    """Represents a tenant (an organization / team)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=200)
    owner = models.ForeignKey(
        User,
        related_name='owned_workspaces',
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workspaces'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name)
            slug = base_slug
            n = 1
            while Workspace.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base_slug}-{n}'
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class WorkspaceMembership(models.Model):
    """Many-to-many junction between Users and Workspaces, with a role."""
    ROLE_ADMIN = 'admin'
    ROLE_EDITOR = 'editor'
    ROLE_VIEWER = 'viewer'
    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Admin'),
        (ROLE_EDITOR, 'Editor'),
        (ROLE_VIEWER, 'Viewer'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_VIEWER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workspace_memberships'
        unique_together = [('user', 'workspace')]
        indexes = [
            models.Index(fields=['workspace', 'user'], name='idx_membership_workspace_user'),
        ]

    def __str__(self):
        return f'{self.user.email} → {self.workspace.name} ({self.role})'


class Event(models.Model):
    """Raw analytics event belonging to a workspace."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='events')
    event_name = models.CharField(max_length=100, db_index=True)
    payload = models.JSONField(default=dict)
    # Visitor identity — anonymous session/fingerprint string
    visitor_id = models.CharField(max_length=255, blank=True, db_index=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = 'events'
        indexes = [
            models.Index(fields=['workspace', 'created_at'], name='idx_event_workspace_time'),
            models.Index(fields=['workspace', 'event_name'], name='idx_event_workspace_name'),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.event_name} @ {self.workspace.name}'


class OAuthConnection(models.Model):
    """Stores encrypted OAuth tokens for a user + provider combination."""
    PROVIDER_GOOGLE = 'google'
    PROVIDER_GITHUB = 'github'
    PROVIDER_CHOICES = [
        (PROVIDER_GOOGLE, 'Google'),
        (PROVIDER_GITHUB, 'GitHub'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='oauth_connections')
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES)
    access_token = models.TextField()   # encrypted at application level
    refresh_token = models.TextField(blank=True)  # encrypted
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'oauth_connections'
        unique_together = [('user', 'provider')]

    def __str__(self):
        return f'{self.user.email} [{self.provider}]'
