from flask import Blueprint, render_template, jsonify
from backend.models.doctor import Doctor

public_bp = Blueprint("public", __name__)

@public_bp.route("/")
def home():
    return render_template("home.html")

@public_bp.route("/doctor/login")
def doctor_login():
    """Doctor login page"""
    return render_template("doctor_login.html")

@public_bp.route("/doctor/register")
def doctor_register():
    """Doctor registration page"""
    return render_template("doctor_register.html")

@public_bp.route("/doctor/<id>")
def doctor_detail(id):
    doctor = Doctor.query.get_or_404(id)
    return render_template("doctor_detail.html", doctor=doctor)

@public_bp.route("/api/doctor/<id>")
def doctor_api(id):
    """Get doctor details via API"""
    doctor = Doctor.query.get_or_404(id)
    return jsonify(doctor.to_public_dict())

@public_bp.route("/api/doctor/<id>/contact")
def doctor_contact(id):
    """
    Get masked contact number for a doctor.
    Returns business_mobile if available, otherwise masked personal_mobile.
    """
    doctor = Doctor.query.get_or_404(id)
    
    if doctor.business_mobile:
        # Admin has assigned a business number
        contact = doctor.business_mobile
    elif doctor.personal_mobile:
        # Mask personal number (show first 3 and last 3 digits)
        phone = doctor.personal_mobile
        if len(phone) >= 10:
            masked = f"{phone[:3]}{'X' * (len(phone) - 6)}{phone[-3:]}"
        else:
            masked = "X" * len(phone)
        contact = masked
    else:
        # Fallback to legacy phone (also masked)
        phone = doctor.phone or ""
        if len(phone) >= 10:
            masked = f"{phone[:3]}{'X' * (len(phone) - 6)}{phone[-3:]}"
        else:
            masked = "Contact admin"
        contact = masked
    
    return jsonify({
        "doctor_id": id,
        "contact_number": contact,
        "is_business_number": bool(doctor.business_mobile)
    })

@public_bp.route("/doctors/<city>/<area>/<specialty>")
def seo_list(city, area, specialty):
    doctors = Doctor.query.filter_by(
        city=city, area=area, specialty=specialty, verified=True
    ).all()
    return render_template("seo_list.html", doctors=doctors)
