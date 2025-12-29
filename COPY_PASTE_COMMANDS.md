# COPY-PASTE COMMANDS FOR PYTHONANYWHERE

## ⚠️ IMPORTANT: Execute these commands in order

---

## STEP 1: Delete Old Files

**Open PythonAnywhere Bash Console and paste:**

```bash
cd ~
rm -rf ~/Directory
echo "✅ Old files deleted"
```

---

## STEP 2: Upload File

1. Go to **Files** tab in PythonAnywhere
2. Click **Upload a file**
3. Upload: `samd-fresh-deploy.zip` (from your Desktop/samd-directory folder)
4. Wait for upload to complete

---

## STEP 3: Extract and Setup

**In Bash console, paste ALL of this:**

```bash
cd ~
unzip -o samd-fresh-deploy.zip -d Directory/
mkvirtualenv --python=/usr/bin/python3.10 samd-env
workon samd-env
cd ~/Directory
pip install -r backend/requirements.txt
python backend/init_db.py
python backend/seed.py
echo "✅ Setup complete!"
```

---

## STEP 4: Update WSGI File

1. Go to **Web** tab
2. Click **WSGI configuration file** link
3. **DELETE ALL** existing content
4. **PASTE THIS:**

```python
import sys
import os

path = '/home/szk008/Directory'
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

## STEP 5: Set Static Files

In **Web** tab → **Static files** section:

**If mappings already exist, leave them. If not, add:**

| URL | Directory |
|-----|-----------|
| `/` | `/home/szk008/Directory/web` |
| `/admin` | `/home/szk008/Directory/admin_panel` |

---

## STEP 6: Reload

1. In **Web** tab
2. Click the big green **Reload szk008.pythonanywhere.com** button
3. Wait 20 seconds

---

## STEP 7: Test

Open these URLs:

- https://szk008.pythonanywhere.com/
- https://szk008.pythonanywhere.com/api/search?query=doctor
- https://szk008.pythonanywhere.com/admin/admin.html

---

## ✅ Done!

If you see errors, check the **Error log** in Web tab.
