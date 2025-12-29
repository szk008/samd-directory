from flask import Blueprint, request, jsonify, abort, current_app
from functools import wraps
from backend.database import db
from backend.models.doctor import Doctor

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")

def require_admin(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.headers.get("X-ADMIN-TOKEN")
        expected = current_app.config.get("ADMIN_TOKEN")
        if not expected or token != expected:
            abort(403)
        return f(*args, **kwargs)
    return wrapper

def validate_doctor(data):
    required = ["name", "specialty", "city", "area"]
    # We allow latitude/longitude to be optional or calculated later, 
    # but strictly speaking strict validation helps.
    # For now, stick to basic 4 required.
    for r in required:
        if r not in data or not data[r]:
            abort(400, f"{r} required")

@admin_bp.route("/doctor", methods=["POST"])
@require_admin
def add_doctor():
    data = request.json
    validate_doctor(data)

    try:
        doctor = Doctor(**data)
        db.session.add(doctor)
        db.session.commit()
        return jsonify({"status": "ok", "id": doctor.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/doctor/<id>", methods=["PATCH"])
@require_admin
def update_doctor(id):
    doctor = Doctor.query.get_or_404(id)
    data = request.json
    
    try:
        for k, v in data.items():
            if hasattr(doctor, k) and k != 'id': 
                setattr(doctor, k, v)
        
        db.session.commit()
        return jsonify({"status": "updated"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
