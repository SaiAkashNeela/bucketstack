import { BucketAnalytics, FavouriteItem, S3Account, S3AccountMetadata, S3Bucket, S3Object, SyncStats, TransferJob, TransferProgress } from "../types";
import JSZip from 'jszip';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { secureStorage } from './secureStorage';

// Safe invoke wrapper that handles Tauri initialization errors gracefully
const safeInvoke = async <T = any>(cmd: string, args?: Record<string, any>): Promise<T> => {
  try {
    return await invoke<T>(cmd, args);
  } catch (error: any) {
    // Handle Tauri initialization errors
    if (error?.message?.includes('transformCallback') ||
      error?.message?.includes('__TAURI_INTERNALS__') ||
      error?.message?.includes('undefined')) {
      console.warn('Tauri API not available:', error.message);
      throw new Error('Tauri API is not initialized. Please ensure you are running this in a Tauri application and wait for it to fully load.');
    }
    throw error;
  }
};

// --- Secure Account Storage ---

const ACCOUNTS_KEY = 's3_desktop_accounts';

// Comprehensive application reset
export const clearAllData = async (): Promise<void> => {
  console.warn('🗑️ Starting comprehensive application reset...');

  try {
    // 1. Remove secure items for all accounts
    const metadataList = await s3Service.getAccountMetadata();
    for (const account of metadataList) {
      try {
        await secureStorage.removeItem(`bucketstack-${account.id}-access`);
        await secureStorage.removeItem(`bucketstack-${account.id}-secret`);
      } catch (e) {
        console.warn(`Failed to remove secure item for account ${account.id}:`, e);
      }
    }

    // 2. Call backend reset to clear SQLite and AppData folder
    await safeInvoke('reset_application');

    // 3. Clear all LocalStorage and SessionStorage
    localStorage.clear();
    sessionStorage.clear();

    console.log('✅ All data cleared successfully. Restarting app...');
    // In Tauri, a simple reload is often enough as state is in memory/storage
    window.location.reload();
  } catch (error: any) {
    console.error('❌ Reset failed:', error);
    throw new Error(`Application reset failed: ${error.message}`);
  }
};

// Helper function to get file extension and type
const getFileType = (key: string): string => {
  const extension = key.split('.').pop()?.toLowerCase();
  if (!extension) return 'unknown';

  const typeMap: { [key: string]: string } = {
    'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image', 'webp': 'image', 'svg': 'image',
    'pdf': 'pdf', 'doc': 'document', 'docx': 'document', 'txt': 'text', 'md': 'text',
    'json': 'text', 'xml': 'text', 'html': 'text', 'css': 'text', 'js': 'text', 'ts': 'text',
    'jsx': 'text', 'tsx': 'text', 'py': 'text', 'rs': 'text', 'go': 'text', 'java': 'text',
    'c': 'text', 'cpp': 'text', 'h': 'text', 'hpp': 'text', 'cs': 'text', 'php': 'text',
    'rb': 'text', 'sh': 'text', 'bash': 'text', 'sql': 'text', 'yaml': 'text', 'yml': 'text',
    'toml': 'text', 'ini': 'text', 'dockerfile': 'text', 'graphql': 'text', 'json5': 'text',
    'zip': 'zip', 'rar': 'zip', '7z': 'zip', 'tar': 'zip', 'gz': 'zip',
    'mp4': 'video', 'avi': 'video', 'mov': 'video', 'mkv': 'video',
    'mp3': 'audio', 'wav': 'audio', 'flac': 'audio'
  };

  return typeMap[extension] || 'unknown';
};

// Helper function to extract folder name from key
const getObjectName = (key: string, prefix: string): string => {
  const relativeKey = key.startsWith(prefix) ? key.slice(prefix.length) : key;
  const firstSlash = relativeKey.indexOf('/');
  if (firstSlash === -1) return relativeKey;
  return relativeKey.slice(0, firstSlash);
};

// Migration utility for existing credentials
const migrateToSecureStorage = async (): Promise<void> => {
  const MIGRATION_KEY = 'credentials_migrated_v3_secure_storage';
  if (localStorage.getItem(MIGRATION_KEY)) return; // Already migrated



  try {
    // 1. Migrate from Legacy V1 (s3_desktop_accounts plaintext)
    const legacyAccountsKey = 's3_desktop_accounts';
    const legacyData = localStorage.getItem(legacyAccountsKey);

    if (legacyData) {
      try {
        const legacyAccounts: S3Account[] = JSON.parse(legacyData);
        // Only if it looks like V1 data (has credentials directly)
        const needsMigration = legacyAccounts.some(a => (a as any).accessKeyId && (a as any).secretAccessKey);

        if (needsMigration) {

          for (const account of legacyAccounts) {
            if ((account as any).accessKeyId && (account as any).secretAccessKey) {
              await secureStorage.saveItem(`bucketstack-${account.id}-access`, (account as any).accessKeyId);
              await secureStorage.saveItem(`bucketstack-${account.id}-secret`, (account as any).secretAccessKey);
            }
          }

          // Strip credentials from localStorage metadata
          const cleanedMetadata = legacyAccounts.map(account => {
            const { accessKeyId, secretAccessKey, ...rest } = (account as any);
            return rest;
          });
          localStorage.setItem(legacyAccountsKey, JSON.stringify(cleanedMetadata));
        }
      } catch (e) {
        console.warn('Failed to parse legacy V1 data during migration:', e);
      }
    }

    // 2. Migrate from Legacy V2 (localStorage fallback `_s3_credentials`)
    const v2FallbackKey = '_s3_credentials';
    const v2Data = localStorage.getItem(v2FallbackKey);

    if (v2Data) {

      try {
        const creds = JSON.parse(v2Data);
        for (const [key, value] of Object.entries(creds)) {
          if (typeof value === 'string') {
            await secureStorage.saveItem(key, value);
          }
        }
        // Clear the fallback storage after successful migration
        localStorage.removeItem(v2FallbackKey);
      } catch (e) {
        console.warn('Failed to migrate V2 fallback credentials:', e);
      }
    }

    // Mark migration as complete
    localStorage.setItem(MIGRATION_KEY, 'true');

  } catch (error) {
    console.error('Credential migration failed:', error);
  }
};

