'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MarkdownEditor } from '@/components/ui/markdown-editor'
import { toast } from 'sonner'
import { Bot, Loader2, Trash2 } from 'lucide-react'

type ContentFormat = 'TWITTER_POST' | 'README' | 'BUILD_STORY' | 'OBSTACLE_POST'

type ContentDraft = {
  id: string
  contentRequestId: string
  format: ContentFormat
  body: string
  editedBody: string | null
  status: 'DRAFT' | 'EDITED' | 'EXPORTED'
  requestedAt: string
  source: string
}

export default function ProjectContentPage() {
  const params = useParams()
  const projectId = params.id as string

  const [drafts, setDrafts] = useState<ContentDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<ContentFormat>('TWITTER_POST')

  const fetchDrafts = useCallback(async () => {
    try {
      const res = await fetch(`/api/content/drafts?projectId=${projectId}`)
      if (!res.ok) throw new Error('Failed to load drafts')
      const data = await res.json()
      setDrafts(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void fetchDrafts()
  }, [fetchDrafts])

  const generateContent = async () => {
    try {
      setIsGenerating(true)
      const res = await fetch('/api/content/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, build_format: selectedFormat })
      })

      if (!res.ok) {
        let errMsg = 'Failed to generate content'
        try {
          const e = await res.json()
          errMsg = e.error || errMsg
        } catch { }
        throw new Error(errMsg)
      }

      toast.success('Content generated successfully!')
      await fetchDrafts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate content')
    } finally {
      setIsGenerating(false)
    }
  }

  const saveEdit = async (id: string, newBody: string) => {
    try {
      const res = await fetch(`/api/content/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedBody: newBody })
      })

      if (!res.ok) throw new Error('Failed to save draft')
      toast.success('Draft saved')
      await fetchDrafts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save draft')
    }
  }

  const deleteDraft = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return
    try {
      const res = await fetch(`/api/content/drafts/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete draft')
      toast.success('Draft deleted')
      await fetchDrafts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete draft')
    }
  }

  if (loading) {
    return <div className="text-slate-400">Loading...</div>
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Content</h1>
          <p className="mt-1 text-sm text-slate-400">Generate and edit project content automatically via n8n.</p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedFormat}
            onValueChange={(val) => setSelectedFormat(val as ContentFormat)}
          >
            <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent className="bg-[#0d1224] border-white/10 text-white">
              <SelectItem value="TWITTER_POST">Twitter Post</SelectItem>
              <SelectItem value="README">README</SelectItem>
              <SelectItem value="BUILD_STORY">Build Story</SelectItem>
              <SelectItem value="OBSTACLE_POST">Obstacle Post</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={generateContent}
            disabled={isGenerating}
            className="bg-violet-600 hover:bg-violet-500 text-white"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Bot className="w-4 h-4 mr-2" />
            )}
            Auto-Draft
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {drafts.length === 0 ? (
          <Card className="border-white/10 bg-white/5 p-8 text-center">
            <p className="text-sm text-slate-400">No content drafts yet. Generate your first one above.</p>
          </Card>
        ) : (
          drafts.map((draft) => (
            <Card key={draft.id} className="border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-violet-300 bg-violet-500/20 px-2 py-1 rounded-full">
                    {draft.format.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(draft.requestedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {draft.status === 'EDITED' && (
                    <span className="text-xs text-amber-300 bg-amber-500/20 px-2 py-1 rounded-full">
                      Edited
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                    onClick={() => deleteDraft(draft.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <MarkdownEditor
                value={draft.editedBody || draft.body}
                onChange={(val) => saveEdit(draft.id, val)}
                rows={10}
                placeholder="Content is empty..."
              />
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
