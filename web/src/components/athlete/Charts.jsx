// src/components/athlete/Charts.jsx
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, ReferenceLine
} from 'recharts'
import { formatTimestamp } from '../../utils/filters'

// ─── Score Trend Line Chart ──────────────────────────────────
export function ScoreTrendChart({ jumps }) {
  // Last 30 jumps, reversed so oldest→newest left→right
  const data = [...jumps]
    .slice(0, 30)
    .reverse()
    .map((j, i) => ({
      index: i + 1,
      score: j.efficiencyScore,
      label: j.timestamp ? new Date(j.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : `#${i + 1}`,
    }))

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-pitch-900 border border-grass-500/20 rounded-lg px-3 py-2 shadow-panel text-xs font-mono">
        <div className="text-grass-400/50 mb-1">{payload[0]?.payload?.label}</div>
        <div className="text-grass-400 font-bold text-base">{payload[0]?.value}</div>
        <div className="text-grass-400/40">Efficiency Score</div>
      </div>
    )
  }

  return (
    <div className="panel p-5 animate-slide-up">
      <h3 className="font-display font-bold uppercase tracking-widest text-sm text-grass-400 mb-4">
        Score Trend — Last {Math.min(jumps.length, 30)} Events
      </h3>
      {data.length < 2 ? (
        <div className="flex items-center justify-center h-40 text-grass-400/30 text-sm">Not enough data</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <ReferenceLine y={80} stroke="rgba(34,197,94,0.3)"  strokeDasharray="4 4" label={{ value: 'Elite', fill: '#4ade80', fontSize: 10 }} />
            <ReferenceLine y={60} stroke="rgba(245,158,11,0.3)" strokeDasharray="4 4" label={{ value: 'Good',  fill: '#fbbf24', fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ fill: '#22c55e', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#4ade80' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Risk Distribution Pie Chart ─────────────────────────────
export function RiskPieChart({ jumps }) {
  const high = jumps.filter(j => j.riskLevel === 'HIGH').length
  const low  = jumps.filter(j => j.riskLevel === 'LOW').length
  const total = high + low

  const data = [
    { name: 'Low Risk',  value: low,  pct: total ? Math.round(low  / total * 100) : 0 },
    { name: 'High Risk', value: high, pct: total ? Math.round(high / total * 100) : 0 },
  ]

  const COLORS = ['#22c55e', '#ef4444']

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-pitch-900 border border-grass-500/20 rounded-lg px-3 py-2 shadow-panel text-xs font-mono">
        <div className="font-bold" style={{ color: payload[0].payload.fill }}>
          {payload[0].name}
        </div>
        <div className="text-white">{payload[0].value} events ({payload[0].payload.pct}%)</div>
      </div>
    )
  }

  return (
    <div className="panel p-5 animate-slide-up">
      <h3 className="font-display font-bold uppercase tracking-widest text-sm text-grass-400 mb-4">
        Risk Distribution
      </h3>
      {total === 0 ? (
        <div className="flex items-center justify-center h-40 text-grass-400/30 text-sm">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} opacity={0.85} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value, entry) => (
                <span style={{ color: entry.color, fontSize: 12, fontFamily: 'DM Sans' }}>
                  {value} ({entry.payload.pct}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Valgus trend chart ───────────────────────────────────────
export function ValgusTrendChart({ jumps }) {
  const data = [...jumps]
    .slice(0, 30)
    .reverse()
    .map((j, i) => ({
      index: i + 1,
      angle: j.valgusAngle,
      label: j.timestamp ? new Date(j.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : `#${i + 1}`,
    }))

  return (
    <div className="panel p-5 animate-slide-up">
      <h3 className="font-display font-bold uppercase tracking-widest text-sm text-grass-400 mb-4">
        Valgus Angle Trend
      </h3>
      {data.length < 2 ? (
        <div className="flex items-center justify-center h-40 text-grass-400/30 text-sm">Not enough data</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} />
            <ReferenceLine y={10} stroke="rgba(34,197,94,0.3)"  strokeDasharray="4 4" />
            <ReferenceLine y={15} stroke="rgba(245,158,11,0.3)" strokeDasharray="4 4" />
            <Tooltip
              contentStyle={{ background: '#061a10', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontSize: 12 }}
              formatter={v => [`${v?.toFixed(1)}°`, 'Valgus']}
            />
            <Line
              type="monotone"
              dataKey="angle"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={{ fill: '#fbbf24', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#f59e0b' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
