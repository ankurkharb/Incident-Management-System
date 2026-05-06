import IncidentFeed from './components/IncidentFeed.jsx'

function App() {
  return (
    <div className="bg-background text-on-background font-body-base min-h-screen">
      {/* Top Navigation Bar */}
      <header className="flex justify-between items-center w-full px-6 h-16 fixed top-0 z-50 bg-slate-950/80 backdrop-blur-[40px] border-b border-cyan-500/20 shadow-[0_4_20px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-4">
          <span className="text-xl font-black italic tracking-tighter text-cyan-500 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
            SRE_COMMAND_CENTER
          </span>
          <div className="h-6 w-[1px] bg-white/10 hidden md:block"></div>
          <nav className="hidden md:flex gap-6">
            <a className="text-slate-500 hover:text-cyan-200 transition-colors font-['Space_Grotesk'] tracking-widest uppercase text-xs font-bold" href="javascript:void(0)">SYSTEM_MAP</a>
            <a className="text-slate-500 hover:text-cyan-200 transition-colors font-['Space_Grotesk'] tracking-widest uppercase text-xs font-bold" href="javascript:void(0)">LIVE_METRICS</a>
            <a className="text-slate-500 hover:text-cyan-200 transition-colors font-['Space_Grotesk'] tracking-widest uppercase text-xs font-bold" href="javascript:void(0)">LOG_STREAM</a>
            <a className="text-cyan-400 border-b-2 border-cyan-400 pb-1 font-['Space_Grotesk'] tracking-widest uppercase text-xs font-bold" href="javascript:void(0)">ALERTS</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-full border border-white/5">
            <span className="material-symbols-outlined text-cyan-400 text-sm">search</span>
            <span className="text-xs text-slate-500 font-code-mono">CMD + K</span>
          </div>
          <span className="material-symbols-outlined text-slate-400 hover:bg-cyan-500/10 p-2 rounded cursor-pointer transition-all">sensors</span>
          <div className="relative">
            <span className="material-symbols-outlined text-slate-400 hover:bg-cyan-500/10 p-2 rounded cursor-pointer transition-all">notifications_active</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
          </div>
          <span className="material-symbols-outlined text-slate-400 hover:bg-cyan-500/10 p-2 rounded cursor-pointer transition-all">account_tree</span>
        </div>
      </header>

      {/* Side Navigation */}
      <aside className="fixed left-0 top-0 h-full flex-col pt-20 pb-6 z-40 bg-slate-950/95 backdrop-blur-md w-64 border-r border-cyan-900/30 shadow-[10px_0_30px_rgba(0,0,0,0.5)] hidden md:flex">
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
          <a className="text-slate-500 hover:text-cyan-300 px-4 py-3 flex items-center gap-3 font-['Space_Grotesk'] font-medium uppercase tracking-tighter hover:translate-x-1 transition-transform duration-200" href="javascript:void(0)">
            <span className="material-symbols-outlined text-lg">grid_view</span>
            DASHBOARD
          </a>
          <a className="bg-cyan-500/10 text-cyan-400 border-l-4 border-cyan-500 shadow-[inset_0_0_10px_rgba(0,240,255,0.2)] px-4 py-3 flex items-center gap-3 font-['Space_Grotesk'] font-medium uppercase tracking-tighter" href="javascript:void(0)">
            <span className="material-symbols-outlined text-lg">warning</span>
            INCIDENTS
          </a>
          <a className="text-slate-500 hover:text-cyan-300 px-4 py-3 flex items-center gap-3 font-['Space_Grotesk'] font-medium uppercase tracking-tighter hover:translate-x-1 transition-transform duration-200" href="javascript:void(0)">
            <span className="material-symbols-outlined text-lg">dns</span>
            NODES
          </a>
          <a className="text-slate-500 hover:text-cyan-300 px-4 py-3 flex items-center gap-3 font-['Space_Grotesk'] font-medium uppercase tracking-tighter hover:translate-x-1 transition-transform duration-200" href="javascript:void(0)">
            <span className="material-symbols-outlined text-lg">verified_user</span>
            SECURITY
          </a>
          <a className="text-slate-500 hover:text-cyan-300 px-4 py-3 flex items-center gap-3 font-['Space_Grotesk'] font-medium uppercase tracking-tighter hover:translate-x-1 transition-transform duration-200" href="javascript:void(0)">
            <span className="material-symbols-outlined text-lg">terminal</span>
            TERMINAL
          </a>
        </nav>
        <div className="px-6 mt-auto">
          <button className="w-full bg-cyan-500 text-on-primary py-2.5 px-4 rounded font-label-caps hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">rocket_launch</span>
            DEPLOY_PATCH
          </button>
          <div className="mt-6 pt-6 border-t border-white/5 space-y-1">
            <a className="text-slate-500 hover:text-cyan-300 py-2 flex items-center gap-3 font-['Space_Grotesk'] text-xs font-medium uppercase tracking-tighter" href="#">
              <span className="material-symbols-outlined text-sm">help_outline</span>
              HELP
            </a>
            <a className="text-slate-500 hover:text-cyan-300 py-2 flex items-center gap-3 font-['Space_Grotesk'] text-xs font-medium uppercase tracking-tighter" href="#">
              <span className="material-symbols-outlined text-sm">settings</span>
              SETTINGS
            </a>
          </div>
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="pt-24 pb-12 px-6 md:ml-64">
        <IncidentFeed />
      </main>

      {/* Global FAB */}
      <div className="fixed bottom-8 right-8 z-50">
        <button className="w-14 h-14 bg-cyan-500 text-on-primary rounded-full shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center group">
          <span className="material-symbols-outlined text-3xl transition-transform group-hover:rotate-90">add</span>
        </button>
      </div>
    </div>
  )
}

export default App
