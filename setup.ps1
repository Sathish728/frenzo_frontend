# FrndZone Setup Script for Windows
# Run this in PowerShell as Administrator

param(
    [string]$ProjectPath = ".\FrndZone"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FrndZone - React Native Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if Java is installed
try {
    $javaVersion = java -version 2>&1 | Select-String "version"
    Write-Host "✓ Java found" -ForegroundColor Green
} catch {
    Write-Host "✗ Java not found. Please install JDK 17" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 1: Creating React Native project..." -ForegroundColor Yellow

# Create new React Native project
npx react-native@latest init FrndZone --version 0.73.4

if (-not (Test-Path $ProjectPath)) {
    Write-Host "✗ Failed to create project" -ForegroundColor Red
    exit 1
}

Set-Location $ProjectPath
Write-Host "✓ Project created" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Installing dependencies..." -ForegroundColor Yellow

# Install all dependencies
npm install @react-native-firebase/app@18.8.0 @react-native-firebase/auth@18.8.0
npm install @react-navigation/native@6.1.17 @react-navigation/stack@6.3.29
npm install @reduxjs/toolkit@2.0.1 react-redux@9.1.0 redux-persist@6.0.0
npm install @react-native-async-storage/async-storage@1.21.0
npm install react-native-screens@3.29.0 react-native-safe-area-context@4.8.2
npm install react-native-gesture-handler@2.14.1 react-native-reanimated@3.6.2
npm install react-native-linear-gradient@2.8.3
npm install react-native-vector-icons@10.0.3
npm install socket.io-client@4.7.2 axios@1.6.2

Write-Host "✓ Dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Setting up Android..." -ForegroundColor Yellow

# Update android/build.gradle
$buildGradle = Get-Content "android\build.gradle" -Raw
if ($buildGradle -notmatch "google-services") {
    $buildGradle = $buildGradle -replace '(classpath\("com\.facebook\.react:react-native-gradle-plugin"\))', '$1
        classpath("com.google.gms:google-services:4.4.0")'
    Set-Content "android\build.gradle" $buildGradle
    Write-Host "✓ Updated android/build.gradle" -ForegroundColor Green
}

# Update android/app/build.gradle
$appBuildGradle = Get-Content "android\app\build.gradle" -Raw
if ($appBuildGradle -notmatch "google-services") {
    $appBuildGradle = $appBuildGradle + "`napply plugin: `"com.google.gms.google-services`""
    Set-Content "android\app\build.gradle" $appBuildGradle
    Write-Host "✓ Updated android/app/build.gradle" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Copy 'src' folder from frndzone-bare to $ProjectPath\src"
Write-Host "2. Copy App.js to $ProjectPath\App.js"
Write-Host "3. Download google-services.json from Firebase Console"
Write-Host "4. Place it in $ProjectPath\android\app\"
Write-Host "5. Run: npm run android"
Write-Host ""
Write-Host "For Firebase setup, visit:" -ForegroundColor Cyan
Write-Host "https://console.firebase.google.com/"
