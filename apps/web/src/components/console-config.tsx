'use client'

import { useState } from 'react'
import { Settings, Shield, Terminal, Save } from 'lucide-react'

interface ConsoleConfigProps {
  onClose: () => void
  onSave: (config: ConsoleConfig) => void
  currentConfig?: ConsoleConfig
}

export interface ConsoleConfig {
  securityLevel: 'strict' | 'standard' | 'permissive'
  theme: 'dark' | 'light'
  fontSize: number
  enableFileAccess: boolean
  enableWebSocketPTY: boolean
  maxHistorySize: number
  bearerToken?: string
}

const defaultConfig: ConsoleConfig = {
  securityLevel: 'standard',
  theme: 'dark',
  fontSize: 14,
  enableFileAccess: true,
  enableWebSocketPTY: true,
  maxHistorySize: 1000,
}

export function ConsoleConfig({
  onClose,
  onSave,
  currentConfig = defaultConfig,
}: ConsoleConfigProps) {
  const [config, setConfig] = useState<ConsoleConfig>(currentConfig)
  const [showToken, setShowToken] = useState(false)

  const handleSave = () => {
    onSave(config)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-stone-600" />
            <h2 className="text-lg font-semibold text-stone-900">Console Configuration</h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Security Level */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-stone-600" />
              <label className="text-sm font-medium text-stone-700">Security Level</label>
            </div>
            <select
              value={config.securityLevel}
              onChange={(e) => setConfig({ ...config, securityLevel: e.target.value as any })}
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="strict">Strict - Maximum security, limited commands</option>
              <option value="standard">Standard - Balanced security (recommended)</option>
              <option value="permissive">Permissive - Full access, use with caution</option>
            </select>
            <p className="text-xs text-stone-500 mt-1">
              Controls command sanitization and file access restrictions
            </p>
          </div>

          {/* Theme */}
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-2">Theme</label>
            <div className="flex gap-2">
              <button
                onClick={() => setConfig({ ...config, theme: 'dark' })}
                className={`px-4 py-2 rounded-md ${
                  config.theme === 'dark'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => setConfig({ ...config, theme: 'light' })}
                className={`px-4 py-2 rounded-md ${
                  config.theme === 'light'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                Light
              </button>
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-2">
              Font Size: {config.fontSize}px
            </label>
            <input
              type="range"
              min="10"
              max="20"
              value={config.fontSize}
              onChange={(e) => setConfig({ ...config, fontSize: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Features */}
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-2">Features</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.enableFileAccess}
                  onChange={(e) => setConfig({ ...config, enableFileAccess: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-stone-700">Enable File System Access</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.enableWebSocketPTY}
                  onChange={(e) => setConfig({ ...config, enableWebSocketPTY: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-stone-700">Enable WebSocket PTY</span>
              </label>
            </div>
          </div>

          {/* History Size */}
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-2">
              Max History Size
            </label>
            <input
              type="number"
              min="100"
              max="10000"
              step="100"
              value={config.maxHistorySize}
              onChange={(e) => setConfig({ ...config, maxHistorySize: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Bearer Token */}
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-2">
              Bearer Token (Optional)
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={config.bearerToken || ''}
                onChange={(e) => setConfig({ ...config, bearerToken: e.target.value })}
                placeholder="Enter token for authentication"
                className="w-full px-3 py-2 pr-20 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-stone-600 hover:text-stone-800"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Used for unified authentication with Happy DevKit
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-8">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  )
}
