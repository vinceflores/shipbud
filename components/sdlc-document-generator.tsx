'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Download, Copy, Check } from 'lucide-react'

type Phase = 'requirements' | 'design' | 'tests'
type Tab = 'design-doc' | 'rtm' | 'tests' | 'milestones'
type WriteMode = 'write' | 'preview'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface PhaseData {
  messages: Message[]
  content: string
}

const PHASES: Array<{ id: Phase; label: string }> = [
  { id: 'requirements', label: 'Requirements' },
  { id: 'design', label: 'Design' },
  { id: 'tests', label: 'Tests' },
]

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'design-doc', label: 'Design Doc' },
  { id: 'rtm', label: 'RTM' },
  { id: 'tests', label: 'Tests' },
  { id: 'milestones', label: 'Milestones & Tasks' },
]

export function SDLCDocumentGenerator() {
  const [activePhase, setActivePhase] = useState<Phase>('requirements')
  const [activeTab, setActiveTab] = useState<Tab>('design-doc')
  const [writeMode, setWriteMode] = useState<WriteMode>('preview')
  const [inputValue, setInputValue] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [phaseData, setPhaseData] = useState<Record<Phase, PhaseData>>({
    requirements: {
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: 'Hi! I\'m your Requirements agent. Let\'s define the requirements for your project.',
        },
      ],
      content: '# Requirements Document\n\nReady to gather project requirements...',
    },
    design: {
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: 'Hello! I\'m your Design agent. Let\'s create a comprehensive design for your project.',
        },
      ],
      content: '# Design Document\n\nDesign specifications will be generated here...',
    },
    tests: {
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: 'Hi! I\'m your Tests agent. Let\'s plan the testing strategy for your project.',
        },
      ],
      content: '# Test Plan\n\nTesting strategy and test cases will appear here...',
    },
  })

  const currentPhase = phaseData[activePhase]

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
    }

    setPhaseData((prev) => ({
      ...prev,
      [activePhase]: {
        ...prev[activePhase],
        messages: [...prev[activePhase].messages, newMessage],
      },
    }))

    setInputValue('')

    // Simulate agent response
    setTimeout(() => {
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Processing your request for the ${activePhase} phase...`,
      }

      setPhaseData((prev) => ({
        ...prev,
        [activePhase]: {
          ...prev[activePhase],
          messages: [...prev[activePhase].messages, agentResponse],
        },
      }))
    }, 500)
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const allPhasesComplete = Object.values(phaseData).every(
    (phase) => phase.messages.length > 1
  )

  return (
    <div className="fixed inset-0 bg-[#0a0e1a] flex flex-col">
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat (40%) */}
        <div className="w-2/5 border-r border-white/10 flex flex-col bg-[#0f1219]">
          {/* Phase Stepper */}
          <div className="border-b border-white/10 px-6 py-6">
            <div className="flex items-center justify-between">
              {PHASES.map((phase, index) => (
                <div key={phase.id} className="flex items-center flex-1">
                  <button
                    onClick={() => setActivePhase(phase.id)}
                    className={`flex flex-col items-center gap-2 flex-1 transition-all ${
                      activePhase === phase.id
                        ? 'opacity-100'
                        : 'opacity-50 hover:opacity-75'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        activePhase === phase.id
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-white/30 hover:border-white/50'
                      }`}
                    >
                      {activePhase === phase.id && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium transition-all ${
                        activePhase === phase.id
                          ? 'text-white'
                          : 'text-white/60'
                      }`}
                    >
                      {phase.label}
                    </span>
                  </button>

                  {index < PHASES.length - 1 && (
                    <div className="flex-1 h-0.5 bg-white/10 mx-2 mt-4" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {currentPhase.messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  {message.role === 'user' ? 'U' : 'A'}
                </div>
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-white/90 border border-white/10'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="border-t border-white/10 p-6 bg-[#0a0e1a]">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) =>
                  e.key === 'Enter' && handleSendMessage()
                }
                placeholder="Ask your agent..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
              />
              <Button
                onClick={handleSendMessage}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel - Documents (60%) */}
        <div className="w-3/5 flex flex-col bg-[#0a0e1a]">
          {/* Tab bar and controls */}
          <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              className="border-white/20 hover:bg-white/5"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>

          {/* Write/Preview toggle */}
          <div className="border-b border-white/10 px-6 py-3 flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-white/5 border border-white/10 p-1">
              {(['write', 'preview'] as WriteMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setWriteMode(mode)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                    writeMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  {mode === 'write' ? 'Write' : 'Preview'}
                </button>
              ))}
            </div>
          </div>

          {/* Document content */}
          <div className="flex-1 overflow-auto">
            {writeMode === 'write' ? (
              <textarea
                value={currentPhase.content}
                onChange={(e) =>
                  setPhaseData((prev) => ({
                    ...prev,
                    [activePhase]: {
                      ...prev[activePhase],
                      content: e.target.value,
                    },
                  }))
                }
                className="w-full h-full p-6 bg-[#0f1219] text-white font-mono text-sm resize-none focus:outline-none border-none"
              />
            ) : (
              <div className="prose prose-invert max-w-none p-6">
                <div className="prose-content text-white">
                  {currentPhase.content.split('\n').map((line, i) => {
                    if (line.startsWith('# ')) {
                      return (
                        <h1
                          key={i}
                          className="text-2xl font-bold mt-6 mb-4"
                        >
                          {line.replace('# ', '')}
                        </h1>
                      )
                    }
                    if (line.startsWith('## ')) {
                      return (
                        <h2
                          key={i}
                          className="text-xl font-bold mt-4 mb-2"
                        >
                          {line.replace('## ', '')}
                        </h2>
                      )
                    }
                    if (line.startsWith('- ')) {
                      return (
                        <li key={i} className="ml-4 my-1">
                          {line.replace('- ', '')}
                        </li>
                      )
                    }
                    if (line.trim() === '') {
                      return <div key={i} className="h-2" />
                    }
                    return (
                      <p key={i} className="text-white/80 mb-2">
                        {line}
                      </p>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Footer Action Bar */}
      <div className="border-t border-white/10 bg-[#0f1219] px-6 py-4 flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-white/60">
            Ready when your Requirements, Design, and Tests docs are complete
          </p>
        </div>
        <Button
          onClick={() => {
            if (allPhasesComplete) {
              console.log('Generating milestones and tasks...')
            }
          }}
          disabled={!allPhasesComplete}
          className={`ml-4 ${
            allPhasesComplete
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-white/10 text-white/50 cursor-not-allowed'
          }`}
        >
          Generate Milestones & Tasks →
        </Button>
      </div>
    </div>
  )
}
