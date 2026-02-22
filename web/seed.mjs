// ============================================================
// seed.mjs — Populate Firestore with mock data for testing
//
// HOW TO RUN:
//   1. npm install firebase-admin (in this folder or globally)
//   2. Download your Firebase service account key from:
//      Firebase Console → Project Settings → Service Accounts
//      → Generate new private key → save as serviceAccountKey.json
//      in the SAME folder as this script
//   3. node seed.mjs
// ============================================================

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'

// Load service account key
let serviceAccount
try {
  serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'))
} catch {
  console.error('❌ serviceAccountKey.json not found! Download it from Firebase Console.')
  process.exit(1)
}

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

// ─── Mock Data ───────────────────────────────────────────────

const ATHLETES = [
  { id: 'demo-user-001', name: 'Rahul Sharma',      age: 16, position: 'Midfielder', club: 'United Youth Academy', country: 'India',   efficiencyScore: 87, totalJumps: 42, avgValgusAngle: 8.4,  avgPeakVerticalG: 4.2, avgPeakLateralG: 2.1, avgRotationalVel: 2.3 },
  { id: 'player-002',    name: 'Arjun Mehta',       age: 15, position: 'Forward',    club: 'Mumbai FC Youth',      country: 'India',   efficiencyScore: 92, totalJumps: 38, avgValgusAngle: 6.2,  avgPeakVerticalG: 4.8, avgPeakLateralG: 1.9, avgRotationalVel: 2.1 },
  { id: 'player-003',    name: 'Lucas Silva',        age: 17, position: 'Defender',   club: 'São Paulo Academy',    country: 'Brazil',  efficiencyScore: 74, totalJumps: 55, avgValgusAngle: 12.1, avgPeakVerticalG: 3.9, avgPeakLateralG: 2.4, avgRotationalVel: 2.7 },
  { id: 'player-004',    name: 'Emma Chen',          age: 14, position: 'Midfielder', club: 'Beijing Sports School', country: 'China',  efficiencyScore: 95, totalJumps: 67, avgValgusAngle: 5.8,  avgPeakVerticalG: 3.7, avgPeakLateralG: 1.7, avgRotationalVel: 1.9 },
  { id: 'player-005',    name: 'Carlos Mendez',      age: 18, position: 'Forward',    club: 'Barcelona B',          country: 'Spain',   efficiencyScore: 81, totalJumps: 91, avgValgusAngle: 9.3,  avgPeakVerticalG: 5.1, avgPeakLateralG: 2.3, avgRotationalVel: 2.5 },
  { id: 'player-006',    name: 'Ahmed Al-Rashid',    age: 16, position: 'Goalkeeper', club: 'Dubai Sports City',    country: 'UAE',     efficiencyScore: 68, totalJumps: 29, avgValgusAngle: 14.2, avgPeakVerticalG: 3.2, avgPeakLateralG: 1.5, avgRotationalVel: 1.8 },
  { id: 'player-007',    name: 'Priya Nair',         age: 15, position: 'Defender',   club: 'Kerala Blasters Youth', country: 'India',  efficiencyScore: 79, totalJumps: 48, avgValgusAngle: 10.7, avgPeakVerticalG: 3.8, avgPeakLateralG: 2.0, avgRotationalVel: 2.2 },
  { id: 'player-008',    name: 'Kenji Tanaka',       age: 17, position: 'Midfielder', club: 'Gamba Osaka Youth',    country: 'Japan',   efficiencyScore: 88, totalJumps: 73, avgValgusAngle: 7.9,  avgPeakVerticalG: 4.4, avgPeakLateralG: 2.2, avgRotationalVel: 2.4 },
  { id: 'player-009',    name: 'Fatima Ouedraogo',   age: 16, position: 'Forward',    club: 'ASEC Mimosas',         country: 'Ghana',   efficiencyScore: 55, totalJumps: 22, avgValgusAngle: 17.3, avgPeakVerticalG: 5.4, avgPeakLateralG: 2.9, avgRotationalVel: 3.1 },
  { id: 'player-010',    name: 'Marcus Johnson',     age: 14, position: 'Midfielder', club: 'Manchester City EDS',  country: 'England', efficiencyScore: 91, totalJumps: 58, avgValgusAngle: 6.5,  avgPeakVerticalG: 4.0, avgPeakLateralG: 1.8, avgRotationalVel: 2.0 },
]

