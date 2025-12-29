# Complete APK Build Guide for SAMD Directory

## Pre-Build Checklist ✅

Before you start building the APK, ensure:
- ✅ Directory is clean (no build artifacts)
- ✅ Flutter is properly installed and on PATH
- ✅ Android SDK is installed
- ✅ Java JDK is installed (version 11 or later)

---

## Step 1: Clean Previous Build Artifacts

Open PowerShell in `samd-directory` and run:

```powershell
# Remove all build artifacts
cd mobile_app

# Clean Flutter build
flutter clean

# Remove Android build directories
Remove-Item -Path "android\build" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "android\app\build" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "android\.gradle" -Recurse -Force -ErrorAction SilentlyContinue
```

---

## Step 2: Get Flutter Dependencies

```powershell
# Still in mobile_app directory
flutter pub get
```

This will:
- Download all required Flutter packages
- Create `.dart_tool` directory (this is normal)
- Generate necessary files for building

---

## Step 3: Verify App Configuration

### Check `pubspec.yaml`

Ensure your app details are correct:

```yaml
name: mobile_app
description: SAMD Medical Directory
version: 1.0.0+1  # version+build_number
```

### Check `android/app/build.gradle`

Important settings:

```gradle
defaultConfig {
    applicationId "com.samd.directory"  # Your app ID
    minSdkVersion 21
    targetSdkVersion 33
    versionCode 1
    versionName "1.0.0"
}
```

---

## Step 4: Build the APK

### Option A: Build Release APK (Recommended)

```powershell
flutter build apk --release
```

This creates a **single APK** that works on all Android devices.

**Output location:** `build\app\outputs\flutter-apk\app-release.apk`

### Option B: Build App Bundle (For Google Play Store)

```powershell
flutter build appbundle --release
```

**Output location:** `build\app\outputs\bundle\release\app-release.aab`

---

## Step 5: Verify the APK

After build completes:

```powershell
# Check APK exists
Test-Path "build\app\outputs\flutter-apk\app-release.apk"

# Get APK size
(Get-Item "build\app\outputs\flutter-apk\app-release.apk").Length / 1MB
```

Expected size: 15-30 MB (depending on your app)

---

## Step 6: Test the APK

### Install on Android Device

1. **Enable USB Debugging** on your Android device:
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable "USB Debugging"

2. **Connect device via USB**

3. **Install APK:**

```powershell
flutter install
```

Or manually:

```powershell
adb install build\app\outputs\flutter-apk\app-release.apk
```

### Test on Emulator

```powershell
# Start emulator (if you have one configured)
flutter emulators --launch <emulator_name>

# Install and run
flutter install
```

---

## Step 7: Rename and Archive (Optional)

```powershell
# Create releases directory
New-Item -ItemType Directory -Path "..\releases" -Force

# Copy with descriptive name
$date = Get-Date -Format "yyyy-MM-dd"
Copy-Item "build\app\outputs\flutter-apk\app-release.apk" `
          "..\releases\samd-directory-v1.0.0-$date.apk"
```

---

## Troubleshooting Common Issues

### Issue 1: "Flutter not found"
**Solution:**
```powershell
# Add Flutter to PATH
$env:Path += ";C:\src\flutter\bin"  # Adjust to your Flutter location
```

### Issue 2: "Android SDK not found"
**Solution:**
- Ensure Android SDK is installed via Android Studio
- Set ANDROID_HOME environment variable:
```powershell
$env:ANDROID_HOME = "C:\Users\<YourUser>\AppData\Local\Android\Sdk"
```

### Issue 3: "Gradle build failed"
**Solution:**
```powershell
# Clear Gradle cache
Remove-Item -Path "$env:USERPROFILE\.gradle\caches" -Recurse -Force

# Try building again
flutter clean
flutter pub get
flutter build apk --release
```

### Issue 4: "Out of memory during build"
**Solution:**

Edit `android\gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx2048m -XX:MaxPermSize=512m
```

---

## Build Variants

### Debug APK (Larger, with debugging enabled)
```powershell
flutter build apk --debug
```

### Profile APK (For performance testing)
```powershell
flutter build apk --profile
```

### Split APKs by ABI (Smaller individual APKs)
```powershell
flutter build apk --split-per-abi
```

Creates separate APKs for:
- `app-armeabi-v7a-release.apk` (32-bit ARM)
- `app-arm64-v8a-release.apk` (64-bit ARM)
- `app-x86_64-release.apk` (64-bit Intel)

---

## Quick Reference Commands

```powershell
# Full clean rebuild
cd mobile_app
flutter clean
flutter pub get
flutter build apk --release

# Find APK
explorer build\app\outputs\flutter-apk

# Install on device
adb install build\app\outputs\flutter-apk\app-release.apk

# Check devices
adb devices
```

---

## Next Steps

After successfully building:
1. ✅ Test APK on physical device
2. ✅ Verify all features work (maps, search, doctor profiles)
3. ✅ Check network connectivity (ensure it connects to PythonAnywhere backend)
4. ✅ Prepare for deployment to Play Store (if applicable)

---

## Notes

- **App Signing:** For Play Store, you'll need to set up signing keys
- **Backend URL:** Ensure the app points to your PythonAnywhere backend
- **Icons & Splash:** Update app icons in `android/app/src/main/res/`
- **Permissions:** Check `AndroidManifest.xml` for required permissions
