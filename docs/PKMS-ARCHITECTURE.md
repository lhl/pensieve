# Pensieve PKMS Architecture

*Created: 2026-02-01*  
*Status: Draft*

## 0) Problem statement

We have tens of thousands (eventually hundreds of thousands) of legacy notes and resources spread across multiple Git repos (private/public/shared). We want a local-first PKMS that:

- Keeps the original information available and organized (not “AI rewritten”)
- Supports fast search (keyword + semantic) and lightweight knowledge-graph navigation
- Supports an “inbox → triage → organized” workflow for ingesting legacy data
- Supports selective publishing (notes → digital garden), likely via `randomfoo.net`
- Can be operated (in part) by an agent/daemon for reminders and time-sensitive workflows

## 1) Core principles

### 1.1 Canonical vs derived

- **Canonical store:** plain files in Git repos (primarily Markdown) for durability, versioning, portability, and selective sharing.
- **Derived stores (rebuildable caches):** LanceDB (embeddings + search index) and other computed artifacts (chunking, link graph, entity extraction, etc).
- **Rule:** if it can be regenerated, it should not be canonical.

### 1.2 AI assistance without content takeover

Pensieve is primarily an *availability + organization* system.

- AI may propose tags, links, filing location, titles, brief summaries, and reminders.
- AI should not silently rewrite canonical notes.
- AI output should be stored as **separate, attributable metadata** (or drafts) until accepted by the user.

### 1.3 Multi-repo by design

The system must support multiple repos (“vaults”) because we will always have:
- private material (raw inbox, sensitive notes)
- shared/collaborative material
- public/publishable material

However, we may still choose to have **one primary “everything” vault** (the “rest of life” second-brain repo) and treat other repos as:
- publish targets (static output)
- legacy sources to ingest/migrate
- smaller “public vault” mirrors where safety boundaries matter

### 1.4 Repo roles (meta vs vault vs publish)

Recommended separation of concerns:

- **Meta repo (this repo, `pensieve/`)**: code + docs + schemas + local tooling. Keep it small; do not store the full knowledge base here.
- **Primary vault repo (recommended)**: canonical “everything” repo (notes/resources/inbox/streams). This is the default place for writing and organizing.
- **Aux vault repos (optional)**: additional vaults for collaboration boundaries, experiments, or material that must stay separate.
- **Publish repos/sites (e.g. `randomfoo.net/`, `leonardlin.com/`)**: rendered static outputs + redirect configs, built from vault content.

## 2) Conceptual model

### 2.1 Entities (canonical)

At minimum:

- **Note**: a Markdown document (authored or ingested)
- **Resource**: a URL or external artifact with metadata (can be a Markdown stub pointing to the external object)
- **Attachment**: a file referenced by a Note/Resource (PDF, image, audio, etc)
- **Event**: a record in a high-volume activity stream (e.g., Reddit save/upvote/comment), usually stored as JSONL
- **Task/Reminder**: time-sensitive items (may be Notes with structured fields)

### 2.2 Graph edges (derived, but anchored in canon)

Edges are computed from canonical content:

- explicit links: `[[...]]`, markdown links, URL refs
- inferred links: embedding similarity, shared entities/tags, “same source” grouping

Canonical text should contain explicit links when the user decides they matter; inferred links are helpful suggestions and navigation.

## 3) Canonical storage format

### 3.1 Markdown + YAML frontmatter (recommended default)

Each note should have stable identifiers and human-authored metadata in YAML frontmatter. Example:

```md
---
id: 01HPKMS9K3W6J9R5TQ0X8H0Z2A   # ULID (globally unique)
title: Canonical vs derived stores
created: 2026-02-01
tags: [pkms, architecture]
visibility: private              # private | shared | public | unlisted
source:
  kind: manual                   # manual | import | clip | email | rss | etc
  uri: null
---
```

Notes:
- Prefer **ULID** (or UUIDv7) for lexicographic sort + global uniqueness across vaults.
- Avoid writing `updated:` on every edit (diff noise); derive it from git history or file mtimes during indexing.
- Keep metadata small and stable; everything else can be derived.

