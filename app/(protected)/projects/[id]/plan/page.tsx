import { SDLCDocumentGenerator } from '@/components/sdlc-document-generator'

export default async function ProjectPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params
  return (
    <div>
      <SDLCDocumentGenerator projectId={id} />
    </div>
  )
}
