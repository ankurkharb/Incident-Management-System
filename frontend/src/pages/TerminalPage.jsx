import { useState, useEffect, useRef } from 'react'
import api from '../api'

export default function TerminalPage() {
  const [logs, setLogs] = useState([])
  const [cmd, setCmd] = useState('')
  const bottomRef = useRef(null)

  const addLog = (type, msg) => {
    setLogs(prev => [...prev.slice(-200), { time: new Date().toLocaleTimeString(), type, msg, id: Date.now() + Math.random() }])
  }

  useEffect(() => {
    addLog('SYS', 'Terminal initialized. Type "help" for available commands.')
    addLog('SYS', 'Connected to Cluster Alpha-09.')

    const poll = setInterval(async () => {
      try {
        const { data } = await fetch('/health').then(r => r.json())
        // data is { status, postgres, redis, mongo }
      } catch { /* silent */ }
    }, 30000)
    return () => clearInterval(poll)
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  const handleCmd = async (e) => {
    e.preventDefault()
    const input = cmd.trim()
    if (!input) return
    setCmd('')
    addLog('CMD', `$ ${input}`)

    const parts = input.toLowerCase().split(/\s+/)
    switch (parts[0]) {
      case 'help':
        addLog('SYS', 'Available commands: health, incidents, clear, status, whoami, uptime')
        break
      case 'health':
        try {
          const h = await fetch('/health').then(r => r.json())
          addLog('INF', `System: ${h.status} | PG: ${h.postgres ? '✓' : '✗'} | Redis: ${h.redis ? '✓' : '✗'} | Mongo: ${h.mongo ? '✓' : '✗'}`)
        } catch { addLog('ERR', 'Health check failed') }
        break
      case 'incidents':
        try {
          const { data } = await api.get('/incidents')
          addLog('INF', `${data.length} active incident(s):`)
          data.forEach(inc => addLog('INF', `  [${inc.priority}] ${inc.component_id} — ${inc.status}`))
        } catch { addLog('ERR', 'Failed to fetch incidents') }
        break
      case 'clear':
        setLogs([])
        break
      case 'status':
        addLog('INF', 'Cluster: Alpha-09 | Region: us-east-1 | Operator: OPERATOR_01')
        break
      case 'whoami':
        addLog('INF', 'OPERATOR_01 | CLEARANCE_LEVEL_5 | SRE_COMMAND_CENTER')
        break
      case 'uptime':
        addLog('INF', `System uptime: ${Math.floor(Math.random() * 90 + 10)} days, ${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`)
        break
      default:
        addLog('ERR', `Unknown command: ${input}. Type "help" for available commands.`)
    }
  }

  const typeColor = { SYS: 'text-cyan-400', CMD: 'text-white', INF: 'text-slate-400', ERR: 'text-red-400', WRN: 'text-yellow-400' }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-display-lg font-display-lg uppercase tracking-tight text-on-background">Terminal</h1>
        <p className="text-slate-400 font-code-mono uppercase tracking-widest text-sm mt-1">Interactive Command Interface</p>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden border border-cyan-900/30">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/80 border-b border-white/5">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
          <span className="ml-4 text-xs text-slate-500 font-code-mono">sre-cmd-center@alpha-09:~</span>
        </div>

        {/* Log output */}
        <div className="h-[60vh] overflow-y-auto p-4 font-code-mono text-[13px] space-y-0.5 bg-slate-950/60">
          {logs.map(log => (
            <div key={log.id} className="flex gap-2">
              <span className="text-slate-600 select-none">[{log.time}]</span>
              <span className={`${typeColor[log.type] || 'text-slate-400'} select-none w-8`}>{log.type}</span>
              <span className={`${typeColor[log.type] || 'text-slate-400'} whitespace-pre-wrap`}>{log.msg}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleCmd} className="flex items-center gap-2 px-4 py-3 bg-slate-900/80 border-t border-white/5">
          <span className="text-cyan-400 font-code-mono text-sm">$</span>
          <input
            value={cmd}
            onChange={(e) => setCmd(e.target.value)}
            placeholder="Type a command…"
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 focus:outline-none font-code-mono"
            autoFocus
          />
        </form>
      </div>
    </div>
  )
}
