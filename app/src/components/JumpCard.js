// ─────────────────────────────────────────────────────────────────────────────
// Scout Sleeve – JumpCard component
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, SP, RADIUS, FONT, RISK_COLOR } from '../constants';

export default function JumpCard({ jump }) {
  const riskColor = RISK_COLOR[jump.riskLevel] ?? RISK_COLOR.LOW;
  const time = new Date(jump.timestamp).toLocaleTimeString('en-US', {
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <View style={styles.card}>
      {/* Row 1: time + risk dot */}
      <View style={styles.row}>
        <Text style={styles.time}>{time}</Text>
        <View style={[styles.riskDot, { backgroundColor: riskColor }]} />
      </View>

      {/* Row 2: type badge + angle */}
      <View style={[styles.row, { marginTop: SP.xs }]}>
        <View style={[styles.badge, { borderColor: riskColor }]}>
          <Text style={[styles.badgeText, { color: riskColor }]}>
            {jump.movementType}
          </Text>
        </View>
        <Text style={[styles.angle, { color: riskColor }]}>
          {jump.valgusAngle.toFixed(1)}°
        </Text>
      </View>

      {/* Tip */}
      <Text style={styles.tip} numberOfLines={2}>{jump.tip}</Text>

      {/* Stats row */}
      <View style={[styles.row, { marginTop: SP.sm }]}>
        <Stat label="VERT" value={`${jump.peakVerticalG.toFixed(1)}g`} />
        <Stat label="LAT"  value={`${jump.peakLateralG.toFixed(1)}g`} />
        <Stat label="EFF"  value={`${jump.efficiencyScore}`}            accent />
      </View>
    </View>
  );
}

function Stat({ label, value, accent }) {
  return (
    <View style={statStyles.wrap}>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, accent && { color: C.accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.bgCard,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    padding: SP.md,
    marginBottom: SP.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: FONT.sm,
    color: C.textMuted,
  },
  riskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  badge: {
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingVertical: 2,
    paddingHorizontal: SP.sm,
  },
  badgeText: {
    fontSize: FONT.xs,
    fontWeight: FONT.medium,
    letterSpacing: 1,
  },
  angle: {
    fontSize: FONT.xl,
    fontWeight: FONT.semibold,
  },
  tip: {
    fontSize: FONT.sm,
    color: C.textMuted,
    marginTop: SP.xs,
    lineHeight: 18,
  },
});

const statStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 10,
    color: C.textMuted,
    letterSpacing: 1.5,
  },
  value: {
    fontSize: FONT.md,
    fontWeight: FONT.semibold,
    color: C.textSecondary,
    marginTop: 2,
  },
});
