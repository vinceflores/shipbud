'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { Send, Download, Save } from 'lucide-react'
import { RequirementEngineerAgent } from '@/lib/sdlc/agents'

type RequirementAgentResponse = {
  summary: string
  assumptions: string[]
  constraints: string[]
  functionalRequirements: Array<{
    id: string
    name: string
    description: string
    priority: number
    acceptanceCriteria: string[]
  }>
  nonFunctionalRequirements: Array<{
    id: string
    name: string
    description: string
    priority: number
    acceptanceCriteria: string[]
  }>
  outOfScope: string[]
  openQuestions: Array<{ id: string; question: string; why: string }>
  nextAssistantMessage: string
}

type Phase = 'requirements' | 'design' | 'tests'
type Tab = 'design-doc' | 'rtm' | 'tests' | 'milestones'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface PhaseData {
  messages: Message[]
  tabContents: Record<Tab, string>
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

export function SDLCDocumentGenerator({ projectId }: { projectId: string }) {
  const [activePhase, setActivePhase] = useState<Phase>('requirements')
  const [activeTab, setActiveTab] = useState<Tab>('design-doc')
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [phaseData, setPhaseData] = useState<Record<Phase, PhaseData>>({
    requirements: {
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: 'Hi! I\'m your Requirements agent. Let\'s define the requirements for your project.',
        },
      ],
      tabContents: {
        'design-doc': '# Design Document\n\nRequirements gathered from the project...',
        'rtm': '# Requirements Traceability Matrix\n\nMapping requirements to design elements...',
        'tests': '# Test Requirements\n\nTest scenarios based on requirements...',
        'milestones': '# Milestones & Tasks\n\nProject milestones and tasks...',
      },
    },
    design: {
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: 'Hello! I\'m your Design agent. Let\'s create a comprehensive design for your project.',
        },
      ],
      tabContents: {
        'design-doc': '# Design Document\n\nArchitecture and design specifications...',
        'rtm': '# Requirements Traceability Matrix\n\nDesign elements mapped to requirements...',
        'tests': '# Design Test Cases\n\nUnit and integration test cases...',
        'milestones': '# Milestones & Tasks\n\nDesign phase milestones and tasks...',
      },
    },
    tests: {
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: 'Hi! I\'m your Tests agent. Let\'s plan the testing strategy for your project.',
        },
      ],
      tabContents: {
        'design-doc': '# Test Strategy Document\n\nOverall testing approach...',
        'rtm': '# Requirements Traceability Matrix\n\nTest cases mapped to requirements...',
        'tests': '# Test Cases\n\nDetailed test cases and scenarios...',
        'milestones': '# Milestones & Tasks\n\nTest execution milestones and tasks...',
      },
    },
  })

  const currentPhase = phaseData[activePhase]
  const currentTabContent = currentPhase.tabContents[activeTab]

  const persistedState = useMemo(() => {
    const pickTabs = (tabContents: Record<Tab, string>) => ({
      'design-doc': tabContents['design-doc'],
      rtm: tabContents.rtm,
      tests: tabContents.tests,
    })

    return {
      requirements: {
        messages: phaseData.requirements.messages,
        tabContents: pickTabs(phaseData.requirements.tabContents),
      },
      design: {
        messages: phaseData.design.messages,
        tabContents: pickTabs(phaseData.design.tabContents),
      },
      tests: {
        messages: phaseData.tests.messages,
        tabContents: pickTabs(phaseData.tests.tabContents),
      },
    }
  }, [phaseData])

  // Load persisted state once per project.
  useEffect(() => {
    if (!projectId) {
      setIsLoaded(true)
      setSaveStatus('error')
      return
    }
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/sdlc`, {
          method: 'GET',
          headers: { 'content-type': 'application/json' },
        })

        if (!res.ok) {
          setIsLoaded(true)
          return
        }

        const json = (await res.json()) as { state: any }
        if (cancelled) return
        if (!json?.state) {
          setIsLoaded(true)
          return
        }

        setPhaseData((prev) => {
          const next = { ...prev }

          for (const phase of ['requirements', 'design', 'tests'] as const) {
            const savedPhase = json.state?.[phase]
            if (!savedPhase) continue

            next[phase] = {
              ...next[phase],
              messages: Array.isArray(savedPhase.messages)
                ? savedPhase.messages
                : next[phase].messages,
              tabContents: {
                ...next[phase].tabContents,
                'design-doc': savedPhase.tabContents?.['design-doc'] ?? next[phase].tabContents['design-doc'],
                rtm: savedPhase.tabContents?.rtm ?? next[phase].tabContents.rtm,
                tests: savedPhase.tabContents?.tests ?? next[phase].tabContents.tests,
              },
            }
          }

          return next
        })
      } finally {
        if (!cancelled) setIsLoaded(true)
      }
    }

    setIsLoaded(false)
    void load()

    return () => {
      cancelled = true
    }
  }, [projectId])

  // Debounced autosave when persisted parts change.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')

  useEffect(() => {
    if (!isLoaded) return
    if (!projectId) return

    const payload = JSON.stringify(persistedState)
    if (payload === lastSavedRef.current) return

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      setSaveStatus('saving')
      void fetch(`/api/projects/${projectId}/sdlc`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state: persistedState }),
      })
        .then((res) => {
          if (!res.ok) {
            setSaveStatus('error')
            return
          }
          lastSavedRef.current = payload
          setSaveStatus('saved')
        })
        .catch(() => setSaveStatus('error'))
    }, 800)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [isLoaded, persistedState, projectId])

  const handleSaveNow = async () => {
    if (!isLoaded) return
    if (!projectId) {
      setSaveStatus('error')
      return
    }

    const payload = JSON.stringify(persistedState)
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/projects/${projectId}/sdlc`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state: persistedState }),
      })

      if (!res.ok) {
        setSaveStatus('error')
        return
      }

      lastSavedRef.current = payload
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }

  const handleDownload = () => {
    const content = currentTabContent ?? ''
    const safePhase = activePhase.replace(/[^a-z0-9-_]/gi, '_')
    const safeTab = activeTab.replace(/[^a-z0-9-_]/gi, '_')
    const filename = `${safePhase}-${safeTab}.md`

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    try {
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  const buildRequirementsMarkdown = (data: RequirementAgentResponse) => {
    const lines: string[] = []
    lines.push('# Requirements')
    lines.push('')
    lines.push('## Summary')
    lines.push(data.summary || '(no summary)')
    lines.push('')

    if (data.constraints?.length) {
      lines.push('## Constraints')
      for (const c of data.constraints) lines.push(`- ${c}`)
      lines.push('')
    }

    if (data.assumptions?.length) {
      lines.push('## Assumptions')
      for (const a of data.assumptions) lines.push(`- ${a}`)
      lines.push('')
    }

    lines.push('## Functional Requirements')
    if (!data.functionalRequirements?.length) {
      lines.push('- (none yet)')
    } else {
      for (const r of [...data.functionalRequirements].sort((a, b) => a.priority - b.priority)) {
        lines.push(`- **${r.id} (P${r.priority}) — ${r.name}**: ${r.description}`)
        if (r.acceptanceCriteria?.length) {
          for (const ac of r.acceptanceCriteria) lines.push(`  - AC: ${ac}`)
        }
      }
    }
    lines.push('')

    lines.push('## Non-Functional Requirements')
    if (!data.nonFunctionalRequirements?.length) {
      lines.push('- (none yet)')
    } else {
      for (const r of [...data.nonFunctionalRequirements].sort((a, b) => a.priority - b.priority)) {
        lines.push(`- **${r.id} (P${r.priority}) — ${r.name}**: ${r.description}`)
        if (r.acceptanceCriteria?.length) {
          for (const ac of r.acceptanceCriteria) lines.push(`  - AC: ${ac}`)
        }
      }
    }
    lines.push('')

    if (data.outOfScope?.length) {
      lines.push('## Out of Scope')
      for (const o of data.outOfScope) lines.push(`- ${o}`)
      lines.push('')
    }

    if (data.openQuestions?.length) {
      lines.push('## Open Questions')
      for (const q of data.openQuestions) lines.push(`- **${q.id}**: ${q.question} _(why: ${q.why})_`)
      lines.push('')
    }

    return lines.join('\n')
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return
    if (isSending) return

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

    if (activePhase !== 'requirements') {
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
      return
    }

    setIsSending(true)
    try {
      const data = (await RequirementEngineerAgent({
        messages: [...currentPhase.messages, newMessage].map((m) => ({
          role: m.role,
          content: m.content,
        })),
      })) as RequirementAgentResponse

      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.nextAssistantMessage || 'What would you like to build?',
      }

      setPhaseData((prev) => ({
        ...prev,
        requirements: {
          ...prev.requirements,
          messages: [...prev.requirements.messages, agentResponse],
          tabContents: {
            ...prev.requirements.tabContents,
            'design-doc': buildRequirementsMarkdown(data),
          },
        },
      }))
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Unknown error'
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry — I couldn't reach the requirements agent. ${errMsg}`,
      }

      setPhaseData((prev) => ({
        ...prev,
        requirements: {
          ...prev.requirements,
          messages: [...prev.requirements.messages, agentResponse],
        },
      }))
    } finally {
      setIsSending(false)
    }
  }

  const handleTabContentChange = (newContent: string) => {
    setPhaseData((prev) => ({
      ...prev,
      [activePhase]: {
        ...prev[activePhase],
        tabContents: {
          ...prev[activePhase].tabContents,
          [activeTab]: newContent,
        },
      },
    }))
  }

  const allPhasesComplete = Object.values(phaseData).every(
    (phase) => phase.messages.length > 1
  )

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">SDLC Plan</h1>
        <p className="mt-1 text-sm text-slate-400">Define requirements, design, and tests for your project</p>
      </div>

      {/* Phase Stepper */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          {PHASES.map((phase, index) => (
            <div key={phase.id} className="flex items-center flex-1">
              <button
                onClick={() => setActivePhase(phase.id)}
                className={`flex flex-col items-center gap-2 flex-1 transition-all ${activePhase === phase.id
                  ? 'opacity-100'
                  : 'opacity-50 hover:opacity-75'
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${activePhase === phase.id
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-white/30 hover:border-white/50'
                    }`}
                >
                  {activePhase === phase.id && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span
                  className={`text-xs font-medium transition-all ${activePhase === phase.id
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

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-5 gap-6">
        {/* Left Panel - Chat (40%) */}
        <div className="col-span-2 rounded-lg border border-white/10 bg-white/5 flex flex-col h-96">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 border-b border-white/10">
            {currentPhase.messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-white'
                    }`}
                >
                  {message.role === 'user' ? 'U' : 'A'}
                </div>
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg text-sm ${message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-white/90 border border-white/10'
                    }`}
                >
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-4 flex gap-2">
            <input
              type="text"
              value={inputValue}
              disabled={isSending}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) =>
                e.key === 'Enter' && handleSendMessage()
              }
              placeholder="Ask your agent..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isSending}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Right Panel - Documents (60%) */}
        <div className="col-span-3 rounded-lg border border-white/10 bg-white/5 flex flex-col h-96">
          {/* Tab bar and controls */}
          <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between gap-4 shrink-0">
            <div className="flex gap-2 flex-wrap">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap ${activeTab === tab.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-white/60 hover:text-white/80'
                    }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-white/50">
                {saveStatus === 'saving'
                  ? 'Saving…'
                  : saveStatus === 'saved'
                    ? 'Saved'
                    : saveStatus === 'error'
                      ? 'Save failed'
                      : ''}
              </span>

              <Button
                size="sm"
                variant="outline"
                className="border-white/20 hover:bg-white/5"
                onClick={handleSaveNow}
                disabled={!isLoaded || saveStatus === 'saving'}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="border-white/20 hover:bg-white/5"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          {/* Document editor with built-in write/preview toggle */}
          <div className="flex-1 overflow-auto">
            <MarkdownEditor
              value={currentTabContent}
              onChange={handleTabContentChange}
              className="h-full rounded-none border-none"
              rows={30}
              placeholder={`Edit ${TABS.find((t) => t.id === activeTab)?.label || 'document'
                } here...`}
            />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-4 flex items-center justify-between">
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
          className={`ml-4 ${allPhasesComplete
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
