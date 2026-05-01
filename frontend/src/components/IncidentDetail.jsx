import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import api from '../api'
import RCAForm from './RCAForm.jsx'

const STEPS = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']
const STEP_IDX = Object.fromEntries(STEPS.map((s, i) => [s, i]))

const NEXT_STATES = {
  OPEN:          ['INVESTIGATING', 'RESOLVED'],
  INVESTIGATING: ['RESOLVED', 'OPEN'],
  RESOLVED:      ['CLOSED', 'INVESTIGATING'],
  CLOSED:        [],
}

export default function IncidentDetail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [targetStatus, setTargetStatus] = useState('')
  const [transitioning, setTransitioning] = useState(false)
  const [transitionError, setTransitionError] = useState(null)
  const [showRCA, setShowRCA] = useState(false)

  const fetchDetail = async () => {
    try {
      const { data: d } = await api.get(`/incidents/${id}`)
      setData(d)
      setError(null)
    } catch {
      setError('Failed to load incident')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDetail() }, [id])

  const handleTransition = async () => {
    if (!targetStatus) return
    setTransitioning(true)
    setTransitionError(null)
    try {
      await api.patch(`/incidents/${id}/status`, { target_status: targetStatus })
      setTargetStatus('')
      await fetchDetail()
    } catch (err) {
      setTransitionError(err.response?.data?.detail || 'Transition failed')
    } finally {
      setTransitioning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <p className="text-red-400 text-sm">{error || 'Not found'}</p>
      </div>
    )
  }

  const wi = data.work_item
  const signals = data.signals || []
  const currentIdx = STEP_IDX[wi.status] ?? 0
  const possibleNext = NEXT_STATES[wi.status] || []
  const needsRCA = wi.status === 'RESOLVED'

  return (
    <div className="space-y-8">
      {/* ── Work-item header ──────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">{wi.component_id}</h2>
            <p className="text-xs text-gray-500 mt-1 font-mono">{wi.id}</p>
          </div>
          <span className="px-3 py-1 rounded-md text-xs font-medium bg-indigo-500/10 text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
            {wi.priority}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs mb-1">Status</p>
            <p className="font-medium">{wi.status}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Start time</p>
            <p>{format(new Date(wi.start_time), 'MMM d, yyyy HH:mm:ss')}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">End time</p>
            <p>{wi.end_time ? format(new Date(wi.end_time), 'MMM d, yyyy HH:mm:ss') : '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">MTTR</p>
            <p>{wi.mttr_seconds != null ? `${wi.mttr_seconds}s` : '—'}</p>
          </div>
        </div>
      </div>

      {/* ── Workflow stepper ──────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-4">Lifecycle</h3>
        <div className="flex items-center gap-0">
          {STEPS.map((step, i) => {
            const isCurrent = i === currentIdx
            const isPast    = i < currentIdx
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`
                      w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold
                      transition-all duration-300
                      ${isCurrent
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-110'
                        : isPast
                          ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40'
                          : 'bg-gray-800 text-gray-600'}
                    `}
                  >
                    {isPast ? '✓' : i + 1}
                  </div>
                  <p className={`mt-2 text-[10px] font-medium ${isCurrent ? 'text-indigo-400' : isPast ? 'text-emerald-500' : 'text-gray-600'}`}>
                    {step}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 -mt-5 ${i < currentIdx ? 'bg-emerald-500/40' : 'bg-gray-800'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Transition controls ───────────────────────────────────── */}
      {possibleNext.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Transition Status</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select target…</option>
              {possibleNext.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={handleTransition}
              disabled={!targetStatus || transitioning}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {transitioning ? 'Transitioning…' : 'Apply'}
            </button>
          </div>
          {transitionError && (
            <p className="mt-2 text-xs text-red-400">{transitionError}</p>
          )}

          {needsRCA && !showRCA && (
            <button
              onClick={() => setShowRCA(true)}
              className="mt-4 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all"
            >
              Submit RCA to close
            </button>
          )}
        </div>
      )}

      {/* ── RCA form (shown inline) ───────────────────────────────── */}
      {showRCA && (
        <RCAForm
          incidentId={id}
          onSuccess={() => {
            setShowRCA(false)
            fetchDetail()
          }}
        />
      )}

      {/* ── Raw signals table ─────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-4">
          Raw Signals
          <span className="ml-2 text-gray-600 font-normal">({signals.length})</span>
        </h3>

        {signals.length === 0 ? (
          <p className="text-sm text-gray-600">No signals linked yet.</p>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-900 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">Error Code</th>
                  <th className="px-4 py-3 text-left">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {signals.map((sig, i) => (
                  <tr key={sig._id || i} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-400 font-mono text-xs">
                      {sig.received_at
                        ? format(new Date(sig.received_at), 'MMM d HH:mm:ss.SSS')
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-xs font-mono">
                        {sig.error_code}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-300 max-w-md truncate">{sig.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
