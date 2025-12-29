import uuid
from datetime import datetime, timedelta
from backend.database import db

class OTPSession(db.Model):
    """
    Manages OTP sessions for doctor authentication and registration.
    Includes abuse prevention via rate limiting and attempt tracking.
    """
    __tablename__ = "otp_sessions"
    
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    mobile_number = db.Column(db.String, nullable=False)  # Phone number requesting OTP
    otp_hash = db.Column(db.String, nullable=False)  # Hashed OTP (never store plain)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    
    attempts = db.Column(db.Integer, default=0)  # Failed verification attempts
    verified = db.Column(db.Boolean, default=False)
    
    # Abuse detection fields
    ip_address = db.Column(db.String)  # Track requesting IP
    user_agent = db.Column(db.String)  # Track user agent for fingerprinting
    
    def is_expired(self):
        """Check if OTP session has expired"""
        return datetime.utcnow() > self.expires_at
    
    def is_locked(self):
        """Check if session is locked due to too many attempts"""
        return self.attempts >= 3
    
    def increment_attempt(self):
        """Increment failed attempt counter"""
        self.attempts += 1
        db.session.commit()
    
    @staticmethod
    def create_session(mobile_number, otp_hash, ip_address=None, user_agent=None, expiry_minutes=5):
        """Create a new OTP session"""
        session = OTPSession(
            mobile_number=mobile_number,
            otp_hash=otp_hash,
            expires_at=datetime.utcnow() + timedelta(minutes=expiry_minutes),
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.session.add(session)
        db.session.commit()
        return session
