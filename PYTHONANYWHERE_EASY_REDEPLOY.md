# Easy PythonAnywhere Redeployment Guide

## 🎯 Goal
Remove all old files and upload fresh code to PythonAnywhere

---

## Step 1: Create Fresh Deployment Package (On Your PC)

Open PowerShell in `samd-directory`:

```powershell
# Create clean zip with only needed files
Compress-Archive -Path "backend","web","admin_panel" -DestinationPath "samd-fresh-deploy.zip" -Force
```

**Result:** You now have `samd-fresh-deploy.zip` ready to upload.

---

## Step 2: Remove Old Files (On PythonAnywhere)

### Method A: Delete Entire Directory (Easiest ⭐ Recommended)

1. Log in to **PythonAnywhere**
2. Open a **Bash console**
3. Run these commands:

```bash
# Stop using the directory
cd ~

# Remove entire old Directory folder
rm -rf ~/Directory

# Verify it's gone
ls -la ~
```

✅ **All old files are now deleted!**

### Method B: Delete Specific Folders (If you want to keep some files)

```bash
cd ~/Directory

# Remove only code folders
rm -rf backend/
rm -rf web/
rm -rf admin_panel/

# Keep database if you want
# If you want fresh database too:
rm -rf instance/
```

---

## Step 3: Upload New Files

### Option A: Upload via Web Interface (Easiest)

1. Go to **Files** tab in PythonAnywhere
2. Click **Upload a file**
3. Select `samd-fresh-deploy.zip`
4. Wait for upload to complete
5. Open **Bash console** and run:

```bash
cd ~
unzip -o samd-fresh-deploy.zip -d Directory/
```

### Option B: Use Git (If your code is on GitHub)

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/samd-directory.git Directory
```

---

## Step 4: Set Up Environment (Fresh Install)

In the **Bash console**:

```bash
# Create virtual environment
mkvirtualenv --python=/usr/bin/python3.10 samd-env

# It auto-activates. If not, run:
workon samd-env

# Install dependencies
cd ~/Directory
pip install -r backend/requirements.txt
```

---

## Step 5: Initialize Database

```bash
cd ~/Directory

# Create new database
python backend/init_db.py

# Add sample data (optional)
python backend/seed.py
```

---

## Step 6: Configure Web App

### Update WSGI File

1. Go to **Web** tab
2. Click **WSGI configuration file** link
3. Replace ALL content with:

```python
import sys
import os

# Add project path
path = '/home/szk008/Directory'
if path not in sys.path:
    sys.path.insert(0, path)

# Activate virtualenv
activate_this = '/home/szk008/.virtualenvs/samd-env/bin/activate_this.py'
with open(activate_this) as file_:
    exec(file_.read(), dict(__file__=activate_this))

# Import app
from backend.app import app as application

# Initialize database
with application.app_context():
    from backend.database import db
    db.create_all()
```

4. **Save** (Ctrl+S)

### Set Static Files

In **Web** tab, **Static files** section:

| URL | Directory |
|-----|-----------|
| `/` | `/home/szk008/Directory/web` |
| `/admin` | `/home/szk008/Directory/admin_panel` |

---

## Step 7: Reload and Test

1. In **Web** tab, click big green **Reload** button
2. Wait 10-20 seconds
3. Test your site:
   - Main site: `https://szk008.pythonanywhere.com/`
   - API: `https://szk008.pythonanywhere.com/api/search?query=doctor`
   - Admin: `https://szk008.pythonanywhere.com/admin/admin.html`

---

## 🚨 If Something Goes Wrong

### Check Error Log

In **Web** tab, click **Error log** link to see what went wrong.

### Common Fixes

**"No module named 'backend'"**
```bash
# Check WSGI file has correct path: /home/szk008/Directory
```

**"Database locked"**
```bash
cd ~/Directory
rm instance/samd.db
python backend/init_db.py
```

**"500 Internal Server Error"**
- Check error log
- Make sure you clicked Reload
- Verify virtual environment is set in Web tab

---

## ✅ Complete Quick Reference

### On Your PC:
```powershell
cd c:\Users\shahn\Desktop\samd-directory
Compress-Archive -Path "backend","web","admin_panel" -DestinationPath "samd-fresh-deploy.zip" -Force
```

### On PythonAnywhere:
```bash
# Clean slate
rm -rf ~/Directory
cd ~

# Upload samd-fresh-deploy.zip via Files tab, then:
unzip -o samd-fresh-deploy.zip -d Directory/

# Setup
mkvirtualenv --python=/usr/bin/python3.10 samd-env
cd ~/Directory
pip install -r backend/requirements.txt
python backend/init_db.py

# Then: Update WSGI file → Reload web app
```

---

## 💡 Pro Tip: One-Line Nuclear Option

If you want to completely start fresh:

```bash
cd ~ && rm -rf ~/Directory && rm -rf ~/.virtualenvs/samd-env
```

Then follow all steps from Step 3 onwards.
