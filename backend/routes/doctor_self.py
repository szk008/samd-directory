from flask import Blueprint, request, jsonify
from datetime import datetime
from backend.database import db
from backend.models.doctor import Doctor
from backend.routes.auth import jwt_required

doctor_self_bp = Blueprint("doctor_self", __name__)

@doctor_self_bp.route("/api/doctor/me", methods=["GET"])
@jwt_required
def get_my_profile():
    """Get authenticated doctor's profile"""
    doctor = Doctor.query.get(request.doctor_id)
    
    if not doctor:
        return jsonify({"error": "Doctor not found"}), 404
    
    return jsonify(doctor.to_dict())

@doctor_self_bp.route("/api/doctor/update-profile", methods=["PUT"])
@jwt_required
def update_profile():
    """
    Update doctor profile.
    Allowed fields: degree, specialty, experience_years, personal_mobile
    NOT allowed: name (admin only, prevents impersonation)
    """
    doctor = Doctor.query.get(request.doctor_id)
    
    if not doctor:
        return jsonify({"error": "Doctor not found"}), 404
    
    data = request.json
    
    # Update allowed fields only
    if "degree" in data:
        doctor.degree = data["degree"]
    
    if "specialty" in data:
        doctor.specialty = data["specialty"]
    
    if "experience_years" in data:
        doctor.experience_years = data["experience_years"]
    
    if "clinic_name" in data:
        doctor.clinic_name = data["clinic_name"]
    
    if "city" in data:
        doctor.city = data["city"]
    
    if "area" in data:
        doctor.area = data["area"]
    
     if "personal_mobile" in data:
        # Check if new mobile already exists
        new_mobile = data["personal_mobile"]
        existing = Doctor.query.filter_by(personal_mobile=new_mobile).first()
        if existing and existing.id != doctor.id:
            return jsonify({"error": "Mobile number already in use"}), 409
        doctor.personal_mobile = new_mobile
        doctor.phone = new_mobile  # Update legacy field too
    
    # Explicitly block name editing
    if "name" in data:
        return jsonify({
            "error": "Name cannot be edited directly. Contact admin if correction needed."
        }), 403
    
    db.session.commit()
    
    return jsonify({
        "success": True,
        "doctor": doctor.to_dict()
    })

@doctor_self_bp.route("/api/doctor/update-location", methods=["PUT"])
@jwt_required
def update_location():
    """Update doctor's clinic location (latitude/longitude)"""
    doctor = Doctor.query.get(request.doctor_id)
    
    if not doctor:
        return jsonify({"error": "Doctor not found"}), 404
    
    data = request.json
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    
    if latitude is None or longitude is None:
        return jsonify({"error": "latitude and longitude required"}), 400
    
    # Basic validation
    if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
        return jsonify({"error": "Invalid coordinates"}), 400
    
    doctor.latitude = latitude
    doctor.longitude = longitude
    doctor.last_location_update = datetime.utcnow()
    
    # Optionally update area/city if provided
    if "area" in data:
        doctor.area = data["area"]
    if "city" in data:
        doctor.city = data["city"]
    
    db.session.commit()
    
    return jsonify({
        "success": True,
        "doctor": doctor.to_dict()
    })
