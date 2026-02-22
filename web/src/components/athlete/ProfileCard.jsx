// src/components/athlete/ProfileCard.jsx
import { useNavigate } from 'react-router-dom'
import { scoreClass, scoreBadge, timeAgo, getScore } from '../../utils/filters'

const POSITION_ICONS = {
  Forward: '⚡',
  Midfielder: '🎯',
  Defender: '🛡️',
  Goalkeeper: '🧤',
}

export default function ProfileCard({ athlete }) {
  const navigate = useNavigate()
  const score = getScore(athlete)
  const badge = scoreBadge(score)

  return (
    <div className="panel p-6 flex flex-col sm:flex-row gap-6 animate-slide-up">
      {/* Avatar / Initial */}
      <div className="flex-shrink-0 flex items-center justify-center">
        <div className="w-20 h-20 rounded-2xl bg-pitch-700 border border-grass-500/20 flex items-center justify-center">
          <span className="font-display font-bold text-3xl text-grass-400">
            {athlete.name?.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start gap-3 mb-2">
          <h1 className="font-display font-bold text-3xl tracking-wide text-white uppercase">
            {athlete.name}
          </h1>
          <span className={`badge ${badge.bg} mt-1`}>{badge.label}</span>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-grass-400/70 mb-4">
          <span>{POSITION_ICONS[athlete.position] || '⚽'} {athlete.position}</span>
          <span>🏟️ {athlete.club}</span>
          <span>🌍 {athlete.country}</span>
          <span>🎂 Age {athlete.age}</span>
          <span>🕐 Active {timeAgo(athlete.lastActive)}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className={`score-pill ${scoreClass(score)} text-base font-mono font-bold px-4 py-1.5 rounded-xl`}>
            {score}
          </div>
          <span className="text-sm text-grass-400/50">Biomechanical Efficiency Score</span>
        </div>
      </div>

      {/* Back button */}
      <div>
        <button onClick={() => navigate(-1)} className="btn-ghost flex items-center gap-2">
          ← Back
        </button>
      </div>
    </div>
  )
}
