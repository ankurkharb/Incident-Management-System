import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function NodesPage() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/incidents').then(({ data }) => setIncidents(data)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Group by component_id
  const nodeMap = {}
  incidents.forEach(inc => {
    if (!nodeMap[inc.component_id]) {
      nodeMap[inc.component_id] = { id: inc.component_id, incidents: [], priorities: new Set(), statuses: new Set() }
    }
    nodeMap[inc.component_id].incidents.push(inc)
    nodeMap[inc.component_id].priorities.add(inc.priority)
    nodeMap[inc.component_id].statuses.add(inc.status)
  })
  const nodes = Object.values(nodeMap)

  const statusColor = (statuses) => {
    if (statuses.has('OPEN')) return 'border-cyan-500 bg-cyan-500/5'
    if (statuses.has('INVESTIGATING')) return 'border-amber-500 bg-amber-500/5'
    if (statuses.has('RESOLVED')) return 'border-green-500 bg-green-500/5'
    return 'border-slate-700 bg-slate-900/40'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin glow-cyan" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-display-lg font-display-lg uppercase tracking-tight text-on-background">Infrastructure Nodes</h1>
        <p className="text-slate-400 font-code-mono uppercase tracking-widest text-sm mt-1">Component Health Overview // {nodes.length} nodes tracked</p>
      </div>

      {nodes.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-xl">
          <span className="material-symbols-outlined text-slate-700 text-5xl mb-4">dns</span>
          <p className="text-cyan-400 font-label-caps">NO_NODES_DETECTED</p>
          <p className="text-slate-500 font-code-mono text-sm mt-2">Send signals to register infrastructure nodes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map(node => (
            <div key={node.id} className={`glass-panel rounded-xl border-l-4 p-5 hover:scale-[1.02] transition-all cursor-pointer ${statusColor(node.statuses)}`}
              onClick={() => navigate(`/incidents/${node.incidents[0].id}`)}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center border border-white/5">
                    <span className="material-symbols-outlined text-cyan-400">dns</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white font-['Space_Grotesk'] uppercase">{node.id}</p>
                    <p className="text-[10px] text-slate-500 font-code-mono">{node.incidents.length} incident{node.incidents.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${node.statuses.has('OPEN') ? 'bg-cyan-400 pulse-indicator' : node.statuses.has('INVESTIGATING') ? 'bg-amber-400' : 'bg-green-400'}`} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[...node.priorities].map(p => (
                  <span key={p} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-white/5">{p}</span>
                ))}
                {[...node.statuses].map(s => (
                  <span key={s} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/5">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
