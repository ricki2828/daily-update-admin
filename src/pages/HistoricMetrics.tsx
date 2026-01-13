import { useState, useEffect, useMemo, useRef, useCallback, forwardRef } from 'react'
import { Calendar, Building2, Users, Save, X, History, AlertCircle, Check, Loader2, Undo2, Info } from 'lucide-react'
import api from '../lib/api'
import type { Account, TeamLeader, HistoricDataResponse, HistoricMetricEntry, BulkUpdateEntry, AuditLogEntry } from '../types'

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Get yesterday's date as default
function getYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return formatDate(d)
}

// Types for edit history (undo/redo)
type EditAction = {
  metricId: string
  oldValue: { value_numeric?: number; value_text?: string } | undefined
  newValue: { value_numeric?: number; value_text?: string } | undefined
}

// Cell position for keyboard navigation
type CellPosition = {
  agentIndex: number
  metricIndex: number
}

// Editable cell component with keyboard navigation
const EditableCell = forwardRef<HTMLInputElement, {
  value: number | string | undefined
  originalValue: number | string | undefined
  dataType: 'integer' | 'decimal' | 'percentage' | 'text' | 'duration'
  isEdited: boolean
  justSaved: boolean
  onChange: (value: number | string | undefined) => void
  onKeyNav: (direction: 'up' | 'down' | 'left' | 'right' | 'next' | 'prev') => void
}>(function EditableCell({
  value,
  originalValue,
  dataType,
  isEdited,
  justSaved,
  onChange,
  onKeyNav,
}, ref) {
  const [localValue, setLocalValue] = useState<string>(
    value !== undefined ? String(value) : ''
  )
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    setLocalValue(value !== undefined ? String(value) : '')
  }, [value])

  const commitValue = useCallback(() => {
    if (dataType === 'text' || dataType === 'duration') {
      onChange(localValue || undefined)
    } else {
      const num = parseFloat(localValue)
      onChange(isNaN(num) ? undefined : num)
    }
  }, [dataType, localValue, onChange])

  const handleBlur = () => {
    setIsFocused(false)
    commitValue()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    switch (e.key) {
      case 'Tab':
        e.preventDefault()
        commitValue()
        onKeyNav(e.shiftKey ? 'prev' : 'next')
        break
      case 'Enter':
        e.preventDefault()
        commitValue()
        onKeyNav('down')
        break
      case 'Escape':
        // Revert to original value
        setLocalValue(value !== undefined ? String(value) : '')
        input.blur()
        break
      case 'ArrowUp':
        if (!e.shiftKey) {
          e.preventDefault()
          commitValue()
          onKeyNav('up')
        }
        break
      case 'ArrowDown':
        if (!e.shiftKey) {
          e.preventDefault()
          commitValue()
          onKeyNav('down')
        }
        break
      case 'ArrowLeft':
        // Only navigate if cursor is at start
        if (input.selectionStart === 0 && input.selectionEnd === 0) {
          e.preventDefault()
          commitValue()
          onKeyNav('left')
        }
        break
      case 'ArrowRight':
        // Only navigate if cursor is at end
        if (input.selectionStart === localValue.length) {
          e.preventDefault()
          commitValue()
          onKeyNav('right')
        }
        break
    }
  }

  const inputType = dataType === 'text' || dataType === 'duration' ? 'text' : 'number'
  const step = dataType === 'decimal' || dataType === 'percentage' ? '0.01' : '1'

  // Determine cell style based on state
  let cellStyle = 'border-gray-300 bg-white'
  if (justSaved) {
    cellStyle = 'border-green-400 bg-green-50 animate-pulse'
  } else if (isEdited) {
    cellStyle = 'border-yellow-400 bg-yellow-50'
  } else if (isFocused) {
    cellStyle = 'border-blue-400 bg-blue-50'
  }

  // Format original value for tooltip
  const originalDisplay = originalValue !== undefined ? String(originalValue) : 'empty'
  const showTooltip = isEdited && originalValue !== value

  return (
    <div className="relative group">
      <input
        ref={ref}
        type={inputType}
        step={step}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onFocus={() => setIsFocused(true)}
        onKeyDown={handleKeyDown}
        className={`w-full px-2 py-1.5 text-sm border-2 rounded-md transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${cellStyle}`}
      />
      {/* Tooltip showing original value */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1
          bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100
          transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
          <div className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            Original: {originalDisplay}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-800" />
          </div>
        </div>
      )}
    </div>
  )
})

