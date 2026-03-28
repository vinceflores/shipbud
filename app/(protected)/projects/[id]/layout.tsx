
'use client'

import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'

type ProjectPageLayoutProps = {
    children: React.ReactNode
}

const NAVIGATION_ITEMS = [
    { id: 'plan', label: 'Plan', href: '/projects/[id]/plan' },
    { id: 'journal', label: 'Journal', href: '/projects/[id]/journal' },
    { id: 'content', label: 'Content', href: '/projects/[id]/content' },
    { id: 'settings', label: 'Settings', href: '/projects/[id]/settings' },
]

export default function ProjectPageLayout({ children }: ProjectPageLayoutProps) {
    const params = useParams<{ id: string }>()
    const pathname = usePathname()
    const id = params.id

    // Determine active navigation item
    const getActiveTab = () => {
        if (pathname.includes('/plan')) return 'plan'
        if (pathname.includes('/journal')) return 'journal'
        if (pathname.includes('/content')) return 'content'
        if (pathname.includes('/settings')) return 'settings'
        return 'plan' // default
    }

    const activeTab = getActiveTab()

    return (
        <div className="min-h-screen bg-[#060812]">
            {/* Navigation Bar */}
            <nav className="border-b border-white/10 bg-[#0f1219]">
                <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
                    <div className="flex gap-2">
                        {NAVIGATION_ITEMS.map((item) => {
                            const href = item.href.replace('[id]', id)
                            const isActive = activeTab === item.id

                            return (
                                <Link
                                    key={item.id}
                                    href={href}
                                    className={`flex items-center px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap ${isActive
                                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                        : 'text-white/60 hover:text-white/80'
                                        }`}
                                >
                                    {item.label}
                                </Link>
                            )
                        })}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="mx-auto max-w-7xl px-6 py-12">
                {children}
            </main>
        </div>
    )
}