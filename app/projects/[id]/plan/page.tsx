import { SDLCDocumentGenerator } from '@/components/sdlc-document-generator'

export default function ProjectPlanPage({
  params,
}: {
  params: { id: string };
}) {
  return <SDLCDocumentGenerator />
}
