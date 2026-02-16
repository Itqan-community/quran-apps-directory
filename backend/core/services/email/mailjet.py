"""
Mailjet SMTP email service implementation.

Sends emails via Mailjet's SMTP service.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

from django.conf import settings
from .base import EmailService

logger = logging.getLogger(__name__)


class MailjetEmailService(EmailService):
    """
    Email service that sends emails via Mailjet SMTP.

    Requires the following settings:
    - EMAIL_HOST: SMTP host (default: in-v3.mailjet.com)
    - EMAIL_PORT: SMTP port (default: 2525)
    - EMAIL_USE_TLS: Use TLS (default: True)
    - EMAIL_HOST_USER: Mailjet API key
    - EMAIL_HOST_PASSWORD: Mailjet secret key
    """

    def __init__(self):
        super().__init__()
        self.host = getattr(settings, 'EMAIL_HOST', 'in-v3.mailjet.com')
        self.port = getattr(settings, 'EMAIL_PORT', 2525)
        self.use_tls = getattr(settings, 'EMAIL_USE_TLS', True)
        self.username = getattr(settings, 'EMAIL_HOST_USER', '')
        self.password = getattr(settings, 'EMAIL_HOST_PASSWORD', '')

    def send_email(
        self,
        to: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        reply_to: Optional[str] = None
    ) -> bool:
        """
        Send email via Mailjet SMTP.

        Args:
            to: Recipient email address
            subject: Email subject
            html_body: HTML content of the email
            text_body: Plain text content (optional, derived from HTML if not provided)
            reply_to: Reply-to email address (optional)

        Returns:
            True if email was sent successfully, False otherwise
        """
        if not self.username or not self.password:
            logger.warning("Mailjet credentials not configured, falling back to console output")
            print(f"[Mailjet - No Credentials] Would send to {to}: {subject}")
            return True

        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to

            if reply_to:
                msg['Reply-To'] = reply_to

            # Add plain text version (derived from HTML if not provided)
            if text_body:
                msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
            else:
                # Simple HTML to text conversion
                import re
                plain_text = re.sub(r'<[^>]+>', '', html_body)
                plain_text = re.sub(r'\s+', ' ', plain_text).strip()
                msg.attach(MIMEText(plain_text, 'plain', 'utf-8'))

            # Add HTML version
            msg.attach(MIMEText(html_body, 'html', 'utf-8'))

            # Connect and send
            if self.use_tls:
                server = smtplib.SMTP(self.host, self.port)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(self.host, self.port)

            server.login(self.username, self.password)
            server.sendmail(self.from_email, [to], msg.as_string())
            server.quit()

            logger.info(f"[Mailjet] Email sent successfully to {to}: {subject}")
            return True

        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"[Mailjet] Authentication failed: {e}")
            return False
        except smtplib.SMTPRecipientsRefused as e:
            logger.error(f"[Mailjet] Recipient refused: {e}")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"[Mailjet] SMTP error: {e}")
            return False
        except Exception as e:
            logger.error(f"[Mailjet] Unexpected error: {e}")
            return False
