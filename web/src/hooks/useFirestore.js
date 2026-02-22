// ============================================================
// src/hooks/useFirestore.js
//
// PRIMARY collection: jumpLogs
//   athleteId, efficiencyScore, lateralStdDev, verticalStdDev,
//   movementType, peakLateralG, peakRotationalVel, peakVerticalG,
//   riskLevel, timestamp (ISO string), tip, uploadedAt (Timestamp),
//   valgusAngle
//
// SECONDARY collection: athletes (used only for name/profile lookup)
//   name, position, club, country, age, userId
// ============================================================

import { useState, useEffect } from 'react'
import { collection, doc, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore'
import { db } from '../services/firebase'

// ─── Athletes map for name lookup ────────────────────────────
function useAthletesMap() {
  const [map, setMap] = useState({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'athletes'),
      snap => {
        const m = {}
        snap.docs.forEach(d => { m[d.id] = { id: d.id, ...d.data() } })
        setMap(m)
        setReady(true)
      },
      err => { console.error('athletes map error:', err); setReady(true) }
    )
    return () => unsub()
  }, [])

  return { map, ready }
}

// ─── ALL jumpLogs joined with athlete name/profile ────────────
// This is the PRIMARY hook for the leaderboard
export function useJumpLogs(limitCount = 300) {
  const [jumps,   setJumps]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const { map, ready } = useAthletesMap()

  useEffect(() => {
    if (!ready) return

    const q = query(
      collection(db, 'jumpLogs'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )

    const unsub = onSnapshot(q,
      snap => {
        const data = snap.docs.map(d => {
          const jump = { id: d.id, ...d.data() }
          const athlete = map[jump.athleteId] || {}
          return {
            ...jump,
            // Enrich with athlete profile
            name:     athlete.name     || `Athlete ${jump.athleteId?.slice(0,6) || '?'}`,
            position: athlete.position || '—',
            club:     athlete.club     || '—',
            country:  athlete.country  || '—',
            age:      athlete.age      || '—',
          }
        })
        setJumps(data)
        setLoading(false)
      },
      err => {
        console.error('useJumpLogs error:', err)
        setError(err.message)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [ready, limitCount])

  return { jumps, loading, error }
}

// ─── jumpLogs for ONE athlete (athlete detail page) ──────────
export function useAthleteJumps(athleteId, limitCount = 100) {
  const [jumps,   setJumps]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!athleteId) return

    // No orderBy here — sorting client-side to avoid needing a composite index
    const q = query(
      collection(db, 'jumpLogs'),
      where('athleteId', '==', athleteId),
      limit(limitCount)
    )

    const unsub = onSnapshot(q,
      snap => {
        setJumps(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      err => { console.error('useAthleteJumps error:', err); setError(err.message); setLoading(false) }
    )
    return () => unsub()
  }, [athleteId, limitCount])

  return { jumps, loading, error }
}

// ─── Single athlete doc ──────────────────────────────────────
export function useAthlete(id) {
  const [athlete, setAthlete] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!id) return
    const unsub = onSnapshot(doc(db, 'athletes', id),
      snap => {
        setAthlete(snap.exists() ? { id: snap.id, ...snap.data() } : null)
        setLoading(false)
      },
      err => { setError(err.message); setLoading(false) }
    )
    return () => unsub()
  }, [id])

  return { athlete, loading, error }
}

// ─── Latest jump for Live Demo ───────────────────────────────
export function useLatestJump(athleteId) {
  const [jump,    setJump]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!athleteId) return
    const q = query(
      collection(db, 'jumpLogs'),
      where('athleteId', '==', athleteId),
      limit(10)  // get a few, pick latest client-side
    )
    const unsub = onSnapshot(q, snap => {
      if (!snap.empty) {
        // Sort client-side since we can't use orderBy without a composite index
        const sorted = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        setJump(sorted[0])
      } else {
        setJump(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [athleteId])

  return { jump, loading }
}