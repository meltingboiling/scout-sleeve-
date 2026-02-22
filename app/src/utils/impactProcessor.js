// ─────────────────────────────────────────────────────────────────────────────
// Scout Sleeve – Impact Processor
//
// Algorithms:
//   1. Circular buffer   – O(1) push, ordered read
//   2. Moving-avg filter – 3-sample kernel noise reduction
//   3. State machine     – IDLE → IMPACT_START → IMPACT_ACTIVE → IMPACT_END
//      (requires N consecutive samples above/below threshold to change state)
//   4. Feature extraction from impact window
//   5. Movement classification (multi-feature decision tree)
//   6. Valgus angle estimation (force-ratio proxy)
//   7. Efficiency score (placeholder; marked for TFLite replacement)
// ─────────────────────────────────────────────────────────────────────────────

import { THR, MOV, RISK, TIPS } from '../constants';

// ─── Circular buffer ──────────────────────────────────────────────────────────
class CircBuf {
  constructor(size) {
    this._buf  = new Array(size).fill(null);
    this._size = size;
    this._head = 0;    // next write position
    this._len  = 0;    // number of valid entries
  }

  push(item) {
    this._buf[this._head] = item;
    this._head = (this._head + 1) % this._size;
    if (this._len < this._size) { this._len++; }
  }

  /** Returns items in chronological order (oldest → newest). */
  toArray() {
    const arr = [];
    if (this._len < this._size) {
      for (let i = 0; i < this._len; i++) { arr.push(this._buf[i]); }
    } else {
      for (let i = 0; i < this._size; i++) {
        arr.push(this._buf[(this._head + i) % this._size]);
      }
    }
    return arr;
  }

  get length() { return this._len; }
  clear() { this._head = 0; this._len = 0; }
}

// ─── State machine states ─────────────────────────────────────────────────────
const S = { IDLE: 0, CONFIRM: 1, ACTIVE: 2, RELEASE: 3 };

// ─── Processor singleton ──────────────────────────────────────────────────────
class ImpactProcessor {
  constructor() {
    this._buf              = new CircBuf(THR.BUFFER_SAMPLES);
    this._state            = S.IDLE;
    this._confirmCount     = 0;
    this._releaseCount     = 0;
    this._impactStartIdx   = 0;  // logical sample index when impact began
    this._sampleIndex      = 0;  // ever-incrementing logical index
    this._maWindow         = []; // moving-average accumulator
  }

  // ── Public: feed one sample; returns an ImpactEvent or null ─────────────
  process(sample) {
    this._sampleIndex++;
    this._buf.push({ ...sample, _idx: this._sampleIndex });

    // Moving-average filter on vertical (az)
    this._maWindow.push(Math.abs(sample.az) / 9.81);
    if (this._maWindow.length > THR.NOISE_WINDOW) { this._maWindow.shift(); }
    const vertG = this._maWindow.reduce((a, b) => a + b, 0) / this._maWindow.length;

    switch (this._state) {
      case S.IDLE:
        if (vertG > THR.IMPACT_START_G) {
          this._confirmCount++;
          if (this._confirmCount >= THR.IMPACT_CONFIRM) {
            this._state          = S.ACTIVE;
            this._impactStartIdx = this._sampleIndex - THR.IMPACT_CONFIRM;
            this._confirmCount   = 0;
          }
        } else {
          this._confirmCount = 0;
        }
        break;

      case S.ACTIVE:
        if (vertG < THR.IMPACT_END_G) {
          this._releaseCount++;
          if (this._releaseCount >= THR.IMPACT_RELEASE) {
            this._state         = S.IDLE;
            this._releaseCount  = 0;
            this._confirmCount  = 0;
            return this._buildEvent();
          }
        } else {
          this._releaseCount = 0;
        }
        break;

      default:
        break;
    }
    return null;
  }

  // ── Build event from current buffer ─────────────────────────────────────
  _buildEvent() {
    const all  = this._buf.toArray().filter(Boolean);

    // Extract window around impact
    const startLogi = Math.max(0, this._impactStartIdx - THR.PRE_SAMPLES);
    const window    = all.filter(s =>
      s._idx >= startLogi &&
      s._idx <= this._sampleIndex + THR.POST_SAMPLES,
    );

    if (window.length < 5) { return null; }

    const features = extractFeatures(window);
    const movType  = classifyMovement(features);
    const { riskLevel, valgusAngle } = detectValgus(features, movType);
    const tip      = TIPS[movType][riskLevel];
    const score    = placeholderEfficiency(features);

    return {
      timestamp:         new Date().toISOString(),
      movementType:      movType,
      riskLevel,
      valgusAngle:       round1(valgusAngle),
      tip,
      peakVerticalG:     round3(features.peakVertG),
      peakLateralG:      round3(features.peakLatG),
      peakRotationalVel: round3(features.peakRotZ),
      verticalStdDev:    round3(features.stdAz),
      lateralStdDev:     round3(features.stdAx),
      efficiencyScore:   score,
    };
  }

