'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { Send, Download, Save } from 'lucide-react'
import { parseFunctionalRequirementsFromMarkdown } from '@/lib/sdlc/util'

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

type DesignAgentResponse = {
  summary: string
  goals: string[]
  nonGoals: string[]
  assumptions: string[]
  constraints: string[]
  architecture: {
    overview: string
    components: Array<{
      name: string
      responsibilities: string[]
      technology?: string
    }>
    keyFlows: Array<{ name: string; steps: string[] }>
  }
  dataModel: {
    entities: Array<{
      name: string
      description: string
      fields: string[]
      relationships: string[]
    }>
    storageNotes: string[]
  }
  apiDesign: {
    endpoints: Array<{
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
      path: string
      description: string
      request?: string
      response?: string
      authz?: string
    }>
    events: Array<{
      name: string
      payload?: string
      producers?: string[]
      consumers?: string[]
    }>
  }
  tradeoffs: Array<{
    decision: string
    options: string[]
    chosen: string
    rationale: string
    risks: string[]
    mitigations: string[]
  }>
  openQuestions: Array<{ id: string; question: string; why: string }>
  nextAssistantMessage: string
}

type TestsAgentResponse = {
  summary: string
  testSuites: Array<{
    id: string
    frId: string
    name: string
    testCases: Array<{
      id: string
      description: string
      expected: string | number | boolean
      actual: string
    }>
  }>
  openQuestions: Array<{ id: string; question: string }>
  nextAssistantMessage: string
}

type Phase = 'requirements' | 'design' | 'tests'
type Tab = 'requirements-doc' | 'design-doc' | 'rtm' | 'tests'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface PhaseData {
  messages: Message[]
  tabContents: Record<Tab, string>
}

type PersistedSdlcState = {
  requirements?: { messages?: Message[]; tabContents?: Partial<Record<Tab, string>> & Record<string, unknown> }
  design?: { messages?: Message[]; tabContents?: Partial<Record<Tab, string>> & Record<string, unknown> }
  tests?: { messages?: Message[]; tabContents?: Partial<Record<Tab, string>> & Record<string, unknown> }
}

const PHASES: Array<{ id: Phase; label: string }> = [
  { id: 'requirements', label: 'Requirements' },
  { id: 'design', label: 'Design' },
  { id: 'tests', label: 'Tests' },
]

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'requirements-doc', label: 'Requirements Doc' },
  { id: 'design-doc', label: 'Design Doc' },
  { id: 'rtm', label: 'RTM' },
  { id: 'tests', label: 'Tests' },
]

function getPhaseStorageKey(projectId: string) {
  return `sdlc-active-phase:${projectId}`
}

function isValidPhase(value: string): value is Phase {
  return value === 'requirements' || value === 'design' || value === 'tests'
}

function getInitialPhase(projectId: string): Phase {
  if (typeof window === 'undefined') return 'requirements'

  const stored = window.localStorage.getItem(getPhaseStorageKey(projectId))
  return stored && isValidPhase(stored) ? stored : 'requirements'
}

const TAB_PHASE_PRIORITY: Record<Tab, Phase[]> = {
  'requirements-doc': ['requirements', 'design', 'tests'],
  'design-doc': ['design', 'requirements', 'tests'],
  rtm: ['design', 'tests', 'requirements'],
  tests: ['tests', 'design', 'requirements'],
}

function createDefaultPhaseData(): Record<Phase, PhaseData> {
  return {
    requirements: {
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: 'Hi! I\'m your Requirements agent. Let\'s define the requirements for your project.',
        },
      ],
      tabContents: {
        'requirements-doc': '# Requirements\n\nBusiness goals, users, and constraints...',
        'design-doc': '# Design Document\n\nRequirements gathered from the project...',
        'rtm': '# Requirements Traceability Matrix\n\nMapping requirements to design elements...',
        'tests': '# Test Requirements\n\nTest scenarios based on requirements...',
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
        'requirements-doc': '',
        'design-doc': '# Design Document\n\nArchitecture and design specifications...',
        'rtm': '# Requirements Traceability Matrix\n\nDesign elements mapped to requirements...',
        'tests': '# Design Test Cases\n\nUnit and integration test cases...',
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
        'requirements-doc': '',
        'design-doc': '# Test Strategy Document\n\nOverall testing approach...',
        'rtm': '# Requirements Traceability Matrix\n\nTest cases mapped to requirements...',
        'tests': '# Test Cases\n\nDetailed test cases and scenarios...',
      },
    },
  }
}

