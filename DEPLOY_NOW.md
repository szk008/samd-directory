# 🚀 FINAL DEPLOYMENT COMMANDS

Your code is pushed to GitHub! Now deploy in 5 minutes:

---

## 📋 Copy-Paste These Commands in Order

### 🗑️ Step 1: Clean Everything (PythonAnywhere Bash)

```bash
cd ~
rm -rf samd-directory
rm -rf ~/.virtualenvs/samd-env
echo "✅ Cleaned!"
```

---

### 📥 Step 2: Clone from GitHub

```bash
cd ~
git clone https://github.com/szk008/samd-directory.git samd-directory
cd samd-directory
ls -la
```

You should see: `backend/`, `web/`, `admin_panel/`, Excel file

---

### ⚙️ Step 3: Setup Environment

```bash
mkvirtualenv --python=/usr/bin/python3.10 samd-env
workon samd-env
cd ~/samd-directory
pip install flask flask-sqlalchemy flask-cors requests pandas openpyxl
```

---

###📊 Step 4: Import Data (144 Doctors)

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

### 🌐 Step 5: Configure Web App

Go to **Web** tab → **WSGI configuration file** → Replace ALL with:

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

**Save the file (Ctrl+S)**

---

### 📍 Step 6: Set Paths (Web tab)

- **Source code:** `/home/szk008/samd-directory`
- **Working directory:** `/home/szk008/samd-directory`
- **Virtualenv:** `/home/szk008/.virtualenvs/samd-env`

---

### 🗂️ Step 7: Set Static Files (Web tab)

| URL | Directory |
|-----|-----------|
| `/static` | `/home/szk008/samd-directory/web/static` |

---

### 🔄 Step 8: Reload

Click the BIG GREEN **Reload** button at top of Web tab.

Wait 20 seconds.

---

### ✅ Step 9: TEST!

Open these URLs:
- https://szk008.pythonanywhere.com/
- https://szk008.pythonanywhere.com/api/search?query=doctor

You should see 144 doctors with proper specialties!

---

## 🔄 Future Updates (Super Easy!)

**On your PC:**
```powershell
git add .
git commit -m "Your changes"
git push
```

**On PythonAnywhere:**
```bash
cd ~/samd-directory
git pull
# Then click Reload button
```

That's it! 🎉

---

## 📱 Next: Build APK

After backend is working:
```powershell
cd mobile_app
flutter build apk --release
```

APK will be at: `build\app\outputs\flutter-apk\app-release.apk`
