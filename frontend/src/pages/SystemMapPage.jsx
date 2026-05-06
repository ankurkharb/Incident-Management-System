import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function SystemMapPage() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/incidents').then(r => r.data),
      fetch('/health').then(r => r.json()).catch(() => null),
    ]).then(([inc, h]) => { setIncidents(inc); setHealth(h) }).finally(() => setLoading(false))
  }, [])

  // Infrastructure nodes for the map
  const infra = [
    { id: 'LOAD_BALANCER', icon: 'hub', label: 'Load Balancer', type: 'loadbalancer' },
    { id: 'API_GATEWAY', icon: 'api', label: 'API Gateway', type: 'api' },
    { id: 'BACKEND', icon: 'dns', label: 'FastAPI Backend', type: 'api' },
    { id: 'POSTGRES', icon: 'database', label: 'PostgreSQL', type: 'rdbms', health: health?.postgres },
    { id: 'REDIS', icon: 'memory', label: 'Redis Cache', type: 'cache', health: health?.redis },
    { id: 'MONGODB', icon: 'storage', label: 'MongoDB', type: 'nosql', health: health?.mongo },
  ]

  // Map component_ids to infra nodes
  const nodeIncidents = {}
  incidents.forEach(inc => {
    const key = inc.component_id.toUpperCase()
    infra.forEach(n => {
      if (key.includes(n.type.toUpperCase()) || key.includes(n.id)) {
        nodeIncidents[n.id] = (nodeIncidents[n.id] || 0) + 1
      }
    })
  })

  if (loading) {
    return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin glow-cyan" /></div>
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-display-lg font-display-lg uppercase tracking-tight text-on-background">System Map</h1>
        <p className="text-slate-400 font-code-mono uppercase tracking-widest text-sm mt-1">Network Topology // Multi-Region Architecture</p>
      </div>

      {/* Map visualization */}
      <div className="glass-panel rounded-xl p-8 border border-cyan-900/20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, rgba(0,240,255,0.3) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        </div>

        {/* Top tier - Load Balancer */}
        <div className="relative flex justify-center mb-8">
          <NodeCard node={infra[0]} count={nodeIncidents[infra[0].id]} onClick={() => navigate('/nodes')} />
        </div>

        {/* Connection lines */}
        <div className="flex justify-center mb-2">
          <div className="w-px h-8 bg-gradient-to-b from-cyan-500/40 to-cyan-500/10" />
        </div>

        {/* Mid tier - API */}
        <div className="relative flex justify-center gap-8 mb-8">
          <NodeCard node={infra[1]} count={nodeIncidents[infra[1].id]} onClick={() => navigate('/nodes')} />
          <NodeCard node={infra[2]} count={nodeIncidents[infra[2].id]} onClick={() => navigate('/nodes')} />
        </div>

        {/* Connection lines */}
        <div className="flex justify-center gap-32 mb-2">
          <div className="w-px h-8 bg-gradient-to-b from-cyan-500/40 to-cyan-500/10" />
          <div className="w-px h-8 bg-gradient-to-b from-cyan-500/40 to-cyan-500/10" />
          <div className="w-px h-8 bg-gradient-to-b from-cyan-500/40 to-cyan-500/10" />
        </div>

        {/* Bottom tier - Data stores */}
        <div className="relative flex justify-center gap-6">
          {infra.slice(3).map(node => (
            <NodeCard key={node.id} node={node} count={nodeIncidents[node.id]} onClick={() => navigate('/nodes')} />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-6 items-center justify-center">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-400" /><span className="text-xs font-code-mono text-slate-400">HEALTHY</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400" /><span className="text-xs font-code-mono text-slate-400">DEGRADED</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400" /><span className="text-xs font-code-mono text-slate-400">DOWN</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-cyan-400 pulse-indicator" /><span className="text-xs font-code-mono text-slate-400">ACTIVE_INCIDENTS</span></div>
      </div>
    </div>
  )
}

function NodeCard({ node, count, onClick }) {
  const isHealthy = node.health !== false
  const hasIncidents = count > 0

  return (
    <button onClick={onClick}
      className={`glass-panel p-4 rounded-xl border transition-all cursor-pointer hover:scale-105 min-w-[140px] ${
        !isHealthy ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]' :
        hasIncidents ? 'border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]' :
        'border-green-500/20 hover:border-cyan-500/30'
      }`}>
      <div className="flex flex-col items-center gap-2">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${
          !isHealthy ? 'bg-red-500/10 border-red-500/30' :
          hasIncidents ? 'bg-amber-500/10 border-amber-500/30' :
          'bg-green-500/10 border-green-500/20'
        }`}>
          <span className={`material-symbols-outlined text-xl ${!isHealthy ? 'text-red-400' : hasIncidents ? 'text-amber-400' : 'text-green-400'}`}>{node.icon}</span>
        </div>
        <p className="text-xs font-bold text-slate-200 font-['Space_Grotesk'] uppercase tracking-tight">{node.label}</p>
        <div className="flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${!isHealthy ? 'bg-red-400' : hasIncidents ? 'bg-amber-400 pulse-indicator' : 'bg-green-400'}`} />
          <span className="text-[10px] font-code-mono text-slate-500">{!isHealthy ? 'OFFLINE' : hasIncidents ? `${count} ALERT${count > 1 ? 'S' : ''}` : 'NOMINAL'}</span>
        </div>
      </div>
    </button>
  )
}
