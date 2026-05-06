import { useState, useEffect, useRef } from 'react'
import api from '../api'
import { format } from 'date-fns'

export default function LogStreamPage() {
  const [logs, setLogs] = useState([])
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    const generate = async () => {
      try {
        const { data: incidents } = await api.get('/incidents')
        const newLogs = incidents.map(inc => ({
          id: `${inc.id}-${Date.now()}`,
          time: format(new Date(inc.start_time), 'HH:mm:ss.SSS'),
          level: inc.priority === 'P0' ? 'CRT' : inc.priority === 'P1' ? 'ERR' : inc.priority === 'P2' ? 'WRN' : 'INF',
          source: inc.component_id,
          msg: `[${inc.status}] Incident ${inc.priority} — ${inc.component_id}`,
        }))

        // Add system logs
        const sysLogs = [
          { level: 'INF', source: 'HEARTBEAT', msg: 'Cluster Alpha-09 heartbeat acknowledged' },
          { level: 'INF', source: 'SYNC', msg: `State synced with region us-east-1 at ${new Date().toLocaleTimeString()}` },
          { level: 'DBG', source: 'CACHE', msg: `Redis cache hit ratio: ${(85 + Math.random() * 10).toFixed(1)}%` },
        ].map(l => ({ ...l, id: `sys-${Date.now()}-${Math.random()}`, time: format(new Date(), 'HH:mm:ss.SSS') }))

        if (!paused) {
          setLogs(prev => [...prev, ...newLogs, ...sysLogs].slice(-300))
        }
      } catch { /* silent */ }
    }

    generate()
    const interval = setInterval(generate, 10000)
    return () => clearInterval(interval)
  }, [paused])

  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, paused])

  const levelColor = { CRT: 'text-red-400', ERR: 'text-orange-400', WRN: 'text-yellow-400', INF: 'text-cyan-400', DBG: 'text-slate-500' }

  const filtered = filter
    ? logs.filter(l => l.msg.toLowerCase().includes(filter.toLowerCase()) || l.source.toLowerCase().includes(filter.toLowerCase()))
    : logs

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-lg font-display-lg uppercase tracking-tight text-on-background">Log Stream</h1>
          <p className="text-slate-400 font-code-mono uppercase tracking-widest text-sm mt-1">Real-time Event Stream // {logs.length} entries</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter logs…"
            className="bg-slate-900/80 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 font-code-mono w-48"
          />
          <button onClick={() => setPaused(p => !p)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-label-caps cursor-pointer transition-all ${paused ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'}`}>
            <span className="material-symbols-outlined text-sm">{paused ? 'play_arrow' : 'pause'}</span>
            {paused ? 'RESUME' : 'PAUSE'}
          </button>
          <button onClick={() => setLogs([])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 text-xs font-label-caps text-slate-400 hover:bg-white/5 cursor-pointer transition-all">
            <span className="material-symbols-outlined text-sm">delete_sweep</span> CLEAR
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden border border-cyan-900/20">
        <div className="flex items-center gap-4 px-4 py-2 bg-slate-900/60 border-b border-white/5 text-[10px] font-label-caps text-slate-600">
          <span className="w-24">TIMESTAMP</span>
          <span className="w-8">LVL</span>
          <span className="w-32">SOURCE</span>
          <span className="flex-1">MESSAGE</span>
        </div>
        <div className="h-[65vh] overflow-y-auto font-code-mono text-[12px] bg-slate-950/40">
          {filtered.map(log => (
            <div key={log.id} className="flex items-start gap-4 px-4 py-1.5 hover:bg-white/3 border-b border-white/2">
              <span className="text-slate-600 w-24 flex-shrink-0">{log.time}</span>
              <span className={`w-8 flex-shrink-0 font-bold ${levelColor[log.level] || 'text-slate-500'}`}>{log.level}</span>
              <span className="text-cyan-600 w-32 flex-shrink-0 truncate">{log.source}</span>
              <span className="text-slate-400 flex-1">{log.msg}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
