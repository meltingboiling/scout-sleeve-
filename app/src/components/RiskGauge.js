// ─────────────────────────────────────────────────────────────────────────────
// Scout Sleeve – RiskGauge component
// SVG circle arc with animated glow ring.
// Uses react-native-svg ^15 (new-arch compatible).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { C, FONT, RISK_COLOR } from '../constants';

const SIZE     = 200;
const CENTER   = SIZE / 2;
const RADIUS   = 80;
const STROKE   = 6;

export default function RiskGauge({ riskLevel, valgusAngle }) {
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const color = RISK_COLOR[riskLevel] ?? RISK_COLOR.IDLE;

  // Continuous glow pulse
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.65, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.30, duration: 2000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glowAnim]);

  // Pulse on risk change
  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.08, duration: 140, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.00, duration: 140, useNativeDriver: true }),
    ]).start();
  }, [riskLevel, valgusAngle]);

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      {/* Glow halo */}
      <Animated.View style={[styles.glow, { backgroundColor: color, opacity: glowAnim }]} />

      {/* SVG ring */}
      <Svg width={SIZE} height={SIZE}>
        <Defs>
          <RadialGradient id="grd" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor={color} stopOpacity="0.18" />
            <Stop offset="100%" stopColor={color} stopOpacity="0"    />
          </RadialGradient>
        </Defs>
        {/* Background fill */}
        <Rect width={SIZE} height={SIZE} fill="url(#grd)" />
        {/* Background ring */}
        <Circle
          cx={CENTER} cy={CENTER} r={RADIUS}
          fill="none"
          stroke={C.bgElevated}
          strokeWidth={STROKE + 4}
        />
        {/* Coloured ring */}
        <Circle
          cx={CENTER} cy={CENTER} r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          opacity={0.9}
        />
      </Svg>

      {/* Inner content (absolute-positioned over SVG) */}
      <View style={styles.inner} pointerEvents="none">
        <Text style={[styles.angle, { color }]}>
          {valgusAngle.toFixed(1)}°
        </Text>
        <Text style={styles.label}>VALGUS</Text>
        <View style={[styles.dot, { backgroundColor: color }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: SIZE * 0.9,
    height: SIZE * 0.9,
    borderRadius: SIZE * 0.45,
  },
  inner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  angle: {
    fontSize: FONT.giant,
    fontWeight: FONT.semibold,
    letterSpacing: -1,
  },
  label: {
    fontSize: FONT.xs,
    color: C.textMuted,
    letterSpacing: 2,
    marginTop: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 8,
  },
});