  reset() {
    this._buf.clear();
    this._state          = S.IDLE;
    this._confirmCount   = 0;
    this._releaseCount   = 0;
    this._sampleIndex    = 0;
    this._maWindow       = [];
  }
}

// ─── Feature extraction ──────────────────────────────────────────────────────
function extractFeatures(win) {
  const ax = win.map(s => s.ax);
  const az = win.map(s => s.az);
  const gz = win.map(s => s.gz);
  const ts = win.map(s => s.ts);          // sensor millis

  const absAz  = az.map(Math.abs);
  const absAx  = ax.map(Math.abs);
  const absGz  = gz.map(v => Math.abs(v));

  const peakVertG  = Math.max(...absAz) / 9.81;
  const peakLatG   = Math.max(...absAx) / 9.81;
  const peakRotZ   = Math.max(...absGz);

  const stdAz  = stdDev(az);
  const stdAx  = stdDev(ax);

  // Timing: ms from window start to peaks
  const peakVertIdx   = absAz.indexOf(Math.max(...absAz));
  const peakLatIdx    = absAx.indexOf(Math.max(...absAx));
  const tStart        = ts[0] ?? 0;
  const vertDurS      = ((ts[peakVertIdx] ?? tStart) - tStart) / 1_000;
  const latPeakTimeS  = ((ts[peakLatIdx]  ?? tStart) - tStart) / 1_000;
  const latVertRatio  = peakVertG > 0 ? peakLatG / peakVertG : 0;

  return { peakVertG, peakLatG, peakRotZ, stdAz, stdAx, vertDurS, latPeakTimeS, latVertRatio };
}

// ─── Movement classification (multi-feature decision tree) ───────────────────
function classifyMovement({ peakRotZ, vertDurS, latVertRatio, latPeakTimeS }) {
  // High rotation + significant lateral component → CUTTING
  if (peakRotZ > THR.CUTTING_ROT_RAD && latVertRatio > 0.25) {
    return MOV.CUTTING;
  }
  // Lateral peak arrives before vertical peak → CUTTING (direction change)
  if (latPeakTimeS < vertDurS && latPeakTimeS > 0) {
    return MOV.CUTTING;
  }
  // Long vertical duration + low rotation → LANDING
  if (vertDurS > THR.LANDING_DUR_S && peakRotZ < 2.5) {
    return MOV.LANDING;
  }
  // Dominant vertical, minimal lateral → LANDING
  if (latVertRatio < 0.2) {
    return MOV.LANDING;
  }
  return MOV.UNKNOWN;
}

// ─── Valgus estimation (physics-ratio proxy; replace with dual-sensor model) ─
function detectValgus({ peakLatG, latVertRatio }, movType) {
  // Estimated valgus angle from force ratio (simplified trig model)
  let angle = Math.atan(latVertRatio) * (180 / Math.PI);

  // Cutting typically shows ~30 % more valgus than landing at same load
  if (movType === MOV.CUTTING) { angle *= 1.3; }

  // Add small realistic noise (remove when real model ships)
  angle += (Math.random() - 0.5) * 2;

  const riskLevel = (peakLatG > THR.HIGH_RISK_LAT_G || latVertRatio > 0.5)
    ? RISK.HIGH
    : RISK.LOW;

  // Clamp to biomechanically plausible range
  if (riskLevel === RISK.HIGH) { angle = Math.max(angle, 14); }
  else                         { angle = Math.min(angle, 11); }

  return { riskLevel, valgusAngle: Math.min(Math.max(angle, 0), 35) };
}

// ─── Efficiency score (placeholder) ──────────────────────────────────────────
// TODO: Replace with TFLite inference once model is trained.
// Input feature order: [peakVertG, peakLatG, peakRotZ, stdAz, stdAx]
// Normalise using provided mean/scale, then run model.predict(features).
function placeholderEfficiency({ peakVertG, peakLatG, peakRotZ, stdAz, stdAx, latVertRatio }) {
  let s = 50;
  s += Math.min(20,  (peakVertG - 2) * 6);   // vertical power   (higher = better)
  s -= Math.min(20,  peakLatG * 8);            // lateral load     (lower  = better)
  s -= Math.min(12,  peakRotZ * 3);            // rotation         (lower  = better)
  s -= Math.min(8,   (stdAz + stdAx) * 1.5);  // variability      (lower  = better)
  if (latVertRatio < 0.2) { s += 8; }         // balance bonus
  return Math.min(100, Math.max(0, Math.round(s)));
}

// ─── Math helpers ────────────────────────────────────────────────────────────
function stdDev(arr) {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
}
const round1 = v => Math.round(v * 10)   / 10;
const round3 = v => Math.round(v * 1000) / 1000;

// Export singleton
export default new ImpactProcessor();
export { ImpactProcessor, extractFeatures, classifyMovement, detectValgus };
