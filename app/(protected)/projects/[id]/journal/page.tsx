'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const ENTRY_TYPES = ['OBSTACLE', 'WIN', 'DECISION'] as const
const ENTRY_STATUSES = ['DRAFT', 'CONFIRMED'] as const

type EntryType = (typeof ENTRY_TYPES)[number]
type EntryStatus = (typeof ENTRY_STATUSES)[number]

type ObstacleContent = {
  problem: string
  root_cause: string
  solution: string
}

type WinContent = {
  description: string
}

type DecisionContent = {
  description: string
  rationale: string
}

type JournalContent = ObstacleContent | WinContent | DecisionContent

type JournalEntry = {
  id: string
  projectId: string
  milestoneId: string | null
  type: EntryType
  source: 'MANUAL' | 'AUTO_DRAFT'
  status: EntryStatus
  content: unknown
  createdAt: string
  milestone?: {
    id: string
    title: string
  } | null
}

type Milestone = {
  id: string
  title: string
  phaseId: string
}

type ProjectMilestone = {
  id: string
  title: string
}

type ProjectPhase = {
  id: string
  milestones?: ProjectMilestone[]
}

type ProjectApiResponse = {
  phases?: ProjectPhase[]
}

type NewContentState = {
  OBSTACLE: ObstacleContent
  WIN: WinContent
  DECISION: DecisionContent
}

type EditFormState = {
  id: string
  type: EntryType
  milestoneId: string
  status: EntryStatus
  content: JournalContent
}

const EMPTY_NEW_CONTENT: NewContentState = {
  OBSTACLE: {
    problem: '',
    root_cause: '',
    solution: '',
  },
  WIN: {
    description: '',
  },
  DECISION: {
    description: '',
    rationale: '',
  },
}

function normalizeContent(type: EntryType, content: unknown): JournalContent {
  const raw = typeof content === 'object' && content !== null ? (content as Record<string, unknown>) : {}

  if (type === 'OBSTACLE') {
    return {
      problem: typeof raw.problem === 'string' ? raw.problem : '',
      root_cause: typeof raw.root_cause === 'string' ? raw.root_cause : '',
      solution: typeof raw.solution === 'string' ? raw.solution : '',
    }
  }

  if (type === 'WIN') {
    return {
      description: typeof raw.description === 'string' ? raw.description : '',
    }
  }

  return {
    description: typeof raw.description === 'string' ? raw.description : '',
    rationale: typeof raw.rationale === 'string' ? raw.rationale : '',
  }
}

function isValidContent(content: JournalContent, type: EntryType) {
  if (type === 'OBSTACLE') {
    const obstacle = content as ObstacleContent
    return Boolean(obstacle.problem.trim() && obstacle.root_cause.trim() && obstacle.solution.trim())
  }

  if (type === 'WIN') {
    const win = content as WinContent
    return Boolean(win.description.trim())
  }

  const decision = content as DecisionContent
  return Boolean(decision.description.trim() && decision.rationale.trim())
}

