import IncidentFeed from './components/IncidentFeed.jsx'

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* ── Top bar ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-gray-950/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
              IM
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Incident Manager</h1>
              <p className="text-xs text-gray-500">Real-time operations dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>
      </header>

      {/* ── Content ───────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <IncidentFeed />
      </main>
    </div>
  )
}

export default App
