"""
Magic Link Authentication Module
Generates secure tokens for email-based passwordless login.
"""

import secrets
import hashlib
from datetime import datetime, timedelta
from backend.database import db
from backend.models.auth_session import AuthSession
from backend.config import Config

def generate_magic_token(email: str, ip_address: str = None, user_agent: str = None):
    """
    Generate a secure magic link token for email authentication.
    Returns: (session, plain_token) tuple
    """
    
    # Generate secure token
    plain_token = secrets.token_urlsafe(32)
    
    # Hash for storage
    token_hash = hashlib.sha256(plain_token.encode()).hexdigest()
    
    # Create session
    expires_at = datetime.utcnow() + timedelta(minutes=Config.MAGIC_LINK_EXPIRY_MINUTES)
    
    session = AuthSession(
        identifier=email.lower(),
        method='magic',
        token_hash=token_hash,
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    db.session.add(session)
    db.session.commit()
    
    return session, plain_token


def verify_magic_token(token: str):
    """
    Verify magic link token and return session if valid.
    Returns: (session, error_message) tuple
    """
    
    # Hash the provided token
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Find session
    session = AuthSession.query.filter_by(
        token_hash=token_hash,
        method='magic',
        used=False
    ).first()
    
    if not session:
        return None, "Invalid or expired magic link"
    
    # Check expiry
    if datetime.utcnow() > session.expires_at:
        return None, "Magic link has expired"
    
    # Mark as used
    session.used = True
    db.session.commit()
    
    return session, None


def get_magic_link_url(token: str):
    """Generate full magic link URL"""
    base_url = Config.MAGIC_LINK_BASE_URL
    return f"{base_url}/auth/magic?token={token}"
