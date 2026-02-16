"""
Console email service for development/testing.

Prints emails to the console instead of actually sending them.
"""
from typing import Optional
import logging

from .base import EmailService

logger = logging.getLogger(__name__)


class ConsoleEmailService(EmailService):
    """
    Development email service that prints emails to the console.

    Useful for testing email functionality without actually sending emails.
    """

    def send_email(
        self,
        to: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        reply_to: Optional[str] = None
    ) -> bool:
        """
        Print email to console instead of sending.

        Args:
            to: Recipient email address
            subject: Email subject
            html_body: HTML content of the email
            text_body: Plain text content (optional)
            reply_to: Reply-to email address (optional)

        Returns:
            Always returns True
        """
        separator = "=" * 60
        print(f"\n{separator}")
        print("EMAIL (Console Debug Mode)")
        print(separator)
        print(f"From: {self.from_name} <{self.from_email}>")
        print(f"To: {to}")
        if reply_to:
            print(f"Reply-To: {reply_to}")
        print(f"Subject: {subject}")
        print(separator)
        print("HTML Body:")
        print(html_body[:500] + "..." if len(html_body) > 500 else html_body)
        print(separator + "\n")

        logger.info(f"[Console Email] Sent to {to}: {subject}")

        return True
