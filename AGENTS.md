# Pensieve (PKMS) - Agent Instructions

Please refer to `README.md`, `INSTALL.md`, and `docs/` for project-specific background and historical design notes.
This `AGENTS.md`/`CLAUDE.md` is specifically for ground rules, workflow, and repo conventions for agents.

Note: `CLAUDE.md` is a symlink to `AGENTS.md` so Claude- and Codex-style agents use the same instructions.

## Project Overview

Pensieve is a personal knowledge management system (PKMS): a local-first notebook/wiki with inline-editing experiments and sync/connectors.

## Start Here (context loading)

- Read `docs/PKMS-ARCHITECTURE.md` (current target architecture)
- Read `docs/PLAN-2026.md` (reboot plan + milestones)
- Optional background: `docs/ANALYSIS-legacy.md` (what exists today; what’s obsolete)

## Operating Rules

- **Assume content is private**: do not add telemetry, external services, or new network dependencies unless explicitly requested.
- **Plain-text first**: prefer Markdown / JSON / SQLite over binary formats; keep diffs readable.
- **Preserve user knowledge**: do not mass-rewrite/reformat/rename content or notes unless asked.
- **Be conservative with legacy code**: prefer small, incremental changes; avoid broad refactors unless the task is explicitly modernization.
- **Avoid secrets**: never commit API keys/tokens; keep credentials in environment variables or untracked local files.
- **Don’t run sync jobs by default**: `sync/` scripts may require credentials and can modify external accounts; run only with explicit user direction.

## Key Directories

```
pensieve/
├── server/          # Tornado prototype (templates/, static/, save.json)
├── js/              # Editor experiments + bundling helpers (browserify/watchify)
├── connector/       # Connectors (e.g., Zotero exploration)
├── sync/            # Sync prototypes (e.g., Reddit scripts)
├── docs/            # Historical design notes + links
├── reference/       # Vendored/reference projects
└── _old/            # Archived code (avoid touching unless requested)
```

## Dev Quickstart (best-effort; may be stale)

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt

# Tornado server (serves http://localhost:11111/)
python server/app.py
```

JS bundle workflow (if needed):
```bash
cd js
npm install
npx browserify test.js -o test_bundle.js
```

## Repo Hygiene

- Keep filenames ASCII; prefer `kebab-case` for new files.
- Avoid committing large binaries (images/video/db dumps) unless explicitly requested; add to `.gitignore` when appropriate.
- Prefer additive changes; if something must be removed/renamed, coordinate with the user first.

## Integration Notes

If you’re asked to do rigorous claim/source analysis, prefer using the dedicated tooling in `../realitycheck/` rather than re-implementing analysis logic inside this repo.
