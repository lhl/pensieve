# PKMS 2026 Landscape Review (Local-first + Sync + Publishing)

*Created: 2026-02-01*  
*Status: Draft (notes)*

This is a quick survey of existing building blocks we can reuse for:
- offline-first capture/edit
- multi-device sync
- background job queues (“outbox”)
- scalable search/indexing
- fast incremental static publishing with lots of redirects

This is not an endorsement of any one stack yet; the goal is to avoid reinventing wheels.

## 1) Constraints / evaluation criteria

### Data scale + shape
- 10k → 100k+ “items” across: authored notes, projects, bookmarks/resources, high-volume streams (events)
- “Collected vs authored” must be filterable and queryable
- Selective publishing to multiple legacy sites with stable URLs + massive redirects

### Offline + multi-device
- Must support offline capture and local reference/search on devices
- Desktop/web/mobile should be first-class citizens.
- We should be realistic about storing/searching 100k+ full-text + vectors on phones; “offline tiers/packs” may be required.

### Privacy + self-hosting
- Prefer local-first and self-hostable components
- Avoid vendor lock-in for the canonical store

## 2) Architectural “shapes” worth considering

### A) Git/files are canonical; DB is derived (recommended bias)

- Canonical vault = Markdown + JSONL streams + YAML sidecars in git
- Derived = LanceDB (vectors), extracted snapshot text, link graphs, manifests
- Sync = git remotes +/or filesystem sync (e.g. Syncthing) for devices that can handle it
- Offline capture = “outbox” queue files committed to the vault when connectivity returns

Pros: durable, portable, easy selective publishing, easy multi-repo boundaries  
Cons: mobile/PWA editing is harder; conflict resolution is “git-ish”

### B) Local-first replicated DB is canonical; export to Markdown

- Canonical = a replicated DB (SQLite/Postgres-backed) with strong offline semantics
- Export pipelines generate Markdown + static site outputs from the DB

Pros: great offline UX, easier mobile, clearer queue semantics  
Cons: bigger system surface; “git as truth” becomes secondary; publishing/export is mandatory

### C) Hybrid canonical: files for notes, DB for tasks/streams

- Notes/resources canonical in files
- Tasks + high-volume streams canonical in replicated DB (or append-only JSONL + derived DB)

Pros: avoids 100k tiny note files for event streams; tasks can be “app-native”  
Cons: two canonical systems to reason about

## 3) Offline queues / “outbox” patterns (PWA-friendly)

If we build any offline-capable client (PWA or desktop), the outbox pattern is essential:
- write user actions locally (append-only)
- replay them when online
- make processing idempotent and auditable

Candidate primitives:
- Service Worker + Background Sync (when available)
- Workbox Background Sync plugin (battle-tested helper)

## 4) Local-first sync / replication frameworks (if we go DB-canonical or hybrid)

Candidates to evaluate:
- PouchDB + CouchDB replication (classic, multi-master replication model)
- RxDB (client DB with multiple replication options; can pair with hosted backends)
- Replicache (now maintenance-mode; successor direction points to “Zero”)
- Zero (newer “local-first sync” model; open source)
- ElectricSQL (sync engine; Postgres-centric)
- Triplit (local-first database with sync)

Key questions for our use case:
- self-hostable? can run on a small VPS/home server?
- conflict model (CRDT/OT vs last-write-wins vs app-defined merges)
- export/interop story (how to produce Markdown + static outputs)
- operational complexity (running Postgres, migrations, backups)

## 5) Snapshotting / bookmarking (ArchiveBox-style)

We probably want a dedicated snapshot subsystem rather than rolling our own:
- ArchiveBox (URL → archive, extracted text, media) as a reference implementation

Design goal for Pensieve:
- canonical bookmark/resource stub in git (with `url:` + snapshot status/ID)
- snapshots stored outside the vault (too big/noisy for git)
- extracted text indexed for search (derived)

## 6) Static publishing (fast incremental builds, lots of redirects)

We want “static site generator ergonomics” without full rebuild penalties.

Candidate approaches to evaluate:
- Hugo (very fast; has caching primitives we can leverage)
- Zola (fast Rust SSG)
- Eleventy (JS SSG with incremental build mode)
- Astro (content collections + caching; useful if we need component rendering)

We likely still need a Pensieve-specific “publisher” layer to handle:
- note IDs → permalinks
- multi-site output targets
- backlinks/tag indexes with correct dependency invalidation
- redirect generation and validation at scale
- persistent build cache across runs (manifest of inputs → outputs)

## 7) Suggested next step: a short, explicit stack decision

Before writing much code, decide:
1) Is the “everything repo” canonical in git (A), or is a replicated DB canonical (B), or hybrid (C)?
2) What must work offline on mobile vs what can be “desktop-first” initially?
3) Where do snapshots live (ArchiveBox server), and how do we reference them canonically?
4) Which publishing target(s) are P0 (randomfoo.net, llm-tracker.info, leonardlin.com)?

## 8) References (starting points)

## 9) Cross-platform client frameworks (minimize dev burden)

We want one codebase that can cover desktop/web/mobile with decent UX for:
- capture intents/shortcuts (share sheet / share target)
- notifications (reminders, triage nudges)

Candidates to evaluate:

- **PWA-first**
  - Pros: one web codebase; installable on desktop/mobile; can support offline storage + web push
  - Cons: platform limitations (background work, share integrations) vary; iOS quirks remain

- **Expo / React Native (+ web)**
  - Pros: one TS/React codebase; good mobile UX; easier “share to inbox” and notifications
  - Cons: still need a backend; “desktop app” usually means wrapping the web build (Tauri/Electron) unless we accept “runs in the browser”
  - Notes:
    - Expo supports web as a first-class target (React Native for Web + Expo tooling).
    - `expo-sqlite` has experimental/alpha web support (WASM + cross-origin isolation headers), which may or may not be worth adopting early.

- **Hybrid**
  - PWA for desktop/web
  - minimal native capture app for mobile (just share + outbox + notifications)

Decision drivers:
- how critical true OS-level “share sheet → capture” is on iOS/Android
- whether push notifications are required or “local notifications” are enough
- whether offline editing of existing notes must be rich on mobile or capture/triage is sufficient

Sync / local-first:
- PouchDB replication: https://pouchdb.com/guides/replication.html
- RxDB: https://rxdb.info/
- Replicache: https://replicache.dev/
- Zero: https://zero.rocicorp.dev/
- ElectricSQL: https://electric-sql.com/
- Triplit: https://www.triplit.dev/

Offline queues:
- Workbox Background Sync: https://developer.chrome.com/docs/workbox/modules/workbox-background-sync/
- Background Sync API: https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API

Snapshotting:
- ArchiveBox: https://archivebox.io/ (repo: https://github.com/ArchiveBox/ArchiveBox)

Publishing:
- Eleventy incremental: https://www.11ty.dev/docs/usage/#incremental-build
- Hugo caching: https://gohugo.io/functions/partials/includecached/ and https://gohugo.io/getting-started/configuration/#cachedir
- Zola: https://www.getzola.org/
- Astro content collections: https://docs.astro.build/en/guides/content-collections/
