# Git-Based Deployment (BEST METHOD!)

Since you already have GitHub, this is the cleanest way!

## 📤 Part 1: Push to GitHub (On Your PC)

### Step 1: Add and Commit Changes

```powershell
cd c:\Users\shahn\Desktop\samd-directory

# Add all files
git add backend/ web/ admin_panel/ "S. A. M. D CONTACT INFORMATION (version 2.0).xlsx"

# Commit
git commit -m "Updated backend structure with real data import"

# Push to GitHub
git push origin main
```

---

## 📥 Part 2: Deploy on PythonAnywhere (One-Time Setup)

### Step 1: Clean Old Files (Bash Console)

```bash
cd ~
rm -rf samd-directory
rm -rf ~/.virtualenvs/samd-env
```

### Step 2: Clone from GitHub

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/samd-directory.git samd-directory
```

### Step 3: Setup Environment

```bash
mkvirtualenv --python=/usr/bin/python3.10 samd-env
workon samd-env
cd ~/samd-directory
pip install flask flask-sqlalchemy flask-cors requests pandas openpyxl
```

### Step 4: Import Data

```bash
cd ~/samd-directory
python -c "
import sys
sys.path.insert(0, '/home/szk008/samd-directory')
from backend.seed import seed_from_excel
from backend.app import app
from backend.database import db
with app.app_context():
    db.create_all()
    seed_from_excel()
"
```

### Step 5: Configure Web App

**WSGI file** (Web tab):
```python
import sys
import os

path = '/home/szk008/samd-directory'
if path not in sys.path:
    sys.path.insert(0, path)

activate_this = '/home/szk008/.virtualenvs/samd-env/bin/activate_this.py'
with open(activate_this) as file_:
    exec(file_.read(), dict(__file__=activate_this))

from backend.app import app as application

with application.app_context():
    from backend.database import db
    db.create_all()
```

**Paths:**
- Source code: `/home/szk008/samd-directory`
- Working directory: `/home/szk008/samd-directory`
- Virtualenv: `/home/szk008/.virtualenvs/samd-env`

**Static files:**
| URL | Directory |
|-----|-----------|
| `/static` | `/home/szk008/samd-directory/web/static` |

### Step 6: Reload

Click green **Reload** button.

---

## 🔄 FUTURE UPDATES (Super Easy!)

When you make changes locally:

**On PC:**
```powershell
git add .
git commit -m "Your changes"
git push
```

**On PythonAnywhere:**
```bash
cd ~/samd-directory
git pull
# Reload web app from Web tab
```

That's it! No zip files needed ever again! 🚀

---

## ✅ Benefits of Git Method

- ✅ One command to update: `git pull`
- ✅ Track all changes
- ✅ Can rollback if needed
- ✅ No manual file uploads
- ✅ Professional workflow
