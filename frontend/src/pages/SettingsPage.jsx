import { useState, useEffect } from 'react'

const DEFAULTS = { pollInterval: 15, theme: 'dark', notifications: true, sounds: false, autoRefresh: true }

export default function SettingsPage() {
  const [settings, setSettings] = useState(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('sre_settings')) } }
    catch { return DEFAULTS }
  })
  const [saved, setSaved] = useState(false)

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const save = () => {
    localStorage.setItem('sre_settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const reset = () => {
    setSettings(DEFAULTS)
    localStorage.removeItem('sre_settings')
    setSaved(false)
  }

  const toggleCls = (on) => `relative w-10 h-5 rounded-full transition-colors cursor-pointer ${on ? 'bg-cyan-500' : 'bg-slate-700'}`
  const dotCls = (on) => `absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5.5' : 'translate-x-0.5'}`

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-display-lg font-display-lg uppercase tracking-tight text-on-background">Settings</h1>
        <p className="text-slate-400 font-code-mono uppercase tracking-widest text-sm mt-1">System Configuration</p>
      </div>

      {/* General */}
      <div className="glass-panel rounded-xl p-6">
        <h3 className="font-label-caps text-xs text-slate-400 mb-6">GENERAL</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-200 font-medium">Poll Interval</p>
              <p className="text-xs text-slate-500 font-code-mono mt-0.5">How often to refresh data (seconds)</p>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" min={5} max={60} value={settings.pollInterval}
                onChange={(e) => update('pollInterval', parseInt(e.target.value) || 15)}
                className="w-20 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-200 text-center focus:outline-none focus:ring-1 focus:ring-cyan-500/50 font-code-mono" />
              <span className="text-xs text-slate-500 font-code-mono">sec</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-200 font-medium">Auto Refresh</p>
              <p className="text-xs text-slate-500 font-code-mono mt-0.5">Automatically poll for new data</p>
            </div>
            <button onClick={() => update('autoRefresh', !settings.autoRefresh)} className={toggleCls(settings.autoRefresh)}>
              <div className={dotCls(settings.autoRefresh)} />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="glass-panel rounded-xl p-6">
        <h3 className="font-label-caps text-xs text-slate-400 mb-6">NOTIFICATIONS</h3>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-200 font-medium">Enable Notifications</p>
              <p className="text-xs text-slate-500 font-code-mono mt-0.5">Show alert notifications in header</p>
            </div>
            <button onClick={() => update('notifications', !settings.notifications)} className={toggleCls(settings.notifications)}>
              <div className={dotCls(settings.notifications)} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-200 font-medium">Sound Alerts</p>
              <p className="text-xs text-slate-500 font-code-mono mt-0.5">Play sound on critical alerts</p>
            </div>
            <button onClick={() => update('sounds', !settings.sounds)} className={toggleCls(settings.sounds)}>
              <div className={dotCls(settings.sounds)} />
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={save}
          className="flex-1 py-2.5 rounded-lg bg-cyan-500 text-on-primary font-label-caps hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all cursor-pointer">
          {saved ? '✓ SAVED' : 'SAVE_SETTINGS'}
        </button>
        <button onClick={reset}
          className="px-6 py-2.5 rounded-lg border border-white/10 text-slate-400 font-label-caps hover:bg-white/5 transition-all cursor-pointer">
          RESET
        </button>
      </div>
    </div>
  )
}