export default function ProjectJournalPage() {
  const params = useParams()
  const projectId = params.id as string

  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])

  const [newType, setNewType] = useState<EntryType>('OBSTACLE')
  const [newStatus, setNewStatus] = useState<EntryStatus>('CONFIRMED')
  const [newMilestoneId, setNewMilestoneId] = useState('')
  const [newContent, setNewContent] = useState<NewContentState>(EMPTY_NEW_CONTENT)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const [editForm, setEditForm] = useState<EditFormState | null>(null)

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) {
        throw new Error('Failed to load milestones')
      }

      const project = (await res.json()) as ProjectApiResponse
      const allMilestones =
        project.phases?.flatMap((phase) =>
          phase.milestones?.map((milestone) => ({
            id: milestone.id,
            title: milestone.title,
            phaseId: phase.id,
          })) || [],
        ) || []

      setMilestones(allMilestones)
      setNewMilestoneId((prev) => {
        if (prev) {
          return prev
        }
        return allMilestones[0]?.id || ''
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load milestones')
    }
  }, [projectId])

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/journal?projectId=${projectId}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to load journal entries')
      }

      const data = (await res.json()) as JournalEntry[]
      setEntries(
        [...data].sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }),
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load journal entries')
    }
  }, [projectId])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      await Promise.all([fetchMilestones(), fetchEntries()])
    } finally {
      setLoading(false)
    }
  }, [fetchEntries, fetchMilestones])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function updateNewObstacleField(field: keyof ObstacleContent, value: string) {
    setNewContent((prev) => ({
      ...prev,
      OBSTACLE: {
        ...prev.OBSTACLE,
        [field]: value,
      },
    }))
  }

  function updateNewWinField(field: keyof WinContent, value: string) {
    setNewContent((prev) => ({
      ...prev,
      WIN: {
        ...prev.WIN,
        [field]: value,
      },
    }))
  }

  function updateNewDecisionField(field: keyof DecisionContent, value: string) {
    setNewContent((prev) => ({
      ...prev,
      DECISION: {
        ...prev.DECISION,
        [field]: value,
      },
    }))
  }

  function getNewEntryContent(): JournalContent {
    if (newType === 'OBSTACLE') {
      return newContent.OBSTACLE
    }

    if (newType === 'WIN') {
      return newContent.WIN
    }

    return newContent.DECISION
  }

  async function createEntry() {
    if (!newMilestoneId) {
      toast.error('Milestone is required')
      return
    }

    const content = getNewEntryContent()
    if (!isValidContent(content, newType)) {
      toast.error('Please complete all fields for this entry type')
      return
    }

    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          milestoneId: newMilestoneId,
          type: newType,
          status: newStatus,
          content,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create entry')
      }

      toast.success('Journal entry created')
      setNewContent(EMPTY_NEW_CONTENT)
      setNewStatus('CONFIRMED')
      setIsCreateDialogOpen(false)
      await fetchEntries()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create entry')
    }
  }

  function startEditing(entry: JournalEntry) {
    if (!entry.milestoneId) {
      toast.error('This entry has no milestone. Please recreate it with a milestone reference.')
      return
    }

    setEditForm({
      id: entry.id,
      type: entry.type,
      milestoneId: entry.milestoneId,
      status: entry.status,
      content: normalizeContent(entry.type, entry.content),
    })
  }

  function updateEditContent(value: JournalContent) {
    setEditForm((prev) => {
      if (!prev) {
        return prev
      }
      return {
        ...prev,
        content: value,
      }
    })
  }

  async function saveEdit() {
    if (!editForm) {
      return
    }

    if (!editForm.milestoneId) {
      toast.error('Milestone is required')
      return
    }

    if (!isValidContent(editForm.content, editForm.type)) {
      toast.error('Please complete all fields for this entry type')
      return
    }

    try {
      const res = await fetch(`/api/journal/${editForm.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          milestoneId: editForm.milestoneId,
          status: editForm.status,
          content: editForm.content,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update entry')
      }

      toast.success('Journal entry updated')
      setEditForm(null)
      await fetchEntries()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update entry')
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm('Are you sure you want to delete this journal entry?')) {
      return
    }

    try {
      const res = await fetch(`/api/journal/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete entry')
      }

      toast.success('Journal entry deleted')
      if (editForm?.id === id) {
        setEditForm(null)
      }
      await fetchEntries()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete entry')
    }
  }

  function getMilestoneTitle(entry: JournalEntry) {
    if (entry.milestone?.title) {
      return entry.milestone.title
    }
    if (!entry.milestoneId) {
      return 'No milestone'
    }
    return milestones.find((m) => m.id === entry.milestoneId)?.title || 'Unknown milestone'
  }

  function renderCreateEditors() {
    if (newType === 'OBSTACLE') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Problem</label>
            <MarkdownEditor
              value={newContent.OBSTACLE.problem}
              onChange={(value) => updateNewObstacleField('problem', value)}
              rows={6}
              placeholder="What problem happened?"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Root Cause</label>
            <MarkdownEditor
              value={newContent.OBSTACLE.root_cause}
              onChange={(value) => updateNewObstacleField('root_cause', value)}
              rows={6}
              placeholder="What caused this obstacle?"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Solution</label>
            <MarkdownEditor
              value={newContent.OBSTACLE.solution}
              onChange={(value) => updateNewObstacleField('solution', value)}
              rows={6}
              placeholder="How was the obstacle resolved?"
            />
          </div>
        </div>
      )
    }

    if (newType === 'WIN') {
      return (
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Description</label>
          <MarkdownEditor
            value={newContent.WIN.description}
            onChange={(value) => updateNewWinField('description', value)}
            rows={8}
            placeholder="Describe the win"
          />
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Description</label>
          <MarkdownEditor
            value={newContent.DECISION.description}
            onChange={(value) => updateNewDecisionField('description', value)}
            rows={6}
            placeholder="What decision was made?"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Rationale</label>
          <MarkdownEditor
            value={newContent.DECISION.rationale}
            onChange={(value) => updateNewDecisionField('rationale', value)}
            rows={6}
            placeholder="Why was this decision made?"
          />
        </div>
      </div>
    )
  }

  function renderEntryContent(type: EntryType, content: unknown) {
    const normalized = normalizeContent(type, content)

    if (type === 'OBSTACLE') {
      const obstacle = normalized as ObstacleContent
      return (
        <div className="space-y-4">
          <div>
            <h4 className="mb-1 text-sm font-medium text-slate-200">Problem</h4>
            <MarkdownBody value={obstacle.problem} />
          </div>
          <div>
            <h4 className="mb-1 text-sm font-medium text-slate-200">Root Cause</h4>
            <MarkdownBody value={obstacle.root_cause} />
          </div>
          <div>
            <h4 className="mb-1 text-sm font-medium text-slate-200">Solution</h4>
            <MarkdownBody value={obstacle.solution} />
          </div>
        </div>
      )
    }

    if (type === 'WIN') {
      const win = normalized as WinContent
      return (
        <div>
          <h4 className="mb-1 text-sm font-medium text-slate-200">Description</h4>
          <MarkdownBody value={win.description} />
        </div>
      )
    }

    const decision = normalized as DecisionContent
    return (
      <div className="space-y-4">
        <div>
          <h4 className="mb-1 text-sm font-medium text-slate-200">Description</h4>
          <MarkdownBody value={decision.description} />
        </div>
        <div>
          <h4 className="mb-1 text-sm font-medium text-slate-200">Rationale</h4>
          <MarkdownBody value={decision.rationale} />
        </div>
      </div>
    )
  }

  function renderEditEditors() {
    if (!editForm) {
      return null
    }

    if (editForm.type === 'OBSTACLE') {
      const content = editForm.content as ObstacleContent
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Problem</label>
            <MarkdownEditor
              value={content.problem}
              onChange={(value) =>
                updateEditContent({
                  ...content,
                  problem: value,
                })
              }
              rows={6}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Root Cause</label>
            <MarkdownEditor
              value={content.root_cause}
              onChange={(value) =>
                updateEditContent({
                  ...content,
                  root_cause: value,
                })
              }
              rows={6}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Solution</label>
            <MarkdownEditor
              value={content.solution}
              onChange={(value) =>
                updateEditContent({
                  ...content,
                  solution: value,
                })
              }
              rows={6}
            />
          </div>
        </div>
      )
    }

    if (editForm.type === 'WIN') {
      const content = editForm.content as WinContent
      return (
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Description</label>
          <MarkdownEditor
            value={content.description}
            onChange={(value) =>
              updateEditContent({
                ...content,
                description: value,
              })
            }
            rows={8}
          />
        </div>
      )
    }

    const content = editForm.content as DecisionContent
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Description</label>
          <MarkdownEditor
            value={content.description}
            onChange={(value) =>
              updateEditContent({
                ...content,
                description: value,
              })
            }
            rows={6}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Rationale</label>
          <MarkdownEditor
            value={content.rationale}
            onChange={(value) =>
              updateEditContent({
                ...content,
                rationale: value,
              })
            }
            rows={6}
          />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Journal</h1>
          <p className="mt-1 text-sm text-slate-400">Project journal and activity log</p>
        </div>
        <Card className="border-white/10 bg-white/5 p-8 text-center">
          <p className="text-sm text-slate-400">Loading...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0b1022] text-white sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Create Journal Entry</DialogTitle>
            <DialogDescription>
              Add a manual journal entry linked to a milestone.
            </DialogDescription>
          </DialogHeader>

          {milestones.length === 0 ? (
            <p className="text-sm text-slate-400">
              Please create a milestone first before adding journal entries.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Type</label>
                  <Select
                    value={newType}
                    onValueChange={(value) => setNewType(value as EntryType)}
                  >
                    <SelectTrigger className="w-full border-white/10 bg-white/5 text-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#0d1224] text-white">
                      {ENTRY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Milestone</label>
                  <Select
                    value={newMilestoneId}
                    onValueChange={setNewMilestoneId}
                  >
                    <SelectTrigger className="w-full border-white/10 bg-white/5 text-white">
                      <SelectValue placeholder="Select milestone" />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#0d1224] text-white">
                      {milestones.map((milestone) => (
                        <SelectItem key={milestone.id} value={milestone.id}>
                          {milestone.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Status</label>
                  <Select
                    value={newStatus}
                    onValueChange={(value) => setNewStatus(value as EntryStatus)}
                  >
                    <SelectTrigger className="w-full border-white/10 bg-white/5 text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#0d1224] text-white">
                      {ENTRY_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {renderCreateEditors()}

              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-white/10" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={createEntry}>
                  Create Entry
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editForm)} onOpenChange={(open) => { if (!open) setEditForm(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0b1022] text-white sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Edit Journal Entry</DialogTitle>
            <DialogDescription>
              Update milestone reference, status, and markdown content. Entry type is immutable.
            </DialogDescription>
          </DialogHeader>

          {editForm && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Type</label>
                  <input
                    value={editForm.type}
                    disabled
                    className="w-full rounded-md border border-white/10 bg-slate-900/40 px-3 py-2 text-sm text-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Milestone</label>
                  <Select
                    value={editForm.milestoneId}
                    onValueChange={(value) => setEditForm({ ...editForm, milestoneId: value })}
                  >
                    <SelectTrigger className="w-full border-white/10 bg-white/5 text-white">
                      <SelectValue placeholder="Select milestone" />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#0d1224] text-white">
                      {milestones.map((milestone) => (
                        <SelectItem key={milestone.id} value={milestone.id}>
                          {milestone.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Status</label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value) => setEditForm({ ...editForm, status: value as EntryStatus })}
                  >
                    <SelectTrigger className="w-full border-white/10 bg-white/5 text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="border-white/10 bg-[#0d1224] text-white">
                      {ENTRY_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {renderEditEditors()}

              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-white/10" onClick={() => setEditForm(null)}>
                  Cancel
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={saveEdit}>
                  Save
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Journal</h1>
          <p className="mt-1 text-sm text-slate-400">Create and maintain manual journal entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-white/10" onClick={() => setIsCreateDialogOpen(true)}>
            New Entry
          </Button>
          <Button
            variant="outline"
            className="border-white/10"
            onClick={async () => {
              await loadData()
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {entries.length === 0 ? (
          <Card className="border-white/10 bg-white/5 p-8 text-center">
            <p className="text-sm text-slate-400">No journal entries yet. Create your first one above.</p>
          </Card>
        ) : (
          entries.map((entry) => {
            return (
              <Card key={entry.id} className="space-y-4 border-white/10 bg-white/5 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-blue-500/20 px-2 py-1 text-blue-300">{entry.type}</span>
                    <span className="rounded-full bg-slate-500/20 px-2 py-1 text-slate-200">{entry.status}</span>
                    <span className="rounded-full bg-purple-500/20 px-2 py-1 text-purple-300">
                      {getMilestoneTitle(entry)}
                    </span>
                    <span className="rounded-full bg-slate-700/50 px-2 py-1 text-slate-300">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                    <span className="rounded-full bg-slate-700/50 px-2 py-1 text-slate-300">{entry.source}</span>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="border-white/10" onClick={() => startEditing(entry)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/40 text-red-300 hover:bg-red-500/10"
                      onClick={() => void deleteEntry(entry.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {renderEntryContent(entry.type, entry.content)}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

function MarkdownBody({ value }: { value: string }) {
  if (!value.trim()) {
    return <p className="text-sm text-slate-400">No content</p>
  }

  return (
    <div className="rounded-md border border-white/10 bg-[#0d1224] px-3 py-2 text-sm text-slate-100">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
    </div>
  )
}
