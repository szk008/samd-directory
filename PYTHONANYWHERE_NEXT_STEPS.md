# ✅ Files Extracted Successfully! 

## Current Status:
✅ Clean structure deployed:
- `admin_panel/`
- `backend/`
- `web/`

---

## 📋 Next Steps - Copy & Paste These Commands:

### Step 1: Set Up Virtual Environment & Install Dependencies

**Copy-paste this entire block in Bash console:**

```bash
cd ~/samd-directory
mkvirtualenv --python=/usr/bin/python3.10 samd-env
workon samd-env
pip install -r backend/requirements.txt
python backend/init_db.py
python backend/seed.py
echo "✅ Environment setup complete!"
```

---

### Step 2: Update WSGI Configuration

1. Go to **Web** tab in PythonAnywhere
2. Click **WSGI configuration file** link
3. **DELETE ALL** existing content
4. **PASTE THIS:**

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

5. Click **Save**

---

### Step 3: Configure Static Files

In **Web** tab → **Static files** section:

**Delete any old mappings, then add these:**

| URL | Directory |
|-----|-----------|
| `/static` | `/home/szk008/samd-directory/web/static` |

---

### Step 4: Set Source Code Path

In **Web** tab → **Code** section:

**Source code:** `/home/szk008/samd-directory`

**Working directory:** `/home/szk008/samd-directory`

---

### Step 5: Set Virtual Environment

In **Web** tab → **Virtualenv** section:

**Path:** `/home/szk008/.virtualenvs/samd-env`

---

### Step 6: Reload Web App

In **Web** tab:
- Click big green **Reload** button
- Wait 20 seconds

---

### Step 7: Test!

Open these URLs:
- https://szk008.pythonanywhere.com/
- https://szk008.pythonanywhere.com/api/search?query=doctor

---

## 🚨 If Errors Occur:

Check **Error log** in Web tab for details.

Common fixes:
- Ensure WSGI path is `/home/szk008/samd-directory` (not `Directory`)
- Verify virtualenv path is correct
- Check all static file mappings
