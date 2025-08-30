import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-gesture-handler';

// Import contexts
import { PocketBaseProvider } from './src/components/contexts/PocketBaseContext';
import { AuthProvider, useAuth } from './src/components/contexts/AuthContext';

// Import screens
import LoginScreen from './src/components/screens/LoginScreen';
import MatchListScreen from './src/components/screens/MatchListScreen';
import MatchEditScreen from './src/components/screens/MatchEditScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // You can add a loading screen here
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {user ? (
        <>
          <Stack.Screen
            name="MatchList"
            component={MatchListScreen}
            options={{ title: 'Matches' }}
          />
          <Stack.Screen
            name="MatchEdit"
            component={MatchEditScreen}
            options={{ title: 'Edit Match' }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'Login' }}
        />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <PocketBaseProvider>
          <AuthProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
            <StatusBar style="auto" />
          </AuthProvider>
        </PocketBaseProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
