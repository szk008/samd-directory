# SAMD Directory - Android App Deployment Guide

## What Has Been Created

A **production-ready Android app structure** for SAMD Directory has been built with:

### ✅ Complete Android Project
- **Package Name**: `com.samd.directory`
- **App Name**: SAMD Directory  
- **Version**: 1.0.0 (versionCode: 1)
- **Min SDK**: Android 5.1 (API 22)
- **Target SDK**: Android 14 (API 34)

### ✅ Key Features Integrated
- Native geolocation with permission handling
- Custom status bar (teal color matching brand)
- Splash screen configuration
- Back button navigation handling
- Network security for local/remote API access
- Cleartext traffic support (for development)

### ✅ Files Created
```
android/
├── app/
│   ├── build.gradle (✅ App dependencies & config)
│   ├── src/main/
│   │   ├── AndroidManifest.xml (✅ Permissions & app config)
│   │   ├── java/com/samd/directory/MainActivity.java (✅ Main activity)
│   │   └── res/ (✅ Resources: strings, colors, styles, configs)
├── build.gradle (✅ Root build config)
├── settings.gradle (✅ Module setup)
├── variables.gradle (✅ Version management)
└── gradle.properties (✅ Gradle settings)

Web App Updates:
├── index.html (✅ Mobile viewport & CSP)
├── js/mobile.js (✅ Native features integration)
├── package.json (✅ Capacitor dependencies)
└── capacitor.config.json (✅ App configuration)
```

---

## 🎯 Next Steps - User Actions Required

### Step 1: Install Node.js & Dependencies (Required)
The Android project references Capacitor plugins from `node_modules` which don't exist yet. 

**Action**:
```bash
cd C:\Users\shahn\Desktop\Directory

# Install Node.js dependencies
npm install

# Sync Capacitor with Android project  
npx cap sync android
```

**Why**: This downloads Capacitor core and plugin libraries needed for the Android build.

---

### Step 2: Create App Icons & Splash Screen (Optional but Recommended)

Currently using default Android icons. For a professional app:

**Option A - Use Online Tool** (Easiest):
1. Go to https://icon.kitchen/
2. Upload a 512x512px icon (medical cross, SAMD logo, etc.)
3. Download the adaptive icon set
4. Extract to `android/app/src/main/res/` folders

**Option B - Manual Creation**:
See `ANDROID_ASSETS_README.md` for detailed instructions.

**Colors to use**: Teal (#0fb89b), White (#FFFFFF)

---

### Step 3: Open in Android Studio & Build

**Install Android Studio**:
- Download from: https://developer.android.com/studio
- Install with default settings
- Install Android SDK 34 when prompted

**Build the App**:
```bash
# Open Android Studio
# File → Open → Select 'android' folder

# Let Gradle sync (takes 5-10 min first time)

# Build → Build Bundle(s) / APK(s) → Build APK(s)
```

**Or via command line** (if you have Android SDK):
```bash
cd android
gradlew assembleDebug
```

Output APK: `android/app/build/outputs/apk/debug/app-debug.apk`

---

### Step 4: Configure Backend URL

The app is currently set to use `http://10.0.2.2:8080` (Android emulator localhost).

**For Real Device Testing**:
1. Find your computer's local IP: `ipconfig` (look for IPv4 Address)
2. Update `js/mobile.js` line with your IP:
   ```javascript
   return window.SAMD_API_URL || 'http://192.168.X.X:8080';
   ```
3. Ensure Flask server allows external connections:
   ```python
   # app.py already has: app.run(host='0.0.0.0', port=8080)
   ```

**For Production** (when deploying publicly):
- Deploy Flask backend to cloud (Heroku, Railway, Render, etc.)
- Update the URL to production domain
- See `BACKEND_DEPLOYMENT.md` (to be created separately)

---

### Step 5: Test on Device/Emulator

**Using Emulator** (In Android Studio):
- Tools → Device Manager → Create Device
- Select Pixel 7, API 34
- Click play button to launch

**Using Physical Device**:
- Enable Developer Options on phone
- Enable USB Debugging
- Connect via USB
- Android Studio → Run → Select your device

---

### Step 6: Sign for Release (When Ready for Distribution)

**Generate Keystore**:
```bash
keytool -genkey -v -keystore samd-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias samd
```

**Create keystore.properties** in `android/`:
```
storeFile=../samd-release.jks
storePassword=YOUR_PASSWORD
keyAlias=samd
keyPassword= YOUR_PASSWORD
``` **Update app/build.gradle** (add signing config):
```gradle
android {
    signingConfigs {
        release {
            def keystorePropertiesFile = rootProject.file("keystore.properties")
            def keystoreProperties = new Properties()
            keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
            
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Build Release APK**:
```bash
cd android
gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

---

### Step 7: Publish to Google Play (Optional)

1. **Create Developer Account**: https://play.google.com/console ($25 one-time fee)
2. **Create App Listing**: Add screenshots, description, category
3. **Build AAB** (required for Play Store):
   ```bash
   gradlew bundleRelease
   ```
   Output: `app-release.aab`
4. **Upload to Play Console**: Production → Create Release → Upload AAB
5. **Complete Store Listing**:
   - App icon (512x512)
   - Feature graphic (1024x500)
   - Screenshots (min 2)
   - Title, short description, full description
   - Privacy policy URL (if collecting data)
6. **Submit for Review**: Takes 1-3 days

---

## 📋 Summary Checklist

- [ ] Install Node.js
- [ ] Run `npm install` in project directory
- [ ] Run `npx cap sync android`
- [ ] (Optional) Create custom app icons
- [ ] Install Android Studio
- [ ] Open `android` folder in Android Studio
- [ ] Let Gradle sync
- [ ] Configure backend URL in `mobile.js`
- [ ] Test on emulator/device
- [ ] (For release) Generate & configure keystore
- [ ] Build signed APK
- [ ] (Optional) Publish to Play Store

---

## 🆘 Troubleshooting

**"npm not found"**: Install Node.js from https://nodejs.org/

**"Module ':capacitor-android' not found"**: Run `npm install` then `npx cap sync`

**"SDK not found"**: Install Android SDK via Android Studio → SDK Manager

**App won't connect to backend**: 
- Check firewall allows port 8080
- Use computer's local IP, not localhost
- Ensure Flask runs with `host='0.0.0.0'`

**"Cleartext traffic not permitted"**: Already handled in `network_security_config.xml`

---

## 📞 Support

For build issues, check:
- `ANDROID_BUILD_README.md` - Detailed build instructions
- `ANDROID_ASSETS_README.md` - Icon/splash generation
- Android Studio Logcat for runtime errors

---

**The app is ready for building!** Just follow the steps above based on your environment.
