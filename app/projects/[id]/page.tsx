'use client'

import { useParams } from 'next/navigation'
import { useEffect } from 'react'

export default function ProjectPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  useEffect(() => {
    // Redirect to the plan page by default
    window.location.href = `/projects/${id}/plan`
  }, [id])

  return null
}
