import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HardDrive, Trash2, AlertCircle, Database } from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { Sidebar } from './components/Sidebar';
import { FileExplorer } from './components/FileExplorer';
import { AccountModal } from './components/AccountModal';
import { FileEditorModal } from './components/FileEditorModal';
import { ThemeProvider } from './components/ThemeProvider';
import { s3Service } from './services/s3Service';
import { UploadConflictModal } from './components/UploadConflictModal';
import { activityService } from './services/activityService';
import { S3Account, S3Object, ViewMode, UploadProgress, FavouriteItem, BucketAnalytics } from './types';
import { LinkExpiryModal } from './components/LinkExpiryModal';
import { SyncManager } from './components/SyncManager';
import { ActivityLog } from './components/ActivityLog';
import { BackgroundSync } from './components/BackgroundSync';
import { useMenuBar } from './hooks/useMenuBar';
import { TransferModal } from './components/TransferModal';
import { TransferProgressPanel } from './components/TransferProgressPanel';
import { TransferJob, TransferProgress } from './types';
import { StorageAnalytics } from './components/StorageAnalytics';
import { TermsModal } from './components/TermsModal';
import { MoveToModal } from './components/MoveToModal';
import { AddConnectionModal } from './components/AddConnectionModal';
import { MultiBucketModal } from './components/MultiBucketModal';

interface ClipboardItem {
  objects: S3Object[];
  sourceBucket: string;
  sourcePrefix: string;
  mode: 'copy' | 'move';
}

