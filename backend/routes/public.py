from flask import Blueprint, render_template
from backend.models.doctor import Doctor

public_bp = Blueprint("public", __name__)

@public_bp.route("/")
def home():
    return render_template("home.html")

@public_bp.route("/doctor/<id>")
def doctor_detail(id):
    doctor = Doctor.query.get_or_404(id)
    return render_template("doctor_detail.html", doctor=doctor)

@public_bp.route("/doctors/<city>/<area>/<specialty>")
def seo_list(city, area, specialty):
    doctors = Doctor.query.filter_by(
        city=city, area=area, specialty=specialty, verified=True
    ).all()
    return render_template("seo_list.html", doctors=doctors)
