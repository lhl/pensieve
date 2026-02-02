# Pensieve Client Plan (Desktop/Web/Mobile)

*Created: 2026-02-02*  
*Status: Draft*

This doc focuses on client constraints and decisions: offline, local search, capture UX, and cross-platform strategy.

## 1) PWA storage: desktop vs mobile

PWAs on desktop are generally **more capable** than mobile PWAs for storage and offline reliability, but they’re still **quota-managed** and can be **evicted** by the browser/OS under storage pressure.

### Practical guidance

- **`localStorage`**: treat as “preferences only” (small, synchronous, not for notes/indexes).
- **IndexedDB / Cache Storage / OPFS**: suitable for larger offline caches (content, manifests, queues, indexes).
- **Desktop (Chrome/Edge/Firefox)**: typically supports large per-origin storage (hundreds of MB to GBs depending on disk and browser policy) and is less aggressively purged than phones.
- **Mobile (especially iOS Safari)**: more aggressive eviction and background/offline limitations; long-idle sites/apps may lose stored data. Plan for “cache loss” and re-sync.

### Engineering rules

1) **Assume local data can disappear**
- Treat local full text, embeddings, and snapshot extracts as **rebuildable caches** unless we explicitly implement a durable replicated store.

2) **Measure and request persistence**
- Use `navigator.storage.estimate()` to understand quotas at runtime.
- Use `navigator.storage.persist()` where supported to reduce eviction risk.

3) **Tier offline content**
- Mobile should not require syncing the entire universe for offline use.
- Prefer: tasks + inbox/outbox + global metadata always, and optional “offline packs” for pinned projects/areas.

## 2) Offline edits and “lazy queue” actions

Clients should write all user actions to a local **outbox** that can be replayed when online:

- Create/edit note
- Capture URL/text/file to inbox
- Tag/visibility/project filing
- “Snapshot this URL”

### Outbox requirements

- Append-only, idempotent operations (stable `op_id`)
- Includes `base_rev`/`etag` to detect conflicts
- Safe retries; server acks on success
- Background sync where possible; otherwise sync opportunistically (app open/foreground + periodic timers)

## 3) Cross-platform strategy (to decide)

Options:

- **PWA-first**: one web codebase; desktop installable; mobile possible but iOS constraints need careful handling.
- **Expo / React Native (+ web)**: one TS/React codebase for iOS/Android + a web build; desktop binary would typically be a wrapper around the web build (Tauri/Electron) if needed.
- **Hybrid**: PWA for desktop/web + minimal native mobile capture app (share sheet + outbox + notifications).

Decision drivers:
- “share sheet → capture” importance on iOS/Android
- reminder/notification needs (local vs push)
- how much offline search must exist on mobile (metadata-only vs full-text vs vectors)
