import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import api from '../api'

export default function SecurityPage() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/incidents').then(({ data }) => setIncidents(data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Categorize by priority for security view
  const critical = incidents.filter(i => i.priority === 'P0' || i.priority === 'P1')
  const warnings = incidents.filter(i => i.priority === 'P2')
  const info = incidents.filter(i => i.priority === 'P3')

  const threatLevel = critical.length > 0 ? 'HIGH' : warnings.length > 0 ? 'MEDIUM' : 'LOW'
  const threatColor = { HIGH: 'text-red-400 bg-red-500/10 border-red-500/30', MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/30', LOW: 'text-green-400 bg-green-500/10 border-green-500/30' }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin glow-cyan" /></div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-display-lg font-display-lg uppercase tracking-tight text-on-background">Security Overview</h1>
        <p className="text-slate-400 font-code-mono uppercase tracking-widest text-sm mt-1">Threat Assessment // Cluster Alpha-09</p>
      </div>

      {/* Threat Level */}
      <div className={`glass-panel p-6 rounded-xl border ${threatColor[threatLevel]}`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center border border-current/20 bg-current/5">
            <span className="material-symbols-outlined text-3xl">{threatLevel === 'LOW' ? 'shield' : 'gpp_maybe'}</span>
          </div>
          <div>
            <p className="text-[10px] font-label-caps text-current/60">THREAT_LEVEL</p>
            <p className="text-2xl font-bold font-['Space_Grotesk']">{threatLevel}</p>
            <p className="text-xs font-code-mono opacity-60">{critical.length} critical, {warnings.length} warnings, {info.length} informational</p>
          </div>
        </div>
      </div>

      {/* Security Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="font-label-caps text-xs text-red-400 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span> CRITICAL_ALERTS ({critical.length})
          </h3>
          <div className="space-y-2">
            {critical.length === 0 ? <p className="text-xs text-slate-600 font-code-mono text-center py-4">NO_CRITICAL_ALERTS</p> :
              critical.map(inc => (
                <button key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/10 hover:border-red-500/30 transition-all text-left cursor-pointer">
                  <div className="w-2 h-2 rounded-full bg-red-400 pulse-indicator flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{inc.component_id}</p>
                    <p className="text-[10px] text-slate-500 font-code-mono">{inc.priority} · {formatDistanceToNow(new Date(inc.start_time), { addSuffix: true })}</p>
                  </div>
                </button>
              ))}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h3 className="font-label-caps text-xs text-amber-400 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">warning</span> WARNINGS ({warnings.length + info.length})
          </h3>
          <div className="space-y-2">
            {[...warnings, ...info].length === 0 ? <p className="text-xs text-slate-600 font-code-mono text-center py-4">NO_WARNINGS</p> :
              [...warnings, ...info].map(inc => (
                <button key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-all text-left cursor-pointer border border-white/5">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${inc.priority === 'P2' ? 'bg-yellow-400' : 'bg-cyan-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{inc.component_id}</p>
                    <p className="text-[10px] text-slate-500 font-code-mono">{inc.priority} · {inc.status}</p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Access Log */}
      <div className="glass-panel p-6 rounded-xl">
        <h3 className="font-label-caps text-xs text-slate-400 mb-4">ACCESS_LOG</h3>
        <div className="font-code-mono text-[12px] space-y-1.5 text-slate-500">
          <p><span className="text-cyan-600">[{new Date().toLocaleTimeString()}]</span> <span className="text-green-400">AUTH</span> Operator_01 authenticated via SSO</p>
          <p><span className="text-cyan-600">[{new Date(Date.now()-60000).toLocaleTimeString()}]</span> <span className="text-slate-400">SCAN</span> Vulnerability scan completed — 0 critical findings</p>
          <p><span className="text-cyan-600">[{new Date(Date.now()-120000).toLocaleTimeString()}]</span> <span className="text-slate-400">AUDIT</span> Certificate rotation completed for *.alpha-09.internal</p>
          <p><span className="text-cyan-600">[{new Date(Date.now()-300000).toLocaleTimeString()}]</span> <span className="text-yellow-400">WARN</span> Unusual traffic pattern from 10.0.42.x/24</p>
        </div>
      </div>
    </div>
  )
}
