# BucketStack - Complete Feature Documentation

BucketStack is a sophisticated desktop application built with Tauri (Rust + React) that provides a comprehensive S3-compatible object storage management interface. It supports multiple cloud storage providers and offers advanced features for file management, synchronization, and data analysis.

## 🏗️ Architecture & Technology Stack

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS for styling
- Lucide React for icons
- Tauri API for system integration

**Backend:**
- Rust with Tauri framework
- AWS SDK for S3 operations
- SQLite for activity logging
- Machine-bound secure storage for credentials

**Supported Platforms:**
- macOS (primary)
- Windows & Linux (compatible)

## 🌟 Core Features

### 1. Multi-Provider S3 Support
- **Amazon S3** - Standard AWS S3 buckets
- **Cloudflare R2** - Cloudflare's S3-compatible storage
- **DigitalOcean Spaces** - DO's object storage
- **MinIO** - Self-hosted S3-compatible storage
- **Wasabi** - High-performance cloud storage
- **Backblaze B2** - Cost-effective cloud storage
- **Railway** - Database hosting platform integration

### 2. Advanced Account Management
- Secure credential storage via machine-bound encryption (AES-256-GCM)
- Account switching with persistent state
- Connection testing before saving
- Provider-specific configuration
- Account deletion with cleanup

### 3. File Operations
- **Upload**: Drag-and-drop file/folder upload with conflict resolution
- **Download**: Single file and recursive folder downloads
- **Delete**: Soft delete (moves to .trash/) or permanent deletion
- **Rename**: Object renaming with copy-then-delete
- **Create Folder**: Zero-byte object folder creation
- **Create File**: In-app text file creation and editing with Monaco editor
- **File Editor**: Full-featured Monaco-powered code editing (30+ languages)
- **File Preview**: Syntax-highlighted preview for code files and SVG rendering
- **Link Generation**: Pre-signed URLs with custom expiry times
- **Clipboard Integration**: Copy file contents and links to clipboard
- **Duplicate Files**: Create copies of files/folders
- **Cut/Copy Operations**: Standard clipboard operations for files
- **Transfer Between Buckets**: Move/copy files across different S3 accounts

### 4. Background Synchronization
- **Sync Jobs**: Automated unidirectional folder synchronization
- **Direction Control**: Upload-only (local→bucket) or download-only (bucket→local)
- **Interval Configuration**: Custom sync intervals (minutes to days)
- **Conflict Resolution**: Size-based change detection (skips identical files)
- **Progress Tracking**: Real-time transfer progress with file counts
- **Error Handling**: Comprehensive sync error management and retry logic

### 5. File System Operations
- **Recursive Operations**: Deep folder traversal and operations
- **Search Functionality**: Full-text search across objects
- **Folder Size Calculation**: Recursive size computation
- **Multi-part Uploads**: Large file uploads (>5MB) with automatic chunking
- **Transfer Progress**: Real-time upload/download progress with speed metrics
- **Compression**: Zip/tar.gz archive creation from selected files
- **Cross-Provider Transfers**: Transfer between different providers and accounts
- **Trash Management**: Soft delete system with hidden .trash/ folder
- **Empty Trash**: Bulk permanent deletion of trashed items

### 6. Activity Logging & Analytics
- **Comprehensive Logging**: All operations tracked with timestamps
- **Activity Filters**: Filter by connection, bucket, action, status, date ranges
- **Export Functionality**: JSON and CSV export formats with search
- **Storage Analytics**: Bucket scanning with size calculations and file type distribution
- **Visual Charts**: Pie charts and bar graphs for storage analysis
- **Performance Monitoring**: Transfer speeds, file counts, and efficiency metrics
- **Error Tracking**: Detailed error logging with retry capabilities
- **Largest Files**: Identify storage hogs and optimization opportunities

## 🎯 User Interface Features

### System Tray Integration
- **NordVPN-style Popover**: Modern tray icon with dropdown interface
- **Toggle Behavior**: Click to show/hide tray window
- **Quick Access**: Recent files and active sync jobs
- **Drag & Drop**: Direct file upload to tray
- **Quick Upload**: Instant file selection and upload

### Main Application Interface
- **Theme System**: Light, Dark, and System theme modes with automatic switching
- **View Modes**: List, Grid, Gallery, and Columns views for file browsing
- **Responsive Design**: Adaptive layout for different screen sizes
- **File Explorer**: Hierarchical file/folder navigation with sorting
- **Breadcrumb Navigation**: Easy path navigation with clickable segments
- **File Type Icons**: Visual file type identification and MIME type detection
- **Context Menus**: Comprehensive right-click operations
- **Toolbar**: Quick access to common operations
- **Search & Filter**: Real-time file filtering and search
- **Multi-Selection**: Batch operations on multiple files

### Modal System
- **Account Configuration**: Secure credential management with connection testing
- **File Editor**: Full Monaco editor with syntax highlighting for 30+ languages
- **File Creator**: Create new text files with syntax highlighting and templates
- **Transfer Progress**: Real-time progress monitoring with speed indicators
- **Transfer Modal**: Cross-bucket transfer operations with progress tracking
- **Conflict Resolution**: Upload conflict handling (overwrite/skip/rename/apply to all)
- **Link Expiry**: Custom URL expiration with preset and custom durations
- **Terms & Conditions**: Legal compliance with feature explanations and warnings