// Security audit logging
const logSecurityEvent = (event: string, details?: any) => {
  const timestamp = new Date().toISOString();

};

// Rate limiting helpers
const operationTracker = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_OPERATIONS = 100; // Max operations per minute

const checkRateLimit = (operation: string): boolean => {
  const now = Date.now();
  const operations = operationTracker.get(operation) || [];

  // Remove operations outside the time window
  const recentOperations = operations.filter(time => now - time < RATE_LIMIT_WINDOW);

  if (recentOperations.length >= RATE_LIMIT_MAX_OPERATIONS) {
    logSecurityEvent('RATE_LIMIT_EXCEEDED', { operation, count: recentOperations.length });
    return false;
  }

  recentOperations.push(now);
  operationTracker.set(operation, recentOperations);
  return true;
};

// --- Service Methods ---

export const s3Service = {
  // Initialize migration on first load
  initialize: async (): Promise<void> => {
    logSecurityEvent('SERVICE_INITIALIZED');
    await migrateToSecureStorage();
  },

  getAccounts: async (): Promise<S3Account[]> => {
    if (!checkRateLimit('get_accounts')) {
      throw new Error('Rate limit exceeded. Too many account retrieval operations.');
    }

    // Ensure migration has run
    await migrateToSecureStorage();

    logSecurityEvent('ACCOUNTS_RETRIEVED', { count: 'retrieving' });

    const stored = localStorage.getItem(ACCOUNTS_KEY);
    const metadataList: S3AccountMetadata[] = stored ? JSON.parse(stored) : [];

    // Retrieve credentials for each account from secure storage
    const accounts: S3Account[] = [];
    const staleAccountIds: string[] = [];

    for (const metadata of metadataList) {
      try {
        let accessKeyId = '';
        let secretAccessKey = '';

        // Retrieve from Secure Storage
        try {
          const access = await secureStorage.getItem(`bucketstack-${metadata.id}-access`);
          const secret = await secureStorage.getItem(`bucketstack-${metadata.id}-secret`);

          if (access) accessKeyId = access;
          if (secret) secretAccessKey = secret;
        } catch (storageError) {
          console.error(`Secure storage error for account ${metadata.id}:`, storageError);
        }

        if (accessKeyId && secretAccessKey) {
          accounts.push({
            ...metadata,
            accessKeyId: accessKeyId.trim(),
            secretAccessKey: secretAccessKey.trim()
          });
        } else {
          // Mark account as stale (missing credentials)
          staleAccountIds.push(metadata.id);
          console.warn(`Account ${metadata.id} is missing credentials - marked for cleanup`);
        }
      } catch (error) {
        console.warn(`Failed to retrieve credentials for account ${metadata.id}:`, error);
        logSecurityEvent('CREDENTIAL_RETRIEVAL_FAILED', { accountId: metadata.id });
        // Mark as stale
        staleAccountIds.push(metadata.id);
      }
    }

    // Clean up stale accounts (missing credentials) from localStorage
    if (staleAccountIds.length > 0) {
      console.log(`Cleaning up ${staleAccountIds.length} stale account(s) due to missing credentials`);
      const updatedMetadata = metadataList.filter(m => !staleAccountIds.includes(m.id));
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updatedMetadata));
      logSecurityEvent('STALE_ACCOUNTS_CLEANED', { count: staleAccountIds.length, ids: staleAccountIds });
    }

    logSecurityEvent('ACCOUNTS_LOADED', { count: accounts.length });
    return accounts;
  },

  getAccountMetadata: async (): Promise<S3AccountMetadata[]> => {
    const stored = localStorage.getItem(ACCOUNTS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  saveAccount: async (account: S3Account): Promise<void> => {
    if (!checkRateLimit('save_account')) {
      throw new Error('Rate limit exceeded. Too many account save operations.');
    }

    // Validate account has required fields
    if (!account.accessKeyId || !account.secretAccessKey) {
      throw new Error('Account is missing access key or secret key');
    }

    if (!account.bucketName) {
      throw new Error('Account is missing bucket name');
    }

    logSecurityEvent('ACCOUNT_SAVE_STARTED', {
      accountId: account.id,
      provider: account.provider,
      endpoint: account.endpoint
    });

    try {
      // Store credentials securely using SecureStorage
      await secureStorage.saveItem(`bucketstack-${account.id}-access`, account.accessKeyId.trim());
      await secureStorage.saveItem(`bucketstack-${account.id}-secret`, account.secretAccessKey.trim());


      // Store metadata in localStorage (without credentials)
      const metadataList = await s3Service.getAccountMetadata();
      const metadata: S3AccountMetadata = {
        id: account.id,
        name: account.name,
        provider: account.provider,
        endpoint: (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint,
        region: account.region,
        bucketName: account.bucketName,
        accessMode: account.accessMode || 'read-only', // Default to read-only if not verified
        enableTrash: account.enableTrash,
        enableActivityLog: account.enableActivityLog
      };

      // Filter out existing entry with same ID to prevent duplicates
      const others = metadataList.filter(a => a.id !== account.id);
      const updated = [...others, metadata];

      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));

      logSecurityEvent('ACCOUNT_SAVE_SUCCESS', { accountId: account.id, name: account.name });
    } catch (error: any) {
      logSecurityEvent('ACCOUNT_SAVE_FAILED', { accountId: account.id, error: error.message });
      // Provide more helpful error message
      if (error.message?.includes('secure') || error.message?.includes('storage')) {
        throw new Error(`Failed to save credentials securely: ${error.message}`);
      }
      throw error;
    }
  },

  deleteAccount: async (id: string): Promise<void> => {
    if (!checkRateLimit('delete_account')) {
      throw new Error('Rate limit exceeded. Too many account deletion operations.');
    }

    logSecurityEvent('ACCOUNT_DELETE_STARTED', { accountId: id });

    try {
      // Delete credentials from SecureStorage
      await secureStorage.removeItem(`bucketstack-${id}-access`);
      await secureStorage.removeItem(`bucketstack-${id}-secret`);

      // Remove metadata from localStorage
      const metadataList = await s3Service.getAccountMetadata();
      const updated = metadataList.filter(a => a.id !== id);
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));

      logSecurityEvent('ACCOUNT_DELETE_SUCCESS', { accountId: id });
    } catch (error: any) {
      logSecurityEvent('ACCOUNT_DELETE_FAILED', { accountId: id, error: error.message });
      throw error;
    }
  },

  deleteAllAccounts: async (): Promise<void> => {
    logSecurityEvent('ALL_ACCOUNTS_DELETE_STARTED');
    try {
      const metadataList = await s3Service.getAccountMetadata();
      for (const account of metadataList) {
        // Delete credentials from SecureStorage
        try {
          await secureStorage.removeItem(`bucketstack-${account.id}-access`);
          await secureStorage.removeItem(`bucketstack-${account.id}-secret`);
        } catch (e) {
          console.warn('Failed to remove item from secure storage during cleanup', e);
        }
      }
      // Final cleanup of the main accounts key
      localStorage.removeItem(ACCOUNTS_KEY);
      logSecurityEvent('ALL_ACCOUNTS_DELETE_SUCCESS');
    } catch (error: any) {
      logSecurityEvent('ALL_ACCOUNTS_DELETE_FAILED', { error: error.message });
      throw error;
    }
  },

  testConnection: async (account: Partial<S3Account>): Promise<{ success: boolean; accessMode: 'read-only' | 'read-write'; message: string }> => {
    if (!account.endpoint || !account.accessKeyId || !account.secretAccessKey || !account.region || !account.bucketName) {
      throw new Error("Missing required credentials or bucket name");
    }

    // Security warning for insecure connections
    if (account.endpoint?.startsWith('http://')) {
      console.warn('⚠️ SECURITY WARNING: Using insecure HTTP connection. Credentials will be transmitted unencrypted.');
    }

    // Security warning for custom/self-hosted endpoints
    if (account.provider === 'minio' || account.provider === 'custom') {
      console.warn('⚠️ SECURITY WARNING: Using custom S3 endpoint. Ensure this endpoint uses HTTPS and has proper SSL certificates.');
    }

    try {
      // 1. Basic Connection Test (Read/List Permissions)
      const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;

      const response = await invoke<{ success: boolean; message: string }>('test_s3_connection', {
        endpoint: sanitizedEndpoint,
        region: account.region,
        accessKeyId: account.accessKeyId.trim(),
        secretAccessKey: account.secretAccessKey.trim(),
        testBucket: account.bucketName,
      });

      if (!response.success) {
        throw new Error(response.message || 'Connection test failed');
      }

      // 2. Write Permission Probe
      // Attempt to create a small temporary file to verify write access
      let accessMode: 'read-only' | 'read-write' = 'read-only';
      // Use a fixed hidden file path to avoid spamming thousands of probe files
      const probeKey = '.bucketstack/.probe';

      try {
        await invoke<boolean>('upload_file', {
          endpoint: sanitizedEndpoint,
          region: account.region,
          accessKeyId: account.accessKeyId.trim(),
          secretAccessKey: account.secretAccessKey.trim(),
          bucket: account.bucketName,
          key: probeKey,
          body: [32], // Single space byte
          contentType: 'text/plain',
        });

        // If upload succeeded, we have write access. Now clean up.
        accessMode = 'read-write';

        await invoke<boolean>('delete_object', {
          endpoint: sanitizedEndpoint,
          region: account.region,
          accessKeyId: account.accessKeyId.trim(),
          secretAccessKey: account.secretAccessKey.trim(),
          bucket: account.bucketName,
          key: probeKey,
        });

      } catch (writeError: any) {
        console.warn('Write probe failed, assuming read-only access:', writeError);
        // If it's an access denied error, it's definitely read-only. 
        // For other errors, we also default to read-only to be safe, but log it.
      }

      return {
        success: true,
        accessMode,
        message: accessMode === 'read-only'
          ? 'Connection Successful: Read-Only Access Detected'
          : 'Connection Successful: Read & Write Access Detected'
      };

    } catch (error: any) {
      console.error('Connection test failed:', error);

      // Provide more specific error messages
      if (error.message?.includes('InvalidAccessKeyId')) {
        throw new Error("Invalid Access Key ID - Check your credentials");
      } else if (error.message?.includes('SignatureDoesNotMatch')) {
        throw new Error("Invalid Secret Access Key - Check your credentials");
      } else if (error.message?.includes('NoSuchBucket')) {
        throw new Error(`Bucket "${account.bucketName}" does not exist. Create the bucket or check the name.`);
      } else if (error.message?.includes('AccessDenied')) {
        throw new Error(`Access denied to bucket "${account.bucketName}". Check your credentials and permissions.`);
      } else if (error.message?.includes('Failed to access bucket')) {
        throw new Error(`Cannot access bucket: ${error.message}`);
      } else {
        throw new Error(`Connection failed: ${error.message || "Unknown error occurred"}`);
      }
    }
  },

  // --- Bucket Operations ---
  // Directly browse the bucket specified in account.bucketName
  createBucket: async (account: S3Account, bucketName: string): Promise<S3Bucket> => {
    try {
      // Use Rust backend to create bucket (bypasses CORS)
      const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;

      const success = await invoke<boolean>('create_bucket', {
        endpoint: sanitizedEndpoint,
        region: account.region,
        accessKeyId: account.accessKeyId.trim(),
        secretAccessKey: account.secretAccessKey.trim(),
        bucket: bucketName,
      });

      if (!success) {
        throw new Error('Failed to create bucket');
      }

      // Return the bucket info
      return {
        name: bucketName,
        creationDate: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Failed to create bucket:', error);
      if (error.message?.includes('BucketAlreadyExists')) {
        throw new Error("Bucket already exists");
      } else if (error.message?.includes('BucketAlreadyOwnedByYou')) {
        throw new Error("Bucket already owned by you");
      } else {
        throw new Error(`Failed to create bucket: ${error.message}`);
      }
    }
  },

  deleteBucket: async (account: S3Account, bucketName: string): Promise<void> => {
    try {
      // Use Rust backend to delete bucket (bypasses CORS)
      const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;

      const success = await invoke<boolean>('delete_bucket', {
        endpoint: sanitizedEndpoint,
        region: account.region,
        accessKeyId: account.accessKeyId.trim(),
        secretAccessKey: account.secretAccessKey.trim(),
        bucket: bucketName,
      });

      if (!success) {
        throw new Error('Failed to delete bucket');
      }
    } catch (error: any) {
      console.error('Failed to delete bucket:', error);
      if (error.message?.includes('BucketNotEmpty')) {
        throw new Error("Bucket is not empty");
      } else if (error.message?.includes('NoSuchBucket')) {
        throw new Error("Bucket does not exist");
      } else {
        throw new Error(`Failed to delete bucket: ${error.message}`);
      }
    }
  },

  // --- Object Operations ---

  listObjects: async (account: S3Account, bucket: string, prefix: string): Promise<S3Object[]> => {
    try {
      // Use Rust backend to list objects (bypasses browser CORS)
      const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;

      const response = await invoke<{ success: boolean; objects: Array<{ key: string; size: number; last_modified: string; is_folder: boolean }>; message: string }>('list_objects', {
        endpoint: sanitizedEndpoint,
        region: account.region,
        accessKeyId: account.accessKeyId.trim(),
        secretAccessKey: account.secretAccessKey.trim(),
        bucket,
        prefix,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to list objects');
      }

      const objects: S3Object[] = response.objects.map(obj => ({
        key: obj.key,
        name: obj.is_folder ? obj.key.split('/').filter(p => p).pop() || obj.key : obj.key.split('/').pop() || obj.key,
        size: obj.size,
        type: obj.is_folder ? 'folder' : getFileType(obj.key),
        lastModified: new Date(obj.last_modified).getTime() || Date.now(),
        isFolder: obj.is_folder,
      }));

      // Sort: folders first, then files, both alphabetically
      return objects.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error: any) {
      console.error('Failed to list objects:', error);
      if (error.message?.includes('NoSuchBucket')) {
        throw new Error("Bucket does not exist");
      } else if (error.message?.includes('AccessDenied')) {
        throw new Error("Access denied to bucket");
      } else {
        throw new Error(`Failed to list objects: ${error.message}`);
      }
    }
  },

  calculateFolderSizes: async (
    account: S3Account,
    bucket: string,
    prefix: string
  ): Promise<Record<string, number>> => {
    try {
      const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;
      const sizes = await invoke<Record<string, number>>('calculate_folder_size', {
        endpoint: sanitizedEndpoint,
        region: account.region,
        accessKeyId: account.accessKeyId.trim(),
        secretAccessKey: account.secretAccessKey.trim(),
        bucket,
        prefix,
      });
      return sizes;
    } catch (error: any) {
      console.error('Failed to calculate folder sizes:', error);
      return {};
    }
  },

  uploadFile: async (
    account: S3Account,
    bucket: string,
    prefix: string,
    file: File,
    onProgress: (progress: number) => void,
    overrideName?: string
  ): Promise<void> => {
    try {
      const key = prefix + (overrideName || file.name);
      const fileSize = file.size;
      const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

      if (fileSize <= CHUNK_SIZE) {
        // --- Simple Upload (Small Files) ---
        const arrayBuffer = await file.arrayBuffer();
        const body = Array.from(new Uint8Array(arrayBuffer));

        const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;

        await invoke<boolean>('upload_file', {
          endpoint: sanitizedEndpoint,
          region: account.region,
          accessKeyId: account.accessKeyId.trim(),
          secretAccessKey: account.secretAccessKey.trim(),
          bucket,
          key,
          body,
          contentType: file.type || 'application/octet-stream',
        });
        onProgress(100);
      } else {
        // --- Multipart Upload (Large Files) ---
        const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;

        // 1. Initiate
        const uploadId = await invoke<string>('create_multipart_upload', {
          endpoint: sanitizedEndpoint,
          region: account.region,
          accessKeyId: account.accessKeyId.trim(),
          secretAccessKey: account.secretAccessKey.trim(),
          bucket,
          key,
          contentType: file.type || 'application/octet-stream',
        });

        try {
          // 2. Upload Parts
          const totalParts = Math.ceil(fileSize / CHUNK_SIZE);
          const parts: { e_tag: string; part_number: number }[] = [];

          for (let i = 0; i < totalParts; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, fileSize);
            const chunk = file.slice(start, end);
            const buffer = await chunk.arrayBuffer();
            const body = Array.from(new Uint8Array(buffer));

            const eTag = await invoke<string>('upload_part', {
              endpoint: sanitizedEndpoint,
              region: account.region,
              accessKeyId: account.accessKeyId.trim(),
              secretAccessKey: account.secretAccessKey.trim(),
              bucket,
              key,
              uploadId,
              partNumber: i + 1,
              body,
            });

            parts.push({ e_tag: eTag, part_number: i + 1 });

            // Validate upload ID hasn't been aborted remotely if possible (not easy here)
            // Report progress
            const progress = Math.round(((i + 1) / totalParts) * 100);
            onProgress(progress);
          }

          // 3. Complete
          await invoke<boolean>('complete_multipart_upload', {
            endpoint: sanitizedEndpoint,
            region: account.region,
            accessKeyId: account.accessKeyId.trim(),
            secretAccessKey: account.secretAccessKey.trim(),
            bucket,
            key,
            uploadId,
            parts,
          });

        } catch (error) {
          console.error('Multipart upload failed, aborting...', error);
          await invoke('abort_multipart_upload', {
            endpoint: sanitizedEndpoint,
            region: account.region,
            accessKeyId: account.accessKeyId.trim(),
            secretAccessKey: account.secretAccessKey.trim(),
            bucket,
            key,
            uploadId,
          }).catch(e => console.error('Failed to abort:', e));
          throw error;
        }
      }

    } catch (error: any) {
      console.error('Failed to upload file:', error);
      if (error.message?.includes('NoSuchBucket')) {
        throw new Error("Bucket does not exist");
      } else if (error.message?.includes('AccessDenied')) {
        throw new Error("Access denied to bucket");
      } else {
        throw new Error(`Failed to upload file: ${error.message}`);
      }
    }
  },

  getFileContent: async (account: S3Account, bucket: string, key: string): Promise<string> => {
    try {
      const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;

      const content = await invoke<string>('get_file_content', {
        endpoint: sanitizedEndpoint,
        region: account.region,
        accessKeyId: account.accessKeyId.trim(),
        secretAccessKey: account.secretAccessKey.trim(),
        bucket,
        key,
      });
      return content;
    } catch (error: any) {
      console.error('Failed to get file content:', error);
      throw new Error(`Failed to load file: ${error.message}`);
    }
  },

  searchObjects: async (account: S3Account, bucket: string, query: string): Promise<S3Object[]> => {
    try {
      const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;

      const response = await invoke<any[]>('search_objects', {
        endpoint: sanitizedEndpoint,
        region: account.region,
        accessKeyId: account.accessKeyId.trim(),
        secretAccessKey: account.secretAccessKey.trim(),
        bucket,
        query,
      });

      // Map raw Rust S3Object to interface
      return response.map(obj => ({
        key: obj.key,
        name: obj.key.split('/').pop() || obj.key,
        size: obj.size,
        type: obj.is_folder ? 'folder' : getFileType(obj.key),
        lastModified: new Date(obj.last_modified).getTime() || Date.now(),
        isFolder: obj.is_folder,
      }));
    } catch (error: any) {
      console.error('Failed to search objects:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  },

  createFolder: async (account: S3Account, bucket: string, prefix: string, folderName: string): Promise<void> => {
    try {
      const safeName = folderName.replace(/\//g, '');
      if (!safeName) throw new Error("Invalid folder name.");

      const folderPath = prefix + safeName;

      // Use Rust backend to create folder (zero-byte object ending with /)
      const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;

      await invoke<boolean>('create_folder', {
        endpoint: sanitizedEndpoint,
        region: account.region,
        accessKeyId: account.accessKeyId.trim(),
        secretAccessKey: account.secretAccessKey.trim(),
        bucket,
        folderPath,
      });
    } catch (error: any) {
      console.error('Failed to create folder:', error);
      if (error.message?.includes('AccessDenied')) {
        throw new Error("Access denied: Cannot create folder.");
      } else {
        throw new Error(`Failed to create folder: ${error.message}`);
      }
    }
  },

  deleteObject: async (account: S3Account, bucket: string, object: S3Object, prefix: string): Promise<void> => {
    try {
      if (object.isFolder) {
        // For folders, we need to delete all objects with the folder prefix
        const objectsToDelete = await s3Service.listObjects(account, bucket, object.key);

        if (objectsToDelete.length > 0) {
          // Delete all objects in the folder recursively via the service to ensure soft-delete logic is applied
          for (const obj of objectsToDelete) {
            await s3Service.deleteObject(account, bucket, obj, prefix);
          }
        }

        // Delete the folder marker itself
        // Note: Folder markers should also be soft-deleted if they are distinct objects
        const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;

        // Check for Trash (only if not already in trash)
        if (account.enableTrash && !object.key.startsWith('.trash/')) {
          const trashKey = `.trash/${object.key}`;
          await invoke<boolean>('copy_object', {
            endpoint: sanitizedEndpoint,
            region: account.region,
            accessKeyId: account.accessKeyId.trim(),
            secretAccessKey: account.secretAccessKey.trim(),
            bucket,
            sourceKey: object.key,
            destKey: trashKey,
            metadata: {
              'original-path': object.key,
              'deleted-at': new Date().toISOString()
            }
          });
        }

        await invoke<boolean>('delete_object', {
          endpoint: sanitizedEndpoint,
          region: account.region,
          accessKeyId: account.accessKeyId.trim(),
          secretAccessKey: account.secretAccessKey.trim(),
          bucket,
          key: object.key,
        });

      } else {
        const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;

        // Check for Trash (only if not already in trash)
        if (account.enableTrash && !object.key.startsWith('.trash/')) {
          const trashKey = `.trash/${object.key}`;
          await invoke<boolean>('copy_object', {
            endpoint: sanitizedEndpoint,
            region: account.region,
            accessKeyId: account.accessKeyId.trim(),
            secretAccessKey: account.secretAccessKey.trim(),
            bucket,
            sourceKey: object.key,
            destKey: trashKey,
            metadata: {
              'original-path': object.key,
              'deleted-at': new Date().toISOString()
            }
          });
        }

        // Delete single object using Rust backend (bypasses CORS)
        await invoke<boolean>('delete_object', {
          endpoint: sanitizedEndpoint,
          region: account.region,
          accessKeyId: account.accessKeyId.trim(),
          secretAccessKey: account.secretAccessKey.trim(),
          bucket,
          key: object.key,
        });
      }
    } catch (error: any) {
      console.error('Failed to delete object:', error);
      if (error.message?.includes('NoSuchBucket')) {
        throw new Error("Bucket does not exist");
      } else if (error.message?.includes('NoSuchKey')) {
        throw new Error("Object does not exist");
      } else if (error.message?.includes('AccessDenied')) {
        throw new Error("Access denied to bucket");
      } else {
        throw new Error(`Failed to delete object: ${error.message}`);
      }
    }
  },

  renameObject: async (account: S3Account, bucket: string, object: S3Object, newName: string, prefix: string): Promise<void> => {
    try {
      const isFolder = object.isFolder;
      const newKey = prefix + newName + (isFolder ? '/' : '');

      if (isFolder) {
        // For folders, we need to rename all objects with the folder prefix
        const objectsToMove = await s3Service.listObjects(account, bucket, object.key);

        // Rename all objects in the folder
        for (const obj of objectsToMove) {
          const newObjKey = obj.key.replace(object.key, newKey);
          await invoke<boolean>('rename_object', {
            endpoint: account.endpoint,
            region: account.region,
            accessKeyId: account.accessKeyId.trim(),
            secretAccessKey: account.secretAccessKey.trim(),
            bucket,
            oldKey: obj.key,
            newKey: newObjKey,
          });
        }

        const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;

        // Rename the folder marker itself
        await invoke<boolean>('rename_object', {
          endpoint: sanitizedEndpoint,
          region: account.region,
          accessKeyId: account.accessKeyId.trim(),
          secretAccessKey: account.secretAccessKey.trim(),
          bucket,
          oldKey: object.key,
          newKey,
        });
      } else {
        const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;

        // Rename single object using Rust backend (copy + delete)
        await invoke<boolean>('rename_object', {
          endpoint: sanitizedEndpoint,
          region: account.region,
          accessKeyId: account.accessKeyId.trim(),
          secretAccessKey: account.secretAccessKey.trim(),
          bucket,
          oldKey: object.key,
          newKey,
        });
      }
    } catch (error: any) {
      console.error('Failed to rename object:', error);
      if (error.message?.includes('AccessDenied')) {
        throw new Error("Access Denied: Check your permissions (e.g., s3:PutObject, s3:DeleteObject).");
      }
      throw error;
    }
  },

  copyObject: async (
    account: S3Account,
    sourceBucket: string,
    object: S3Object,
    destBucket: string,
    destPrefix: string,
    newName?: string
  ): Promise<S3Object> => {
    try {
      const targetName = newName || object.name;
      const targetKey = destPrefix + targetName + (object.isFolder ? '/' : '');

      // Get destination objects to check for conflicts
      const destObjects = await s3Service.listObjects(account, destBucket, destPrefix);

      // Auto-rename if collision
      let finalName = targetName;
      let finalKey = targetKey;
      let counter = 1;

      while (destObjects.some(o => o.key === finalKey)) {
        const nameParts = targetName.split('.');
        const ext = nameParts.length > 1 ? '.' + nameParts.pop() : '';
        const base = nameParts.join('.');
        finalName = `${base} copy ${counter}${ext}`;
        finalKey = destPrefix + finalName + (object.isFolder ? '/' : '');
        counter++;
      }

      if (object.isFolder) {
        const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;

        // For folders, use recursive sync (like aws s3 sync)
        await invoke<boolean>('copy_objects_folder', {
          endpoint: sanitizedEndpoint,
          region: account.region,
          accessKeyId: account.accessKeyId.trim(),
          secretAccessKey: account.secretAccessKey.trim(),
          sourceBucket,
          sourcePrefix: object.key,
          destBucket,
          destPrefix: finalKey,
        });
      } else {
        const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;

        // For single files, use simple copy (like aws s3 cp)
        await invoke<boolean>('copy_object_file', {
          endpoint: sanitizedEndpoint,
          region: account.region,
          accessKeyId: account.accessKeyId.trim(),
          secretAccessKey: account.secretAccessKey.trim(),
          sourceBucket,
          sourceKey: object.key,
          destBucket,
          destKey: finalKey,
        });
      }

      return {
        ...object,
        key: finalKey,
        name: finalName,
        lastModified: Date.now(),
      };
    } catch (error: any) {
      console.error('Failed to copy object:', error);
      if (error.message?.includes('NoSuchBucket')) {
        throw new Error("Source or destination bucket does not exist");
      } else if (error.message?.includes('NoSuchKey')) {
        throw new Error("Object does not exist");
      } else if (error.message?.includes('AccessDenied')) {
        throw new Error("Access denied to bucket");
      } else {
        throw new Error(`Failed to copy object: ${error.message}`);
      }
    }
  },

  compressObjects: async (account: S3Account, bucket: string, objects: S3Object[], prefix: string): Promise<S3Object> => {
    throw new Error('Compress objects through Rust backend is not yet implemented. Please add this feature to the backend.');
  },

  getPresignedUrl: async (account: S3Account, bucket: string, object: S3Object, expiresIn: number = 3600): Promise<string> => {
    try {
      const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;

      const url = await invoke<string>('get_signed_url', {
        endpoint: sanitizedEndpoint,
        region: account.region,
        accessKeyId: account.accessKeyId.trim(),
        secretAccessKey: account.secretAccessKey.trim(),
        bucket,
        key: object.key,
        expiresIn
      });

      return url;
    } catch (error: any) {
      console.error('Failed to generate signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  },

  // Alias for backward compatibility
  getDownloadUrl: async (account: S3Account, bucket: string, object: S3Object): Promise<string> => {
    return s3Service.getPresignedUrl(account, bucket, object, 3600);
  },

  getObjectMetadata: async (account: S3Account, bucket: string, key: string): Promise<Record<string, string>> => {
    try {
      const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;
      const meta = await invoke<Record<string, string>>('head_object', {
        endpoint: sanitizedEndpoint,
        region: account.region,
        accessKeyId: account.accessKeyId.trim(),
        secretAccessKey: account.secretAccessKey.trim(),
        bucket,
        key
      });
      return meta;
    } catch (error: any) {
      console.error('Failed to get object metadata:', error);
      // If not found, return empty
      return {};
    }
  },

  restoreObject: async (account: S3Account, bucket: string, object: S3Object): Promise<void> => {
    // 1. Get metadata to find original path
    const meta = await s3Service.getObjectMetadata(account, bucket, object.key);
    // Default original path is removing .trash/ prefix
    let originalKey = object.key.replace(/^\.trash\//, '');

    // Check for stored metadata 'original-path' (S3 metadata keys are lowercase usually)
    if (meta['original-path']) {
      originalKey = meta['original-path'];
    } else if (meta['Original-Path']) {
      originalKey = meta['Original-Path'];
    }

    // 2. Copy back
    const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;
    await invoke<boolean>('copy_object', {
      endpoint: sanitizedEndpoint,
      region: account.region,
      accessKeyId: account.accessKeyId.trim(),
      secretAccessKey: account.secretAccessKey.trim(),
      bucket,
      sourceKey: object.key,
      destKey: originalKey,
      metadata: null // No metadata needed for restored object (or preserve?)
    });

    // 3. Delete from trash
    await invoke<boolean>('delete_object', {
      endpoint: sanitizedEndpoint,
      region: account.region,
      accessKeyId: account.accessKeyId.trim(),
      secretAccessKey: account.secretAccessKey.trim(),
      bucket,
      key: object.key
    });
    await invoke<boolean>('delete_object', {
      endpoint: sanitizedEndpoint,
      region: account.region,
      accessKeyId: account.accessKeyId.trim(),
      secretAccessKey: account.secretAccessKey.trim(),
      bucket,
      key: object.key
    });
  },

  syncFolder: async (
    account: S3Account,
    bucket: string,
    localPath: string,
    remotePath: string,
    direction: 'up' | 'down',
    mirrorSync: boolean = false
  ): Promise<SyncStats> => {
    const sanitizedEndpoint = (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint;
    return await invoke<SyncStats>('sync_folder', {
      endpoint: sanitizedEndpoint,
      region: account.region,
      accessKeyId: account.accessKeyId.trim(),
      secretAccessKey: account.secretAccessKey.trim(),
      bucket,
      localPath,
      remotePath,
      direction,
      mirrorSync: mirrorSync
    });
  },

  transferObjects: async (
    jobs: TransferJob[],
    onProgress: (progress: TransferProgress) => void
  ): Promise<void> => {
    // Listen for progress events from the backend
    const unlisten = await listen<TransferProgress>('transfer-progress', (event) => {
      onProgress(event.payload);
    });

    try {
      for (const job of jobs) {
        const isSameAccount = job.sourceAccount.id === job.destAccount.id;
        const isSameProvider = job.sourceAccount.provider === job.destAccount.provider &&
          job.sourceAccount.endpoint === job.destAccount.endpoint;

        // Fetch full account details (including credentials)
        const accounts = await s3Service.getAccounts();
        const sourceAcc = accounts.find(a => a.id === job.sourceAccount.id);
        const destAcc = accounts.find(a => a.id === job.destAccount.id);

        if (!sourceAcc || !destAcc) throw new Error("Account details missing");

        const sEndpoint = (sourceAcc.endpoint && sourceAcc.endpoint.includes('amazonaws.com')) ? '' : sourceAcc.endpoint;
        const dEndpoint = (destAcc.endpoint && destAcc.endpoint.includes('amazonaws.com')) ? '' : destAcc.endpoint;

        if (isSameAccount && job.sourceBucket === job.destBucket) {
          // Rename/Move within same bucket
          if (job.type === 'move') {
            await s3Service.renameObject(sourceAcc, job.sourceBucket, { key: job.sourceKey, isFolder: job.isFolder } as S3Object, job.destKey.split('/').filter(p => p).pop()!, job.destKey.substring(0, job.destKey.lastIndexOf('/') + 1));
          } else {
            await s3Service.copyObject(sourceAcc, job.sourceBucket, { key: job.sourceKey, name: job.fileName, isFolder: job.isFolder } as S3Object, job.destBucket, job.destKey.substring(0, job.destKey.lastIndexOf('/') + 1));
          }
        } else if (isSameProvider) {
          // Optimized intra-provider copy
          if (job.isFolder) {
            await invoke('copy_objects_folder', {
              endpoint: sEndpoint,
              region: sourceAcc.region,
              accessKeyId: sourceAcc.accessKeyId,
              secretAccessKey: sourceAcc.secretAccessKey,
              sourceBucket: job.sourceBucket,
              sourcePrefix: job.sourceKey,
              destBucket: job.destBucket,
              destPrefix: job.destKey,
            });
          } else {
            await invoke('copy_object_file', {
              endpoint: sEndpoint,
              region: sourceAcc.region,
              accessKeyId: sourceAcc.accessKeyId,
              secretAccessKey: sourceAcc.secretAccessKey,
              sourceBucket: job.sourceBucket,
              sourceKey: job.sourceKey,
              destBucket: job.destBucket,
              destKey: job.destKey,
            });
          }
        } else {
          // Cross-provider streaming
          if (job.isFolder) {
            // For folders, we need to list and transfer each file
            const objects = await s3Service.listObjects(sourceAcc, job.sourceBucket, job.sourceKey);
            for (const obj of objects) {
              if (obj.isFolder) continue; // listObjects should handle nested?
              const relativeKey = obj.key.replace(job.sourceKey, '');
              await invoke('stream_transfer_object', {
                jobId: job.id,
                sEndpoint, sRegion: sourceAcc.region, sAccessKey: sourceAcc.accessKeyId, sSecretKey: sourceAcc.secretAccessKey,
                sBucket: job.sourceBucket, sKey: obj.key,
                dEndpoint, dRegion: destAcc.region, dAccessKey: destAcc.accessKeyId, dSecretKey: destAcc.secretAccessKey,
                dBucket: job.destBucket, dKey: job.destKey + relativeKey
              });
            }
          } else {
            await invoke('stream_transfer_object', {
              jobId: job.id,
              sEndpoint, sRegion: sourceAcc.region, sAccessKey: sourceAcc.accessKeyId, sSecretKey: sourceAcc.secretAccessKey,
              sBucket: job.sourceBucket, sKey: job.sourceKey,
              dEndpoint, dRegion: destAcc.region, dAccessKey: destAcc.accessKeyId, dSecretKey: destAcc.secretAccessKey,
              dBucket: job.destBucket, dKey: job.destKey
            });
          }
        }

        // TODO: Cross-bucket move is deferred for future release as it's a sensitive operation.
        // For now, users should copy to bucket first, then manually delete from source if needed.
        // This ensures data safety and prevents accidental data loss.
        // 
        // Handle Move (delete source) - ONLY after successful transfer
        // if (job.type === 'move' && !(isSameAccount && job.sourceBucket === job.destBucket)) {
        //   console.log(`[Transfer] Copy successful for ${job.fileName}, now removing from source: ${job.sourceKey}`);
        //   // deleteObject already respects account.enableTrash and moves to .trash/ if enabled
        //   await s3Service.deleteObject(sourceAcc, job.sourceBucket, { key: job.sourceKey, isFolder: job.isFolder } as S3Object, "");
        // }

        // Activity Logging
        await s3Service.logActivity({
          connection_id: sourceAcc.id,
          provider: sourceAcc.provider,
          bucket_name: job.sourceBucket,
          action_type: job.type === 'move' ? 'move' : 'copy',
          object_path_before: job.sourceKey,
          object_path_after: `${destAcc.bucketName}/${job.destKey}`,
          status: 'success',
          source: 'user'
        });
      }
    } finally {
      unlisten();
    }
  },

  scanBucket: async (account: S3Account, bucket: string, onProgress?: (scanned: number) => void): Promise<BucketAnalytics> => {
    if (!checkRateLimit('scan_bucket')) {
      throw new Error('Rate limit exceeded for bucket scanning.');
    }

    logSecurityEvent('BUCKET_SCAN_STARTED', { bucket });
    const startTime = Date.now();
    let totalSize = 0;
    let totalObjects = 0;
    const largestFiles: S3Object[] = [];
    const typeMap = new Map<string, { count: number, size: number }>();
    const classMap = new Map<string, { count: number, size: number }>();
    const ageMap = new Map<string, { count: number, size: number }>();

    let continuationToken: string | undefined = undefined;
    const MAX_SCAN = 500000; // Limit for performance in desktop app (500k objects)

    try {
      do {
        const res: any = await safeInvoke('list_objects_recursive', {
          endpoint: (account.endpoint && account.endpoint.includes('amazonaws.com')) ? '' : account.endpoint,
          region: account.region,
          accessKeyId: account.accessKeyId.trim(),
          secretAccessKey: account.secretAccessKey.trim(),
          bucket,
          prefix: '',
          continuationToken,
          maxKeys: 1000
        });

        if (!res.success) throw new Error(res.message);

        for (const obj of res.objects as any[]) {
          if (obj.is_folder) continue;

          totalObjects++;
          totalSize += obj.size;

          // Track largest files
          largestFiles.push({
            key: obj.key,
            name: obj.key.split('/').pop() || obj.key,
            size: obj.size,
            lastModified: new Date(obj.last_modified).getTime(),
            type: getFileType(obj.key),
            isFolder: false
          });
          largestFiles.sort((a, b) => b.size - a.size);
          if (largestFiles.length > 20) largestFiles.pop(); // Show top 20

          // Type distribution
          const type = getFileType(obj.key);
          const currentType = typeMap.get(type) || { count: 0, size: 0 };
          typeMap.set(type, { count: currentType.count + 1, size: currentType.size + obj.size });

          // Storage class distribution
          const storageClass = obj.storage_class || 'Standard';
          const currentClass = classMap.get(storageClass) || { count: 0, size: 0 };
          classMap.set(storageClass, { count: currentClass.count + 1, size: currentClass.size + obj.size });

          // Age distribution
          const lastModified = new Date(obj.last_modified).getTime();
          const ageDays = (Date.now() - lastModified) / (1000 * 60 * 60 * 24);
          let ageRange = '0-30 days';
          if (ageDays > 365) ageRange = '1+ year';
          else if (ageDays > 180) ageRange = '180-365 days';
          else if (ageDays > 90) ageRange = '90-180 days';
          else if (ageDays > 30) ageRange = '30-90 days';

          const currentAge = ageMap.get(ageRange) || { count: 0, size: 0 };
          ageMap.set(ageRange, { count: currentAge.count + 1, size: currentAge.size + obj.size });
        }

        continuationToken = res.next_continuation_token;
        if (onProgress) onProgress(totalObjects);

      } while (continuationToken && totalObjects < MAX_SCAN);

      const analytics: BucketAnalytics = {
        totalSize,
        totalObjects,
        largestFiles,
        fileTypeDistribution: Array.from(typeMap.entries()).map(([type, data]) => ({ type, ...data })),
        storageClassDistribution: Array.from(classMap.entries()).map(([storageClass, data]) => ({ storageClass, ...data })),
        ageDistribution: Array.from(ageMap.entries()).map(([ageRange, data]) => ({ ageRange, ...data })),
        lastUpdated: Date.now()
      };

      logSecurityEvent('BUCKET_SCAN_COMPLETED', { bucket, totalObjects, timeElapsed: Date.now() - startTime });
      return analytics;

    } catch (error: any) {
      logSecurityEvent('BUCKET_SCAN_FAILED', { bucket, error: error.message });
      throw error;
    }
  },

  logActivity: async (entry: any): Promise<void> => {
    try {
      await invoke('log_activity_entry', { entry });
    } catch (e) {
      console.error('Failed to log activity:', e);
    }
  },
  clearAllData: clearAllData,
};


// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).clearBucketStackData = clearAllData;
}