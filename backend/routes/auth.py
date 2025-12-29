from flask import Blueprint, request, jsonify
from functools import wraps
from backend.database import db
from backend.models.doctor import Doctor
from backend.auth.otp import create_otp_session, verify_otp_session, generate_jwt, verify_jwt
from backend.services.otp_service import send_otp

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
        "message": "OTP sent successfully",
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
