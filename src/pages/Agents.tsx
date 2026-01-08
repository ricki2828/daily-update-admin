import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import api from '../lib/api'
import type { Agent, AgentCreate, Account, TeamLeader } from '../types'

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<string>('')
  const [formData, setFormData] = useState<AgentCreate>({
    name: '',
    email: '',
    employee_id: '',
    account_id: '',
    team_leader_id: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadAgents()
  }, [selectedAccount, selectedTeamLeader])

  // Load team leaders when form account changes
  useEffect(() => {
    if (formData.account_id) {
      loadTeamLeadersForAccount(formData.account_id)
    }
  }, [formData.account_id])

  async function loadData() {
    try {
      setLoading(true)
      const [accountsData, teamLeadersData] = await Promise.all([
        api.getAccounts(false),
        api.getTeamLeaders(),
      ])
      setAccounts(accountsData.items)
      setTeamLeaders(teamLeadersData)
      await loadAgents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function loadAgents() {
    try {
      const data = await api.getAgents(selectedAccount || undefined, selectedTeamLeader || undefined)
      setAgents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    }
  }

  async function loadTeamLeadersForAccount(accountId: string) {
    try {
      const data = await api.getTeamLeaders(accountId)
      setTeamLeaders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team leaders')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const submitData = {
        ...formData,
        email: formData.email || undefined,
        employee_id: formData.employee_id || undefined,
      }
      await api.createAgent(submitData)
      setShowForm(false)
      setFormData({ name: '', email: '', employee_id: '', account_id: '', team_leader_id: '' })
      loadAgents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to deactivate this agent?')) return
    try {
      await api.deleteAgent(id)
      loadAgents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent')
    }
  }

  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    return account ? account.name : accountId
  }

  const getTeamLeaderName = (teamLeaderId: string) => {
    const leader = teamLeaders.find(tl => tl.id === teamLeaderId)
    return leader ? leader.name : teamLeaderId
  }

  const availableTeamLeaders = formData.account_id
    ? teamLeaders.filter(tl => tl.account_id === formData.account_id)
    : []

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-500">Manage individual team members who are being reported on</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Agent
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Account</label>
            <select
              value={selectedAccount}
              onChange={(e) => {
                setSelectedAccount(e.target.value)
                setSelectedTeamLeader('') // Reset team leader filter when account changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Accounts</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Team Leader</label>
            <select
              value={selectedTeamLeader}
              onChange={(e) => setSelectedTeamLeader(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Team Leaders</option>
              {teamLeaders
                .filter(tl => !selectedAccount || tl.account_id === selectedAccount)
                .map(leader => (
                  <option key={leader.id} value={leader.id}>{leader.name}</option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">New Agent</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="jane@company.com (optional)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
              <input
                type="text"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="EMP123 (optional)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account *</label>
              <select
                required
                value={formData.account_id}
                onChange={(e) => setFormData({ ...formData, account_id: e.target.value, team_leader_id: '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Account</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Leader *</label>
              <select
                required
                value={formData.team_leader_id}
                onChange={(e) => setFormData({ ...formData, team_leader_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!formData.account_id}
              >
                <option value="">{formData.account_id ? 'Select Team Leader' : 'Select Account First'}</option>
                {availableTeamLeaders.map(leader => (
                  <option key={leader.id} value={leader.id}>{leader.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 flex gap-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Agent
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Team Leader</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{agent.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{agent.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{agent.employee_id || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{getTeamLeaderName(agent.team_leader_id)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{getAccountName(agent.account_id)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      agent.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(agent.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {agents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No agents yet. Click "Add Agent" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
