// src/pages/AthleteDetail.jsx
// Shows all jumpLog entries for a specific athleteId
// Profile info pulled from athletes collection if available

import { useParams, useNavigate } from 'react-router-dom'
import { useAthlete, useAthleteJumps } from '../hooks/useFirestore'
import { scoreClass, scoreBadge, valgusLabel, riskBadge, formatTimestamp, timeAgo } from '../utils/filters'
import { ScoreTrendChart, RiskPieChart, ValgusTrendChart } from '../components/athlete/Charts'
import LoadingSkeleton, { SkeletonCard } from '../components/common/LoadingSkeleton'
import EmptyState, { ErrorState } from '../components/common/EmptyState'
import { useState } from 'react'

const PAGE_SIZE = 15

export default function AthleteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { athlete, loading: aLoad } = useAthlete(id)
  const { jumps: rawJumps, loading: jLoad, error: jErr } = useAthleteJumps(id, 100)
  // Sort client-side — no Firestore composite index needed
  const jumps = [...rawJumps].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  const [page, setPage] = useState(0)

  if (jErr) return <ErrorState message={jErr} />

  // Compute live averages from jumpLogs directly
  const avgScore   = jumps.length ? Math.round(jumps.reduce((s,j) => s + (j.efficiencyScore || 0), 0) / jumps.length) : 0
  const avgValgus  = jumps.length ? (jumps.reduce((s,j) => s + (j.valgusAngle || 0), 0) / jumps.length).toFixed(1) : 0
  const avgVertG   = jumps.length ? (jumps.reduce((s,j) => s + (j.peakVerticalG || 0), 0) / jumps.length).toFixed(2) : 0
  const avgLatG    = jumps.length ? (jumps.reduce((s,j) => s + (j.peakLateralG || 0), 0) / jumps.length).toFixed(2) : 0
  const avgRotVel  = jumps.length ? (jumps.reduce((s,j) => s + (j.peakRotationalVel || 0), 0) / jumps.length).toFixed(2) : 0
  const highRisk   = jumps.filter(j => j.riskLevel === 'HIGH').length

  const badge = scoreBadge(avgScore)
  const vInfo = valgusLabel(parseFloat(avgValgus))

  const totalPages = Math.ceil(jumps.length / PAGE_SIZE)
  const pageData   = jumps.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  // Name: from athletes collection if available, else from first jump's athleteId
  const displayName = athlete?.name || `Athlete ${id?.slice(0, 8)}`

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Profile Card ── */}
      <div className="panel p-6 flex flex-col sm:flex-row gap-6">
        <div className="w-16 h-16 rounded-2xl bg-pitch-700 border border-grass-500/20 flex items-center justify-center flex-shrink-0">
          <span className="font-display font-bold text-3xl text-grass-400">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="font-display font-bold text-3xl tracking-wide text-white uppercase">{displayName}</h1>
            <span className={`badge ${badge.bg}`}>{badge.label}</span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-grass-400/60 mb-4">
            {athlete?.position && <span>⚽ {athlete.position}</span>}
            {athlete?.club     && <span>🏟️ {athlete.club}</span>}
            {athlete?.country  && <span>🌍 {athlete.country}</span>}
            {athlete?.age      && <span>🎂 Age {athlete.age}</span>}
            <span>📊 {jumps.length} events recorded</span>
            {jumps[0]?.timestamp && <span>🕐 Last event {timeAgo(jumps[0].timestamp)}</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className={`score-pill ${scoreClass(avgScore)} text-base font-mono font-bold px-4 py-1.5 rounded-xl`}>
              {avgScore}
            </span>
            <span className="text-sm text-grass-400/50">Avg Efficiency Score (computed from {jumps.length} events)</span>
          </div>
        </div>
        <button onClick={() => navigate(-1)} className="btn-ghost self-start">← Back</button>
      </div>

      {/* ── Metric Cards ── */}
      {jLoad ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Array.from({length:5}).map((_,i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Avg Score',      value: avgScore,  unit: '',      color: scoreClass(avgScore).includes('high') ? 'text-grass-400' : scoreClass(avgScore).includes('mid') ? 'text-amber-400' : 'text-danger-400', icon: '🎯' },
            { label: 'Avg Valgus',     value: avgValgus, unit: '°',     color: vInfo.color, icon: '📐' },
            { label: 'Avg Vertical G', value: avgVertG,  unit: 'G',     color: 'text-grass-400', icon: '⬆️' },
            { label: 'Avg Lateral G',  value: avgLatG,   unit: 'G',     color: 'text-grass-400', icon: '↔️' },
            { label: 'Avg Rot. Vel',   value: avgRotVel, unit: 'rad/s', color: 'text-grass-400', icon: '🔄' },
            { label: 'High Risk',      value: highRisk,  unit: ' events', color: highRisk > 0 ? 'text-danger-400' : 'text-grass-400', icon: '⚠️' },
          ].map(m => (
            <div key={m.label} className="metric-card animate-slide-up">
              <span className="text-lg">{m.icon}</span>
              <div className={`font-display font-bold text-2xl ${m.color}`}>
                {m.value}<span className="text-xs ml-0.5 opacity-60">{m.unit}</span>
              </div>
              <div className="text-xs text-white/60 font-semibold">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><ScoreTrendChart jumps={jumps} /></div>
        <div><RiskPieChart jumps={jumps} /></div>
      </div>
      <ValgusTrendChart jumps={jumps} />

      {/* ── Jump History Table ── */}
      <div className="panel overflow-hidden animate-slide-up">
        <div className="px-5 py-3 border-b border-grass-500/10 flex items-center justify-between">
          <h3 className="font-display font-bold uppercase tracking-widest text-sm text-grass-400">
            All Events
          </h3>
          <span className="text-xs font-mono text-grass-400/40">{jumps.length} total</span>
        </div>

        {jLoad ? <LoadingSkeleton rows={5} /> : jumps.length === 0 ? (
          <EmptyState title="No events" message="No jump events found for this athlete." icon="🦘" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-grass-500/10 bg-pitch-900/50">
                    {['Timestamp','Type','Valgus °','Vertical G','Lateral G','Rot. Vel','Risk','Score','Tip'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-[11px] font-display font-semibold uppercase tracking-widest text-grass-400/60 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageData.map(j => {
                    const v = valgusLabel(j.valgusAngle)
                    const r = riskBadge(j.riskLevel)
                    return (
                      <tr key={j.id} className="border-b border-grass-500/05 hover:bg-grass-500/5 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-grass-400/60 whitespace-nowrap">{formatTimestamp(j.timestamp)}</td>
                        <td className="px-4 py-3"><span className="badge bg-pitch-700 text-grass-400/80 border border-grass-500/15 uppercase text-[10px]">{j.movementType}</span></td>
                        <td className="px-4 py-3"><span className={`font-mono font-semibold ${v.color}`}>{j.valgusAngle?.toFixed(1)}°</span></td>
                        <td className="px-4 py-3 font-mono text-sm text-white/70">{j.peakVerticalG?.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-sm text-white/70">{j.peakLateralG?.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-sm text-white/70">{j.peakRotationalVel?.toFixed(2)}</td>
                        <td className="px-4 py-3"><span className={`badge ${r.bg} ${r.color} uppercase text-[10px]`}>{j.riskLevel}</span></td>
                        <td className="px-4 py-3"><span className={`score-pill ${scoreClass(j.efficiencyScore)} text-xs`}>{j.efficiencyScore}</span></td>
                        <td className="px-4 py-3 text-xs text-grass-400/50 max-w-[200px] truncate" title={j.tip}>{j.tip || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-grass-500/10 flex items-center justify-between">
                <button disabled={page === 0} onClick={() => setPage(p => p-1)} className="btn-ghost disabled:opacity-30">← Prev</button>
                <span className="text-xs font-mono text-grass-400/40">Page {page+1} / {totalPages}</span>
                <button disabled={page >= totalPages-1} onClick={() => setPage(p => p+1)} className="btn-ghost disabled:opacity-30">Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
