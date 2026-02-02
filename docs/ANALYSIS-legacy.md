# Pensieve Legacy Analysis (2026)

This document captures the current state of the Pensieve repository, preserving historical context, ideas, and planning as we move forward with modernization.

## Project Vision

**Pensieve** is a personal knowledge management system (PKMS) - a local-first notebook/wiki with inline WYSIWYG editing.

### Core Motivations (from README)
- Wanted a wiki with **inline editing** (not separate edit/view modes)
- **Offline-first** with sync capabilities
- **Git-backed** storage for versioning and diffs
- Better navigation/organization than existing tools

### Target Features
- Inline WYSIWYG editing
- Automatic Nav/TOC
- Local/offline operation with sync
- Git-based version control


## Repository Structure

```
pensieve/
├── server/              # Current: Tornado/Python backend
│   ├── app.py           # Main application (181 lines)
│   ├── templates/       # Jinja2 templates (page.html, setup.html)
│   └── static/          # Editor bundle, jQuery, Bower components
├── js/                  # Editor JS (ProseMirror experiments)
│   ├── editor.js        # ProseMirror initialization
│   ├── package.json     # browserify + babelify + prosemirror
│   └── node_modules/    # Dependencies
├── connector/           # External service connectors
│   └── zotero/          # Zotero DB access exploration
├── sync/                # Data sync scripts
│   └── reddit/          # Reddit export tools (saved, upvoted, messages)
├── docs/                # Design notes and research
├── _old/                # Archived implementations
│   ├── pensieve-node/   # Express.js version
│   └── pensieve-nodewebkit/  # Desktop wrapper (NW.js/node-webkit)
└── reference/           # Vendored/reference projects
```


## Git History & Branches

### Branches
| Branch | Description |
|--------|-------------|
| `master` | Main development branch (active) |
| `origin/node` | Initial commit only - appears to be abandoned early experiment |

### Development Timeline

| Period | Focus | Key Commits |
|--------|-------|-------------|
| **2014** | Initial Express.js + node-webkit | pensieve as express app, desktop packaging |
| **2016-05** | ProseMirror migration | Switch from Froala to ProseMirror editor |
| **2018-07** | Quill exploration | Quill Editor Prototype |
| **2019-07** | Zotero connector | Direct Zotero SQLite access |
| **2019-08/09** | Reddit sync tools | Auth, saved items, upvotes, messages export |

### Key Milestones
1. **Express.js + node-webkit** (2014): Original desktop app approach
2. **Tornado/Python rewrite** (2016): Switched backend, kept JS editor
3. **ProseMirror editor** (2016): Replaced Froala with open-source editor
4. **Data sync tools** (2019): Reddit and Zotero integrations


## Current Implementation State

### Backend: Tornado/Python

**File:** `server/app.py`

**Status:** Prototype - basic routing structure, incomplete handlers

**Implemented:**
- Application class with QSettings config
- Route structure:
  - `/` → Home (redirects to setup or page)
  - `/page/[id]` → Page view
  - `/content` → JSON save/load (hardcoded file)
  - `/setup` → Repository configuration
  - `/api/v1/*` → API stubs (empty)
- Template rendering with Jinja2
- Static file serving (editor bundle, jQuery)

**Not Implemented:**
- Actual page CRUD operations
- Git integration for versioning
- Navigation/TOC generation
- Search functionality
- Authentication

**Dependencies:** (`requirements.txt`)
- gitpython
- pillow
- PyQt5
- tornado

### Frontend: ProseMirror Editor

**File:** `js/editor.js`

**Status:** Basic prototype - editor loads but not wired to backend

**Implementation:**
```javascript
import {ProseMirror} from "prosemirror/dist/edit"
// ... tooltip menu, basic initialization
```

**Features present:**
- ProseMirror instance with tooltip menu
- Browserify/Babel build pipeline

**Features missing:**
- Save/load integration
- Custom schema/formatting
- Image handling
- Table support

### Desktop Wrapper

**Status:** Abandoned in `_old/`

Original approach used:
- **node-webkit** (now NW.js) for desktop packaging
- **PyQt5/PySSB** wrapper (`pensieve.py` in root)

The current `pensieve.py` shows a hybrid approach:
- PyQt5 QApplication for window
- Tornado server running in separate thread
- SSBWindow wrapper pointing to localhost


## Sync & Connector Tools

### Reddit Sync (`sync/reddit/`)

**Status:** Functional scripts for personal data export

| Script | Purpose |
|--------|---------|
| `auth.py` | OAuth2 refresh token generation |
| `get-saved.py` | Export saved posts/comments to JSON |
| `get-upvoted.py` | Export upvoted content |
| `get-messages.py` | Export messages |
| `get-old-messages.py` | Older message retrieval |
| `comment-info.py` | Comment metadata lookup |
| `get-votes.py` | Vote history export |

**Dependencies:** `praw` (Python Reddit API Wrapper)

**Output:** JSON files per item in `saved/`, `upvoted/`, etc.

### Zotero Connector (`connector/zotero/`)

**Status:** Research/exploration phase

- Direct SQLite database access approach
- Links to related projects (papis, pyzottk)
- Single script `00-zotero-db.py` (exploration)


## Historical Research & Decisions

### Editor Selection (from `docs/EDITOR.md`)

