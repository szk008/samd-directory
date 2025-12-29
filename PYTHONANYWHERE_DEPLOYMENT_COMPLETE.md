# Complete PythonAnywhere Deployment Guide

## Overview

This guide will help you deploy the SAMD Directory backend to PythonAnywhere from scratch or update an existing deployment.

---

## Part 1: Prepare Local Files for Upload

### Step 1: Create Deployment Package

From `samd-directory` folder in PowerShell:

```powershell
# Create a clean deployment folder
New-Item -ItemType Directory -Path "deploy_package" -Force

# Copy backend files
Copy-Item -Path "backend" -Destination "deploy_package\backend" -Recurse

# Copy web files
Copy-Item -Path "web" -Destination "deploy_package\web" -Recurse

# Copy requirements
Copy-Item -Path "backend\requirements.txt" -Destination "deploy_package\requirements.txt"

# Copy admin panel
Copy-Item -Path "admin_panel" -Destination "deploy_package\admin_panel" -Recurse

# Create zip for upload
Compress-Archive -Path "deploy_package\*" -DestinationPath "samd-deploy.zip" -Force
```

**Result:** You now have `samd-deploy.zip` ready to upload.

---

## Part 2: Upload to PythonAnywhere

### Option A: Upload via Web Interface

1. **Log in** to [PythonAnywhere](https://www.pythonanywhere.com)
2. Go to **Files** tab
3. Navigate to `/home/szk008/`
4. Click **Upload a file**
5. Select `samd-deploy.zip`
6. Wait for upload to complete

### Option B: Upload via Git (Recommended)

If your code is on GitHub:

```bash
# In PythonAnywhere Bash console
cd ~
git clone https://github.com/yourusername/samd-directory.git Directory
```

Or update existing:

```bash
cd ~/Directory
git pull origin main
```

---

## Part 3: Extract and Setup on PythonAnywhere

### Open a Bash Console

From PythonAnywhere Dashboard → **Consoles** → **Bash**

### Step 1: Extract Files (if uploaded zip)

```bash
cd ~
unzip -o samd-deploy.zip -d Directory/
```

### Step 2: Verify File Structure

```bash
cd ~/Directory
ls -la
```

Expected structure:
```
/home/szk008/Directory/
├── backend/
│   ├── app.py
│   ├── __init__.py
│   ├── config.py
│   ├── database.py
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── templates/
│   └── requirements.txt
├── web/
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── images/
└── admin_panel/
    └── admin.html
```

### Step 3: Create Virtual Environment

```bash
# Create virtualenv with Python 3.10
mkvirtualenv --python=/usr/bin/python3.10 samd-env

# Activate it (should auto-activate after creation)
workon samd-env
```

### Step 4: Install Dependencies

```bash
cd ~/Directory
pip install --upgrade pip
pip install -r backend/requirements.txt
```

Required packages:
- Flask
- Flask-SQLAlchemy
- Flask-CORS
- requests
- cloudinary (if using image uploads)
- twilio (if using OTP)

### Step 5: Initialize Database

```bash
cd ~/Directory
python backend/init_db.py
```

This will:
- Create `instance/samd.db`
- Set up all tables (doctors, users, otps, etc.)

### Step 6: (Optional) Seed Database

```bash
python backend/seed.py
```

This adds sample doctor data.

---

## Part 4: Configure Web App

### Step 1: Create/Edit Web App

1. Go to **Web** tab in PythonAnywhere
2. If no web app exists:
   - Click **Add a new web app**
   - Choose **Manual configuration**
   - Select **Python 3.10**
3. If web app exists, continue to next step

### Step 2: Configure Source Code

In the **Web** tab:

**Source code:** `/home/szk008/Directory`

**Working directory:** `/home/szk008/Directory`

### Step 3: Configure Virtual Environment

In the **Virtualenv** section:

**Path:** `/home/szk008/.virtualenvs/samd-env`

### Step 4: Edit WSGI Configuration File

Click the **WSGI configuration file** link (e.g., `/var/www/szk008_pythonanywhere_com_wsgi.py`)

**Replace entire content with:**

```python
import sys
import os

# Add your project directory to sys.path
path = '/home/szk008/Directory'
if path not in sys.path:
    sys.path.insert(0, path)

# Activate virtual environment
activate_this = '/home/szk008/.virtualenvs/samd-env/bin/activate_this.py'
with open(activate_this) as file_:
    exec(file_.read(), dict(__file__=activate_this))

# Set Flask configuration
os.environ['FLASK_ENV'] = 'production'

# Import the Flask app
from backend.app import app as application

# Ensure database is initialized
with application.app_context():
    from backend.database import db
    db.create_all()
```

**Save the file** (Ctrl+S or click Save button)

---

## Part 5: Configure Static Files

In the **Web** tab, scroll to **Static files** section:

Add these mappings:

| URL | Directory |
|-----|-----------|
| `/` | `/home/szk008/Directory/web` |
| `/admin` | `/home/szk008/Directory/admin_panel` |
| `/static` | `/home/szk008/Directory/backend/static` |

Click **Add new static file mapping** for each.

---

## Part 6: Environment Variables (If Needed)

If using API keys (Cloudinary, Twilio, etc.):

### Option A: Using .env file

```bash
cd ~/Directory
nano .env
```

Add:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
```

Then update backend code to load from `.env`

### Option B: Using PythonAnywhere environment variables

Not recommended for secrets, but you can add to WSGI file:

```python
os.environ['CLOUDINARY_CLOUD_NAME'] = 'your_value'
```

---

## Part 7: Reload and Test

### Step 1: Reload Web App

In the **Web** tab:
- Click the big green **Reload** button

### Step 2: Check Error Log

If there are issues:
- Click on **Error log** link
- Check for Python errors

### Step 3: Test Endpoints

Open these URLs in browser:

1. **Main site:** `https://szk008.pythonanywhere.com/`
2. **API Search:** `https://szk008.pythonanywhere.com/api/search?query=doctor`
3. **Admin Panel:** `https://szk008.pythonanywhere.com/admin/admin.html`

---

## Part 8: Database Management

### View Database

```bash
cd ~/Directory/instance
sqlite3 samd.db

# In sqlite3:
.tables                    # List all tables
SELECT * FROM doctor;      # View all doctors
SELECT * FROM user;        # View all users
.exit                      # Exit sqlite3
```

### Backup Database

```bash
cd ~/Directory/instance
cp samd.db samd.db.backup-$(date +%Y%m%d)
```

### Reset Database

```bash
cd ~/Directory
rm -f instance/samd.db
python backend/init_db.py
python backend/seed.py
```

---

## Part 9: Update Existing Deployment

When you make code changes:

### Step 1: Upload Changes

Either:
- Upload new zip and extract
- Or use git pull

### Step 2: Update Dependencies (if changed)

```bash
workon samd-env
cd ~/Directory
pip install -r backend/requirements.txt
```

### Step 3: Database Migrations (if schema changed)

```bash
cd ~/Directory
python backend/init_db.py  # Only if adding new tables
```

### Step 4: Reload

- Go to **Web** tab
- Click **Reload**

---

## Part 10: Monitoring and Maintenance

### Check Server Log

```bash
tail -f /var/log/szk008.pythonanywhere.com.server.log
```

### Check Access Log

```bash
tail -f /var/log/szk008.pythonanywhere.com.access.log
```

### Monitor Disk Usage

```bash
du -sh ~/Directory/*
```

### Clear Old Files

```bash
# Remove old zips
rm ~/samd-deploy*.zip

# Remove old backups
find ~/Directory/instance -name "*.backup-*" -mtime +7 -delete
```

---

## Troubleshooting

### Issue 1: "ImportError: No module named 'backend'"

**Solution:**
- Check WSGI file has correct path
- Verify `sys.path.insert(0, path)` is before import

### Issue 2: "Database is locked"

**Solution:**
```bash
cd ~/Directory/instance
fuser samd.db  # Find processes using DB
# Reload web app
```

### Issue 3: "500 Internal Server Error"

**Solution:**
- Check error log: `/var/log/szk008.pythonanywhere.com.error.log`
- Common causes:
  - Missing dependencies
  - Incorrect file paths
  - Database not initialized

### Issue 4: "Static files not loading"

**Solution:**
- Verify static file mappings in Web tab
- Check file permissions:
```bash
chmod -R 755 ~/Directory/web
```

### Issue 5: "CORS errors from mobile app"

**Solution:**

Update `backend/app.py`:
```python
from flask_cors import CORS

CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

---

## Quick Reference Commands

```bash
# Activate environment
workon samd-env

# Navigate to project
cd ~/Directory

# Update code (if using git)
git pull

# Install/update dependencies
pip install -r backend/requirements.txt

# Check database
sqlite3 instance/samd.db

# View logs
tail -f /var/log/szk008.pythonanywhere.com.error.log

# After changes, reload from Web tab UI
```

---

## Security Checklist

- [ ] Changed default admin password
- [ ] API keys stored securely (not in code)
- [ ] Debug mode disabled in production
- [ ] Database backed up regularly
- [ ] CORS configured properly
- [ ] HTTPS enabled (automatic on PythonAnywhere)

---

## Performance Tips

1. **Enable Gzip Compression**
   - Automatically enabled by PythonAnywhere

2. **Optimize Database Queries**
   - Add indexes for frequently searched fields
   - Use pagination for large result sets

3. **Cache Static Assets**
   - PythonAnywhere handles this automatically

4. **Monitor Account Usage**
   - Check CPU usage in Dashboard
   - Upgrade plan if needed for more requests/day

---

## Next Steps After Deployment

1. ✅ Test all API endpoints
2. ✅ Verify mobile app can connect
3. ✅ Test admin panel functionality
4. ✅ Add real doctor data
5. ✅ Set up regular database backups
6. ✅ Monitor error logs for issues
7. ✅ Update DNS if using custom domain

---

## Support

- **PythonAnywhere Help:** https://help.pythonanywhere.com
- **Forums:** https://www.pythonanywhere.com/forums/
- **Email:** support@pythonanywhere.com
