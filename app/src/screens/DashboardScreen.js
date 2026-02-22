// ─────────────────────────────────────────────────────────────────────────────
// Scout Sleeve – Dashboard Screen v2 (FIXED)
// 
// FIXES:
// - Impact state (risk/valgus/tip) held for 2 seconds minimum
// - No more flickering at 50 Hz
// - Clear visual feedback on detected jumps
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useState, useEffect, useCallback, useRef,
} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  subscribeToData,
  disconnectDevice,
  parseCsv,
} from '../utils/ble';
import impactDetector from '../utils/impactProcessor';
import {
  insertJump,
  getRecentJumps,
  getUnsyncedJumps,
  avgEfficiency,
} from '../utils/storage';
import { syncJumps } from '../utils/firebase';
import RiskGauge from '../components/RiskGauge';
import JumpCard  from '../components/JumpCard';
import { C, SP, FONT, RADIUS, RISK, RISK_COLOR } from '../constants';

const MAX_HISTORY = 10;
const DISPLAY_HOLD_MS = 2000; // Hold impact state for 2 seconds

export default function DashboardScreen({ route, navigation }) {
  const { deviceId, deviceName } = route.params;
  const insets = useSafeAreaInsets();

  // ── State ─────────────────────────────────────────────────────────────────
  const [riskLevel,     setRiskLevel]     = useState(RISK.IDLE);
  const [valgusAngle,   setValgusAngle]   = useState(0);
  const [tip,           setTip]           = useState('Waiting for first movement…');
  const [efficiency,    setEfficiency]    = useState(0);
  const [recentJumps,   setRecentJumps]   = useState([]);
  const [sampleCount,   setSampleCount]   = useState(0);
  const [connected,     setConnected]     = useState(true);
  const [syncing,       setSyncing]       = useState(false);

  // ── Refs for managing display hold timer ─────────────────────────────────
  const sampleRef = useRef(0);
  const holdTimerRef = useRef(null);
  const isHoldingRef = useRef(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const refreshHistory = useCallback(() => {
    const jumps = getRecentJumps(MAX_HISTORY);
    setRecentJumps(jumps);
    setEfficiency(avgEfficiency());
  }, []);

  const instantaneousRisk = useCallback(({ az, ax }) => {
    const vG = Math.abs(az) / 9.81;
    const lG = Math.abs(ax) / 9.81;
    if (lG > 2.0) { return RISK.HIGH; }
    if (vG > 3.0) { return RISK.LOW;  }
    return RISK.IDLE;
  }, []);

  // ── Clear hold timer on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  // ── Subscribe to BLE data ─────────────────────────────────────────────────
  useEffect(() => {
    impactDetector.reset();
    refreshHistory();

    subscribeToData(
      // onData
      csvLine => {
        const s = parseCsv(csvLine);
        if (!s) { return; }

        // Update sample counter (batched to avoid render per-sample)
        sampleRef.current++;
        if (sampleRef.current % 25 === 0) {
          setSampleCount(sampleRef.current);
        }

        // ── CRITICAL FIX: Only update instantaneous risk if NOT holding ────
        if (!isHoldingRef.current) {
          const currentRisk = instantaneousRisk(s);
          setRiskLevel(currentRisk);
        }

        // Impact detection
        const event = impactDetector.process(s);
        if (event) {
          console.log('[Dashboard] Impact detected:', event.movementType, event.riskLevel);

          // Save to database
          insertJump(event);

          // ── HOLD STATE FOR 2 SECONDS ─────────────────────────────────────
          isHoldingRef.current = true;

          // Clear any existing hold timer
          if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
          }

          // Update UI immediately with impact data
          setValgusAngle(event.valgusAngle);
          setRiskLevel(event.riskLevel);
          setTip(event.tip);

          // Hold for 2 seconds, then return to IDLE
          holdTimerRef.current = setTimeout(() => {
            isHoldingRef.current = false;
            setRiskLevel(RISK.IDLE);
            setValgusAngle(0);
            setTip('Waiting for next movement…');
          }, DISPLAY_HOLD_MS);

          // Refresh history
          refreshHistory();
        }
      },
      // onDisconnect
      () => {
        setConnected(false);
        Alert.alert(
          'Disconnected',
          'Scout Sleeve sensor disconnected.',
          [{ text: 'OK', onPress: () => navigation.replace('Scan') }],
        );
      },
    );

    return () => {
      // Subscription is cleaned up in disconnectDevice call or by ble.js
    };
  }, [instantaneousRisk, navigation, refreshHistory]);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(() => {
    Alert.alert(
      'Disconnect',
      'Disconnect from Scout Sleeve?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnectDevice();
            navigation.replace('Scan');
          },
        },
      ],
    );
  }, [navigation]);

  // ── Cloud sync ────────────────────────────────────────────────────────────
  const handleSync = useCallback(async () => {
    const unsynced = getUnsyncedJumps();

    if (!unsynced.length) {
      Alert.alert('Nothing to Sync', 'All movements are already in the cloud.');
      return;
    }

    setSyncing(true);
    const result = await syncJumps(unsynced);
    setSyncing(false);

    if (result.synced > 0) {
      Alert.alert('Sync Complete', `Uploaded ${result.synced} movement${result.synced > 1 ? 's' : ''}.`);
      refreshHistory();
    } else {
      Alert.alert('Sync Failed', result.error ?? 'Unknown error.');
    }
  }, [refreshHistory]);

  // ── Render ────────────────────────────────────────────────────────────────
  const riskColor = RISK_COLOR[riskLevel] ?? RISK_COLOR.IDLE;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Fixed header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.connDot, { backgroundColor: connected ? C.green : C.red }]} />
          <Text style={styles.headerTitle}>{deviceName}</Text>
        </View>
        <Text style={styles.sampleBadge}>{sampleCount} samples</Text>
      </View>

      {/* ── Scrollable body ── */}
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Gauge */}
        <View style={styles.gaugeRow}>
          <RiskGauge riskLevel={riskLevel} valgusAngle={valgusAngle} />
        </View>

        {/* Risk label */}
        <Text style={[styles.riskLabel, { color: riskColor }]}>
          {riskLevel === RISK.IDLE ? 'IDLE' : `${riskLevel} RISK`}
        </Text>

        {/* Tip card */}
        <View style={styles.tipCard}>
          <Text style={styles.tipText}>{tip}</Text>
        </View>

        {/* Efficiency card */}
        <View style={styles.effCard}>
          <Text style={styles.effScore}>{efficiency}</Text>
          <Text style={styles.effLabel}>EFFICIENCY</Text>
        </View>

        {/* History */}
        <Text style={styles.sectionLabel}>RECENT MOVEMENTS</Text>

        {recentJumps.length === 0 ? (
          <Text style={styles.emptyHist}>
            No movements yet.{'\n'}Jump or cut to see data here.
          </Text>
        ) : (
          recentJumps.map(j => <JumpCard key={j.id} jump={j} />)
        )}
      </ScrollView>

      {/* ── Fixed bottom action bar ── */}
      <View style={[styles.bar, { paddingBottom: insets.bottom + SP.sm }]}>
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={handleSync}
          disabled={syncing}
          activeOpacity={0.8}
        >
          {syncing
            ? <ActivityIndicator size="small" color={C.textPrimary} />
            : <Text style={styles.syncBtnText}>SYNC TO CLOUD</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.discBtn}
          onPress={handleDisconnect}
          activeOpacity={0.8}
        >
          <Text style={styles.discBtnText}>DISCONNECT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bgPrimary,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SP.lg,
    paddingVertical: SP.md,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SP.sm,
  },
  headerTitle: {
    fontSize: FONT.lg,
    fontWeight: FONT.semibold,
    color: C.textPrimary,
  },
  sampleBadge: {
    fontSize: FONT.xs,
    color: C.textMuted,
    letterSpacing: 1,
  },

  // ── Body ──
  body: {
    paddingHorizontal: SP.lg,
    paddingTop: SP.xl,
  },
  gaugeRow: {
    alignItems: 'center',
    marginBottom: SP.md,
  },
  riskLabel: {
    textAlign: 'center',
    fontSize: FONT.sm,
    fontWeight: FONT.semibold,
    letterSpacing: 2,
    marginBottom: SP.lg,
  },
  tipCard: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    padding: SP.md,
    marginBottom: SP.lg,
  },
  tipText: {
    fontSize: FONT.md,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  effCard: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.accent,
    padding: SP.lg,
    alignItems: 'center',
    marginBottom: SP.xl,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 8,
  },
  effScore: {
    fontSize: 68,
    fontWeight: FONT.semibold,
    color: C.accent,
    lineHeight: 74,
  },
  effLabel: {
    fontSize: FONT.xs,
    color: C.textMuted,
    letterSpacing: 2.5,
    marginTop: SP.sm,
  },
  sectionLabel: {
    fontSize: FONT.xs,
    color: C.textMuted,
    letterSpacing: 2,
    marginBottom: SP.md,
  },
  emptyHist: {
    fontSize: FONT.md,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: SP.xl,
    lineHeight: 24,
  },

  // ── Bottom bar ──
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: SP.md,
    paddingHorizontal: SP.lg,
    paddingTop: SP.md,
    backgroundColor: C.bgElevated,
    borderTopWidth: 1,
    borderTopColor: C.borderSubtle,
  },
  syncBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: RADIUS.pill,
    paddingVertical: SP.md,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  syncBtnText: {
    fontSize: FONT.md,
    fontWeight: FONT.medium,
    color: C.textPrimary,
    letterSpacing: 1,
  },
  discBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.borderMed,
    borderRadius: RADIUS.pill,
    paddingVertical: SP.md,
    backgroundColor: C.bgCard,
  },
  discBtnText: {
    fontSize: FONT.md,
    fontWeight: FONT.medium,
    color: C.textMuted,
    letterSpacing: 1,
  },
});