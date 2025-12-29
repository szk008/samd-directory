from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import random
from backend.database import db
from backend.models.user import User
from backend.models.otp import OTP
from backend.models.doctor import Doctor
from backend.services.otp_service import send_otp

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/api/auth/send-otp", methods=["POST"])
def send_otp_handler():
    data = request.json
    phone = data.get("phone")
    if not phone:
        return jsonify({"error": "Phone required"}), 400

    otp_code = str(random.randint(100000, 999999))
    expires = datetime.utcnow() + timedelta(minutes=5)

    # Clear old OTPs
    OTP.query.filter_by(phone=phone).delete()
    
    new_otp = OTP(phone=phone, code=otp_code, expires_at=expires)
    db.session.add(new_otp)
    db.session.commit()

    res = send_otp(phone, otp_code)
    return jsonify(res)

@auth_bp.route("/api/auth/verify-otp", methods=["POST"])
def verify_otp_handler():
    data = request.json
    phone = data.get("phone")
    code = data.get("code")

    otp = OTP.query.filter_by(phone=phone).first()
    
    if not otp or otp.code != code:
        return jsonify({"error": "Invalid OTP"}), 400
    
    if datetime.utcnow() > otp.expires_at:
        return jsonify({"error": "OTP Expired"}), 400

    # User handling
    user = User.query.filter_by(phone=phone).first()
    is_new = False
    if not user:
        is_new = True
        user = User(phone=phone, name=f"User {phone[-4:]}")
        db.session.add(user)
    
    # Auto-link doctor if matching phone
    if is_new or not user.doctor_profile:
        clean_phone = phone[-10:] # simple suffix match
        doc = Doctor.query.filter(Doctor.phone.ilike(f"%{clean_phone}")).first()
        if doc and not doc.user_id:
            user.role = "doctor"
            user.name = doc.name
            doc.user_id = user.id # Link will happen on commit as user.id generation needs flush, handled by SQLAlchemy session usually
            # But safe to set relationship
            user.doctor_profile = doc
            
    db.session.delete(otp) # Consume OTP
    db.session.commit()

    return jsonify({
        "success": True,
        "user": {
            "id": user.id,
            "name": user.name,
            "role": user.role
        }
    })
