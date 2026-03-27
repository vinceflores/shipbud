"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MarkdownEditorProps = {
    value: string;
    onChange: (value: string) => void;
    id?: string;
    placeholder?: string;
    rows?: number;
    className?: string;
};

export function MarkdownEditor({
    value,
    onChange,
    id,
    placeholder,
    rows = 8,
    className,
}: MarkdownEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMounted = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false,
    );
    const [mode, setMode] = useState<"write" | "preview">("preview");
    const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

    useEffect(() => {
        return () => {
            if (copyResetTimerRef.current) {
                clearTimeout(copyResetTimerRef.current);
            }
        };
    }, []);

    const hasContent = useMemo(() => value.trim().length > 0, [value]);

    function updateWithSelection(transform: (selected: string) => { text: string; selectionOffset?: number }) {
        const el = textareaRef.current;
        if (!el) {
            return;
        }

        const start = el.selectionStart;
        const end = el.selectionEnd;
        const selected = value.slice(start, end);
        const next = transform(selected);

        const newValue = value.slice(0, start) + next.text + value.slice(end);
        onChange(newValue);

        const cursor = start + (next.selectionOffset ?? next.text.length);
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(cursor, cursor);
        }, 0);
    }

    function insertAround(prefix: string, suffix: string) {
        updateWithSelection((selected) => {
            const body = selected || "text";
            return {
                text: `${prefix}${body}${suffix}`,
                selectionOffset: (prefix + body + suffix).length,
            };
        });
    }

    function insertPrefix(prefix: string) {
        updateWithSelection((selected) => {
            const body = selected || "item";
            return {
                text: `${prefix}${body}`,
                selectionOffset: (prefix + body).length,
            };
        });
    }

    function insertLink() {
        updateWithSelection((selected) => {
            const body = selected || "link text";
            const text = `[${body}](https://example.com)`;
            return {
                text,
                selectionOffset: text.length,
            };
        });
    }

    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText(value);
            setCopyState("copied");
        } catch {
            setCopyState("error");
        }

        if (copyResetTimerRef.current) {
            clearTimeout(copyResetTimerRef.current);
        }

        copyResetTimerRef.current = setTimeout(() => {
            setCopyState("idle");
        }, 1600);
    }

    return (
        <div className={cn("rounded-md border border-white/15 bg-[#0d1224]", className)}>
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
                <div className="flex items-center gap-1 rounded-md bg-black/20 p-1">
                    <Button size="xs" variant={mode === "write" ? "secondary" : "ghost"} type="button" onClick={() => setMode("write")}>
                        Write
                    </Button>
                    <Button size="xs" variant={mode === "preview" ? "secondary" : "ghost"} type="button" onClick={() => setMode("preview")}>
                        Preview
                    </Button>
                </div>

                <div className="h-4 w-px bg-white/10" />

                <div className="flex flex-wrap gap-1">
                    <Button size="xs" variant="ghost" type="button" onClick={() => insertAround("**", "**")}>B</Button>
                    <Button size="xs" variant="ghost" type="button" onClick={() => insertAround("*", "*")}>I</Button>
                    <Button size="xs" variant="ghost" type="button" onClick={() => insertPrefix("# ")}>H1</Button>
                    <Button size="xs" variant="ghost" type="button" onClick={() => insertPrefix("- ")}>List</Button>
                    <Button size="xs" variant="ghost" type="button" onClick={() => insertAround("`", "`")}>Code</Button>
                    <Button size="xs" variant="ghost" type="button" onClick={insertLink}>Link</Button>
                    <Button size="xs" variant="ghost" type="button" onClick={copyToClipboard}>
                        {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy failed" : "Copy"}
                    </Button>
                </div>
            </div>

            {(!isMounted || mode === "write") ? (
                <textarea
                    id={id}
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={rows}
                    className="w-full resize-y bg-transparent px-3 py-2 text-sm outline-none"
                />
            ) : (
                <div className="min-h-40 px-3 py-2 text-sm">
                    {hasContent ? (
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                h1: ({ children }) => <h1 className="mb-2 text-xl font-semibold">{children}</h1>,
                                h2: ({ children }) => <h2 className="mb-2 text-lg font-semibold">{children}</h2>,
                                h3: ({ children }) => <h3 className="mb-2 text-base font-semibold">{children}</h3>,
                                p: ({ children }) => <p className="mb-2 text-slate-100">{children}</p>,
                                ul: ({ children }) => <ul className="mb-2 list-inside list-disc">{children}</ul>,
                                ol: ({ children }) => <ol className="mb-2 list-inside list-decimal">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                code: ({ children }) => <code className="rounded bg-black/30 px-1 py-0.5 text-xs">{children}</code>,
                                a: ({ href, children }) => (
                                    <a className="text-blue-300 underline" href={href} target="_blank" rel="noreferrer">
                                        {children}
                                    </a>
                                ),
                            }}
                        >
                            {value}
                        </ReactMarkdown>
                    ) : (
                        <p className="text-slate-400">Nothing to preview yet.</p>
                    )}
                </div>
            )}
        </div>
    );
}
