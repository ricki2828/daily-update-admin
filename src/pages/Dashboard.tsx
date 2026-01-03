import { useEffect, useState } from 'react'
import { CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react'
import api from '../lib/api'
import type { AccountDashboard } from '../types'

function StatsCard({ title, value, icon: Icon, color }: { title: string; value: number | string; icon: React.ElementType; color: string }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${colors[color as keyof typeof colors]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function AccountCard({ dashboard }: { dashboard: AccountDashboard }) {
  const { account_name, account_code, stats, updates } = dashboard
  const rate = Math.round(stats.submission_rate * 100)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{account_name}</h3>
          <p className="text-sm text-gray-500">{account_code}</p>
        </div>
        <div className={`text-2xl font-bold ${rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
          {rate}%
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 text-center text-sm mb-4">
        <div>
          <p className="text-gray-500">Expected</p>
          <p className="font-semibold">{stats.total_expected}</p>
        </div>
        <div>
          <p className="text-gray-500">Submitted</p>
          <p className="font-semibold text-green-600">{stats.submitted}</p>
        </div>
        <div>
          <p className="text-gray-500">Pending</p>
          <p className="font-semibold text-yellow-600">{stats.pending}</p>
        </div>
        <div>
          <p className="text-gray-500">Missed</p>
          <p className="font-semibold text-red-600">{stats.missed}</p>
        </div>
      </div>

      {updates.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Team Leaders</p>
          <div className="space-y-2">
            {updates.slice(0, 5).map((update) => (
              <div key={update.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{update.team_leader.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  update.status === 'submitted' ? 'bg-green-100 text-green-700' :
                  update.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  update.status === 'missed' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {update.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [dashboards, setDashboards] = useState<AccountDashboard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])

  useEffect(() => {
    loadDashboard()
  }, [date])

  async function loadDashboard() {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getDashboard(date)
      setDashboards(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const totals = dashboards.reduce((acc, d) => ({
    expected: acc.expected + d.stats.total_expected,
    submitted: acc.submitted + d.stats.submitted,
    pending: acc.pending + d.stats.pending,
    missed: acc.missed + d.stats.missed,
  }), { expected: 0, submitted: 0, pending: 0, missed: 0 })

  const overallRate = totals.expected > 0 ? Math.round((totals.submitted / totals.expected) * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Daily update submission overview</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard title="Overall Rate" value={`${overallRate}%`} icon={CheckCircle} color="blue" />
            <StatsCard title="Submitted" value={totals.submitted} icon={CheckCircle} color="green" />
            <StatsCard title="Pending" value={totals.pending} icon={Clock} color="yellow" />
            <StatsCard title="Missed" value={totals.missed} icon={XCircle} color="red" />
          </div>

          {/* Account cards */}
          {dashboards.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No accounts configured. Add accounts to see the dashboard.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {dashboards.map((dashboard) => (
                <AccountCard key={dashboard.account_id} dashboard={dashboard} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
