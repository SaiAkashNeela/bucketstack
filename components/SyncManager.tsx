import React, { useState, useEffect } from 'react';
import {
    RefreshCw, Folder, Cloud, ArrowRight, ArrowLeft,
    Plus, Trash2, Play, AlertCircle, CheckCircle2,
    Info, Clock, Database, ChevronRight, X, Edit2
} from 'lucide-react';
import { S3Account, SyncJob, SyncStats } from '../types';
import { s3Service } from '../services/s3Service';
import { activityService } from '../services/activityService';
import { open } from '@tauri-apps/plugin-dialog';

interface SyncManagerProps {
    activeAccount: S3Account | null;
    onNavigateBack: () => void;
}

const SYNC_JOBS_KEY = 'bucketstack_sync_jobs';

export const SyncManager: React.FC<SyncManagerProps> = ({ activeAccount, onNavigateBack }) => {
    const [jobs, setJobs] = useState<SyncJob[]>([]);
    const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
    const [newJob, setNewJob] = useState<Partial<SyncJob>>({
        direction: 'up',
        remotePath: '',
        localPath: '',
        intervalSeconds: 0,
        name: '',
        mirrorSync: false
    });
    const [customInterval, setCustomInterval] = useState({ days: 0, hours: 0, minutes: 0 });
    const [runningJobId, setRunningJobId] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [editingJobId, setEditingJobId] = useState<string | null>(null);
    const [editInterval, setEditInterval] = useState({ days: 0, hours: 0, minutes: 0 });

    // Load jobs from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(SYNC_JOBS_KEY);
        if (saved) {
            try {
                setJobs(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse sync jobs:', e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Save jobs to localStorage
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(SYNC_JOBS_KEY, JSON.stringify(jobs));
        }
    }, [jobs, isLoaded]);

    const handlePickFolder = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: 'Select Local Folder for Sync'
            });
            if (selected) {
                setNewJob(prev => ({ ...prev, localPath: selected as string }));
            }
        } catch (e) {
            console.error('Failed to open folder picker:', e);
        }
    };

    const handleAddJob = () => {
        if (!activeAccount || !newJob.localPath) return;

        const totalSeconds = (customInterval.days * 86400) + (customInterval.hours * 3600) + (customInterval.minutes * 60);
        const defaultName = newJob.localPath.split('/').pop() || newJob.localPath;
        const jobName = (newJob.name && newJob.name.trim()) ? newJob.name : defaultName;

        const job: SyncJob = {
            id: crypto.randomUUID(),
            name: jobName,
            accountId: activeAccount.id,
            bucket: activeAccount.bucketName || '',
            localPath: newJob.localPath,
            remotePath: newJob.remotePath || '',
            direction: newJob.direction as 'up' | 'down',
            status: 'idle',
            intervalSeconds: totalSeconds,
            mirrorSync: (newJob as any).mirrorSync || false,
            nextRun: totalSeconds > 0 ? Date.now() + totalSeconds * 1000 : undefined
        };

        setJobs(prev => [...prev, job]);
        setIsNewJobModalOpen(false);
        setNewJob({ direction: 'up', remotePath: '', localPath: '', intervalSeconds: 0, name: '', mirrorSync: false });
        setCustomInterval({ days: 0, hours: 0, minutes: 0 });

        // Auto-start first sync
        setTimeout(() => handleRunSync(job), 500);
    };

    const handleDeleteJob = (id: string) => {
        setJobs(prev => prev.filter(j => j.id !== id));
    };

    const handleUpdateInterval = async (jobId: string) => {
        const totalSeconds = (editInterval.days * 86400) + (editInterval.hours * 3600) + (editInterval.minutes * 60);
        const job = jobs.find(j => j.id === jobId);
        if (!job || !activeAccount) return;

        const oldName = job.name;
        const newName = (editInterval as any).jobName || job.name;
        const oldCron = job.intervalSeconds;
        const newCron = totalSeconds;
        const oldMirrorSync = job.mirrorSync || false;
        const newMirrorSync = (editInterval as any).mirrorSync || false;

        // Log name change
        if (oldName !== newName) {
            await activityService.logActivity(
                activeAccount,
                'sync_name_changed',
                `${oldName} → ${newName}`,
                undefined,
                'success'
            );
        }

        // Log cron/interval change
        if (oldCron !== newCron) {
            const oldInterval = oldCron > 0 ? `${Math.floor(oldCron / 86400)}d ${Math.floor((oldCron % 86400) / 3600)}h ${Math.floor((oldCron % 3600) / 60)}m` : 'manual';
            const newInterval = newCron > 0 ? `${Math.floor(newCron / 86400)}d ${Math.floor((newCron % 86400) / 3600)}h ${Math.floor((newCron % 3600) / 60)}m` : 'manual';
            await activityService.logActivity(
                activeAccount,
                'sync_interval_changed',
                `${oldInterval} → ${newInterval}`,
                undefined,
                'success'
            );
        }

        // Log mirror sync changes
        if (oldMirrorSync !== newMirrorSync) {
            await activityService.logActivity(
                activeAccount,
                'sync_mirror_' + (newMirrorSync ? 'enabled' : 'disabled'),
                job.localPath,
                undefined,
                'success'
            );
        }

        setJobs(prev => prev.map(j => j.id === jobId ? {
            ...j,
            name: newName,
            intervalSeconds: totalSeconds,
            nextRun: totalSeconds > 0 ? Date.now() + totalSeconds * 1000 : undefined,
            mirrorSync: newMirrorSync
        } : j));
        setEditingJobId(null);
        setEditInterval({ days: 0, hours: 0, minutes: 0, jobName: '', mirrorSync: false } as any);
    };

    const handleRunSync = async (job: SyncJob) => {
        if (!activeAccount || runningJobId === job.id) return;

        setRunningJobId(job.id);
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'running' } : j));

        try {
            const stats = await s3Service.syncFolder(
                activeAccount,
                job.bucket,
                job.localPath,
                job.remotePath,
                job.direction,
                job.mirrorSync || false
            );

            // Log successful sync
            await activityService.logActivity(
                activeAccount,
                'sync',
                `${job.remotePath}`,
                undefined,
                'success',
                undefined,
                stats.bytes_transferred
            );

            setJobs(prev => prev.map(j => j.id === job.id ? {
                ...j,
                status: 'completed',
                lastRun: Date.now(),
                lastStats: stats,
                nextRun: j.intervalSeconds && j.intervalSeconds > 0 ? Date.now() + j.intervalSeconds * 1000 : undefined
            } : j));
        } catch (error: any) {
            console.error('Sync failed:', error);

            // Log failed sync
            await activityService.logActivity(
                activeAccount,
                'sync',
                `${job.remotePath}`,
                undefined,
                'failed',
                error.message
            );

            setJobs(prev => prev.map(j => j.id === job.id ? {
                ...j,
                status: 'error',
                lastStats: { files_scanned: 0, files_transferred: 0, bytes_transferred: 0, errors: [error.message] },
                nextRun: j.intervalSeconds && j.intervalSeconds > 0 ? Date.now() + 300 * 1000 : undefined // Retry in 5m on error
            } : j));
        } finally {
            setRunningJobId(null);
        }
    };

    // Listen for storage changes (background sync updates)
    useEffect(() => {
        const handleStorage = () => {
            const saved = localStorage.getItem(SYNC_JOBS_KEY);
            if (saved) {
                try {
                    setJobs(JSON.parse(saved));
                } catch (e) {
                    console.error('Failed to parse sync jobs from storage event:', e);
                }
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const filteredJobs = jobs.filter(j => j.accountId === activeAccount?.id);

    return (
        <div className="flex flex-col h-full bg-[var(--bg-primary)]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--accent-blue-subtle)] rounded-lg">
                        <RefreshCw className={`w-5 h-5 text-[var(--accent-blue)] ${runningJobId ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)]">Folder Sync</h2>
                        <p className="text-xs text-[var(--text-tertiary)]">Mirror your local folders with remote buckets</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsNewJobModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-blue)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--accent-blue-hover)] transition-all shadow-lg shadow-blue-500/10 focus-ring"
                    >
                        <Plus size={16} />
                        <span>New Sync Job</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {filteredJobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                        <div className="p-6 bg-[var(--bg-tertiary)] rounded-full border-2 border-[var(--border-primary)] border-dashed">
                            <RefreshCw className="w-12 h-12 text-[var(--text-tertiary)] opacity-20" />
                        </div>
                        <div className="max-w-xs">
                            <h3 className="text-base font-semibold text-[var(--text-primary)]">No Sync Jobs</h3>
                            <p className="text-sm text-[var(--text-tertiary)] mt-1">
                                Create a sync job to keep your local folders and bucket in sync.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredJobs.map(job => (
                            <div
                                key={job.id}
                                className="group relative bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl overflow-hidden hover:border-[var(--accent-blue)] transition-all shadow-sm hover:shadow-md"
                            >
                                <div className="p-5 flex items-start gap-4">
                                    <div className={`p-3 rounded-xl ${job.status === 'running' ? 'bg-blue-500/10 text-blue-500' : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]'}`}>
                                        <Folder size={24} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-[var(--text-primary)]" title={job.name}>
                                                {job.name}
                                            </span>
                                            {job.mirrorSync && (
                                                <span className="px-2 py-0.5 bg-red-500/10 text-red-600 text-[9px] font-bold uppercase rounded border border-red-500/30">
                                                    Mirror
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 mb-2 text-xs text-[var(--text-tertiary)]">
                                            <span className="truncate" title={job.localPath}>
                                                {job.localPath.split('/').pop() || job.localPath}
                                            </span>
                                            {job.direction === 'up' ? (
                                                <ArrowRight size={12} className="text-[var(--text-tertiary)] shrink-0" />
                                            ) : (
                                                <ArrowLeft size={12} className="text-[var(--text-tertiary)] shrink-0" />
                                            )}
                                            <span className="text-[10px] truncate">
                                                {job.bucket}/{job.remotePath}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                                            <div className="flex items-center gap-1">
                                                <Database size={12} />
                                                <span>Bucket {job.direction === 'up' ? 'Upload' : 'Download'} Sync</span>
                                            </div>
                                            {job.lastRun && (
                                                <div className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    <span>Last run: {new Date(job.lastRun).toLocaleString()}</span>
                                                </div>
                                            )}
                                        </div>

                                        {job.intervalSeconds && job.intervalSeconds > 0 ? (
                                            <div className="mt-2 flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-[var(--accent-blue-subtle)] text-[var(--accent-blue)] rounded-md border border-[var(--accent-blue)]/20">
                                                    <RefreshCw size={10} className="animate-spin-slow" />
                                                    <span>
                                                        Every {
                                                            job.intervalSeconds >= 86400 ? `${Math.floor(job.intervalSeconds / 86400)}d` :
                                                                job.intervalSeconds >= 3600 ? `${Math.floor(job.intervalSeconds / 3600)}h` :
                                                                    job.intervalSeconds >= 60 ? `${Math.floor(job.intervalSeconds / 60)}m` :
                                                                        `${job.intervalSeconds}s`
                                                        }
                                                    </span>
                                                </div>
                                                {job.nextRun && job.status !== 'running' && (
                                                    <div className="flex items-center gap-1 text-[var(--text-tertiary)]">
                                                        <Clock size={10} />
                                                        <span>Next: {new Date(job.nextRun).toLocaleTimeString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)]/30" />
                                                <span>Manual Sync Only</span>
                                            </div>
                                        )}

                                        {job.status === 'running' && (
                                            <div className="mt-4 animate-in fade-in duration-300">
                                                <div className="flex items-center justify-between text-[10px] text-[var(--accent-blue)] font-bold uppercase tracking-wider mb-2">
                                                    <span>Syncing Files...</span>
                                                    <span className="animate-pulse">Active</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-blue-500/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-[var(--accent-blue)] animate-progress rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                </div>
                                            </div>
                                        )}

                                        {job.lastStats && job.status !== 'running' && (
                                            <div className="mt-4 grid grid-cols-3 gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-secondary)]">
                                                <div className="text-center border-r border-[var(--border-primary)] last:border-0">
                                                    <div className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider mb-1">Scanned</div>
                                                    <div className="text-sm font-bold text-[var(--text-secondary)]">{job.lastStats.files_scanned}</div>
                                                </div>
                                                <div className="text-center border-r border-[var(--border-primary)] last:border-0">
                                                    <div className="text-[10px] text-[var(--accent-blue)] font-bold uppercase tracking-wider mb-1">Synced</div>
                                                    <div className="text-sm font-bold text-[var(--accent-blue)]">{job.lastStats.files_transferred}</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider mb-1">Size</div>
                                                    <div className="text-sm font-bold text-[var(--text-secondary)]">{formatBytes(job.lastStats.bytes_transferred)}</div>
                                                </div>
                                            </div>
                                        )}

                                        {job.status === 'error' && job.lastStats?.errors?.[0] && (
                                            <div className="mt-3 flex items-start gap-2 p-3 bg-red-500/5 text-red-500 rounded-lg border border-red-500/20 text-xs">
                                                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                                <span className="font-medium line-clamp-2">{job.lastStats.errors[0]}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => handleRunSync(job)}
                                            disabled={runningJobId !== null}
                                            className={`p-2.5 rounded-lg transition-all ${job.status === 'running'
                                                ? 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] cursor-not-allowed'
                                                : 'bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] shadow-sm hover:shadow-blue-500/20'
                                                }`}
                                        >
                                            <Play size={18} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingJobId(job.id);
                                                const days = Math.floor(job.intervalSeconds / 86400);
                                                const hours = Math.floor((job.intervalSeconds % 86400) / 3600);
                                                const minutes = Math.floor((job.intervalSeconds % 3600) / 60);
                                                setEditInterval({ days, hours, minutes, jobName: job.name, mirrorSync: job.mirrorSync } as any);
                                            }}
                                            disabled={runningJobId !== null}
                                            className="p-2.5 bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-purple-500 hover:bg-purple-500/10 rounded-lg transition-all"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteJob(job.id)}
                                            disabled={runningJobId !== null}
                                            className="p-2.5 bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Interval Modal */}
            {editingJobId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setEditingJobId(null)} />
                    <div className="relative w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-[var(--border-primary)] flex items-center justify-between shrink-0 bg-[var(--bg-secondary)]">
                            <div className="flex items-center gap-3 text-[var(--text-primary)]">
                                <Edit2 className="text-[var(--accent-blue)]" size={18} />
                                <h3 className="text-base font-bold">Edit Sync Job</h3>
                            </div>
                            <button onClick={() => setEditingJobId(null)} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors text-[var(--text-tertiary)]">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-5 space-y-4">
                            {/* Job Name */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Job Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                                    value={(editInterval as any).jobName || ''}
                                    placeholder="e.g., Daily Backup"
                                    onChange={e => setEditInterval(prev => ({ ...prev, jobName: e.target.value } as any))}
                                />
                            </div>

                            {/* Sync Interval */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Sync Interval</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: 'Days', key: 'days' },
                                        { label: 'Hours', key: 'hours' },
                                        { label: 'Mins', key: 'minutes' },
                                    ].map((unit) => (
                                        <div key={unit.key} className="space-y-1">
                                            <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase text-center">{unit.label}</div>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg px-2 py-1.5 text-xs text-center text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                                                value={(editInterval as any)[unit.key]}
                                                onChange={e => setEditInterval(prev => ({ ...prev, [unit.key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[9px] text-[var(--text-tertiary)] italic">
                                    {(editInterval as any).days > 0 || (editInterval as any).hours > 0 || (editInterval as any).minutes > 0
                                        ? `Every ${(editInterval as any).days > 0 ? `${(editInterval as any).days}d ` : ''}${(editInterval as any).hours > 0 ? `${(editInterval as any).hours}h ` : ''}${(editInterval as any).minutes > 0 ? `${(editInterval as any).minutes}m` : ''}`
                                        : 'Manual only'}
                                </p>
                            </div>
                            {/* Mirror Sync */}
                            <div className="space-y-2 p-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="mirror_sync"
                                        checked={(editInterval as any).mirrorSync || false}
                                        onChange={e => setEditInterval(prev => ({ ...prev, mirrorSync: e.target.checked } as any))}
                                        className="w-4 h-4 cursor-pointer"
                                    />
                                    <label htmlFor="mirror_sync" className="text-xs font-bold text-[var(--text-primary)] cursor-pointer">
                                        Mirror Sync (Exact Match)
                                    </label>
                                </div>

                                {(editInterval as any).mirrorSync && (
                                    <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg space-y-2">
                                        <div>
                                            <p className="text-[9px] font-bold text-red-600 uppercase tracking-wider">⚠️ Warning: Destructive Operation</p>
                                            <p className="text-[8px] text-red-700 mt-1">Mirror Sync makes S3 an EXACT copy of your local folder. Files that exist in S3 but NOT in your local folder will be PERMANENTLY DELETED.</p>
                                        </div>
                                        
                                        <div className="bg-red-600/20 p-2 rounded border-l-2 border-red-600 space-y-1">
                                            <p className="text-[8px] font-bold text-red-700">Real Example:</p>
                                            <div className="text-[8px] text-red-700 space-y-0.5 font-mono">
                                                <p><strong>Local:</strong> report.pdf, budget.xlsx</p>
                                                <p><strong>S3:</strong> report.pdf, budget.xlsx, old_notes.txt</p>
                                            </div>
                                            <p className="text-[8px] font-bold text-red-700 mt-1">After Sync:</p>
                                            <p className="text-[8px] text-red-600 font-bold">❌ old_notes.txt DELETED!</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-[var(--bg-tertiary)] border-t border-[var(--border-primary)] flex justify-end gap-2 shrink-0">
                            <button
                                onClick={() => setEditingJobId(null)}
                                className="px-5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleUpdateInterval(editingJobId)}
                                className="px-6 py-1.5 text-xs font-bold text-white bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] rounded-lg transition-all shadow-lg shadow-blue-500/20"
                            >
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Job Modal */}
            {isNewJobModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsNewJobModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-4 border-b border-[var(--border-primary)] flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2 text-[var(--text-primary)]">
                                <Plus className="text-[var(--accent-blue)]" size={18} />
                                <h3 className="text-base font-bold">New Sync Job</h3>
                            </div>
                            <button onClick={() => setIsNewJobModalOpen(false)} className="p-1 hover:bg-[var(--bg-tertiary)] rounded-full transition-colors text-[var(--text-tertiary)]">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-4 space-y-3">
                            {/* Direction Picker */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Sync Direction</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setNewJob(prev => ({ ...prev, direction: 'up' }))}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all text-xs ${newJob.direction === 'up'
                                            ? 'border-[var(--accent-blue)] bg-[var(--accent-blue-subtle)] text-[var(--accent-blue)]'
                                            : 'border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] hover:border-[var(--border-secondary)]'
                                            }`}
                                    >
                                        <ArrowRight size={16} />
                                        <span className="font-bold uppercase">Local → Bucket</span>
                                    </button>
                                    {/* TODO: Future Feature - Bucket to Local sync
                                         Currently disabled. Will be enabled in a future release.
                                         Requires additional testing for cross-platform compatibility.
                                    */}
                                    <button
                                        disabled
                                        title="Coming soon - Download sync will be available in a future release"
                                        className="flex flex-col items-center gap-2 p-3 rounded-lg border-2 opacity-50 cursor-not-allowed text-xs border-[var(--border-primary)] bg-[var(--bg-tertiary)] text-[var(--text-tertiary)]"
                                    >
                                        <ArrowLeft size={16} />
                                        <span className="font-bold uppercase">Bucket → Local</span>
                                        <span className="text-[7px] text-[var(--text-tertiary)]">Coming Soon</span>
                                    </button>
                                </div>
                            </div>

                            {/* Local Folder */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Local Folder</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] truncate font-mono">
                                        {newJob.localPath ? newJob.localPath.split('/').pop() : 'No folder'}
                                    </div>
                                    <button
                                        onClick={handlePickFolder}
                                        className="px-3 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] hover:border-[var(--accent-blue)] text-[var(--text-primary)] text-xs font-semibold rounded-lg transition-all"
                                    >
                                        Browse
                                    </button>
                                </div>
                            </div>

                            {/* Remote Path */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                                    Bucket Prefix (Optional)
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="e.g. backups"
                                        className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)] font-mono"
                                        value={newJob.remotePath}
                                        onChange={e => setNewJob(prev => ({ ...prev, remotePath: e.target.value }))}
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
                                        <Cloud size={12} />
                                    </div>
                                </div>
                            </div>

                            {/* Job Name */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Job Name (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Daily Backup"
                                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                                    value={newJob.name || ''}
                                    onChange={e => setNewJob(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>

                            {/* Sync Interval */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Auto-Sync Interval</label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {[
                                        { label: 'D', key: 'days' },
                                        { label: 'H', key: 'hours' },
                                        { label: 'M', key: 'minutes' },
                                    ].map((unit) => (
                                        <div key={unit.key} className="space-y-0.5">
                                            <div className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase text-center">{unit.label}</div>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded px-1 py-1 text-xs text-center text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                                                value={(customInterval as any)[unit.key]}
                                                onChange={e => setCustomInterval(prev => ({ ...prev, [unit.key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[8px] text-[var(--text-tertiary)] italic">
                                    {customInterval.days > 0 || customInterval.hours > 0 || customInterval.minutes > 0
                                        ? `Run every ${customInterval.days}d${customInterval.hours}h${customInterval.minutes}m`.replace(/0[dhm]/g, '')
                                        : 'Manual only'}
                                </p>
                            </div>

                            {/* Mirror Sync */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="add_mirror_sync"
                                        checked={(newJob as any).mirrorSync || false}
                                        onChange={e => setNewJob(prev => ({ ...prev, mirrorSync: e.target.checked }))}
                                        className="w-3 h-3 cursor-pointer"
                                    />
                                    <label htmlFor="add_mirror_sync" className="text-xs font-bold text-[var(--text-primary)] cursor-pointer">
                                        Mirror Sync (Exact Match)
                                    </label>
                                </div>

                                {(newJob as any).mirrorSync && (
                                    <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg space-y-2">
                                        <div>
                                            <p className="text-[9px] font-bold text-red-600 uppercase tracking-wider">⚠️ Warning: Destructive Operation</p>
                                            <p className="text-[8px] text-red-700 mt-1">Mirror Sync makes S3 an EXACT copy of your local folder. Files that exist in S3 but NOT in your local folder will be PERMANENTLY DELETED.</p>
                                        </div>
                                        
                                        <div className="bg-red-600/20 p-2 rounded border-l-2 border-red-600 space-y-1.5">
                                            <p className="text-[8px] font-bold text-red-700">Real Example:</p>
                                            <div className="text-[8px] text-red-700 space-y-0.5 font-mono">
                                                <p><strong>Local Folder:</strong> 📄 report.pdf, 📄 budget.xlsx</p>
                                                <p><strong>S3 Bucket:</strong> 📄 report.pdf, 📄 budget.xlsx, 📄 old_notes.txt</p>
                                            </div>
                                            <p className="text-[8px] font-bold text-red-700 mt-1">After Mirror Sync:</p>
                                            <div className="text-[8px] text-red-700 space-y-0.5 font-mono bg-red-500/10 p-1.5 rounded">
                                                <p><strong>S3 Bucket:</strong> 📄 report.pdf, 📄 budget.xlsx</p>
                                                <p className="text-red-600 font-bold">❌ old_notes.txt DELETED FOREVER!</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-3 bg-[var(--bg-tertiary)] border-t border-[var(--border-primary)] flex justify-end gap-2 shrink-0">
                            <button
                                onClick={() => setIsNewJobModalOpen(false)}
                                className="px-4 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] rounded transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddJob}
                                disabled={!newJob.localPath}
                                className={`px-6 py-1.5 text-xs font-bold text-white rounded transition-all shadow ${!newJob.localPath
                                    ? 'bg-gray-400 cursor-not-allowed opacity-50'
                                    : 'bg-[var(--accent-blue)] hover:bg-[var(--accent-blue-hover)] shadow-blue-500/20'
                                    }`}
                            >
                                Create Sync Job
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
