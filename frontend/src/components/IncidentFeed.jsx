import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import api from '../api'

const PRIORITY_STYLES = {
  P0: { border: 'border-l-red-500',    badge: 'bg-red-500/10 text-red-400 ring-red-500/20',    dot: 'bg-red-500' },
  P1: { border: 'border-l-orange-500', badge: 'bg-orange-500/10 text-orange-400 ring-orange-500/20', dot: 'bg-orange-500' },
  P2: { border: 'border-l-yellow-500', badge: 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20', dot: 'bg-yellow-500' },
  P3: { border: 'border-l-gray-500',   badge: 'bg-gray-500/10 text-gray-400 ring-gray-500/20',  dot: 'bg-gray-500' },
}

const STATUS_BADGE = {
  OPEN:          'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  INVESTIGATING: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  RESOLVED:      'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  CLOSED:        'bg-gray-500/10 text-gray-500 ring-gray-500/20',
}

const POLL_INTERVAL = 15_000

export default function IncidentFeed() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const fetchIncidents = async () => {
    try {
      const { data } = await api.get('/incidents')
      setIncidents(data)
      setError(null)
    } catch (err) {
      setError('Failed to load incidents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIncidents()
    const interval = setInterval(fetchIncidents, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading incidents…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchIncidents}
          className="mt-3 text-xs text-red-300 underline hover:text-red-200"
        >
          Retry
        </button>
      </div>
    )
  }

  if (incidents.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gray-400 font-medium">All clear</p>
        <p className="text-gray-600 text-sm mt-1">No active incidents right now.</p>
      </div>
    )
  }

  // Sort: P0 first, then P1, etc.
  const sorted = [...incidents].sort((a, b) => {
    const pa = parseInt(a.priority?.replace('P', '') ?? '9')
    const pb = parseInt(b.priority?.replace('P', '') ?? '9')
    return pa - pb
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">
          Active Incidents
          <span className="ml-2 text-sm font-normal text-gray-500">({sorted.length})</span>
        </h2>
        <span className="text-xs text-gray-600">Polling every 15 s</span>
      </div>

      <div className="grid gap-3">
        {sorted.map((inc) => {
          const ps = PRIORITY_STYLES[inc.priority] || PRIORITY_STYLES.P3
          const sb = STATUS_BADGE[inc.status] || STATUS_BADGE.OPEN

          return (
            <button
              key={inc.id}
              onClick={() => navigate(`/incidents/${inc.id}`)}
              className={`
                w-full text-left rounded-xl border border-gray-800 bg-gray-900/60
                border-l-4 ${ps.border}
                hover:bg-gray-800/70 hover:border-gray-700
                transition-all duration-200 cursor-pointer
                p-5 group
              `}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`w-2 h-2 rounded-full ${ps.dot}`} />
                    <span className="text-sm font-semibold text-gray-100 truncate">
                      {inc.component_id}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ring-1 ring-inset ${ps.badge}`}>
                      {inc.priority}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Started {formatDistanceToNow(new Date(inc.start_time), { addSuffix: true })}
                    <span className="mx-1.5 text-gray-700">·</span>
                    {format(new Date(inc.start_time), 'MMM d, HH:mm:ss')}
                  </p>
                </div>

                {/* Right */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ring-1 ring-inset ${sb}`}>
                    {inc.status}
                  </span>
                  <svg
                    className="w-4 h-4 text-gray-700 group-hover:text-gray-400 transition-colors"
                    fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