const App: React.FC = () => {
  // --- State ---
  const [accounts, setAccounts] = useState<S3Account[]>([]);
  const [activeAccount, setActiveAccount] = useState<S3Account | null>(null);

  // activeBucket is derived from activeAccount.bucketName
  const activeBucket = activeAccount?.bucketName || null;

  // Navigation State
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [objects, setObjects] = useState<S3Object[]>([]);
  const [isSearchResults, setIsSearchResults] = useState(false);

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCreateFileModalOpen, setIsCreateFileModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<S3Account | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadProgress | null>(null);
  const [operationStatus, setOperationStatus] = useState<{ name: string; status: 'processing' | 'completed' | 'error' } | null>(null);
  const [removeAllConfirm, setRemoveAllConfirm] = useState(false);
  const [resetAppConfirm, setResetAppConfirm] = useState(false);
  const [removeConnectionConfirm, setRemoveConnectionConfirm] = useState<{ accountId: string; accountName: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Clipboard State
  const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);

  // Move To Modal State
  const [isMoveToModalOpen, setIsMoveToModalOpen] = useState(false);
  const [itemsToMove, setItemsToMove] = useState<S3Object[]>([]);

  // Add Connection State
  const [isAddConnectionModalOpen, setIsAddConnectionModalOpen] = useState(false);
  const [isMultiBucketModalOpen, setIsMultiBucketModalOpen] = useState(false);

  // Compression State
  const [compressionFormat, setCompressionFormat] = useState<'zip' | 'tar.gz' | null>(null);
  const [itemsToCompress, setItemsToCompress] = useState<S3Object[]>([]);
  const [compressionMode, setCompressionMode] = useState<'compress' | 'download'>('compress');

  // Secure Storage Security State
  const [showSync, setShowSync] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  // Transfer State
  const [transferJobs, setTransferJobs] = useState<TransferJob[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferModalData, setTransferModalData] = useState<{
    objects: S3Object[];
    type: 'copy' | 'move';
  }>({ objects: [], type: 'copy' });
  const [favourites, setFavourites] = useState<FavouriteItem[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [isTermsReadOnly, setIsTermsReadOnly] = useState(false);

  // Refs for listeners
  const unlistenDropRef = useRef<any>(null);
  const unlistenProgressRef = useRef<any>(null);
  const activeAccountRef = useRef(activeAccount);
  const currentPrefixRef = useRef(currentPrefix);

  // Sync refs to state
  useEffect(() => { activeAccountRef.current = activeAccount; }, [activeAccount]);
  useEffect(() => { currentPrefixRef.current = currentPrefix; }, [currentPrefix]);

  // Upload Conflict State
  const [conflictData, setConflictData] = useState<{
    fileName: string;
    isBatch: boolean;
    resolve: (action: 'overwrite' | 'skip' | 'rename') => void;
  } | null>(null);

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Operation status helper
  const showOperation = (name: string) => {
    setOperationStatus({ name, status: 'processing' });
  };

  const finishOperation = (success: boolean) => {
    setOperationStatus(prev => prev ? { ...prev, status: success ? 'completed' : 'error' } : null);
    setTimeout(() => setOperationStatus(null), 2000);
  };

  // --- Effects ---

  const refreshObjects = useCallback(async () => {
    if (!activeAccount || !activeBucket) return;
    setIsLoading(true);
    setIsSearchResults(false); // Reset search results on refresh
    try {
      const res = await s3Service.listObjects(activeAccount, activeBucket, currentPrefix);

      // Feature: Trash Protection & Internal Files
      // Hide .trash/ and .bucketstack/ folders from root listing to prevent accidental modification/deletion
      let displayObjects = res;
      if (currentPrefix === '') {
        displayObjects = res.filter(obj => obj.key !== '.trash/' && obj.key !== '.bucketstack/');
      }

      setObjects(displayObjects);

      // Check if there are any folders to calculate sizes for
      setObjects(displayObjects);

      // Automatic folder size calculation is disabled to prevent excess API usage on large buckets.
      // (User requested no excess usage/memory for 1000s of files).
      /*
      const hasFolders = res.some(obj => obj.isFolder);
      if (hasFolders) {
        // ... code removed ...
      }
      */

    } catch (error: any) {
      console.error(`Failed to refresh objects at prefix "${currentPrefix}":`, error);
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount, activeBucket, currentPrefix]);

  // Load Accounts on Mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        await s3Service.initialize();
        const stored = await s3Service.getAccounts();
        setAccounts(stored);
        if (stored.length > 0) {
          setActiveAccount(stored[0]);
        }
      } catch (error: any) {
        console.error('Failed to load accounts:', error);
      }
    };
    loadAccounts();
  }, []);

  // Permission Check Logic
  const checkAccountPermissions = async (account: S3Account, showToastOnchange = false) => {
    try {

      const result = await s3Service.testConnection({
        ...account,
        // Ensure we transmit the secret key if it's transient, but usually saveAccount stores it.
        // We rely on s3Service using stored credentials or what's passed. 
        // Since we are passing the full account object from state which includes keys (if they are in state), this works.
        // Note: For security, keys are in Secure Storage, so testConnection handles that too if fields are empty?
        // Actually s3Service.testConnection needs keys passed in arg or it throws.
        // Our state 'accounts' might typically have empty keys if they are in Secure Storage.
        // But s3Service.testConnection implementation:
        // checks `if (!account.endpoint || !account.accessKeyId ...)`
        // If keys are hidden/in Secure Storage, we need to re-fetch them or rely on s3Service helper that fetches them.
        // s3Service.testConnection *wraps* the invoke. It validates args first.
        // If 'accounts' state doesn't have keys (loaded from metadata only), we must re-fetch full account with keys or modify testConnection.
        // Looking at s3Service.getAccounts(), it returns S3Account[] WITH keys (fetched from Secure Storage).
        // So 'accounts' state SHOULD have keys.
      });

      if (result.success) {
        // If permission changed, update it
        if (result.accessMode !== account.accessMode) {

          const updatedAccount = { ...account, accessMode: result.accessMode };
          await s3Service.saveAccount(updatedAccount);

          setAccounts(prev => prev.map(a => a.id === account.id ? updatedAccount : a));

          if (activeAccount?.id === account.id) {
            setActiveAccount(updatedAccount);
          }

          if (showToastOnchange) {
            const modeText = result.accessMode === 'read-only' ? 'Read-Only' : 'Read & Write';
            showToast(`Permissions updated: ${modeText}`, 'success');
          }
        } else if (showToastOnchange) {
          showToast('Permissions verified: No changes detected', 'success');
        }
      }
    } catch (error) {
      console.error(`Permission check failed for ${account.name}:`, error);
      if (showToastOnchange) {
        showToast('Failed to verify permissions', 'error');
      }
    }
  };

  // Run permission check when account is selected
  useEffect(() => {
    if (activeAccount) {
      checkAccountPermissions(activeAccount);
    }
  }, [activeAccount?.id]); // Only run when ID changes to avoid loops

  // Run permission check for all accounts on load (delayed to not block UI)
  useEffect(() => {
    if (accounts.length > 0) {
      // Check one by one with small delay
      accounts.forEach((acc, index) => {
        setTimeout(() => {
          checkAccountPermissions(acc);
        }, index * 2000 + 1000);
      });

      // Setup 24h interval background check
      const intervalId = setInterval(() => {

        accounts.forEach((acc, index) => {
          setTimeout(() => {
            checkAccountPermissions(acc);
          }, index * 2000);
        });
      }, 24 * 60 * 60 * 1000); // 24 hours

      return () => clearInterval(intervalId);
    }
  }, [accounts.length]);




  // Setup Window-Wide Listeners
  useEffect(() => {
    const setupListeners = async () => {
      try {
        // Native Drag & Drop Listener (OS -> App)
        const unlistenDrop = await getCurrentWebview().onDragDropEvent((event) => {
          if (event.payload.type === 'drop') {

            // Use refs to ensure we have the latest context when a drop happens
            if (activeAccountRef.current) {
              handleNativeDrop(event.payload.paths);
            }
          }
        });
        unlistenDropRef.current = unlistenDrop;

        // Backend Progress Listener
        const unlistenProgress = await listen<any>('upload-progress', (event) => {
          const { fileName, progress, status } = event.payload;
          setUploadStatus({
            fileName,
            progress,
            status: status as 'uploading' | 'completed' | 'error'
          });

          if (status === 'completed' || status === 'error') {
            setTimeout(() => setUploadStatus(null), 3000);
          }
        });
        unlistenProgressRef.current = unlistenProgress;

      } catch (err) {
        console.error('Failed to setup App listeners:', err);
      }
    };

    setupListeners();

    return () => {
      if (unlistenDropRef.current) unlistenDropRef.current();
      if (unlistenProgressRef.current) unlistenProgressRef.current();
    };
  }, []); // Run only on mount

  const handleNativeDrop = async (paths: string[]) => {
    const activeAcc = activeAccountRef.current;
    const prefix = currentPrefixRef.current;

    if (!activeAcc || !activeAcc.bucketName) {
      showToast('Please select an account first', 'error'); return;
    }
    if (activeAcc.accessMode === 'read-only') {
      showToast('Account is read-only', 'error'); return;
    }

    showOperation(`Uploading ${paths.length} items from OS...`);
    try {
      await invoke('upload_paths', {
        accountId: activeAcc.id,
        provider: activeAcc.provider,
        endpoint: activeAcc.endpoint,
        region: activeAcc.region,
        accessKeyId: activeAcc.accessKeyId,
        secretAccessKey: activeAcc.secretAccessKey,
        bucket: activeAcc.bucketName,
        prefix: prefix,
        paths: paths,
        enableActivityLog: activeAcc.enableActivityLog ?? true
      });
      showToast(`Upload finished`, 'success');
      refreshObjects();
    } catch (err: any) {
      console.error('Native upload failed:', err);
      showToast(`Upload failed: ${err}`, 'error');
    } finally {
      finishOperation(true);
      setTimeout(() => setUploadStatus(null), 3000);
    }
  };

  const FAVOURITES_KEY = 'bucketstack_favourites';

  // Load Favourites
  useEffect(() => {
    const saved = localStorage.getItem(FAVOURITES_KEY);
    if (saved) {
      try {
        setFavourites(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse favourites:', e);
      }
    }
  }, []);

  // Save Favourites
  useEffect(() => {
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favourites));
  }, [favourites]);

  const handleToggleFavourite = (object: S3Object) => {
    if (!activeAccount || !activeBucket) return;

    const isFav = favourites.some(f => f.accountId === activeAccount.id && f.bucket === activeBucket && f.key === object.key);

    if (isFav) {
      setFavourites(prev => prev.filter(f => !(f.accountId === activeAccount.id && f.bucket === activeBucket && f.key === object.key)));
      showToast('Removed from favourites');

      // Log remove favorite
      activityService.logActivity(
        activeAccount,
        'remove_favorite',
        object.key,
        undefined,
        'success'
      );
    } else {
      const newFav: FavouriteItem = {
        id: crypto.randomUUID(),
        accountId: activeAccount.id,
        bucket: activeBucket,
        key: object.key,
        name: object.name,
        isFolder: object.isFolder
      };
      setFavourites(prev => [...prev, newFav]);
      showToast('Added to favourites');

      // Log add favorite
      activityService.logActivity(
        activeAccount,
        'add_favorite',
        object.key,
        undefined,
        'success'
      );
    }
  };

  const handleSelectFavourite = (fav: FavouriteItem) => {
    const account = accounts.find(a => a.id === fav.accountId);
    if (account) {
      setActiveAccount(account);
      setCurrentPrefix(fav.isFolder ? fav.key : fav.key.substring(0, fav.key.lastIndexOf('/') + 1));
      setShowSync(false);
      setShowActivity(false);
      setShowAnalytics(false);
      setIsSearchResults(false);
    }
  };

  const handleRemoveFavourite = (id: string) => {
    const fav = favourites.find(f => f.id === id);
    setFavourites(prev => prev.filter(f => f.id !== id));

    // Log remove favorite
    if (fav) {
      activityService.logActivity(
        activeAccount,
        'remove_favorite',
        fav.key,
        undefined,
        'success'
      );
    }
  };

  // Ensure .trash folder exists if Trash is enabled
  useEffect(() => {
    const ensureTrash = async () => {
      if (activeAccount?.enableTrash && activeAccount.bucketName) {
        try {
          // Attempt to create .trash folder at root (idempotent operation usually)
          // We pass empty prefix and ".trash" name.
          // Note: s3Service.createFolder might strip slashes, so we pass ".trash"
          await s3Service.createFolder(activeAccount, activeAccount.bucketName, "", ".trash");
        } catch (error) {
          // Ignore errors (e.g. if already exists or permission issues, we don't want to spam user)
        }
      }
    };
    ensureTrash();
  }, [activeAccount?.id, activeAccount?.enableTrash, activeAccount?.bucketName]);

  // First-launch logic for TermsModal
  useEffect(() => {
    const termsAccepted = localStorage.getItem('bucketstack_terms_accepted');
    if (!termsAccepted) {
      // NOTE: User requested NOT to open on startup/new install
      // setShowTerms(true); 
      // setIsTermsReadOnly(false);
    }
  }, []);

  // Handle Data Fetching
  useEffect(() => {
    refreshObjects();
  }, [refreshObjects]);


  // Handle quick upload from menu bar
  const handleQuickUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        handleUpload(files);
      }
    };
    input.click();
  }, [activeAccount, activeBucket, currentPrefix]);

  // --- Handlers ---

  const handleAddAccount = async (account: S3Account) => {
    if (editingAccount) {
      // Edit existing account
      await s3Service.saveAccount(account);
      const updated = accounts.map(a => a.id === account.id ? account : a);
      setAccounts(updated);
      if (activeAccount?.id === account.id) {
        setActiveAccount(account);
      }
      setEditingAccount(null);
    } else {
      // Add new account
      await s3Service.saveAccount(account);
      const updatedAccounts = [...accounts, account];
      setAccounts(updatedAccounts);
      setActiveAccount(account);
    }
    setIsAccountModalOpen(false);

    // Show confirmation toast with detected permissions
    const modeText = account.accessMode === 'read-only' ? 'Read-Only' : 'Read & Write';
    showToast(`Connection saved: ${modeText} Access Detected`, 'success');
  };

  const handleAddMultipleBuckets = async (bucketsToAdd: Partial<S3Account>[]) => {
    try {
      const updatedAccounts = [...accounts];
      let successCount = 0;

      for (const bucket of bucketsToAdd) {
        const newAccount: S3Account = {
          id: bucket.id || `account-${Date.now()}-${Math.random()}`,
          name: bucket.name || bucket.bucketName || 'Unnamed',
          bucketName: bucket.bucketName || '',
          region: bucket.region || 'us-east-1',
          provider: bucket.provider || 'aws',
          accessKeyId: bucket.accessKeyId || '',
          secretAccessKey: bucket.secretAccessKey || '',
          endpoint: bucket.endpoint || '',
          accessMode: bucket.accessMode || 'read-write',
        };
        await s3Service.saveAccount(newAccount);
        updatedAccounts.push(newAccount);
        successCount++;
      }

      setAccounts(updatedAccounts);
      if (updatedAccounts.length > 0 && !activeAccount) {
        setActiveAccount(updatedAccounts[0]);
      }
      setIsMultiBucketModalOpen(false);

      showToast(`${successCount} bucket${successCount > 1 ? 's' : ''} added successfully`, 'success');
    } catch (error: any) {
      console.error('Failed to add multiple buckets:', error);
      // Provide more helpful error message based on the error type
      let errorMessage = 'Failed to add some buckets. See console for details.';
      if (error.message?.includes('missing access key') || error.message?.includes('missing secret key')) {
        errorMessage = 'Missing credentials. Please check your access key and secret key.';
      } else if (error.message?.includes('missing bucket name')) {
        errorMessage = 'Missing bucket name. Please provide a bucket name.';
      } else if (error.message?.includes('secure') || error.message?.includes('storage')) {
        errorMessage = 'Failed to save credentials securely. Please try again or restart the app.';
      } else if (error.message) {
        errorMessage = `Failed to add bucket: ${error.message}`;
      }
      showToast(errorMessage, 'error');
    }
  };

  const handleEditAccount = (account: S3Account) => {
    setEditingAccount(account);
    setIsAccountModalOpen(true);
  };

  const handleRemoveAccount = async (id: string) => {
    try {
      await s3Service.deleteAccount(id);
      const updated = accounts.filter(a => a.id !== id);
      setAccounts(updated);
      if (activeAccount?.id === id) {
        setActiveAccount(updated.length > 0 ? updated[0] : null);
      }
    } catch (error) {
      console.error("Failed to remove account:", error);
      alert("Could not remove the account. See console for details.");
    }
  };

  const handleDeleteAccount = handleRemoveAccount;

  const handleRemoveAllAccounts = async () => {
    try {
      await s3Service.deleteAllAccounts();
      setAccounts([]);
      setActiveAccount(null);

      // Reset security state
      localStorage.removeItem('bucketstack_terms_accepted');
    } catch (error) {
      console.error("Failed to remove all accounts:", error);
      alert("Could not remove all accounts. See console for details.");
    }
  };


  const handleNavigate = (path: string) => {
    setCurrentPrefix(path);
    setShowSync(false); // Switch to browser if navigating
    setShowActivity(false);
  };

  const handleNavigateUp = () => {
    if (currentPrefix === '') return;
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop(); // Remove last segment
    const newPath = parts.length > 0 ? parts.join('/') + '/' : '';
    setCurrentPrefix(newPath);
  };

  const handleUpload = async (items: { file: File, path?: string }[] | FileList) => {
    if (!activeAccount || !activeAccount.bucketName) return;

    const itemsArray = 'length' in items && typeof items !== 'string' && !(items instanceof Array)
      ? Array.from(items as FileList).map(f => ({ file: f, path: f.name }))
      : items as { file: File, path?: string }[];

    if (itemsArray.length === 0) return;

    // Track batch resolution for conflicts
    let batchAction: 'overwrite' | 'skip' | 'rename' | null = null;
    const existingNames = new Set(objects.map(obj => obj.name));

    for (let i = 0; i < itemsArray.length; i++) {
      const { file, path } = itemsArray[i];
      let fileName = path || file.name;

      // Check for collision at the top level
      const topLevelName = fileName.split('/')[0];
      if (existingNames.has(topLevelName)) {
        let action: 'overwrite' | 'skip' | 'rename' | 'ask' = batchAction || 'ask';

        if (action === 'ask') {
          const resolution = await new Promise<'overwrite' | 'skip' | 'rename'>((resolve) => {
            setConflictData({
              fileName: topLevelName,
              isBatch: itemsArray.length > 1,
              resolve: (act, applyToAll) => {
                if (applyToAll) batchAction = act;
                setConflictData(null);
                resolve(act as 'overwrite' | 'skip' | 'rename');
              }
            });
          });
          action = resolution;
        }

        if (action === 'skip') continue;

        if (action === 'rename') {
          const parts = fileName.split('/');
          const baseName = parts[0];
          const rest = parts.slice(1).join('/');
          const nameParts = baseName.split('.');
          const ext = nameParts.length > 1 ? `.${nameParts.pop()}` : '';
          const base = nameParts.join('.');
          let counter = 1;
          let newBaseName = baseName;
          while (existingNames.has(newBaseName)) {
            newBaseName = `${base}_${counter}${ext}`;
            counter++;
          }
          fileName = rest ? `${newBaseName}/${rest}` : newBaseName;
        }
      }

      setUploadStatus({
        fileName: fileName,
        progress: 0,
        status: 'uploading'
      });

      try {
        await s3Service.uploadFile(
          activeAccount,
          activeAccount.bucketName,
          currentPrefix,
          file,
          (progress) => setUploadStatus(prev => prev ? ({ ...prev, progress }) : null),
          fileName
        );

        if (!fileName.includes('/')) existingNames.add(fileName);

        await activityService.logActivity(
          activeAccount,
          'upload',
          `${currentPrefix}${fileName}`,
          undefined,
          'success',
          undefined,
          file.size
        );
      } catch (e: any) {
        console.error(`Failed to upload ${fileName}:`, e);
        setUploadStatus(prev => prev ? ({ ...prev, status: 'error' }) : null);
        await activityService.logActivity(
          activeAccount,
          'upload',
          `${currentPrefix}${fileName}`,
          undefined,
          'failed',
          e.message,
          file.size
        );
      }
    }

    setUploadStatus(prev => prev ? ({ ...prev, status: 'completed' }) : null);
    await refreshObjects();

    const destination = currentPrefix ? `to "${currentPrefix}"` : `to root of "${activeAccount.bucketName}"`;
    showToast(`Upload sequence finished ${destination}`, 'success');

    setTimeout(() => setUploadStatus(null), 3000);
  };

  const handleDelete = async (items: S3Object[]) => {

    if (!activeAccount || !activeAccount.bucketName || items.length === 0) {

      return;
    }

    showOperation(`Deleting ${items.length} item${items.length > 1 ? 's' : ''}`);
    try {

      for (const item of items) {

        await s3Service.deleteObject(activeAccount, activeAccount.bucketName, item, currentPrefix);

        // Log each deletion
        await activityService.logActivity(
          activeAccount,
          (currentPrefix && currentPrefix.startsWith('.trash/')) ? 'permanent_delete' : 'delete',
          item.key,
          undefined,
          'success',
          undefined,
          item.size
        );
      }

      await refreshObjects();


      finishOperation(true);
      const summary = items.length === 1
        ? `Deleted "${items[0].name}" from "${activeAccount.bucketName}"`
        : `Deleted ${items.length} items from "${activeAccount.bucketName}"`;

      showToast(summary, 'success');
    } catch (e) {
      console.error('Delete error:', e);
      finishOperation(false);
      showToast('Failed to delete items. Check your write permissions.', 'error');
    }
  };

  // --- Transfer Handlers ---

  const handleOpenTransferModal = (objects: S3Object[], type: 'copy' | 'move') => {
    setTransferModalData({ objects, type });
    setIsTransferModalOpen(true);
  };

  const handleStartTransfer = async (newJobs: TransferJob[]) => {
    // Add new jobs to the queue
    setTransferJobs(prev => [...prev, ...newJobs]);

    // Start the transfer process
    try {
      await s3Service.transferObjects(newJobs, (update: TransferProgress) => {
        setTransferJobs(currentJobs => currentJobs.map(job =>
          job.id === update.jobId
            ? {
              ...job,
              bytesTransferred: update.bytesTransferred,
              progress: Math.round((update.bytesTransferred / update.totalBytes) * 100),
              speed: update.speed,
              status: update.status,
              error: update.error
            }
            : job
        ));
      });

      // If none of these jobs failed, refresh the UI
      const hasErrors = newJobs.some(j => j.status === 'error');
      if (!hasErrors) {
        await refreshObjects();
        showToast('Transfer completed successfully', 'success');
      }
    } catch (error: any) {
      console.error('Transfer failed:', error);
      showToast(`Transfer failed: ${error.message}`, 'error');
    }
  };

  const handleRetryTransfer = async (jobId: string) => {
    const job = transferJobs.find(j => j.id === jobId);
    if (!job) return;

    // Reset status and retry
    setTransferJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'pending', progress: 0 } : j));
    handleStartTransfer([job]);
  };

  const handleClearTransfer = (jobId: string) => {
    setTransferJobs(prev => prev.filter(j => j.id !== jobId));
  };

  const handleClearAllTransfers = () => {
    setTransferJobs(prev => prev.filter(j => j.status === 'active' || j.status === 'pending'));
  };

  const handleSidebarTransfer = (items: S3Object[], type: 'copy' | 'move', destAccount: S3Account) => {
    if (!activeAccount || !activeBucket) return;

    // Create jobs directly
    const newJobs: TransferJob[] = items.map(obj => {
      const destKey = obj.name; // Drop on account/bucket root for now
      return {
        id: Math.random().toString(36).substr(2, 9),
        type,
        sourceAccount: activeAccount,
        sourceBucket: activeBucket,
        sourceKey: obj.key,
        destAccount,
        destBucket: destAccount.bucketName,
        destKey: obj.isFolder ? destKey + '/' : destKey,
        fileName: obj.name,
        isFolder: obj.isFolder,
        status: 'pending',
        progress: 0,
        bytesTransferred: 0,
        totalBytes: obj.size,
        speed: 0,
      };
    });

    handleStartTransfer(newJobs);
  };

  // --- Render Helpers ---

  const handleRename = async (obj: S3Object, newName: string) => {

    if (!activeAccount || !activeAccount.bucketName) {

      return;
    }

    showOperation(`Renaming "${obj.name}"`);
    try {

      await s3Service.renameObject(activeAccount, activeAccount.bucketName, obj, newName, currentPrefix);

      // Log rename
      await activityService.logActivity(
        activeAccount,
        'rename',
        obj.key,
        `${currentPrefix}${newName}`,
        'success',
        undefined,
        obj.size
      );


      await refreshObjects();
      finishOperation(true);
      showToast(`Renamed "${obj.name}" to "${newName}"`, 'success');
    } catch (e: any) {
      console.error('Rename error:', e);
      finishOperation(false);
      showToast(e.message || 'Failed to rename item.', 'error');
    }
  };

  // --- Clipboard / Action Handlers ---

  const handleCopy = (items: S3Object[]) => {
    if (!activeAccount?.bucketName) return;
    setClipboard({ objects: items, sourceBucket: activeAccount.bucketName, sourcePrefix: currentPrefix, mode: 'copy' });
  };

  const handleCut = (items: S3Object[]) => {
    if (!activeAccount?.bucketName) return;
    // Open Move To Modal instead of setting clipboard to 'move' mode
    setItemsToMove(items);
    setIsMoveToModalOpen(true);
  };

  const handleMove = handleCut; // Alias for prop compatibility

  /**
   * Safe, production-grade Move operation within a single S3 bucket.
   * 
   * Rules:
   * - Files: Cannot move to same path or into subpath of itself
   * - Folders: Cannot move to itself or into its own subfolders
   * - Always copy first, delete only after copy succeeds
   * - Handles partial failures gracefully (some files succeed, some fail)
   * - Preserves full subfolder structure
   */
  const handleMoveToDestination = async (destinationPrefix: string) => {
    if (!activeAccount?.bucketName) return;

    const bucket = activeAccount.bucketName;
    const moveResults: { success: string[]; failed: { name: string; reason: string }[] } = { success: [], failed: [] };

    showOperation(`Moving ${itemsToMove.length} item${itemsToMove.length > 1 ? 's' : ''}`);
    setIsLoading(true);

    try {
      // Validate each item before starting moves
      for (const obj of itemsToMove) {
        const sourcePath = obj.key;
        const destPath = obj.isFolder
          ? `${destinationPrefix}${obj.name}/`
          : `${destinationPrefix}${obj.name}`;

        // Validation 1: Cannot move to same location
        if (sourcePath === destPath) {
          moveResults.failed.push({
            name: obj.name,
            reason: 'Cannot move to the same location'
          });
          continue;
        }

        // Validation 2: Prevent moving into own subpaths
        if (obj.isFolder) {
          // For folders: destPath cannot start with sourcePath
          if (destPath.startsWith(sourcePath)) {
            moveResults.failed.push({
              name: obj.name,
              reason: 'Cannot move a folder into itself or one of its subfolders'
            });
            continue;
          }
        } else {
          // For files: destPath cannot start with sourcePath + "/" (to prevent /docs/a.txt → /docs/a.txt/sub/)
          if (destPath.startsWith(sourcePath + '/')) {
            moveResults.failed.push({
              name: obj.name,
              reason: 'Cannot move a file into itself'
            });
            continue;
          }
        }

        // Proceed with move
        try {
          // Step 1: Copy to destination
          await s3Service.copyObject(
            activeAccount,
            bucket,
            obj,
            bucket,
            destinationPrefix
          );

          // Step 2: Delete source (only after copy succeeds)
          try {
            await s3Service.deleteObject(activeAccount, bucket, obj, currentPrefix);

            moveResults.success.push(obj.name);

            // Log successful move
            await activityService.logActivity(
              activeAccount,
              'move',
              sourcePath,
              destPath,
              'success',
              undefined,
              obj.size
            );
          } catch (deleteError) {
            // Copy succeeded but delete failed - verify if object still exists
            console.error(`Delete failed for ${obj.name}:`, deleteError);

            try {
              // List objects to verify source still exists
              const sourceObjects = await s3Service.listObjects(activeAccount, bucket, currentPrefix);
              const stillExists = sourceObjects.some(o => o.key === sourcePath);

              if (stillExists) {
                // Source object genuinely still exists - this is a real failure
                moveResults.failed.push({
                  name: obj.name,
                  reason: 'Copy succeeded but deletion of original failed (permissions issue?)'
                });

                await activityService.logActivity(
                  activeAccount,
                  'move',
                  sourcePath,
                  destPath,
                  'failed',
                  `Deletion failed: ${deleteError}`,
                  obj.size
                );
              } else {
                // Source was actually deleted despite the error - false alarm
                moveResults.success.push(obj.name);


                await activityService.logActivity(
                  activeAccount,
                  'move',
                  sourcePath,
                  destPath,
                  'success',
                  undefined,
                  obj.size
                );
              }
            } catch (verifyError) {
              console.error(`Failed to verify deletion of ${obj.name}:`, verifyError);
              moveResults.failed.push({
                name: obj.name,
                reason: 'Could not verify if deletion succeeded'
              });

              await activityService.logActivity(
                activeAccount,
                'move',
                sourcePath,
                destPath,
                'failed',
                `Verification failed: ${verifyError}`,
                obj.size
              );
            }
          }
        } catch (copyError) {
          console.error(`Failed to copy ${obj.name}:`, copyError);
          moveResults.failed.push({
            name: obj.name,
            reason: String(copyError)
          });

          await activityService.logActivity(
            activeAccount,
            'move',
            sourcePath,
            destPath,
            'failed',
            String(copyError),
            obj.size
          );
        }
      }

      // Refresh to show updated state
      await refreshObjects();
      finishOperation(true);

      // Show results
      if (moveResults.failed.length === 0) {
        showToast(`Successfully moved ${moveResults.success.length} item${moveResults.success.length > 1 ? 's' : ''} to "${destinationPrefix || 'root'}"`, 'success');
      } else if (moveResults.success.length === 0) {
        const reasons = moveResults.failed.map(f => `${f.name}: ${f.reason}`).join('; ');
        showToast(`Failed to move items: ${reasons}`, 'error');
      } else {
        showToast(`Moved ${moveResults.success.length} item${moveResults.success.length > 1 ? 's' : ''} successfully, but ${moveResults.failed.length} failed`, 'error');
      }
    } catch (err: any) {
      console.error('Move operation failed:', err);
      finishOperation(false);
      showToast(err.message || 'Move operation failed', 'error');
    } finally {
      setIsLoading(false);
      setItemsToMove([]);
    }
  };

  const handlePaste = async () => {
    if (!clipboard || !activeAccount || !activeAccount.bucketName) return;

    // Only handle copy mode (move is now handled via modal)
    if (clipboard.mode === 'move') {
      showToast('Use "Move to" from the context menu instead', 'error');
      return;
    }

    const opCount = clipboard.objects.length;
    showOperation(`Copying ${opCount} item${opCount > 1 ? 's' : ''}`);
    setIsLoading(true);

    try {
      for (const obj of clipboard.objects) {
        try {
          await s3Service.copyObject(
            activeAccount,
            clipboard.sourceBucket,
            obj,
            activeAccount.bucketName,
            currentPrefix
          );

          // Log copy action
          await activityService.logActivity(
            activeAccount,
            'copy',
            obj.key,
            `${currentPrefix}${obj.name}`,
            'success',
            undefined,
            obj.size
          );
        } catch (copyError) {
          console.error(`Failed to copy ${obj.name}:`, copyError);
          await activityService.logActivity(
            activeAccount,
            'copy',
            obj.key,
            `${currentPrefix}${obj.name}`,
            'failed',
            String(copyError),
            obj.size
          );
          throw copyError;
        }
      }

      await refreshObjects();
      finishOperation(true);

      const destInfo = currentPrefix ? `to "${currentPrefix}"` : `to root`;
      showToast(`Copied ${clipboard.objects.length} items from "${clipboard.sourceBucket}" ${destInfo}`, 'success');
    } catch (e) {
      finishOperation(false);
      showToast('Failed to paste items. Please check if you have write permissions.', 'error');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async (items: S3Object[]) => {
    if (!activeAccount || !activeAccount.bucketName) return;
    showOperation(`Duplicating ${items.length} item${items.length > 1 ? 's' : ''}`);
    setIsLoading(true);
    try {
      for (const item of items) {
        await s3Service.copyObject(activeAccount, activeAccount.bucketName, item, activeAccount.bucketName, currentPrefix);

        // Log duplicate action
        await activityService.logActivity(
          activeAccount,
          'duplicate',
          item.key,
          `${currentPrefix}${item.name}_copy`,
          'success',
          undefined,
          item.size
        );
      }
      await refreshObjects();
      finishOperation(true);
      showToast(`Successfully duplicated ${items.length} item${items.length > 1 ? 's' : ''}`, 'success');
    } catch (e) {
      finishOperation(false);
      showToast('Failed to duplicate items.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (items: S3Object[]) => {
    if (!activeAccount || !activeAccount.bucketName) return;
    showOperation(`Restoring ${items.length} item${items.length > 1 ? 's' : ''}`);
    try {
      for (const item of items) {
        await s3Service.restoreObject(activeAccount, activeAccount.bucketName, item);

        // Log restore
        await activityService.logActivity(
          activeAccount,
          'restore',
          item.key,
          item.key.replace('.trash/', ''),
          'success',
          undefined,
          item.size
        );
      }
      await refreshObjects();
      finishOperation(true);
      showToast(`Restored ${items.length} item${items.length > 1 ? 's' : ''}`, 'success');
    } catch (e: any) {
      finishOperation(false);
      showToast(e.message || 'Failed to restore items.', 'error');
    }
  };

  const handleEmptyTrash = async () => {
    if (!activeAccount || !activeAccount.bucketName) return;
    if (!window.confirm("Are you sure you want to permanently delete all items in Trash? This cannot be undone.")) return;

    showOperation("Emptying Trash...");
    try {
      const trashFolder: S3Object = {
        key: '.trash/',
        name: '.trash',
        size: 0,
        lastModified: 0,
        type: 'folder',
        isFolder: true
      };
      // Recursively delete everything in .trash/
      await s3Service.deleteObject(activeAccount, activeAccount.bucketName, trashFolder, '');

      // Log empty trash activity
      await activityService.logActivity(
        activeAccount,
        'empty_trash',
        '.trash/',
        undefined,
        'success'
      );

      await refreshObjects();
      finishOperation(true);
      showToast("Trash emptied successfully", "success");
    } catch (e: any) {
      // Log failed empty trash
      await activityService.logActivity(
        activeAccount,
        'empty_trash',
        '.trash/',
        undefined,
        'failed',
        e.message
      );

      finishOperation(false);
      showToast(e.message || "Failed to empty trash", "error");
    }
  };

  const handleCompress = async (items: S3Object[]) => {
    if (!activeAccount || !activeAccount.bucketName || items.length === 0) return;
    // Set state to trigger format selection dialog
    setCompressionMode('compress');
    setItemsToCompress(items);
    setCompressionFormat(null); // Will show dialog to select format
  };

  const performCompress = async (format: 'zip' | 'tar.gz') => {
    if (!activeAccount || !activeAccount.bucketName || itemsToCompress.length === 0) return;

    const fileName = `archive.${format === 'zip' ? 'zip' : 'tar.gz'}`;
    const isDownload = compressionMode === 'download';
    const opText = isDownload ? `Downloading as ${format}` : `Creating ${format} archive`;
    showOperation(opText);
    setUploadStatus({ fileName, progress: 50, status: 'uploading' });

    try {
      await invoke('compress_objects', {
        bucket: activeAccount.bucketName,
        keys: itemsToCompress.map(item => item.key),
        prefix: currentPrefix,
        format,
        accessKeyId: activeAccount.accessKeyId,
        secretAccessKey: activeAccount.secretAccessKey,
        region: activeAccount.region,
      });

      if (isDownload) {
        // For download mode, generate signed URL and download the archive
        const savePath = await save({
          defaultPath: fileName,
          filters: [{ name: 'Archive', extensions: format === 'zip' ? ['zip'] : ['tar.gz'] }]
        });

        if (!savePath) {
          finishOperation(false);
          return;
        }

        await invoke('download_file_to_path', {
          endpoint: activeAccount.endpoint,
          region: activeAccount.region,
          accessKeyId: activeAccount.accessKeyId,
          secretAccessKey: activeAccount.secretAccessKey,
          bucket: activeAccount.bucketName,
          key: `${currentPrefix}${fileName}`,
          path: savePath
        });

        setUploadStatus({ fileName, progress: 100, status: 'completed' });
        finishOperation(true);
        showToast(`Downloaded "${fileName}"`, 'success');
      } else {
        // For compress mode, just create the archive in S3
        await refreshObjects();
        setUploadStatus({ fileName, progress: 100, status: 'completed' });
        finishOperation(true);
        showToast(`Archive created successfully as ${format}`, 'success');
      }

      // Log compress action for each item in the archive
      for (const item of itemsToCompress) {
        await activityService.logActivity(
          activeAccount,
          'compress',
          item.key,
          `${currentPrefix}${fileName}`,
          'success',
          undefined,
          item.size
        );
      }

      setTimeout(() => setUploadStatus(null), 3000);
      setCompressionFormat(null);
      setItemsToCompress([]);
      setCompressionMode('compress');
    } catch (e: any) {
      setUploadStatus({ fileName, progress: 0, status: 'error' });
      finishOperation(false);
      showToast(isDownload ? 'Failed to download archive.' : 'Failed to create archive.', 'error');
      setTimeout(() => setUploadStatus(null), 3000);
    }
  };

  // --- Create File Handler ---

  const handleCreateFile = async (name: string, content: string) => {
    if (!activeAccount || !activeAccount.bucketName) return;

    showOperation(`Creating file "${name}"`);
    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], name, { type: 'text/plain' });

      await s3Service.uploadFile(
        activeAccount,
        activeAccount.bucketName,
        currentPrefix,
        file,
        () => { } // No progress needed for small text files
      );

      // Log create_file action
      await activityService.logActivity(
        activeAccount,
        'create_file',
        `${currentPrefix}${name}`,
        undefined,
        'success',
        undefined,
        file.size
      );

      await refreshObjects();
      finishOperation(true);
      const loc = currentPrefix ? `to "${currentPrefix}"` : `to root`;
      showToast(`Created file "${name}" ${loc}`, 'success');
      setIsCreateFileModalOpen(false);
    } catch (e: any) {
      console.error('Failed to create file:', e);
      finishOperation(false);
      showToast(e.message || 'Failed to create file.', 'error');
      // Rethrow to let modal handle error display if needed
      throw e;
    }
  };

  // --- File Editor Handler ---

  const handleEditFile = async (object: S3Object) => {
    if (!activeAccount || !activeAccount.bucketName) return;

    // Check extension (simple check for now, backend will handle UTF8 errors if not text)
    const editableExtensions = ['.txt', '.md', '.json', '.xml', '.html', '.css', '.js', '.ts', '.tsx', '.jsx', '.svg', '.csv', '.yaml', '.yml'];
    // if (!editableExtensions.some(ext => object.key.toLowerCase().endsWith(ext))) {
    // Optionally warn user
    // }

    showOperation(`Opening "${object.name}"...`);
    try {
      const content = await s3Service.getFileContent(activeAccount, activeAccount.bucketName, object.key);
      setEditorState({
        isOpen: true,
        mode: 'edit',
        name: object.name,
        content: content
      });
      finishOperation(true);
    } catch (e: any) {
      finishOperation(false);
      showToast('Failed to open file. Is it a text file?', 'error');
      console.error(e);
    }
  };

  const [editorState, setEditorState] = useState<{
    isOpen: boolean;
    name: string;
    content: string;
    mode: 'create' | 'edit';
  }>({ isOpen: false, name: '', content: '', mode: 'create' });

  const handleEditorSave = async (name: string, content: string) => {
    if (!activeAccount || !activeAccount.bucketName) return;

    const isEdit = editorState.mode === 'edit';
    // If editing and name hasn't changed, strictly overwrite (no conflict check needed for self)
    const isSameFile = isEdit && name === editorState.name;

    if (!isSameFile) {
      // Check for collision
      const existingNames = new Set(objects.map(obj => obj.name));
      if (existingNames.has(name)) {
        const resolution = await new Promise<'overwrite' | 'skip' | 'rename'>((resolve) => {
          setConflictData({
            fileName: name,
            isBatch: false,
            resolve: (act, _applyToAll) => {
              setConflictData(null);
              resolve(act as 'overwrite' | 'skip' | 'rename');
            }
          });
        });

        if (resolution === 'skip') {
          throw new Error('Save cancelled by user.');
        }

        if (resolution === 'rename') {
          const parts = name.split('.');
          const ext = parts.length > 1 ? `.${parts.pop()}` : '';
          const base = parts.join('.');
          let counter = 1;
          let newName = name;
          while (existingNames.has(newName)) {
            newName = `${base}_${counter}${ext}`;
            counter++;
          }
          name = newName;
          showToast(`File saved as "${name}"`, 'success');
        }
      }
    }

    showOperation(isEdit ? `Saving "${name}"` : `Creating "${name}"`);

    try {
      const blob = new Blob([content], { type: 'text/plain' });
      // If editing, use the original full key if name matches, or new key via uploadFile logic (handles rename implicitly if prefix same)
      const file = new File([blob], name, { type: 'text/plain' });

      await s3Service.uploadFile(
        activeAccount,
        activeAccount.bucketName,
        currentPrefix,
        file,
        () => { },
        name !== file.name ? name : undefined
      );

      // Log action - either edit_file or create_file
      const actionType = isEdit ? 'edit_file' : 'create_file';
      await activityService.logActivity(
        activeAccount,
        actionType,
        `${currentPrefix}${editorState.name}`,
        isEdit && name !== editorState.name ? `${currentPrefix}${name}` : undefined,
        'success',
        undefined,
        file.size
      );

      await refreshObjects();
      finishOperation(true);
      if (!isSameFile && !isEdit) {
        showToast(`Created file "${name}"`, 'success');
      } else {
        showToast('File saved successfully.', 'success');
      }
      setEditorState(prev => ({ ...prev, isOpen: false }));
    } catch (e: any) {
      console.error('Failed to save file:', e);
      finishOperation(false);
      // Don't toast if it was just cancelled/skipped, handled above by throwing
      if (e.message !== 'Save cancelled by user.') {
        showToast(e.message || 'Failed to save file.', 'error');
      }
      throw e;
    }
  };

  /* 
   * Link Expiry Modal State
   */
  const [linkExpiryData, setLinkExpiryData] = useState<{ isOpen: boolean; objects: S3Object[] }>({ isOpen: false, objects: [] });

  const handleGetLink = (objects: S3Object[]) => {
    if (objects.length === 0) return;
    setLinkExpiryData({ isOpen: true, objects });
  };

  const handleLinkExpiryConfirm = async (duration: number) => {
    const { objects } = linkExpiryData;
    if (!activeAccount || !activeAccount.bucketName || objects.length === 0) return;

    showOperation(`Generating link${objects.length > 1 ? 's' : ''}`);
    try {
      if (objects.length === 1) {
        // Single file
        const url = await s3Service.getPresignedUrl(activeAccount, activeAccount.bucketName, objects[0], duration);
        try {
          await writeText(url);
        } catch (clipboardError) {
          console.error('Clipboard write failed:', clipboardError);
          throw clipboardError;
        }
        finishOperation(true);
        showToast('Link copied to clipboard!');
      } else {
        // Multiple files
        const urls = await Promise.all(
          objects.map(obj => s3Service.getPresignedUrl(activeAccount, activeAccount.bucketName, obj, duration))
        );

        const linkList = urls
          .map((url, idx) => `${objects[idx].name}: ${url}`)
          .join('\n\n');

        try {
          await writeText(linkList);
        } catch (clipboardError) {
          console.error('Clipboard write failed:', clipboardError);
          throw clipboardError;
        }
        finishOperation(true);
        showToast(`${urls.length} links copied to clipboard!`);
      }

      // Log get_link activity for each object
      for (const obj of objects) {
        await activityService.logActivity(
          activeAccount,
          'get_link',
          obj.key,
          undefined,
          'success',
          undefined,
          obj.size
        );
      }
    } catch (e: any) {
      console.error('Error in handleGenerateLinks:', e);
      finishOperation(false);
      showToast(`Failed to generate link(s): ${e.message || String(e)}`, 'error');
    }
  };


  const handleGetContent = useCallback(async (obj: S3Object): Promise<string> => {
    if (!activeAccount || !activeAccount.bucketName) throw new Error("No active account");
    return s3Service.getFileContent(activeAccount, activeAccount.bucketName, obj.key);
  }, [activeAccount]);

  const handleGetPreviewUrl = useCallback(async (obj: S3Object): Promise<string> => {
    if (!activeAccount || !activeAccount.bucketName) {
      throw new Error("No active account or bucket");
    }
    if (obj.type !== 'image' && obj.type !== 'pdf') {
      throw new Error("Preview not available for this file type.");
    }
    return s3Service.getDownloadUrl(activeAccount, activeAccount.bucketName, obj);
  }, [activeAccount]);

  // --- Global Search Handler ---

  const handleGlobalSearch = async (query: string) => {
    if (!activeAccount || !activeAccount.bucketName) return;

    // If empty query, reset to normal view
    if (!query.trim()) {
      setIsSearchResults(false);
      refreshObjects();
      return;
    }

    setIsLoading(true);
    try {
      const results = await s3Service.searchObjects(activeAccount, activeAccount.bucketName, query);
      setObjects(results);
      setIsSearchResults(true);
      // We don't change currentPrefix, but UI will show search mode
    } catch (e: any) {
      console.error('Search failed:', e);
      showToast(e.message || 'Search failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Bucket / Folder Handlers ---

  const handleCreateBucket = async () => {
    if (!activeAccount) return;
    const bucketName = window.prompt("Enter new bucket name:");
    if (!bucketName) return;

    showOperation(`Creating bucket "${bucketName}"`);
    try {
      // Assuming createBucket takes (account, bucketName) or similar based on s3Service
      // I'll assume account wraps the logic and endpoint or we pass raw.
      // Checking s3Service in sidebar: onCreateBucket={handleCreateBucket}.
      // assuming s3Service.createBucket(account, bucketName) 
      await s3Service.createBucket(activeAccount, bucketName);

      // Refresh accounts/buckets
      const stored = await s3Service.getAccounts();
      setAccounts(stored);
      finishOperation(true);
      showToast(`Bucket "${bucketName}" created`, 'success');
    } catch (e: any) {
      finishOperation(false);
      showToast(e.message || 'Failed to create bucket', 'error');
    }
  };

  const handleCreateFolder = async (folderName?: string) => {
    if (!activeAccount || !activeAccount.bucketName) return;

    const name = folderName || window.prompt("Enter folder name:");
    if (!name || !String(name).trim()) {
      alert("Please enter a valid folder name.");
      return;
    }

    const trimmedName = String(name).trim();
    showOperation(`Creating folder "${trimmedName}"`);
    try {
      await s3Service.createFolder(activeAccount, activeAccount.bucketName, currentPrefix, trimmedName);

      // Log create_folder
      await activityService.logActivity(
        activeAccount,
        'create_folder',
        `${currentPrefix}${trimmedName}/`,
        undefined,
        'success'
      );

      await refreshObjects();
      finishOperation(true);
      await refreshObjects();
      finishOperation(true);
      const loc = currentPrefix ? `inside "${currentPrefix}"` : `in "${activeAccount.bucketName}"`;
      showToast(`Created folder "${trimmedName}" ${loc}`, 'success');
    } catch (e: any) {
      console.error(e);
      finishOperation(false);
      showToast(e.message || 'Failed to create folder.', 'error');
    }
  };

  const handleDownload = async (obj: S3Object | S3Object[]) => {
    if (!activeAccount || !activeAccount.bucketName) return;

    // Handle array of objects
    const items = Array.isArray(obj) ? obj : [obj];

    // If single file, download directly
    if (items.length === 1 && !items[0].isFolder) {
      const file = items[0];
      showOperation(`Downloading "${file.name}"`);
      try {
        const savePath = await save({
          defaultPath: file.name
        });

        if (!savePath) {
          finishOperation(false);
          return;
        }

        await invoke('download_file_to_path', {
          endpoint: activeAccount.endpoint,
          region: activeAccount.region,
          accessKeyId: activeAccount.accessKeyId,
          secretAccessKey: activeAccount.secretAccessKey,
          bucket: activeAccount.bucketName,
          key: file.key,
          path: savePath
        });

        // Log download activity
        await activityService.logActivity(
          activeAccount,
          'download',
          file.key,
          undefined,
          'success',
          undefined,
          file.size
        );

        finishOperation(true);
        showToast(`Downloaded "${file.name}"`, 'success');
      } catch (e) {
        finishOperation(false);
        showToast('Failed to download file', 'error');
      }
      return;
    }

    // If folder or multiple files, show compression format dialog
    setCompressionMode('download');
    setItemsToCompress(items);
    setCompressionFormat(null); // Will show dialog to select format
  };

  // --- Menu Bar Handlers ---

  const handleMenuBarNewFolder = useCallback(() => {
    if (activeAccount && activeAccount.bucketName) {
      const folderName = window.prompt("Enter folder name:");
      if (folderName) {
        handleCreateFolder(folderName);
      }
    }
  }, [activeAccount, activeBucket]);

  useMenuBar(
    handleQuickUpload,
    handleMenuBarNewFolder
  );

  // --- Render ---

  return (
    <ThemeProvider>
      <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200">
        <BackgroundSync accounts={accounts} />
        <Sidebar
          accounts={accounts}
          activeAccount={activeAccount}
          onSelectAccount={(acc) => {
            setActiveAccount(acc);
            setShowSync(false);
            setShowActivity(false);
            setShowAnalytics(false);
            // Permission check happens via effect
            setCurrentPrefix('');
          }}
          onReloadPermissions={(acc) => checkAccountPermissions(acc, true)}
          onAddAccount={() => {
            setIsAddConnectionModalOpen(true);
          }}
          onEditAccount={handleEditAccount}
          onRemoveAccount={handleRemoveAccount}
          onRemoveAllAccounts={() => setRemoveAllConfirm(true)}
          deleteConfirm={removeConnectionConfirm}
          onDeleteConfirmChange={setRemoveConnectionConfirm}
          onNavigate={(prefix) => { setCurrentPrefix(prefix); setShowSync(false); setShowActivity(false); setShowAnalytics(false); }}
          onShowSync={() => { setShowSync(true); setShowActivity(false); setShowAnalytics(false); }}
          onShowActivity={() => { setShowActivity(true); setShowSync(false); setShowAnalytics(false); }}
          onShowAnalytics={() => { setShowAnalytics(true); setShowSync(false); setShowActivity(false); }}
          onTransfer={handleSidebarTransfer}
          favourites={favourites}
          onSelectFavourite={handleSelectFavourite}
          onRemoveFavourite={handleRemoveFavourite}
          onShowTerms={() => {
            setShowTerms(true);
            setIsTermsReadOnly(true);
          }}
          onShowToast={showToast}
          onResetApplication={() => setResetAppConfirm(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)] relative overflow-hidden">
          {(!activeAccount || !activeAccount.bucketName) && !isAccountModalOpen ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <img src="./logo.png" alt="BucketStack" className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">{accounts.length === 0 ? 'Welcome to BucketStack' : 'Select a Bucket'}</h2>
              <p className="text-[var(--text-secondary)] mb-8 leading-relaxed max-w-md">
                {accounts.length === 0
                  ? 'Beautifully manage your S3 buckets. Secure, fast, and elegant.'
                  : 'Selected connection has no bucket configured. Please edit the connection to provide a bucket name or select a valid connection.'}
              </p>
              {accounts.length === 0 ? (
                <button
                  onClick={() => setIsAddConnectionModalOpen(true)}
                  className="px-8 py-3 bg-[var(--accent-blue)] text-white rounded-xl font-medium hover:bg-[var(--accent-blue-hover)] transition-all shadow-sm hover:shadow-md focus-ring"
                >
                  Add Your First Connection
                </button>
              ) : (
                <div className="text-sm font-medium text-[var(--accent-blue)] flex items-center gap-2">
                  <Database size={16} />
                  <span>Choose a connection with a bucket from the sidebar</span>
                </div>
              )}
            </div>
          ) : showSync ? (
            <SyncManager
              activeAccount={activeAccount}
              onNavigateBack={() => setShowSync(false)}
            />
          ) : showActivity ? (
            <ActivityLog
              activeAccount={activeAccount}
              onNavigateBack={() => setShowActivity(false)}
            />
          ) : showAnalytics ? (
            <StorageAnalytics
              activeAccount={activeAccount}
              onNavigateBack={() => setShowAnalytics(false)}
            />
          ) : (
            <FileExplorer
              objects={objects}
              currentBucket={activeBucket}
              currentPrefix={currentPrefix}
              viewMode={viewMode}
              isLoading={isLoading}
              uploadStatus={uploadStatus}
              operationStatus={operationStatus}
              activeAccount={activeAccount}
              clipboard={clipboard ? { hasItems: clipboard.objects.length > 0, isCut: clipboard.mode === 'move', itemKeys: clipboard.objects.map(o => o.key) } : null}
              onNavigate={setCurrentPrefix}
              onNavigateUp={handleNavigateUp}
              onToggleView={setViewMode}
              onUpload={handleUpload}
              onDelete={handleDelete}
              onRename={handleRename}
              onCreateFolder={handleCreateFolder}
              onDownload={handleDownload}
              onCopy={handleCopy}
              onCut={handleCut}
              onPaste={handlePaste}
              onDuplicate={handleDuplicate}
              onCompress={handleCompress}
              onGetLink={handleGetLink}
              onTransfer={handleOpenTransferModal}
              onGetPreviewUrl={handleGetPreviewUrl}
              onRefresh={refreshObjects}
              onCreateFile={() => setEditorState({ isOpen: true, name: '', content: '', mode: 'create' })}
              onEditFile={handleEditFile}
              onGlobalSearch={handleGlobalSearch}
              onGetContent={handleGetContent}
              isSearchResults={isSearchResults}
              onRestore={handleRestore}
              onEmptyTrash={handleEmptyTrash}
              favourites={favourites}
              onToggleFavourite={handleToggleFavourite}
            />
          )}

          <AccountModal
            isOpen={isAccountModalOpen}
            onClose={() => setIsAccountModalOpen(false)}
            onSave={handleAddAccount}
            initialData={editingAccount || undefined}
          />

          <AddConnectionModal
            isOpen={isAddConnectionModalOpen}
            onClose={() => setIsAddConnectionModalOpen(false)}
            onSelectSingle={() => {
              setIsAddConnectionModalOpen(false);
              setEditingAccount(null);
              setIsAccountModalOpen(true);
            }}
            onSelectMultiple={() => {
              setIsAddConnectionModalOpen(false);
              setIsMultiBucketModalOpen(true);
            }}
          />

          <MultiBucketModal
            isOpen={isMultiBucketModalOpen}
            onClose={() => setIsMultiBucketModalOpen(false)}
            onAddBuckets={handleAddMultipleBuckets}
            existingBuckets={accounts.map(a => a.bucketName)}
          />

          <FileEditorModal
            isOpen={editorState.isOpen}
            onClose={() => setEditorState(prev => ({ ...prev, isOpen: false }))}
            onSave={handleEditorSave}
            currentPath={currentPrefix}
            initialName={editorState.name}
            initialContent={editorState.content}
            mode={editorState.mode}
          />

          <LinkExpiryModal
            isOpen={linkExpiryData.isOpen}
            objects={linkExpiryData.objects}
            onClose={() => setLinkExpiryData(prev => ({ ...prev, isOpen: false }))}
            onConfirm={handleLinkExpiryConfirm}
          />

          {activeAccount && activeBucket && (
            <TransferModal
              isOpen={isTransferModalOpen}
              onClose={() => setIsTransferModalOpen(false)}
              sourceAccount={activeAccount}
              sourceBucket={activeBucket}
              selectedObjects={transferModalData.objects}
              type={transferModalData.type}
              onStartTransfer={handleStartTransfer}
            />
          )}

          <TransferProgressPanel
            jobs={transferJobs}
            onRetry={handleRetryTransfer}
            onClear={handleClearTransfer}
            onClearAll={handleClearAllTransfers}
          />

          <TermsModal
            isOpen={showTerms}
            onClose={() => setShowTerms(false)}
            isReadOnly={isTermsReadOnly}
            onAccept={() => {
              localStorage.setItem('bucketstack_terms_accepted', 'true');
              setShowTerms(false);
            }}
          />

          <UploadConflictModal
            isOpen={!!conflictData}
            fileName={conflictData?.fileName || ''}
            isBatch={conflictData?.isBatch || false}
            onResolve={(action, applyToAll) => conflictData?.resolve(action, applyToAll)}
          />

          {/* Modals & Dialogs */}
          {removeAllConfirm && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
              <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <Trash2 size={20} className="text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Remove All Connections</h3>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-4">
                    Are you sure you want to remove ALL connections? This action cannot be undone. All stored credentials will be permanently deleted.
                  </p>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
                    <p className="text-xs font-semibold text-red-600">⚠️ This will remove {accounts.length} connection{accounts.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setRemoveAllConfirm(false)} className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors font-medium">Cancel</button>
                    <button onClick={() => { handleRemoveAllAccounts(); setRemoveAllConfirm(false); }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">Remove All</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {resetAppConfirm && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center animate-in fade-in duration-200">
              <div className="bg-[var(--bg-primary)] border-2 border-red-500/30 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                      <AlertCircle size={24} className="text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-[var(--text-primary)]">Reset BucketStack?</h3>
                      <p className="text-xs text-red-500 font-medium uppercase tracking-tighter">This action is irreversible</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-primary)]">
                      <p className="text-sm font-semibold text-[var(--text-primary)] mb-2">The following will be deleted:</p>
                      <ul className="text-xs text-[var(--text-secondary)] space-y-2">
                        <li className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-red-500" />
                          All S3 account connections
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-red-500" />
                          All saved credentials in secure storage
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-red-500" />
                          All activity and usage logs
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-red-500" />
                          All application preferences and cache
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setResetAppConfirm(false)}
                      className="flex-1 px-4 py-3 rounded-xl border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all font-semibold"
                    >
                      Keep Everything
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          showOperation('Resetting application...');
                          await s3Service.clearAllData();
                        } catch (e: any) {
                          finishOperation(false);
                          showToast(e.message, 'error');
                        }
                      }}
                      className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold shadow-lg shadow-red-600/20"
                    >
                      Delete All Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {removeConnectionConfirm && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
              <div className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[var(--bg-danger-subtle)] flex items-center justify-center">
                      <Trash2 size={20} className="text-[var(--text-danger)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Remove Connection</h3>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-6">
                    Are you sure you want to remove the connection "{removeConnectionConfirm.accountName}"?
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setRemoveConnectionConfirm(null)} className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors font-medium">Cancel</button>
                    <button onClick={() => { handleRemoveAccount(removeConnectionConfirm.accountId); setRemoveConnectionConfirm(null); }} className="px-4 py-2 bg-[var(--text-danger)] text-white rounded-lg hover:bg-red-600 transition-colors font-medium">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {compressionFormat === null && itemsToCompress.length > 0 && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-[var(--bg-primary)] rounded-xl shadow-xl p-6 max-w-sm mx-4 border border-[var(--border-color)]">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{compressionMode === 'download' ? 'Download Archive' : 'Create Archive'}</h2>
                <div className="space-y-3">
                  <button onClick={() => performCompress('zip')} className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium">ZIP Format</button>
                  <button onClick={() => performCompress('tar.gz')} className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium">TAR.GZ Format</button>
                  <button onClick={() => { setCompressionFormat(null); setItemsToCompress([]); }} className="w-full px-4 py-3 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-lg font-medium">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {toast && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4">
              <div className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                {toast.message}
              </div>
            </div>
          )}

          <MoveToModal
            isOpen={isMoveToModalOpen}
            onClose={() => {
              setIsMoveToModalOpen(false);
              setItemsToMove([]);
            }}
            onMove={handleMoveToDestination}
            sourcePrefix={currentPrefix}
            sourceBucket={activeAccount?.bucketName || ''}
            itemsToMove={itemsToMove}
            allObjects={objects}
          />
        </main>
      </div>
    </ThemeProvider>
  );
};

export default App;