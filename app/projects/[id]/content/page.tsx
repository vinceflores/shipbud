export default function ProjectContentPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Content</h1>
        <p className="mt-1 text-sm text-slate-400">Project content requests and draft editor</p>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-sm text-slate-400">Content requests and drafts will appear here</p>
      </div>
    </div>
  );
}
