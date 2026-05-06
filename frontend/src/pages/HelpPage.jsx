export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-display-lg font-display-lg uppercase tracking-tight text-on-background">Help Center</h1>
        <p className="text-slate-400 font-code-mono uppercase tracking-widest text-sm mt-1">Documentation & Reference</p>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="glass-panel rounded-xl p-6">
        <h3 className="font-label-caps text-xs text-cyan-400 mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">keyboard</span> KEYBOARD_SHORTCUTS
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { keys: 'Ctrl + K', action: 'Open Command Palette' },
            { keys: 'Esc', action: 'Close modal / panel' },
            { keys: '+', action: 'Report new signal (via FAB)' },
          ].map(({ keys, action }) => (
            <div key={keys} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-white/5">
              <span className="text-sm text-slate-300">{action}</span>
              <kbd className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded font-code-mono border border-slate-700">{keys}</kbd>
            </div>
          ))}
        </div>
      </div>

      {/* Incident Lifecycle */}
      <div className="glass-panel rounded-xl p-6">
        <h3 className="font-label-caps text-xs text-cyan-400 mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">account_tree</span> INCIDENT_LIFECYCLE_FSM
        </h3>
        <div className="flex items-center justify-center gap-2 flex-wrap py-4">
          {['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'].map((step, i) => {
            const colors = ['text-cyan-400 border-cyan-500/30 bg-cyan-500/5', 'text-amber-400 border-amber-500/30 bg-amber-500/5', 'text-green-400 border-green-500/30 bg-green-500/5', 'text-slate-400 border-slate-500/30 bg-slate-500/5']
            return (
              <div key={step} className="flex items-center gap-2">
                <div className={`px-4 py-2 rounded-lg border text-xs font-bold font-['Space_Grotesk'] ${colors[i]}`}>{step}</div>
                {i < 3 && <span className="material-symbols-outlined text-slate-600">arrow_forward</span>}
              </div>
            )
          })}
        </div>
        <div className="mt-4 space-y-2 text-xs text-slate-500 font-code-mono">
          <p>• OPEN → INVESTIGATING or RESOLVED</p>
          <p>• INVESTIGATING → RESOLVED or OPEN</p>
          <p>• RESOLVED → CLOSED (requires RCA) or INVESTIGATING</p>
          <p>• CLOSED is terminal — no further transitions</p>
        </div>
      </div>

      {/* API Reference */}
      <div className="glass-panel rounded-xl p-6">
        <h3 className="font-label-caps text-xs text-cyan-400 mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">api</span> API_REFERENCE
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] font-label-caps text-slate-500 border-b border-white/5">
                <th className="py-2 pr-4">METHOD</th>
                <th className="py-2 pr-4">ENDPOINT</th>
                <th className="py-2">DESCRIPTION</th>
              </tr>
            </thead>
            <tbody className="font-code-mono text-xs">
              {[
                { method: 'POST', endpoint: '/api/v1/signals', desc: 'Ingest a raw signal (rate-limited)' },
                { method: 'GET', endpoint: '/api/v1/incidents', desc: 'List active incidents (cached 30s)' },
                { method: 'GET', endpoint: '/api/v1/incidents/:id', desc: 'Incident detail + raw signals' },
                { method: 'PATCH', endpoint: '/api/v1/incidents/:id/status', desc: 'FSM state transition' },
                { method: 'POST', endpoint: '/api/v1/incidents/:id/rca', desc: 'Submit RCA + compute MTTR' },
                { method: 'GET', endpoint: '/health', desc: 'System health check' },
              ].map(({ method, endpoint, desc }) => {
                const mc = { POST: 'text-green-400', GET: 'text-cyan-400', PATCH: 'text-amber-400' }
                return (
                  <tr key={endpoint} className="border-b border-white/3 hover:bg-white/3">
                    <td className={`py-2.5 pr-4 font-bold ${mc[method]}`}>{method}</td>
                    <td className="py-2.5 pr-4 text-slate-300">{endpoint}</td>
                    <td className="py-2.5 text-slate-500">{desc}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-4 text-xs text-cyan-400 font-label-caps hover:text-cyan-300 transition-colors">
          <span className="material-symbols-outlined text-sm">open_in_new</span> OPEN_SWAGGER_DOCS
        </a>
      </div>

      {/* Architecture */}
      <div className="glass-panel rounded-xl p-6">
        <h3 className="font-label-caps text-xs text-cyan-400 mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">architecture</span> TECH_STACK
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Backend', value: 'Python / FastAPI' },
            { label: 'Frontend', value: 'React 19 / Vite' },
            { label: 'RDBMS', value: 'PostgreSQL 16' },
            { label: 'Time-series', value: 'TimescaleDB' },
            { label: 'NoSQL', value: 'MongoDB' },
            { label: 'Cache', value: 'Redis 7' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-lg bg-slate-900/60 border border-white/5">
              <p className="text-[10px] font-label-caps text-slate-500 mb-1">{label}</p>
              <p className="text-sm text-slate-200 font-code-mono">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
