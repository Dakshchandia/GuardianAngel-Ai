"""Alerts router — family SMS alert endpoints."""

import logging
import time
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Request
from models.analysis_models import FamilyAlertRequest, AlertResponse
from services.alert_service import AlertService

logger = logging.getLogger("guardianangel.alerts")
router = APIRouter()

alert_service = AlertService()

# Simple in-memory rate limiter: max 5 alerts per IP per minute
_rate_limit: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_MAX = 5
RATE_LIMIT_WINDOW = 60.0  # seconds


def _check_rate_limit(ip: str) -> None:
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    # Prune old entries
    _rate_limit[ip] = [t for t in _rate_limit[ip] if t > window_start]
    if len(_rate_limit[ip]) >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Max {RATE_LIMIT_MAX} alerts per minute.",
        )
    _rate_limit[ip].append(now)


@router.post("/family", response_model=AlertResponse)
async def send_family_alert(request: Request, body: FamilyAlertRequest):
    """
    Send emergency SMS alerts to family contacts.

    Uses Twilio if configured, otherwise mock mode for demo.
    Rate limited to 5 requests/minute per IP.
    """
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    if not body.contacts:
        raise HTTPException(status_code=400, detail="No contacts provided")

    logger.info(
        "Sending family alert to %d contacts. Risk score: %d (from %s)",
        len(body.contacts),
        body.risk_data.score,
        client_ip,
    )

    contacts_dict = [c.model_dump() for c in body.contacts]
    risk_dict = body.risk_data.model_dump()

    result = await alert_service.send_family_alert(
        contacts=contacts_dict,
        risk_data=risk_dict,
        message=body.message,
    )

    return AlertResponse(**result)


@router.post("/test")
async def send_test_alert(
    request: Request,
    contact_phone: str,
    contact_name: str = "Test Contact",
):
    """Send a test alert to verify Twilio configuration."""
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    test_contact = {
        "id": "test",
        "name": contact_name,
        "phone": contact_phone,
        "relationship": "Test",
        "alertEnabled": True,
    }

    result = await alert_service.send_family_alert(
        contacts=[test_contact],
        risk_data={"score": 0, "threats": [], "callerNumber": "TEST"},
        message="This is a test alert from GuardianAngel AI. Your alerts are working correctly!",
    )

    return result
