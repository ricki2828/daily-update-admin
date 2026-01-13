import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import api from '../lib/api'
import type { TeamLeader, TeamLeaderCreate, Account } from '../types'

export default function TeamLeaders() {
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [formData, setFormData] = useState<TeamLeaderCreate>({
    name: '',
    email: '',
    account_ids: [],
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      loadTeamLeaders(selectedAccount)
    } else {
      loadTeamLeaders()
    }
  }, [selectedAccount])

  async function loadData() {
    try {
      setLoading(true)
      const [accountsData] = await Promise.all([
        api.getAccounts(false),
      ])
      setAccounts(accountsData.items)
      await loadTeamLeaders()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  async function loadTeamLeaders(accountId?: string) {
    try {
      const data = await api.getTeamLeaders(accountId)
      setTeamLeaders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team leaders')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (formData.account_ids.length === 0) {
      setError('Please select at least one account')
      return
    }
    try {
      await api.createTeamLeader(formData)
      setShowForm(false)
      setFormData({ name: '', email: '', account_ids: [] })
      loadTeamLeaders(selectedAccount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team leader')
    }
  }

  const toggleAccount = (accountId: string) => {
    setFormData(prev => ({
      ...prev,
      account_ids: prev.account_ids.includes(accountId)
        ? prev.account_ids.filter(id => id !== accountId)
        : [...prev.account_ids, accountId]
    }))
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this team leader?')) return
    try {
      await api.deleteTeamLeader(id)
      loadTeamLeaders(selectedAccount)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team leader')
    }
  }

  const getAccountNames = (accountIds: string[]) => {
    return accountIds.map(id => {
      const account = accounts.find(a => a.id === id)
      return account ? account.name : id
    }).join(', ')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Leaders</h1>
          <p className="text-gray-500">Manage team leaders who submit daily updates</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Team Leader
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>}

      {/* Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Account</label>
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Accounts</option>
          {accounts.map(account => (
            <option key={account.id} value={account.id}>{account.name}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">New Team Leader</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="john@company.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accounts <span className="text-red-600">*</span>
              </label>
              <div className="border border-gray-300 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {accounts.map(account => (
                  <label key={account.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData.account_ids.includes(account.id)}
                      onChange={() => toggleAccount(account.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{account.name} ({account.code})</span>
                  </label>
                ))}
                {accounts.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-2">No accounts available</p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Select at least one account</p>
            </div>
            <div className="flex gap-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Team Leader
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
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Teams Linked</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {teamLeaders.map((leader) => (
                <tr key={leader.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{leader.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{leader.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{getAccountNames(leader.account_ids)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      leader.teams_user_id ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {leader.teams_user_id ? 'Linked' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      leader.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {leader.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(leader.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {teamLeaders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No team leaders yet. Click "Add Team Leader" to create one.
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
