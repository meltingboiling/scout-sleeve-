// ─────────────────────────────────────────────────────────────────────────────
// Scout Sleeve – Firebase helper
//
// Uses the MODULAR API (@react-native-firebase v23 / Firebase JS SDK v10 style)
// Zero deprecated namespaced calls.
// ─────────────────────────────────────────────────────────────────────────────

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { FS, ATHLETE } from '../constants';
import { markSynced } from './storage';

// ── Module-level uid cache ─────────────────────────────────────────────────
let _uid = null;

// ── Auth ──────────────────────────────────────────────────────────────────────
/**
 * Sign in anonymously (idempotent – reuses existing session).
 * @returns {string} uid
 */
export async function signInAnonymously() {
  try {
    const currentUser = auth().currentUser;
    if (currentUser) {
      _uid = currentUser.uid;
      console.log(`[Firebase] Already signed in: ${_uid}`);
      return _uid;
    }

    const cred = await auth().signInAnonymously();
    _uid = cred.user.uid;
    console.log(`[Firebase] Signed in anonymously: ${_uid}`);
    return _uid;
  } catch (err) {
    console.error('[Firebase] signInAnonymously failed:', err.message);
    throw err;
  }
}

/** Return current uid (throws if not signed in). */
export function getUid() {
  if (!_uid) { throw new Error('[Firebase] Not signed in yet.'); }
  return _uid;
}

// ── Athlete document ──────────────────────────────────────────────────────────
/**
 * Create athlete doc if it doesn't exist; update lastActive otherwise.
 */
export async function ensureAthleteDoc() {
  const uid   = getUid();
  const ref   = firestore().collection(FS.ATHLETES).doc(uid);
  const snap  = await ref.get();

  if (!snap.exists) {
    await ref.set({
      userId:            uid,
      name:              ATHLETE.name,
      age:               ATHLETE.age,
      position:          ATHLETE.position,
      club:              ATHLETE.club,
      country:           ATHLETE.country,
      totalJumps:        0,
      avgEfficiencyScore:0,
      avgValgusAngle:    0,
      avgPeakVerticalG:  0,
      avgPeakLateralG:   0,
      avgRotationalVel:  0,
      createdAt:         firestore.FieldValue.serverTimestamp(),
      lastActive:        firestore.FieldValue.serverTimestamp(),
    });
    console.log('[Firebase] Athlete doc created');
  } else {
    await ref.update({ lastActive: firestore.FieldValue.serverTimestamp() });
  }
}

// ── Sync ───────────────────────────────────────────────────────────────────────
/**
 * Batch-upload jumps to Firestore and update athlete aggregates.
 * @param {object[]} jumps – unsynced jump objects
 * @returns {{ synced: number, error?: string }}
 */
export async function syncJumps(jumps) {
  if (!jumps.length) { return { synced: 0 }; }

  const uid = getUid();

  try {
    // ── 1. Batch write jump docs ────────────────────────────────────────────
    const batch = firestore().batch();
    const syncedIds = [];

    jumps.forEach(j => {
      const docRef = firestore().collection(FS.JUMP_LOGS).doc();
      batch.set(docRef, {
        athleteId:          uid,
        timestamp:          j.timestamp,
        movementType:       j.movementType,
        riskLevel:          j.riskLevel,
        valgusAngle:        j.valgusAngle,
        tip:                j.tip,
        peakVerticalG:      j.peakVerticalG,
        peakLateralG:       j.peakLateralG,
        peakRotationalVel:  j.peakRotationalVel,
        verticalStdDev:     j.verticalStdDev,
        lateralStdDev:      j.lateralStdDev,
        efficiencyScore:    j.efficiencyScore,
        uploadedAt:         firestore.FieldValue.serverTimestamp(),
      });
      syncedIds.push(j.id);
    });

    await batch.commit();

    // ── 2. Update athlete aggregates (transaction) ──────────────────────────
    const athleteRef = firestore().collection(FS.ATHLETES).doc(uid);

    await firestore().runTransaction(async tx => {
      const snap = await tx.get(athleteRef);
      if (!snap.exists) { return; }

      const d         = snap.data();
      const prevTotal = d.totalJumps ?? 0;
      const newTotal  = prevTotal + jumps.length;

      const avg = (prev, values) =>
        Math.round(((prev * prevTotal + values.reduce((a, b) => a + b, 0)) / newTotal) * 100) / 100;

      tx.update(athleteRef, {
        totalJumps:         newTotal,
        avgEfficiencyScore: avg(d.avgEfficiencyScore ?? 0, jumps.map(j => j.efficiencyScore)),
        avgValgusAngle:     avg(d.avgValgusAngle     ?? 0, jumps.map(j => j.valgusAngle)),
        avgPeakVerticalG:   avg(d.avgPeakVerticalG   ?? 0, jumps.map(j => j.peakVerticalG)),
        avgPeakLateralG:    avg(d.avgPeakLateralG    ?? 0, jumps.map(j => j.peakLateralG)),
        avgRotationalVel:   avg(d.avgRotationalVel   ?? 0, jumps.map(j => j.peakRotationalVel)),
        lastActive:         firestore.FieldValue.serverTimestamp(),
      });
    });

    // ── 3. Mark as synced locally ───────────────────────────────────────────
    markSynced(syncedIds);

    console.log(`[Firebase] Synced ${jumps.length} jumps`);
    return { synced: jumps.length };
  } catch (err) {
    console.error('[Firebase] syncJumps failed:', err.message);
    return { synced: 0, error: err.message };
  }
}
