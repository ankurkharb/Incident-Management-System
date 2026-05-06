import { useState, useEffect } from 'react'
import api from '../api'

export default function LiveMetricsPage() {
  const [incidents, setIncidents] = useState([])
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({ cpu: 42, mem: 78, disk: 15, net: 34 })

  useEffect(() => {
    Promise.all([
      api.get('/incidents').then(r => r.data),
      fetch('/health').then(r => r.json()).catch(() => null),
    ]).then(([inc, h]) => { setIncidents(inc); setHealth(h) }).finally(() => setLoading(false))

    // Simulate live metric fluctuation
    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.max(5, Math.min(95, prev.cpu + (Math.random() - 0.5) * 8)),
        mem: Math.max(30, Math.min(95, prev.mem + (Math.random() - 0.5) * 4)),
        disk: Math.max(5, Math.min(50, prev.disk + (Math.random() - 0.5) * 3)),
        net: Math.max(10, Math.min(80, prev.net + (Math.random() - 0.5) * 10)),
      }))
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const resolved = incidents.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED')
  const avgMttr = resolved.filter(i => i.mttr_seconds).reduce((sum, i) => sum + i.mttr_seconds, 0) / (resolved.filter(i => i.mttr_seconds).length || 1)

  const gaugeColor = (v) => v > 80 ? 'text-red-400 bg-red-500' : v > 60 ? 'text-amber-400 bg-amber-500' : 'text-cyan-400 bg-cyan-500'

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin glow-cyan" /></div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-lg font-display-lg uppercase tracking-tight text-on-background">Live Metrics</h1>
          <p className="text-slate-400 font-code-mono uppercase tracking-widest text-sm mt-1">Full Telemetry Dashboard // Auto-refresh 2s</p>
        </div>
        <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded border border-green-500/30">
          <div className="w-2 h-2 rounded-full bg-green-400 pulse-indicator" />
          <span className="font-label-caps text-xs text-green-400">STREAMING</span>
        </div>
      </div>

      {/* Resource Gauges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'CPU_LOAD', value: metrics.cpu, icon: 'memory' },
          { label: 'MEM_USAGE', value: metrics.mem, icon: 'storage' },
          { label: 'DISK_IO', value: metrics.disk, icon: 'hard_drive' },
          { label: 'NETWORK', value: metrics.net, icon: 'wifi' },
        ].map(({ label, value, icon }) => {
          const rounded = Math.round(value)
          const gc = gaugeColor(rounded)
          return (
            <div key={label} className="glass-panel p-5 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="font-label-caps text-[10px] text-slate-500">{label}</span>
                <span className={`material-symbols-outlined text-lg ${gc.split(' ')[0]}`}>{icon}</span>
              </div>
              <p className={`text-2xl font-bold font-['Space_Grotesk'] mb-3 ${gc.split(' ')[0]}`}>{rounded}%</p>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className={`${gc.split(' ')[1]} h-full rounded-full transition-all duration-1000`} style={{ width: `${rounded}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Incident Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="font-label-caps text-xs text-slate-400 mb-4">INCIDENT_RATE</h3>
          <p className="text-3xl font-bold font-['Space_Grotesk'] text-cyan-400">{incidents.length}</p>
          <p className="text-xs text-slate-500 font-code-mono mt-1">Active incidents</p>
          <div className="mt-4 flex gap-2">
            {['OPEN', 'INVESTIGATING', 'RESOLVED'].map(s => {
              const count = incidents.filter(i => i.status === s).length
              const colors = { OPEN: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', INVESTIGATING: 'bg-amber-500/10 text-amber-400 border-amber-500/20', RESOLVED: 'bg-green-500/10 text-green-400 border-green-500/20' }
              return <span key={s} className={`px-2 py-1 rounded text-[10px] font-bold border ${colors[s]}`}>{count} {s}</span>
            })}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h3 className="font-label-caps text-xs text-slate-400 mb-4">AVG_MTTR</h3>
          <p className="text-3xl font-bold font-['Space_Grotesk'] text-cyan-400">{avgMttr > 0 ? `${Math.round(avgMttr)}s` : '—'}</p>
          <p className="text-xs text-slate-500 font-code-mono mt-1">Mean time to resolve</p>
        </div>

        <div className="glass-panel p-6 rounded-xl">
          <h3 className="font-label-caps text-xs text-slate-400 mb-4">SYSTEM_STATUS</h3>
          <p className={`text-3xl font-bold font-['Space_Grotesk'] ${health?.status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>
            {health?.status === 'healthy' ? 'NOMINAL' : 'DEGRADED'}
          </p>
          <p className="text-xs text-slate-500 font-code-mono mt-1">All backends {health?.status === 'healthy' ? 'operational' : 'check required'}</p>
        </div>
      </div>
    </div>
  )
}