### 3.2 Sidecars for non-Markdown

For binary/opaque resources, prefer a sidecar metadata file:

```
attachments/
  paper.pdf
  paper.pdf.meta.yaml
```

This keeps canonical metadata in git while allowing the binary to be:
- in git (small files)
- in Git LFS
- or stored outside git with only references tracked (depending on repo policy)

### 3.3 Vault configuration

Each vault repo should declare its identity + indexing rules in a small config file (example name: `vault.yaml`):

```yaml
vault_id: lhl-private
default_visibility: private
include:
  - notes/**/*.md
  - inbox/**/*.md
exclude:
  - "**/.venv/**"
  - "**/node_modules/**"
```

The indexer uses `vault_id` + canonical `id` as stable keys.

## 4) Ingest pipeline (legacy → inbox → organized)

### 4.1 Stages

1. **Acquire**: pull/export from external systems (Reddit, Pocket, Zotero, email, filesystems, etc).
2. **Normalize**: store canonical “inbox items” with stable IDs, original timestamps, and raw source preserved.
3. **Triage** (human + agent): tag, link, decide visibility, decide destination, optionally add a short human summary.
4. **Promote**: move from `inbox/` to `notes/` (and/or to another vault repo) once “good enough”.

### 4.2 Inbox item design

Inbox should bias toward “capture first, perfect later”:
- store the raw text/HTML + a cleaned markdown representation (if available)
- keep original source URIs and timestamps
- do not require a perfect taxonomy at ingest time

### 4.3 Collected vs authored content (separation)

We need clear separation between:
- **Collected**: digital exhaust, bookmarks, clips, imported artifacts
- **Authored**: notes we write, project docs, plans, decisions, tasks

Recommended approach (use both):

1) **Directory conventions** (fast to reason about):

```
inbox/                # newly ingested, untriaged
streams/              # high-volume append-only activity/event logs (JSONL)
resources/            # bookmarks/clips/articles (Markdown stubs)
notes/                # authored notes
projects/             # project hubs + working notes
attachments/          # optional (or per-area attachments/)
```

2) **Canonical metadata** (filterable in search/index):
- `kind`: `note | project | resource | clip | event | task`
- `source.kind`: `manual | import | clip | stream`
- `source.system`: `reddit | pocket | zotero | email | rss | filesystem | …`
- `visibility`: `private | shared | public | unlisted`
- `status` (optional): `inbox | active | archived | published`

Search/index must treat `kind`/`source.*` as first-class facets so we can query:
- “only authored notes”
- “only collected resources”
- “only reddit activity”
- “everything”

### 4.4 attention-export integration (digital exhaust ingest)

`attention-export` is an upstream acquisition repo (export scripts + raw dumps). Pensieve should ingest from it into vaults via importers:

- **Do not treat raw export directories as canonical PKMS state** (formats change).
- Instead, create canonical inbox/stream artifacts with a stable schema and IDs.

Two canonical outputs are useful:

1) **High-volume activity → event streams (`streams/*.jsonl`)**
   - Examples: reddit upvotes/saves, comment history, Pocket saves, feed items.
   - Store as append-only JSONL for scale (100k+ events without 100k markdown files).

2) **Promotable items → resource stubs (`resources/*.md`)**
   - Examples: a particularly important saved post/article.
   - Create a Markdown stub that can be tagged/linked/published.

Event record example (JSONL line):
```json
{
  "id": "01HPKMSEVENT7J4C6J0V0Y0H0T1",
  "kind": "event",
  "source": {"system": "reddit", "type": "saved", "external_id": "t3_abc123"},
  "created": "2020-05-01T12:34:56Z",
  "uri": "https://www.reddit.com/r/.../comments/abc123/...",
  "title": "Post title (if available)",
  "text": "best-effort extracted text (optional)",
  "raw_ref": "raw/reddit/saved/2020-05.json"
}
```

### 4.5 Bookmarking + ArchiveBox-style snapshotting

We want “bookmark + preserve” behavior:
- store the URL + metadata canonically
- optionally snapshot the page for long-term access and offline search

