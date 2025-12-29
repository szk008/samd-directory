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
    
    phone = db.Column(db.String)  # Legacy - being replaced by personal_mobile
    whatsapp = db.Column(db.String)
    
    # Privacy-enhanced contact fields
    personal_mobile = db.Column(db.String, unique=True)  # For authentication & private contact
    business_mobile = db.Column(db.String)  # Public-facing masked number
    
    # Doctor profile fields
    degree = db.Column(db.String)  # e.g., "MBBS", "BDS", "BAMS"
    
    # Location fields
    city = db.Column(db.String)
    area = db.Column(db.String)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    last_location_update = db.Column(db.DateTime)  # Track when doctor last updated location
    
    # Registration tracking
    self_registered = db.Column(db.Boolean, default=False)  # True if doctor added themselves

    clinic_name = db.Column(db.String)
    profile_photo_url = db.Column(db.String)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "specialty": self.specialty,
            "degree": self.degree,
            "experience_years": self.experience_years,
            "rating": self.rating,
            "review_count": self.review_count,
            "verified": self.verified,
            "phone": self.phone,  # Legacy
            "whatsapp": self.whatsapp,
            "city": self.city,
            "area": self.area,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "clinic_name": self.clinic_name,
            "profile_photo_url": self.profile_photo_url,
            "self_registered": self.self_registered
        }
    
    def to_public_dict(self):
        """Public-facing doctor data with masked contact info"""
        return {
            "id": self.id,
            "name": self.name,
            "specialty": self.specialty,
            "degree": self.degree,
            "experience_years": self.experience_years,
            "rating": self.rating,
            "review_count": self.review_count,
            "verified": self.verified,
            "city": self.city,
            "area": self.area,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "clinic_name": self.clinic_name,
            "profile_photo_url": self.profile_photo_url,
            # Contact info is masked - use /api/doctor/<id>/contact to get business number
        }
