import React, {useEffect} from 'react';
import {StatusBar, LogBox} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {store, persistor} from './src/redux/store';
import AppNavigator from './src/navigation/AppNavigator';
import {Loading} from './src/components/common/Loading';
import {COLORS} from './src/config/constants';

// import AsyncStorage from '@react-native-async-storage/async-storage';
// Uncomment this line once, run the app, then comment it back
// AsyncStorage.clear();

import AsyncStorage from '@react-native-async-storage/async-storage';
AsyncStorage.clear().then(() => console.log('Storage cleared'));

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
]);
//home
const App = () => {
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
