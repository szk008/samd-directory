import sqlite3
import os

def migrate():
    db_path = os.path.join('instance', 'samd.db')
    if not os.path.exists(db_path):
        # Fallback to root just in case
        if os.path.exists('samd.db'):
            db_path = 'samd.db'
        else:
            print(f"Database samd.db not found in root or instance/.")
            return

    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    columns = [
        ('district', 'TEXT'),
        ('city', 'TEXT'),
        ('pincode', 'TEXT'),
        ('normalized_qualification', 'TEXT'),
        ('data_issues', 'TEXT')
    ]
    
    for col, dtype in columns:
        try:
            c.execute(f"ALTER TABLE doctor ADD COLUMN {col} {dtype}")
            print(f"Added column {col}")
        except sqlite3.OperationalError as e:
            if 'duplicate column name' in str(e):
                print(f"Column {col} already exists")
            else:
                print(f"Error adding {col}: {e}")
                
    conn.commit()
    conn.close()

if __name__ == '__main__':
    migrate()
