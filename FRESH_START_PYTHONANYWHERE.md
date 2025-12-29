# Fresh PythonAnywhere Setup - Complete Reset

## 🧹 Part 1: Clean Everything (PythonAnywhere Bash Console)

### Step 1: Delete All Old Files

```bash
# Go to home directory
cd ~

# Delete old project directory
rm -rf samd-directory

# Delete old virtual environment
rm -rf ~/.virtualenvs/samd-env

# List what's left (should be clean)
ls -la
```

---

## 📥 Part 2: Direct Git Clone (No Zip Files!)

### Step 2: Clone from Local or Upload Fresh Files

**Option A: If your code is on GitHub:**
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/samd-directory.git samd-directory
```

**Option B: Manual Upload (What we'll do):**

We'll upload ONLY essential files via PythonAnywhere web interface:
1. Go to **Files** tab
2. Navigate to `/home/szk008/`
3. Create new directory: `samd-directory`
4. Upload these folders one by one:
   - `backend/` folder
   - `web/` folder
   - `admin_panel/` folder
   - `S. A. M. D CONTACT INFORMATION (version 2.0).xlsx` file

---

## 🔧 Part 3: Setup from Scratch

### Step 3: Create Virtual Environment

```bash
cd ~
mkvirtualenv --python=/usr/bin/python3.10 samd-env
```

### Step 4: Install Dependencies

```bash
workon samd-env
cd ~/samd-directory
pip install flask flask-sqlalchemy flask-cors requests pandas openpyxl
```

### Step 5: Initialize Database with Real Data

```bash
cd ~/samd-directory
python -c "
import sys
sys.path.insert(0, '/home/szk008/samd-directory')
from backend.seed import seed_from_excel
from backend.app import app
with app.app_context():
    from backend.database import db
    db.create_all()
    seed_from_excel()
"
```

---

## 🌐 Part 4: Configure Web App

### Step 6: Update WSGI File

Go to **Web** tab → Click **WSGI configuration file** → Replace ALL with:

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

### Step 7: Set Paths in Web Tab

**Source code:** `/home/szk008/samd-directory`

**Working directory:** `/home/szk008/samd-directory`

**Virtualenv:** `/home/szk008/.virtualenvs/samd-env`

### Step 8: Set Static Files

| URL | Directory |
|-----|-----------|
| `/static` | `/home/szk008/samd-directory/web/static` |

### Step 9: Reload

Click the big green **Reload** button.

---

## ✅ Part 5: Test

Visit:
- https://szk008.pythonanywhere.com/
- https://szk008.pythonanywhere.com/api/search?query=doctor

---

## 🎯 Summary

This approach:
- ✅ No zip files - direct folder upload
- ✅ Clean slate - everything deleted first
- ✅ Real data - imports from Excel automatically
- ✅ Proper setup - virtual environment and dependencies

**Total time:** ~10 minutes

---

## 📝 Alternative: Even Simpler Approach

If you want to push to GitHub first, I can help you:
1. Create a GitHub repo
2. Push your local code
3. Then just `git clone` on PythonAnywhere (single command!)

This is the EASIEST way for future updates too. Let me know if you want this!
