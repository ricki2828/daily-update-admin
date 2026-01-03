import { useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import api from '../lib/api'

export default function Exports() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])

  const handleExport = (type: 'daily' | 'weekly', format: 'excel' | 'csv') => {
    const url = api.getExportUrl(type, format, date)
    window.open(url, '_blank')
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Exports</h1>
        <p className="text-gray-500">Download reports and data exports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Export */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Daily Report</h2>
              <p className="text-sm text-gray-500">Export all submissions for a specific date</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleExport('daily', 'excel')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={() => handleExport('daily', 'csv')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>

        {/* Weekly Export */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileSpreadsheet className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Weekly Summary</h2>
              <p className="text-sm text-gray-500">Export weekly summary with trends</p>
            </div>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Generates a summary of the past 7 days including submission rates and trends for all accounts.
          </p>

          <button
            onClick={() => handleExport('weekly', 'excel')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Weekly Report
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Export Details</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Daily reports include all metric values submitted by team leaders</li>
          <li>• Weekly reports include submission rates and comparison to previous periods</li>
          <li>• Excel exports include formatting and multiple sheets</li>
          <li>• CSV exports are ideal for importing into other systems</li>
        </ul>
      </div>
    </div>
  )
}
