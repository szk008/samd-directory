from datetime import datetime
from backend.database import db

class OTP(db.Model):
    __tablename__ = "otps"

    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String, nullable=False, index=True)
    code = db.Column(db.String, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
