export default function ProjectJournalPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Journal</h1>
        <p className="mt-1 text-sm text-slate-400">Project journal and activity log</p>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-sm text-slate-400">Journal entries and auto-draft confirmation will appear here</p>
      </div>
    </div>
  );
}
