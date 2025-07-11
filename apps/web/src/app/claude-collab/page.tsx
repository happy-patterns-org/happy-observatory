'use client'

import { ProjectChooser } from '@/components/project-chooser'
import { useProjectStore } from '@/store/project-store'
import { ChevronRight, Code, FileText, Send, Sparkles, Terminal } from 'lucide-react'
import { useState } from 'react'

export default function ClaudeCollabPage() {
  const { selectedProject } = useProjectStore()
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState<
    Array<{
      role: 'user' | 'assistant'
      content: string
      timestamp: Date
    }>
  >([])

  const handleSendMessage = () => {
    if (!message.trim() || !selectedProject) return

    // Add user message to conversation
    setConversation((prev) => [
      ...prev,
      {
        role: 'user',
        content: message,
        timestamp: new Date(),
      },
    ])

    // Here you would typically send to Claude API
    // For now, we'll add a placeholder response
    setTimeout(() => {
      setConversation((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I'll help you with "${message}" in the ${selectedProject.name} project. Let me analyze the codebase and provide suggestions.`,
          timestamp: new Date(),
        },
      ])
    }, 1000)

    setMessage('')
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-stone-900">Claude Collaboration</h1>
              <ProjectChooser />
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <Sparkles className="w-4 h-4" />
              <span>AI-Powered Development Assistant</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar with Quick Actions */}
        <aside className="w-64 bg-white border-r border-stone-200 p-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <Code className="w-4 h-4" />
              <span>Review Code</span>
              <ChevronRight className="w-3 h-3 ml-auto" />
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Generate Tests</span>
              <ChevronRight className="w-3 h-3 ml-auto" />
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <Terminal className="w-4 h-4" />
              <span>Debug Issue</span>
              <ChevronRight className="w-3 h-3 ml-auto" />
            </button>
          </div>

          {selectedProject && (
            <div className="mt-6 p-3 bg-stone-50 rounded-lg">
              <div className="text-xs font-medium text-stone-600 mb-1">Current Project</div>
              <div className="text-sm font-medium text-stone-900">{selectedProject.name}</div>
              <div className="text-xs text-stone-500 mt-1">{selectedProject.path}</div>
            </div>
          )}
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            {conversation.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <Sparkles className="w-12 h-12 text-stone-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-stone-900 mb-2">
                    Start a conversation with Claude
                  </h2>
                  <p className="text-stone-600 mb-6">
                    Ask questions about your code, request help with debugging, or collaborate on
                    new features.
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <button
                      type="button"
                      onClick={() => setMessage('Help me understand the project structure')}
                      className="px-4 py-2 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                    >
                      Explain project structure
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessage('What are the main components?')}
                      className="px-4 py-2 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                    >
                      List main components
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessage('Review my recent changes')}
                      className="px-4 py-2 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                    >
                      Review recent changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessage('Suggest improvements')}
                      className="px-4 py-2 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
                    >
                      Suggest improvements
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl mx-auto">
                {conversation.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-stone-200'
                      }`}
                    >
                      <div className="text-sm">{msg.content}</div>
                      <div
                        className={`text-xs mt-2 ${
                          msg.role === 'user' ? 'text-blue-200' : 'text-stone-500'
                        }`}
                      >
                        {msg.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-stone-200 bg-white p-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={
                    selectedProject ? 'Ask Claude about your code...' : 'Select a project to start'
                  }
                  disabled={!selectedProject}
                  className="flex-1 px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-stone-100 disabled:text-stone-500"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={!selectedProject || !message.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
              {!selectedProject && (
                <p className="mt-2 text-sm text-amber-600">
                  Please select a project from the dropdown above to start collaborating with
                  Claude.
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
