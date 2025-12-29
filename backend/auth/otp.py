import hashlib
import secrets
import jwt
from datetime import datetime, timedelta
from backend.config import Config
from backend.models.session import OTPSession
from backend.database import db

def generate_otp():
    """Generate a 6-digit OTP"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])

def hash_otp(otp):
    """Hash OTP for secure storage"""
    return hashlib.sha256(otp.encode()).hexdigest()

def verify_otp_hash(otp, otp_hash):
    """Verify OTP against stored hash"""
    return hash_otp(otp) == otp_hash

def create_otp_session(mobile_number, ip_address=None, user_agent=None):
    """
    Create a new OTP session for a mobile number.
    Returns (session, plain_otp) or (None, error_message)
    """
    # Rate limiting: check recent sessions
    recent_cutoff = datetime.utcnow() - timedelta(hours=1)
    recent_count = OTPSession.query.filter(
        OTPSession.mobile_number == mobile_number,
        OTPSession.created_at >= recent_cutoff
    ).count()
    
    if recent_count >= Config.OTP_RATE_LIMIT_PER_HOUR:
        return None, f"Too many OTP requests. Try again in {60 - (datetime.utcnow().minute % 60)} minutes."
    
    # Generate OTP
    otp = generate_otp()
    otp_hash = hash_otp(otp)
    
    # Create session
    session = OTPSession.create_session(
        mobile_number=mobile_number,
        otp_hash=otp_hash,
        ip_address=ip_address,
        user_agent=user_agent,
        expiry_minutes=Config.OTP_EXPIRY_MINUTES
    )
    
    return session, otp

def verify_otp_session(session_id, otp):
    """
    Verify OTP for a given session.
    Returns (success: bool, message: str)
    """
    session = OTPSession.query.filter_by(id=session_id).first()
    
    if not session:
        return False, "Invalid session"
    
    if session.verified:
        return False, "OTP already used"
    
    if session.is_expired():
        return False, "OTP expired"
    
    if session.is_locked():
        return False, "Too many attempts. Request a new OTP."
    
    if not verify_otp_hash(otp, session.otp_hash):
        session.increment_attempt()
        return False, f"Invalid OTP. {3 - session.attempts} attempts remaining."
    
    # Mark as verified
    session.verified = True
    db.session.commit()
    
    return True, "OTP verified successfully"

def generate_jwt(doctor_id):
    """Generate JWT token for authenticated doctor"""
    payload = {
        'doctor_id': doctor_id,
        'exp': datetime.utcnow() + timedelta(hours=Config.JWT_EXPIRY_HOURS),
        'iat': datetime.utcnow()
    }
    token = jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm='HS256')
    return token

def verify_jwt(token):
    """
    Verify JWT token and return doctor_id.
    Returns (doctor_id, None) on success or (None, error_message) on failure
    """
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
        return payload['doctor_id'], None
    except jwt.ExpiredSignatureError:
        return None, "Token expired"
    except jwt.InvalidTokenError:
        return None, "Invalid token"
