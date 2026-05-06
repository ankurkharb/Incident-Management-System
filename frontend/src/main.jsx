import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import IncidentsPage from './pages/IncidentsPage.jsx'
import IncidentDetailPage from './pages/IncidentDetailPage.jsx'
import NodesPage from './pages/NodesPage.jsx'
import SecurityPage from './pages/SecurityPage.jsx'
import TerminalPage from './pages/TerminalPage.jsx'
import SystemMapPage from './pages/SystemMapPage.jsx'
import LiveMetricsPage from './pages/LiveMetricsPage.jsx'
import LogStreamPage from './pages/LogStreamPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import HelpPage from './pages/HelpPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
          <Route path="/nodes" element={<NodesPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/terminal" element={<TerminalPage />} />
          <Route path="/system-map" element={<SystemMapPage />} />
          <Route path="/live-metrics" element={<LiveMetricsPage />} />
          <Route path="/log-stream" element={<LogStreamPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
