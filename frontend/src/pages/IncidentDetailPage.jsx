import IncidentDetail from '../components/IncidentDetail.jsx'

export default function IncidentDetailPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* ── Top bar ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-gray-950/80 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <a
            href="/"
            className="text-gray-400 hover:text-gray-200 transition-colors text-sm flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </a>
          <span className="text-gray-700">/</span>
          <span className="text-sm text-gray-300 font-medium">Incident Detail</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <IncidentDetail />
      </main>
    </div>
  )
}
