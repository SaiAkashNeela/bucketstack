import React, { useState, useEffect } from 'react';
import { Upload, Database, Maximize, Power, RefreshCw, FileText, Folder, CheckCircle2, AlertCircle, Cloud, ChevronRight, CornerDownRight, ArrowUpRight, ArrowDownLeft, Clock, Server, Eye, Plus, Link2 } from 'lucide-react';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { s3Service } from '../services/s3Service';
import { S3Account, S3Object, SyncJob } from '../types';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { invoke } from '@tauri-apps/api/core';

const AccountIcon: React.FC<{ account: S3Account, className?: string }> = ({ account, className }) => {
    let iconPath = '';
    switch (account.provider) {
        case 'aws': iconPath = '/icons/s3.svg'; break;
        case 'cloudflare': iconPath = '/icons/r2.svg'; break;
        case 'minio': iconPath = '/icons/minio.jpeg'; break;
        case 'wasabi': iconPath = '/icons/wasabi.jpg'; break;
        case 'digitalocean': iconPath = '/icons/spaces.svg'; break;
        // case 'railway': iconPath = '/icons/railway.svg'; break;
        case 'custom': return <Server className={className} />;
        default: return <Database className={className} />;
    }

    return (
        <img
            src={iconPath}
            alt={account.provider}
            className={`${className} object-contain rounded-sm`}
            onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
        />
    );
};

