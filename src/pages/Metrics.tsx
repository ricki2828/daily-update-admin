import { useEffect, useState, useRef } from 'react'
import { Plus, Edit2, Trash2, Save, X, Smile } from 'lucide-react'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'
import api from '../lib/api'
import type { Account, MetricDefinition } from '../types'

export default function Metrics() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [metrics, setMetrics] = useState<MetricDefinition[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    data_type: 'integer' as 'integer' | 'decimal' | 'percentage' | 'text' | 'duration',
    emoji: '',
    display_order: 10,
    is_required: true,
    show_trend: true,
  })
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccountId) {
      loadMetrics()
    }
  }, [selectedAccountId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  async function loadAccounts() {
    try {
      const data = await api.getAccounts(true)
      setAccounts(data.items)
      if (data.items.length > 0 && !selectedAccountId) {
        setSelectedAccountId(data.items[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts')
    }
  }

  async function loadMetrics() {
    if (!selectedAccountId) return
    try {
      setLoading(true)
      const data = await api.getMetrics(selectedAccountId)
      setMetrics(data.sort((a, b) => a.display_order - b.display_order))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedAccountId) return

    try {
      if (editingId) {
        await api.updateMetric(editingId, formData)
      } else {
        await api.createMetric({
          account_id: selectedAccountId,
          ...formData,
        })
      }
      setShowForm(false)
      setEditingId(null)
      resetForm()
      loadMetrics()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save metric')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this metric?')) return
    try {
      await api.deleteMetric(id)
      loadMetrics()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete metric')
    }
  }

  async function handleCreateDefaults() {
    if (!selectedAccountId) return
    try {
      await api.createDefaultMetrics(selectedAccountId)
      loadMetrics()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create default metrics')
    }
  }

  function handleEdit(metric: MetricDefinition) {
    setEditingId(metric.id)
    setFormData({
      name: metric.name,
      key: metric.key,
      data_type: metric.data_type,
      emoji: metric.emoji || '',
      display_order: metric.display_order,
      is_required: metric.is_required,
      show_trend: metric.show_trend,
    })
    setShowForm(true)
  }

  function resetForm() {
    setFormData({
      name: '',
      key: '',
      data_type: 'integer',
      emoji: '',
      display_order: 10,
      is_required: true,
      show_trend: true,
    })
  }

  function handleCancel() {
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

  function handleEmojiClick(emojiData: EmojiClickData) {
    setFormData({ ...formData, emoji: emojiData.emoji })
    setShowEmojiPicker(false)
  }

  const selectedAccount = accounts.find(a => a.id === selectedAccountId)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Metrics Configuration</h1>
          <p className="text-gray-500">Customize metrics for each account</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Account selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Account</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose an account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.code})
                </option>
              ))}
            </select>
          </div>
          {selectedAccountId && metrics.length === 0 && (
            <button
              onClick={handleCreateDefaults}
              className="mt-7 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Create Default Metrics
            </button>
          )}
          {selectedAccountId && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-7 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Custom Metric
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && selectedAccountId && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Metric' : 'New Custom Metric'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Customer Satisfaction"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Key <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., csat"
                disabled={!!editingId}
              />
              <p className="text-xs text-gray-500 mt-1">Lowercase, underscores only. Cannot be changed after creation.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.data_type}
                onChange={(e) => setFormData({ ...formData, data_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!!editingId}
              >
                <option value="integer">Integer (whole numbers)</option>
                <option value="decimal">Decimal (with decimals)</option>
                <option value="percentage">Percentage (%)</option>
                <option value="text">Text (free-form)</option>
                <option value="duration">Duration (HH:MM:SS)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Cannot be changed after creation.</p>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors w-full"
                >
                  {formData.emoji ? (
                    <span className="text-2xl">{formData.emoji}</span>
                  ) : (
                    <>
                      <Smile className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-500">Choose emoji</span>
                    </>
                  )}
                </button>
                {formData.emoji && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, emoji: '' })}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Single emoji for display</p>
              {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute z-50 mt-2">
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min={1}
                max={100}
              />
              <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_required}
                  onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Required field</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.show_trend}
                  onChange={(e) => setFormData({ ...formData, show_trend: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show trend</span>
              </label>
            </div>
            <div className="md:col-span-2 flex gap-4">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Update Metric' : 'Create Metric'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Metrics table */}
      {selectedAccountId && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">
              Metrics for {selectedAccount?.name}
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({metrics.length} metric{metrics.length !== 1 ? 's' : ''})
              </span>
            </h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : metrics.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <p className="mb-4">No metrics configured for this account yet.</p>
              <button
                onClick={handleCreateDefaults}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Create Default Metrics (Dials, Sales, Conversion, Quality, Attendance)
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Options</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {metrics.map((metric) => (
                  <tr key={metric.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{metric.display_order}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {metric.emoji && <span className="text-lg">{metric.emoji}</span>}
                        <span className="font-medium text-gray-900">{metric.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {metric.key}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                        {metric.data_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex gap-2">
                        {metric.is_required && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Required</span>
                        )}
                        {metric.show_trend && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Trend</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEdit(metric)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(metric.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
