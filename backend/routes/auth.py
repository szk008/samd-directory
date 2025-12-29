from flask import Blueprint, request, jsonify, redirect
from functools import wraps
from backend.database import db
from backend.models.doctor import Doctor
from backend.auth.otp import create_otp_session, verify_otp_session, generate_jwt, verify_jwt
from backend.auth.magic_link import generate_magic_token, verify_magic_token, get_magic_link_url
from backend.auth.google_auth import verify_google_token
from backend.auth.account_linking import find_or_create_doctor, validate_required_fields
from backend.services.otp_service import send_otp
from backend.services.email_service import send_magic_link

auth_bp = Blueprint("auth", __name__)

def jwt_required(f):
    """Decorator to protect routes with JWT authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({"error": "No authorization token provided"}), 401
        
        try:
            token = auth_header.split(' ')[1]  # Bearer <token>
        except IndexError:
            return jsonify({"error": "Invalid authorization header format"}), 401
        
        doctor_id, error = verify_jwt(token)
        
        if error:
            return jsonify({"error": error}), 401
        
        # Attach doctor_id to request context
        request.doctor_id = doctor_id
        
        return f(*args, **kwargs)
    
    return decorated_function

@auth_bp.route("/api/auth/request-otp", methods=["POST"])
def request_otp():
    """
    Request OTP for login or registration.
    Works for both existing and new doctors.
    """
    data = request.json
    mobile_number = data.get("mobile")
    
    if not mobile_number:
        return jsonify({"error": "Mobile number required"}), 400
    
    # Get request metadata for abuse tracking
    ip_address = request.remote_addr
    user_agent = request.headers.get('User-Agent', '')
    
    # Create OTP session
    session, result = create_otp_session(mobile_number, ip_address, user_agent)
    
    if not session:
        # Rate limit exceeded
        return jsonify({"error": result}), 429
    
    # result is the plain OTP
    otp = result
    
    # Send OTP via SMS
    success, message = send_otp(mobile_number, otp)
    
    if not success:
        return jsonify({"error": f"Failed to send OTP: {message}"}), 500
    
    return jsonify({
        "success": True,
        "session_id": session.id,
        "message": "OTP sent successfully. Check WhatsApp or SMS.",
        "expires_in_minutes": 5
    })

@auth_bp.route("/api/auth/verify-otp", methods=["POST"])
def verify_otp():
    """
    Verify OTP and issue JWT token.
    Works for both login (existing doctor) and registration flow.
    """
    data = request.json
    session_id = data.get("session_id")
    otp = data.get("otp")
    mobile_number = data.get("mobile")
    
    if not all([session_id, otp, mobile_number]):
        return jsonify({"error": "session_id, otp, and mobile required"}), 400
    
    # Verify OTP
    success, message = verify_otp_session(session_id, otp)
    
    if not success:
        return jsonify({"error": message}), 400
    
    # Check if doctor exists
    doctor = Doctor.query.filter_by(personal_mobile=mobile_number).first()
    
    if doctor:
        # Existing doctor - issue JWT
        token = generate_jwt(doctor.id)
        
        return jsonify({
            "success": True,
            "token": token,
            "doctor": doctor.to_dict(),
            "is_new": False
        })
    else:
        # New doctor - return success but no token yet
        # They need to complete registration first
        return jsonify({
            "success": True,
            "is_new": True,
            "message": "OTP verified. Please complete registration."
        })

@auth_bp.route("/api/auth/register", methods=["POST"])
def register_doctor():
    """
    Complete doctor self-registration after OTP verification.
    Creates a new doctor profile marked as self_registered and unverified.
    """
    data = request.json
    
    # Required fields
    mobile = data.get("mobile")
    name = data.get("name")
    degree = data.get("degree")
    specialty = data.get("specialty")
    area = data.get("area") 
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    
    # Validate required fields
    if not all([mobile, name, specialty, area, latitude, longitude]):
        return jsonify({
            "error": "Required fields: mobile, name, specialty, area, latitude, longitude"
        }), 400
    
    # Check if doctor already exists
    existing = Doctor.query.filter_by(personal_mobile=mobile).first()
    if existing:
        return jsonify({"error": "Doctor with this mobile number already exists"}), 409
    
    # Create new doctor
    doctor = Doctor(
        name=name,
        degree=degree or "",
        specialty=specialty,
        area=area,
        city=data.get("city", ""),
        latitude=latitude,
        longitude=longitude,
        personal_mobile=mobile,
        phone=mobile,  # Legacy field
        experience_years=data.get("experience_years", 0),
        clinic_name=data.get("clinic_name", ""),
        verified=False,  # Requires admin approval
        self_registered=True,
        last_location_update=datetime.utcnow()
    )
    
    db.session.add(doctor)
    db.session.commit()
    
    # Issue JWT token
    token = generate_jwt(doctor.id)
    
    return jsonify({
        "success": True,
        "token": token,
        "doctor": doctor.to_dict(),
        "message": "Registration successful. Your profile is pending verification."
    }), 201


# ==================== MAGIC LINK AUTH ====================

@auth_bp.route("/api/auth/request-magic-link", methods=["POST"])
def request_magic_link():
    """Send magic link to email for passwordless authentication"""
    data = request.json
    email = data.get("email", "").strip().lower()
    
    if not email:
        return jsonify({"error": "Email required"}), 400
    
    # Validate email format
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return jsonify({"error": "Invalid email format"}), 400
    
    # Get request metadata
    ip_address = request.remote_addr
    user_agent = request.headers.get('User-Agent', '')
    
    # Generate magic token
    session, plain_token = generate_magic_token(email, ip_address, user_agent)
    
    # Get full magic link URL
    magic_link_url = get_magic_link_url(plain_token)
    
    # Send email
    success, message = send_magic_link(email, magic_link_url)
    
    if not success:
        return jsonify({"error": message}), 500
    
    return jsonify({
        "success": True,
        "message": "Magic link sent to your email. Check your inbox!",
        "expires_in_minutes": 15
    })


@auth_bp.route("/api/auth/verify-magic-link", methods=["GET"])
def verify_magic_link_endpoint():
    """Verify magic link token and authenticate doctor"""
    token = request.args.get("token")
    
    if not token:
        return jsonify({"error": "Token required"}), 400
    
    # Verify token
    session, error = verify_magic_token(token)
    
    if error:
        return jsonify({"error": error}), 400
    
    # Find or create doctor
    email = session.identifier
    doctor, is_new, linked = find_or_create_doctor(
        identifier=email,
        method='magic',
        profile_data={'email': email}
    )
    
    if is_new or not doctor.personal_mobile:
        # New doctor or missing mobile - redirect to complete registration
        temp_token = generate_jwt(doctor.id, expires_hours=1)
        return redirect(f"/doctor/complete-registration?token={temp_token}&method=magic")
    
    # Existing doctor with mobile - direct login
    token = generate_jwt(doctor.id)
    
    return jsonify({
        "success": True,
        "token": token,
        "doctor": doctor.to_public_dict(),
        "linked": linked,
        "message": "Login successful!"
    })


# ==================== GOOGLE OAUTH ====================

@auth_bp.route("/api/auth/google-login", methods=["POST"])
def google_login():
    """Authenticate doctor using Google OAuth"""
    data = request.json
    id_token_str = data.get("id_token")
    
    if not id_token_str:
        return jsonify({"error": "Google ID token required"}), 400
    
    # Verify Google token
    user_info, error = verify_google_token(id_token_str)
    
    if error:
        return jsonify({"error": error}), 400
    
    # Find or create doctor
    google_sub = user_info['google_sub']
    doctor, is_new, linked = find_or_create_doctor(
        identifier=google_sub,
        method='google',
        profile_data={
            'email': user_info.get('email'),
            'name': user_info.get('name'),
            'google_sub': google_sub
        }
    )
    
    if is_new or not doctor.personal_mobile:
        # New doctor or missing mobile - need to complete registration
        temp_token = generate_jwt(doctor.id, expires_hours=1)
        return jsonify({
            "success": True,
            "needs_registration": True,
            "temp_token": temp_token,
            "doctor": doctor.to_dict(),
            "message": "Please complete your profile with mobile number"
        })
    
    # Existing doctor with complete profile - direct login
    token = generate_jwt(doctor.id)
    
    return jsonify({
        "success": True,
        "token": token,
        "doctor": doctor.to_public_dict(),
        "linked": linked,
        "message": "Google login successful!"
    })


# ==================== COMPLETE REGISTRATION ====================

@auth_bp.route("/api/auth/complete-registration", methods=["POST"])
@jwt_required
def complete_registration():
    """Complete doctor registration with required fields (mobile is mandatory)"""
    doctor = Doctor.query.get(request.doctor_id)
    
    if not doctor:
        return jsonify({"error": "Doctor not found"}), 404
    
    data = request.json
    
    # Validate required fields
    errors = validate_required_fields(data, 'complete')
    if errors:
        return jsonify({"error": "; ".join(errors)}), 400
    
    # Update doctor profile
    doctor.name = data.get("name", doctor.name)
    doctor.personal_mobile = data["personal_mobile"]  # REQUIRED
    doctor.degree = data.get("degree", "")
    doctor.specialty = data["specialty"]  # REQUIRED
    doctor.experience_years = data.get("experience_years", 0)
    doctor.area = data.get("area", "")
    doctor.city = data.get("city", "")
    doctor.latitude = data.get("latitude")
    doctor.longitude = data.get("longitude")
    doctor.clinic_name = data.get("clinic_name", "")
    doctor.self_registered = True
    
    db.session.commit()
    
    # Issue full JWT
    token = generate_jwt(doctor.id)
    
    return jsonify({
        "success": True,
        "token": token,
        "doctor": doctor.to_dict(),
        "message": "Registration completed! Your profile is pending verification."
    }), 201
