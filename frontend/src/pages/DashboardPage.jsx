import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

const STAT_CARDS = [
  { key: 'total', label: 'TOTAL_ACTIVE', icon: 'crisis_alert', color: 'cyan' },
  { key: 'open', label: 'OPEN', icon: 'radio_button_checked', color: 'cyan' },
  { key: 'investigating', label: 'INVESTIGATING', icon: 'search', color: 'amber' },
  { key: 'resolved', label: 'RESOLVED', icon: 'check_circle', color: 'green' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/incidents').then(r => r.data),
      fetch('/health').then(r => r.json()).catch(() => null),
    ]).then(([inc, h]) => {
      setIncidents(inc)
      setHealth(h)
    }).finally(() => setLoading(false))
  }, [])

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'OPEN').length,
    investigating: incidents.filter(i => i.status === 'INVESTIGATING').length,
    resolved: incidents.filter(i => i.status === 'RESOLVED').length,
  }

  const prioCount = { P0: 0, P1: 0, P2: 0, P3: 0 }
  incidents.forEach(i => { if (prioCount[i.priority] !== undefined) prioCount[i.priority]++ })

  const colorMap = { cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30', green: 'text-green-400 bg-green-500/10 border-green-500/30' }
  const prioColors = { P0: 'bg-red-500', P1: 'bg-orange-500', P2: 'bg-yellow-500', P3: 'bg-cyan-500' }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin glow-cyan" />
          <p className="text-sm font-code-mono text-slate-500 uppercase">Initializing Dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded border border-cyan-500/30 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 pulse-indicator"></span>
            <span className="font-label-caps">LIVE</span>
          </div>
          <h1 className="text-display-lg font-display-lg uppercase tracking-tight text-on-background">Command Center</h1>
        </div>
        <p className="text-slate-400 font-code-mono uppercase tracking-widest text-sm">Operations Overview // Cluster: Alpha-09</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, icon, color }) => (
          <div key={key} className="glass-panel p-5 rounded-xl border border-white/5 hover:border-cyan-500/20 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <span className="font-label-caps text-[10px] text-slate-500">{label}</span>
              <div className={`w-8 h-8 rounded flex items-center justify-center border ${colorMap[color]}`}>
                <span className="material-symbols-outlined text-sm">{icon}</span>
              </div>
            </div>
            <p className={`text-3xl font-bold font-['Space_Grotesk'] ${colorMap[color].split(' ')[0]}`}>{stats[key]}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Priority Breakdown */}
        <div className="col-span-12 lg:col-span-5 glass-panel p-6 rounded-xl">
          <h3 className="font-label-caps text-xs text-slate-400 mb-5">PRIORITY_BREAKDOWN</h3>
          <div className="space-y-4">
            {Object.entries(prioCount).map(([p, count]) => (
              <div key={p} className="flex items-center gap-4">
                <span className="text-xs font-code-mono text-slate-400 w-6">{p}</span>
                <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className={`${prioColors[p]} h-full rounded-full transition-all duration-700`}
                    style={{ width: `${stats.total ? (count / stats.total) * 100 : 0}%` }} />
                </div>
                <span className="text-xs font-code-mono text-slate-400 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="col-span-12 lg:col-span-3 glass-panel p-6 rounded-xl">
          <h3 className="font-label-caps text-xs text-slate-400 mb-5">SYSTEM_STATUS</h3>
          <div className="space-y-3">
            {[
              { label: 'POSTGRES', ok: health?.postgres },
              { label: 'REDIS', ok: health?.redis },
              { label: 'MONGO', ok: health?.mongo },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs font-code-mono text-slate-400">{label}</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${ok ? 'bg-green-400 pulse-indicator' : 'bg-red-400'}`} />
                  <span className={`text-[10px] font-label-caps ${ok ? 'text-green-400' : 'text-red-400'}`}>{ok ? 'ONLINE' : 'OFFLINE'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="col-span-12 lg:col-span-4 glass-panel p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-label-caps text-xs text-slate-400">RECENT_INCIDENTS</h3>
            <button onClick={() => navigate('/incidents')} className="text-[10px] text-cyan-400 font-label-caps hover:text-cyan-300 cursor-pointer">VIEW_ALL</button>
          </div>
          <div className="space-y-2">
            {incidents.slice(0, 4).map(inc => (
              <button key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors text-left cursor-pointer">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${inc.status === 'OPEN' ? 'bg-cyan-400' : inc.status === 'INVESTIGATING' ? 'bg-amber-400' : 'bg-green-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{inc.component_id}</p>
                  <p className="text-[10px] text-slate-500 font-code-mono">{inc.priority} · {inc.status}</p>
                </div>
                <span className="material-symbols-outlined text-slate-700 text-sm">chevron_right</span>
              </button>
            ))}
            {incidents.length === 0 && <p className="text-xs text-slate-600 font-code-mono text-center py-4">NO_INCIDENTS</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
