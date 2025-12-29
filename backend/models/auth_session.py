"""
AuthSession Model - Unified authentication sessions
Replaces OTPSession, supports all auth methods (OTP, Magic Link, Google)
"""

import uuid
from datetime import datetime
from backend.database import db

class AuthSession(db.Model):
    __tablename__ = "auth_sessions"
    
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    identifier = db.Column(db.String, nullable=False)  # email, mobile, or google_sub
    method = db.Column(db.String, nullable=False)  # 'otp', 'magic', 'google'
    token_hash = db.Column(db.String, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    attempts = db.Column(db.Integer, default=0)
    ip_address = db.Column(db.String)
    user_agent = db.Column(db.String)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            "id": self.id,
            "identifier": self.identifier,
            "method": self.method,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "used": self.used,
            "attempts": self.attempts,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
