import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../hooks/useAppDispatch';
import { selectIsAuthenticated, selectCurrentUser } from '../redux/slices/authSlice';

// Auth Screens
import PhoneLoginScreen from '../screens/Auth/PhoneLoginScreen';
import OTPVerifyScreen from '../screens/Auth/OTPVerifyScreen';

// Men Screens
import MenHomeScreen from '../screens/Men/MenHomeScreen';
import BuyCoinsScreen from '../screens/Men/BuyCoinsScreen';
import CallScreen from '../screens/Men/CallScreen';

// Women Screens
import WomenDashboardScreen from '../screens/Women/WomenDashboardScreen';
import IncomingCallScreen from '../screens/Women/IncomingCallScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);

  if (!isAuthenticated) {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
        <Stack.Screen name="OTPVerify" component={OTPVerifyScreen} />
      </Stack.Navigator>
    );
  }

  if (user?.role === 'men') {
    return (
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="MenHome"
          component={MenHomeScreen}
          options={{ title: 'Available Women' }}
        />
        <Stack.Screen
          name="BuyCoins"
          component={BuyCoinsScreen}
          options={{ title: 'Buy Coins' }}
        />
        <Stack.Screen
          name="CallScreen"
          component={CallScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="WomenDashboard"
        component={WomenDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen
        name="IncomingCall"
        component={IncomingCallScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;