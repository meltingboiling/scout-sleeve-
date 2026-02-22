// src/components/filters/FilterBar.jsx
import { getUniqueCountries } from '../../utils/filters'

const POSITIONS  = ['All', 'Forward', 'Midfielder', 'Defender', 'Goalkeeper']
const AGE_GROUPS = ['All', 'Under 15', '15-17', 'Over 17']

export default function FilterBar({ athletes, filters, onChange }) {
  const countries = getUniqueCountries(athletes)

  const set = (key, value) => onChange({ ...filters, [key]: value })

  return (
    <div className="panel px-5 py-4 flex flex-wrap gap-4 items-center animate-slide-up">
      
      {/* Search */}
      <div className="flex-1 min-w-[180px]">
        <input
          type="text"
          placeholder="Search athlete, club, country…"
          className="input-field w-full"
          value={filters.search || ''}
          onChange={e => set('search', e.target.value)}
        />
      </div>

      {/* Position */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-display tracking-widest uppercase text-grass-400/50">Position</label>
        <select
          className="input-field pr-8"
          value={filters.position || 'All'}
          onChange={e => set('position', e.target.value)}
        >
          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Age Group */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-display tracking-widest uppercase text-grass-400/50">Age Group</label>
        <select
          className="input-field pr-8"
          value={filters.ageGroup || 'All'}
          onChange={e => set('ageGroup', e.target.value)}
        >
          {AGE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Country */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-display tracking-widest uppercase text-grass-400/50">Country</label>
        <select
          className="input-field pr-8"
          value={filters.country || 'All'}
          onChange={e => set('country', e.target.value)}
        >
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Min Score Slider */}
      <div className="flex flex-col gap-1 min-w-[160px]">
        <label className="text-[10px] font-display tracking-widest uppercase text-grass-400/50">
          Min Score: <span className="text-grass-400 font-mono">{filters.minScore ?? 0}</span>
        </label>
        <input
          type="range"
          min={0} max={100} step={5}
          value={filters.minScore ?? 0}
          onChange={e => set('minScore', Number(e.target.value))}
          className="accent-grass-500 w-full cursor-pointer"
        />
      </div>

      {/* Reset */}
      {(filters.search || filters.position !== 'All' || filters.ageGroup !== 'All' ||
        filters.country !== 'All' || filters.minScore > 0) && (
        <button
          className="btn-ghost text-danger-400/70 hover:text-danger-400 hover:bg-danger-500/10"
          onClick={() => onChange({ position: 'All', ageGroup: 'All', country: 'All', minScore: 0, search: '' })}
        >
          ✕ Reset
        </button>
      )}
    </div>
  )
}