// Audit log modal component
function AuditLogModal({
  entries,
  onClose,
}: {
  entries: AuditLogEntry[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="w-5 h-5" />
            Audit Log
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {entries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No changes recorded for this date.</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {entry.action === 'update' ? 'Single Update' : 'Bulk Update'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                  {entry.details && (
                    <div className="text-sm text-gray-600">
                      {entry.action === 'update' && entry.details.metric_name && (
                        <p>
                          <strong>{entry.details.agent_name}</strong> - {entry.details.metric_name}:{' '}
                          <span className="text-red-600 line-through">
                            {entry.details.old_value?.value_numeric ?? entry.details.old_value?.value_text ?? 'empty'}
                          </span>
                          {' → '}
                          <span className="text-green-600">
                            {entry.details.new_value?.value_numeric ?? entry.details.new_value?.value_text ?? 'empty'}
                          </span>
                        </p>
                      )}
                      {entry.action === 'bulk_update' && entry.details.changes && (
                        <div className="space-y-1">
                          <p className="font-medium">{entry.details.update_count} changes:</p>
                          {entry.details.changes.slice(0, 10).map((change: {
                            id: string
                            agent_name?: string
                            metric_name: string
                            old_value: { value_numeric?: number; value_text?: string }
                            new_value: { value_numeric?: number; value_text?: string }
                          }, i: number) => (
                            <p key={i} className="ml-2">
                              {change.agent_name} - {change.metric_name}:{' '}
                              <span className="text-red-600 line-through">
                                {change.old_value?.value_numeric ?? change.old_value?.value_text ?? 'empty'}
                              </span>
                              {' → '}
                              <span className="text-green-600">
                                {change.new_value?.value_numeric ?? change.new_value?.value_text ?? 'empty'}
                              </span>
                            </p>
                          ))}
                          {entry.details.changes.length > 10 && (
                            <p className="text-gray-500 ml-2">...and {entry.details.changes.length - 10} more</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Keyboard shortcuts help modal
function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-xl">⌨️</span> Keyboard Shortcuts
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-600">Move to next cell</span>
            <kbd className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">Tab</kbd>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-600">Move to previous cell</span>
            <kbd className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">Shift+Tab</kbd>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-600">Move down / Save cell</span>
            <kbd className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">Enter</kbd>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-600">Cancel edit</span>
            <kbd className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">Escape</kbd>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-600">Navigate cells</span>
            <kbd className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">↑ ↓ ← →</kbd>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span className="text-gray-600">Undo last edit</span>
            <kbd className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">Ctrl+Z</kbd>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Save all changes</span>
            <kbd className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">Ctrl+S</kbd>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

export default function HistoricMetrics() {
  // Filter state
  const [accounts, setAccounts] = useState<Account[]>([])
  const [teamLeaders, setTeamLeaders] = useState<TeamLeader[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedDate, setSelectedDate] = useState(getYesterday())
  const [selectedTeamLeaderId, setSelectedTeamLeaderId] = useState('')

  // Data state
  const [historicData, setHistoricData] = useState<HistoricDataResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit state - map of metric value ID to pending update
  const [editedValues, setEditedValues] = useState<Map<string, { value_numeric?: number; value_text?: string }>>(new Map())
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [justSavedIds, setJustSavedIds] = useState<Set<string>>(new Set())

  // Undo history stack
  const [undoStack, setUndoStack] = useState<EditAction[]>([])

  // Cell refs for keyboard navigation
  const cellRefs = useRef<Map<string, HTMLInputElement | null>>(new Map())
  const [_focusedCell, setFocusedCell] = useState<CellPosition | null>(null)

  // Modals
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([])
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

  // Load accounts on mount
  useEffect(() => {
    api.getAccounts().then((res) => {
      setAccounts(res.items)
      if (res.items.length > 0) {
        setSelectedAccountId(res.items[0].id)
      }
    })
  }, [])

  // Load team leaders when account changes
  useEffect(() => {
    if (selectedAccountId) {
      api.getTeamLeaders(selectedAccountId).then(setTeamLeaders)
    } else {
      setTeamLeaders([])
    }
    setSelectedTeamLeaderId('')
  }, [selectedAccountId])

  // Load historic data when filters change
  useEffect(() => {
    if (!selectedAccountId || !selectedDate) return

    setLoading(true)
    setError(null)
    setEditedValues(new Map())
    setSaveSuccess(false)
    setUndoStack([])
    setJustSavedIds(new Set())

    api
      .getHistoricMetrics(selectedAccountId, selectedDate, selectedTeamLeaderId || undefined)
      .then(setHistoricData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [selectedAccountId, selectedDate, selectedTeamLeaderId])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      // Ctrl+S for save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (editedValues.size > 0 && !saving) {
          handleSave()
        }
      }
      // ? for keyboard help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          setShowKeyboardHelp(true)
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [editedValues, saving, undoStack])

  // Transform data for table display
  const tableData = useMemo(() => {
    if (historicData.length === 0) return { agents: [], metricDefs: [], valueMap: new Map(), originalValueMap: new Map() }

    const metricDefs = historicData[0]?.metric_definitions || []
    const agentMap = new Map<string, { id: string; name: string; email?: string }>()
    const valueMap = new Map<string, HistoricMetricEntry>()
    const originalValueMap = new Map<string, number | string | undefined>()

    for (const response of historicData) {
      for (const metric of response.metrics) {
        if (!agentMap.has(metric.agent_id)) {
          agentMap.set(metric.agent_id, {
            id: metric.agent_id,
            name: metric.agent_name,
            email: metric.agent_email,
          })
        }
        const key = `${metric.agent_id}_${metric.metric_key}`
        valueMap.set(key, metric)
        // Store original value for tooltip
        const originalVal = metric.data_type === 'text' || metric.data_type === 'duration'
          ? metric.value_text
          : metric.value_numeric
        originalValueMap.set(metric.id, originalVal)
      }
    }

    const agents = Array.from(agentMap.values()).sort((a, b) => a.name.localeCompare(b.name))

    return { agents, metricDefs, valueMap, originalValueMap }
  }, [historicData])

  // Calculate live aggregates (includes pending edits)
  const aggregates = useMemo(() => {
    const totals: Record<string, number> = {}
    const counts: Record<string, number> = {}

    for (const metricDef of tableData.metricDefs) {
      if (metricDef.data_type === 'text' || metricDef.data_type === 'duration') continue

      let total = 0
      let count = 0
      for (const agent of tableData.agents) {
        const key = `${agent.id}_${metricDef.key}`
        const entry = tableData.valueMap.get(key)

        if (entry && editedValues.has(entry.id)) {
          const edited = editedValues.get(entry.id)
          if (edited?.value_numeric !== undefined) {
            total += edited.value_numeric
            count++
          }
        } else if (entry?.value_numeric !== undefined) {
          total += entry.value_numeric
          count++
        }
      }
      totals[metricDef.key] = total
      counts[metricDef.key] = count
    }

    // For percentages, show average instead of sum
    for (const metricDef of tableData.metricDefs) {
      if (metricDef.data_type === 'percentage' && counts[metricDef.key] > 0) {
        totals[metricDef.key] = totals[metricDef.key] / counts[metricDef.key]
      }
    }

    return totals
  }, [tableData, editedValues])

  // Handle cell edit with undo support
  const handleEdit = useCallback((metricEntry: HistoricMetricEntry, newValue: number | string | undefined) => {
    const isNumeric = metricEntry.data_type !== 'text' && metricEntry.data_type !== 'duration'
    const update = isNumeric
      ? { value_numeric: newValue as number | undefined }
      : { value_text: newValue as string | undefined }

    const originalValue = isNumeric ? metricEntry.value_numeric : metricEntry.value_text
    const previousEdit = editedValues.get(metricEntry.id)

    // Record action for undo
    const action: EditAction = {
      metricId: metricEntry.id,
      oldValue: previousEdit ?? (originalValue !== undefined
        ? (isNumeric ? { value_numeric: originalValue as number } : { value_text: originalValue as string })
        : undefined),
      newValue: newValue !== originalValue ? update : undefined,
    }

    if (newValue === originalValue) {
      // Revert to original - remove from edited
      const newEdited = new Map(editedValues)
      newEdited.delete(metricEntry.id)
      setEditedValues(newEdited)
    } else {
      setEditedValues(new Map(editedValues).set(metricEntry.id, update))
    }

    // Add to undo stack
    setUndoStack(prev => [...prev, action])
  }, [editedValues])

  // Undo last edit
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return

    const lastAction = undoStack[undoStack.length - 1]
    const newUndoStack = undoStack.slice(0, -1)
    setUndoStack(newUndoStack)

    const newEdited = new Map(editedValues)
    if (lastAction.oldValue === undefined) {
      newEdited.delete(lastAction.metricId)
    } else {
      newEdited.set(lastAction.metricId, lastAction.oldValue)
    }
    setEditedValues(newEdited)
  }, [undoStack, editedValues])

  // Keyboard navigation
  const handleKeyNav = useCallback((
    agentIndex: number,
    metricIndex: number,
    direction: 'up' | 'down' | 'left' | 'right' | 'next' | 'prev'
  ) => {
    let newAgentIndex = agentIndex
    let newMetricIndex = metricIndex
    const numAgents = tableData.agents.length
    const numMetrics = tableData.metricDefs.length

    switch (direction) {
      case 'up':
        newAgentIndex = Math.max(0, agentIndex - 1)
        break
      case 'down':
        newAgentIndex = Math.min(numAgents - 1, agentIndex + 1)
        break
      case 'left':
      case 'prev':
        if (metricIndex > 0) {
          newMetricIndex = metricIndex - 1
        } else if (agentIndex > 0) {
          newAgentIndex = agentIndex - 1
          newMetricIndex = numMetrics - 1
        }
        break
      case 'right':
      case 'next':
        if (metricIndex < numMetrics - 1) {
          newMetricIndex = metricIndex + 1
        } else if (agentIndex < numAgents - 1) {
          newAgentIndex = agentIndex + 1
          newMetricIndex = 0
        }
        break
    }

    const cellKey = `${newAgentIndex}_${newMetricIndex}`
    const ref = cellRefs.current.get(cellKey)
    if (ref) {
      ref.focus()
      ref.select()
      setFocusedCell({ agentIndex: newAgentIndex, metricIndex: newMetricIndex })
    }
  }, [tableData.agents.length, tableData.metricDefs.length])

  // Save all changes
  const handleSave = async () => {
    if (editedValues.size === 0) return

    setSaving(true)
    setSaveSuccess(false)
    setError(null)

    const savedIds = new Set(editedValues.keys())

    try {
      const updates: BulkUpdateEntry[] = Array.from(editedValues.entries()).map(([id, update]) => ({
        id,
        ...update,
      }))

      await api.bulkUpdateMetricValues(updates)
      setSaveSuccess(true)
      setEditedValues(new Map())
      setUndoStack([])

      // Show green flash on saved cells
      setJustSavedIds(savedIds)
      setTimeout(() => setJustSavedIds(new Set()), 2000)

      // Refresh data
      const fresh = await api.getHistoricMetrics(
        selectedAccountId,
        selectedDate,
        selectedTeamLeaderId || undefined
      )
      setHistoricData(fresh)

      // Auto-hide success after 3s
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // Load and show audit log
  const handleShowAuditLog = async () => {
    if (!selectedAccountId || !selectedDate) return

    setLoadingAudit(true)
    try {
      const entries = await api.getDateAuditLog(selectedDate, selectedAccountId)
      setAuditEntries(entries)
      setShowAuditLog(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log')
    } finally {
      setLoadingAudit(false)
    }
  }

  // Cancel edits
  const handleCancel = () => {
    setEditedValues(new Map())
    setUndoStack([])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Historic Metrics</h1>
          <p className="text-gray-500 mt-1">
            View and edit metric values for any date. All changes are logged.
          </p>
        </div>
        <button
          onClick={() => setShowKeyboardHelp(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900
            hover:bg-gray-100 rounded-lg transition-colors"
          title="Keyboard shortcuts"
        >
          <span className="text-base">⌨️</span>
          <span className="hidden sm:inline">Shortcuts</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Account selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Building2 className="w-4 h-4" />
              Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select account...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.code})
                </option>
              ))}
            </select>
          </div>

          {/* Date picker */}
          <div className="flex-1 min-w-[200px]">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4" />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={formatDate(new Date())}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Team Leader filter (optional) */}
          <div className="flex-1 min-w-[200px]">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
              <Users className="w-4 h-4" />
              Team Leader (optional)
            </label>
            <select
              value={selectedTeamLeaderId}
              onChange={(e) => setSelectedTeamLeaderId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedAccountId}
            >
              <option value="">All team leaders</option>
              {teamLeaders.map((tl) => (
                <option key={tl.id} value={tl.id}>
                  {tl.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700 animate-pulse">
          <Check className="w-5 h-5 flex-shrink-0" />
          Changes saved successfully!
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-500 mt-2">Loading metrics...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && historicData.length === 0 && selectedAccountId && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <AlertCircle className="w-8 h-8 mx-auto text-gray-400" />
          <p className="text-gray-500 mt-2">No submissions found for this date.</p>
          <p className="text-gray-400 text-sm">Try selecting a different date or team leader.</p>
        </div>
      )}

      {/* Editable table */}
      {!loading && tableData.agents.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10">
                    Agent
                  </th>
                  {tableData.metricDefs.map((m) => (
                    <th key={m.key} className="text-center px-4 py-3 text-sm font-semibold text-gray-900 min-w-[120px]">
                      <span className="flex items-center justify-center gap-1">
                        {m.emoji && <span>{m.emoji}</span>}
                        {m.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableData.agents.map((agent, agentIndex) => (
                  <tr key={agent.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                      <div>
                        {agent.name}
                        {agent.email && (
                          <div className="text-xs text-gray-500">{agent.email}</div>
                        )}
                      </div>
                    </td>
                    {tableData.metricDefs.map((m, metricIndex) => {
                      const key = `${agent.id}_${m.key}`
                      const entry = tableData.valueMap.get(key)
                      const cellKey = `${agentIndex}_${metricIndex}`

                      if (!entry) {
                        return (
                          <td key={m.key} className="px-4 py-3 text-center text-gray-400 text-sm">
                            —
                          </td>
                        )
                      }

                      const isEdited = editedValues.has(entry.id)
                      const justSaved = justSavedIds.has(entry.id)
                      const currentValue = isEdited
                        ? editedValues.get(entry.id)?.value_numeric ?? editedValues.get(entry.id)?.value_text
                        : m.data_type === 'text' || m.data_type === 'duration'
                        ? entry.value_text
                        : entry.value_numeric

                      const originalValue = tableData.originalValueMap.get(entry.id)

                      return (
                        <td key={m.key} className="px-2 py-2">
                          <EditableCell
                            ref={(el) => {
                              if (el) {
                                cellRefs.current.set(cellKey, el)
                              } else {
                                cellRefs.current.delete(cellKey)
                              }
                            }}
                            value={currentValue}
                            originalValue={originalValue}
                            dataType={m.data_type}
                            isEdited={isEdited}
                            justSaved={justSaved}
                            onChange={(v) => handleEdit(entry, v)}
                            onKeyNav={(dir) => handleKeyNav(agentIndex, metricIndex, dir)}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}

                {/* Aggregates row */}
                <tr className="bg-gradient-to-r from-gray-100 to-gray-50 font-semibold border-t-2 border-gray-200">
                  <td className="px-4 py-3 text-sm text-gray-900 sticky left-0 bg-gray-100 z-10">
                    <span className="flex items-center gap-2">
                      <span className="text-lg">Σ</span>
                      TOTALS
                    </span>
                  </td>
                  {tableData.metricDefs.map((m) => (
                    <td key={m.key} className="px-4 py-3 text-center text-sm text-gray-900">
                      {m.data_type === 'text' || m.data_type === 'duration' ? (
                        '—'
                      ) : m.data_type === 'percentage' ? (
                        <span className="font-mono">{(aggregates[m.key] || 0).toFixed(1)}%</span>
                      ) : m.data_type === 'decimal' ? (
                        <span className="font-mono">{(aggregates[m.key] || 0).toFixed(2)}</span>
                      ) : (
                        <span className="font-mono">{aggregates[m.key] || 0}</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleShowAuditLog}
                disabled={loadingAudit}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {loadingAudit ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <History className="w-4 h-4" />
                )}
                View Audit Log
              </button>

              {undoStack.length > 0 && (
                <button
                  onClick={handleUndo}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Undo last edit (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                  Undo
                  <span className="text-xs text-gray-400 ml-1">({undoStack.length})</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {editedValues.size > 0 && (
                <span className="text-sm text-yellow-600 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  {editedValues.size} unsaved change{editedValues.size !== 1 ? 's' : ''}
                </span>
              )}
              <button
                onClick={handleCancel}
                disabled={editedValues.size === 0 || saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={editedValues.size === 0 || saving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAuditLog && (
        <AuditLogModal
          entries={auditEntries}
          onClose={() => setShowAuditLog(false)}
        />
      )}

      {showKeyboardHelp && (
        <KeyboardShortcutsModal onClose={() => setShowKeyboardHelp(false)} />
      )}
    </div>
  )
}
