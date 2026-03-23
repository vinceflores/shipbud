export default function ProjectContentPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="min-h-screen bg-[#060812] text-white px-6 py-12">
      <h1 className="text-2xl font-semibold">
        Project {params.id} Content
      </h1>
      <p className="text-slate-400 mt-2">
        Placeholder page for pro-gated content requests + draft editor.
      </p>
    </main>
  );
}
