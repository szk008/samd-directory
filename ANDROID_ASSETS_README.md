# SAMD Directory - Android App Assets

This folder contains icons and splash screens for the Android app.

## Required Icon Sizes (Generate from source)

Source reference icon should be 512x512px minimum.

### App Icons (mipmap folders)
- mdpi: 48x48
- hdpi: 72x72  
- xhdpi: 96x96
- xxhdpi: 144x144
- xxxhdpi: 192x192

### Splash Screens (drawable folders)
- Port: 1920x3840
- Land: 3840x1920

## Instructions

1. Create a high-quality 512x512px icon representing SAMD:
   - Medical theme (cross, stethoscope, hospital)
   - Teal color (#0fb89b) as primary
   - Clean, modern design
   - Rounded corners (Android adaptive icon)

2. Create a 2732x2732px splash screen:
   - Centered logo/icon
   - "SAMD Directory" text
   - Teal background
   - Professional, clean look

3. Use online tools to generate all sizes:
   - https://icon.kitchen/ (Android adaptive icons)
   - https://apetools.webprofessio

nal.com/ (Icon resizer)

4. Place generated files in:
   - `android/app/src/main/res/mipmap-{density}/ic_launcher.png`
   - `android/app/src/main/res/drawable-{orientation}/splash.png`

## Quick Generation Script

For quick icon generation, use ImageMagick (if installed):

```bash
# Icon resizing
convert icon-512.png -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png
convert icon-512.png -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png
convert icon-512.png -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
convert icon-512.png -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
convert icon-512.png -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png

# Splash screens
convert splash-2732.png -resize 1920x3840 android/app/src/main/res/drawable-port/splash.png
convert splash-2732.png -resize 3840x1920 android/app/src/main/res/drawable-land/splash.png
```

## Placeholder Icons

Until custom icons are created, the Android project will use default icons.
The app will build successfully but should have custom branding before distribution.
