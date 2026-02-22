// ============================================================
// src/utils/filters.js — Updated to match actual Firebase fields
// - avgEfficiencyScore (not efficiencyScore)
// - lastActive / createdAt are Firestore Timestamps (not strings)
// ============================================================

// ─── Convert Firestore Timestamp OR ISO string → JS Date ────
function toDate(value) {
  if (!value) return null
  if (typeof value?.toDate === 'function') return value.toDate()
  if (typeof value === 'string') return new Date(value)
  if (value instanceof Date) return value
  return null
}

// ─── Relative time formatter ─────────────────────────────────
export function timeAgo(value) {
  const date = toDate(value)
  if (!date || isNaN(date)) return 'Never'
  const now = new Date()
  const diffMs  = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr  = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr  / 24)
  if (diffSec < 30)  return 'Just now'
  if (diffSec < 60)  return `${diffSec}s ago`
  if (diffMin < 60)  return `${diffMin}m ago`
  if (diffHr  < 24)  return `${diffHr}h ago`
  if (diffDay < 7)   return `${diffDay}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Format timestamp to readable date/time ─────────────────
export function formatTimestamp(value) {
  const d = toDate(value)
  if (!d || isNaN(d)) return '—'
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Get score — handles your Firebase field name ────────────
export function getScore(athlete) {
  return athlete?.avgEfficiencyScore ?? athlete?.efficiencyScore ?? 0
}

// ─── Score classification ────────────────────────────────────
export function scoreClass(score) {
  if (score >= 80) return 'score-high'
  if (score >= 60) return 'score-mid'
  return 'score-low'
}

export function scoreBadge(score) {
  if (score >= 80) return { label: 'Elite',     bg: 'bg-grass-500/20 text-grass-400 border border-grass-500/30' }
  if (score >= 60) return { label: 'Good',      bg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' }
  return               { label: 'Needs Work',   bg: 'bg-danger-500/20 text-danger-400 border border-danger-500/30' }
}

// ─── Valgus angle classification ────────────────────────────
export function valgusClass(angle) {
  if (angle < 10)  return 'valgus-good'
  if (angle < 15)  return 'valgus-warn'
  return 'valgus-danger'
}

export function valgusLabel(angle) {
  if (!angle && angle !== 0) return { color: 'text-grass-400/40', bg: '', label: '—' }
  if (angle < 10)  return { color: 'text-grass-400', bg: 'bg-grass-500/15', label: `${angle.toFixed(1)}°` }
  if (angle < 15)  return { color: 'text-amber-400',  bg: 'bg-amber-500/15',  label: `${angle.toFixed(1)}°` }
  return               { color: 'text-danger-400', bg: 'bg-danger-500/15', label: `${angle.toFixed(1)}°` }
}

// ─── Risk level ──────────────────────────────────────────────
export function riskBadge(risk) {
  if (risk === 'LOW')  return { color: 'text-grass-400', bg: 'bg-grass-500/15 border border-grass-500/25' }
  return               { color: 'text-danger-400', bg: 'bg-danger-500/15 border border-danger-500/25' }
}

// ─── Age group ──────────────────────────────────────────────
export function getAgeGroup(age) {
  if (age < 15)  return 'Under 15'
  if (age <= 17) return '15-17'
  return 'Over 17'
}

// ─── Rank medal emoji ────────────────────────────────────────
export function rankMedal(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

// ─── Main filter function ────────────────────────────────────
export function applyFilters(athletes, filters) {
  return athletes.filter(a => {
    const score = getScore(a)
    if (filters.position && filters.position !== 'All' && a.position !== filters.position) return false
    if (filters.country  && filters.country  !== 'All' && a.country  !== filters.country)  return false
    if (filters.minScore && score < filters.minScore) return false
    if (filters.ageGroup && filters.ageGroup !== 'All') {
      if (getAgeGroup(a.age) !== filters.ageGroup) return false
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const matches = [a.name, a.club, a.country, a.position]
        .some(f => f?.toLowerCase().includes(q))
      if (!matches) return false
    }
    return true
  })
}

// ─── Derive unique countries from athlete list ───────────────
export function getUniqueCountries(athletes) {
  return ['All', ...new Set(athletes.map(a => a.country).filter(Boolean)).values()]
    .sort((a, b) => a === 'All' ? -1 : a.localeCompare(b))
}