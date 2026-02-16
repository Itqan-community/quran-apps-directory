"""
Sentry Tunnel - Proxy Sentry requests through Django backend.

This bypasses ad blockers and CORS issues by routing Sentry
requests through our own server instead of directly to sentry.io.

Reference: https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option
"""

import json
import logging
import requests
from django.http import HttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST


logger = logging.getLogger(__name__)

# Allowed Sentry hosts (security: only proxy to official Sentry servers)
ALLOWED_SENTRY_HOSTS = [
    "sentry.io",
    "ingest.sentry.io",
    "ingest.de.sentry.io",  # EU data center
    "ingest.us.sentry.io",  # US data center
]


@csrf_exempt
@require_POST
def sentry_tunnel(request):
    """
    Tunnel endpoint that forwards Sentry events to Sentry's ingest API.

    The frontend sends Sentry envelopes here instead of directly to sentry.io,
    allowing us to bypass ad blockers and CORS restrictions.

    Security measures:
    - Only allows POST requests
    - Validates that the DSN host is an official Sentry server
    - Extracts project ID from the envelope to construct the target URL
    """
    try:
        # Get the raw envelope body
        envelope = request.body

        if not envelope:
            return HttpResponseBadRequest("Empty request body")

        # Parse the envelope header (first line contains the DSN info)
        # Envelope format: header\nitem_header\nitem_payload\n...
        try:
            header_end_index = envelope.index(b'\n')
            header = json.loads(envelope[:header_end_index])
        except (ValueError, json.JSONDecodeError) as e:
            return HttpResponseBadRequest(f"Invalid envelope header: {e}")

        # Extract DSN from header
        dsn = header.get("dsn")
        if not dsn:
            return HttpResponseBadRequest("Missing DSN in envelope header")

        # Parse DSN to extract host and project ID
        # DSN format: https://<key>@<host>/<project_id>
        try:
            # Remove protocol
            dsn_without_protocol = dsn.split("://")[1]
            # Split by @ to get host/project part
            host_and_project = dsn_without_protocol.split("@")[1]
            # Extract host and project ID
            parts = host_and_project.split("/")
            host = parts[0]
            project_id = parts[1]
        except (IndexError, ValueError) as e:
            return HttpResponseBadRequest(f"Invalid DSN format: {e}")

        # Security check: only allow official Sentry hosts
        if not any(allowed in host for allowed in ALLOWED_SENTRY_HOSTS):
            return HttpResponseBadRequest(f"Invalid Sentry host: {host}")

        # Construct the Sentry ingest URL
        sentry_url = f"https://{host}/api/{project_id}/envelope/"

        # Forward the envelope to Sentry
        try:
            response = requests.post(
                sentry_url,
                data=envelope,
                headers={
                    "Content-Type": "application/x-sentry-envelope",
                },
                timeout=10,
            )

            return HttpResponse(
                response.content,
                status=response.status_code,
                content_type=response.headers.get("Content-Type", "application/json"),
            )
        except requests.Timeout:
            return HttpResponse("Sentry request timeout", status=504)
        except requests.RequestException as e:
            logger.warning(f"Sentry tunnel request failed: {e}")
            return HttpResponse("Sentry request failed", status=502)

    except Exception as e:
        logger.error(f"Sentry tunnel error: {e}")
        return HttpResponse("Internal server error", status=500)
