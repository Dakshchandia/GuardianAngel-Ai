"""
Family alert service using Twilio SMS.
Falls back to mock alerts if Twilio not configured.
"""

import asyncio
import os
import logging

logger = logging.getLogger("guardianangel.alerts")


class AlertService:
    """
    Sends emergency SMS alerts to family contacts via Twilio.
    Falls back to mock mode if credentials not configured.
    """

    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_FROM_NUMBER", "+1234567890")
        self.use_twilio = bool(self.account_sid and self.auth_token)

        if self.use_twilio:
            logger.info("AlertService: Twilio configured")
        else:
            logger.warning("AlertService: Twilio not configured, using mock mode")

    async def send_family_alert(
        self,
        contacts: list[dict],
        risk_data: dict,
        message: str,
    ) -> dict:
        """
        Send SMS alerts to family contacts.

        Returns:
            { "sent_count": int, "status": str, "message": str }
        """
        enabled_contacts = [c for c in contacts if c.get("alertEnabled", True)]

        if not enabled_contacts:
            return {
                "sent_count": 0,
                "status": "failed",
                "message": "No contacts with alerts enabled",
            }

        alert_message = self._build_alert_message(risk_data, message)

        if self.use_twilio:
            # Run blocking Twilio calls in a thread pool to avoid blocking the event loop
            return await asyncio.to_thread(
                self._send_via_twilio_sync, enabled_contacts, alert_message
            )
        else:
            return self._mock_send(enabled_contacts, alert_message)

    def _build_alert_message(self, risk_data: dict, custom_message: str) -> str:
        """Build the SMS alert message."""
        score = risk_data.get("score", 0)
        caller = risk_data.get("callerNumber", "Unknown")
        threats = risk_data.get("threats", [])

        msg = (
            f"🚨 GUARDIANANGEL ALERT\n"
            f"Scam call detected!\n"
            f"Caller: {caller}\n"
            f"Risk Score: {score}/100\n"
        )

        if threats:
            msg += f"Threats: {', '.join(threats[:2])}\n"

        if custom_message:
            msg += f"\n{custom_message}"

        msg += "\n\nStay safe. Do NOT share OTP or send money.\nPowered by GuardianAngel AI"
        return msg

    def _send_via_twilio_sync(self, contacts: list[dict], message: str) -> dict:
        """Send SMS via Twilio API (synchronous — called via asyncio.to_thread)."""
        try:
            from twilio.rest import Client

            client = Client(self.account_sid, self.auth_token)
            sent_count = 0
            errors = []

            for contact in contacts:
                try:
                    client.messages.create(
                        body=message,
                        from_=self.from_number,
                        to=contact["phone"],
                    )
                    sent_count += 1
                    logger.info(f"SMS sent to {contact['name']} ({contact['phone']})")
                except Exception as e:
                    errors.append(f"{contact['name']}: {str(e)}")
                    logger.error(f"Failed to send SMS to {contact['name']}: {e}")

            status = (
                "success" if sent_count == len(contacts)
                else "partial" if sent_count > 0
                else "failed"
            )
            return {
                "sent_count": sent_count,
                "status": status,
                "message": (
                    f"Sent to {sent_count}/{len(contacts)} contacts"
                    + (f". Errors: {'; '.join(errors)}" if errors else "")
                ),
            }

        except ImportError:
            logger.error("Twilio package not installed")
            return self._mock_send(contacts, message)
        except Exception as e:
            logger.error(f"Twilio error: {e}")
            return {
                "sent_count": 0,
                "status": "failed",
                "message": f"Twilio error: {str(e)}",
            }

    def _mock_send(self, contacts: list[dict], message: str) -> dict:
        """Mock SMS sending for demo mode."""
        logger.info(f"[MOCK] Would send SMS to {len(contacts)} contacts:")
        for contact in contacts:
            logger.info(f"  → {contact['name']} ({contact['phone']})")
        logger.info(f"  Message: {message[:100]}...")

        return {
            "sent_count": len(contacts),
            "status": "success",
            "message": f"[Demo Mode] Alert sent to {len(contacts)} contacts",
        }



