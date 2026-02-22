// src/components/athlete/MetricsCards.jsx

const metrics = [
  {
    key: 'avgValgusAngle',
    label: 'Avg Valgus Angle',
    unit: '°',
    icon: '📐',
    desc: 'Knee inward collapse — lower is safer',
    thresholds: { good: v => v < 10, warn: v => v < 15 },
  },
  {
    key: 'avgPeakVerticalG',
    label: 'Peak Vertical G',
    unit: 'G',
    icon: '⬆️',
    desc: 'Impact force on landing',
    thresholds: { good: v => v <= 4, warn: v => v <= 5.5 },
  },
  {
    key: 'avgPeakLateralG',
    label: 'Peak Lateral G',
    unit: 'G',
    icon: '↔️',
    desc: 'Side-to-side force during cuts',
    thresholds: { good: v => v <= 2, warn: v => v <= 3 },
  },
  {
    key: 'avgRotationalVel',
    label: 'Rotational Velocity',
    unit: 'rad/s',
    icon: '🔄',
    desc: 'Twisting speed at the knee',
    thresholds: { good: v => v <= 2.5, warn: v => v <= 3.5 },
  },
  {
    key: 'totalJumps',
    label: 'Total Events',
    unit: '',
    icon: '📊',
    desc: 'Total jump/cut events recorded',
    thresholds: { good: () => true, warn: () => true },
  },
]

function colorClass(value, t) {
  if (t.good(value))  return { text: 'text-grass-400', border: 'border-grass-500/25', glow: 'shadow-glow-green' }
  if (t.warn(value))  return { text: 'text-amber-400',  border: 'border-amber-500/25',  glow: 'shadow-glow-amber' }
  return                     { text: 'text-danger-400', border: 'border-danger-500/25', glow: 'shadow-glow-red'   }
}

export default function MetricsCards({ athlete }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {metrics.map(m => {
        const raw = athlete[m.key]
        const value = typeof raw === 'number' ? raw : 0
        const cls = colorClass(value, m.thresholds)

        return (
          <div key={m.key} className={`metric-card border ${cls.border} animate-slide-up`}>
            <div className="flex items-center justify-between">
              <span className="text-lg">{m.icon}</span>
              <span className="text-[10px] font-mono text-grass-400/40 uppercase tracking-wider">metric</span>
            </div>
            <div className={`font-display font-bold text-3xl tracking-tight ${cls.text}`}>
              {typeof raw === 'number' ? raw.toFixed(m.unit === '' ? 0 : 1) : '—'}
              <span className="text-sm ml-1 opacity-60">{m.unit}</span>
            </div>
            <div className="text-xs font-semibold text-white/70">{m.label}</div>
            <div className="text-[11px] text-grass-400/40 leading-snug">{m.desc}</div>
          </div>
        )
      })}
    </div>
  )
}
