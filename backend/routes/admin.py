from flask import Blueprint, request, jsonify, render_template, current_app
from functools import wraps
from backend.database import db
from backend.models.doctor import Doctor
from datetime import datetime

admin_bp = Blueprint("admin", __name__)

def require_admin(f):
    """Simple admin authentication - enhance in production"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        # For now, simple token check
        # In production: use proper admin auth system
        token = request.headers.get("X-Admin-Token")
        expected = current_app.config.get("ADMIN_TOKEN", "admin-secret-123")
        
        if token != expected:
            return jsonify({"error": "Unauthorized"}), 401
        
        return f(*args, **kwargs)
    return wrapper

@admin_bp.route("/admin")
def admin_panel():
    """Admin panel page"""
    return render_template("admin.html")

@admin_bp.route("/api/admin/doctors/pending")
@require_admin
def get_pending_doctors():
    """Get all unverified doctors"""
    doctors = Doctor.query.filter_by(verified=False).all()
    return jsonify([d.to_dict() for d in doctors])

@admin_bp.route("/api/admin/doctors/verified")
@require_admin
def get_verified_doctors():
    """Get all verified doctors"""
    doctors = Doctor.query.filter_by(verified=True).all()
    return jsonify([d.to_dict() for d in doctors])

@admin_bp.route("/api/admin/doctors/all")
@require_admin
def get_all_doctors():
    """Get all doctors"""
    doctors = Doctor.query.all()
    return jsonify([d.to_dict() for d in doctors])

@admin_bp.route("/api/admin/doctor/<id>/verify", methods=["POST"])
@require_admin
def verify_doctor(id):
    """Verify a doctor"""
    doctor = Doctor.query.get_or_404(id)
    doctor.verified = True
    db.session.commit()
    
    return jsonify({
        "success": True,
        "doctor": doctor.to_dict()
    })

@admin_bp.route("/api/admin/doctor/<id>/unverify", methods=["POST"])
@require_admin
def unverify_doctor(id):
    """Unverify a doctor (mark as pending)"""
    doctor = Doctor.query.get_or_404(id)
    doctor.verified = False
    db.session.commit()
    
    return jsonify({
        "success": True,
        "doctor": doctor.to_dict()
    })

@admin_bp.route("/api/admin/doctor/<id>/update", methods=["PUT"])
@require_admin
def admin_update_doctor(id):
    """Admin can update any doctor field, including name"""
    doctor = Doctor.query.get_or_404(id)
    data = request.json
    
    # Admin can change anything
    allowed_fields = [
        'name', 'degree', 'specialty', 'experience_years', 'clinic_name',
        'area', 'city', 'business_mobile', 'verified'
    ]
    
    for field in allowed_fields:
        if field in data:
            setattr(doctor, field, data[field])
    
    db.session.commit()
    
    return jsonify({
        "success": True,
        "doctor": doctor.to_dict()
    })

@admin_bp.route("/api/admin/doctor/<id>", methods=["DELETE"])
@require_admin
def delete_doctor(id):
    """Delete a doctor (soft delete or permanent)"""
    doctor = Doctor.query.get_or_404(id)
    db.session.delete(doctor)
    db.session.commit()
    
    return jsonify({"success": True})

@admin_bp.route("/api/admin/stats")
@require_admin
def get_stats():
    """Get dashboard statistics"""
    total = Doctor.query.count()
    verified = Doctor.query.filter_by(verified=True).count()
    self_registered = Doctor.query.filter_by(self_registered=True).count()
    with_business_numbers = Doctor.query.filter(Doctor.business_mobile.isnot(None)).count()
    
    return jsonify({
        "total": total,
        "verified": verified,
        "pending": total - verified,
        "self_registered": self_registered,
        "with_business_numbers": with_business_numbers
    })
