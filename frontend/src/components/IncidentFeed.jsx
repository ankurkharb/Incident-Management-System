import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import api from '../api'
import FilterPanel from './FilterPanel.jsx'

const PRIORITY_STYLES = {
  P0: { border: 'border-l-red-500', glow: 'glow-red', icon: 'error', color: 'text-red-500', badge: 'bg-red-500/10 border-red-500/20 text-red-500' },
  P1: { border: 'border-l-orange-500', glow: 'glow-orange', icon: 'warning', color: 'text-orange-500', badge: 'bg-orange-500/10 border-orange-500/20 text-orange-500' },
  P2: { border: 'border-l-yellow-500', glow: 'glow-yellow', icon: 'report_problem', color: 'text-yellow-500', badge: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' },
  P3: { border: 'border-l-cyan-500', glow: 'glow-cyan', icon: 'dns', color: 'text-cyan-500', badge: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500' },
}

const STATUS_BADGE = {
  OPEN:          'border-cyan-500 text-cyan-400 bg-cyan-500/5 glow-cyan',
  INVESTIGATING: 'border-amber-500 text-amber-400 bg-amber-500/5 glow-amber',
  RESOLVED:      'border-green-500 text-green-500 bg-green-500/5 glow-green',
  CLOSED:        'border-gray-500 text-gray-500 bg-gray-500/5',
}

const POLL_INTERVAL = 15_000

export default function IncidentFeed() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFilter, setShowFilter] = useState(false)
  const [filters, setFilters] = useState({ statuses: [], priorities: [] })
  const [journalLogs, setJournalLogs] = useState([])
  const navigate = useNavigate()

  const fetchIncidents = async () => {
    try {
      const { data } = await api.get('/incidents')
      setIncidents(data)
      setError(null)
      // Generate dynamic journal entries from incidents
      const logs = data.slice(0, 4).map((inc, i) => {
        const t = new Date(Date.now() - i * 60000)
        const levelMap = { P0: { tag: 'CRT', cls: 'text-red-500' }, P1: { tag: 'ERR', cls: 'text-orange-500' }, P2: { tag: 'WRN', cls: 'text-yellow-500' }, P3: { tag: 'INF', cls: 'text-slate-400' } }
        const lv = levelMap[inc.priority] || levelMap.P3
        return { time: format(t, 'HH:mm:ss'), tag: lv.tag, cls: lv.cls, msg: `[${inc.status}] ${inc.component_id} — ${inc.priority} incident active` }
      })
      if (logs.length === 0) {
        logs.push({ time: format(new Date(), 'HH:mm:ss'), tag: 'INF', cls: 'text-slate-400', msg: 'All systems nominal. No active incidents.' })
      }
      setJournalLogs(logs)
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

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(incidents, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `incidents_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin glow-cyan" />
          <p className="text-sm font-code-mono text-slate-500 uppercase">Connecting to Cluster...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-panel border-l-4 border-red-500 p-6 text-center rounded-xl">
        <p className="text-red-400 text-sm font-code-mono">{error}</p>
        <button onClick={fetchIncidents}
          className="mt-4 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded font-label-caps hover:bg-red-500/20 transition-colors cursor-pointer">
          RETRY_CONNECTION
        </button>
      </div>
    )
  }

  // Apply filters
  let sorted = [...incidents].sort((a, b) => {
    const pa = parseInt(a.priority?.replace('P', '') ?? '9')
    const pb = parseInt(b.priority?.replace('P', '') ?? '9')
    return pa - pb
  })

  if (filters.statuses.length > 0) {
    sorted = sorted.filter(i => filters.statuses.includes(i.status))
  }
  if (filters.priorities.length > 0) {
    sorted = sorted.filter(i => filters.priorities.includes(i.priority))
  }

  const activeFilters = filters.statuses.length + filters.priorities.length

  return (
    <div className="max-w-7xl mx-auto">
      {/* Dashboard Header Section */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded border border-cyan-500/30 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 pulse-indicator"></span>
              <span className="font-label-caps">LIVE</span>
            </div>
            <h1 className="text-display-lg font-display-lg uppercase tracking-tight text-on-background">Incident Manager</h1>
          </div>
          <p className="text-slate-400 font-code-mono uppercase tracking-widest text-sm">Real-time operations dashboard // Cluster: Alpha-09</p>
        </div>
        <div className="flex gap-4">
          <div className="glass-panel p-4 rounded-lg flex items-center gap-6">
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-label-caps mb-1">UPTIME</p>
              <p className="text-cyan-400 font-code-mono">99.998%</p>
            </div>
            <div className="w-[1px] h-8 bg-white/10"></div>
            <div className="text-center">
              <p className="text-[10px] text-slate-500 font-label-caps mb-1">LATENCY</p>
              <p className="text-cyan-400 font-code-mono">24ms</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Layout Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Hero Visual Module */}
        <div className="col-span-12 lg:col-span-8 h-80 rounded-xl overflow-hidden relative group">
          <img
            className="w-full h-full object-cover grayscale opacity-40 group-hover:opacity-60 transition-opacity duration-700"
            src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=2000"
            alt="Server Rack"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
          <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
            <div>
              <p className="text-cyan-400 font-label-caps text-sm mb-2">NETWORK TOPOLOGY</p>
              <h2 className="text-headline-md font-headline-md text-white">Multi-Region Load Balancing Active</h2>
            </div>
            <span className="material-symbols-outlined text-cyan-400 text-3xl opacity-50">hub</span>
          </div>
        </div>

        {/* Metrics Quick View */}
        <div className="col-span-12 lg:col-span-4 glass-panel p-6 rounded-xl flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <span className="font-label-caps text-slate-400">SYSTEM_HEALTH</span>
            <span className="material-symbols-outlined text-cyan-400">query_stats</span>
          </div>
          <div className="flex-1 space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-code-mono text-slate-300">CPU LOAD</span>
                <span className="text-xs font-code-mono text-cyan-400">42%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full w-[42%] glow-cyan"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-code-mono text-slate-300">MEM USAGE</span>
                <span className="text-xs font-code-mono text-cyan-400">78%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full w-[78%] glow-cyan"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-code-mono text-slate-300">DISK I/O</span>
                <span className="text-xs font-code-mono text-cyan-400">15%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-cyan-500 h-full w-[15%] glow-cyan"></div>
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/live-metrics')}
            className="mt-6 w-full py-2 border border-cyan-500/30 rounded text-cyan-400 font-label-caps text-xs hover:bg-cyan-500/10 transition-all cursor-pointer">
            VIEW_FULL_TELEMETRY
          </button>
        </div>

        {/* Incidents List Module */}
        <div className="col-span-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h3 className="text-headline-md font-headline-md uppercase tracking-wide text-white">Active Incidents ({sorted.length})</h3>
              <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded border border-white/5">
                <span className="material-symbols-outlined text-[14px] text-slate-500 animate-spin" style={{animationDuration: '3s'}}>sync</span>
                <span className="text-[10px] text-slate-500 font-code-mono uppercase">Polling every 15 s</span>
              </div>
              {activeFilters > 0 && (
                <span className="text-[10px] font-label-caps text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {activeFilters} FILTER{activeFilters > 1 ? 'S' : ''} ACTIVE
                </span>
              )}
            </div>
            <div className="flex gap-2 relative">
              <button onClick={() => setShowFilter(f => !f)}
                className={`p-2 border rounded hover:bg-white/5 transition-all cursor-pointer ${showFilter || activeFilters > 0 ? 'border-cyan-500/30 text-cyan-400' : 'border-white/10'}`}>
                <span className="material-symbols-outlined text-slate-400">filter_list</span>
              </button>
              <button onClick={handleDownload}
                className="p-2 border border-white/10 rounded hover:bg-white/5 transition-all cursor-pointer">
                <span className="material-symbols-outlined text-slate-400">download</span>
              </button>
              {showFilter && <FilterPanel filters={filters} onChange={setFilters} onClose={() => setShowFilter(false)} />}
            </div>
          </div>

          {/* Incident Cards */}
          <div className="space-y-4">
            {sorted.length === 0 && (
              <div className="glass-panel p-12 text-center rounded-xl border-dashed border-slate-700">
                <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-4 border border-cyan-500/30">
                  <span className="material-symbols-outlined text-cyan-400 text-3xl">verified</span>
                </div>
                <p className="text-cyan-400 font-label-caps text-lg">SYSTEMS_NOMINAL</p>
                <p className="text-slate-500 font-code-mono text-sm mt-2">
                  {activeFilters > 0 ? 'No incidents match current filters.' : 'No active incidents detected.'}
                </p>
                {activeFilters > 0 && (
                  <button onClick={() => setFilters({ statuses: [], priorities: [] })}
                    className="mt-3 text-xs text-cyan-400 font-label-caps hover:text-cyan-300 cursor-pointer">CLEAR_FILTERS</button>
                )}
              </div>
            )}

            {sorted.map((inc) => {
              const ps = PRIORITY_STYLES[inc.priority] || PRIORITY_STYLES.P3;
              const sb = STATUS_BADGE[inc.status] || STATUS_BADGE.OPEN;

              return (
                <div
                  key={inc.id}
                  onClick={() => navigate(`/incidents/${inc.id}`)}
                  className={`glass-panel p-5 rounded-xl border-l-4 ${ps.border} group hover:border-cyan-500/80 transition-all duration-300 cursor-pointer`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded flex items-center justify-center border ${ps.badge}`}>
                        <span className="material-symbols-outlined">{ps.icon}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-white font-bold font-['Space_Grotesk'] text-lg">{inc.component_id}</span>
                          <span className={`px-2 py-0.5 ${ps.badge} text-[10px] font-bold rounded`}>
                            {inc.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 font-code-mono">
                          <span className={`flex items-center gap-1 ${ps.color}/80`}>
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            Started {formatDistanceToNow(new Date(inc.start_time), { addSuffix: true })}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                            {format(new Date(inc.start_time), 'yyyy-MM-dd HH:mm:ss')} UTC
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between lg:justify-end gap-8">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-label-caps mb-1">CURRENT_STATUS</p>
                        <span className={`px-4 py-1.5 rounded-full border text-[11px] font-bold tracking-widest ${sb}`}>
                          {inc.status}
                        </span>
                      </div>
                      <button className="p-2 text-slate-500 hover:text-cyan-400 transition-colors">
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer Log Console — Dynamic */}
        <div className="col-span-12 glass-panel p-4 rounded-xl border-t border-cyan-500/20 bg-slate-950/60 mt-4">
          <div className="flex items-center gap-4 mb-4">
            <span className="font-label-caps text-xs text-slate-500">SYSTEM_JOURNAL_V1.0.4</span>
            <div className="h-px flex-1 bg-white/5"></div>
            <button onClick={() => navigate('/log-stream')}
              className="text-[10px] text-cyan-400 font-label-caps hover:text-cyan-300 cursor-pointer">VIEW_FULL_LOG</button>
          </div>
          <div className="font-code-mono text-[12px] space-y-1.5 overflow-hidden h-24">
            {journalLogs.map((log, i) => (
              <p key={i} className="text-slate-500">
                <span className="text-cyan-600">[{log.time}]</span>{' '}
                <span className={log.cls}>{log.tag}</span>{' '}
                {log.msg}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
