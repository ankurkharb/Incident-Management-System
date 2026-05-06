import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const STATIC_COMMANDS = [
  { id: 'nav-dashboard',    label: 'Go to Dashboard',    icon: 'grid_view',     path: '/' },
  { id: 'nav-incidents',    label: 'Go to Incidents',    icon: 'warning',       path: '/incidents' },
  { id: 'nav-nodes',        label: 'Go to Nodes',        icon: 'dns',           path: '/nodes' },
  { id: 'nav-security',     label: 'Go to Security',     icon: 'verified_user', path: '/security' },
  { id: 'nav-terminal',     label: 'Go to Terminal',     icon: 'terminal',      path: '/terminal' },
  { id: 'nav-sysmap',       label: 'Go to System Map',   icon: 'hub',           path: '/system-map' },
  { id: 'nav-metrics',      label: 'Go to Live Metrics', icon: 'query_stats',   path: '/live-metrics' },
  { id: 'nav-logs',         label: 'Go to Log Stream',   icon: 'receipt_long',  path: '/log-stream' },
  { id: 'nav-settings',     label: 'Go to Settings',     icon: 'settings',      path: '/settings' },
  { id: 'nav-help',         label: 'Go to Help',         icon: 'help_outline',  path: '/help' },
]

export default function CommandPalette({ onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [incidents, setIncidents] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    api.get('/incidents').then(({ data }) => setIncidents(data)).catch(() => {})
  }, [])

  // Build combined results
  const incidentResults = incidents
    .filter(inc => inc.component_id.toLowerCase().includes(query.toLowerCase()) || inc.id.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5)
    .map(inc => ({
      id: `inc-${inc.id}`,
      label: inc.component_id,
      sublabel: `${inc.priority} · ${inc.status}`,
      icon: 'warning',
      path: `/incidents/${inc.id}`,
    }))

  const commandResults = STATIC_COMMANDS.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase())
  )

  const allResults = [...incidentResults, ...commandResults]

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, allResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && allResults[activeIdx]) {
      navigate(allResults[activeIdx].path)
      onClose()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  useEffect(() => { setActiveIdx(0) }, [query])

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl mx-4 glass-panel rounded-2xl border border-cyan-500/20 shadow-[0_0_60px_rgba(0,240,255,0.15)] animate-modal-in overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
          <span className="material-symbols-outlined text-cyan-400">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search incidents, navigate…"
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 focus:outline-none font-code-mono"
          />
          <kbd className="text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded font-code-mono border border-slate-700">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {incidentResults.length > 0 && (
            <>
              <p className="px-5 py-1.5 text-[10px] font-label-caps text-slate-600">INCIDENTS</p>
              {incidentResults.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => { navigate(r.path); onClose() }}
                  className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors cursor-pointer ${
                    i === activeIdx ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.label}</p>
                    <p className="text-[10px] text-slate-500 font-code-mono">{r.sublabel}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-600 text-sm">arrow_forward</span>
                </button>
              ))}
            </>
          )}

          {commandResults.length > 0 && (
            <>
              <p className="px-5 py-1.5 text-[10px] font-label-caps text-slate-600 mt-1">NAVIGATION</p>
              {commandResults.map((r, i) => {
                const idx = incidentResults.length + i
                return (
                  <button
                    key={r.id}
                    onClick={() => { navigate(r.path); onClose() }}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors cursor-pointer ${
                      idx === activeIdx ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{r.icon}</span>
                    <p className="text-sm">{r.label}</p>
                    <span className="material-symbols-outlined text-slate-600 text-sm ml-auto">arrow_forward</span>
                  </button>
                )
              })}
            </>
          )}

          {allResults.length === 0 && (
            <p className="text-center text-slate-600 text-sm py-8 font-code-mono">NO_RESULTS_FOUND</p>
          )}
        </div>
      </div>
    </div>
  )
}
