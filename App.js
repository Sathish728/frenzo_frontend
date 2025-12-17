import React, {useEffect} from 'react';
import {StatusBar, LogBox, Platform} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {store, persistor} from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import {Loading} from './src/components/common/Loading';
import {COLORS} from './src/config/constants';
import {requestAllPermissions} from './src/utils/permissions';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
]);

const App = () => {
  // Request permissions when app starts
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Small delay to ensure app is fully loaded
      const timer = setTimeout(() => {
        requestAllPermissions();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={<Loading />} persistor={persistor}>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar
              barStyle="light-content"
              backgroundColor={COLORS.background}
              translucent={false}
            />
            <AppNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
};

export default App;