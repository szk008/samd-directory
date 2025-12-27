from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
import json
import re
import os
from datetime import datetime

# Initialize Extension
db = SQLAlchemy()

# --- Models ---
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100))
    role = db.Column(db.String(20), default='doctor') # 'doctor', 'admin'
    is_active = db.Column(db.Boolean, default=True)

class Doctor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True) # Linked to User account
    
    # Directory Data
    original_id = db.Column(db.Integer) # ID from original data.js
    name = db.Column(db.String(100), nullable=False)
    qualification = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    hospital = db.Column(db.String(200))
    address = db.Column(db.Text)
    specialty = db.Column(db.String(50))
    sub_specialty = db.Column(db.String(100)) # e.g. "Spine Surgeon" from Orthopedic
    
    # Coordinates
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    
    # Metadata
    subscription_tier = db.Column(db.String(20), default='basic')
    verified = db.Column(db.Boolean, default=False)
    featured = db.Column(db.Boolean, default=False)
    
    # Validation & Structured Data
    district = db.Column(db.String(50))
    city = db.Column(db.String(50)) # Area/City
    pincode = db.Column(db.String(10))
    normalized_qualification = db.Column(db.String(50))
    data_issues = db.Column(db.Text) # JSON or Text of flagged issues
    
    user = db.relationship('User', backref=db.backref('doctor_profile', uselist=False))

class OTP(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(20), nullable=False)
    code = db.Column(db.String(6), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)

class PendingDoctor(db.Model):
    """Doctors awaiting admin approval"""
    __tablename__ = 'pending_doctors'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    specialty = db.Column(db.String(100), nullable=False)
    hospital = db.Column(db.String(300))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    address = db.Column(db.Text)
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    qualification = db.Column(db.Text)
    experience_years = db.Column(db.Integer)
    
    # Submission metadata
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    submitted_by_phone = db.Column(db.String(20))
    submitted_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    
    # Approval status
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    reviewed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    review_notes = db.Column(db.Text, nullable=True)
    
    subscription_tier = db.Column(db.String(20), default='free')


# --- Migration Logic ---
def setup_database(app):
    with app.app_context():
        db.create_all()
        
        # Check if we need to seed data
        if Doctor.query.count() == 0:
            print("Seeding database from js/data.js...")
            import_data_js()
            create_default_admin()
        else:
            print("Database already exists.")

def import_data_js():
    try:
        with open('js/data.js', 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Regex to parse the JavaScript object literals
        # This is robust enough for the specific format in data.js
        pattern = r'\{\s*id:\s*(\d+),\s*name:\s*"([^"]+)",\s*qualification:\s*"([^"]*)",\s*phone:\s*"([^"]+)",\s*hospital:\s*"([^"]*)",\s*address:\s*"([^"]*)",\s*specialty:\s*"([^"]+)",\s*lat:\s*([\d.-]+),\s*lng:\s*([\d.-]+)(?:,\s*verified:\s*(true|false))?(?:,\s*subscriptionTier:\s*"([^"]+)")?(?:,\s*featured:\s*(true|false))?'
        
        matches = re.finditer(pattern, content)
        count = 0
        
        for m in matches:
            original_id = int(m.group(1))
            name = m.group(2)
            qualification = m.group(3)
            phone = m.group(4)
            hospital = m.group(5)
            address = m.group(6)
            specialty = m.group(7)
            lat = float(m.group(8))
            lng = float(m.group(9))
            verified = m.group(10) == 'true'
            tier = m.group(11) if m.group(11) else 'basic'
            featured = m.group(12) == 'true'
            
            # create Doctor entry
            doc = Doctor(
                original_id=original_id,
                name=name,
                qualification=qualification,
                phone=phone,
                hospital=hospital,
                address=address,
                specialty=specialty,
                lat=lat,
                lng=lng,
                subscription_tier=tier,
                verified=verified,
                featured=featured
            )
            db.session.add(doc)
            
            # Create a corresponding User account automatically
            # Only if phone number is valid (simple check)
            clean_phone = re.sub(r'[^\d]', '', phone)
            if len(clean_phone) >= 10:
                # Check if user exists (duplicates sharing phone)
                existing_user = User.query.filter_by(phone=clean_phone).first()
                if not existing_user:
                    user = User(phone=clean_phone, name=name, role='doctor')
                    db.session.add(user)
                    db.session.flush() # get ID
                    doc.user_id = user.id
                else:
                    doc.user_id = existing_user.id
            
            count += 1
            
        db.session.commit()
        print(f"Imported {count} doctors.")
        
    except Exception as e:
        print(f"Error importing data: {e}")
        db.session.rollback()

def create_default_admin():
    # Create a default admin account
    # Phone: 9879520091 (Dr. Shahnavaz Kanuga)
    admin_phone = "9879520091"
    if not User.query.filter_by(phone=admin_phone).first():
        admin = User(phone=admin_phone, name="Dr. Shahnavaz Kanuga", role="admin")
        db.session.add(admin)
        db.session.commit()
        print(f"Created Default Admin (Phone: {admin_phone})")

if __name__ == "__main__":
    # For standalone testing
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///samd.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    setup_database(app)
