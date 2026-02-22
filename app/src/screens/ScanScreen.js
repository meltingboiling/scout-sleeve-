// ─────────────────────────────────────────────────────────────────────────────
// Scout Sleeve – Scan Screen
// Uses react-native-ble-manager ^11.6.3 – NO NativeEventEmitter.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  requestBlePermissions,
  waitForBluetooth,
  startScan,
  stopScan,
  connectDevice,
  subscribeToData,
} from '../utils/ble';
import { C, SP, FONT, RADIUS, BLE } from '../constants';

export default function ScanScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [btReady,    setBtReady]    = useState(false);
  const [scanning,   setScanning]   = useState(false);
  const [connecting, setConnecting] = useState(null); // deviceId or null
  const [devices,    setDevices]    = useState([]);

  const stopScanRef = useRef(null); // cancel function returned by startScan

  // ── Init: permissions + BT power-on ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const ok = await requestBlePermissions();
      if (!ok) {
        Alert.alert(
          'Permissions Required',
          'Bluetooth and Location permissions are needed to scan for Scout Sleeve.',
        );
        return;
      }

      try {
        await waitForBluetooth();
        if (!cancelled) { setBtReady(true); }
      } catch (err) {
        Alert.alert('Bluetooth Error', err.message);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Clean up scan on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopScanRef.current?.();
      stopScan();
    };
  }, []);

  // ── Start scan ──────────────────────────────────────────────────────────
  const handleScan = useCallback(() => {
    if (!btReady || scanning) { return; }

    setDevices([]);
    setScanning(true);

    const cancel = startScan(
      // onFound
      device => {
        setDevices(prev =>
          prev.find(d => d.id === device.id) ? prev : [...prev, device],
        );
      },
      // onStop
      () => setScanning(false),
    );

    stopScanRef.current = cancel;
  }, [btReady, scanning]);

  // ── Connect ─────────────────────────────────────────────────────────────
  const handleConnect = useCallback(async device => {
    // Stop scan first
    stopScanRef.current?.();
    stopScan();
    setScanning(false);

    setConnecting(device.id);

    try {
      const connected = await connectDevice(device);

      // Start listening – pass disconnect callback
      subscribeToData(
        () => {}, // data handled in DashboardScreen after navigation
        () => {
          Alert.alert(
            'Disconnected',
            'Scout Sleeve disconnected. Returning to scan.',
            [{ text: 'OK', onPress: () => navigation.replace('Scan') }],
          );
        },
      );

      navigation.replace('Dashboard', {
        deviceId:   connected.id,
        deviceName: connected.name ?? BLE.DEVICE_NAME,
      });
    } catch (err) {
      console.error('[Scan] Connect error:', err.message);
      Alert.alert('Connection Failed', err.message);
      setConnecting(null);
    }
  }, [navigation]);

  // ── Render device row ────────────────────────────────────────────────────
  const renderDevice = ({ item }) => (
    <View style={styles.deviceCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.deviceName}>{item.name ?? item.localName ?? 'Unknown'}</Text>
        <Text style={styles.deviceId}>{item.id}</Text>
      </View>
      <TouchableOpacity
        style={styles.connectBtn}
        onPress={() => handleConnect(item)}
        disabled={connecting !== null}
      >
        {connecting === item.id
          ? <ActivityIndicator size="small" color={C.textPrimary} />
          : <Text style={styles.connectBtnText}>CONNECT</Text>
        }
      </TouchableOpacity>
    </View>
  );

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top + SP.lg }]}>
      {/* Header */}
      <Text style={styles.title}>SCOUT SLEEVE</Text>
      <Text style={styles.subtitle}>Find your sensor to begin</Text>

      {/* Scan button */}
      <TouchableOpacity
        style={[styles.scanBtn, scanning && styles.scanBtnActive]}
        onPress={handleScan}
        disabled={!btReady || scanning}
        activeOpacity={0.8}
      >
        {scanning && <ActivityIndicator size="small" color={C.textPrimary} style={{ marginRight: SP.sm }} />}
        <Text style={styles.scanBtnText}>
          {scanning ? 'SCANNING…' : btReady ? 'SCAN FOR DEVICE' : 'INITIALISING…'}
        </Text>
      </TouchableOpacity>

      {/* List label */}
      <Text style={styles.listLabel}>
        {devices.length > 0
          ? `${devices.length} DEVICE${devices.length > 1 ? 'S' : ''} FOUND`
          : scanning ? 'SEARCHING…' : 'NO DEVICES YET'}
      </Text>

      {/* Device list */}
      <FlatList
        data={devices}
        keyExtractor={d => d.id}
        renderItem={renderDevice}
        contentContainerStyle={{ paddingBottom: SP.xxl }}
        ListEmptyComponent={
          !scanning ? (
            <Text style={styles.empty}>
              Tap "SCAN FOR DEVICE" and make sure your{'\n'}
              ESP32 is powered on and nearby.
            </Text>
          ) : null
        }
      />

      {/* Bottom hint */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SP.md }]}>
        <View style={[styles.ftDot, { backgroundColor: btReady ? C.green : C.textMuted }]} />
        <Text style={styles.ftText}>
          {btReady ? 'Bluetooth ready' : 'Waiting for Bluetooth…'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bgPrimary,
    paddingHorizontal: SP.lg,
  },
  title: {
    fontSize: FONT.hero,
    fontWeight: FONT.semibold,
    color: C.textPrimary,
    letterSpacing: -1,
    marginBottom: SP.xs,
  },
  subtitle: {
    fontSize: FONT.md,
    color: C.textMuted,
    letterSpacing: 0.5,
    marginBottom: SP.xl,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: RADIUS.pill,
    paddingVertical: SP.md,
    marginBottom: SP.xl,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  scanBtnActive: {
    backgroundColor: C.bgElevated,
  },
  scanBtnText: {
    fontSize: FONT.md,
    fontWeight: FONT.medium,
    color: C.textPrimary,
    letterSpacing: 1,
  },
  listLabel: {
    fontSize: FONT.xs,
    color: C.textMuted,
    letterSpacing: 2,
    marginBottom: SP.md,
  },
  deviceCard: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    padding: SP.md,
    marginBottom: SP.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceName: {
    fontSize: FONT.lg,
    fontWeight: FONT.semibold,
    color: C.textPrimary,
    marginBottom: 2,
  },
  deviceId: {
    fontSize: FONT.xs,
    color: C.textMuted,
  },
  connectBtn: {
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: RADIUS.pill,
    paddingVertical: SP.sm,
    paddingHorizontal: SP.md,
    minWidth: 90,
    alignItems: 'center',
  },
  connectBtnText: {
    fontSize: FONT.sm,
    fontWeight: FONT.medium,
    color: C.textPrimary,
    letterSpacing: 0.8,
  },
  empty: {
    fontSize: FONT.md,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: SP.xxl,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SP.md,
    borderTopWidth: 1,
    borderTopColor: C.borderSubtle,
  },
  ftDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: SP.sm,
  },
  ftText: {
    fontSize: FONT.sm,
    color: C.textMuted,
  },
});
