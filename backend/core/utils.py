from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """Custom exception handler that always returns JSON."""
    response = exception_handler(exc, context)

    if response is None:
        logger.exception('Unhandled exception in view', exc_info=exc)
        return Response(
            {'error': 'An unexpected error occurred. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Normalise error format
    if not isinstance(response.data, dict):
        response.data = {'error': response.data}
    elif 'detail' in response.data:
        response.data = {'error': str(response.data['detail'])}

    return response
