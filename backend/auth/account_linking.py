"""
Account Linking and Doctor Management
Handles finding or creating doctors across all auth methods.
Prevents duplicate accounts and links auth methods to existing doctors.
"""

from backend.database import db
from backend.models.doctor import Doctor
from datetime import datetime
import uuid

def find_doctor_by_identifier(identifier: str, method: str):
    """
    Find doctor by auth identifier and method.
    
    Args:
        identifier: email, mobile, or google_sub
        method: 'otp', 'magic', 'google'
    """
    
    if method == 'otp':
        return Doctor.query.filter_by(personal_mobile=identifier).first()
    elif method == 'magic':
        return Doctor.query.filter_by(email=identifier.lower()).first()
    elif method == 'google':
        return Doctor.query.filter_by(google_sub=identifier).first()
    
    return None


def find_or_create_doctor(identifier: str, method: str, profile_data: dict):
    """
    Find existing doctor or create new one.
    Implements account linking logic.
    
    Args:
        identifier: The auth identifier (mobile/email/google_sub)
        method: Auth method used ('otp', 'magic', 'google')
        profile_data: Additional profile data (name, specialty, etc.)
    
    Returns:
        (doctor, is_new, linked) tuple
    """
    
    # 1. Try direct match by identifier
    doctor = find_doctor_by_identifier(identifier, method)
    if doctor:
        doctor.last_login_at = datetime.utcnow()
        db.session.commit()
        return doctor, False, False  # existing, not new, not linked
    
    # 2. Try linking via email (if provided)
    email = profile_data.get('email', '').lower() if profile_data.get('email') else None
    if email and method != 'magic':  # Don't double-check for magic (already checked)
        doctor = Doctor.query.filter_by(email=email).first()
        if doctor:
            # Link new auth method to existing doctor
            link_auth_method(doctor, identifier, method)
            return doctor, False, True  # existing, not new, linked
    
    # 3. Try linking via mobile (if provided)
    mobile = profile_data.get('personal_mobile')
    if mobile and method != 'otp':  # Don't double-check for OTP (already checked)
        doctor = Doctor.query.filter_by(personal_mobile=mobile).first()
        if doctor:
            # Link new auth method to existing doctor
            link_auth_method(doctor, identifier, method)
            return doctor, False, True  # existing, not new, linked
    
    # 4. Create new doctor
    doctor = create_doctor(identifier, method, profile_data)
    return doctor, True, False  # new, not linked


def link_auth_method(doctor: Doctor, identifier: str, method: str):
    """
    Link a new authentication method to existing doctor.
    """
    
    if method == 'otp':
        doctor.personal_mobile = identifier
    elif method == 'magic':
        doctor.email = identifier.lower()
    elif method == 'google':
        doctor.google_sub = identifier
    
    doctor.last_login_at = datetime.utcnow()
    db.session.commit()


def create_doctor(identifier: str, method: str, profile_data: dict):
    """
    Create new doctor with auth method.
    Note: personal_mobile is REQUIRED and will be collected during registration.
    """
    
    doctor = Doctor(
        id=str(uuid.uuid4()),
        name=profile_data.get('name', ''),
        degree=profile_data.get('degree', ''),
        specialty=profile_data.get('specialty', ''),
        area=profile_data.get('area', ''),
        city=profile_data.get('city', ''),
        personal_mobile=profile_data.get('personal_mobile'),  # REQUIRED
        email=profile_data.get('email', '').lower() if profile_data.get('email') else None,
        verified=False,  # Admin will verify
        self_registered=True,
        last_login_at=datetime.utcnow()
    )
    
    # Set primary auth identifier
    if method == 'otp':
        doctor.personal_mobile = identifier
    elif method == 'magic':
        doctor.email = identifier.lower()
    elif method == 'google':
        doctor.google_sub = identifier
    
    db.session.add(doctor)
    db.session.commit()
    
    return doctor


def validate_required_fields(profile_data: dict, method: str):
    """
    Validate that required fields are present.
    Mobile number is ALWAYS required, regardless of auth method.
    """
    
    errors = []
    
    # Mobile is REQUIRED for all doctors
    if not profile_data.get('personal_mobile'):
        errors.append("Mobile number is required")
    
    # Name is required
    if not profile_data.get('name'):
        errors.append("Name is required")
    
    # Specialty is required
    if not profile_data.get('specialty'):
        errors.append("Specialty is required")
    
    return errors
