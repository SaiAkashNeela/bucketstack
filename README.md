# BucketStack 🗂️

<div align="center">
  <p><em>A beautiful, secure, and native S3 bucket management application for macOS, Windows, and Linux</em></p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)](https://github.com/SaiAkashNeela/bucketstack/releases)
  [![Built with Tauri](https://img.shields.io/badge/Built%20with-Tauri-1C1C1E?style=flat&logo=tauri)](https://tauri.app)
</div>

---

## 🌟 Overview

**BucketStack** is a modern, native desktop application that provides a beautiful, macOS-style interface for managing S3-compatible object storage. Built with **Tauri**, **React**, and **Rust**, it combines the power of cloud storage with the elegance of native desktop applications.

### ✨ Key Highlights

- 🎨 **Native Design**: Seamlessly integrates with macOS, Windows, and Linux design languages
- 🔐 **Military-Grade Security**: Zero plaintext credential storage with machine-bound secure storage (AES-256-GCM encrypted)
- 🚀 **Blazing Fast**: Native performance with Rust backend
- 📱 **System Tray Integration**: Quick access via system tray (macOS menu bar, Windows system tray)
- 🌙 **Dark/Light Themes**: Automatic theme switching with system preferences
- 📁 **Advanced File Operations**: Upload, download, copy, move, compress, and more
- ☁️ **Multi-Provider**: Works with AWS S3, Cloudflare R2, MinIO, Wasabi, Backblaze B2, and any S3-compatible service

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Rust** (latest stable) - [Install](https://rustup.rs/)
- **System Requirements**:
  - macOS 10.15+ / Windows 10+ / Linux (glibc 2.28+)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SaiAkashNeela/bucketstack.git
   cd bucketstack
   ```

2. **Install dependencies**
   ```bash
   # Using pnpm (recommended)
   pnpm install
   
   # Or using npm
   npm install
   
   # Or using bun
   bun install
   ```

3. **Run in development mode**
   ```bash
   pnpm run tauri:dev
   # or
   npm run tauri:dev
   # or
   bun run tauri:dev
   ```

### Building for Production

#### Quick Build (Signed, Not Notarized)
```bash
./scripts/build.sh
```

**Output:** `target/release/bundle/macos/BucketStack_<version>_<arch>.dmg`


---

## 📖 Documentation

- **[Features](./FEATURES.md)** - Complete feature documentation
- **[Build Scripts](./scripts/README.md)** - Detailed build and notarization guide
- **[Updates](./UPDATES.md)** - In-app update mechanism documentation
- **[Security](./SECURITY.md)** - Security architecture and best practices

---

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- React 19 with TypeScript
- Tailwind CSS for styling
- Lucide React for icons
- Monaco Editor for code editing
- Tauri API for system integration

**Backend:**
- Rust with Tauri 2.0 framework
- AWS SDK for S3 operations
- SQLite for activity logging
- Machine-bound secure storage (AES-256-GCM)

**Supported Platforms:**
- macOS (primary, fully tested)
- Windows (compatible)
- Linux (compatible)

---

## ✨ Core Features

### ☁️ Multi-Provider S3 Support

BucketStack works with any S3-compatible service:

- **Amazon AWS S3** - Full support with all regions
- **Cloudflare R2** - Cloudflare's S3-compatible storage
- **DigitalOcean Spaces** - Object storage service
- **Wasabi** - Enterprise cloud storage
- **Backblaze B2** - Cost-effective cloud storage
- **MinIO** - Self-hosted S3-compatible servers
- **Railway** - Integrated deployment platform support
- **Custom S3 Endpoints** - Any S3-compatible service

### 📂 Advanced File Management

- **Multiple View Modes**: List, Grid, Gallery, and Column views
- **File Operations**: Upload, download, copy, move, rename, duplicate, delete
- **Folder Support**: Create and manage virtual folders
- **Bulk Operations**: Select multiple files for batch operations
- **Drag & Drop**: Native OS drag-and-drop support
- **Keyboard Shortcuts**: Full keyboard navigation
- **Clipboard Operations**: Copy, cut, and paste files between buckets
- **Trash System**: Soft delete with one-click restore
- **File Compression**: Create ZIP and TAR.GZ archives

### 🔄 Cross-Bucket & Cross-Provider Transfers

- **Server-Side Copying**: Lightning-fast transfers within the same provider
- **Streaming Transfers**: Direct transfers between different providers
- **Transfer Manager**: Track active, completed, and failed transfers
- **Progress Tracking**: Real-time speed calculations and progress percentages
- **Retry Logic**: Automatic retry for failed transfers

### 📝 Integrated Editing & Preview

- **Monaco Code Editor**: Professional-grade code editor with syntax highlighting for 50+ languages
- **File Preview**: Preview images, PDFs, and text files
- **Inline Editing**: Edit files directly in the app and save back to S3
- **Copy Content**: Quick snippet grabbing from files

### 🔄 Background Synchronization

- **Bi-Directional Sync**: Upload-only or download-only synchronization
- **Scheduled Sync**: Custom intervals from seconds to days
- **Background Execution**: Sync jobs run even when the app is closed
- **Conflict Resolution**: Size-based change detection
- **Progress Tracking**: Real-time transfer progress

### 📊 Activity Logging & Analytics

- **Comprehensive Logging**: All operations tracked with timestamps
- **Activity Filters**: Filter by connection, bucket, action, status, date ranges
- **Data Export**: Export logs to CSV or JSON
- **Storage Analytics**: Bucket scanning with size calculations and file type distribution
- **Visual Charts**: Pie charts and bar graphs for storage analysis

### 🔐 Security Features

- **Secure Storage**: Credentials stored in an AES-256-GCM encrypted database, bound to your machine's unique identifier.
- **Zero Plaintext**: Never stores credentials in accessible locations
- **Permission Detection**: Automatically detects read-only vs read-write access
- **HTTPS Enforcement**: Warns about insecure connections
- **Rate Limiting**: Prevents abuse with operation limits
- **Audit Logging**: Logs all security-related operations

---

## 🎯 Use Cases

1. **Cloud Storage Management**: Unified interface for multiple S3 providers
2. **Backup Solutions**: Automated data synchronization
3. **Content Distribution**: File sharing with time-limited links
4. **Development Workflow**: Code deployment and asset management
5. **Data Migration**: Transfer between different storage providers
6. **Media Management**: Large file uploads and organization
7. **Collaboration**: Shared bucket access and management

---

## 🛠️ Development

### Project Structure

```
bucketstack/
├── components/          # React UI Components
│   ├── Sidebar.tsx     # Account & bucket navigation
│   ├── FileExplorer.tsx # Main file browser interface
│   ├── AccountModal.tsx # Account configuration dialog
│   └── ...
├── services/           # Business Logic
│   └── s3Service.ts    # S3 operations & credential management
├── hooks/              # Custom React Hooks
│   └── useMenuBar.ts  # Menu bar integration
├── src/                # Rust Backend
│   └── main.rs        # Application entry point
├── capabilities/       # Tauri Security Permissions
│   └── main.json      # Main window capabilities
├── scripts/            # Build & deployment scripts
│   ├── build.sh       # Build script
│   ├── notarize.sh    # Notarization script
│   └── setup-updater.sh # Updater setup
├── package.json        # Node.js dependencies
├── Cargo.toml         # Rust dependencies
└── tauri.conf.json    # Tauri configuration
```

### Available Scripts

```bash
# Development
pnpm run dev           # Start web development server
pnpm run tauri:dev     # Start Tauri development app

# Building
pnpm run build         # Build for web production
pnpm run tauri:build   # Build native desktop app

# Build & Notarization (macOS)
./scripts/build.sh     # Build and sign
./scripts/notarize.sh  # Notarize and create DMG
```

### Code Quality

- **TypeScript**: Strict type checking enabled
- **Rust**: Standard Rust formatting (`cargo fmt`)
- **React**: Functional components with hooks
- **Commits**: Conventional commit format

---

## 📦 Distribution

### Building for Distribution

**Quick Summary:**
1. Set up `.env` with Apple credentials (for macOS notarization)
2. Distribute the DMG file from `target/release/bundle/macos/`

### Update Mechanism

BucketStack includes an in-app update mechanism. See [UPDATES.md](./UPDATES.md) for setup instructions.

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit using conventional commits (`git commit -m 'feat: add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Setup

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Start development: `pnpm run tauri:dev`
4. Make your changes
5. Test thoroughly
6. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Credits

- **Tauri** - For the amazing desktop application framework
- **AWS SDK** - For robust S3 integration
- **React** - For the powerful UI framework
- **Tailwind CSS** - For beautiful styling utilities
- **Lucide Icons** - For consistent iconography
- **Monaco Editor** - For professional code editing

---

## 🔗 Links

- **GitHub**: [https://github.com/SaiAkashNeela/bucketstack](https://github.com/SaiAkashNeela/bucketstack)
- **Releases**: [https://github.com/SaiAkashNeela/bucketstack/releases](https://github.com/SaiAkashNeela/bucketstack/releases)
- **Issues**: [https://github.com/SaiAkashNeela/bucketstack/issues](https://github.com/SaiAkashNeela/bucketstack/issues)

---

<div align="center">
  <p><strong>Built with ❤️ using Tauri, React, and Rust</strong></p>
  <p>Experience the future of S3 management with BucketStack</p>
</div>
