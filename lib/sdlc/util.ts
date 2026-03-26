export const getSessionId = () => {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("req_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("req_session_id", id);
  }
  return id;
};

export type ParsedFunctionalRequirement = {
  id: string;
  name: string;
  description?: string;
};

const FR_ID_RE = /^FR-(\d{3})$/;

export function parseFunctionalRequirementsFromMarkdown(
  requirementsMarkdown: string
): ParsedFunctionalRequirement[] {
  const text = requirementsMarkdown ?? "";
  if (!text.trim()) return [];

  const lines = text.split(/\r?\n/);

  const results: ParsedFunctionalRequirement[] = [];
  const seen = new Set<string>();

  let inFunctionalSection = false;
  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Section toggles
    if (line.startsWith("## ")) {
      inFunctionalSection = line.toLowerCase() === "## functional requirements";
      continue;
    }
    if (!inFunctionalSection) continue;

    // Match the UI's formatter:
    // - **FR-001 (P1) — Title**: Description
    // Also tolerate variants without priority and/or description.
    const m = line.match(
      /^-\s*\*\*(FR-\d{3})(?:\s*\(P\d+\))?\s*(?:—\s*([^*]+?))?\*\*\s*(?::\s*(.*))?$/
    );
    if (!m) continue;

    const id = m[1].trim();
    if (!FR_ID_RE.test(id)) continue;
    if (seen.has(id)) continue;

    const name = (m[2] ?? "").trim() || id;
    const description = (m[3] ?? "").trim();

    results.push({
      id,
      name,
      description: description || undefined,
    });
    seen.add(id);
  }

  return results;
}