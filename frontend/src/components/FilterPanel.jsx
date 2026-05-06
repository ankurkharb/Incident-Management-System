const STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']
const PRIORITIES = ['P0', 'P1', 'P2', 'P3']

const STATUS_COLORS = {
  OPEN: 'border-cyan-500 text-cyan-400',
  INVESTIGATING: 'border-amber-500 text-amber-400',
  RESOLVED: 'border-green-500 text-green-400',
  CLOSED: 'border-slate-500 text-slate-400',
}
const PRIO_COLORS = {
  P0: 'border-red-500 text-red-400',
  P1: 'border-orange-500 text-orange-400',
  P2: 'border-yellow-500 text-yellow-400',
  P3: 'border-cyan-500 text-cyan-400',
}

export default function FilterPanel({ filters, onChange, onClose }) {
  const toggle = (key, val) => {
    const set = new Set(filters[key] || [])
    set.has(val) ? set.delete(val) : set.add(val)
    onChange({ ...filters, [key]: [...set] })
  }

  const clear = () => onChange({ statuses: [], priorities: [] })

  return (
    <div className="absolute right-0 top-12 w-72 glass-panel rounded-xl border border-cyan-500/20 shadow-[0_8_40px_rgba(0,0,0,0.6)] z-50 animate-modal-in p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-label-caps text-xs text-slate-400">FILTERS</span>
        <button onClick={clear} className="text-[10px] text-cyan-400 font-label-caps hover:text-cyan-300 cursor-pointer">CLEAR_ALL</button>
      </div>

      <p className="text-[10px] font-label-caps text-slate-600 mb-2">STATUS</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUSES.map(s => {
          const active = (filters.statuses || []).includes(s)
          return (
            <button key={s} onClick={() => toggle('statuses', s)}
              className={`px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wider transition-all cursor-pointer ${active ? STATUS_COLORS[s] + ' bg-white/5' : 'border-slate-700 text-slate-600'}`}>
              {s}
            </button>
          )
        })}
      </div>

      <p className="text-[10px] font-label-caps text-slate-600 mb-2">PRIORITY</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {PRIORITIES.map(p => {
          const active = (filters.priorities || []).includes(p)
          return (
            <button key={p} onClick={() => toggle('priorities', p)}
              className={`px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wider transition-all cursor-pointer ${active ? PRIO_COLORS[p] + ' bg-white/5' : 'border-slate-700 text-slate-600'}`}>
              {p}
            </button>
          )
        })}
      </div>

      <button onClick={onClose}
        className="w-full py-2 rounded-lg bg-cyan-500/10 text-cyan-400 font-label-caps text-xs border border-cyan-500/20 hover:bg-cyan-500/20 transition-all cursor-pointer">
        APPLY
      </button>
    </div>
  )
}
