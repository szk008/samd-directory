# PythonAnywhere Data Import Commands

## 📤 Step 1: Upload Files

Upload `complete-data-import.zip` to PythonAnywhere via Files tab.

## 📋 Step 2: Extract and Install Dependencies

In PythonAnywhere Bash console:

```bash
cd ~
unzip -o complete-data-import.zip -d samd-directory/
cd samd-directory
workon samd-env
pip install pandas openpyxl
```

## 🚀 Step 3: Run Import

```bash
cd ~/samd-directory
python -c "
import sys
sys.path.insert(0, '/home/szk008/samd-directory')
from backend.seed import seed_from_excel
from backend.app import app
with app.app_context():
    seed_from_excel()
"
```

## ✅ Step 4: Verify

```bash
python -c "
import sys
sys.path.insert(0, '/home/szk008/samd-directory')
from backend.app import app
from backend.models.doctor import Doctor
with app.app_context():
    count = Doctor.query.count()
    print(f'Total doctors: {count}')
    sample = Doctor.query.first()
    if sample:
        print(f'Sample: {sample.name} - {sample.specialty}')
"
```

Then test: https://szk008.pythonanywhere.com/api/search?query=doctor