class AlertService:
    """
    Sends emergency SMS alerts to family contacts via Twilio.
    Falls back to mock mode if credentials not configured.
    """

    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.from_number = os.getenv("TWILIO_FROM_NUMBER", "+1234567890")
        self.use_twilio = bool(self.account_sid and self.auth_token)

        if self.use_twilio:
            logger.info("AlertService: Twilio configured")
        else:
            logger.warning("AlertService: Twilio not configured, using mock mode")

    async def send_family_alert(
        self,
        contacts: list[dict],
        risk_data: dict,
        message: str,
    ) -> dict:
        """
        Send SMS alerts to family contacts.
        
        Returns:
            { "sent_count": int, "status": str, "message": str }
        """
        enabled_contacts = [c for c in contacts if c.get("alertEnabled", True)]
        
        if not enabled_contacts:
            return {
                "sent_count": 0,
                "status": "failed",
                "message": "No contacts with alerts enabled",
            }

        alert_message = self._build_alert_message(risk_data, message)
        
        if self.use_twilio:
            return await self._send_via_twilio(enabled_contacts, alert_message)
        else:
            return self._mock_send(enabled_contacts, alert_message)

    def _build_alert_message(self, risk_data: dict, custom_message: str) -> str:
        """Build the SMS alert message."""
        score = risk_data.get("score", 0)
        caller = risk_data.get("callerNumber", "Unknown")
        threats = risk_data.get("threats", [])

        msg = (
            f"🚨 GUARDIANANGEL ALERT\n"
            f"Scam call detected!\n"
            f"Caller: {caller}\n"
            f"Risk Score: {score}/100\n"
        )

        if threats:
            msg += f"Threats: {', '.join(threats[:2])}\n"

        if custom_message:
            msg += f"\n{custom_message}"

        msg += "\n\nStay safe. Do NOT share OTP or send money.\nPowered by GuardianAngel AI"
        return msg

    async def _send_via_twilio(self, contacts: list[dict], message: str) -> dict:
        """Send SMS via Twilio API."""
        try:
            from twilio.rest import Client

            client = Client(self.account_sid, self.auth_token)
            sent_count = 0
            errors = []

            for contact in contacts:
                try:
                    client.messages.create(
                        body=message,
                        from_=self.from_number,
                        to=contact["phone"],
                    )
                    sent_count += 1
                    logger.info(f"SMS sent to {contact['name']} ({contact['phone']})")
                except Exception as e:
                    errors.append(f"{contact['name']}: {str(e)}")
                    logger.error(f"Failed to send SMS to {contact['name']}: {e}")

            status = "success" if sent_count == len(contacts) else "partial" if sent_count > 0 else "failed"
            return {
                "sent_count": sent_count,
                "status": status,
                "message": f"Sent to {sent_count}/{len(contacts)} contacts" + (f". Errors: {'; '.join(errors)}" if errors else ""),
            }

        except ImportError:
            logger.error("Twilio package not installed")
            return self._mock_send(contacts, message)
        except Exception as e:
            logger.error(f"Twilio error: {e}")
            return {
                "sent_count": 0,
                "status": "failed",
                "message": f"Twilio error: {str(e)}",
            }

    def _mock_send(self, contacts: list[dict], message: str) -> dict:
        """Mock SMS sending for demo mode."""
        logger.info(f"[MOCK] Would send SMS to {len(contacts)} contacts:")
        for contact in contacts:
            logger.info(f"  → {contact['name']} ({contact['phone']})")
        logger.info(f"  Message: {message[:100]}...")

        return {
            "sent_count": len(contacts),
            "status": "success",
            "message": f"[Demo Mode] Alert sent to {len(contacts)} contacts",
        }
