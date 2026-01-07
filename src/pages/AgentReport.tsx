import { useEffect, useState } from 'react'
import { Users, TrendingUp, AlertTriangle } from 'lucide-react'
import api from '../lib/api'
import type { AgentReport, Account, TeamLeader } from '../types'

function MetricCard({ emoji, name, total, count }: { emoji?: string; name: string; total: number; count: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {emoji && <span className="text-2xl">{emoji}</span>}
          <p className="text-sm font-medium text-gray-500">{name}</p>
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{total.toFixed(2)}</p>
      <p className="text-xs text-gray-500 mt-1">{count} {count === 1 ? 'agent' : 'agents'}</p>
    </div>
  )
}

export default function AgentReport() {
  const [report, setReport] = useState<AgentReport | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<string>('')

  // Load accounts and team leaders for filters
  useEffect(() => {
    loadFilters()
  }, [])

  // Load report when filters change
  useEffect(() => {
    if (selectedAccount) {
      loadReport()
    }
  }, [date, selectedAccount, selectedTeamLeader])

  async function loadFilters() {
    try {
      const [accountsData, teamLeadersData] = await Promise.all([
        api.getAccounts(true),
        api.getTeamLeaders(),
      ])
      setAccounts(accountsData.items)
      setTeamLeaders(teamLeadersData)

      // Auto-select first account if available
      if (accountsData.items.length > 0 && !selectedAccount) {
        setSelectedAccount(accountsData.items[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load filters')
    }
  }

  async function loadReport() {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getAgentReport(
        date,
        selectedAccount || undefined,
        selectedTeamLeader || undefined
      )
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  // Filter team leaders by selected account
  const filteredTeamLeaders = selectedAccount
    ? teamLeaders.filter(tl => tl.account_id === selectedAccount)
    : teamLeaders

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agent Report</h1>
            <p className="text-gray-500">Aggregated metrics across agents</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
              <select
                value={selectedAccount}
                onChange={(e) => {
                  setSelectedAccount(e.target.value)
                  setSelectedTeamLeader('') // Reset team leader when account changes
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Accounts</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Leader</label>
              <select
                value={selectedTeamLeader}
                onChange={(e) => setSelectedTeamLeader(e.target.value)}
                disabled={!selectedAccount}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">All Team Leaders</option>
                {filteredTeamLeaders.map((tl) => (
                  <option key={tl.id} value={tl.id}>
                    {tl.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Loading/Error states */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
      ) : !report ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Select an account to view the report.</p>
        </div>
      ) : (
        <>
          {/* Aggregated Metrics Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Aggregated Totals</h2>
                <p className="text-sm text-gray-500">
                  {report.aggregated.account_name} ({report.aggregated.account_code})
                  {report.aggregated.team_leader_name && ` • ${report.aggregated.team_leader_name}`}
                  {' • '}{report.aggregated.total_agents} {report.aggregated.total_agents === 1 ? 'agent' : 'agents'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {report.aggregated.metrics.map((metric) => (
                <MetricCard
                  key={metric.metric_key}
                  emoji={metric.emoji}
                  name={metric.metric_name}
                  total={metric.total_value}
                  count={metric.agent_count}
                />
              ))}
            </div>
          </div>

          {/* Individual Agent Metrics Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Individual Agents</h2>
                <p className="text-sm text-gray-500">Breakdown by agent</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                        Agent
                      </th>
                      {report.aggregated.metrics.map((metric) => (
                        <th
                          key={metric.metric_key}
                          className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {metric.emoji && <span className="mr-1">{metric.emoji}</span>}
                          {metric.metric_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {report.agents.map((agent) => (
                      <tr key={agent.agent_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 sticky left-0 bg-white z-10">
                          <div>
                            <p className="font-medium text-gray-900">{agent.agent_name}</p>
                            <p className="text-sm text-gray-500">{agent.agent_email}</p>
                            {agent.employee_id && (
                              <p className="text-xs text-gray-400">ID: {agent.employee_id}</p>
                            )}
                          </div>
                        </td>
                        {report.aggregated.metrics.map((metric) => {
                          const agentMetric = agent.metrics.find(m => m.metric_key === metric.metric_key)
                          return (
                            <td key={metric.metric_key} className="px-6 py-4 text-center">
                              {agentMetric ? (
                                <span className="font-medium text-gray-900">
                                  {agentMetric.value_numeric !== null && agentMetric.value_numeric !== undefined
                                    ? agentMetric.value_numeric.toFixed(2)
                                    : agentMetric.value_text || '-'}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    {report.agents.length === 0 && (
                      <tr>
                        <td
                          colSpan={report.aggregated.metrics.length + 1}
                          className="px-6 py-12 text-center text-gray-500"
                        >
                          No agent data available for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
