// src/pages/Leaderboard.jsx
// PRIMARY DATA SOURCE: jumpLogs collection
// Each row = one jump/cut event, enriched with athlete name from athletes collection

import { useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

import { useJumpLogs } from '../hooks/useFirestore'
import { scoreClass, valgusLabel, riskBadge, formatTimestamp, rankMedal } from '../utils/filters'
import LoadingSkeleton from '../components/common/LoadingSkeleton'
import EmptyState, { ErrorState } from '../components/common/EmptyState'

const DEFAULT_FILTERS = {
  position: 'All',
  country: 'All',
  riskLevel: 'All',
  movementType: 'All',
  minScore: 0,
  search: '',
}

// ─── Inline Filter Bar ────────────────────────────────────────
function FilterBar({ jumps, filters, onChange }) {
  const set = (key, val) => onChange({ ...filters, [key]: val })

  const positions     = ['All', ...new Set(jumps.map(j => j.position).filter(Boolean))]
  const countries     = ['All', ...new Set(jumps.map(j => j.country).filter(Boolean))].sort((a,b) => a === 'All' ? -1 : a.localeCompare(b))
  const movementTypes = ['All', ...new Set(jumps.map(j => j.movementType).filter(Boolean))]
  const riskLevels    = ['All', 'HIGH', 'LOW']

  const isDirty = filters.position !== 'All' || filters.country !== 'All' ||
    filters.riskLevel !== 'All' || filters.movementType !== 'All' ||
    filters.minScore > 0 || filters.search !== ''

  return (
    <div className="panel px-5 py-4 flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[180px] flex flex-col gap-1">
        <label className="text-[10px] font-display tracking-widest uppercase text-grass-400/50">Search athlete</label>
        <input
          type="text"
          placeholder="Name, club, country…"
          className="input-field w-full"
          value={filters.search}
          onChange={e => set('search', e.target.value)}
        />
      </div>

      {[
        { label: 'Position',      key: 'position',     opts: positions },
        { label: 'Country',       key: 'country',      opts: countries },
        { label: 'Risk Level',    key: 'riskLevel',    opts: riskLevels },
        { label: 'Movement Type', key: 'movementType', opts: movementTypes },
      ].map(({ label, key, opts }) => (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-[10px] font-display tracking-widest uppercase text-grass-400/50">{label}</label>
          <select className="input-field" value={filters[key]} onChange={e => set(key, e.target.value)}>
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      ))}

      <div className="flex flex-col gap-1 min-w-[160px]">
        <label className="text-[10px] font-display tracking-widest uppercase text-grass-400/50">
          Min Score: <span className="text-grass-400 font-mono">{filters.minScore}</span>
        </label>
        <input
          type="range" min={0} max={100} step={5}
          value={filters.minScore}
          onChange={e => set('minScore', Number(e.target.value))}
          className="accent-grass-500 cursor-pointer"
        />
      </div>

      {isDirty && (
        <button
          className="btn-ghost text-danger-400/70 hover:text-danger-400"
          onClick={() => onChange(DEFAULT_FILTERS)}
        >
          ✕ Reset
        </button>
      )}
    </div>
  )
}

// ─── Debug Panel ──────────────────────────────────────────────
function DebugPanel({ jumps, loading, error }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setOpen(o => !o)}
        className="bg-pitch-800 border border-grass-500/30 text-grass-400 text-xs font-mono px-3 py-1.5 rounded-lg shadow-panel"
      >
        🔍 Debug ({jumps.length} entries)
      </button>
      {open && (
        <div className="absolute bottom-10 right-0 w-[440px] max-h-[420px] overflow-auto bg-pitch-950 border border-grass-500/20 rounded-xl shadow-panel p-4 text-xs font-mono">
          <div className="text-grass-400 font-bold mb-2">Firebase → jumpLogs</div>
          <div>Loading: <span className={loading ? 'text-amber-400' : 'text-grass-400'}>{String(loading)}</span></div>
          <div>Error: <span className={error ? 'text-danger-400' : 'text-grass-400'}>{error || 'none'}</span></div>
          <div className="mb-2">Entries found: <span className="text-grass-400 font-bold">{jumps.length}</span></div>
          {jumps.length > 0 && (
            <>
              <div className="text-grass-400 font-bold mt-3 mb-1">Latest entry raw data:</div>
              <pre className="text-grass-400/70 text-[10px] whitespace-pre-wrap overflow-auto">
                {JSON.stringify(jumps[0], null, 2)}
              </pre>
            </>
          )}
          {jumps.length === 0 && !loading && !error && (
            <div className="text-amber-400 mt-2">
              ⚠️ jumpLogs collection empty or Firestore index missing.<br/>
              Create index: jumpLogs → timestamp DESC
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Leaderboard Page ─────────────────────────────────────────
export default function Leaderboard() {
  const navigate = useNavigate()
  const { jumps, loading, error } = useJumpLogs(300)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const handleAthleteClick = useCallback((athleteId) => {
    if (athleteId) navigate(`/athlete/${athleteId}`)
  }, [navigate])

  // Client-side filtering
  const filtered = useMemo(() => {
    return jumps.filter(j => {
      if (filters.position !== 'All'     && j.position     !== filters.position)     return false
      if (filters.country  !== 'All'     && j.country      !== filters.country)      return false
      if (filters.riskLevel !== 'All'    && j.riskLevel    !== filters.riskLevel)    return false
      if (filters.movementType !== 'All' && j.movementType !== filters.movementType) return false
      if (filters.minScore > 0           && (j.efficiencyScore ?? 0) < filters.minScore) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (![j.name, j.club, j.country, j.position, j.movementType]
          .some(f => f?.toLowerCase().includes(q))) return false
      }
      return true
    }).map((j, i) => ({ ...j, rank: i + 1 }))
  }, [jumps, filters])

  const colDefs = useMemo(() => [
    {
      headerName: '#',
      field: 'rank',
      width: 75,
      pinned: 'left',
      cellRenderer: ({ value }) => (
        <span className="font-display font-bold text-base text-grass-400/80">{rankMedal(value)}</span>
      ),
    },
    {
      headerName: 'Athlete',
      field: 'name',
      flex: 1,
      minWidth: 160,
      pinned: 'left',
      cellRenderer: ({ value, data }) => (
        <button
          onClick={() => handleAthleteClick(data?.athleteId)}
          className="font-semibold text-white hover:text-grass-400 transition-colors text-left w-full group flex items-center gap-2"
        >
          <span className="w-7 h-7 rounded-lg bg-pitch-700 flex items-center justify-center text-xs text-grass-400 font-bold flex-shrink-0">
            {(value || '?').charAt(0).toUpperCase()}
          </span>
          <span className="group-hover:underline underline-offset-2 truncate">{value}</span>
        </button>
      ),
    },
    {
      headerName: 'Score',
      field: 'efficiencyScore',
      width: 95,
      cellRenderer: ({ value }) => (
        <span className={`score-pill ${scoreClass(value ?? 0)} text-sm`}>{value ?? '—'}</span>
      ),
    },
    {
      headerName: 'Risk',
      field: 'riskLevel',
      width: 90,
      cellRenderer: ({ value }) => {
        const r = riskBadge(value)
        return <span className={`badge ${r.bg} ${r.color} uppercase text-[10px]`}>{value}</span>
      },
    },
    {
      headerName: 'Movement',
      field: 'movementType',
      width: 115,
      cellRenderer: ({ value }) => (
        <span className="badge bg-pitch-700 text-grass-400/80 border border-grass-500/15 uppercase text-[10px]">{value}</span>
      ),
    },
    {
      headerName: 'Valgus °',
      field: 'valgusAngle',
      width: 105,
      cellRenderer: ({ value }) => {
        const info = valgusLabel(value)
        return <span className={`font-mono font-semibold ${info.color}`}>{value?.toFixed ? value.toFixed(1) : '—'}°</span>
      },
    },
    {
      headerName: 'Vertical G',
      field: 'peakVerticalG',
      width: 110,
      cellStyle: { fontFamily: 'JetBrains Mono', color: '#86efac' },
      valueFormatter: ({ value }) => value?.toFixed ? value.toFixed(2) : '—',
    },
    {
      headerName: 'Lateral G',
      field: 'peakLateralG',
      width: 105,
      cellStyle: { fontFamily: 'JetBrains Mono', color: '#86efac' },
      valueFormatter: ({ value }) => value?.toFixed ? value.toFixed(2) : '—',
    },
    {
      headerName: 'Rotational Vel',
      field: 'peakRotationalVel',
      width: 130,
      cellStyle: { fontFamily: 'JetBrains Mono', color: '#c8f0d5' },
      valueFormatter: ({ value }) => value?.toFixed ? value.toFixed(2) : '—',
    },
    {
      headerName: 'Position',
      field: 'position',
      width: 120,
      cellStyle: { color: '#86efac', opacity: 0.8 },
    },
    {
      headerName: 'Country',
      field: 'country',
      width: 110,
      cellStyle: { color: '#c8f0d5' },
    },
    {
      headerName: 'Timestamp',
      field: 'timestamp',
      width: 170,
      cellRenderer: ({ value }) => (
        <span className="text-xs text-grass-400/50 font-mono">{formatTimestamp(value)}</span>
      ),
    },
    {
      headerName: 'AI Tip',
      field: 'tip',
      flex: 2,
      minWidth: 200,
      cellStyle: { color: '#86efac', opacity: 0.6, fontSize: '11px' },
    },
  ], [handleAthleteClick])

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
  }), [])

  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-bold text-4xl uppercase tracking-wider text-white">
            Live Jump Feed
          </h1>
          <p className="text-sm text-grass-400/50 mt-1">
            {loading
              ? 'Connecting to Firebase…'
              : jumps.length === 0
                ? '⚠️ No jump events found — check Firestore index and rules'
                : `${filtered.length} events${filtered.length !== jumps.length ? ` of ${jumps.length}` : ''} — sorted by latest`
            }
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-grass-500/60">
          <span className="w-2 h-2 rounded-full bg-grass-500 animate-pulse-slow" />
          Real-time
        </div>
      </div>

      {/* Filters */}
      <FilterBar jumps={jumps} filters={filters} onChange={setFilters} />

      {/* Grid */}
      {loading ? (
        <LoadingSkeleton rows={8} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No events match" message="Try adjusting your filters." icon="🔍" />
      ) : (
        <div className="panel overflow-hidden">
          <div className="ag-theme-alpine-dark" style={{ height: 'calc(100vh - 320px)', minHeight: 400 }}>
            <AgGridReact
              rowData={filtered}
              columnDefs={colDefs}
              defaultColDef={defaultColDef}
              animateRows={true}
              suppressCellFocus={true}
              getRowId={({ data }) => data.id}
            />
          </div>
        </div>
      )}

      <DebugPanel jumps={jumps} loading={loading} error={error} />
    </div>
  )
}
