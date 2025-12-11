# FrndZone - Quick Setup Guide (Windows)

## ⚠️ Important: Gradle Wrapper Issue

The `gradle-wrapper.jar` file is a binary that can't be included in a text-based download. 

## 🚀 Solution: Initialize Fresh React Native Project

Run these commands in PowerShell:

### Step 1: Create Fresh React Native Project

```powershell
# Navigate to your projects folder
cd "D:\important files\New folder (3)"

# Remove the incomplete folder
Remove-Item -Recurse -Force frndzone-bare

# Create new React Native project with correct structure
npx react-native@latest init FrndZone --version 0.73.4

# Navigate into project
cd FrndZone
```

### Step 2: Install Dependencies

```powershell
# Install required packages
npm install @react-native-firebase/app @react-native-firebase/auth
npm install @react-navigation/native @react-navigation/stack
npm install @reduxjs/toolkit react-redux redux-persist
npm install @react-native-async-storage/async-storage
npm install react-native-screens react-native-safe-area-context
npm install react-native-gesture-handler react-native-reanimated
npm install react-native-linear-gradient
npm install react-native-vector-icons
npm install socket.io-client axios
```

### Step 3: Copy Source Files

After installing dependencies:

1. Delete the default `App.tsx` file
2. Copy all files from my provided `src/` folder into your project's `src/` folder
3. Copy `App.js`, `index.js`, `babel.config.js` to root

### Step 4: Android Configuration

1. **Edit `android/build.gradle`** - Add at the top of `dependencies`:
```groovy
classpath("com.google.gms:google-services:4.4.0")
```

2. **Edit `android/app/build.gradle`** - Add at the bottom:
```groovy
apply plugin: "com.google.gms.google-services"
```

3. **Add Firebase config:**
   - Download `google-services.json` from Firebase Console
   - Place in `android/app/google-services.json`

### Step 5: Run the App

```powershell
# Start Metro
npm start

# In another terminal
npm run android
```

---

## 📦 Alternative: Use the Provided Script

I'll create a setup script that does this automatically. See `setup.ps1` in the download.
