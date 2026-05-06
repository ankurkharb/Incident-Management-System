import { useNavigate } from 'react-router-dom'
import IncidentDetail from '../components/IncidentDetail.jsx'

export default function IncidentDetailPage() {
  const navigate = useNavigate()

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/incidents')}
          className="text-slate-400 hover:text-cyan-400 transition-colors text-sm flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          INCIDENTS
        </button>
        <span className="text-slate-700 font-['Space_Grotesk']">/</span>
        <span className="text-sm text-slate-300 font-label-caps">INCIDENT_DETAIL</span>
      </div>

      <IncidentDetail />
    </div>
  )
}
