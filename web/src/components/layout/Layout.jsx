// src/components/layout/Layout.jsx
import { Outlet } from 'react-router-dom'
import Header from './Header'

export default function Layout() {
  return (
    <div className="min-h-screen pitch-bg flex flex-col">
      <Header />
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-grass-500/10 text-center py-4 text-xs font-mono text-grass-500/30">
        Scout Dashboard — Biomechanical Intelligence Platform
      </footer>
    </div>
  )
}
