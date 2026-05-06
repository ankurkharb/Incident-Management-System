import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import api from '../api'

const PRIORITY_COLOR = {
  P0: 'text-red-400',
  P1: 'text-orange-400',
  P2: 'text-yellow-400',
  P3: 'text-cyan-400',
}

export default function NotificationsPanel({ onClose }) {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/incidents')
      .then(({ data }) => setIncidents(data.slice(0, 10)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.notif-panel')) onClose()
    }
    setTimeout(() => document.addEventListener('click', handler), 100)
    return () => document.removeEventListener('click', handler)
  }, [onClose])

  return (
    <div className="notif-panel absolute right-0 top-12 w-96 max-h-[480px] glass-panel rounded-xl border border-cyan-500/20 shadow-[0_8_40px_rgba(0,0,0,0.6)] z-[60] animate-modal-in overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="font-label-caps text-xs text-slate-400">RECENT_ALERTS</span>
        <button onClick={onClose} className="text-slate-600 hover:text-white cursor-pointer">
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      <div className="overflow-y-auto max-h-96">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : incidents.length === 0 ? (
          <div className="py-8 text-center">
            <span className="material-symbols-outlined text-slate-700 text-3xl mb-2">notifications_off</span>
            <p className="text-slate-600 text-xs font-code-mono">NO_ALERTS</p>
          </div>
        ) : (
          incidents.map((inc) => (
            <button
              key={inc.id}
              onClick={() => { navigate(`/incidents/${inc.id}`); onClose() }}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/3 cursor-pointer"
            >
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${inc.status === 'OPEN' ? 'bg-cyan-400 pulse-indicator' : inc.status === 'INVESTIGATING' ? 'bg-amber-400' : 'bg-green-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-200 font-medium truncate">{inc.component_id}</p>
                  <span className={`text-[10px] font-bold ${PRIORITY_COLOR[inc.priority] || 'text-slate-500'}`}>{inc.priority}</span>
                </div>
                <p className="text-[10px] text-slate-500 font-code-mono mt-0.5">
                  {inc.status} · {formatDistanceToNow(new Date(inc.start_time), { addSuffix: true })}
                </p>
              </div>
              <span className="material-symbols-outlined text-slate-600 text-sm mt-1">chevron_right</span>
            </button>
          ))
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-white/5">
        <button
          onClick={() => { navigate('/incidents'); onClose() }}
          className="w-full text-center text-xs text-cyan-400 font-label-caps hover:text-cyan-300 transition-colors cursor-pointer py-1"
        >
          VIEW_ALL_INCIDENTS
        </button>
      </div>
    </div>
  )
}
