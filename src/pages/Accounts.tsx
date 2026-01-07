import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import api from '../lib/api'
import type { Account, AccountCreate } from '../types'

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<AccountCreate>({
    name: '',
    code: '',
    prompt_time: '09:00',
    deadline_time: '17:00',
    reminder_interval_minutes: 60,
    max_reminders: 3,
    timezone: 'Australia/Sydney',
  })

  useEffect(() => {
    loadAccounts()
  }, [])

  async function loadAccounts() {
    try {
      setLoading(true)
      const data = await api.getAccounts(false)
      setAccounts(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api.createAccount(formData)
      setShowForm(false)
      setFormData({ name: '', code: '', prompt_time: '09:00', deadline_time: '17:00', reminder_interval_minutes: 60, max_reminders: 3, timezone: 'Australia/Sydney' })
      loadAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this account?')) return
    try {
      await api.deleteAccount(id)
      loadAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account')
    }
  }

  async function handleCreateMetrics(id: string) {
    try {
      await api.createDefaultMetrics(id)
      alert('Default metrics created!')
      loadAccounts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create metrics')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-500">Manage client accounts</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Account
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>}

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">New Account</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Client Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="ABC"
                maxLength={10}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prompt Time</label>
              <input
                type="time"
                value={formData.prompt_time}
                onChange={(e) => setFormData({ ...formData, prompt_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Time when daily prompts are sent ({formData.timezone})</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline Time</label>
              <input
                type="time"
                value={formData.deadline_time}
                onChange={(e) => setFormData({ ...formData, deadline_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Time when submissions are due ({formData.timezone})</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Australia/Sydney">Australia/Sydney (AEDT)</option>
                <option value="Australia/Melbourne">Australia/Melbourne (AEDT)</option>
                <option value="Australia/Brisbane">Australia/Brisbane (AEST)</option>
                <option value="Australia/Perth">Australia/Perth (AWST)</option>
                <option value="Pacific/Auckland">Pacific/Auckland (NZDT)</option>
                <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                <option value="Asia/Hong_Kong">Asia/Hong Kong (HKT)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="America/New_York">America/New York (EST/EDT)</option>
                <option value="America/Los_Angeles">America/Los Angeles (PST/PDT)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">All times are in this timezone</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Interval (minutes)</label>
              <input
                type="number"
                value={formData.reminder_interval_minutes}
                onChange={(e) => setFormData({ ...formData, reminder_interval_minutes: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min={15}
                max={240}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Reminders</label>
              <input
                type="number"
                value={formData.max_reminders}
                onChange={(e) => setFormData({ ...formData, max_reminders: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min={0}
                max={10}
              />
            </div>
            <div className="md:col-span-2 flex gap-4">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Account
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
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Team Leaders</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Metrics</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{account.name}</p>
                      <p className="text-sm text-gray-500">{account.code}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {account.prompt_time} - {account.deadline_time}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{account.team_leader_count}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{account.metric_count}</span>
                    {account.metric_count === 0 && (
                      <button
                        onClick={() => handleCreateMetrics(account.id)}
                        className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                      >
                        + Add defaults
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      account.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {account.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No accounts yet. Click "Add Account" to create one.
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
