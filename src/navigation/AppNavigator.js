import React from 'react';
import {TouchableOpacity} from 'react-native';
import {createStackNavigator} from '@react-navigation/stack';
import {useSelector} from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {COLORS, FONTS} from '../config/constants';

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
import WithdrawalScreen from '../screens/Women/WithdrawalScreen';
import EarningsScreen from '../screens/Women/EarningsScreen';

const Stack = createStackNavigator();

const screenOptions = {
  headerStyle: {
    backgroundColor: COLORS.background,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 0,
  },
  headerTintColor: COLORS.text,
  headerTitleStyle: {
    fontSize: FONTS.lg,
    fontWeight: '600',
  },
  headerBackTitleVisible: false,
  cardStyle: {
    backgroundColor: COLORS.background,
  },
};

const BackButton = ({onPress}) => (
  <TouchableOpacity onPress={onPress} style={{marginLeft: 16, padding: 4}}>
    <Icon name="arrow-left" size={24} color={COLORS.text} />
  </TouchableOpacity>
);

// Auth Stack
const AuthStack = () => (
  <Stack.Navigator screenOptions={{...screenOptions, headerShown: false}}>
    <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
    <Stack.Screen name="OTPVerify" component={OTPVerifyScreen} />
  </Stack.Navigator>
);

// Men Stack
const MenStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen
      name="MenHome"
      component={MenHomeScreen}
      options={{headerShown: false}}
    />
    <Stack.Screen
      name="BuyCoins"
      component={BuyCoinsScreen}
      options={({navigation}) => ({
        title: 'Buy Coins',
        headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
      })}
    />
    <Stack.Screen
      name="CallScreen"
      component={CallScreen}
      options={{
        headerShown: false,
        gestureEnabled: false,
      }}
    />
  </Stack.Navigator>
);

// Women Stack
const WomenStack = () => (
  <Stack.Navigator screenOptions={screenOptions}>
    <Stack.Screen
      name="WomenDashboard"
      component={WomenDashboardScreen}
      options={{headerShown: false}}
    />
    <Stack.Screen
      name="IncomingCall"
      component={IncomingCallScreen}
      options={{
        headerShown: false,
        gestureEnabled: false,
      }}
    />
    <Stack.Screen
      name="Withdrawal"
      component={WithdrawalScreen}
      options={({navigation}) => ({
        title: 'Withdraw Earnings',
        headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
      })}
    />
    <Stack.Screen
      name="Earnings"
      component={EarningsScreen}
      options={({navigation}) => ({
        title: 'Earnings History',
        headerLeft: () => <BackButton onPress={() => navigation.goBack()} />,
      })}
    />
  </Stack.Navigator>
);

// Main App Navigator
const AppNavigator = () => {
  const {isAuthenticated, user} = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <AuthStack />;
  }

  // Route based on user role
  if (user?.role === 'women') {
    return <WomenStack />;
  }

  return <MenStack />;
};

export default AppNavigator;
