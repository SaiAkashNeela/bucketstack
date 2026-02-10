# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BucketStack is a native desktop S3 management application built with **Tauri** (Rust backend), **React** (TypeScript frontend), and **Tailwind CSS** for styling. The app supports macOS, Windows, and Linux with features like file management, data sync, activity logging, and storage analytics.

Key tech stack:
- **Frontend**: React 19 + TypeScript, Vite bundler, Tailwind CSS 4, Monaco Editor
- **Backend**: Rust with Tauri 2.0, AWS SDK, SQLite for activity logs, machine-bound secure storage (AES-256-GCM)
- **Desktop**: Multi-window (main app + tray window), system tray integration, native drag-and-drop
- **Supported S3 providers**: AWS S3, Cloudflare R2, MinIO, Wasabi, Backblaze B2, and any S3-compatible endpoint

## Architecture

### High-Level Structure

The application has a clear separation between frontend (React/TypeScript) and backend (Rust):

- **Frontend** (`*.tsx` components, `services/`, `hooks/`, `types.ts`): Handles UI, state management, and user interactions. Communicates with Rust backend via Tauri commands.
- **Rust Backend** (`src/main.rs`): Handles all S3 operations, file I/O, activity logging, system tray integration, and native APIs (secure storage, clipboard, file dialogs).
- **Entry Point**: `index.tsx` routes to either main App or TrayWindow based on the current window label.

### Frontend Architecture

**Main Application** (`App.tsx`, `index.tsx`):
- Dual-window setup: Main app window and tray window (invisible, no decorations, transparent)
- Uses React hooks for state management (no Redux/Context API needed for current scope)
- Maintains account list, active account/bucket, clipboard for copy/move operations, and transfer jobs
- Communicates with backend via `invoke()` from `@tauri-apps/api/core`

**Component Organization**:
- **Core UI**: `Sidebar.tsx` (navigation), `FileExplorer.tsx` (main file browser), `TrayWindow.tsx` (tray menu)
- **Modals**: Account management, file editing, transfer management, activity logging, backup sync, storage analytics
- **Services**: `s3Service.ts` (S3 operations), `activityService.ts` (activity logging wrapper)
- **Hooks**: `useMenuBar.ts` (menu bar integration), custom hooks for theme and window management
- **Utilities**: `types.ts` contains all TypeScript interfaces, theme provider

**Key State Patterns**:
- State is stored in `App.tsx` and passed down to components
- Tauri event listeners (`listen()`) used for real-time updates (transfer progress, activity logs)
- Clipboard operations managed via local React state (copy/move buffers)

### Rust Backend Architecture

**Main Entry** (`src/main.rs`):
- Single large file (~2700 lines) containing:
  - **Tauri Command Handlers**: `#[command]` functions invoked from frontend via `invoke()`
  - **S3 Operations**: Bucket listing, file upload/download, copying, moving, compression
  - **Activity Logging**: SQLite database for operation tracking, initialized at app startup
  - **Data Types**: Serialized structs for request/response handling between frontend and backend
  - **System Integration**: Tray icon management, menu bar integration (macOS), native dialogs
  - **Transfer Tracking**: In-memory job tracking with progress emissions via Tauri events

**Key Modules**:
- S3 client initialization with AWS SDK
- Database initialization in platform-specific app data directories:
  - macOS: `~/Library/Application Support/BucketStack/activity.db`
  - Windows: `%AppData%/BucketStack/activity.db`
  - Linux: `~/.local/share/bucketstack/activity.db`
- Event emission for frontend updates (progress, activity logs)

### Communication Pattern

1. **Frontend → Backend**: `invoke('command_name', { params })` from React components
2. **Backend → Frontend**:
   - Return values from command handlers (synchronous)
   - Event emission via `emit()` for async updates (transfer progress, activity logs)
3. **Frontend Listeners**: `listen('event_name', (event) => { ... })`

## Development Commands

### Setup and Installation
```bash
pnpm install
# or: npm install, bun install
```

### Running in Development

