import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-[#060812] text-white px-6 py-12">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-2 text-slate-400">Manage your application preferences.</p>
        </div>
      </div>
    </main>
  );
}
