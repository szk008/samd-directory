"""
Database migration to add email and google_sub fields to doctors table.
Also renames otp_sessions to auth_sessions for unified auth.
"""

import sys
sys.path.insert(0, '.')

from backend.app import app
from backend.database import db

def migrate():
    """Add email and Google OAuth support to doctors table"""
    
    with app.app_context():
        print("Running database migration...")
        
        # Add email and google_sub columns
        try:
            db.session.execute('ALTER TABLE doctors ADD COLUMN email TEXT UNIQUE')
            print("✅ Added email column")
        except Exception as e:
            print(f"⚠️  Email column might already exist: {e}")
        
        try:
            db.session.execute('ALTER TABLE doctors ADD COLUMN google_sub TEXT UNIQUE')
            print("✅ Added google_sub column")
        except Exception as e:
            print(f"⚠️  google_sub column might already exist: {e}")
        
        # Rename otp_sessions to auth_sessions for unified auth
        try:
            db.session.execute('ALTER TABLE otp_sessions RENAME TO auth_sessions')
            print("✅ Renamed otp_sessions to auth_sessions")
        except Exception as e:
            print(f"⚠️  Table rename might have already happened: {e}")
        
        # Add method column to track auth type
        try:
            db.session.execute('ALTER TABLE auth_sessions ADD COLUMN method TEXT DEFAULT "otp"')
            print("✅ Added method column to auth_sessions")
        except Exception as e:
            print(f"⚠️  Method column might already exist: {e}")
        
        db.session.commit()
        print("\n✅ Migration complete!")
        print("\nDoctor table now supports:")
        print("  - personal_mobile (for OTP)")
        print("  - email (for Magic Link)")
        print("  - google_sub (for Google OAuth)")
        print("\nNote: personal_mobile is REQUIRED for all doctors")

if __name__ == "__main__":
    migrate()
