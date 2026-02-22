// src/pages/LiveDemo.jsx
//
// Change DEMO_ATHLETE_ID to the Firebase document ID of the athlete
// you want to showcase in presentations. This updates in real-time.

import { useAthlete, useLatestJump } from '../hooks/useFirestore'
import { scoreClass, scoreBadge, valgusLabel, riskBadge, timeAgo, getScore } from '../utils/filters'

// ─── 🔴 CHANGE THIS to your demo athlete's Firestore document ID ─
const DEMO_ATHLETE_ID = 'demo-user-001'
// ─────────────────────────────────────────────────────────────────

export default function LiveDemo() {
  const { athlete, loading: aLoad } = useAthlete(DEMO_ATHLETE_ID)
  const { jump,    loading: jLoad } = useLatestJump(DEMO_ATHLETE_ID)

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center pt-4">
        <div className="inline-flex items-center gap-2 bg-danger-500/10 border border-danger-500/20 rounded-full px-4 py-1.5 mb-4">
          <span className="w-2 h-2 rounded-full bg-danger-400 animate-pulse" />
          <span className="text-xs font-mono font-semibold text-danger-400 uppercase tracking-widest">Live Session</span>
        </div>
        <h1 className="font-display font-bold text-5xl uppercase tracking-wider text-white">
          Live Demo
        </h1>
        <p className="text-grass-400/50 mt-2 text-sm">
          Real-time data stream · Updates automatically
        </p>
      </div>

      {aLoad ? (
        <LiveSkeleton />
      ) : !athlete ? (
        <NoDemoAthlete id={DEMO_ATHLETE_ID} />
      ) : (
        <>
          {/* Athlete card */}
          <AthleteHero athlete={athlete} />

          {/* Latest jump */}
          <div className="panel p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-bold uppercase tracking-widest text-lg text-grass-400">
                Latest Event
              </h2>
              {!jLoad && jump && (
                <span className="text-xs font-mono text-grass-400/40">{timeAgo(jump.timestamp)}</span>
              )}
            </div>
            {jLoad ? (
              <div className="h-24 bg-pitch-800/50 rounded-lg animate-pulse" />
            ) : !jump ? (
              <div className="text-center py-8 text-grass-400/30 text-sm">No events recorded yet</div>
            ) : (
              <LatestJumpCard jump={jump} />
            )}
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Total Events"   value={athlete.totalJumps}          unit=""      />
            <StatTile label="Avg Valgus"     value={athlete.avgValgusAngle}      unit="°"     isValgus />
            <StatTile label="Peak Vertical"  value={athlete.avgPeakVerticalG}    unit="G"     />
            <StatTile label="Rotational Vel" value={athlete.avgRotationalVel}    unit="rad/s" />
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function AthleteHero({ athlete }) {
  const score = getScore(athlete)
  const badge = scoreBadge(score)
  return (
    <div className="panel p-8 text-center relative overflow-hidden">
      <div className="absolute right-6 top-1/2 -translate-y-1/2 font-display font-black text-[120px] text-grass-500/05 leading-none select-none pointer-events-none">
        {score}
      </div>
      <div className="relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-pitch-700 border border-grass-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="font-display font-bold text-3xl text-grass-400">
            {athlete.name?.charAt(0)}
          </span>
        </div>
        <h2 className="font-display font-bold text-4xl uppercase tracking-wider text-white mb-1">
          {athlete.name}
        </h2>
        <div className="flex items-center justify-center gap-4 text-sm text-grass-400/60 mb-6">
          <span>{athlete.position}</span>
          <span>·</span>
          <span>{athlete.club}</span>
          <span>·</span>
          <span>{athlete.country}</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <div className={`text-7xl font-display font-black ${score >= 80 ? 'text-grass-400' : score >= 60 ? 'text-amber-400' : 'text-danger-400'}`}>
            {score}
          </div>
          <div className="text-left">
            <div className={`badge ${badge.bg} mb-1`}>{badge.label}</div>
            <div className="text-xs text-grass-400/40">Biomechanical<br/>Efficiency Score</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LatestJumpCard({ jump }) {
  const v    = valgusLabel(jump.valgusAngle)
  const risk = riskBadge(jump.riskLevel)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="bg-pitch-800/50 rounded-xl p-4 border border-grass-500/10">
        <div className="text-[11px] uppercase tracking-widest text-grass-400/40 font-display mb-2">Movement</div>
        <div className="font-mono font-bold text-white">{jump.movementType}</div>
      </div>
      <div className="bg-pitch-800/50 rounded-xl p-4 border border-grass-500/10">
        <div className="text-[11px] uppercase tracking-widest text-grass-400/40 font-display mb-2">Valgus Angle</div>
        <div className={`font-mono font-bold text-2xl ${v.color}`}>{jump.valgusAngle?.toFixed(1)}°</div>
      </div>
      <div className="bg-pitch-800/50 rounded-xl p-4 border border-grass-500/10">
        <div className="text-[11px] uppercase tracking-widest text-grass-400/40 font-display mb-2">Risk Level</div>
        <span className={`badge ${risk.bg} ${risk.color} uppercase`}>{jump.riskLevel}</span>
      </div>
      <div className="bg-pitch-800/50 rounded-xl p-4 border border-grass-500/10">
        <div className="text-[11px] uppercase tracking-widest text-grass-400/40 font-display mb-2">Score</div>
        <div className={`font-mono font-bold text-2xl ${scoreClass(jump.efficiencyScore).includes('high') ? 'text-grass-400' : 'text-amber-400'}`}>
          {jump.efficiencyScore}
        </div>
      </div>
      {jump.tip && (
        <div className="col-span-full bg-grass-500/08 border border-grass-500/15 rounded-xl p-4">
          <div className="text-[11px] uppercase tracking-widest text-grass-400/40 font-display mb-1">AI Feedback</div>
          <div className="text-sm text-grass-300 italic">"{jump.tip}"</div>
        </div>
      )}
    </div>
  )
}

function StatTile({ label, value, unit, isValgus }) {
  const v = isValgus ? valgusLabel(value) : null
  return (
    <div className="panel p-4 text-center">
      <div className="text-[10px] uppercase tracking-widest text-grass-400/40 font-display mb-2">{label}</div>
      <div className={`font-display font-bold text-3xl ${v ? v.color : 'text-grass-400'}`}>
        {typeof value === 'number' ? value.toFixed(unit === '' ? 0 : 1) : '—'}
        <span className="text-sm ml-1 opacity-60">{unit}</span>
      </div>
    </div>
  )
}

function NoDemoAthlete({ id }) {
  return (
    <div className="panel p-10 text-center">
      <div className="text-5xl mb-4">🎯</div>
      <h3 className="font-display font-bold text-2xl uppercase text-grass-400/60 mb-2">Demo Athlete Not Found</h3>
      <p className="text-sm text-grass-400/40 max-w-md mx-auto mb-4">
        No athlete document found with ID <code className="font-mono bg-pitch-800 px-2 py-0.5 rounded text-grass-400">{id}</code> in Firestore.
      </p>
      <p className="text-xs text-grass-400/30">
        Open <code className="font-mono bg-pitch-800 px-1 rounded">src/pages/LiveDemo.jsx</code> and change <code className="font-mono">DEMO_ATHLETE_ID</code> to a valid athlete document ID.
      </p>
    </div>
  )
}

function LiveSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="panel p-8 h-64 bg-pitch-800/30" />
      <div className="panel p-6 h-40 bg-pitch-800/30" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({length:4}).map((_,i) => <div key={i} className="panel p-4 h-20 bg-pitch-800/30" />)}
      </div>
    </div>
  )
}