export const TrayWindow: React.FC = () => {
    const [accounts, setAccounts] = useState<S3Account[]>([]);
    const [activeAccount, setActiveAccount] = useState<S3Account | null>(null);
    const [recentFiles, setRecentFiles] = useState<S3Object[]>([]);
    const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>('');
    const [activeUploads, setActiveUploads] = useState<{ [key: string]: { progress: number, completed: boolean } }>({});
    const [isDragging, setIsDragging] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const unlistenDropRef = React.useRef<any>(null);
    const unlistenFocusRef = React.useRef<any>(null);
    const activeAccountRef = React.useRef(activeAccount);

    // Sync ref to state
    useEffect(() => { activeAccountRef.current = activeAccount; }, [activeAccount]);

    useEffect(() => {
        loadData();

        const setupListeners = async () => {
            try {
                // Listen for native drag drop events (OS -> Webview)
                const unlistenDrop = await getCurrentWebview().onDragDropEvent((event) => {
                    if (event.payload.type === 'drop') {
                        processUploadsFromPaths(event.payload.paths);
                    } else if (event.payload.type === 'enter' || event.payload.type === 'over') {
                        setIsDragging(true);
                    } else if (event.payload.type === 'leave') {
                        setIsDragging(false);
                    }
                });
                unlistenDropRef.current = unlistenDrop;

                // Listen for window focus to refresh data
                const unlistenFocus = await getCurrentWindow().listen('tauri://focus', () => {
                    loadData();
                    // Note: refreshFiles will be triggered by another useEffect if activeAccount is set
                });
                unlistenFocusRef.current = unlistenFocus;

            } catch (err) {
                console.error('Failed to setup native listeners:', err);
            }
        };

        setupListeners();

        // Listen for storage changes (updates from main window)
        const handleStorageChange = () => loadData();
        window.addEventListener('storage', handleStorageChange);

        // Poll for sync job updates every second while tray is open
        const pollInterval = setInterval(() => {
            const savedJobs = localStorage.getItem('bucketstack_sync_jobs');
            if (savedJobs) {
                try {
                    const parsed = JSON.parse(savedJobs);
                    setSyncJobs(prev => {
                        if (JSON.stringify(prev) !== savedJobs) return parsed;
                        return prev;
                    });
                } catch (e) { console.error(e); }
            }
        }, 1000);

        return () => {
            if (unlistenDropRef.current) unlistenDropRef.current();
            if (unlistenFocusRef.current) unlistenFocusRef.current();
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(pollInterval);
        };
    }, []); // Run only on mount

    useEffect(() => {
        if (activeAccount) {
            refreshFiles(activeAccount);
        }
    }, [activeAccount]);

    const loadData = async () => {
        // Load Accounts
        try {
            const loaded = await s3Service.getAccounts();
            setAccounts(loaded);
            if (loaded.length > 0 && !activeAccount) {
                setActiveAccount(prev => {
                    if (prev) {
                        const existing = loaded.find(a => a.id === prev.id);
                        if (existing) return existing;
                    }
                    return loaded[0];
                });
            }
        } catch (e) {
            console.error("Failed to load accounts", e);
        }

        // Load Sync Jobs
        const savedJobs = localStorage.getItem('bucketstack_sync_jobs');
        if (savedJobs) {
            try {
                setSyncJobs(JSON.parse(savedJobs));
            } catch (e) { console.error(e); }
        }
    };

    const refreshFiles = async (account: S3Account) => {
        if (!account.bucketName) return;
        setIsLoading(true);
        try {
            const objects = await s3Service.listObjects(account, account.bucketName, '');
            // Sort by last modified
            // Filter trash and internal probe files
            const cleanObjects = objects.filter(obj =>
                !obj.key.startsWith('.trash/') &&
                !obj.key.startsWith('.bucketstack/')
            );

            // Split into files and folders
            const files = cleanObjects.filter(o => !o.isFolder).sort((a, b) => b.lastModified - a.lastModified);
            const folders = cleanObjects.filter(o => o.isFolder).sort((a, b) => a.name.localeCompare(b.name));

            // Files first (limit to 20 recent), then Folders (all of them, so they aren't hidden)
            setRecentFiles([...files.slice(0, 20), ...folders]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!activeAccount || !activeAccount.bucketName) return;
        if (activeAccount.accessMode === 'read-only') return; // Prevent upload

        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.onchange = async (e: any) => {
                if (e.target.files?.length) {
                    processUploads(Array.from(e.target.files));
                }
            };
            input.click();
        } catch (e) {
            console.error(e);
        }
    };

    const processUploadsFromPaths = async (paths: string[]) => {
        const activeAcc = activeAccountRef.current;
        if (!activeAcc || !activeAcc.bucketName) return;
        if (activeAcc.accessMode === 'read-only') { return; }

        setIsDragging(false);

        // Initialize progress for all files
        const newUploads = { ...activeUploads };
        paths.forEach(p => { newUploads[p.split('/').pop() || p] = { progress: 0, completed: false }; });
        setActiveUploads(newUploads);

        try {
            // Native upload_paths handles multiple files but doesn't give per-file progress callback easily in one go unless detailed
            // However, we can simulate or just show indeterminate. 
            // Better: use upload_paths but maybe split or just let backend handle.
            // For tray visuals, strict per-file progress is tricky with current backend 'upload_paths'.
            // Whatever, let's just mark them as 'in progress' (0-90) then done.

            // To animate activeUploads, we'll just cycle them or rely on them clearing on refresh.
            // Since upload_paths is "fire and forget" mostly or blocks until all done, we'll simulate progress.
            const interval = setInterval(() => {
                setActiveUploads(prev => {
                    const next = { ...prev };
                    paths.forEach(p => {
                        const name = p.split('/').pop() || p;
                        if (next[name] && !next[name].completed && next[name].progress < 90) {
                            next[name] = { ...next[name], progress: next[name].progress + 10 };
                        }
                    });
                    return next;
                });
            }, 300);

            await invoke('upload_paths', {
                accountId: activeAcc.id,
                provider: activeAcc.provider,
                endpoint: activeAcc.endpoint,
                region: activeAcc.region,
                accessKeyId: activeAcc.accessKeyId,
                secretAccessKey: activeAcc.secretAccessKey,
                bucket: activeAcc.bucketName,
                prefix: '',
                paths: paths,
                enableActivityLog: activeAcc.enableActivityLog ?? true
            });

            clearInterval(interval);

            // Mark complete then remove after delay
            setActiveUploads(prev => {
                const next = { ...prev };
                paths.forEach(p => {
                    const name = p.split('/').pop() || p;
                    next[name] = { progress: 100, completed: true };
                });
                return next;
            });

            refreshFiles(activeAcc);

            setTimeout(() => {
                setActiveUploads(prev => {
                    const next = { ...prev };
                    paths.forEach(p => delete next[p.split('/').pop() || p]);
                    return next;
                });
            }, 2000); // Show success state for 2s

        } catch (e) {
            console.error('Upload failed:', e);
            // Clear on error immediately? Or show error state? For now clear.
            setActiveUploads(prev => {
                const next = { ...prev };
                paths.forEach(p => delete next[p.split('/').pop() || p]);
                return next;
            });
        }
    };

    const processUploads = async (files: File[]) => {
        if (!activeAccount || !activeAccount.bucketName) return;
        if (activeAccount.accessMode === 'read-only') {
            console.warn('Upload blocked: Account is Read-Only');
            return;
        }

        // Add to active uploads
        const newUploads = { ...activeUploads };
        files.forEach(f => { newUploads[f.name] = { progress: 0, completed: false }; });
        setActiveUploads(newUploads);

        try {
            for (const file of files) {
                await s3Service.uploadFile(
                    activeAccount,
                    activeAccount.bucketName!,
                    '',
                    file,
                    (progress) => {
                        setActiveUploads(prev => ({ ...prev, [file.name]: { progress, completed: false } }));
                    }
                );

                // Remove from active uploads when done after delay (handle outside loop ideally or here)
                // For direct file uploads, we'll mark completed here
                setActiveUploads(prev => ({
                    ...prev,
                    [file.name]: { progress: 100, completed: true }
                }));

                setTimeout(() => {
                    setActiveUploads(prev => {
                        const next = { ...prev };
                        delete next[file.name];
                        return next;
                    });
                }, 2000);

                // Log upload activity
                try {
                    const { activityService } = await import('../services/activityService');
                    await activityService.logActivity(
                        activeAccount,
                        'upload',
                        file.name,
                        undefined,
                        'success',
                        undefined,
                        file.size
                    );
                } catch (logError) {
                    console.warn('Failed to log activity:', logError);
                }
            }
            refreshFiles(activeAccount);
        } catch (e) {
            console.error("Upload failed", e);
            // Clear all on error to avoid stuck
            setActiveUploads({});
        }
    };

    const handleGetLink = async (e: React.MouseEvent, obj: S3Object) => {
        e.stopPropagation();
        if (!activeAccount) return;

        try {
            const url = await invoke('get_signed_url', {
                endpoint: activeAccount.endpoint || '',
                region: activeAccount.region,
                accessKeyId: activeAccount.accessKeyId,
                secretAccessKey: activeAccount.secretAccessKey,
                bucket: activeAccount.bucketName || '',
                key: obj.key,
                expiresIn: 3600 // 1 hour
            }) as string;

            await writeText(url);
            setCopiedKey(obj.key);
            setTimeout(() => setCopiedKey(null), 2000);
        } catch (err) {
            console.error('Failed to get link:', err);
        }
    };

    const onDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (!activeAccount || !activeAccount.bucketName) return;
        if (activeAccount.accessMode === 'read-only') return; // Prevent drop

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files) as unknown as File[];
            processUploads(files);
        }
    };

    return (
        <div className="w-screen h-screen bg-transparent flex flex-col overflow-hidden">
            {/* Arrow connecting to tray icon */}
            <div className="h-3 flex justify-center w-full relative z-50">
                {/* Match the border color and bg perfectly */}
                <div className="w-4 h-4 bg-white rotate-45 transform origin-center translate-y-[9px] border-l border-t border-slate-200/50 rounded-tl-[2px]"></div>
            </div>

            {/* Main Bubble Container - Forced Light Mode */}
            <div
                className="flex-1 bg-white text-slate-800 flex flex-col font-sans border border-slate-200/50 shadow-2xl rounded-[24px] overflow-hidden mx-2 mb-2 relative z-40"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-2 drag-region shrink-0 bg-white">
                    <div className="flex items-center gap-2">
                        <img src="./logo.png" alt="Logo" className="w-5 h-5 object-contain" />
                        <h1 className="text-sm font-bold text-slate-900 tracking-tight">BucketStack</h1>
                    </div>
                    <div className="flex items-center gap-2 min-w-0 shrink">
                        {activeAccount?.accessMode === 'read-only' && (
                            <div className="px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-[9px] font-bold text-amber-600 uppercase tracking-wide">
                                Read Only
                            </div>
                        )}
                        <div className="flex items-center bg-slate-100 hover:bg-slate-200 transition-colors rounded-lg px-2 border border-slate-200/50">
                            {activeAccount && (
                                <AccountIcon account={activeAccount} className="w-3.5 h-3.5 shrink-0 mr-1.5 mix-blend-multiply opacity-80" />
                            )}
                            <select
                                className="text-xs font-semibold bg-transparent border-none outline-none py-1.5 text-slate-700 cursor-pointer appearance-none max-w-[100px] truncate"
                                value={activeAccount?.id || ''}
                                onChange={(e) => {
                                    const acc = accounts.find(a => a.id === e.target.value);
                                    if (acc) setActiveAccount(acc);
                                }}
                            >
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.bucketName}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto min-h-0 bg-white relative">
                    {/* Upload Zone - Always Visible */}
                    {activeAccount?.accessMode !== 'read-only' && (
                        <div className="px-4 py-2 sticky top-0 bg-white z-20">
                            <div
                                className={`
                                    relative rounded-xl p-3 transition-all duration-200 border
                                    ${isDragging
                                        ? 'bg-blue-50 border-blue-400 shadow-md ring-1 ring-blue-200'
                                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100 group cursor-pointer'
                                    }
                                `}
                                onClick={!isDragging ? handleUpload : undefined}
                            >
                                <div className="flex flex-col items-center justify-center h-[50px] gap-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-full ${isDragging ? 'bg-blue-100' : 'bg-white shadow-sm'}`}>
                                            <Cloud size={16} className={isDragging ? 'text-blue-500' : 'text-blue-400'} />
                                        </div>
                                        <p className={`text-xs font-semibold ${isDragging ? 'text-blue-600' : 'text-slate-600'}`}>
                                            {isDragging ? 'Drop to Upload!' : 'Click or Drag files'}
                                        </p>
                                    </div>
                                    <p className="text-[9px] text-slate-400 text-center leading-tight">Click the BucketStack tray icon to close me</p>
                                </div>
                                {!isDragging && (
                                    <button className="absolute top-1/2 -translate-y-1/2 right-3 w-7 h-7 bg-white border border-slate-100 text-slate-400 hover:text-blue-500 hover:border-blue-200 rounded-full shadow-sm flex items-center justify-center transition-all">
                                        <Plus size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Uploading Items List */}
                    {Object.keys(activeUploads).length > 0 && (
                        <div className="px-2 pb-2 pt-1 space-y-1 bg-slate-50/50 border-b border-slate-100">
                            <h3 className="text-[10px] uppercase font-bold text-blue-500 px-4 mb-2 tracking-wider">Uploading...</h3>
                            {Object.keys(activeUploads).map((name) => {
                                const progress = activeUploads[name];
                                return (
                                    <div key={name} className="relative group flex items-center gap-3 p-2 rounded-xl bg-white border border-blue-100 mx-2 overflow-hidden">
                                        {/* Progress Bar Background */}
                                        <div
                                            className="absolute bottom-0 left-0 h-1 bg-blue-500 transition-all duration-300 opacity-20"
                                            style={{ width: `${progress.progress}%` }}
                                        />
                                        {/* Progress Line */}
                                        <div
                                            className="absolute bottom-0 left-0 h-[2px] bg-blue-500 transition-all duration-300"
                                            style={{ width: `${progress.progress}%` }}
                                        />

                                        <div className="p-2 rounded-lg bg-blue-50 text-blue-500 relative z-10">
                                            <RefreshCw size={16} className="animate-spin" />
                                        </div>
                                        <div className="flex-1 min-w-0 relative z-10">
                                            <p className="text-xs font-semibold text-slate-700 truncate">{name}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-blue-500 font-medium">
                                                    {isNaN(progress.progress) ? 0 : Math.round(progress.progress)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Recent Files List */}
                    {/* Recent Files List - Always Visible */}
                    <div className="px-2 pb-2 pt-2 space-y-1">

                        {/* Empty State */}
                        {!isLoading && recentFiles.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                                <FileText size={24} className="mb-2 opacity-50" />
                                <span className="text-xs">No recent files</span>
                            </div>
                        )}

                        {recentFiles.map(obj => (
                            <div
                                key={obj.key}
                                onClick={async () => {
                                    if (obj.isFolder) {
                                        // Open main window and navigate to bucket (and ideally path, but simple for now)
                                        await invoke('show_main_window');
                                        // TODO: Emit event to navigate main window to this folder
                                    }
                                }}
                                className={`group flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors mx-2 border border-transparent hover:border-slate-100 ${obj.isFolder ? 'cursor-pointer hover:bg-blue-50/50' : 'cursor-default'}`}
                            >
                                <div className="p-2 rounded-lg bg-slate-100 text-slate-500">
                                    {obj.isFolder ? <Folder size={16} className="text-amber-400" /> : <FileText size={16} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-700 truncate">{obj.name || obj.key.split('/').pop()}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400">
                                            {obj.isFolder ? '--' : `${(obj.size / 1024).toFixed(1)} KB`}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => handleGetLink(e, obj)}
                                    className={`p-1.5 rounded-lg transition-all ${!obj.isFolder
                                        ? (copiedKey === obj.key
                                            ? 'bg-green-100 text-green-600 ring-1 ring-green-200'
                                            : 'bg-transparent text-slate-300 hover:text-blue-500 hover:bg-blue-50')
                                        : 'invisible'
                                        }`}
                                    title={obj.isFolder ? undefined : "Get Link"}
                                >
                                    {copiedKey === obj.key ? <CheckCircle2 size={14} /> : <Link2 size={14} />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Simplified Sticky Footer - Sync Jobs Only */}
                <div className="border-t border-slate-100 bg-slate-50/80 backdrop-blur-md px-4 py-3 shrink-0 flex items-center justify-between z-30">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-full ${syncJobs.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
                            <RefreshCw size={12} className={syncJobs.some(j => j.status === 'running') ? 'animate-spin' : ''} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">
                                {syncJobs.filter(j => activeAccount && j.accountId === activeAccount.id).length} Active Syncs
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">Running in background for this bucket</span>
                        </div>
                    </div>

                    <button
                        onClick={() => invoke('show_main_window')}
                        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:shadow-sm transition-all group"
                        title="View Sync Jobs"
                    >
                        <Eye size={16} className="group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};
