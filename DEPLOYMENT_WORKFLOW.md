# COMPLETE DEPLOYMENT WORKFLOW

## 🎯 Quick Start (Execute in Order)

### Phase 1: Build APK (15-20 minutes)

```powershell
# Navigate to mobile app
cd c:\Users\shahn\Desktop\samd-directory\mobile_app

# Clean previous builds
flutter clean

# Get dependencies
flutter pub get

# Build release APK
flutter build apk --release

# APK will be at: build\app\outputs\flutter-apk\app-release.apk
```

### Phase 2: Deploy to PythonAnywhere (20-30 minutes)

#### A. Prepare Deployment Package

```powershell
cd c:\Users\shahn\Desktop\samd-directory

# Create deployment package
New-Item -ItemType Directory -Path "deploy_package" -Force
Copy-Item -Path "backend" -Destination "deploy_package\backend" -Recurse
Copy-Item -Path "web" -Destination "deploy_package\web" -Recurse
Copy-Item -Path "admin_panel" -Destination "deploy_package\admin_panel" -Recurse

# Create zip
Compress-Archive -Path "deploy_package\*" -DestinationPath "samd-deploy.zip" -Force
```

#### B. Upload and Configure on PythonAnywhere

**In PythonAnywhere Bash Console:**

```bash
# Extract files
cd ~
unzip -o samd-deploy.zip -d Directory/

# Create/activate virtual environment
mkvirtualenv --python=/usr/bin/python3.10 samd-env
workon samd-env

# Install dependencies
cd ~/Directory
pip install -r backend/requirements.txt

# Initialize database
python backend/init_db.py
python backend/seed.py
```

**Configure Web App:**
1. Go to Web tab
2. Edit WSGI configuration file
3. Update with content from PYTHONANYWHERE_DEPLOYMENT_COMPLETE.md
4. Set static file mappings
5. Click Reload

#### C. Verify Deployment

Test these URLs:
- https://szk008.pythonanywhere.com/
- https://szk008.pythonanywhere.com/api/search?query=doctor
- https://szk008.pythonanywhere.com/admin/admin.html

---

## 📋 Pre-Deployment Verification

### Directory Cleanliness ✅
- ✅ Removed `__pycache__`
- ✅ Removed `.dart_tool`
- ✅ Removed `.idea`
- ✅ Removed `.gradle`

### Required Tools
- ✅ Flutter installed
- ✅ Android SDK configured
- ✅ PythonAnywhere account active

---

## 🔗 Detailed Documentation

For complete step-by-step instructions:

1. **APK Build:** See [APK_BUILD_GUIDE.md](file:///c:/Users/shahn/Desktop/samd-directory/APK_BUILD_GUIDE.md)
2. **PythonAnywhere:** See [PYTHONANYWHERE_DEPLOYMENT_COMPLETE.md](file:///c:/Users/shahn/Desktop/samd-directory/PYTHONANYWHERE_DEPLOYMENT_COMPLETE.md)

---

## ⚡ Quick Commands Reference

### APK Build
```powershell
cd mobile_app
flutter clean && flutter pub get && flutter build apk --release
```

### Find Built APK
```powershell
explorer build\app\outputs\flutter-apk
```

### Install APK on Device
```powershell
adb install build\app\outputs\flutter-apk\app-release.apk
```

### Create Deployment Zip
```powershell
cd c:\Users\shahn\Desktop\samd-directory
Compress-Archive -Path "backend","web","admin_panel" -DestinationPath "samd-deploy.zip" -Force
```

---

## 🚨 Common Issues

### Flutter Build Fails
```powershell
flutter clean
flutter pub get
flutter doctor  # Check for issues
```

### PythonAnywhere 500 Error
- Check error log: `/var/log/szk008.pythonanywhere.com.error.log`
- Verify WSGI file paths
- Ensure virtual environment activated

### Mobile App Can't Connect to Backend
- Check CORS settings in `backend/app.py`
- Verify backend URL in mobile app configuration
- Test API endpoints directly in browser

---

## 📞 Support Resources

- **Flutter Issues:** https://flutter.dev/docs
- **PythonAnywhere Help:** https://help.pythonanywhere.com
- **APK Build Issues:** Run `flutter doctor -v` for diagnostics
