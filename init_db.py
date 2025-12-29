"""
ONE-TIME DATABASE INITIALIZATION SCRIPT
Run this manually on PythonAnywhere console to create the database.
DO NOT run automatically - this is for manual setup only.

Usage on PythonAnywhere:
1. cd /home/szk008/samd-directory
2. workon samd-env
3. python init_db.py
"""

from backend.app import app
from backend.database import db

print("Creating database schema...")

with app.app_context():
    db.create_all()
    print("✅ Database created successfully at backend/samd.db")
    print("Tables created:")
    for table in db.metadata.sorted_tables:
        print(f"  - {table.name}")

print("\nDone! You can now reload your web app.")
