import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { auth0 } from "@/lib/auth0";
import { ModeToggle } from "@/components/themes/toggle-dark-button";
import UserButton from "@/components/auth0/user-button";
import { Button } from "@/components/ui/button";

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth0.getSession();

    if (!session?.user) {
        redirect("/auth/login");
    }

    return (
        <div className="min-h-screen bg-[#060812] text-white">
            <header className="border-b border-white/10 bg-[#060812] text-white">
                <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
                    <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
                        Shipbud
                    </Link>

                    <div className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="icon-sm">
                            <Link href="/settings" aria-label="Settings">
                                <Settings />
                            </Link>
                        </Button>
                        <ModeToggle />
                        <UserButton user={session.user} logoutUrl="/auth/logout" />
                    </div>
                </nav>
            </header>

            <main>{children}</main>
        </div>
    );
}