const MOVEMENT_TYPES = ['CUTTING', 'LANDING', 'UNKNOWN']
const RISK_TIPS = {
  LOW:  ['Great landing mechanics!', 'Excellent knee alignment.', 'Good cut technique.', 'Solid deceleration.'],
  HIGH: ['Knee valgus detected — focus on hip abductor strength.', 'High impact load — check landing mechanics.', 'Excessive trunk lean observed.', 'Reduce rotational stress on cuts.'],
}

function rand(min, max) { return Math.random() * (max - min) + min }
function randInt(min, max) { return Math.floor(rand(min, max)) }

function generateJumps(athleteId, baseScore, count = 30) {
  const jumps = []
  const now = Date.now()
  for (let i = 0; i < count; i++) {
    const isHigh = Math.random() < (baseScore < 70 ? 0.4 : 0.15)
    const risk = isHigh ? 'HIGH' : 'LOW'
    const score = Math.max(0, Math.min(100, baseScore + randInt(-15, 15)))
    const tips = RISK_TIPS[risk]
    jumps.push({
      athleteId,
      timestamp: new Date(now - i * rand(5, 120) * 60000).toISOString(),
      movementType: MOVEMENT_TYPES[randInt(0, 3)],
      riskLevel: risk,
      valgusAngle: parseFloat(rand(isHigh ? 12 : 3, isHigh ? 22 : 12).toFixed(1)),
      peakVerticalG: parseFloat(rand(2.5, 6.5).toFixed(2)),
      peakLateralG: parseFloat(rand(0.8, 3.5).toFixed(2)),
      peakRotationalVel: parseFloat(rand(1.0, 4.5).toFixed(2)),
      verticalStdDev: parseFloat(rand(0.05, 0.3).toFixed(2)),
      lateralStdDev: parseFloat(rand(0.04, 0.2).toFixed(2)),
      efficiencyScore: score,
      tip: tips[randInt(0, tips.length)],
    })
  }
  return jumps
}

// ─── Write to Firestore ──────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding Firestore with mock Scout Dashboard data...\n')

  const batch = db.batch()
  let jumpCount = 0

  for (const a of ATHLETES) {
    const { id, ...athleteData } = a
    // Add timestamps
    athleteData.userId = id
    athleteData.lastActive = new Date(Date.now() - randInt(10, 300) * 60000).toISOString()

    // Write athlete doc
    batch.set(db.collection('athletes').doc(id), athleteData)
    console.log(`  ✅ Athlete: ${athleteData.name} (ID: ${id})`)
  }

  await batch.commit()
  console.log('\n✅ Athletes written to Firestore.')

  // Write jump logs (one at a time due to batch size limits)
  console.log('\n🏃 Writing jump logs...')
  for (const a of ATHLETES) {
    const jumps = generateJumps(a.id, a.efficiencyScore, randInt(25, 50))
    for (const jump of jumps) {
      await db.collection('jumpLogs').add(jump)
      jumpCount++
    }
    console.log(`  ✅ ${jumps.length} jumps for ${a.name}`)
  }

  console.log(`\n🎉 Done! Seeded ${ATHLETES.length} athletes + ${jumpCount} jump logs.`)
  console.log('\nYour Firestore collections:')
  console.log('  📁 athletes  — one doc per athlete')
  console.log('  📁 jumpLogs  — filtered by athleteId field')
  process.exit(0)
}

seed().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
