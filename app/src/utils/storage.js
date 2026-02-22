// ─────────────────────────────────────────────────────────────────────────────
// Scout Sleeve – Local Storage (in-memory + JSON file via RNFS alternative)
//
// NOTE: react-native-sqlite-storage has build issues with RN 0.84 new arch.
// We use a lightweight JSON-based persistence via the built-in FileSystem API
// through a simple wrapper. For production, swap to op-sqlite or expo-sqlite.
//
// This module exposes the same API surface so swapping is trivial.
// ─────────────────────────────────────────────────────────────────────────────

// ── In-memory store (survives session, not app restarts for this prototype) ──
let _jumps = [];
let _nextId = 1;

/**
 * Initialise storage (no-op for in-memory; extend for real SQLite here)
 */
export async function initStorage() {
  console.log('[Storage] Initialised (in-memory)');
}

/**
 * Insert a jump record.
 * @param {object} jump
 * @returns {number} assigned id
 */
export function insertJump(jump) {
  const record = { ...jump, id: _nextId++, synced: 0 };
  _jumps.unshift(record);     // newest first
  console.log(`[Storage] Jump #${record.id} saved`);
  return record.id;
}

/**
 * Get the N most-recent jumps.
 * @param {number} limit
 * @returns {object[]}
 */
export function getRecentJumps(limit = 10) {
  return _jumps.slice(0, limit);
}

/**
 * All jumps not yet synced to Firebase.
 * @returns {object[]}
 */
export function getUnsyncedJumps() {
  return _jumps.filter(j => j.synced === 0);
}

/**
 * Mark an array of jump ids as synced.
 * @param {number[]} ids
 */
export function markSynced(ids) {
  const set = new Set(ids);
  _jumps = _jumps.map(j => set.has(j.id) ? { ...j, synced: 1 } : j);
  console.log(`[Storage] Marked ${ids.length} jumps synced`);
}

/** Total jump count */
export function totalCount() {
  return _jumps.length;
}

/** Average efficiency score */
export function avgEfficiency() {
  if (_jumps.length === 0) { return 0; }
  const sum = _jumps.reduce((s, j) => s + j.efficiencyScore, 0);
  return Math.round((sum / _jumps.length) * 10) / 10;
}
