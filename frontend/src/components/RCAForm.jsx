import { useState } from 'react'
import api from '../api'

const CATEGORIES = [
  'Infrastructure',
  'Code Defect',
  'Configuration',
  'Dependency',
  'Human Error',
  'Unknown',
]

export default function RCAForm({ incidentId, onSuccess }) {
  const [form, setForm] = useState({
    root_cause_category: '',
    fix_applied: '',
    prevention_steps: '',
    incident_start: '',
    incident_end: '',
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.root_cause_category) e.root_cause_category = 'Required'
    if (!form.incident_start) e.incident_start = 'Required'
    if (!form.incident_end) e.incident_end = 'Required'
    if (!form.fix_applied || form.fix_applied.trim().length < 20)
      e.fix_applied = 'Minimum 20 characters'
    if (!form.prevention_steps || form.prevention_steps.trim().length < 20)
      e.prevention_steps = 'Minimum 20 characters'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = validate()
    setErrors(v)
    if (Object.keys(v).length > 0) return

    setSubmitting(true)
    setServerError(null)
    try {
      await api.post(`/incidents/${incidentId}/rca`, {
        ...form,
        incident_start: new Date(form.incident_start).toISOString(),
        incident_end: new Date(form.incident_end).toISOString(),
      })
      onSuccess?.()
    } catch (err) {
      setServerError(err.response?.data?.detail || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
      <h3 className="text-base font-semibold text-amber-400 mb-5">Submit Root Cause Analysis</h3>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Category ─────────────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">Root Cause Category</label>
          <select
            value={form.root_cause_category}
            onChange={(e) => setForm({ ...form, root_cause_category: e.target.value })}
            className={inputCls}
          >
            <option value="">Select…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errors.root_cause_category && <p className="mt-1 text-xs text-red-400">{errors.root_cause_category}</p>}
        </div>

        {/* ── Date pickers ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Incident Start</label>
            <input
              type="datetime-local"
              value={form.incident_start}
              onChange={(e) => setForm({ ...form, incident_start: e.target.value })}
              className={inputCls}
            />
            {errors.incident_start && <p className="mt-1 text-xs text-red-400">{errors.incident_start}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Incident End</label>
            <input
              type="datetime-local"
              value={form.incident_end}
              onChange={(e) => setForm({ ...form, incident_end: e.target.value })}
              className={inputCls}
            />
            {errors.incident_end && <p className="mt-1 text-xs text-red-400">{errors.incident_end}</p>}
          </div>
        </div>

        {/* ── Fix applied ──────────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Fix Applied
            <span className="text-gray-600 font-normal ml-1">(min 20 chars)</span>
          </label>
          <textarea
            rows={3}
            value={form.fix_applied}
            onChange={(e) => setForm({ ...form, fix_applied: e.target.value })}
            placeholder="Describe the fix that was applied…"
            className={inputCls}
          />
          <div className="flex justify-between mt-1">
            {errors.fix_applied && <p className="text-xs text-red-400">{errors.fix_applied}</p>}
            <p className={`text-xs ml-auto ${form.fix_applied.trim().length >= 20 ? 'text-emerald-500' : 'text-gray-600'}`}>
              {form.fix_applied.trim().length}/20
            </p>
          </div>
        </div>

        {/* ── Prevention steps ─────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Prevention Steps
            <span className="text-gray-600 font-normal ml-1">(min 20 chars)</span>
          </label>
          <textarea
            rows={3}
            value={form.prevention_steps}
            onChange={(e) => setForm({ ...form, prevention_steps: e.target.value })}
            placeholder="What steps will prevent recurrence…"
            className={inputCls}
          />
          <div className="flex justify-between mt-1">
            {errors.prevention_steps && <p className="text-xs text-red-400">{errors.prevention_steps}</p>}
            <p className={`text-xs ml-auto ${form.prevention_steps.trim().length >= 20 ? 'text-emerald-500' : 'text-gray-600'}`}>
              {form.prevention_steps.trim().length}/20
            </p>
          </div>
        </div>

        {/* ── Server error ─────────────────────────────────────────── */}
        {serverError && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <p className="text-xs text-red-400">{typeof serverError === 'string' ? serverError : JSON.stringify(serverError)}</p>
          </div>
        )}

        {/* ── Submit ───────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
        >
          {submitting ? 'Submitting…' : 'Submit RCA'}
        </button>
      </form>
    </div>
  )
}