**Full Development Mode** (Tauri with hot reload):
```bash
pnpm run tauri:dev
```
Starts both Vite dev server (port 3000) and Tauri app. Frontend hot-reloads on changes.

**Web-Only Development** (Vite server without Tauri):
```bash
pnpm run dev
```
Useful for UI-only changes. Runs on http://localhost:3000 but won't work with backend features.

### Building for Production

**Web Build Only**:
```bash
pnpm run build
```
Outputs to `dist/` directory.

**Native Application**:
```bash
pnpm run tauri:build
```
Builds native binaries for your current platform. Uses the `beforeBuildCommand` from `tauri.conf.json` to build web assets first.

**macOS-Specific Builds**:
```bash
./scripts/build.sh
```
Comprehensive build script that compiles, signs with Developer ID, and prepares updater artifacts. Requires `APPLE_SIGNING_IDENTITY` in `.env`.

```bash
./scripts/notarize.sh
```
Notarizes the app for macOS and creates a DMG. Requires Apple credentials and notarization token in `.env`.

See `scripts/README.md` for detailed build and notarization documentation.

## Key Development Patterns

### Adding a New S3 Operation

1. **Rust Backend** (`src/main.rs`):
   - Define request struct (e.g., `struct DeleteFileRequest`)
   - Define response struct (e.g., `struct DeleteFileResponse`)
   - Create `#[command]` handler function
   - Return `Result<Response, String>` for error handling

2. **Frontend** (`components/`, `services/s3Service.ts`):
   - Call operation via `invoke('handler_name', {...})` or add helper in `s3Service.ts`
   - Handle async response and update React state
   - Emit user feedback (toast, loading spinner, etc.)

3. **Activity Logging** (optional):
   - Rust backend calls `log_activity()` to record operation
   - Frontend listens to `activity_log_updated` event if needed

### Working with State Management

- **Account/Connection State**: Stored in App.tsx, persists to browser localStorage via s3Service
- **UI State** (modals, view mode): Local component state with `useState`
- **Async State** (transfer jobs, activities): Manage with `useEffect` listeners to Tauri events
- **Clipboard Operations**: Local state object with source files and operation mode (copy/move)

### Styling and Theming

- **Tailwind CSS 4** with PostCSS configuration
- **Dark/Light themes**: Auto-switch with system preference via `ThemeProvider`
- **Icons**: Lucide React for consistent iconography
- **Responsive**: Mobile-first design with utility classes (tested on main app and tray)

### Keyboard Navigation and Shortcuts

- Implemented in individual components (e.g., arrow keys in FileExplorer)
- System-wide shortcuts handled via Tauri menu bar integration
- Tray window positioning managed by tauri-plugin-positioner

## File and Directory Organization

```
bucketstack/
├── src/main.rs                    # Rust backend (2700+ lines)
├── services/
│   ├── s3Service.ts              # S3 operation helpers, credential storage
│   └── activityService.ts        # Activity logging wrappers
├── components/                    # React components
│   ├── App.tsx                   # Main app container
│   ├── Sidebar.tsx               # Account and bucket navigation
│   ├── FileExplorer.tsx          # Core file browser
│   ├── TrayWindow.tsx            # System tray window
│   ├── AccountModal.tsx          # Add/edit accounts
│   ├── FileEditorModal.tsx       # Monaco editor integration
│   ├── TransferModal.tsx         # Cross-provider transfers
│   ├── ActivityLog.tsx           # Operation history
│   ├── SyncManager.tsx           # Bi-directional sync setup
│   ├── StorageAnalytics.tsx      # Storage analysis and charts
│   └── [Other modals and utilities]
├── hooks/
│   └── useMenuBar.ts             # Menu bar integration
├── types.ts                       # TypeScript interfaces
├── index.tsx                      # Entry point (routes to App or TrayWindow)
├── App.tsx                        # Main app component
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── tauri.conf.json               # Tauri configuration (windows, plugins, updater)
├── Cargo.toml                    # Rust dependencies
├── package.json                  # Node.js dependencies
├── scripts/
│   ├── build.sh                  # macOS build with signing
│   ├── notarize.sh              # macOS notarization
│   └── setup-updater.sh         # Updater key generation
└── capabilities/
    └── main.json                # Tauri security permissions
```

