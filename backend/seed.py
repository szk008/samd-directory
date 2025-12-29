"""
Comprehensive doctor data import with degree normalization
"""
import uuid
import pandas as pd
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, '/home/szk008/samd-directory')

from backend.app import app
from backend.database import db
from backend.models.doctor import Doctor

# Comprehensive degree to specialty mapping
DEGREE_SPECIALTY_MAP = {
    # Medicine
    'MBBS': 'General Physician',
    'MD': 'Specialist',
    'MS': 'Surgeon',
    'DNB': 'Specialist',
    'DM': 'Super Specialist',
    'MCH': 'Super Specialist',
    
    # Dentistry
    'BDS': 'Dentist',
    'MDS': 'Dental Specialist',
    
    # Ayurveda
    'BAMS': 'Ayurvedic Physician',
    'MD (AYU)': 'Ayurvedic Specialist',
    
    # Homeopathy
    'BHMS': 'Homeopathic Physician',
    'MD (HOM)': 'Homeopathic Specialist',
    
    # Physiotherapy
    'BPT': 'Physiotherapist',
    'B.P.T': 'Physiotherapist',
    'MPT': 'Physiotherapy Specialist',
    
    # Nursing
    'B.SC NURSING': 'Nurse',
    'GNM': 'Nurse',
    
    # Pharmacy
    'B.PHARM': 'Pharmacist',
    'M.PHARM': 'Pharmacist',
    
    # Others
    'BUMS': 'Unani Physician',
    'BNYS': 'Naturopathy & Yoga',
}

# Specialty keywords for advanced detection
SPECIALTY_KEYWORDS = {
    'CARDIO': 'Cardiologist',
    'ORTHO': 'Orthopedic',
    'GYNEC': 'Gynecologist',
    'OBST': 'Gynecologist',
    'PEDIATR': 'Pediatrician',
    'DERMA': 'Dermatologist',
    'ENT': 'ENT Specialist',
    'OPHTHAL': 'Ophthalmologist',
    'NEURO': 'Neurologist',
    'PSYCHI': 'Psychiatrist',
    'RADIO': 'Radiologist',
    'ANESTH': 'Anesthesiologist',
    'PATHOL': 'Pathologist',
    'MICRO': 'Microbiologist',
    'SURG': 'Surgeon',
    'PHYSICIAN': 'General Physician',
}

def normalize_qualification(qual_str):
    """Extract and normalize qualification to specialty"""
    if pd.isna(qual_str) or not qual_str:
        return 'General Physician'
    
    qual_upper = str(qual_str).upper().strip()
    
    # Check specialty keywords first (more specific)
    for keyword, specialty in SPECIALTY_KEYWORDS.items():
        if keyword in qual_upper:
            return specialty
    
    # Check degree mapping
    for degree, specialty in DEGREE_SPECIALTY_MAP.items():
        if degree in qual_upper:
            return specialty
    
    # Default
    return 'General Physician'

def clean_phone(phone):
    """Clean and format phone number"""
    if pd.isna(phone) or not phone:
        return None
    
    phone_str = str(phone).strip()
    # Remove decimal if it's a float string
    phone_str = phone_str.replace('.0', '')
    # Remove spaces and special chars
    phone_str = ''.join(filter(str.isdigit, phone_str))
    
    if len(phone_str) >= 10:
        # Take last 10 digits
        phone_str = phone_str[-10:]
        return f'+91 {phone_str}'
    
    return None

def seed_from_excel():
    """Import doctors from Excel file with normalization"""
    
    try:
        excel_path = '/home/szk008/samd-directory/S. A. M. D CONTACT INFORMATION (version 2.0).xlsx'
        if not os.path.exists(excel_path):
            # Try without space in filename
            excel_path = '/home/szk008/samd-directory/S.A.M.D CONTACT INFORMATION (version 2.0).xlsx'
        
        print(f"Reading Excel file: {excel_path}")
        df = pd.read_excel(excel_path)
        
        print(f"Found {len(df)} doctors in Excel file")
        print(f"Columns: {list(df.columns)}")
        
        count = 0
        errors = 0
        
        for index, row in df.iterrows():
            try:
                # Extract fields
                name = str(row['1. Name']).strip() if pd.notna(row['1. Name']) else None
                if not name or name == 'nan':
                    errors += 1
                    continue
                
                qualification = str(row['4. Qualification ']).strip() if pd.notna(row['4. Qualification ']) else ''
                mobile = clean_phone(row.get('9. Mobile Number'))
                clinic_address = str(row["10. Clinic's address "]).strip() if pd.notna(row.get("10. Clinic's address ")) else ''
                
                # Normalize specialty
                specialty = normalize_qualification(qualification)
                
                # Create doctor record
                doc = Doctor(
                    id=str(uuid.uuid4()),
                    name=name,
                    specialty=specialty,
                    experience_years=5,  # Default
                    rating=4.5,  # Default
                    review_count=0,
                    verified=True,  # All from Excel are verified
                    phone=mobile,
                    whatsapp=mobile,
                    city='Surat',  # Default to Surat
                    area=clinic_address[:100] if clinic_address and clinic_address != 'nan' else 'Surat',
                    latitude=21.1702,  # Surat center
                    longitude=72.8311,  # Surat center
                    clinic_name=clinic_address if clinic_address and clinic_address != 'nan' else f"{name}'s Clinic",
                    profile_photo_url='https://via.placeholder.com/150'
                )
                
                db.session.add(doc)
                count += 1
                
                if count % 50 == 0:
                    print(f"Processed {count} doctors...")
                
            except Exception as e:
                print(f"Error processing row {index} ({name if 'name' in locals() else 'unknown'}): {e}")
                errors += 1
                continue
        
        db.session.commit()
        print(f"\n✅ Successfully imported {count} doctors from Excel!")
        if errors > 0:
            print(f"⚠️ Skipped {errors} records due to errors")
        
        # Show specialty distribution
        print("\n📊 Specialty Distribution:")
        with app.app_context():
            from sqlalchemy import func
            stats = db.session.query(
                Doctor.specialty,
                func.count(Doctor.id)
            ).group_by(Doctor.specialty).order_by(func.count(Doctor.id).desc()).all()
            
            for spec, cnt in stats[:10]:
                print(f"  {spec}: {cnt}")
        
    except Exception as e:
        print(f"❌ Error seeding from Excel: {e}")
        import traceback
        traceback.print_exc()
        db.session.rollback()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        current_count = Doctor.query.count()
        if current_count == 0:
            print("Starting import...")
            seed_from_excel()
        else:
            print(f"Database already has {current_count} doctors.")
            response = input("Do you want to clear and reimport? (yes/no): ")
            if response.lower() == 'yes':
                Doctor.query.delete()
                db.session.commit()
                seed_from_excel()
