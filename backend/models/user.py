from datetime import datetime
from backend.database import db

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String, unique=True, nullable=False)
    name = db.Column(db.String)
    role = db.Column(db.String, default="user")  # 'user', 'doctor', 'admin'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to doctor profile if exists
    doctor_profile = db.relationship("Doctor", backref="user", uselist=False)
