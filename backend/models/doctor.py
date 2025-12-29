import uuid
from backend.database import db

class Doctor(db.Model):
    __tablename__ = "doctors"

    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String, nullable=False)
    specialty = db.Column(db.String, nullable=False)
    experience_years = db.Column(db.Integer)
    rating = db.Column(db.Float, default=0)
    review_count = db.Column(db.Integer, default=0)
    verified = db.Column(db.Boolean, default=False)
    
    # Link to User
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    phone = db.Column(db.String)
    whatsapp = db.Column(db.String)

    city = db.Column(db.String)
    area = db.Column(db.String)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)

    clinic_name = db.Column(db.String)
    profile_photo_url = db.Column(db.String)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "specialty": self.specialty,
            "experience_years": self.experience_years,
            "rating": self.rating,
            "review_count": self.review_count,
            "verified": self.verified,
            "phone": self.phone,
            "whatsapp": self.whatsapp,
            "city": self.city,
            "area": self.area,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "clinic_name": self.clinic_name,
            "profile_photo_url": self.profile_photo_url
        }
