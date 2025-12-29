from flask import Blueprint, jsonify
from backend.models.doctor import Doctor

doctor_bp = Blueprint('doctor', __name__)

@doctor_bp.route('/api/doctor/<doctor_id>', methods=['GET'])
def get_doctor(doctor_id):
    doctor = Doctor.query.get_or_404(doctor_id)
    return jsonify(doctor.to_dict())
