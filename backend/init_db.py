"""
Database initialization script
Creates tables and seeds initial admin user
"""
import os
import sys
from backend.app import app
from backend.database import db
from backend.models.user import User
from backend.models.doctor import Doctor, SearchIndex

def init_db():
    """Initialize database and create tables"""
    with app.app_context():
        # Create all tables
        db.create_all()
        print("✓ Database tables created successfully")
        
        # Check if admin exists
        admin = User.query.filter_by(role='admin').first()
        
        if not admin:
            # Create default admin user
            admin = User(
                email='admin@samd.com',
                phone='+919876543210',
                name='SAMD Admin',
                role='admin'
            )
            admin.set_password('admin123')  # CHANGE IN PRODUCTION
            
            db.session.add(admin)
            db.session.commit()
            
            print("✓ Default admin user created")
            print("  Email: admin@samd.com")
            print("  Password: admin123")
            print("  ⚠️  CHANGE PASSWORD IN PRODUCTION!")
        else:
            print("✓ Admin user already exists")

if __name__ == '__main__':
    init_db()
