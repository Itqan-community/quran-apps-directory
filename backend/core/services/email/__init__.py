"""
Pluggable email service for the Quran Apps Directory.

Provides an abstract base class and implementations for different
email providers (Mailjet, console for development, etc.)
"""
from .base import EmailService, get_email_service

__all__ = ['EmailService', 'get_email_service']
