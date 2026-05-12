from rest_framework import serializers
from .models import User, Workspace, WorkspaceMembership, Event


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'avatar_url', 'provider', 'date_joined']
        read_only_fields = fields


class WorkspaceMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = WorkspaceMembership
        fields = ['user', 'role', 'joined_at']


class WorkspaceSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    member_count = serializers.SerializerMethodField()
    current_user_role = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = ['id', 'name', 'slug', 'owner', 'member_count', 'current_user_role', 'created_at']
        read_only_fields = ['id', 'slug', 'owner', 'member_count', 'current_user_role', 'created_at']

    def get_member_count(self, obj):
        return obj.memberships.count()

    def get_current_user_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        membership = obj.memberships.filter(user=request.user).first()
        return membership.role if membership else None


class WorkspaceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ['name']


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'event_name', 'payload', 'visitor_id', 'created_at']
        read_only_fields = ['id', 'created_at']


class EventIngestSerializer(serializers.Serializer):
    """Thin serializer for ingesting a single event."""
    event = serializers.CharField(max_length=100)
    payload = serializers.DictField(required=False, default=dict)
    visitor_id = serializers.CharField(max_length=255, required=False, default='')
