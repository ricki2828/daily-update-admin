import { useEffect, useState } from 'react'
import { Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../lib/api'
import type { Account, TeamLeader, Agent, MetricDefinition, AgentMetricSubmission, MetricValueSubmit } from '../types'

interface MetricInput {
  metricDefId: string
  value: string
}

export default function SubmitUpdate() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [metricDefs, setMetricDefs] = useState<MetricDefinition[]>([])

  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<string>('')
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  const [agentMetrics, setAgentMetrics] = useState<Map<string, MetricInput[]>>(new Map())

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load accounts on mount
  useEffect(() => {
    loadAccounts()
  }, [])

  // Load team leaders when account changes
  useEffect(() => {
    if (selectedAccount) {
      loadTeamLeaders(selectedAccount)
      loadMetrics(selectedAccount)
    }
  }, [selectedAccount])

  // Load agents when team leader changes
  useEffect(() => {
    if (selectedAccount && selectedTeamLeader) {
      loadAgents(selectedAccount, selectedTeamLeader)
    }
  }, [selectedAccount, selectedTeamLeader])

  async function loadAccounts() {
    try {
      const { items } = await api.getAccounts(true)
      setAccounts(items)
      if (items.length === 1) {
        setSelectedAccount(items[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts')
    }
  }

  async function loadTeamLeaders(accountId: string) {
    try {
      const tls = await api.getTeamLeaders(accountId)
      setTeamLeaders(tls)
      if (tls.length === 1) {
        setSelectedTeamLeader(tls[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team leaders')
    }
  }

  async function loadAgents(accountId: string, teamLeaderId: string) {
    try {
      setLoading(true)
      const agentList = await api.getAgents(accountId, teamLeaderId)
      setAgents(agentList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }

  async function loadMetrics(accountId: string) {
    try {
      const metrics = await api.getMetrics(accountId)
      setMetricDefs(metrics.sort((a, b) => a.display_order - b.display_order))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
    }
  }

  function toggleAgent(agentId: string) {
    const newSelected = new Set(selectedAgents)
    if (newSelected.has(agentId)) {
      newSelected.delete(agentId)
      // Remove metrics for this agent
      const newMetrics = new Map(agentMetrics)
      newMetrics.delete(agentId)
      setAgentMetrics(newMetrics)
    } else {
      newSelected.add(agentId)
      // Initialize metrics for this agent
      const newMetrics = new Map(agentMetrics)
      newMetrics.set(agentId, metricDefs.map(m => ({ metricDefId: m.id, value: '' })))
      setAgentMetrics(newMetrics)
    }
    setSelectedAgents(newSelected)
  }

  function updateMetric(agentId: string, metricDefId: string, value: string) {
    const newMetrics = new Map(agentMetrics)
    const agentMetricList = newMetrics.get(agentId) || []
    const metricIndex = agentMetricList.findIndex(m => m.metricDefId === metricDefId)

    if (metricIndex >= 0) {
      agentMetricList[metricIndex].value = value
    } else {
      agentMetricList.push({ metricDefId, value })
    }

    newMetrics.set(agentId, agentMetricList)
    setAgentMetrics(newMetrics)
  }

  function getMetricValue(agentId: string, metricDefId: string): string {
    const agentMetricList = agentMetrics.get(agentId) || []
    const metric = agentMetricList.find(m => m.metricDefId === metricDefId)
    return metric?.value || ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedAccount || !selectedTeamLeader || selectedAgents.size === 0) {
      setError('Please select account, team leader, and at least one agent')
      return
    }

    // Validate all required metrics are filled
    for (const agentId of selectedAgents) {
      const agentMetricList = agentMetrics.get(agentId) || []
      for (const metricDef of metricDefs) {
        if (metricDef.is_required) {
          const metric = agentMetricList.find(m => m.metricDefId === metricDef.id)
          if (!metric || !metric.value.trim()) {
            setError(`Missing required metric "${metricDef.name}" for ${agents.find(a => a.id === agentId)?.name}`)
            return
          }
        }
      }
    }

    try {
      setSubmitting(true)
      setError(null)

      // Build agent submissions
      const agent_submissions: AgentMetricSubmission[] = Array.from(selectedAgents).map(agentId => {
        const agentMetricList = agentMetrics.get(agentId) || []
        const metrics: MetricValueSubmit[] = agentMetricList
          .filter(m => m.value.trim() !== '')
          .map(m => {
            const metricDef = metricDefs.find(def => def.id === m.metricDefId)!
            let value: number | string = m.value

            // Convert to number for numeric types
            if (metricDef.data_type !== 'text') {
              value = parseFloat(m.value)
              if (isNaN(value)) {
                throw new Error(`Invalid number for metric "${metricDef.name}"`)
              }
            }

            return {
              metric_definition_id: m.metricDefId,
              value,
            }
          })

        return { agent_id: agentId, metrics }
      })

      await api.submitUpdate({
        team_leader_id: selectedTeamLeader,
        account_id: selectedAccount,
        date,
        agent_submissions,
        notes: notes.trim() || undefined,
      })

      setSuccess(true)
      setTimeout(() => {
        // Reset form
        setSelectedAgents(new Set())
        setAgentMetrics(new Map())
        setNotes('')
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit update')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedAccountObj = accounts.find(a => a.id === selectedAccount)

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Submit Daily Update</h1>
        <p className="text-sm text-gray-500 mt-1">Submit metrics for multiple agents</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">Success</p>
            <p className="text-sm text-green-700 mt-1">Update submitted successfully!</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account & Team Leader Selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Selection</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account</label>
              <select
                value={selectedAccount}
                onChange={(e) => {
                  setSelectedAccount(e.target.value)
                  setSelectedTeamLeader('')
                  setSelectedAgents(new Set())
                  setAgentMetrics(new Map())
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Account</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team Leader</label>
              <select
                value={selectedTeamLeader}
                onChange={(e) => {
                  setSelectedTeamLeader(e.target.value)
                  setSelectedAgents(new Set())
                  setAgentMetrics(new Map())
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!selectedAccount}
                required
              >
                <option value="">Select Team Leader</option>
                {teamLeaders.map(tl => (
                  <option key={tl.id} value={tl.id}>{tl.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        {/* Agent Selection */}
        {selectedTeamLeader && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Select Agents ({selectedAgents.size} selected)
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : agents.length === 0 ? (
              <p className="text-sm text-gray-500">No agents found for this team leader</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {agents.map(agent => (
                  <label
                    key={agent.id}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedAgents.has(agent.id)
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAgents.has(agent.id)}
                      onChange={() => toggleAgent(agent.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900">{agent.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Metrics Entry */}
        {selectedAgents.size > 0 && metricDefs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Enter Metrics</h2>

            <div className="space-y-6">
              {Array.from(selectedAgents).map(agentId => {
                const agent = agents.find(a => a.id === agentId)
                if (!agent) return null

                return (
                  <div key={agentId} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">{agent.name}</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {metricDefs.map(metricDef => (
                        <div key={metricDef.id}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {metricDef.emoji && <span className="mr-1">{metricDef.emoji}</span>}
                            {metricDef.name}
                            {metricDef.is_required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <input
                            type={metricDef.data_type === 'text' ? 'text' : 'number'}
                            step={metricDef.data_type === 'decimal' ? '0.01' : '1'}
                            value={getMetricValue(agentId, metricDef.id)}
                            onChange={(e) => updateMetric(agentId, metricDef.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={metricDef.data_type === 'percentage' ? '0-100' : ''}
                            required={metricDef.is_required}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Notes */}
        {selectedAgents.size > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any additional notes or context..."
            />
            <p className="text-xs text-gray-500 mt-1">{notes.length}/2000 characters</p>
          </div>
        )}

        {/* Submit */}
        {selectedAgents.size > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Submitting for <strong>{selectedAgents.size} agent{selectedAgents.size > 1 ? 's' : ''}</strong>
              {' '}on <strong>{selectedAccountObj?.name}</strong>
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Update
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
