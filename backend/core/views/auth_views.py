"""
OAuth2 Authentication Views
- Google OAuth2
- GitHub OAuth2
- Current User (me)
- Logout
"""
import logging
import requests as http_requests
from base64 import b64encode, b64decode

from django.conf import settings
from django.contrib.auth import login, logout
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import User, OAuthConnection
from core.serializers import UserSerializer

logger = logging.getLogger(__name__)


# ─── Token Encryption Helpers ─────────────────────────────────────────────────

def _get_fernet():
    """Return a Fernet instance if TOKEN_ENCRYPTION_KEY is configured."""
    key = settings.TOKEN_ENCRYPTION_KEY
    if not key:
        return None
    try:
        from cryptography.fernet import Fernet
        return Fernet(key.encode() if isinstance(key, str) else key)
    except Exception:
        return None


def encrypt_token(token: str) -> str:
    f = _get_fernet()
    if f is None:
        return token  # No key configured — store plain (dev mode)
    return f.encrypt(token.encode()).decode()


def decrypt_token(token: str) -> str:
    f = _get_fernet()
    if f is None:
        return token
    try:
        return f.decrypt(token.encode()).decode()
    except Exception:
        return token


# ─── OAuth Helpers ─────────────────────────────────────────────────────────────

def _upsert_user_and_login(request, email, name, avatar_url, provider, provider_user_id,
                            access_token, refresh_token, expires_at):
    """Create or update a User and OAuthConnection, then log them in."""
    user, _ = User.objects.get_or_create(
        email=email,
        defaults={
            'name': name,
            'avatar_url': avatar_url,
            'provider': provider,
            'provider_user_id': provider_user_id,
        },
    )
    # Update profile fields in case they changed
    updated = False
    if user.name != name:
        user.name = name
        updated = True
    if user.avatar_url != avatar_url:
        user.avatar_url = avatar_url
        updated = True
    if not user.provider:
        user.provider = provider
        user.provider_user_id = provider_user_id
        updated = True
    if updated:
        user.save(update_fields=['name', 'avatar_url', 'provider', 'provider_user_id'])

    # Upsert OAuth connection
    OAuthConnection.objects.update_or_create(
        user=user,
        provider=provider,
        defaults={
            'access_token': encrypt_token(access_token),
            'refresh_token': encrypt_token(refresh_token) if refresh_token else '',
            'expires_at': expires_at,
        },
    )

    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    return user


# ─── Google OAuth ──────────────────────────────────────────────────────────────

class GoogleAuthView(APIView):
    """
    POST /api/auth/google/
    Body: { "code": "<authorization_code>" }
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'error': 'Authorization code is required.'}, status=400)

        # 1. Exchange code for tokens
        token_resp = http_requests.post(
            'https://oauth2.googleapis.com/token',
            data={
                'code': code,
                'client_id': settings.GOOGLE_CLIENT_ID,
                'client_secret': settings.GOOGLE_CLIENT_SECRET,
                'redirect_uri': settings.GOOGLE_REDIRECT_URI,
                'grant_type': 'authorization_code',
            },
            timeout=10,
        )
        if token_resp.status_code != 200:
            logger.warning('Google token exchange failed: %s', token_resp.text)
            return Response({'error': 'Failed to exchange authorization code with Google.'}, status=400)

        token_data = token_resp.json()
        access_token = token_data.get('access_token')
        refresh_token = token_data.get('refresh_token', '')
        expires_in = token_data.get('expires_in', 3600)
        expires_at = timezone.now() + timezone.timedelta(seconds=expires_in)

        # 2. Fetch user info
        userinfo_resp = http_requests.get(
            'https://www.googleapis.com/oauth2/v3/userinfo',
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=10,
        )
        if userinfo_resp.status_code != 200:
            return Response({'error': 'Failed to fetch user info from Google.'}, status=400)

        userinfo = userinfo_resp.json()
        email = userinfo.get('email')
        if not email:
            return Response({'error': 'Could not retrieve email from Google account.'}, status=400)

        user = _upsert_user_and_login(
            request,
            email=email,
            name=userinfo.get('name', ''),
            avatar_url=userinfo.get('picture', ''),
            provider=User.PROVIDER_GOOGLE,
            provider_user_id=userinfo.get('sub', ''),
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
        )
        return Response(UserSerializer(user).data, status=200)


# ─── GitHub OAuth ──────────────────────────────────────────────────────────────

class GitHubAuthView(APIView):
    """
    POST /api/auth/github/
    Body: { "code": "<authorization_code>" }
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'error': 'Authorization code is required.'}, status=400)

        # 1. Exchange code for access token
        token_resp = http_requests.post(
            'https://github.com/login/oauth/access_token',
            headers={'Accept': 'application/json'},
            data={
                'client_id': settings.GITHUB_CLIENT_ID,
                'client_secret': settings.GITHUB_CLIENT_SECRET,
                'code': code,
                'redirect_uri': settings.GITHUB_REDIRECT_URI,
            },
            timeout=10,
        )
        if token_resp.status_code != 200:
            logger.warning('GitHub token exchange failed: %s', token_resp.text)
            return Response({'error': 'Failed to exchange authorization code with GitHub.'}, status=400)

        token_data = token_resp.json()
        if 'error' in token_data:
            return Response({'error': token_data.get('error_description', 'GitHub OAuth error.')}, status=400)

        access_token = token_data.get('access_token')
        # GitHub doesn't always return refresh tokens in basic OAuth
        refresh_token = token_data.get('refresh_token', '')

        # 2. Fetch user profile
        user_resp = http_requests.get(
            'https://api.github.com/user',
            headers={
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/vnd.github+json',
            },
            timeout=10,
        )
        if user_resp.status_code != 200:
            return Response({'error': 'Failed to fetch user info from GitHub.'}, status=400)

        gh_user = user_resp.json()

        # 3. Fetch primary email (may not be public on profile)
        email = gh_user.get('email')
        if not email:
            emails_resp = http_requests.get(
                'https://api.github.com/user/emails',
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Accept': 'application/vnd.github+json',
                },
                timeout=10,
            )
            if emails_resp.status_code == 200:
                emails = emails_resp.json()
                primary = next((e for e in emails if e.get('primary') and e.get('verified')), None)
                email = primary['email'] if primary else (emails[0]['email'] if emails else None)

        if not email:
            return Response({'error': 'Could not retrieve email from GitHub account.'}, status=400)

        user = _upsert_user_and_login(
            request,
            email=email,
            name=gh_user.get('name') or gh_user.get('login', ''),
            avatar_url=gh_user.get('avatar_url', ''),
            provider=User.PROVIDER_GITHUB,
            provider_user_id=str(gh_user.get('id', '')),
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=None,
        )
        return Response(UserSerializer(user).data, status=200)


# ─── Current User ──────────────────────────────────────────────────────────────

class MeView(APIView):
    """GET /api/auth/me/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


# ─── Logout ────────────────────────────────────────────────────────────────────

class LogoutView(APIView):
    """POST /api/auth/logout/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        response = Response({'message': 'Logged out successfully.'}, status=200)
        response.delete_cookie('sessionid')
        return response


# ─── CSRF Token ───────────────────────────────────────────────────────────────

class CSRFView(APIView):
    """GET /api/auth/csrf/ — Returns a CSRF cookie for the SPA."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        from django.middleware.csrf import get_token
        token = get_token(request)
        return Response({'csrfToken': token})
