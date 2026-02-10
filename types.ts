export type S3ProviderType = 'aws' | 'cloudflare' | 'minio' | 'digitalocean' | 'wasabi' | 'backblaze' | 'railway' | 'custom';

// Account metadata stored in localStorage (without sensitive credentials)
export interface S3AccountMetadata {
  id: string;
  name: string;
  provider: S3ProviderType;
  endpoint: string; // e.g., https://s3.us-east-1.amazonaws.com or https://<id>.r2.cloudflarestorage.com
  region: string;
  bucketName: string;
  accessMode?: 'read-only' | 'read-write';
  enableTrash?: boolean;
  enableActivityLog?: boolean;
}

// Full account with credentials (used internally, credentials stored securely)
export interface S3Account extends S3AccountMetadata {
  accessKeyId: string;
  secretAccessKey: string;
}

export interface S3Bucket {
  name: string;
  creationDate: string;
}

export interface S3Object {
  key: string;
  name: string;
  lastModified: number;
  size: number;
  type: string; // mime type approximation or extension
  isFolder: boolean;
}

export type ViewMode = 'list' | 'grid' | 'gallery' | 'columns';

export type SortField = 'name' | 'size' | 'date';
export type SortOrder = 'asc' | 'desc';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface FilterOptions {
  search: string;
  fileType: 'all' | 'image' | 'document' | 'other';
}

export interface UploadProgress {
  fileName: string;
  progress: number; // 0 to 100
  status: 'uploading' | 'completed' | 'error';
}

export interface SyncJob {
  id: string;
  name: string; // User-friendly name for the sync job
  accountId: string;
  bucket: string;
  localPath: string;
  remotePath: string;
  direction: 'up' | 'down';
  lastRun?: number;
  status: 'idle' | 'running' | 'completed' | 'error';
  lastStats?: SyncStats;
  intervalSeconds?: number; // 0 or undefined means manual
  nextRun?: number; // timestamp
  mirrorSync?: boolean; // If true, uses --delete flag for exact mirror
}

export interface SyncStats {
  files_scanned: number;
  files_transferred: number;
  bytes_transferred: number;
  errors: string[];
}

export interface ActivityLogEntry {
  id?: number;
  timestamp: string;
  connection_id: string;
  provider: string;
  bucket_name: string;
  action_type: string;
  object_path_before?: string;
  object_path_after?: string;
  status: 'success' | 'failed';
  error_message?: string;
  file_size?: number;
  source: string;
}

export interface ActivityLogFilters {
  connection_id?: string;
  bucket?: string;
  action_type?: string;
  status?: 'success' | 'failed';
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface TransferProgress {
  jobId: string;
  bytesTransferred: number;
  totalBytes: number;
  speed: number;
  status: 'pending' | 'active' | 'completed' | 'error';
  error?: string;
}

export interface TransferJob {
  id: string;
  type: 'copy' | 'move';
  sourceAccount: S3AccountMetadata;
  sourceBucket: string;
  sourceKey: string;
  destAccount: S3AccountMetadata;
  destBucket: string;
  destKey: string;
  fileName: string;
  isFolder: boolean;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  speed: number;
  error?: string;
}

export interface FavouriteItem {
  id: string;
  accountId: string;
  bucket: string;
  key: string;
  name: string;
  isFolder: boolean;
}

export interface BucketAnalytics {
  totalSize: number;
  totalObjects: number;
  largestFiles: S3Object[];
  fileTypeDistribution: { type: string; count: number; size: number }[];
  storageClassDistribution: { storageClass: string; count: number; size: number }[];
  ageDistribution: { ageRange: string; count: number; size: number }[];
  lastUpdated: number;
}