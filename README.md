# FrndZone - Bare React Native App

A dating/calling app where men pay coins to call women, and women earn money. Built with **Bare React Native** and **Firebase Authentication**.

## 🚀 Features

### For Men
- Browse available women with online status
- Buy coin packages with bonus offers
- Make voice calls (40 coins/min)
- Real-time coin deduction during calls

### For Women
- Toggle availability (online/offline)
- Receive incoming calls with vibration
- Earn coins automatically (40/min)
- Request withdrawals via UPI

## 📁 Project Structure

```
frndzone-bare/
├── android/                    # Android native code
│   ├── app/
│   │   ├── build.gradle       # App-level build config
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── java/com/frndzone/
│   │       │   ├── MainActivity.java
│   │       │   └── MainApplication.java
│   │       └── res/
│   ├── build.gradle           # Project-level build config
│   ├── settings.gradle
│   └── gradle.properties
├── src/
│   ├── config/
│   │   ├── constants.js       # API URL, colors, rates
│   │   ├── firebase.js        # Firebase auth config
│   │   └── theme.js           # Shadows, gradients
│   ├── redux/
│   │   ├── store.js           # Redux store setup
│   │   └── slices/
│   │       ├── authSlice.js
│   │       ├── userSlice.js
│   │       ├── callSlice.js
│   │       └── paymentSlice.js
│   ├── services/
│   │   ├── socketService.js   # Socket.io client
│   │   └── api/
│   │       ├── axiosConfig.js
│   │       ├── authAPI.js
│   │       ├── userAPI.js
│   │       ├── paymentAPI.js
│   │       └── withdrawalAPI.js
│   ├── components/
│   │   ├── common/
│   │   │   ├── Loading.js
│   │   │   ├── Button.js
│   │   │   ├── Input.js
│   │   │   ├── Card.js
│   │   │   └── Avatar.js
│   │   ├── CoinDisplay.js
│   │   ├── WomenCard.js
│   │   ├── PackageCard.js
│   │   └── CallTimer.js
│   ├── screens/
│   │   ├── Auth/
│   │   │   ├── PhoneLoginScreen.js
│   │   │   └── OTPVerifyScreen.js
│   │   ├── Men/
│   │   │   ├── MenHomeScreen.js
│   │   │   ├── BuyCoinsScreen.js
│   │   │   └── CallScreen.js
│   │   └── Women/
│   │       ├── WomenDashboardScreen.js
│   │       ├── IncomingCallScreen.js
│   │       ├── WithdrawalScreen.js
│   │       └── EarningsScreen.js
│   ├── navigation/
│   │   └── AppNavigator.js
│   ├── hooks/
│   │   └── useRedux.js
│   └── utils/
│       └── helpers.js
├── App.js                      # Main entry point
├── index.js                    # App registry
├── package.json
├── babel.config.js
├── metro.config.js
└── app.json
```

## 🛠️ Setup Instructions

### Prerequisites

1. **Node.js** 18+ - https://nodejs.org/
2. **JDK** 17 - Required for Android builds
3. **Android Studio** - For Android SDK and emulator
4. **Firebase Project** - For phone authentication

### Step 1: Create local.properties (IMPORTANT for Windows)

Create `android/local.properties` file with your Android SDK path:

```properties
sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
```

Replace `YourUsername` with your actual Windows username.

### Step 2: Install Dependencies

```bash
cd frndzone-bare
npm install
```

### Step 2: Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Add Android app with package name: `com.frndzone`
4. Download `google-services.json`
5. Place it in `android/app/google-services.json`
6. Enable **Phone Authentication** in Firebase Console:
   - Go to Authentication → Sign-in method
   - Enable Phone provider
   - Add test phone numbers for development

### Step 3: Configure Backend URL

Edit `src/config/constants.js`:

```javascript
// For Android Emulator
export const API_URL = 'http://10.0.2.2:5000';

// For Physical Device (use your computer's IP)
export const API_URL = 'http://192.168.1.XXX:5000';
```

### Step 4: Run the App

```bash
# Start Metro bundler
npm start

# In another terminal, run Android
npm run android
```

## 🔥 Firebase Authentication Flow

1. User enters phone number
2. Firebase sends OTP via SMS
3. User enters OTP
4. Firebase verifies and returns ID token
5. App sends ID token to backend
6. Backend verifies with Firebase Admin SDK
7. Backend creates/finds user and returns JWT

### Firebase Config (src/config/firebase.js)

```javascript
import auth from '@react-native-firebase/auth';

export const signInWithPhone = async (phoneNumber) => {
  const confirmation = await auth().signInWithPhoneNumber(`+91${phoneNumber}`);
  return confirmation;
};

export const verifyOTP = async (confirmation, otp) => {
  const credential = await confirmation.confirm(otp);
  return credential.user;
};

export const getIdToken = async () => {
  const user = auth().currentUser;
  return user ? await user.getIdToken(true) : null;
};
```

## 📱 Building APK

### Debug APK

```bash
cd android
./gradlew assembleDebug
```

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK

1. Generate keystore:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. Add to `android/gradle.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=*****
MYAPP_RELEASE_KEY_PASSWORD=*****
```

3. Build:
```bash
cd android
./gradlew assembleRelease
```

## 🔧 Troubleshooting

### Build Errors

```bash
# Clean build
cd android && ./gradlew clean && cd ..
rm -rf node_modules
npm install
```

### Metro Bundler Issues

```bash
# Clear cache
npm start -- --reset-cache
```

### Firebase Issues

- Ensure `google-services.json` is in `android/app/`
- Check SHA-1 fingerprint is added in Firebase Console
- Verify phone authentication is enabled

### Network Issues

- Ensure backend is running
- Check API_URL matches your setup
- For physical device, use computer's local IP

## 📦 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react-native | 0.73.4 | Core framework |
| @react-native-firebase/app | ^18.8.0 | Firebase core |
| @react-native-firebase/auth | ^18.8.0 | Phone authentication |
| @react-navigation/native | ^6.1.17 | Navigation |
| @reduxjs/toolkit | ^2.0.1 | State management |
| socket.io-client | ^4.7.2 | Real-time communication |
| react-native-linear-gradient | ^2.8.3 | Gradient backgrounds |
| react-native-vector-icons | ^10.0.3 | Icons |

## 🔐 Backend Requirements

Your backend needs these endpoints:

```
POST /api/auth/firebase-verify  - Verify Firebase token
POST /api/auth/refresh-token    - Refresh JWT
GET  /api/users/profile         - Get user profile
GET  /api/users/available-women - Get online women
POST /api/users/toggle-availability
POST /api/payments/create-order
POST /api/payments/verify
POST /api/withdrawals/request
```

## 📄 License

MIT License

## 🤝 Support

For issues and feature requests, please create an issue in the repository.
