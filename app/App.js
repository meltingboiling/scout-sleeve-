// ─────────────────────────────────────────────────────────────────────────────
// Scout Sleeve – App.js
//
// RN 0.84  |  React 19  |  Navigation v7  |  Firebase v23 modular API
//
// IMPORTANT: GestureHandlerRootView must wrap everything for react-navigation
// stack to work correctly (required in react-native-gesture-handler v2).
// ─────────────────────────────────────────────────────────────────────────────


import React, { useEffect, useState } from 'react';
import {
  View, Text, ActivityIndicator, StyleSheet, StatusBar,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer }    from '@react-navigation/native';
import { createStackNavigator }   from '@react-navigation/stack';
import { SafeAreaProvider }       from 'react-native-safe-area-context';

import { initStorage }       from './src/utils/storage';
import { signInAnonymously, ensureAthleteDoc } from './src/utils/firebase';
import ScanScreen      from './src/screens/ScanScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import { C, FONT, SP }  from './src/constants';

import { initBle } from './src/utils/ble';

const Stack = createStackNavigator();

// ── Common screen options (dark header) ──────────────────────────────────────
const screenOpts = {
  headerStyle: {
    backgroundColor: C.bgElevated,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSubtle,
  },
  headerTintColor:      C.textPrimary,
  headerTitleStyle: {
    fontWeight: FONT.semibold,
    fontSize:   FONT.lg,
    letterSpacing: 0.4,
  },
  headerBackTitleVisible: false,
  cardStyle: { backgroundColor: C.bgPrimary },
  // New arch: no legacy animation driver warning
  animationEnabled: true,
};

export default function App() {
  const [ready, setReady]   = useState(false);
  const [error, setError]   = useState(null);

  useEffect(() => {

    
    let cancelled = false;

    (async () => {
      try {

        await initBle();               // ← ADD THIS LINE


        // 1. Local storage
        await initStorage();

        // 2. Firebase anonymous auth
        await signInAnonymously();

        // 3. Ensure athlete Firestore document exists
        await ensureAthleteDoc();

        if (!cancelled) { setReady(true); }
      } catch (err) {
        console.error('[App] Init error:', err.message);
        if (!cancelled) { setError(err.message); }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Splash / error ────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <View style={splash.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.bgPrimary} />
        {error ? (
          <>
            <Text style={splash.errorTitle}>Init Failed</Text>
            <Text style={splash.errorMsg}>{error}</Text>
            <Text style={splash.hint}>Check Firebase config and restart the app.</Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={splash.title}>SCOUT SLEEVE</Text>
            <Text style={splash.sub}>Loading…</Text>
          </>
        )}
      </View>
    );
  }

  // ── Main navigation ───────────────────────────────────────────────────────
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={C.bgPrimary} />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Scan"
            screenOptions={screenOpts}
          >
            <Stack.Screen
              name="Scan"
              component={ScanScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ title: 'Dashboard', headerLeft: () => null }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ── Splash styles ─────────────────────────────────────────────────────────────
const splash = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SP.xl,
  },
  title: {
    fontSize: FONT.xxl,
    fontWeight: FONT.semibold,
    color: C.textPrimary,
    marginTop: SP.lg,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: FONT.md,
    color: C.textMuted,
    marginTop: SP.sm,
    letterSpacing: 1,
  },
  errorTitle: {
    fontSize: FONT.xl,
    fontWeight: FONT.semibold,
    color: C.red,
    marginBottom: SP.md,
  },
  errorMsg: {
    fontSize: FONT.md,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: SP.sm,
  },
  hint: {
    fontSize: FONT.sm,
    color: C.textMuted,
    textAlign: 'center',
     marginTop: SP.md,
  },
});