Recommended pattern:

- Canonical: a `resources/*.md` stub with frontmatter including `url:` and `snapshot:` metadata.
- Snapshot storage: a separate **archive store** (often too large/noisy for git), e.g. managed by ArchiveBox, with stable IDs.
- Derived: extract snapshot text for indexing/embeddings (rebuildable).

Frontmatter sketch:
```yaml
url: https://example.com/post
snapshot:
  provider: archivebox
  status: pending        # pending | ok | failed
  archive_id: "20260201153000"
  captured: null
```

Key requirement: search can filter “has snapshot”, and can search either:
- the canonical stub text/notes
- the extracted snapshot text (derived)

## 5) Indexing + search (LanceDB)

### 5.1 What goes into LanceDB (derived)

Store:
- document metadata (id, vault_id, path, title, tags, visibility, created)
- chunk text + embeddings
- link graph edges (from/to IDs, link types)
- optional enrichments: entities, topics, summaries, dedupe fingerprints

### 5.2 Incremental indexing strategy

To scale to 100k+ notes:
- compute a content hash per file and only re-embed changed content
- record last indexed commit/hash per vault
- store a per-vault manifest in LanceDB (or a local cache) so re-index is fast

### 5.3 Query model

Search should combine:
- keyword (title/tags/path/body)
- semantic (embedding similarity)
- filters (vault, visibility, tags, time range, type)

### 5.4 Deployment topology: always-on services + local-first clients

We likely want **both**, and we want **desktop/web/mobile as first-class citizens**.

- **Always-on services** (internet-accessible): continuous ingest, snapshotting (ArchiveBox-style), scheduled jobs, publishing builds.
- **Local-first clients** (offline-capable): note entry/editing, on-device search, daily reference, quick capture.

### Always-on services (server-side responsibilities)

Good candidates to run on a server:
- Snapshotting (bookmark URL → archived copy + extracted text)
- Periodic “digital exhaust” ingestion from accounts/APIs
- Heavy enrichment jobs (batch embeddings, entity extraction)
- Publishing builds + redirect generation + deploy

Server outputs should flow into:
- canonical vault repo content (commits/PRs), and/or
- rebuildable derived stores (LanceDB indexes, extracted snapshot text caches)

### Local-first clients (device-side responsibilities)

On each device we want:
- local copy of canonical notes/tasks (so they’re usable offline)
- a local search index (at minimum keyword; ideally semantic too)
- a way to create capture/triage actions offline (which later sync and get processed)

#### Practical offline tiers (to keep mobile feasible)

Given 100k+ items, “sync everything with full-text + vectors everywhere” may be too heavy on phones. A pragmatic tiering:

- **Tier 0 (always):** tasks + inbox/outbox + recent items
- **Tier 1 (always):** global metadata (titles/tags/URLs/IDs) for fast filterable search
- **Tier 2 (selective):** full text + attachments + vectors for “offline packs” (pinned projects, active areas)

### Capture UX: intents/shortcuts + notifications

The highest-leverage “first-class client” capabilities are capture and recall:

- **Share/intent capture:** URL/text/file → create inbox item (and optionally trigger snapshotting)
- **Quick actions / command palette:** “file to project”, “set visibility”, “add tag”, “remind me”
- **Notifications:** reminders, “triage queue is growing”, ingest/snapshot completion, publish status

We should prefer minimal user friction: 1–2 taps from “I saw a thing” to “it’s safely captured”.

### Sync + queue (“outbox”) pattern

To support offline capture while still leveraging server-side jobs, use an explicit outbox:

- Canonical “requests” are written locally (while offline) into a queue directory/file in the vault repo.
- When connectivity returns, those requests sync to the server and get processed deterministically.
- Results are written back as new canonical artifacts (inbox items, resource stubs, task updates) and/or derived indexes.

This can be implemented with:
- git-based sync (simplest for text artifacts), plus
- a small job runner on the server that processes new request files idempotently.

### PWA/offline framework (to be selected)

If we build a PWA client, it will need:
- offline storage (IndexedDB) + background sync
- an “outbox” queue for offline actions
- conflict handling for edits

