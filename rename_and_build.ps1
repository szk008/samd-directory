# Rename Directory to samd-directory and rebuild APK
# IMPORTANT: Close ALL files in your editor before running this script

Write-Host "Step 1: Renaming directory..." -ForegroundColor Cyan
try {
    Rename-Item -Path "C:\Users\shahn\Desktop\Directory" -NewName "samd-directory" -ErrorAction Stop
    Write-Host "✓ Directory renamed successfully!" -ForegroundColor Green
}
catch {
    Write-Host "✗ Failed to rename directory. Make sure all files are closed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "`nPress any key to close this window..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "`nStep 2: Running flutter clean..." -ForegroundColor Cyan
Set-Location "C:\Users\shahn\Desktop\samd-directory\mobile_app"
flutter clean

Write-Host "`nStep 3: Running flutter pub get..." -ForegroundColor Cyan
flutter pub get

Write-Host "`nStep 4: Building APK (this may take several minutes)..." -ForegroundColor Cyan
flutter build apk

Write-Host "`n✓ APK build complete!" -ForegroundColor Green
Write-Host "APK location: C:\Users\shahn\Desktop\samd-directory\mobile_app\build\app\outputs\flutter-apk\app-release.apk" -ForegroundColor Yellow

Write-Host "`nPress any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
