# SAMD Directory - PythonAnywhere Deployment Guide

## Quick Deploy (After Code Push)

```bash
# 1. Navigate to project
cd ~/samd-directory

# 2. Pull latest code
git pull

# 3. Activate virtual environment
workon samd-env

# 4. Install any new dependencies
pip install PyJWT flask-cors

# 5. Run data migration (one-time)
python backend/migrate_data.py

# 6. Reload web app
# Go to Web tab → Click "Reload" button
```

---

## First-Time Setup

If starting fresh, follow these steps:

### 1. Environment Setup
```bash
# Create virtual environment
mkvirtualenv samd-env --python=python3.10

# Install dependencies
pip install Flask Flask-SQLAlchemy Flask-CORS requests pandas openpyxl PyJWT
```

### 2. Clone Repository
```bash
cd ~
git clone https://github.com/szk008/samd-directory.git
cd samd-directory
```

### 3. Database Initialization
```bash
# Initialize database and import doctors
python backend/seed.py
```

### 4. WSGI Configuration
File: `/var/www/szk008_pythonanywhere_com_wsgi.py`

```python
import sys
import os

# Add project directory
project_home = '/home/szk008/samd-directory'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Set environment
os.environ['DATABASE_URL'] = 'sqlite:///instance/samd.db'

# Import app
from backend.app import app as application

# Initialize database
from backend.database import db
with application.app_context():
    db.create_all()
```

### 5. Static Files Mapping
- URL: `/static`
- Directory: `/home/szk008/samd-directory/web/static`

### 6. Source Code Path
- `/home/szk008/samd-directory`

---

## Post-Deployment Checklist

- [ ] Homepage loads with map
- [ ] Search works
- [ ] Doctor cards appear in bottom sheet
- [ ] Doctor login page accessible
- [ ] Doctor registration page accessible  
- [ ] Admin panel accessible at `/admin`
- [ ] API endpoints respond:
  - `/api/search`
  - `/api/doctor/<id>`
  - `/api/doctor/<id>/contact`
  - `/api/auth/request-otp`

---

## Testing

### 1. Test Homepage
```
https://szk008.pythonanywhere.com/
```
Should show map with doctor pins.

### 2. Test OTP Flow (Dev Mode)
```
https://szk008.pythonanywhere.com/doctor/login
```
OTP will print to console/logs (dev mode).

### 3. Test Admin Panel
```
https://szk008.pythonanywhere.com/admin
```
Requires header: `X-Admin-Token: admin-secret-123`

---

## Troubleshooting

### Database Issues
```bash
# Recreate database
cd ~/samd-directory
python -c "from backend.app import create_app; from backend.database import db; app = create_app(); app.app_context().push(); db.create_all()"

# Re-import data
python backend/seed.py
```

### OTP Not Sending
Check error log. In dev mode, OTP prints to console:
```bash
tail -f /var/log/szk008.pythonanywhere.com.error.log
```

### Static Files Not Loading
Verify static file mapping in Web tab:
- URL: `/static`
- Directory: `/home/szk008/samd-directory/web/static`

---

## Security Notes (Production)

1. **Change Admin Token:**
   Edit `backend/routes/admin.py` and set secure token in environment variable

2. **Enable SMS Gateway:**
   Set in `backend/config.py`:
   ```python
   SMS_GATEWAY_ENABLED = True
   SMS_GATEWAY_API_KEY = 'your-api-key'
   ```

3. **JWT Secret:**
   Set environment variable:
   ```bash
   export JWT_SECRET_KEY='your-secure-secret'
   ```

4. **CORS Origins:**
   Restrict in `backend/config.py`:
   ```python
   CORS_ORIGINS = 'https://yourdomain.com'
   ```
