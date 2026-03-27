'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

type Milestone = {
  id: string
  phaseId: string
  title: string
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  source: string
  position: number
}

type Phase = {
  id: string
  title: string
}

type ProjectMilestone = {
  id: string
  title: string
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  source: string
  position: number
}

type ProjectPhase = {
  id: string
  title: string
  milestones?: ProjectMilestone[]
}

type ProjectApiResponse = {
  phases?: ProjectPhase[]
}

const ITEM_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const
type ItemStatus = (typeof ITEM_STATUSES)[number]

export default function MilestonesPage() {
  const params = useParams()
  const projectId = params.id as string

  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editStatus, setEditStatus] = useState<'TODO' | 'IN_PROGRESS' | 'DONE'>('TODO')
  const [newMilestone, setNewMilestone] = useState<{ title: string; phaseId: string; status: ItemStatus }>(
    { title: '', phaseId: '', status: 'TODO' },
  )

  useEffect(() => {
    fetchPhases()
    fetchMilestones()
  }, [projectId])

  const fetchPhases = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) throw new Error('Failed to fetch project')
      const project: ProjectApiResponse = await res.json()
      const projectPhases = project.phases ?? []
      setPhases(projectPhases)
      if (projectPhases.length > 0 && !newMilestone.phaseId) {
        setNewMilestone((prev) => ({ ...prev, phaseId: projectPhases[0].id }))
      }
    } catch (error) {
      toast.error('Failed to load phases')
      console.error(error)
    }
  }

  const fetchMilestones = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) throw new Error('Failed to fetch project')
      const project: ProjectApiResponse = await res.json()
      const allMilestones =
        project.phases?.flatMap((phase) =>
          phase.milestones?.map((m) => ({ ...m, phaseId: phase.id })) || [],
        ) || []
      setMilestones(allMilestones.sort((a: Milestone, b: Milestone) => a.position - b.position))
    } catch (error) {
      toast.error('Failed to load milestones')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const createMilestone = async () => {
    if (phases.length === 0) {
      toast.error('Create a phase first')
      return
    }
    if (!newMilestone.title.trim() || !newMilestone.phaseId) {
      toast.error('Title and phase are required')
      return
    }

    try {
      const res = await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMilestone),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create milestone')
      }

      toast.success('Milestone created')
      setNewMilestone({ title: '', phaseId: phases[0]?.id || '', status: 'TODO' })
      fetchMilestones()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create milestone')
    }
  }

  const updateMilestone = async (id: string) => {
    if (!editTitle.trim()) {
      toast.error('Title is required')
      return
    }

    try {
      const res = await fetch(`/api/milestones/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, status: editStatus }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update milestone')
      }

      toast.success('Milestone updated')
      setEditingId(null)
      fetchMilestones()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update milestone')
    }
  }

  const deleteMilestone = async (id: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return

    try {
      const res = await fetch(`/api/milestones/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete milestone')
      }

      toast.success('Milestone deleted')
      fetchMilestones()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete milestone')
    }
  }

  const startEditing = (milestone: Milestone) => {
    setEditingId(milestone.id)
    setEditTitle(milestone.title)
    setEditStatus(milestone.status)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditTitle('')
    setEditStatus('TODO')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'bg-slate-500/20 text-slate-300'
      case 'IN_PROGRESS': return 'bg-blue-500/20 text-blue-300'
      case 'DONE': return 'bg-green-500/20 text-green-300'
      default: return 'bg-slate-500/20 text-slate-300'
    }
  }

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Milestones</h1>
          <p className="mt-1 text-sm text-slate-400">Manage project milestones</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Milestones</h1>
          <p className="mt-1 text-sm text-slate-400">Manage project milestones</p>
        </div>
        <Button
          variant="outline"
          className="border-white/10"
          onClick={async () => {
            await Promise.all([fetchPhases(), fetchMilestones()])
          }}
        >
          Refresh
        </Button>
      </div>

      {/* Create New Milestone */}
      <Card className="border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-medium text-white mb-4">Create New Milestone</h2>
        {phases.length === 0 ? (
          <div className="rounded-md border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-300">No phases exist for this project yet.</p>
            <p className="mt-1 text-sm text-slate-400">
              Generate a plan first from the Overview tab, then come back to add milestones.
            </p>
          </div>
        ) : null}
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Milestone title"
            value={newMilestone.title}
            onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
            disabled={phases.length === 0}
            className="flex-1 min-w-[200px] rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400"
            onKeyDown={(e) => e.key === 'Enter' && createMilestone()}
          />
          <select
            value={newMilestone.phaseId}
            onChange={(e) => setNewMilestone({ ...newMilestone, phaseId: e.target.value })}
            disabled={phases.length === 0}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            {phases.map(phase => (
              <option key={phase.id} value={phase.id}>{phase.title}</option>
            ))}
          </select>
          <select
            value={newMilestone.status}
            onChange={(e) =>
              setNewMilestone({
                ...newMilestone,
                status: e.target.value as (typeof ITEM_STATUSES)[number],
              })
            }
            disabled={phases.length === 0}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            {ITEM_STATUSES.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <Button onClick={createMilestone} disabled={phases.length === 0} className="bg-blue-600 hover:bg-blue-700">
            Create
          </Button>
        </div>
      </Card>

      {/* Milestones List */}
      <div className="space-y-3">
        {milestones.length === 0 ? (
          <Card className="border-white/10 bg-white/5 p-8 text-center">
            <p className="text-sm text-slate-400">No milestones yet. Create one above.</p>
          </Card>
        ) : (
          milestones.map((milestone) => (
            <Card key={milestone.id} className="border-white/10 bg-white/5 p-4">
              {editingId === milestone.id ? (
                <div className="flex gap-3 items-center flex-wrap">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 min-w-[200px] rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                    onKeyDown={(e) => e.key === 'Enter' && updateMilestone(milestone.id)}
                  />
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as (typeof ITEM_STATUSES)[number])}
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  >
                    {ITEM_STATUSES.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <Button onClick={() => updateMilestone(milestone.id)} size="sm" className="bg-green-600 hover:bg-green-700">
                    Save
                  </Button>
                  <Button onClick={cancelEditing} size="sm" variant="outline" className="border-white/10">
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{milestone.title}</h3>
                    <div className="flex gap-2 mt-2 text-xs text-slate-400">
                      <span className={`px-2 py-1 rounded-full ${getStatusColor(milestone.status)}`}>
                        {milestone.status}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-slate-700/50">
                        Position: {milestone.position}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-slate-700/50">
                        {milestone.source}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => startEditing(milestone)} size="sm" variant="outline" className="border-white/10">
                      Edit
                    </Button>
                    <Button onClick={() => deleteMilestone(milestone.id)} size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
