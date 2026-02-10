import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Loader2, ArrowRight, RefreshCw, Trash2, Zap } from 'lucide-react';
import { TransferJob } from '../types';

interface TransferProgressPanelProps {
    jobs: TransferJob[];
    onRetry: (jobId: string) => void;
    onClear: (jobId: string) => void;
    onClearAll: () => void;
}

export const TransferProgressPanel: React.FC<TransferProgressPanelProps> = ({
    jobs,
    onRetry,
    onClear,
    onClearAll,
}) => {
    const [isMinimized, setIsMinimized] = useState(false);

    if (jobs.length === 0) return null;

    const activeJobs = jobs.filter(j => j.status === 'active' || j.status === 'pending');
    const completedJobs = jobs.filter(j => j.status === 'completed');
    const errorJobs = jobs.filter(j => j.status === 'error');

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatSpeed = (bytesPerSecond: number) => {
        return formatSize(bytesPerSecond) + '/s';
    };

    return (
        <div className={`fixed bottom-6 right-6 z-[90] w-96 flex flex-col transition-all duration-300 ease-in-out transform ${isMinimized ? 'translate-y-[calc(100%-48px)]' : ''
            }`}>
            {/* Header */}
            <div
                className={`flex items-center justify-between px-5 py-3 rounded-t-2xl border-x border-t border-[var(--border-primary)] shadow-2xl cursor-pointer select-none transition-colors ${activeJobs.length > 0 ? 'bg-[var(--accent-blue)] text-white' : 'bg-[var(--bg-primary)] text-[var(--text-primary)]'
                    }`}
                onClick={() => setIsMinimized(!isMinimized)}
            >
                <div className="flex items-center gap-3">
                    {activeJobs.length > 0 ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : errorJobs.length > 0 ? (
                        <AlertCircle size={18} className="text-red-400" />
                    ) : (
                        <CheckCircle2 size={18} className="text-emerald-400" />
                    )}
                    <span className="text-sm font-bold tracking-tight">
                        {activeJobs.length > 0
                            ? `Transferring ${activeJobs.length} item${activeJobs.length !== 1 ? 's' : ''}...`
                            : errorJobs.length > 0
                                ? `${errorJobs.length} Transfer${errorJobs.length !== 1 ? 's' : ''} Failed`
                                : 'Transfers Complete'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {completedJobs.length > 0 && !isMinimized && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onClearAll(); }}
                            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-xs font-bold"
                            title="Clear Completed"
                        >
                            Clear All
                        </button>
                    )}
                    {isMinimized ? <ChevronUp size={18} strokeWidth={3} /> : <ChevronDown size={18} strokeWidth={3} />}
                </div>
            </div>

            {/* Body */}
            <div className={`flex-1 bg-[var(--bg-primary)] border-x border-[var(--border-primary)] shadow-2xl transition-all duration-300 ${isMinimized ? 'h-0 opacity-0 pointer-events-none' : 'max-h-[400px] overflow-y-auto p-4'
                }`}>
                <div className="space-y-4">
                    {jobs.map(job => (
                        <div key={job.id} className="group flex flex-col gap-2 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--border-secondary)] transition-all">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-[var(--text-primary)] truncate block" title={job.fileName}>
                                            {job.fileName}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tighter ${job.type === 'move' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'
                                            }`}>
                                            {job.type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] font-medium">
                                        <span className="truncate max-w-[80px]">{job.sourceBucket}</span>
                                        <ArrowRight size={10} />
                                        <span className="truncate max-w-[80px]">{job.destBucket}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {job.status === 'error' && (
                                        <button
                                            onClick={() => onRetry(job.id)}
                                            className="p-1.5 hover:bg-[var(--bg-tertiary)] text-[var(--accent-blue)] rounded-lg transition-colors"
                                            title="Retry"
                                        >
                                            <RefreshCw size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onClear(job.id)}
                                        className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                                        title="Clear"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {job.status === 'active' && (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-tertiary)]">
                                        <div className="flex items-center gap-2">
                                            <Zap size={10} className="text-amber-500" />
                                            <span>{formatSpeed(job.speed)}</span>
                                        </div>
                                        <span>{job.progress}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--border-primary)] shadow-inner">
                                        <div
                                            className="h-full bg-[var(--accent-blue)] transition-all duration-300 relative"
                                            style={{ width: `${job.progress}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-pulse-slow" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {job.status === 'completed' && (
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500">
                                    <CheckCircle2 size={12} />
                                    <span>Completed</span>
                                </div>
                            )}

                            {job.status === 'error' && (
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-500">
                                        <AlertCircle size={12} />
                                        <span>Failed</span>
                                    </div>
                                    {job.error && (
                                        <p className="text-[9px] text-red-400 font-medium leading-tight">
                                            {job.error}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Info */}
            <div className={`px-5 py-2.5 rounded-b-2xl border-x border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] flex items-center justify-between shadow-2xl transition-all duration-300 ${isMinimized ? 'opacity-0 h-0 p-0 overflow-hidden' : ''
                }`}>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Total Speed</span>
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                            {formatSpeed(jobs.reduce((acc, j) => acc + (j.status === 'active' ? j.speed : 0), 0))}
                        </span>
                    </div>
                </div>
                <div className="text-[10px] font-bold text-[var(--text-tertiary)] bg-[var(--bg-primary)] px-2.5 py-1 rounded-full border border-[var(--border-primary)]">
                    {completedJobs.length} / {jobs.length} Done
                </div>
            </div>
        </div>
    );
};
