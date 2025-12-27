# Capacitor Android Build Documentation

## Prerequisites
- **Android Studio**: Ladybug (2024.2.1) or later
- **Java JDK**: 17 or later
- **Android SDK**: API 34 (Android 14)
- **Gradle**: 8.2+ (included in wrapper)

## Project Structure
```
android/
├── app/
│   ├── build.gradle              # App module build config
│   ├── capacitor.build.gradle    # Capacitor plugin integration
│   ├── proguard-rules.pro        # ProGuard obfuscation rules
│   └── src/main/
│       ├── AndroidManifest.xml   # App permissions & config
│       ├── java/com/samd/directory/
│       │   └── MainActivity.java # Main Android activity
│       └── res/                  # Resources (icons, strings, etc.)
├── build.gradle                  # Root build config
├── settings.gradle               # Module includes
├── variables.gradle              # Shared version variables
└── gradle.properties             # Gradle JVM settings
```

## Building the App

### 1. Open in Android Studio
```bash
cd android
# On Windows, use file explorer to open 'android' folder in Android Studio
```

### 2. Sync Gradle
- Click "Sync Project with Gradle Files" in Android Studio
- Wait for dependencies to download (first time takes ~5-10 min)

### 3. Build Debug APK
```bash
cd android
gradlew assembleDebug
```
Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### 4. Install on Device/Emulator
```bash
gradlew installDebug
```

### 5. Build Release APK (Requires Signing)
```bash
gradlew assembleRelease
```

## Important Notes

**Node Modules Missing**: This project was created without npm due to system constraints. If you have Node.js installed, run:
```bash
cd ..
npm install
npx cap sync android
```

**Capacitor Plugins**: The build.gradle references Capacitor plugins from node_modules. If npm install hasn't been run, you'll need to either:
- Install npm dependencies (recommended)
- Comment out Capacitor plugin includes in `settings.gradle` and `app/build.gradle`

**Signing for Release**: To create a signed APK for production:
1. Generate keystore:
   ```bash
   keytool -genkey -v -keystore samd-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias samd
   ```
2. Create `android/keystore.properties`:
   ```
   storeFile=../samd-release.jks
   storePassword=YOUR_PASSWORD
   keyAlias=samd
   keyPassword=YOUR_PASSWORD
   ```
3. Update `app/build.gradle` signing config
4. Run `gradlew assembleRelease`

## Troubleshooting

**Build Failed - Dependencies Not Found**: 
- Run `npm install` in project root
- Run `npx cap sync android`

**Module 'capacitor-android' not found**:
- Ensure node_modules exists
- Or comment out capacitor plugin includes

**SDK Not Found**:
- Open Android Studio
- Go to Tools → SDK Manager
- Install Android SDK 34

##Testing

**On Emulator**:
- Create AVD in Android Studio (Pixel 7, API 34)
- Run `gradlew installDebug`

**On Physical Device**:
- Enable Developer Options & USB Debugging
- Connect via USB
- Run `gradlew installDebug`

## Next Steps
See `DEPLOY_GUIDE.md` for production deployment instructions.
