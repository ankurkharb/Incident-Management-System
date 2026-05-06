import { useState } from 'react'
import api from '../api'

const COMPONENT_TYPES = ['rdbms', 'api', 'cache', 'queue', 'nosql', 'cdn', 'loadbalancer']
const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export default function CreateIncidentModal({ onClose }) {
  const [form, setForm] = useState({
    component_id: '',
    component_type: '',
    error_code: '',
    message: '',
    severity: '',
    metadata: {},
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await api.post('/signals', form)
      setSuccess(true)
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit signal')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = "w-full bg-slate-900/80 border border-cyan-900/30 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent font-code-mono transition-all"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg mx-4 glass-panel rounded-2xl border border-cyan-500/20 shadow-[0_0_60px_rgba(0,240,255,0.1)] animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/30">
              <span className="material-symbols-outlined text-cyan-400">add_alert</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-['Space_Grotesk'] uppercase tracking-tight">REPORT_SIGNAL</h2>
              <p className="text-xs text-slate-500 font-code-mono">POST /api/v1/signals</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded hover:bg-white/5 transition-all cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4 border border-green-500/30 glow-green">
              <span className="material-symbols-outlined text-green-400 text-3xl">check_circle</span>
            </div>
            <p className="text-green-400 font-label-caps text-lg">SIGNAL_ACCEPTED</p>
            <p className="text-slate-500 font-code-mono text-sm mt-2">Signal queued for processing.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-label-caps text-slate-400 mb-1.5">COMPONENT_ID</label>
                <input
                  required
                  value={form.component_id}
                  onChange={(e) => setForm({ ...form, component_id: e.target.value })}
                  placeholder="e.g. RDBMS_PRIMARY_01"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] font-label-caps text-slate-400 mb-1.5">COMPONENT_TYPE</label>
                <select
                  required
                  value={form.component_type}
                  onChange={(e) => setForm({ ...form, component_type: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select…</option>
                  {COMPONENT_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-label-caps text-slate-400 mb-1.5">ERROR_CODE</label>
                <input
                  required
                  value={form.error_code}
                  onChange={(e) => setForm({ ...form, error_code: e.target.value })}
                  placeholder="e.g. CONN_TIMEOUT"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[10px] font-label-caps text-slate-400 mb-1.5">SEVERITY</label>
                <select
                  required
                  value={form.severity}
                  onChange={(e) => setForm({ ...form, severity: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select…</option>
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-label-caps text-slate-400 mb-1.5">MESSAGE</label>
              <textarea
                required
                rows={2}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe the error..."
                className={inputCls}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <p className="text-xs text-red-400 font-code-mono">{typeof error === 'string' ? error : JSON.stringify(error)}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-cyan-500 text-on-primary font-label-caps hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {submitting ? 'TRANSMITTING…' : 'SUBMIT_SIGNAL'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
