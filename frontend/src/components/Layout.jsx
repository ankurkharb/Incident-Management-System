import { useState, useEffect, useCallback } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import CreateIncidentModal from './CreateIncidentModal.jsx'
import CommandPalette from './CommandPalette.jsx'
import NotificationsPanel from './NotificationsPanel.jsx'
import DeployPatchModal from './DeployPatchModal.jsx'

const SIDE_NAV = [
  { to: '/',           icon: 'grid_view',     label: 'DASHBOARD' },
  { to: '/incidents',  icon: 'warning',       label: 'INCIDENTS' },
  { to: '/nodes',      icon: 'dns',           label: 'NODES' },
  { to: '/security',   icon: 'verified_user', label: 'SECURITY' },
  { to: '/terminal',   icon: 'terminal',      label: 'TERMINAL' },
]

const TOP_NAV = [
  { to: '/system-map',   label: 'SYSTEM_MAP' },
  { to: '/live-metrics', label: 'LIVE_METRICS' },
  { to: '/log-stream',   label: 'LOG_STREAM' },
  { to: '/incidents',    label: 'ALERTS' },
]

export default function Layout() {
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [showDeploy, setShowDeploy] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)

  // CMD+K keyboard shortcut
  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setShowPalette(p => !p)
    }
    if (e.key === 'Escape') {
      setShowPalette(false)
      setShowNotifs(false)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const navLinkClass = ({ isActive }) =>
    isActive
      ? "text-cyan-400 border-b-2 border-cyan-400 pb-1 font-['Space_Grotesk'] tracking-widest uppercase text-xs font-bold"
      : "text-slate-500 hover:text-cyan-200 transition-colors font-['Space_Grotesk'] tracking-widest uppercase text-xs font-bold"

  const sideNavClass = ({ isActive }) =>
    isActive
      ? "bg-cyan-500/10 text-cyan-400 border-l-4 border-cyan-500 shadow-[inset_0_0_10px_rgba(0,240,255,0.2)] px-4 py-3 flex items-center gap-3 font-['Space_Grotesk'] font-medium uppercase tracking-tighter"
      : "text-slate-500 hover:text-cyan-300 px-4 py-3 flex items-center gap-3 font-['Space_Grotesk'] font-medium uppercase tracking-tighter hover:translate-x-1 transition-transform duration-200"

  return (
    <div className="bg-background text-on-background font-body-base min-h-screen">
      {/* ── Top Navigation Bar ────────────────────────────────── */}
      <header className="flex justify-between items-center w-full px-6 h-16 fixed top-0 z-50 bg-slate-950/80 backdrop-blur-[40px] border-b border-cyan-500/20 shadow-[0_4_20px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-4">
          <NavLink to="/" className="text-xl font-black italic tracking-tighter text-cyan-500 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
            SRE_COMMAND_CENTER
          </NavLink>
          <div className="h-6 w-[1px] bg-white/10 hidden md:block"></div>
          <nav className="hidden md:flex gap-6">
            {TOP_NAV.map(({ to, label }) => (
              <NavLink key={to} to={to} className={navLinkClass}>{label}</NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {/* CMD+K Search */}
          <button
            onClick={() => setShowPalette(true)}
            className="hidden lg:flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-full border border-white/5 cursor-pointer hover:border-cyan-500/30 transition-colors"
          >
            <span className="material-symbols-outlined text-cyan-400 text-sm">search</span>
            <span className="text-xs text-slate-500 font-code-mono">CMD + K</span>
          </button>
          {/* Sensors → System Map */}
          <button onClick={() => navigate('/system-map')} className="material-symbols-outlined text-slate-400 hover:bg-cyan-500/10 p-2 rounded cursor-pointer transition-all">sensors</button>
          {/* Notifications Bell */}
          <div className="relative">
            <button onClick={() => setShowNotifs(p => !p)} className="material-symbols-outlined text-slate-400 hover:bg-cyan-500/10 p-2 rounded cursor-pointer transition-all">notifications_active</button>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full pointer-events-none"></span>
            {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
          </div>
          {/* Account Tree → Nodes */}
          <button onClick={() => navigate('/nodes')} className="material-symbols-outlined text-slate-400 hover:bg-cyan-500/10 p-2 rounded cursor-pointer transition-all">account_tree</button>
          {/* Mobile menu toggle */}
          <button onClick={() => setMobileMenu(m => !m)} className="md:hidden material-symbols-outlined text-slate-400 hover:bg-cyan-500/10 p-2 rounded cursor-pointer transition-all">menu</button>
        </div>
      </header>

      {/* ── Side Navigation ──────────────────────────────────── */}
      <aside className={`fixed left-0 top-0 h-full flex-col pt-20 pb-6 z-40 bg-slate-950/95 backdrop-blur-md w-64 border-r border-cyan-900/30 shadow-[10px_0_30px_rgba(0,0,0,0.5)] ${mobileMenu ? 'flex' : 'hidden md:flex'}`}>
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg border border-white/5">
            <div className="w-10 h-10 bg-cyan-500/20 rounded flex items-center justify-center border border-cyan-500/40">
              <span className="material-symbols-outlined text-cyan-400">terminal</span>
            </div>
            <div>
              <p className="text-cyan-500 font-bold font-['Space_Grotesk'] text-xs uppercase tracking-tighter">OPERATOR_01</p>
              <p className="text-slate-500 text-[10px] uppercase font-['Space_Grotesk']">CLEARANCE_LEVEL_5</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {SIDE_NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} className={sideNavClass} onClick={() => setMobileMenu(false)}>
              <span className="material-symbols-outlined text-lg">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 mt-auto">
          <button
            onClick={() => setShowDeploy(true)}
            className="w-full bg-cyan-500 text-on-primary py-2.5 px-4 rounded font-label-caps hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">rocket_launch</span>
            DEPLOY_PATCH
          </button>
          <div className="mt-6 pt-6 border-t border-white/5 space-y-1">
            <NavLink to="/help" className={({ isActive }) => `${isActive ? 'text-cyan-400' : 'text-slate-500 hover:text-cyan-300'} py-2 flex items-center gap-3 font-['Space_Grotesk'] text-xs font-medium uppercase tracking-tighter`} onClick={() => setMobileMenu(false)}>
              <span className="material-symbols-outlined text-sm">help_outline</span>
              HELP
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `${isActive ? 'text-cyan-400' : 'text-slate-500 hover:text-cyan-300'} py-2 flex items-center gap-3 font-['Space_Grotesk'] text-xs font-medium uppercase tracking-tighter`} onClick={() => setMobileMenu(false)}>
              <span className="material-symbols-outlined text-sm">settings</span>
              SETTINGS
            </NavLink>
          </div>
        </div>
      </aside>

      {/* ── Main Content Canvas ──────────────────────────────── */}
      <main className="pt-24 pb-12 px-6 md:ml-64">
        <Outlet />
      </main>

      {/* ── Global FAB ───────────────────────────────────────── */}
      <div className="fixed bottom-8 right-8 z-50">
        <button
          onClick={() => setShowCreate(true)}
          className="w-14 h-14 bg-cyan-500 text-on-primary rounded-full shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center group cursor-pointer"
        >
          <span className="material-symbols-outlined text-3xl transition-transform group-hover:rotate-90">add</span>
        </button>
      </div>

      {/* ── Modals ───────────────────────────────────────────── */}
      {showCreate && <CreateIncidentModal onClose={() => setShowCreate(false)} />}
      {showPalette && <CommandPalette onClose={() => setShowPalette(false)} />}
      {showDeploy && <DeployPatchModal onClose={() => setShowDeploy(false)} />}
    </div>
  )
}