### Favourites System
- **Bookmark Files/Folders**: Save frequently accessed items for quick navigation
- **Cross-Account Support**: Favourites work across different S3 accounts
- **Quick Access**: One-click navigation from sidebar
- **Visual Indicators**: Star icons show favourited status
- **Persistent Storage**: Favourites saved locally and persist between sessions

### File Preview System
- **Code Preview**: Monaco editor with syntax highlighting for 30+ languages
- **SVG Preview**: Render SVG files with code/source toggle
- **Text File Support**: Preview and edit all text-based file types
- **Copy to Clipboard**: One-click copying of file contents
- **Language Detection**: Automatic syntax highlighting based on file extension

## 🔐 Security & Privacy
- **Secure Storage**: Cross-platform machine-bound credential encryption
- **Clipboard Security**: Secure clipboard operations with content validation
- **Pre-signed URLs**: Time-limited access tokens with custom expiry
- **Permission Management**: Granular access controls (read-only/read-write)
- **Data Encryption**: HTTPS/TLS for all S3 communications
- **Connection Testing**: Pre-flight connection validation
- **Error Boundary**: Application crash protection and recovery

## 🚀 Advanced Capabilities

### Bulk Operations
- **Batch Upload**: Multiple file selection
- **Bulk Delete**: Mass file operations
- **Recursive Sync**: Entire folder synchronization
- **Archive Creation**: Zip/tar.gz compression

### Data Management
- **Metadata Support**: Object metadata handling and preservation
- **Version Control**: File versioning capabilities with S3
- **Trash System**: Soft delete with hidden .trash/ folder protection
- **Empty Trash**: Bulk permanent deletion of all trashed items
- **Duplicate Detection**: Intelligent duplicate handling during uploads
- **Rename Protection**: Prevent accidental overwrites during rename operations

### Performance Optimization
- **Lazy Loading**: Efficient file listing
- **Pagination**: Large dataset handling
- **Concurrent Operations**: Parallel file transfers
- **Memory Management**: Optimized resource usage

### Integration Features
- **Menu Bar Integration**: Native macOS menu bar with quick actions
- **System Tray**: NordVPN-style popover with file access and sync status
- **Keyboard Shortcuts**: Efficient navigation and operations
- **Drag & Drop**: Native OS drag-and-drop from desktop/finder
- **Clipboard Integration**: Copy file contents, paths, and links
- **Context Menu Integration**: Right-click operations in file explorer

## 🔧 Technical Specifications

### File Size Limits
- Single file uploads: Unlimited (multi-part support)
- Batch uploads: No practical limit
- Preview files: Text files up to reasonable size

### Transfer Speeds
- Multi-threaded uploads/downloads
- Progress tracking with speed metrics
- Resume capability for interrupted transfers

### Database Features
- SQLite-based activity logging
- Indexed queries for fast search
- Data export and backup capabilities

### Network Features
- Automatic retry on failures
- Connection pooling
- Timeout handling
- CORS bypass for direct API calls

## 🎯 Use Cases

1. **Cloud Storage Management**: Unified interface for multiple S3 providers
2. **Backup Solutions**: Automated data synchronization
3. **Content Distribution**: File sharing with time-limited links
4. **Development Workflow**: Code deployment and asset management
5. **Data Migration**: Transfer between different storage providers
6. **Media Management**: Large file uploads and organization
7. **Collaboration**: Shared bucket access and management

## 🚀 Advanced Features

### Sync Engine
- **Background Sync**: Automatic sync jobs running even when app is closed
- **Unidirectional Sync**: Local→bucket or bucket→local directions
- **Size-based Change Detection**: Intelligent skipping of identical files
- **Incremental Sync**: Only transfer changed files to save bandwidth
- **Scheduled Sync**: Custom intervals from minutes to days
- **Manual Sync**: On-demand synchronization with progress tracking
- **Multi-tab Sync**: Sync status updates across multiple app windows
- **Error Recovery**: Automatic retry with exponential backoff

### Analytics Dashboard
- Storage usage visualization
- Transfer statistics
- Performance metrics
- Error rate monitoring

### Developer Features
- RESTful API compatibility
- Webhook support potential
- Plugin architecture
- Custom script integration

## 🔄 Workflow Integration

1. **Setup Phase**: Account configuration and testing
2. **Organization Phase**: File/folder structure management with favourites
3. **Sync Phase**: Automated background synchronization
4. **Management Phase**: Monitoring and analytics
5. **Distribution Phase**: Link generation and sharing

## 🎨 User Experience

- **Intuitive Interface**: Familiar file manager design
- **Contextual Actions**: Smart menu options based on selection
- **Visual Feedback**: Progress indicators and status updates
- **Error Handling**: User-friendly error messages and recovery
- **Accessibility**: Keyboard navigation and screen reader support

## 🔧 Maintenance & Support

- **Automatic Updates**: Built-in update mechanism
- **Error Reporting**: Comprehensive error logging
- **Performance Monitoring**: System health indicators
- **Backup Recovery**: Configuration and data restoration

---

BucketStack represents a comprehensive solution for modern cloud storage management, combining the power of native desktop applications with the flexibility of cloud storage services. Its extensive feature set and polished user experience make it suitable for both individual users and enterprise environments.