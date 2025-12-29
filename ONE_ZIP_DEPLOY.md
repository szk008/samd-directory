# ONE-ZIP DEPLOYMENT TO PYTHONANYWHERE

## ✅ I've created `samd-complete.zip` with everything you need!

---

## 🗑️ Step 1: Clean PythonAnywhere (Bash Console)

```bash
cd ~
rm -rf samd-directory
rm -rf ~/.virtualenvs/samd-env
echo "✅ Cleaned!"
```

---

## 📤 Step 2: Upload Single Zip

1. Go to PythonAnywhere **Files** tab
2. Make sure you're in `/home/szk008/`
3. Click **Upload a file**
4. Select: `c:\Users\shahn\Desktop\samd-directory\samd-complete.zip`
5. Wait for upload

---

## 📦 Step 3: Extract Everything (Bash Console)

```bash
cd ~
unzip -o samd-complete.zip -d samd-directory/
cd samd-directory
ls -la
```

You should see: `backend/`, `web/`, `admin_panel/`, and the Excel file.

---

## ⚙️ Step 4: Setup Environment (Bash Console)

```bash
mkvirtualenv --python=/usr/bin/python3.10 samd-env
workon samd-env
cd ~/samd-directory
pip install flask flask-sqlalchemy flask-cors requests pandas openpyxl
```

---

## 📊 Step 5: Import Data (Bash Console)

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

---

## 🌐 Step 6: Configure Web App

### WSGI File (Web tab → WSGI configuration file):

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

### Set Paths (Web tab):
- **Source code:** `/home/szk008/samd-directory`
- **Working directory:** `/home/szk008/samd-directory`
- **Virtualenv:** `/home/szk008/.virtualenvs/samd-env`

### Set Static Files (Web tab):

| URL | Directory |
|-----|-----------|
| `/static` | `/home/szk008/samd-directory/web/static` |

---

## 🔄 Step 7: Reload

Click the big green **Reload** button in Web tab.

---

## ✅ Step 8: Test!

Visit:
- https://szk008.pythonanywhere.com/
- https://szk008.pythonanywhere.com/api/search?query=doctor

---

## 🎯 Summary

**ONE zip file = Complete deployment!**

All 144 doctors with proper categorization will be imported automatically.

Future updates: Just upload new zip, extract over old files, and reload!
