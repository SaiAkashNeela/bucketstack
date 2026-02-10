BucketStack - Desktop S3 File Manager

🔗 Multi-Provider S3 Support
- AWS S3 - Full support with all regions
- Cloudflare R2 - Cloudflare's S3-compatible storage
- MinIO - Self-hosted S3-compatible servers
- Wasabi - Enterprise cloud storage
- DigitalOcean Spaces - Object storage service
- Backblaze B2 - Cost-effective cloud storage
- Custom S3 Endpoints - Any S3-compatible service
- Railway - Integrated deployment platform support

📁 File Management
- File Browsing - Hierarchical folder navigation
- Multiple View Modes:
  - List view (table format)
  - Grid view (thumbnail cards)
  - Gallery view (preview with sidebar)
  - Columns view (finder-style, planned)
- File Operations:
  - Upload files/folders (drag & drop supported)
  - Download individual or multiple files
  - Copy, move, rename, duplicate files/folders
  - Delete with trash system (safe deletion)
  - Restore from trash
  - Empty trash (permanent deletion)

🗜️ File Compression & Archiving
- ZIP Format - Create ZIP archives from selected files
- TAR.GZ Format - Create compressed tarballs
- Batch Compression - Compress multiple files at once
- Download Archives - Create and download archives directly

✏️ File Editing
- Monaco Editor Integration - Professional code editor
- Text File Support - Edit various text formats:
  - Plain text (.txt)
  - Markdown (.md)
  - JSON, XML, HTML, CSS
  - Programming files (.js, .ts, .py, .rs, etc.)
- Save Changes - Direct editing and saving back to S3
- File Preview - View images, PDFs, and text files

🔍 Search & Discovery
- Global Search - Search across entire buckets
- File Type Filtering - Filter by images, documents, etc.
- Sorting Options - By name, size, date modified
- Advanced Filtering - Multiple filter combinations

🔄 Synchronization & Transfer
- Folder Sync - Bidirectional sync between local folders and S3
- Automated Sync Jobs - Scheduled synchronization
- Cross-Bucket Transfer - Move/copy between different buckets/providers
- Background Operations - Non-blocking transfer operations
- Progress Tracking - Real-time transfer progress
- Transfer Queues - Manage multiple concurrent transfers

🔐 Security & Authentication
- **Secure storage**: Machine-bound AES-256-GCM encryption for credential management
- Credential Migration - Automatic upgrade from insecure storage
- Rate Limiting - Prevent abuse and ensure stability
- Security Audit Logging - Track all operations
- Permission Detection - Read-only vs read-write access detection
- HTTPS Enforcement - Warn about insecure connections

📊 Analytics & Insights
- Storage Analytics - Comprehensive bucket analysis
- File Distribution Charts - Pie/bar charts for file types
- Storage Class Analysis - S3 storage class breakdowns
- Age Distribution - File age analysis
- Largest Files Report - Top 20 largest files
- Usage Statistics - Total objects, storage size

📋 Activity Logging
- Comprehensive Logging - All operations tracked
- Activity Export - CSV and JSON export formats
- Filtering & Search - Filter logs by action, status, date
- Performance Metrics - File sizes, operation counts
- Local Database - SQLite-based activity storage

🔗 Sharing & Links
- Pre-signed URLs - Generate time-limited download links
- Custom Expiry - Set link expiration from minutes to months
- Bulk Link Generation - Generate multiple links at once
- Clipboard Integration - Automatic clipboard copying

🎨 User Experience
- Modern UI - Clean, responsive design
- Theme Support - Light, dark, and system themes
- Keyboard Shortcuts - Full keyboard navigation
- Context Menus - Right-click operations
- Floating Action Button - Quick access to common actions
- Toast Notifications - Operation status feedback
- Progress Indicators - Visual progress for all operations

🖥️ Desktop Integration
- System Tray - macOS tray icon with quick actions
- Menu Bar Integration - Native menu bar support
- Quick Upload - Upload files from anywhere
- Window Management - Hide/show, minimize to tray
- Cross-Platform - macOS, Windows, Linux support

📂 Advanced Organization
- Favourites System - Bookmark important files/folders
- Clipboard Operations - Advanced copy/paste between buckets
- Batch Operations - Select and operate on multiple items
- Folder Size Calculation - Calculate sizes of folder hierarchies
- Recursive Operations - Deep folder operations

⚡ Performance Features
- Multipart Uploads - Efficient large file uploads
- Concurrent Operations - Multiple simultaneous transfers
- Background Processing - Non-blocking operations
- Lazy Loading - Efficient large bucket browsing
- Memory Management - Optimized for large file operations

🛡️ Safety Features
- Trash Protection - Prevent accidental .trash/ modification
- Operation Confirmation - Confirm destructive actions
- Conflict Resolution - Handle upload conflicts intelligently
- Error Recovery - Retry failed operations
- Data Integrity - Verify transfers and operations

