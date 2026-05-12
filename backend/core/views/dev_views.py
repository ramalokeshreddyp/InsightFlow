"""
Dev-only login endpoint — auto-logs in the seeded demo user.
Only active when DEBUG=True.
"""
from django.conf import settings
from django.contrib.auth import login
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from core.models import User
from core.serializers import UserSerializer


class DevLoginView(APIView):
    """
    POST /api/auth/dev-login/
    Only available when DEBUG=True. Logs in the demo user without OAuth.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        if not settings.DEBUG:
            return Response({'error': 'Dev login is only available in debug mode.'}, status=403)

        user = User.objects.filter(email='demo@insightflow.io').first()
        if not user:
            return Response({'error': 'Demo user not found. Run: python manage.py seed_data'}, status=404)

        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        return Response(UserSerializer(user).data)