We should do a dedicated landscape review (see `docs/RESEARCH-2026-landscape.md`) before choosing:
- **Client strategy:** PWA-first vs Expo/React Native (single codebase across iOS/Android/Web) vs hybrid
- “git-first” sync vs “local-first DB replication” (CRDT/replication frameworks)
- how much semantic search is required on-device vs via server when online

## 6) Selective publishing (notes → digital garden)

### 6.1 Requirements

- Publish a subset of notes/resources to a public site without leaking private info.
- Support multiple publication targets (e.g. `randomfoo.net`, `leonardlin.com`, legacy gardens).
- Maintain stable URLs (prefer `id`-based permalinks or explicit `permalink:` metadata).

### 6.2 Two viable models

**Model A: Separate public vault repo**
- Public notes live in a dedicated `public` vault repo.
- Publishing is a direct site build from that repo.
- Pros: strong safety boundary; easy to reason about.
- Cons: requires explicit promotion/copying from private → public.

**Model B: Single canonical vault + export step**
- Notes carry `visibility: public|private`.
- A publish/export pipeline renders only public notes into a site repo/build directory.
- Pros: one place to edit; consistent IDs/links.
- Cons: requires careful export rules to avoid leaks.

Recommendation: start with Model A for safety, add Model B later if needed.

### 6.3 Legacy URLs + redirects (thousands)

We will have many old URLs (multiple legacy sites/projects). Publishing must support large redirect sets efficiently.

Recommended primitives:
- **Per-note aliases**: canonical notes can carry `aliases:` / `legacy_urls:` metadata.
- **Global redirect registry**: a single canonical mapping file (e.g. `redirects.yaml`) for bulk redirects not tied to a single note.
- **Publisher generates site-specific redirect config** (e.g. Netlify `_redirects`, nginx rules, etc) from these sources.

Important constraints:
- enforce uniqueness (no duplicate “from” paths)
- validate targets exist
- allow per-site scoping (same source path might map differently per legacy domain)

### 6.4 Incremental static publishing (fast rebuilds)

Avoid “rebuild everything” approaches (common in Quarto/Quartz-style pipelines). The publisher should:

- Maintain a build manifest (content hash + template hash + deps → output path).
- Regenerate only:
  - changed pages
  - pages whose dependencies changed (templates, shared assets, backlinks sections, tag indexes, feeds, sitemaps)
- Support multi-site output without duplicating work (shared render cache keyed by `(note_id, renderer_version, template_id)`).

## 7) Agent/daemon operation (reminders + time-sensitive work)

We expect “Pensieve operations” to be run by an agent (triage assistant, reminder daemon, scheduled ingest).

Key requirements:
- time awareness (working hours, timezones)
- reminders/scheduling that write back to canonical task state
- strong boundaries: the agent proposes changes; high-risk actions require confirmation

`shisad` is a good reference architecture for a long-running, security-first agent daemon.

## 8) Open questions (to resolve in PLAN-2026)

- Do we standardize on `[[wiki-links]]`, Markdown links, or both?
- Preferred canonical task format: frontmatter fields vs a dedicated tasks file?
- Attachment strategy by vault type (git vs LFS vs external store)?
- How do we model “shared but not public” collaboration repos (ACLs, encryption, etc)?
- Publishing redaction strategy: how to prevent accidental inclusion of private backlinks/mentions?
- Offline + sync: git-first vs local-first replication framework (and what subset must work on mobile/offline)?
- Queue/outbox: what canonical “request” format do we standardize on for offline capture and server-side jobs?

## 9) References

- attention-export: https://github.com/lhl/attention-export
- realitycheck: https://github.com/lhl/realitycheck
- shisad: https://github.com/shisa-ai/shisad
- khoj (comparison point): https://github.com/khoj-ai/khoj
- randomfoo.net (publishing/digital garden target): https://github.com/lhl/randomfoo.net (or equivalent upstream)
- llm-tracker.info (legacy site target): https://github.com/lhl/llm-tracker.info
- legacy repo analysis (this repo): `docs/ANALYSIS-legacy.md`
