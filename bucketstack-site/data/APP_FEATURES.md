# BucketStack: Comprehensive Feature Overview & Documentation

BucketStack is a high-performance cross-platform desktop application designed for seamless management of S3-compatible storage. Built with **Tauri**, **React**, and **Rust**, it offers a premium, native-feeling experience with robust security and advanced file management capabilities.

---

## ☁️ 1. Multi-Provider S3 Management

BucketStack is provider-agnostic and works with any S3-compatible service.

- **Supported Providers**: 
  - Amazon AWS S3
  - Cloudflare R2
  - DigitalOcean Spaces
  - Wasabi
  - Backblaze B2
  - MinIO
  - Generic / Custom S3 endpoints
- **Secure Credential Storage**: 
  - Uses **Machine-Bound Secure Storage** (AES-256-GCM) for enterprise-grade security.
  - Credentials are tied to your device's unique identifier and never leave your machine.
- **Permission Awareness**: 
  - Automatically detects **Read-Only** vs. **Read & Write** permissions.
  - Dynamically updates the UI to disable write operations for read-only credentials.
- **Connection Testing**: Pre-verify credentials before saving with real-time feedback.

---

## 📂 2. Advanced File Explorer

The heart of BucketStack is its flexible and powerful file explorer.

- **Multiple View Modes**:
  - **List View**: Detailed table with sortable columns.
  - **Grid/Thumbnail View**: Large icons for visual browsing.
  - **Gallery View**: Side-by-side preview with rich metadata extraction.
  - **Column View**: macOS Finder-like multi-column navigation. (Implementation present in props)
- **Fluid Organization**:
  - **Sorting**: Sort by Name, Size, or Last Modified (Ascending/Descending).
  - **Filtering**: Real-time search/filter within current directory.
  - **Global Search**: Recursive search across the entire bucket (limited to first 5,000 items for performance).
- **Navigation**: 
  - Breadcrumb navigation for quick path jumping.
  - "Path-style" display for custom endpoints.
  - Sidebar with quick account/bucket switching.
- **Recursive Folder Sizes**: Automatically calculates total recursive size of folders (an optimization not found in standard S3 tools).

---

## ⚡ 3. File Operations & Productivity

BucketStack supports all standard and advanced file management tasks.

- **Standard Operations**: 
  - Multi-file Upload/Download.
  - Create Folders / Create New Text Files.
  - Rename objects.
  - **Clipboard Support**: Copy, Cut, and Paste files between folders or buckets.
  - **Duplicate**: One-click duplication of files in-place.
- **Recursive Operations**: Delete or copy entire folder structures seamlessly.
- **Drag & Drop**:
  - Drag files from your OS directly into the app for upload.
  - Drag files/folders between buckets in the sidebar to initiate transfers.
- **Keyboard Shortcuts**:
  - `Ctrl/Cmd + C / V / X`: Copy/Paste/Cut.
  - `Ctrl/Cmd + A`: Select All.
  - `Ctrl/Cmd + N`: New Folder.
  - `Ctrl/Cmd + U`: Trigger Upload.
  - `F2`: Rename selected.
  - `Enter`: Open/Download selected.

---

## 🔄 4. Cross-Bucket & Cross-Provider Transfers

Move data between different accounts or providers without downloading to your disk.

- **Optimized Intra-Provider Transfers**: Uses server-side `copy_object` for lightning-fast transfers within the same provider (e.g., AWS to AWS).
- **Cross-Provider Streaming**: Uses Rust backend streaming with multipart uploads to transfer data directly between providers (e.g., AWS to R2) with minimal memory footprint.
- **Transfer Manager**: 
  - Dedicated panel to track active, completed, and failed transfers.
  - Real-time speed calculations and progress percentages.
  - Retry failed jobs or clear completed ones.
- **Safe Move Logic**: For "Move" operations, source files are only deleted after a 100% successful copy confirmation.

---

## 🧹 5. Data Protection & Trash System

Never lose a file again with the integrated Trash system.

- **Soft Delete**: Files deleted through BucketStack are moved to a hidden `.trash/` folder at the bucket root.
- **One-Click Restore**: Easily move files from Trash back to their original location.
- **Empty Trash**: Permanently purge deleted items with a single click.
- **Auto-Protection**: The `.trash/` folder is hidden from normal browsing to prevent accidental modification.

---

## ⏱️ 6. Temporary & Secure Sharing

- **Temporary Uploads**: Specify an expiration time (Days/Hours/Minutes) for sensitive files.
- **Signed URL Generator**: Create public, time-limited sharing links for any file.
- **Custom Expiration**: Granular control over how long a public link remains active.

---

## 📝 7. Integrated Previews & Editing

- **Monaco Code Editor**: Professional-grade code and text editor built-in.
  - Syntax highlighting for 50+ languages.
  - Inline editing with direct S3 save.
  - "Copy Content" feature for quick snippet grabbing.
- **Media Previews**: 
  - Native Image viewer.
  - Integrated PDF viewer.
  - Audio/Video file identification.

---

## 🔄 8. Background Synchronization

Automate your workflows with the Sync Manager.

- **Bi-Directional Sync**: Support for "Up" (Local to S3) and "Down" (S3 to Local) directions.
- **Granular Scheduling**: Set sync intervals in Days, Hours, Minutes, or Seconds.
- **Background Execution**: Sync jobs run even when the Sync Manager tab is closed.
- **Real-time Stats**: Track bytes transferred and success/failure rates for every job.

---

## 📊 9. Activity Logging & Security Audits

Complete transparency into every action performed in the app.

- **Local SQLite Audit Log**: High-performance local storage for historical actions.
- **Action Tracking**: Records uploads, deletes, renames, moves, and more.
- **Powerful Filtering**: Filter logs by connection, bucket, action type, or date range.
- **Data Export**: Export your activity logs to **CSV** or **JSON** for external reporting.
- **Security Audits**: The app logs internal security events (credential retrieval, rate limits) to the console for advanced users.

---

## 🎨 10. Premium Customization & UX

- **Theme Support**: Adaptive Dark Mode, Light Mode, and System Default.
- **Rich Feedback**: Toasts and operation status overlays for long-running tasks.
- **Multi-Platform**: Native support for macOS, Windows, and Linux via Tauri.
- **Performance**: Rust-powered backend ensures zero-lag interactions even with thousands of files.