**Evaluated:**
- Froala Editor (v1 choice) - good features, non-commercial license issue
- Redactor - expensive licensing
- Aloha Editor - GPLv2, complex
- CKEditor - GPL, ugly
- Medium Editor clones - various open-source options
- **ProseMirror** (v2 choice) - modular, open-source

**Desired Features:**
- Inline HTML editing (H2, H3, B, I, U, Link, Tables, Images)
- Macros/Transforms with API hooks
- Keyboard shortcuts
- Floating menu

### Desktop App Framework (from `docs/APP.md`)

**Evaluated:**
- **node-webkit** (chosen) - most active at time
- atom-shell (now Electron)
- appjs - not active
- TideSDK - not active
- Brackets Shell - CEF-based, Brackets-focused
- CEF directly

### Storage/Sync (from `docs/STORAGE.md`)

**Approach:** Git-based syncing

**Explored:**
- BitTorrent Sync + Git
- Dropbox as Git remote
- dvcs-autosync
- git-auto-sync
- persy

### Compared Products (from `docs/COMPARISON.md`)

- **Hackpad** - good editing, online-only, no tables
- **TiddlyWiki** - interesting, not inline WYSIWYG
- **Scribbleton** - offline only, closed source
- **Evernote** - poor nav/org, no internal linking
- Various git-backed wikis (Gollum, gitit, etc.)


## Ideas & Planned Features (from `docs/TODO.md`)

### Milestone 1: Basic Notebook
- [x] ProseMirror editor integration
- [ ] Tree view navigation
- [ ] Page creation workflow

### Milestone 2: Basic Publishing
- [ ] Git checkins (init, save, pull/push)
- [ ] Basic auth/login (Passport.js mentioned)
- [ ] PJAX navigation

### Milestone 3: Better Editing
- [ ] Medium-editor style plugins
- [ ] Image uploads + repository storage
- [ ] Markdown conversion
- [ ] Keyboard shortcuts (VIM nav)
- [ ] Datagrid/table insertion (Handsontable)
- [ ] Drag & drop uploads

### Milestone 3b: Better Publishing
- [ ] Search engine integration (lunr, leveldb, redis explored)
- [ ] Autocomplete/typeahead
- [ ] Tags/metadata
- [ ] Private/public filtering

### Future Ideas
- Internal wiki linking with related pages
- Edit history with intelligent diff
- Recently edited pages
- Annotations
- Comments
- Real-time collaboration
- Encrypted/locked notes


## Technical Debt & Issues

### Critical
1. **No persistent storage** - save.json is hardcoded, no git integration
2. **Editor not connected** - ProseMirror loads but doesn't save
3. **No authentication** - open to anyone on localhost

### Moderate
1. **Outdated dependencies** - ProseMirror 0.7 (2016), ES2015 babel
2. **Mixed architecture** - Python backend, JS frontend, Qt wrapper
3. **No tests** - no test suite

### Low
1. **Bower deprecated** - static assets use bower (deprecated 2017)
2. **Commented-out code** - page.html has extensive dead JS
3. **Duplicate bundles** - editor_bundle.js and test_bundle.js overlap


## 2026 Modernization Considerations

### Architecture Options

**Option A: Full Python (FastAPI + htmx)**
- Modern Python backend with async support
- htmx for interactivity without heavy JS
- SQLite + git for storage
- Pros: Simpler stack, good for local-first
- Cons: Editor options more limited

**Option B: Full JavaScript (Electron + Modern Editor)**
- Electron for desktop
- TipTap/ProseMirror v2 or Lexical for editor
- SQLite via better-sqlite3
- Pros: Rich editor ecosystem, single language
- Cons: Heavier, Electron baggage

**Option C: Tauri + Web Stack**
- Tauri for lightweight desktop (Rust backend)
- Modern web frontend (Solid/Svelte/Vue)
- ProseMirror or TipTap editor
- Pros: Lightweight, modern, cross-platform
- Cons: Rust learning curve

**Option D: Web-only with PWA**
- FastAPI or Hono backend
- PWA for offline capability
- IndexedDB + sync
- Pros: No desktop wrapper needed
- Cons: Less native feel

### Editor Landscape (2026)

Modern options:
- **TipTap** - ProseMirror-based, excellent DX
- **Lexical** (Meta) - performant, extensible
- **Plate** - TipTap alternative
- **BlockNote** - Notion-style blocks
- **Novel** - AI-native editor

### Storage Considerations

- **SQLite** - local-first, sync-friendly (cr-sqlite, libsql)
- **Git** - still valid for text content
- **CRDT** - Yjs, Automerge for collaboration
- **Plain files** - Markdown with frontmatter


## Summary

Pensieve is a promising but incomplete personal wiki project. The core vision (inline editing, git-backed, offline-first) remains relevant. The codebase has:

**Salvageable:**
- Reddit sync tools (functional)
- Design research in docs/
- Core feature requirements

**Needs Replacement:**
- Backend (incomplete Tornado prototype)
- Editor integration (disconnected)
- Desktop wrapper approach

**Key Decision:** Choose a modern architecture stack that supports:
1. Local-first operation
2. Rich inline editing
3. Git or similar versioning
4. Cross-platform (web + desktop)
5. Sync capabilities