🔧 Technical Capabilities
- Tauri Framework - Rust backend with web frontend
- AWS SDK Integration - Full S3 API support
- Database Integration - SQLite for activity logs
- Plugin Architecture - Extensible with Tauri plugins
- TypeScript Support - Full type safety
- Error Handling - Comprehensive error management

This is a comprehensive, professional-grade S3 file management application that provides an elegant desktop interface for managing cloud storage across multiple providers, with enterprise-level features like activity logging, security, and performance optimization.

---

## 📋 S3 API Methods Used

### Core Object Operations
- **`list_objects_v2()`**
  - **Used for**: File browsing, folder navigation, search operations
  - **Features**: File explorer views, global search, folder size calculations, analytics scanning
  - **Implementation**: Supports pagination, prefix filtering, delimiter-based folder listing

- **`get_object()`**
  - **Used for**: File downloads, content preview, file editing
  - **Features**: Download files, preview images/PDFs, edit text files, compression operations
  - **Implementation**: Streams large files, supports range requests for partial downloads

- **`put_object()`**
  - **Used for**: File uploads, folder creation, text file saving
  - **Features**: Upload files/folders, save edited files, create folder markers, compression output
  - **Implementation**: Handles small files directly, integrates with multipart for large files

- **`delete_object()`**
  - **Used for**: File/folder deletion, trash operations
  - **Features**: Delete files, empty trash, recursive folder deletion
  - **Implementation**: Supports recursive deletion for folder structures

### Advanced Operations
- **`copy_object()`**
  - **Used for**: File operations, cross-bucket transfers, trash system
  - **Features**: Copy files, move files, duplicate files, restore from trash
  - **Implementation**: Server-side copying (efficient, no data transfer), supports metadata preservation

- **`head_object()`**
  - **Used for**: Metadata retrieval, file validation
  - **Features**: Get file sizes, check existence, retrieve metadata for restore operations
  - **Implementation**: Lightweight HEAD requests without downloading content

### Bucket Management
- **`list_buckets()`**
  - **Used for**: Bucket discovery and management
  - **Features**: Display available buckets, bucket selection interface
  - **Implementation**: Lists all buckets accessible with current credentials

- **`create_bucket()`**
  - **Used for**: Bucket creation
  - **Features**: Create new S3 buckets through UI
  - **Implementation**: Creates buckets in specified regions

- **`delete_bucket()`**
  - **Used for**: Bucket removal
  - **Features**: Delete empty buckets
  - **Implementation**: Only works on empty buckets (S3 requirement)

### Large File Support
- **`create_multipart_upload()`**
  - **Used for**: Large file uploads (>5MB)
  - **Features**: Efficient upload of large files, background transfers
  - **Implementation**: Initiates multipart upload process, returns upload ID

- **`upload_part()`**
  - **Used for**: Chunked uploads
  - **Features**: Parallel upload of file chunks, progress tracking
  - **Implementation**: Uploads individual parts (5MB chunks), supports concurrency

- **`complete_multipart_upload()`**
  - **Used for**: Finalizing large uploads
  - **Features**: Complete multipart uploads, assemble file from parts
  - **Implementation**: Combines all uploaded parts into final object

- **`abort_multipart_upload()`**
  - **Used for**: Error recovery
  - **Features**: Cancel failed multipart uploads, cleanup partial uploads
  - **Implementation**: Removes all uploaded parts on failure

### Sharing & Security
- **`get_object()` with presigned URLs**
  - **Used for**: Secure file sharing
  - **Features**: Generate time-limited download links, temporary access
  - **Implementation**: Creates presigned URLs with configurable expiration

### Cross-Provider Operations
- **Custom endpoint configuration**
  - **Used for**: Multi-provider support
  - **Features**: Cloudflare R2, MinIO, Wasabi, DigitalOcean Spaces, Backblaze B2
  - **Implementation**: Dynamic endpoint URLs, path-style addressing for custom S3 services

### Performance Optimizations
- **Concurrent operations**: Multiple simultaneous requests for better performance
- **Pagination handling**: Efficient browsing of large buckets
- **Lazy loading**: Load content on demand to reduce memory usage
- **Stream processing**: Handle large files without loading entirely into memory

### Error Handling & Resilience
- **Retry logic**: Automatic retry for transient failures
- **Rate limiting**: Prevent API abuse and ensure stability
- **Connection testing**: Validate credentials and permissions before operations
- **Progress tracking**: Real-time feedback for long-running operations

### Security Features
- **HTTPS enforcement**: Warn about insecure HTTP connections
- **Credential validation**: Test connections before saving
- **Permission detection**: Identify read-only vs read-write access
- **Secure storage**: Machine-bound AES-256-GCM encryption