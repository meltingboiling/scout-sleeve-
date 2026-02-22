// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Leaderboard from './pages/Leaderboard'
import AthleteDetail from './pages/AthleteDetail'
import LiveDemo from './pages/LiveDemo'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index       element={<Leaderboard />} />
          <Route path="/athlete/:id" element={<AthleteDetail />} />
          <Route path="/live"        element={<LiveDemo />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