function normalizePersistedState(state: PersistedSdlcState): Record<Phase, PhaseData> {
  const normalizePhase = (phase: PersistedSdlcState[Phase] | undefined): PhaseData => ({
    messages: Array.isArray(phase?.messages) ? phase.messages : [],
    tabContents: {
      'requirements-doc': typeof phase?.tabContents?.['requirements-doc'] === 'string' ? phase.tabContents['requirements-doc'] : '',
      'design-doc': typeof phase?.tabContents?.['design-doc'] === 'string' ? phase.tabContents['design-doc'] : '',
      rtm: typeof phase?.tabContents?.rtm === 'string' ? phase.tabContents.rtm : '',
      tests: typeof phase?.tabContents?.tests === 'string' ? phase.tabContents.tests : '',
    },
  })

  return {
    requirements: normalizePhase(state.requirements),
    design: normalizePhase(state.design),
    tests: normalizePhase(state.tests),
  }
}

export function SDLCDocumentGenerator({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [activePhase, setActivePhase] = useState<Phase>('requirements')
  const [activeTab, setActiveTab] = useState<Tab>('requirements-doc')
  const [isPhasePreferenceReady, setIsPhasePreferenceReady] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadStatus, setLoadStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const [phaseData, setPhaseData] = useState<Record<Phase, PhaseData>>(createDefaultPhaseData)

  const currentPhase = phaseData[activePhase]
  const currentTabContent = (() => {
    const phases = TAB_PHASE_PRIORITY[activeTab]
    for (const phase of phases) {
      const candidate = phaseData[phase].tabContents[activeTab]
      if (candidate.trim()) return candidate
    }

    return phaseData[phases[0]].tabContents[activeTab]
  })()

  const switchPhase = (phase: Phase) => {
    setActivePhase(phase)
    setActiveTab('requirements-doc')
  }

  useEffect(() => {
    if (!isPhasePreferenceReady) return
    if (typeof window === 'undefined') return
    window.localStorage.setItem(getPhaseStorageKey(projectId), activePhase)
  }, [activePhase, projectId, isPhasePreferenceReady])

  useEffect(() => {
    setIsPhasePreferenceReady(false)
    setActivePhase(getInitialPhase(projectId))
    setActiveTab('requirements-doc')
    setIsPhasePreferenceReady(true)
  }, [projectId])

  const persistedState = useMemo(() => {
    const pickTabs = (tabContents: Record<Tab, string>) => ({
      'requirements-doc': tabContents['requirements-doc'],
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

  // Debounced autosave bookkeeping.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')

  const loadPersistedState = async (signal?: AbortSignal) => {
    if (!projectId) {
      setIsLoaded(true)
      setLoadStatus('error')
      setSaveStatus('error')
      return
    }

    setPhaseData(createDefaultPhaseData())
    setLoadStatus('loading')
    setIsLoaded(false)

    try {
      const res = await fetch(`/api/projects/${projectId}/sdlc`, {
        method: 'GET',
        headers: { 'content-type': 'application/json' },
        signal,
      })

      if (!res.ok) {
        setLoadStatus('error')
        return
      }

      const json = (await res.json()) as { state: PersistedSdlcState | null; updatedAt?: string | null }

      if (!json?.state) {
        lastSavedRef.current = JSON.stringify(persistedState)
        setSaveStatus('saved')
        setLoadStatus('loaded')
        return
      }

      const normalized = normalizePersistedState(json.state)
      setPhaseData(normalized)
      lastSavedRef.current = JSON.stringify(normalized)
      setSaveStatus('saved')

      setLoadStatus('loaded')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setLoadStatus('error')
    } finally {
      setIsLoaded(true)
    }
  }

  // Load persisted state once per project.
  useEffect(() => {
    const controller = new AbortController()
    void loadPersistedState(controller.signal)
    return () => controller.abort()
  }, [projectId])

  useEffect(() => {
    if (!isLoaded) return
    if (!projectId) return
    if (loadStatus !== 'loaded') return

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
  }, [isLoaded, loadStatus, persistedState, projectId])

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

  const buildDesignMarkdown = (data: DesignAgentResponse, requirementsMarkdown?: string) => {
    const lines: string[] = []
    lines.push('# Design')
    lines.push('')
    lines.push('## Summary')
    lines.push(data.summary || '(no summary)')
    lines.push('')

    if (requirementsMarkdown?.trim()) {
      lines.push('## Requirements Snapshot')
      lines.push(requirementsMarkdown.trim())
      lines.push('')
    }

    if (data.goals?.length) {
      lines.push('## Goals')
      for (const g of data.goals) lines.push(`- ${g}`)
      lines.push('')
    }

    if (data.nonGoals?.length) {
      lines.push('## Non-Goals')
      for (const ng of data.nonGoals) lines.push(`- ${ng}`)
      lines.push('')
    }

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

    lines.push('## Architecture')
    lines.push(data.architecture?.overview || '(no overview)')
    lines.push('')

    if (data.architecture?.components?.length) {
      lines.push('### Components')
      for (const c of data.architecture.components) {
        lines.push(`- **${c.name}**${c.technology ? ` (${c.technology})` : ''}`)
        for (const r of c.responsibilities ?? []) lines.push(`  - ${r}`)
      }
      lines.push('')
    }

    if (data.architecture?.keyFlows?.length) {
      lines.push('### Key Flows')
      for (const f of data.architecture.keyFlows) {
        lines.push(`- **${f.name}**`)
        for (const s of f.steps ?? []) lines.push(`  - ${s}`)
      }
      lines.push('')
    }

    lines.push('## Data Model')
    if (!data.dataModel?.entities?.length) {
      lines.push('- (none yet)')
      lines.push('')
    } else {
      for (const e of data.dataModel.entities) {
        lines.push(`### ${e.name}`)
        lines.push(e.description || '')
        lines.push('')
        if (e.fields?.length) {
          lines.push('**Fields**')
          for (const f of e.fields) lines.push(`- ${f}`)
          lines.push('')
        }
        if (e.relationships?.length) {
          lines.push('**Relationships**')
          for (const rel of e.relationships) lines.push(`- ${rel}`)
          lines.push('')
        }
      }
    }

    if (data.dataModel?.storageNotes?.length) {
      lines.push('### Storage Notes')
      for (const n of data.dataModel.storageNotes) lines.push(`- ${n}`)
      lines.push('')
    }

    lines.push('## API Design')
    if (data.apiDesign?.endpoints?.length) {
      lines.push('### Endpoints')
      for (const ep of data.apiDesign.endpoints) {
        lines.push(`- **${ep.method} ${ep.path}** — ${ep.description}`)
        if (ep.authz) lines.push(`  - Auth: ${ep.authz}`)
        if (ep.request) lines.push(`  - Req: ${ep.request}`)
        if (ep.response) lines.push(`  - Res: ${ep.response}`)
      }
      lines.push('')
    } else {
      lines.push('- (none yet)')
      lines.push('')
    }

    if (data.apiDesign?.events?.length) {
      lines.push('### Events')
      for (const ev of data.apiDesign.events) {
        lines.push(`- **${ev.name}**`)
        if (ev.payload) lines.push(`  - Payload: ${ev.payload}`)
        if (ev.producers?.length) lines.push(`  - Producers: ${ev.producers.join(', ')}`)
        if (ev.consumers?.length) lines.push(`  - Consumers: ${ev.consumers.join(', ')}`)
      }
      lines.push('')
    }

    if (data.tradeoffs?.length) {
      lines.push('## Tradeoffs')
      for (const t of data.tradeoffs) {
        lines.push(`### ${t.decision}`)
        lines.push(`- Chosen: ${t.chosen}`)
        if (t.options?.length) lines.push(`- Options: ${t.options.join(' | ')}`)
        if (t.rationale) lines.push(`- Rationale: ${t.rationale}`)
        if (t.risks?.length) {
          lines.push('- Risks:')
          for (const r of t.risks) lines.push(`  - ${r}`)
        }
        if (t.mitigations?.length) {
          lines.push('- Mitigations:')
          for (const m of t.mitigations) lines.push(`  - ${m}`)
        }
        lines.push('')
      }
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

    setIsSending(true)
    try {
      const messages = [...currentPhase.messages, newMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      // Use the latest known requirements snapshot (avoid stale closure).
      const requirementsMarkdown = phaseData.requirements.tabContents['requirements-doc']

      const functionalRequirements =
        activePhase === 'tests'
          ? parseFunctionalRequirementsFromMarkdown(requirementsMarkdown)
          : undefined

      const res = await fetch('/api/agents/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          phase: activePhase,
          messages,
          requirementsMarkdown: activePhase === 'design' ? requirementsMarkdown : undefined,
          functionalRequirements: activePhase === 'tests' ? functionalRequirements : undefined,
        }),
      })

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as unknown
        const maybeError =
          json && typeof json === 'object' && 'error' in json ? (json as { error?: unknown }).error : undefined
        throw new Error(
          typeof maybeError === 'string' && maybeError.trim()
            ? maybeError
            : `Agent request failed (${res.status})`
        )
      }

      if (activePhase === 'requirements') {
        const data = (await res.json()) as RequirementAgentResponse
        const agentResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.nextAssistantMessage || 'What would you like to build?',
        }

        setPhaseData((prev) => {
          const nextRequirementsDoc = buildRequirementsMarkdown(data)

          return {
            ...prev,
            requirements: {
              ...prev.requirements,
              messages: [...prev.requirements.messages, agentResponse],
              tabContents: {
                ...prev.requirements.tabContents,
                'requirements-doc': nextRequirementsDoc,
              },
            },
            design: {
              ...prev.design,
              tabContents: {
                ...prev.design.tabContents,
                'requirements-doc': nextRequirementsDoc,
              },
            },
            tests: {
              ...prev.tests,
              tabContents: {
                ...prev.tests.tabContents,
                'requirements-doc': nextRequirementsDoc,
              },
            },
          }
        })
      } else if (activePhase === 'design') {
        const data = (await res.json()) as DesignAgentResponse
        const agentResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.nextAssistantMessage || 'What design decision should we tackle next?',
        }

        setPhaseData((prev) => {
          const nextDesignDoc = buildDesignMarkdown(data, requirementsMarkdown)

          return {
            ...prev,
            design: {
              ...prev.design,
              messages: [...prev.design.messages, agentResponse],
              tabContents: {
                ...prev.design.tabContents,
                'design-doc': nextDesignDoc,
              },
            },
            requirements: {
              ...prev.requirements,
              tabContents: {
                ...prev.requirements.tabContents,
                'design-doc': nextDesignDoc,
              },
            },
            tests: {
              ...prev.tests,
              tabContents: {
                ...prev.tests.tabContents,
                'design-doc': nextDesignDoc,
              },
            },
          }
        })
      } else if (activePhase === 'tests') {
        const data = (await res.json()) as TestsAgentResponse
        const agentResponse: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.nextAssistantMessage || 'What should we test next?',
        }

        const buildTestsMarkdown = (resp: TestsAgentResponse) => {
          const lines: string[] = []
          lines.push('# Test Cases')
          lines.push('')
          lines.push('## Summary')
          lines.push(resp.summary || '(no summary)')
          lines.push('')

          if (!resp.testSuites?.length) {
            lines.push('- (no test suites yet)')
            lines.push('')
          } else {
            for (const suite of resp.testSuites) {
              lines.push(`## ${suite.id} — ${suite.name}`)
              lines.push(`- FR: ${suite.frId}`)
              lines.push('')
              for (const tc of suite.testCases ?? []) {
                lines.push(`- **${tc.id}**: ${tc.description}`)
                lines.push(`  - Expected: ${String(tc.expected)}`)
                lines.push(`  - Actual: ${tc.actual || '(TBD)'}`)
              }
              lines.push('')
            }
          }

          if (resp.openQuestions?.length) {
            lines.push('## Open Questions')
            for (const q of resp.openQuestions) lines.push(`- **${q.id}**: ${q.question}`)
            lines.push('')
          }

          return lines.join('\n')
        }

        const buildRtmMarkdown = (resp: TestsAgentResponse) => {
          const lines: string[] = []
          lines.push('# Requirements Traceability Matrix')
          lines.push('')
          lines.push('| FR | Test Suite | Test Cases | Status |')
          lines.push('|---|---|---|---|')

          const byFr = new Map<string, { suiteId?: string; caseIds: string[] }>()
          for (const suite of resp.testSuites ?? []) {
            const entry = byFr.get(suite.frId) ?? { suiteId: undefined, caseIds: [] }
            entry.suiteId = suite.id
            entry.caseIds = (suite.testCases ?? []).map((c) => c.id)
            byFr.set(suite.frId, entry)
          }

          const frs = functionalRequirements ?? []
          if (!frs.length) {
            lines.push('| (none) |  |  | MISSING |')
            return lines.join('\n')
          }

          for (const fr of frs) {
            const found = byFr.get(fr.id)
            const suiteId = found?.suiteId ?? ''
            const caseIds = found?.caseIds?.length ? found.caseIds.join('<br/>') : ''
            const status = found?.suiteId
              ? found.caseIds.length
                ? 'PLANNED'
                : 'PARTIAL'
              : 'MISSING'
            lines.push(`| ${fr.id} | ${suiteId} | ${caseIds} | ${status} |`)
          }

          return lines.join('\n')
        }

        setPhaseData((prev) => {
          const nextTestsDoc = buildTestsMarkdown(data)

          const nextRtmDoc = buildRtmMarkdown(data)

          return {
            ...prev,
            tests: {
              ...prev.tests,
              messages: [...prev.tests.messages, agentResponse],
              tabContents: {
                ...prev.tests.tabContents,
                tests: nextTestsDoc,
                rtm: nextRtmDoc,
              },
            },
            requirements: {
              ...prev.requirements,
              tabContents: {
                ...prev.requirements.tabContents,
                tests: nextTestsDoc,
                rtm: nextRtmDoc,
              },
            },
            design: {
              ...prev.design,
              tabContents: {
                ...prev.design.tabContents,
                tests: nextTestsDoc,
                rtm: nextRtmDoc,
              },
            },
          }
        })
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Unknown error'
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry — I couldn't reach the ${activePhase} agent. ${errMsg}`,
      }

      setPhaseData((prev) => ({
        ...prev,
        [activePhase]: {
          ...prev[activePhase],
          messages: [...prev[activePhase].messages, agentResponse],
        },
      }))
    } finally {
      setIsSending(false)
    }
  }

  const handleTabContentChange = (newContent: string) => {
    setPhaseData((prev) => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        tabContents: {
          ...prev.requirements.tabContents,
          [activeTab]: newContent,
        },
      },
      design: {
        ...prev.design,
        tabContents: {
          ...prev.design.tabContents,
          [activeTab]: newContent,
        },
      },
      tests: {
        ...prev.tests,
        tabContents: {
          ...prev.tests.tabContents,
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
        {loadStatus === 'error' ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
            <p className="text-sm text-red-200">
              Couldn’t load saved SDLC docs (temporary DB issue). Showing local defaults.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="border-white/10"
              onClick={() => void loadPersistedState()}
            >
              Retry
            </Button>
          </div>
        ) : null}
      </div>

      {/* Phase Stepper */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          {PHASES.map((phase, index) => (
            <div key={phase.id} className="flex items-center flex-1">
              <button
                onClick={() => switchPhase(phase.id)}
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
          onClick={async () => {
            if (!allPhasesComplete) return
            if (!projectId) return

            const res = await fetch(`/api/projects/${projectId}/plan`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
            })

            if (!res.ok) {
              const json = (await res.json().catch(() => null)) as unknown
              const maybeError =
                json && typeof json === 'object' && json && 'error' in json
                  ? (json as { error?: unknown }).error
                  : undefined
              const message =
                typeof maybeError === 'string' && maybeError.trim()
                  ? maybeError
                  : `Plan generation failed (${res.status})`
              // eslint-disable-next-line no-alert
              alert(message)
              return
            }

            router.push(`/projects/${projectId}/plan/milestones`)
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
