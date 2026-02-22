// src/components/layout/Header.jsx
import { Link, useLocation } from 'react-router-dom'

export default function Header() {
  const { pathname } = useLocation()

  const navLink = (to, label) => {
    const active = pathname === to || (to !== '/' && pathname.startsWith(to))
    return (
      <Link
        to={to}
        className={`relative font-display font-semibold uppercase tracking-widest text-sm transition-all duration-200
          ${active
            ? 'text-grass-400'
            : 'text-grass-400/50 hover:text-grass-400/80'
          }`}
      >
        {label}
        {active && (
          <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-grass-500 rounded-full" />
        )}
      </Link>
    )
  }

  return (
    <header className="sticky top-0 z-50 border-b border-grass-500/10 bg-pitch-950/90 backdrop-blur-xl">
      <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 bg-grass-500 rounded-lg opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative flex items-center justify-center w-full h-full">
              {/* Field icon */}
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-grass-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                <ellipse cx="12" cy="12" rx="10" ry="7" />
                <line x1="12" y1="5" x2="12" y2="19" />
                <path d="M12 8.5 a3.5 3.5 0 0 0 0 7" />
                <path d="M12 8.5 a3.5 3.5 0 0 1 0 7" />
              </svg>
            </div>
          </div>
          <div>
            <div className="font-display font-bold text-lg tracking-wider text-white leading-none">
              SCOUT
            </div>
            <div className="font-mono text-[10px] text-grass-500/70 tracking-widest leading-none">
              DASHBOARD
            </div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden sm:flex items-center gap-6">
          {navLink('/', 'Leaderboard')}
          {navLink('/live', 'Live Demo')}
        </nav>

        {/* Status pill */}
        <div className="flex items-center gap-2 text-xs font-mono text-grass-500/70">
          <span className="w-2 h-2 rounded-full bg-grass-500 animate-pulse-slow" />
          Live
        </div>
      </div>
    </header>
  )
}