## Important Configuration Details

### Tauri Configuration (`tauri.conf.json`)

- **Two Windows**: "main" (1200x800 px, resizable) and "tray" (320x450 px, transparent, no decorations)
- **Plugins**: clipboard-manager, dialog, updater, process, positioner, shell
- **Security**: CSP policy with image/font/connect-src restrictions
- **Build**: Frontend built to `dist/`, dev server on port 3000
- **Updater**: Uses GitHub releases with signed artifacts

### Environment Variables

- `.env` file for build settings (mainly macOS signing identity and notarization credentials)
- Loaded via `[ -f .env ] && source .env` in shell scripts
- Frontend uses Vite prefix `VITE_` and `TAURI_` for environment-based configuration

### TypeScript & Module Resolution

- `@/` path alias resolves to repository root
- Strict type checking enabled
- ES2022 target for modern syntax
- bundler module resolution for optimized imports

## Common Development Tasks

### Debugging

**Frontend Debugging**:
- Use browser DevTools: Open from menu or press Cmd+Shift+I
- Inspect React component tree and network requests
- Console logs appear in DevTools and terminal

**Rust Debugging**:
- Add `eprintln!()` or `println!()` for console output visible in terminal
- Use Rust analyzer for type hints and refactoring in your IDE
- Build errors displayed clearly with line numbers

### Testing Your Changes

1. **Quick iteration**: `pnpm run tauri:dev` auto-reloads frontend on changes
2. **Backend changes**: Restart the dev app (Ctrl+C, then `pnpm run tauri:dev`)
3. **Test S3 connections**: AccountModal includes a test button that verifies credentials
4. **Verify UI**: Check both main window and tray window (click tray icon to open)

### Cross-Platform Testing

- **macOS**: Full testing required for native features (secure storage, menu bar, notarization)
- **Windows/Linux**: Basic functionality should work; some native integrations may vary
- Build for other platforms via Tauri CI or local builds (requires platform-specific tools)

## Performance Considerations

- **Large File Lists**: FileExplorer virtualization not currently implemented; may need optimization for buckets with 10k+ files
- **Transfer Progress**: Uses Rust-side job tracking with event emissions for smooth UI updates
- **SQLite Queries**: Activity logging uses indexed queries; very large logs may need pagination
- **Memory**: AWS SDK maintains client state; consider connection pooling for bulk operations

## Security Notes

- **Credentials**: Stored in machine-bound secure storage (AES-256-GCM encrypted)
- **Network**: All S3 calls via HTTPS (enforced in code, warnings for non-secure endpoints)
- **CSP Policy**: Restricts script sources; inline styles allowed for Tailwind
- **File Operations**: Validate file paths and sizes before processing
- **Activity Logs**: Never log full credentials; only operation details and errors

## Updating Dependencies

- **pnpm**: Specified in package.json with pinned version
- **Rust**: Update via `cargo update` (check for breaking changes)
- **Tauri**: Minor version updates fairly safe; check changelog for API changes
- **AWS SDK**: May have breaking changes; review before updating major versions

## Useful References

- **Tauri API**: Docs in `@tauri-apps/api` - commonly used: `invoke()`, `listen()`, `emit()`, `window` APIs
- **React & TypeScript**: React 19 hooks, TypeScript strict mode
- **Tailwind CSS 4**: PostCSS-based; check latest utility class documentation
- **Monaco Editor**: Supported languages and custom themes via `@monaco-editor/react`
- **AWS SDK for JavaScript**: S3 client initialization and S3 operation methods

## Notes for Future Development

- **Accessibility**: Consider keyboard-only navigation for all modals and menus
- **Localization**: No i18n currently; would need extraction of hardcoded strings
- **Error Handling**: Some edge cases in concurrent transfers; improve error resilience
- **Activity Log Size**: Consider archiving or pruning old logs to prevent database bloat
- **Performance**: Profile large file operations (1000+ files) for optimization opportunities
