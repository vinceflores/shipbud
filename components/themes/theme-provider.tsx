"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"

type ThemeContextValue = {
    theme: Theme
    resolvedTheme: "light" | "dark"
    setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function getSystemTheme(): "light" | "dark" {
    if (typeof window === "undefined") return "light"
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyHtmlClass(resolved: "light" | "dark") {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolved)
}

export function ThemeProvider({
    children,
    defaultTheme = "system",
}: {
    children: React.ReactNode
    defaultTheme?: Theme
}) {
    const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
    const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light")

    React.useEffect(() => {
        const saved = window.localStorage.getItem("theme") as Theme | null
        if (saved === "light" || saved === "dark" || saved === "system") {
            setThemeState(saved)
        }
    }, [])

    React.useEffect(() => {
        const resolved = theme === "system" ? getSystemTheme() : theme
        setResolvedTheme(resolved)
        applyHtmlClass(resolved)
        window.localStorage.setItem("theme", theme)

        if (theme !== "system") return

        const mql = window.matchMedia?.("(prefers-color-scheme: dark)")
        if (!mql) return

        const onChange = () => {
            const nextResolved = getSystemTheme()
            setResolvedTheme(nextResolved)
            applyHtmlClass(nextResolved)
        }

        mql.addEventListener?.("change", onChange)
        return () => mql.removeEventListener?.("change", onChange)
    }, [theme])

    const setTheme = React.useCallback((t: Theme) => {
        setThemeState(t)
    }, [])

    const value = React.useMemo<ThemeContextValue>(
        () => ({ theme, resolvedTheme, setTheme }),
        [theme, resolvedTheme, setTheme]
    )

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    const ctx = React.useContext(ThemeContext)
    if (!ctx) {
        return {
            theme: "system" as const,
            resolvedTheme: "light" as const,
            setTheme: (_t: Theme) => { },
        }
    }
    return ctx
}