// src/components/athlete/JumpHistoryTable.jsx
import { useState } from 'react'
import { formatTimestamp, scoreClass, valgusLabel, riskBadge } from '../../utils/filters'
import LoadingSkeleton from '../common/LoadingSkeleton'
import EmptyState from '../common/EmptyState'

const PAGE_SIZE = 15

export default function JumpHistoryTable({ jumps, loading }) {
  const [page, setPage] = useState(0)

  if (loading) return <LoadingSkeleton rows={6} />
  if (!jumps.length) return <EmptyState title="No jumps recorded" message="No jump/cut events found for this athlete." icon="🦘" />

  const totalPages = Math.ceil(jumps.length / PAGE_SIZE)
  const pageData   = jumps.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <div className="panel overflow-hidden animate-slide-up">
      <div className="px-5 py-3 border-b border-grass-500/10 flex items-center justify-between">
        <h3 className="font-display font-bold uppercase tracking-widest text-sm text-grass-400">
          Jump & Cut History
        </h3>
        <span className="text-xs font-mono text-grass-400/40">{jumps.length} events</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-grass-500/10 bg-pitch-900/50">
              {['Timestamp', 'Type', 'Valgus °', 'Vertical G', 'Lateral G', 'Risk', 'Score', 'Tip'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-display font-semibold uppercase tracking-widest text-grass-400/60 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((j, i) => {
              const v    = valgusLabel(j.valgusAngle)
              const risk = riskBadge(j.riskLevel)
              return (
                <tr key={j.id} className="border-b border-grass-500/05 hover:bg-grass-500/5 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-grass-400/60 whitespace-nowrap">
                    {formatTimestamp(j.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge bg-pitch-700 text-grass-400/80 border border-grass-500/15 uppercase text-[10px]">
                      {j.movementType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono font-semibold text-sm ${v.color}`}>
                      {j.valgusAngle?.toFixed(1)}°
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-white/70">
                    {j.peakVerticalG?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-white/70">
                    {j.peakLateralG?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${risk.bg} ${risk.color} uppercase text-[10px]`}>
                      {j.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`score-pill ${scoreClass(j.efficiencyScore)} text-xs`}>
                      {j.efficiencyScore}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-grass-400/50 max-w-[200px] truncate" title={j.tip}>
                    {j.tip || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-grass-500/10 flex items-center justify-between">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="btn-ghost disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-xs font-mono text-grass-400/40">
            Page {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="btn-ghost disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
