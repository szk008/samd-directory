"""
Data Migration Script for SAMD Directory
Backfills existing doctor records with new privacy and tracking fields.
Run this once after deploying the new schema.
"""

import sys
sys.path.insert(0, '.')

from backend.app import create_app
from backend.database import db
from backend.models.doctor import Doctor
from datetime import datetime

def migrate_existing_doctors():
    """Backfill existing doctors with new fields"""
    app = create_app()
    
    with app.app_context():
        doctors = Doctor.query.all()
        count = len(doctors)
        
        print(f"Found {count} doctors to migrate...")
        
        updated = 0
        for doctor in doctors:
            # Backfill personal_mobile from phone if not set
            if not doctor.personal_mobile and doctor.phone:
                doctor.personal_mobile = doctor.phone
                updated += 1
            
            # Set self_registered flag
            if doctor.self_registered is None:
                doctor.self_registered = False  # Assume existing doctors were admin-added
            
            # Set last_location_update
            if not doctor.last_location_update and (doctor.latitude or doctor.longitude):
                doctor.last_location_update = datetime.utcnow()
        
        db.session.commit()
        
        print(f"✅ Migrated {count} doctors")
        print(f"   - {updated} had personal_mobile backfilled from phone")
        print(f"   - All marked as admin-added (self_registered=False)")
        print(f"   - Location timestamps set for {sum(1 for d in doctors if d.latitude)}")
        
        # Summary
        verified_count = Doctor.query.filter_by(verified=True).count()
        unverified_count = Doctor.query.filter_by(verified=False).count()
        
        print(f"\n📊 Current Status:")
        print(f"   Total: {count}")
        print(f"   Verified: {verified_count}")
        print(f"   Pending: {unverified_count}")

if __name__ == "__main__":
    migrate_existing_doctors()
