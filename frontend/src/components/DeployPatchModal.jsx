import { useState, useEffect } from 'react'

export default function DeployPatchModal({ onClose }) {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deploying, setDeploying] = useState(false)
  const [deployed, setDeployed] = useState(false)

  useEffect(() => {
    fetch('/health').then(r => r.json()).then(setHealth)
      .catch(() => setHealth({ status: 'unknown', postgres: false, redis: false, mongo: false }))
      .finally(() => setLoading(false))
  }, [])

  const handleDeploy = () => {
    setDeploying(true)
    setTimeout(() => { setDeploying(false); setDeployed(true); setTimeout(onClose, 2000) }, 2500)
  }

  const allHealthy = health?.status === 'healthy'
  const checks = [
    { label: 'POSTGRESQL', ok: health?.postgres },
    { label: 'REDIS', ok: health?.redis },
    { label: 'MONGODB', ok: health?.mongo },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md mx-4 glass-panel rounded-2xl border border-cyan-500/20 shadow-[0_0_60px_rgba(0,240,255,0.1)] animate-modal-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/30">
              <span className="material-symbols-outlined text-cyan-400">rocket_launch</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-['Space_Grotesk'] uppercase tracking-tight">DEPLOY_PATCH</h2>
              <p className="text-xs text-slate-500 font-code-mono">Pre-flight system check</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded hover:bg-white/5 transition-all cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6">
          {deployed ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4 border border-green-500/30 glow-green">
                <span className="material-symbols-outlined text-green-400 text-3xl">check_circle</span>
              </div>
              <p className="text-green-400 font-label-caps text-lg">DEPLOY_SUCCESSFUL</p>
              <p className="text-slate-500 font-code-mono text-sm mt-2">Patch applied to Cluster Alpha-09</p>
            </div>
          ) : (
            <>
              <p className="font-label-caps text-xs text-slate-400 mb-4">SYSTEM_HEALTH_CHECK</p>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {checks.map(({ label, ok }) => (
                    <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-white/5">
                      <span className="text-xs font-code-mono text-slate-300">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-label-caps ${ok ? 'text-green-400' : 'text-red-400'}`}>{ok ? 'ONLINE' : 'OFFLINE'}</span>
                        <div className={`w-2 h-2 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={handleDeploy} disabled={!allHealthy || deploying}
                className={`w-full py-3 rounded-lg font-label-caps transition-all cursor-pointer ${allHealthy ? 'bg-cyan-500 text-on-primary hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]' : 'bg-slate-800 text-slate-600 cursor-not-allowed'} disabled:opacity-60`}>
                {deploying ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />DEPLOYING…</span> : allHealthy ? 'CONFIRM_DEPLOY' : 'SYSTEMS_NOT_READY'}
              </button>
              {!allHealthy && !loading && <p className="text-xs text-red-400/70 text-center mt-3 font-code-mono">All systems must be online before deploying.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
