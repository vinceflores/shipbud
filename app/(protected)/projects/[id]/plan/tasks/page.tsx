'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { toast } from 'sonner'

type Task = {
  id: string
  milestoneId: string
  title: string
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  source: string
  position: number
}

type Milestone = {
  id: string
  title: string
  phaseId: string
}

type ProjectTask = {
  id: string
  title: string
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  source: string
  position: number
}

type ProjectMilestone = {
  id: string
  title: string
  tasks?: ProjectTask[]
}

type ProjectPhase = {
  id: string
  milestones?: ProjectMilestone[]
}

type ProjectApiResponse = {
  phases?: ProjectPhase[]
}

const ITEM_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const
type ItemStatus = (typeof ITEM_STATUSES)[number]

export default function TasksPage() {
  const params = useParams()
  const projectId = params.id as string

  const [tasks, setTasks] = useState<Task[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editStatus, setEditStatus] = useState<'TODO' | 'IN_PROGRESS' | 'DONE'>('TODO')
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)
  const [newTask, setNewTask] = useState<{ title: string; milestoneId: string; status: ItemStatus }>(
    { title: '', milestoneId: '', status: 'TODO' },
  )

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) throw new Error('Failed to fetch project')
      const project: ProjectApiResponse = await res.json()
      const allMilestones =
        project.phases?.flatMap((phase) =>
          phase.milestones?.map((m) => ({ ...m, phaseId: phase.id })) || [],
        ) || []
      setMilestones(allMilestones)
      setNewTask((prev) => {
        if (prev.milestoneId || allMilestones.length === 0) {
          return prev
        }
        return { ...prev, milestoneId: allMilestones[0].id }
      })
    } catch (error) {
      toast.error('Failed to load milestones')
      console.error(error)
    }
  }, [projectId])

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}`)
      if (!res.ok) throw new Error('Failed to fetch project')
      const project: ProjectApiResponse = await res.json()
      const allTasks =
        project.phases?.flatMap((phase) =>
          phase.milestones?.flatMap((milestone) =>
            milestone.tasks?.map((t) => ({ ...t, milestoneId: milestone.id })) || [],
          ) || [],
        ) || []
      setTasks(allTasks.sort((a: Task, b: Task) => a.position - b.position))
    } catch (error) {
      toast.error('Failed to load tasks')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchMilestones()
    fetchTasks()
  }, [fetchMilestones, fetchTasks])

  const createTask = async () => {
    if (!newTask.title.trim() || !newTask.milestoneId) {
      toast.error('Title and milestone are required')
      return
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create task')
      }

      toast.success('Task created')
      setNewTask({ title: '', milestoneId: milestones[0]?.id || '', status: 'TODO' })
      setIsCreateSheetOpen(false)
      fetchTasks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
    }
  }

  const updateTask = async (id: string) => {
    if (!editTitle.trim()) {
      toast.error('Title is required')
      return
    }

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, status: editStatus }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update task')
      }

      toast.success('Task updated')
      setEditingId(null)
      fetchTasks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update task')
    }
  }

  const deleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete task')
      }

      toast.success('Task deleted')
      fetchTasks()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete task')
    }
  }

  const startEditing = (task: Task) => {
    setEditingId(task.id)
    setEditTitle(task.title)
    setEditStatus(task.status)
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

  const getMilestoneTitle = (milestoneId: string) => {
    return milestones.find(m => m.id === milestoneId)?.title || 'Unknown'
  }

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tasks</h1>
          <p className="mt-1 text-sm text-slate-400">Manage project tasks</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto border-white/10 bg-[#0b1022] text-white sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>Create New Task</SheetTitle>
            <SheetDescription>
              Add a task and link it to a milestone.
            </SheetDescription>
          </SheetHeader>

          {milestones.length === 0 ? (
            <p className="px-4 text-sm text-slate-400">Please create a milestone first before adding tasks.</p>
          ) : (
            <div className="space-y-4 px-4 pb-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Task Title</label>
                <input
                  type="text"
                  placeholder="Task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400"
                  onKeyDown={(e) => e.key === 'Enter' && createTask()}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300">Milestone</label>
                <Select value={newTask.milestoneId} onValueChange={(value) => setNewTask({ ...newTask, milestoneId: value })}>
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
                  value={newTask.status}
                  onValueChange={(value) =>
                    setNewTask({
                      ...newTask,
                      status: value as (typeof ITEM_STATUSES)[number],
                    })
                  }
                >
                  <SelectTrigger className="w-full border-white/10 bg-white/5 text-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#0d1224] text-white">
                    {ITEM_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-white/10" onClick={() => setIsCreateSheetOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createTask} className="bg-blue-600 hover:bg-blue-700">
                  Create
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tasks</h1>
          <p className="mt-1 text-sm text-slate-400">Manage project tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-white/10" onClick={() => setIsCreateSheetOpen(true)}>
            New Task
          </Button>
          <Button
            variant="outline"
            className="border-white/10"
            onClick={async () => {
              await Promise.all([fetchMilestones(), fetchTasks()])
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <Card className="border-white/10 bg-white/5 p-8 text-center">
            <p className="text-sm text-slate-400">No tasks yet. Create one above.</p>
          </Card>
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="border-white/10 bg-white/5 p-4">
              {editingId === task.id ? (
                <div className="flex gap-3 items-center flex-wrap">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 min-w-50 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                    onKeyDown={(e) => e.key === 'Enter' && updateTask(task.id)}
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
                  <Button onClick={() => updateTask(task.id)} size="sm" className="bg-green-600 hover:bg-green-700">
                    Save
                  </Button>
                  <Button onClick={cancelEditing} size="sm" variant="outline" className="border-white/10">
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{task.title}</h3>
                    <div className="flex gap-2 mt-2 text-xs text-slate-400">
                      <span className={`px-2 py-1 rounded-full ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                        {getMilestoneTitle(task.milestoneId)}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-slate-700/50">
                        Position: {task.position}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-slate-700/50">
                        {task.source}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => startEditing(task)} size="sm" variant="outline" className="border-white/10">
                      Edit
                    </Button>
                    <Button onClick={() => deleteTask(task.id)} size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
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
